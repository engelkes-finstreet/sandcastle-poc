// First, and for its side effect: env.mts fills process.env from
// .sandcastle/host.env before any of the reads below happen, and refuses to let
// the process start if a host-only key has been left in the sandbox's .env. See
// that file for the two-file rule and why the names are what they are.
import "./env.mts";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Every knob the watcher has, and every path it touches. Imported by all the
// other modules; imports nothing but node builtins and env.mts itself, so it
// stays the one file you can read to know how a run is configured — with
// host.env as the other half of the answer to where a value came from.

export const LABEL = "Sandcastle";
export const AWAITING_LABEL = "Sandcastle:awaiting-approval";
export const REVISION_LABEL = "Sandcastle:awaiting-revision";

/** Completion signals the implementation prompt promises to emit. */
export const COMPLETE = "<promise>COMPLETE</promise>";
export const BLOCKED = "<promise>BLOCKED</promise>";

/** The tag the planning prompts emit their plan inside; extracted by `Output.string`. */
export const PLAN_TAG = "plan";

/** A plan that starts with this is the agent declining to plan. */
export const PLAN_BLOCKED = "BLOCKED:";

/** How worried the code review came out, worst last. The order is what makes the Slack line legible. */
export const VERDICTS = ["CLEAN", "NITS", "CONCERNS"] as const;

/**
 * Stamped into everything the watcher writes on GitHub. The pull request is
 * opened with your `gh` credentials, so the watcher's own comments are
 * indistinguishable from yours by author — without this marker it would read its
 * own "🏰 implementing now" as a review comment and answer itself forever.
 */
export const BOT_MARKER = "<!-- sandcastle -->";

/** `approve` and friends move to implementation; `abandon` and friends give up. */
export const APPROVES = /^\s*(approved?|lgtm|ship\s*it|go\s*ahead|looks good|👍|:\+1:)/i;
export const ABANDONS = /^\s*(abandon|reject|cancel|stop|nevermind|never mind)\b/i;

/**
 * `revise` and friends spend a follow-up round on a pull request that has already
 * shipped. Deliberately a trigger word rather than "any comment": a colleague
 * asking *why this way?* on a shipped pull request should not cost a container.
 * See docs/adr/0006-a-shipped-pull-request-still-listens.md.
 */
export const REVISES = /^\s*(revise|rework|changes?\s*requested)\b/i;

/**
 * Follow-up runs one pull request may spend. A badly specified issue would
 * otherwise burn containers until somebody noticed; at the bound the watcher says
 * so and lets go. Blocked and no-signal endings count — a failed follow-up must
 * not be free — but a comment that triggered nothing does not.
 */
export const MAX_REVISION_ROUNDS = 3;

/** Total agent silence tolerated before sandcastle kills a run. `pnpm build` alone is a quiet minute. */
export const IDLE_TIMEOUT_SECONDS = 900;

// Overridable so you can point the watcher at a branch (e.g. to try it before
// the sandcastle setup itself is on main) or slow the polling down.
export const BASE_BRANCH = process.env.SANDCASTLE_BASE ?? "origin/main";
export const MODEL = process.env.SANDCASTLE_MODEL ?? "opus";

/**
 * Which tracker adapter reads the queue and mirrors the watcher's state — see
 * tracker.mts, which validates it against the adapters that actually exist.
 * Unset means GitHub, so an existing deployment upgrades without touching
 * anything.
 */
export const TRACKER = process.env.SANDCASTLE_TRACKER ?? "github";

/**
 * The Jira adapter's configuration, read only when SANDCASTLE_TRACKER=jira —
 * trackers/jira.mts validates the two credentials and exits loudly if they are
 * missing or rejected.
 *
 * From .sandcastle/host.env or the shell, deliberately **never** from
 * .sandcastle/.env: every key in that file is forwarded into the container, and
 * no tracker credential may enter the sandbox — the same rule that retired
 * GH_TOKEN, and the one env.mts refuses to start without. The token is a Jira
 * Cloud personal API token (id.atlassian.com → Security → API tokens), used
 * with the email as basic auth against the REST v3 API.
 */
export const JIRA_BASE_URL = (
  process.env.JIRA_BASE_URL ?? "https://finstreet-team.atlassian.net"
).replace(/\/+$/, "");
export const JIRA_PROJECT = process.env.JIRA_PROJECT ?? "ESCB";
export const JIRA_EMAIL = process.env.JIRA_EMAIL;
export const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;

/**
 * The code review runs on a cheaper model than the work it reviews, on purpose.
 * Reviewing is a bounded reading task against a diff that already compiles — the
 * skills carry the judgement, so the model mostly has to follow them carefully.
 * Sonnet does that well, and a review that costs a fraction of the implementation
 * is a review nobody is tempted to switch off.
 */
export const REVIEW_MODEL = process.env.SANDCASTLE_REVIEW_MODEL ?? "sonnet";

/**
 * The walkthrough runs on the same cheap model as the review, and for a reason one
 * step stronger. Its output is a photograph: what it *judges* never reaches the pull
 * request, only what it *loaded*. Driving a login and a couple of routes is a
 * mechanical task with an artifact at the end that a human reads for themselves, so
 * there is nothing here for a bigger model to be better at.
 */
export const WALKTHROUGH_MODEL = process.env.SANDCASTLE_WALKTHROUGH_MODEL ?? "sonnet";

// Validated rather than trusted: a non-numeric override reaches setTimeout as
// NaN, which fires immediately and turns the idle poll into a hot loop against
// the GitHub API.
export const POLL_SECONDS = Number(process.env.SANDCASTLE_POLL_SECONDS ?? 120);
if (!Number.isFinite(POLL_SECONDS) || POLL_SECONDS <= 0) {
  throw new Error(
    `SANDCASTLE_POLL_SECONDS must be a positive number of seconds, got "${process.env.SANDCASTLE_POLL_SECONDS}"`,
  );
}

/** Pull requests target the local name of the base — `origin/main` → `main`. */
export const PR_BASE = BASE_BRANCH.replace(/^origin\//, "");

// Anchor everything to the repo, not to the shell's cwd: a background process
// started from the wrong directory should not half-work. Two levels up from
// .sandcastle/src/, so moving this file moves the anchor with it.
export const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));

/** .sandcastle/, where the prompts, the Dockerfile and the run output live. */
export const SANDCASTLE = join(REPO_ROOT, ".sandcastle");

const prompt = (name: string) => join(SANDCASTLE, "prompts", name);

export const PLAN_PROMPT = prompt("plan-issue.md");
export const IMPLEMENT_PROMPT = prompt("implement-plan.md");
export const FOLLOW_UP_PROMPT = prompt("follow-up.md");
export const CODE_REVIEW_PROMPT = prompt("code-review.md");
export const WALKTHROUGH_PROMPT = prompt("walkthrough.md");

export const WORKTREES = join(SANDCASTLE, "worktrees");
export const LOGS = join(SANDCASTLE, "logs");
export const STATE = join(SANDCASTLE, "state");

/**
 * The Jira transition map: lifecycle moment → the name of the Jira transition
 * that moment should fire, read only when SANDCASTLE_TRACKER=jira. Committed
 * rather than configured by environment, because which transitions a project's
 * workflow offers is a property of the project, not of the shell that starts the
 * watcher — and because filling it in should be a reviewable one-file change.
 * Absent, or with every moment left empty, the Jira mirror is labels only.
 * trackers/jira.mts is what reads and validates it.
 */
const JIRA_TRANSITIONS_FILE = "jira-transitions.json";
export const JIRA_TRANSITIONS = join(SANDCASTLE, JIRA_TRANSITIONS_FILE);

/** The same path as a human would quote it, for the messages that name the file. */
export const JIRA_TRANSITIONS_REF = `.sandcastle/${JIRA_TRANSITIONS_FILE}`;

/**
 * The Jira subtask rule: which of a story's subtasks is *this* repository's work,
 * read only when SANDCASTLE_TRACKER=jira. Committed for the same reason the
 * transition map is, and one step more so: which discipline a golem implements is
 * a property of the repository it is pointed at — the frontend golem takes the
 * `[FE]` subtask and no other — and a repository's own file is the only place
 * that fact cannot drift away from the code it describes. Absent, or with no
 * discipline named, every run is scoped to the labelled issue itself, exactly as
 * it was before this existed. trackers/jira.mts is what reads and validates it.
 */
const JIRA_SUBTASKS_FILE = "jira-subtasks.json";
export const JIRA_SUBTASKS = join(SANDCASTLE, JIRA_SUBTASKS_FILE);

/** The same path as a human would quote it. */
export const JIRA_SUBTASKS_REF = `.sandcastle/${JIRA_SUBTASKS_FILE}`;

/** The branch an issue is planned and implemented on. */
export const branchFor = (issueKey: string) => `sandcastle/issue-${issueKey}`;

/**
 * Where a walkthrough's screenshots land on the host, one directory per issue.
 *
 * Outside the worktree on purpose, and this is the load-bearing part. Sandcastle
 * removes a worktree whose agent left nothing uncommitted, and a screenshot is
 * gitignored — so shots written *into* the worktree would be deleted by the very
 * cleanliness the walkthrough prompt demands. Written *here* they are on host disk
 * the moment the browser saves them, before the container is torn down, which is the
 * same trick `commitWorktree` relies on and for the same reason.
 *
 * It also keeps them out of reach of the next run's rescue, which does `git add -A`
 * in the worktree: nothing that never entered the tree can ride onto a branch a human
 * is reviewing. That safety is structural here rather than a line in .gitignore.
 *
 * sandbox.mts bind-mounts the per-issue directory into the container — SHOTS_SANDBOX_DIR
 * there is the other half of this path.
 */
export const SHOTS = join(SANDCASTLE, "shots");

export const shotsHostDir = (issueKey: string) => join(SHOTS, `issue-${issueKey}`);

/**
 * Screenshots one walkthrough may contribute, and how large each may be. Bounds
 * rather than preferences: every shot is a binary blob committed to this repository
 * forever, and an agent told "photograph what changed" has no natural stopping
 * point. Anything past the bound is dropped with a line in the log and a line on the
 * pull request — never silently, or the body would read as complete coverage of a
 * change it only half photographed.
 */
export const MAX_SHOTS = 6;
export const MAX_SHOT_BYTES = 2_000_000;

/**
 * The branch an issue's screenshots live on, and the only way to get an image into a
 * pull request body: GitHub has no public API for uploading one, so the picture has
 * to already be in the repository for markdown to point at it.
 *
 * A branch of its own per issue, beside `branchFor`'s and force-pushed on a re-run.
 * Not the issue branch, which is the diff a human is reading and has no business
 * carrying half a megabyte of PNG; not one shared branch, which would need a merge
 * per issue to append to. Deleting it breaks the images in that one pull request
 * body and nothing else.
 */
export const shotsBranchFor = (issueKey: string) => `sandcastle/shots/issue-${issueKey}`;

/** Log file for a branch's runs — all four phases of an issue append to one file. */
export const logFileFor = (branch: string) => join(LOGS, `${branch.replaceAll("/", "-")}.log`);

/** The same path, relative, for quoting at a human in Slack or a comment. */
export const logRefFor = (branch: string) => `.sandcastle/logs/${branch.replaceAll("/", "-")}.log`;
