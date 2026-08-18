import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { run, claudeCode, Output, type AgentStreamEvent } from "@ai-hero/sandcastle";
import { sandbox, startupCommands } from "./sandbox.mts";
import { notifySlack, slackStatus } from "./slack.mts";

// The watcher. Runs until you stop it, polling GitHub for open issues labelled
// `Sandcastle`. Each issue goes through three phases, and a human sits between
// the first and the last:
//
//   1. plan       — a container reads the issue, runs the `kickoff` skill, and
//                   returns a plan. It writes no code. The host opens a *draft*
//                   pull request whose description is that plan.
//   2. review     — you comment on that pull request. `approve` moves to phase 3;
//                   anything else is a change request and the agent revises the
//                   plan; `abandon` stops. No container is alive while you think.
//   3. implement  — a new container *resumes the planning session*, so the agent
//                   still has everything it read in phase 1, and writes the code.
//                   The host pushes and marks the pull request ready for review.
//
//   pnpm sandcastle                              # foreground, Ctrl-C to stop
//   node_modules/.bin/tsx .sandcastle/main.mts & # background, stop with kill -INT
//
// Background it through tsx rather than pnpm: pnpm does not forward a signal
// sent to it alone, so `kill` on the pnpm pid leaves the watcher running.
//
// The image comes from `pnpm sandcastle:build-image`; `pnpm sandcastle:smoke`
// checks the sandbox itself when a run fails in a way that smells structural.
//
// Phase 2 can last days, and the watcher survives being restarted inside it:
// what it needs is written to .sandcastle/state/issue-<n>.json and mirrored into
// the pull request description. See "state" below for what is durable and why.
//
// One issue is in flight at a time — while an issue waits for plan approval,
// nothing else is picked up. Same reasoning as the old pause on open pull
// requests: parallel branches cut from the same commit conflict with each other,
// and a queue of half-reviewed plans is worse than a queue of untouched issues.

const LABEL = "Sandcastle";
const AWAITING_LABEL = "Sandcastle:awaiting-approval";
const COMPLETE = "<promise>COMPLETE</promise>";
const BLOCKED = "<promise>BLOCKED</promise>";

/** The tag the planning prompts emit their plan inside; extracted by `Output.string`. */
const PLAN_TAG = "plan";

/** A plan that starts with this is the agent declining to plan. */
const PLAN_BLOCKED = "BLOCKED:";

/**
 * The implementation prompt asks for local testing instructions inside this tag.
 * Pulled out of stdout by hand rather than with `Output.string`, on purpose: a
 * missing tag there throws and would discard the whole run's result over a
 * paragraph, when the commits are the part that matters. Absent notes are worth a
 * line in the log, not a failed implementation.
 */
const TESTING_TAG = /<testing>([\s\S]*?)<\/testing>/;

const testingNotes = (stdout: string) => TESTING_TAG.exec(stdout)?.[1]?.trim();

/**
 * Stamped into everything the watcher writes on GitHub. The pull request is
 * opened with your `gh` credentials, so the watcher's own comments are
 * indistinguishable from yours by author — without this marker it would read its
 * own "🏰 implementing now" as a change request and re-plan forever.
 */
const BOT_MARKER = "<!-- sandcastle -->";

/** `approve` and friends move to implementation; `abandon` and friends give up. */
const APPROVES = /^\s*(approved?|lgtm|ship\s*it|go\s*ahead|looks good|👍|:\+1:)/i;
const ABANDONS = /^\s*(abandon|reject|cancel|stop|nevermind|never mind)\b/i;

// Overridable so you can point the watcher at a branch (e.g. to try it before
// the sandcastle setup itself is on main) or slow the polling down.
const BASE_BRANCH = process.env.SANDCASTLE_BASE ?? "origin/main";
const MODEL = process.env.SANDCASTLE_MODEL ?? "opus";

// Validated rather than trusted: a non-numeric override reaches setTimeout as
// NaN, which fires immediately and turns the idle poll into a hot loop against
// the GitHub API.
const POLL_SECONDS = Number(process.env.SANDCASTLE_POLL_SECONDS ?? 120);
if (!Number.isFinite(POLL_SECONDS) || POLL_SECONDS <= 0) {
  throw new Error(
    `SANDCASTLE_POLL_SECONDS must be a positive number of seconds, got "${process.env.SANDCASTLE_POLL_SECONDS}"`,
  );
}

// Pull requests target the local name of the base — `origin/main` → `main`.
const PR_BASE = BASE_BRANCH.replace(/^origin\//, "");

// Anchor everything to the repo, not to the shell's cwd: a background process
// started from the wrong directory should not half-work.
const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const PLAN_PROMPT = join(REPO_ROOT, ".sandcastle", "plan-issue.md");
const REVISE_PROMPT = join(REPO_ROOT, ".sandcastle", "revise-plan.md");
const IMPLEMENT_PROMPT = join(REPO_ROOT, ".sandcastle", "implement-plan.md");
const WORKTREES = join(REPO_ROOT, ".sandcastle", "worktrees");
const LOGS = join(REPO_ROOT, ".sandcastle", "logs");
const STATE = join(REPO_ROOT, ".sandcastle", "state");

type Issue = { readonly number: number; readonly title: string };

/**
 * What the watcher must remember across a restart while an issue waits for its
 * plan to be reviewed.
 *
 * Three layers of durability, on purpose:
 *
 *   - this file is the fast path;
 *   - the pull request description carries the same session id in an HTML
 *     comment, so the state is recoverable from GitHub alone;
 *   - the *plan itself* is the pull request description, so even with no session
 *     to resume the implementation run still knows what was approved. That is
 *     what keeps `~/.claude/projects` from being a single point of failure —
 *     resume is an optimisation here, not a dependency.
 */
type Pending = {
  readonly issue: Issue;
  readonly branch: string;
  readonly prUrl: string;
  readonly prNumber: number;
  /** The plan currently on the pull request, as approved or awaiting approval. */
  readonly plan: string;
  /** Claude session to resume, when its JSONL is still on this host. */
  readonly sessionId?: string;
  readonly sessionFilePath?: string;
  /** Slack thread for this issue, so posts keep threading after a restart. */
  readonly threadTs?: string;
  /** Comments older than this were written before the current plan. */
  readonly planPostedAt: string;
};

type Outcome = "shipped" | "blocked" | "no-changes" | "no-signal";
type Attempt = {
  readonly outcome: Outcome;
  /** Posted back onto the pull request. */
  readonly comment: string;
  /** Set only when the pull request is ready for review — the watcher pauses on it. */
  readonly pullRequest?: string;
  /** Log file for this run, quoted in Slack so you can tail the right one. */
  readonly logRef: string;
  readonly commits: number;
};

const log = (message: string) =>
  console.log(`[${new Date().toISOString().replace("T", " ").slice(0, 19)}] ${message}`);

const describe = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

/** execFileSync with the child's stderr folded into the thrown error. */
const capture = (file: string, args: string[]) => {
  try {
    return execFileSync(file, args, { cwd: REPO_ROOT, encoding: "utf8" }).trim();
  } catch (error) {
    const { stderr, stdout } = error as { stderr?: string; stdout?: string };
    const detail = (stderr || stdout || "").trim() || describe(error);
    throw new Error(`\`${file} ${args.join(" ")}\` failed: ${detail}`);
  }
};

const git = (...args: string[]) => capture("git", args);
const gh = (...args: string[]) => capture("gh", args);

/**
 * Doubles as the credential check. The watcher is usually started unattended, so
 * a missing `gh` login should say so rather than land as a stack trace above an
 * empty log.
 */
const REPO = (() => {
  try {
    return gh("repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner");
  } catch (error) {
    console.error(
      `The watcher needs an authenticated \`gh\` on the host — it is what pushes branches\n` +
        `and opens pull requests. Run \`gh auth login\`, then start it again.\n\n${describe(error)}`,
    );
    process.exit(1);
  }
})();

// ---------------------------------------------------------------- shutdown

const controller = new AbortController();

const requestShutdown = () => {
  if (controller.signal.aborted) {
    log("Second interrupt — exiting now.");
    process.exit(130);
  }
  log("Stopping after the current step. Ctrl-C again to kill it immediately.");
  controller.abort(new Error("watcher interrupted"));
};

process.on("SIGINT", requestShutdown);
process.on("SIGTERM", requestShutdown);

/** Sleep that returns early on shutdown, so Ctrl-C is never stuck behind a poll. */
const sleep = (seconds: number) =>
  new Promise<void>((resolve) => {
    const done = () => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(done, seconds * 1000);
    controller.signal.addEventListener("abort", done, { once: true });
  });

// ------------------------------------------------------------------- state

const statePath = (issueNumber: number) => join(STATE, `issue-${issueNumber}.json`);

/**
 * The one pending issue, if any. Deliberately tolerant: an unreadable or
 * malformed state file is renamed rather than deleted, so a bug here cannot
 * silently lose the only pointer to an open plan.
 */
const loadPending = (): Pending | undefined => {
  if (!existsSync(STATE)) return undefined;

  for (const name of readdirSync(STATE).filter((n) => n.endsWith(".json")).sort()) {
    const path = join(STATE, name);
    try {
      return JSON.parse(readFileSync(path, "utf8")) as Pending;
    } catch (error) {
      const broken = `${path}.broken`;
      log(`  WARNING: ${path} is unreadable (${describe(error)}); moved to ${broken}`);
      try {
        execFileSync("mv", [path, broken]);
      } catch {
        rmSync(path, { force: true });
      }
    }
  }
  return undefined;
};

const savePending = (pending: Pending) => {
  mkdirSync(STATE, { recursive: true });
  writeFileSync(statePath(pending.issue.number), `${JSON.stringify(pending, null, 2)}\n`);
};

const clearPending = (issueNumber: number) =>
  rmSync(statePath(issueNumber), { force: true });

// ------------------------------------------------------------------ github

/** Oldest first, so the queue is FIFO rather than newest-wins. */
const queuedIssues = (): Issue[] =>
  (
    JSON.parse(
      gh("issue", "list", "--state", "open", "--label", LABEL, "--json", "number,title", "--limit", "50"),
    ) as Issue[]
  ).sort((a, b) => a.number - b.number);

/** Best-effort: the flow works without the label, it is just less legible on GitHub. */
const ensureAwaitingLabel = () => {
  try {
    gh(
      "label", "create", AWAITING_LABEL,
      "--color", "BFD4F2",
      "--description", "Sandcastle posted a plan and is waiting for a review comment",
      "--force",
    );
  } catch (error) {
    log(`  WARNING: could not create the "${AWAITING_LABEL}" label: ${describe(error)}`);
  }
};

const relabel = (issue: Issue, { add, remove }: { add?: string; remove?: string }) => {
  const args = ["issue", "edit", String(issue.number)];
  if (add) args.push("--add-label", add);
  if (remove) args.push("--remove-label", remove);
  try {
    gh(...args);
  } catch (error) {
    log(`  WARNING: could not relabel #${issue.number}: ${describe(error)}`);
  }
};

/**
 * Take the issue out of the queue and say why. The label comes off first: it is
 * the only thing standing between a permanently failing issue and an infinite
 * retry loop, so it must not depend on the comment succeeding.
 */
const release = (issue: Issue, comment: string): string | undefined => {
  gh("issue", "edit", String(issue.number), "--remove-label", LABEL);
  // `gh` prints the new comment's URL, which is what Slack links to. Never worth
  // failing a run over, so a broken comment degrades to a missing link.
  try {
    return gh("issue", "comment", String(issue.number), "--body", `${comment}\n\n${BOT_MARKER}`);
  } catch (error) {
    log(`  WARNING: could not comment on #${issue.number}: ${describe(error)}`);
    return undefined;
  }
};

const commentOnPr = (prNumber: number, body: string): string | undefined => {
  try {
    return gh("pr", "comment", String(prNumber), "--body", `${body}\n\n${BOT_MARKER}`);
  } catch (error) {
    log(`  WARNING: could not comment on PR #${prNumber}: ${describe(error)}`);
    return undefined;
  }
};

const HOW_TO_REVIEW = [
  "---",
  "",
  "🏰 **Planned by the Sandcastle agent** with the `kickoff` skill. Nothing is implemented yet —",
  "this branch holds one empty commit so that this pull request can exist.",
  "",
  "- Comment **`approve`** (or `lgtm`) and the agent implements exactly this, resuming the session",
  "  it planned in, then pushes here and marks the pull request ready for review.",
  "- Comment **anything else** and it is treated as a change request: the agent revises the plan,",
  "  keeping everything it already read, and rewrites this description.",
  "- Comment **`abandon`** to stop. The branch and this pull request are left for you to delete.",
].join("\n");

const planBody = (pending: Omit<Pending, "prUrl" | "prNumber">) =>
  [
    `Closes #${pending.issue.number}`,
    "",
    "## Plan",
    "",
    pending.plan,
    "",
    HOW_TO_REVIEW,
    "",
    BOT_MARKER,
    `<!-- sandcastle:session=${pending.sessionId ?? "none"} branch=${pending.branch} -->`,
  ].join("\n");

/**
 * A pull request needs a diff, and the planning run is deliberately read-only, so
 * the branch is identical to its base and GitHub refuses it. Hence one empty
 * commit — made with plumbing rather than `git commit`, because the branch is not
 * checked out anywhere on the host (its worktree is gone) and committing from
 * REPO_ROOT would land on whatever the host has checked out instead.
 *
 * It survives as the first commit of the pull request, which is a fair record of
 * how the branch started; a squash merge drops it entirely.
 */
const emptyPlanCommit = (issue: Issue, branch: string) => {
  const tree = git("rev-parse", `${branch}^{tree}`);
  const parent = git("rev-parse", branch);
  const sha = capture("git", [
    "commit-tree", tree,
    "-p", parent,
    "-m", `plan(#${issue.number}): ${issue.title}`,
  ]);
  git("update-ref", `refs/heads/${branch}`, sha, parent);
};

/** Opens the draft pull request that carries the plan, and returns it. */
const openPlanPullRequest = (
  draft: Omit<Pending, "prUrl" | "prNumber">,
): { url: string; number: number } => {
  emptyPlanCommit(draft.issue, draft.branch);
  git("push", "--set-upstream", "origin", draft.branch);

  const existing = JSON.parse(
    gh("pr", "list", "--head", draft.branch, "--state", "open", "--json", "url,number"),
  ) as { url: string; number: number }[];

  if (existing.length > 0) {
    const found = existing[0];
    gh("pr", "edit", String(found.number), "--body", planBody(draft));
    return found;
  }

  const output = gh(
    "pr", "create",
    "--draft",
    "--base", PR_BASE,
    "--head", draft.branch,
    "--title", `${draft.issue.title} (plan)`,
    "--body", planBody(draft),
  );
  const url = output.split("\n").filter(Boolean).pop() ?? "";
  const { number } = JSON.parse(gh("pr", "view", url, "--json", "number")) as { number: number };
  return { url, number };
};

type Reviewed = {
  readonly comment: string;
  readonly author: string;
  /** Permalink to the comment, so Slack can point at what was actually said. */
  readonly url?: string;
};

type Decision =
  | { readonly type: "wait" }
  | ({ readonly type: "approve" } & Reviewed)
  | ({ readonly type: "revise" } & Reviewed)
  | ({ readonly type: "abandon" } & Reviewed)
  | { readonly type: "gone"; readonly state: string };

type PrComment = { body: string; createdAt: string; url?: string; author?: { login?: string } };

/**
 * Read the review decision off the pull request. Only comments newer than the
 * current plan count — a revision resets that clock, so feedback already acted on
 * is not read twice — and the watcher's own comments are filtered by marker,
 * since they are authored by the same GitHub user as yours.
 */
const decide = (pending: Pending): Decision => {
  const pr = JSON.parse(
    gh("pr", "view", String(pending.prNumber), "--json", "state,comments"),
  ) as { state: string; comments: PrComment[] };

  if (pr.state !== "OPEN") return { type: "gone", state: pr.state };

  const fresh = pr.comments.filter(
    (c) => c.createdAt > pending.planPostedAt && !c.body.includes(BOT_MARKER),
  );
  const latest = fresh.at(-1);
  if (!latest) return { type: "wait" };

  const reviewed: Reviewed = {
    comment: latest.body.trim(),
    author: latest.author?.login ?? "someone",
    url: latest.url,
  };

  if (APPROVES.test(reviewed.comment)) return { type: "approve", ...reviewed };
  if (ABANDONS.test(reviewed.comment)) return { type: "abandon", ...reviewed };
  return { type: "revise", ...reviewed };
};

// --------------------------------------------------------------- worktrees

/**
 * Each run leaves a worktree carrying a ~2GB node_modules. Sandcastle removes it
 * itself when the agent left nothing uncommitted, but a crash or an abort does
 * not. Clearing them before the next run keeps at most one on disk, and still
 * leaves the last one around to inspect after a Ctrl-C.
 */
const clearLeftoverWorktrees = () => {
  if (!existsSync(WORKTREES)) return;
  for (const name of readdirSync(WORKTREES)) {
    const path = join(WORKTREES, name);
    try {
      git("worktree", "remove", "--force", path);
    } catch {
      rmSync(path, { recursive: true, force: true });
    }
    log(`  cleared leftover worktree ${name}`);
  }
  git("worktree", "prune");
};

// ------------------------------------------------------------------- slack

/**
 * Slack's mrkdwn needs these three entity-escaped. Without it an issue titled
 * `Fix <Button> rendering` truncates its own link and renders as garbage.
 */
const escapeSlack = (text: string) =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const issueLink = (issue: Issue) =>
  `<https://github.com/${REPO}/issues/${issue.number}|#${issue.number} ${escapeSlack(issue.title)}>`;

const prLink = (pending: Pick<Pending, "prUrl" | "prNumber">) =>
  `<${pending.prUrl}|PR #${pending.prNumber}>`;

/** A link, or nothing when the URL is missing — `gh` failures must not print `<undefined|…>`. */
const maybeLink = (url: string | undefined, text: string) => (url ? `<${url}|${text}>` : undefined);

/**
 * The "where to look" line each update ends with. Every step points at different
 * things — the plan, the comment that approved it, the files changed — and the
 * whole point of the thread is that you never have to go hunting for the right
 * tab. Missing links drop out rather than rendering as holes.
 */
const links = (...parts: (string | undefined)[]) => parts.filter(Boolean).join("  ·  ");

const logHint = (branch: string) => `log \`.sandcastle/logs/${branch.replaceAll("/", "-")}.log\``;

const remainingText = (queued: number) =>
  queued === 0 ? "Nothing else is queued." : `${queued} more issue${queued === 1 ? "" : "s"} queued.`;

/**
 * Posted when the issue is picked up, and the parent of every later message
 * about it: the plan, progress, the outcome, and the merged/closed notice all
 * thread under this one, so the channel keeps one entry per issue rather than
 * five. Its ts is persisted with the rest of the state, so a watcher restart
 * during review keeps the thread.
 */
const startMessage = (issue: Issue, queued: number) =>
  [
    `🏰 *Planning* ${issueLink(issue)}`,
    `Branch \`sandcastle/issue-${issue.number}\`, cut from \`${BASE_BRANCH}\`. ${remainingText(queued)}`,
  ].join("\n");

/** One line of agent activity, flattened and clipped to something a thread can hold. */
const summarise = (event: AgentStreamEvent) => {
  const raw =
    event.type === "toolCall"
      ? `${event.name} ${event.formattedArgs}`
      : event.type === "text"
        ? event.message
        : "";
  const flat = raw.replace(/\s+/g, " ").trim();
  return flat.length > 200 ? `${flat.slice(0, 200)}…` : flat;
};

const PROGRESS_SECONDS = 120;

/**
 * Forward what the agent is doing into the issue's thread — as a heartbeat, not
 * a transcript. A post per tool call would be hundreds of messages for one issue
 * and would run into chat.postMessage's one-per-second-per-channel limit, so at
 * most one update lands every PROGRESS_SECONDS and the rest are dropped.
 *
 * Fire-and-forget on purpose: a slow Slack must not stall the agent's stream.
 * notifySlack never throws, and sandcastle swallows anything this callback does.
 */
const progressReporter = (threadTs?: string) => {
  let lastPostedAt = 0;

  return (event: AgentStreamEvent) => {
    if (!threadTs) return;

    const now = Date.now();
    if (now - lastPostedAt < PROGRESS_SECONDS * 1000) return;

    const summary = summarise(event);
    if (!summary) return;

    lastPostedAt = now;
    void notifySlack(`:hourglass_flowing_sand: ${escapeSlack(summary)}`, threadTs);
  };
};

// -------------------------------------------------------------- the runs

/** Shared by all three phases; only the prompt, the output and the resume differ. */
const runOptions = (branch: string, threadTs?: string) => {
  mkdirSync(LOGS, { recursive: true });
  clearLeftoverWorktrees();

  // Cut from a current base rather than from whatever the host has checked out.
  git("fetch", "origin", "--prune");

  return {
    cwd: REPO_ROOT,
    sandbox: sandbox(),
    agent: claudeCode(MODEL, { effort: "high" as const }),

    // Naming the log file is what buys the progress callback: sandcastle only
    // offers onAgentStreamEvent in log-to-file mode, and that mode wants an
    // explicit path rather than the auto-generated one it would pick itself.
    logging: {
      type: "file" as const,
      path: join(LOGS, `${branch.replaceAll("/", "-")}.log`),
      onAgentStreamEvent: progressReporter(threadTs),
    },

    // Required by both `output` and `resumeSession`, and right anyway: the loop
    // out here is what handles "there is more work".
    maxIterations: 1 as const,

    // A branch of its own, so a bad attempt is a branch nobody merges rather than
    // commits on whatever you were working on. Sandcastle reuses the branch when
    // it already exists, which is what lets all three phases share it.
    branchStrategy: { type: "branch" as const, branch, baseBranch: BASE_BRANCH },

    hooks: { sandbox: { onSandboxReady: startupCommands } },

    // Fifteen minutes of total silence. `pnpm build` alone is a quiet minute.
    idleTimeoutSeconds: 900,

    signal: controller.signal,
  };
};

const sessionOf = (result: { iterations: { sessionId?: string; sessionFilePath?: string }[] }) => {
  const last = result.iterations.at(-1);
  return { sessionId: last?.sessionId, sessionFilePath: last?.sessionFilePath };
};

/** Phase 1. Returns the plan text, or undefined when the agent declined to plan. */
const planIssue = async (
  issue: Issue,
  threadTs?: string,
): Promise<{ plan: string; branch: string; sessionId?: string; sessionFilePath?: string }> => {
  const branch = `sandcastle/issue-${issue.number}`;
  log(`  planning on ${branch}, cut from ${BASE_BRANCH}`);

  const result = await run({
    ...runOptions(branch, threadTs),
    name: `issue-${issue.number}-plan`,
    promptFile: PLAN_PROMPT,
    promptArgs: { ISSUE_NUMBER: String(issue.number), ISSUE_TITLE: issue.title },
    output: Output.string({ tag: PLAN_TAG }),
  });

  return { plan: result.output.trim(), branch, ...sessionOf(result) };
};

/** Phase 2's other branch: feedback that is not an approval. */
const revisePlan = async (pending: Pending, feedback: string): Promise<Pending> => {
  log(`  revising the plan for #${pending.issue.number}`);

  const result = await run({
    ...runOptions(pending.branch, pending.threadTs),
    name: `issue-${pending.issue.number}-revise`,
    promptFile: REVISE_PROMPT,
    promptArgs: {
      ISSUE_NUMBER: String(pending.issue.number),
      PR_URL: pending.prUrl,
      FEEDBACK: feedback,
      PLAN: pending.plan,
    },
    output: Output.string({ tag: PLAN_TAG }),
    ...resumeIfPossible(pending),
  });

  const revised: Pending = {
    ...pending,
    plan: result.output.trim(),
    ...sessionOf(result),
    planPostedAt: new Date().toISOString(),
  };

  gh("pr", "edit", String(revised.prNumber), "--body", planBody(revised));
  savePending(revised);
  return revised;
};

/**
 * Resume the planning conversation when its JSONL is still on this host, so the
 * agent keeps everything it read while planning. When it is not — a different
 * machine, a cleared `~/.claude/projects` — the run starts fresh instead. That
 * still works, because the approved plan is passed in the prompt either way;
 * it just costs the agent a re-read of the code.
 */
const resumeIfPossible = (pending: Pending) => {
  if (pending.sessionId && pending.sessionFilePath && existsSync(pending.sessionFilePath)) {
    return { resumeSession: pending.sessionId };
  }
  if (pending.sessionId) {
    log(`  session ${pending.sessionId} is gone from this host — running without resume`);
  }
  return {};
};

/** Phase 3. */
const implementPlan = async (pending: Pending, approval: string): Promise<Attempt> => {
  const { issue, branch, prNumber, prUrl } = pending;
  log(`  implementing #${issue.number} on ${branch}`);

  const result = await run({
    ...runOptions(branch, pending.threadTs),
    name: `issue-${issue.number}-implement`,
    promptFile: IMPLEMENT_PROMPT,
    promptArgs: {
      ISSUE_NUMBER: String(issue.number),
      ISSUE_TITLE: issue.title,
      PR_URL: prUrl,
      PLAN: pending.plan,
      APPROVAL: approval,
    },
    completionSignal: [COMPLETE, BLOCKED],
    ...resumeIfPossible(pending),
  });

  const commits = result.commits.length;
  const logRef = result.logFilePath ?? ".sandcastle/logs/";
  log(`  signal ${result.completionSignal ?? "(none)"} · ${commits} commit(s) · log ${logRef}`);

  if (result.completionSignal === BLOCKED) {
    return {
      outcome: "blocked",
      logRef,
      commits,
      comment:
        `🏖️ The agent could not implement the approved plan and reported itself blocked` +
        `${commits > 0 ? ` (it left ${commits} commit(s) on \`${branch}\`, unpushed)` : ""}.\n\n` +
        `The reasoning is in \`${logRef}\` on the host. This pull request stays a draft. ` +
        `Re-add the **${LABEL}** label to the issue to start over from planning.`,
    };
  }

  if (!result.completionSignal) {
    return {
      outcome: "no-signal",
      logRef,
      commits,
      comment:
        `🏖️ The implementation run ended without finishing — no completion signal, ${commits} commit(s). ` +
        `That normally means it hit the idle timeout or crashed mid-task.\n\n` +
        `Log: \`${logRef}\`. Nothing was pushed. Re-add the **${LABEL}** label to the issue to try again.`,
    };
  }

  if (commits === 0) {
    return {
      outcome: "no-changes",
      logRef,
      commits,
      comment:
        `🏖️ The agent reported done but committed nothing, so there is nothing to review.\n\n` +
        `Either the work was already on \`${PR_BASE}\`, or it changed files and never committed them ` +
        `(those are gone — the container is deleted). Log: \`${logRef}\`.`,
    };
  }

  git("push", "origin", branch);
  try {
    gh("pr", "ready", String(prNumber));
  } catch (error) {
    log(`  WARNING: could not mark PR #${prNumber} ready for review: ${describe(error)}`);
  }

  const subjects = git("log", "--reverse", "--pretty=format:%s", `${BASE_BRANCH}..${branch}`)
    .split("\n")
    .filter(Boolean);

  const testing = testingNotes(result.stdout);
  if (!testing) log("  WARNING: the agent left no <testing> block — the comment has no manual steps");

  return {
    outcome: "shipped",
    logRef,
    commits,
    comment: [
      `🏰 Implemented the approved plan and pushed ${commits} commit(s). This pull request is ready for review.`,
      "",
      "`pnpm exec tsc --noEmit`, `pnpm lint` and `pnpm build` were green inside the sandbox. This repo has",
      "no test suite, so that is the whole gate — nothing here has been *used*, only compiled. No human has",
      "read the code yet; review it like a stranger's first pull request.",
      "",
      "## Commits",
      "",
      ...subjects.map((subject) => `- ${subject}`),
      "",
      "## How to try it on your machine",
      "",
      testing ??
        "_The agent did not leave testing instructions. Check the run log on the host " +
          "(`.sandcastle/logs/`) for what it did, and exercise the change manually._",
    ].join("\n"),
    pullRequest: prUrl,
  };
};

/**
 * Hold until the pull request is merged or closed, and report which. Cheap — no
 * container, no tokens, just a `gh` call every poll — and interruptible, so
 * Ctrl-C still works while parked here. Returns undefined if we were interrupted
 * rather than resolved.
 */
const waitForReview = async (url: string): Promise<string | undefined> => {
  log(`  paused — nothing else runs until ${url} is merged or closed`);

  while (!controller.signal.aborted) {
    await sleep(POLL_SECONDS);
    if (controller.signal.aborted) return undefined;

    try {
      const { state } = JSON.parse(gh("pr", "view", url, "--json", "state")) as { state: string };
      if (state !== "OPEN") {
        log(`  ${url} is ${state.toLowerCase()} — resuming`);
        return state;
      }
    } catch (error) {
      log(`  could not read ${url}, will retry: ${describe(error)}`);
    }
  }

  return undefined;
};

// ------------------------------------------------------------ phase 1: plan

/**
 * Issue picked up → plan → draft pull request → pending state. Returns false when
 * the watcher should stop.
 */
const startIssue = async (issue: Issue, queued: number): Promise<boolean> => {
  // Announced before any work starts, so the channel shows the issue was picked
  // up rather than going quiet for the minutes the agent takes. If this post
  // failed, ts is absent and later messages degrade to top-level posts rather
  // than to nothing.
  const thread = await notifySlack(startMessage(issue, queued));
  if (thread.error) log(`  WARNING: Slack start notification failed: ${thread.error}`);

  let planned: Awaited<ReturnType<typeof planIssue>>;
  try {
    planned = await planIssue(issue, thread.ts);
  } catch (error) {
    if (controller.signal.aborted) {
      log(`  cancelled — #${issue.number} keeps its label and will be picked up next time.`);
      return false;
    }
    const detail = describe(error);
    log(`  #${issue.number} failed to plan: ${detail}`);
    const posted = release(
      issue,
      `🏖️ The Sandcastle agent could not produce a plan for this issue:\n\n` +
        "```\n" + detail + "\n```\n\n" +
        `Re-add the **${LABEL}** label once that is sorted.`,
    );
    await notifySlack(
      [
        `🏰 ${issueLink(issue)} — *planning failed*. No plan, no pull request.`,
        "The label is off the issue; re-add it to try again.",
        links(maybeLink(posted, "What went wrong"), logHint(`sandcastle/issue-${issue.number}`)),
      ].join("\n"),
      thread.ts,
    );
    return true;
  }

  if (planned.plan.startsWith(PLAN_BLOCKED)) {
    const why = planned.plan.slice(PLAN_BLOCKED.length).trim();
    log(`  #${issue.number} → blocked at planning`);
    const posted = release(
      issue,
      `🏖️ The Sandcastle agent read this issue and could not plan it:\n\n${why}\n\n` +
        `Nothing was implemented and no pull request was opened. Re-add the **${LABEL}** label once ` +
        `the issue says what it needs to.`,
    );
    await notifySlack(
      [
        `🏰 ${issueLink(issue)} — *blocked at planning*. The agent says the issue does not say enough yet.`,
        `> ${why.split("\n")[0].slice(0, 220)}`,
        links(maybeLink(posted, "Full explanation"), logHint(planned.branch)),
      ].join("\n"),
      thread.ts,
    );
    return true;
  }

  const draft = {
    issue,
    branch: planned.branch,
    plan: planned.plan,
    sessionId: planned.sessionId,
    sessionFilePath: planned.sessionFilePath,
    threadTs: thread.ts,
    planPostedAt: new Date().toISOString(),
  };

  const pr = openPlanPullRequest(draft);
  savePending({ ...draft, prUrl: pr.url, prNumber: pr.number });

  ensureAwaitingLabel();
  relabel(issue, { add: AWAITING_LABEL, remove: LABEL });

  log(`  plan posted to ${pr.url} — waiting for a review comment`);
  await notifySlack(
    [
      `🏰 *Plan posted, waiting for you* — <${pr.url}|PR #${pr.number}>`,
      `Plans ${issueLink(issue)}. Nothing is implemented yet; the branch holds one empty commit.`,
      "Comment `approve` on the pull request to build it, or comment feedback to have it re-plan.",
      links(
        maybeLink(pr.url, "Read the plan"),
        maybeLink(`${pr.url}#issuecomment-new`, "Reply to it"),
        logHint(planned.branch),
      ),
    ].join("\n"),
    thread.ts,
  );

  return true;
};

// -------------------------------------- phases 2 and 3: review, implement

/**
 * One turn of servicing the issue that already has a plan out for review. Returns
 * false when the watcher should stop.
 */
const servicePending = async (pending: Pending): Promise<boolean> => {
  let decision: Decision;
  try {
    decision = decide(pending);
  } catch (error) {
    log(`  could not read ${pending.prUrl}, will retry: ${describe(error)}`);
    await sleep(POLL_SECONDS);
    return true;
  }

  if (decision.type === "wait") {
    await sleep(POLL_SECONDS);
    return true;
  }

  if (decision.type === "gone") {
    log(`  ${pending.prUrl} is ${decision.state.toLowerCase()} — dropping #${pending.issue.number}`);
    relabel(pending.issue, { remove: AWAITING_LABEL });
    clearPending(pending.issue.number);
    await notifySlack(
      [
        `🏰 ${issueLink(pending.issue)} — ${prLink(pending)} was ${decision.state.toLowerCase()} before the plan was approved.`,
        `Dropped it. Re-add the **${LABEL}** label to plan it again.`,
      ].join("\n"),
      pending.threadTs,
    );
    return true;
  }

  if (decision.type === "abandon") {
    log(`  #${pending.issue.number} abandoned by ${decision.author}`);
    commentOnPr(
      pending.prNumber,
      `🏖️ Abandoned at your request. Nothing was implemented; this pull request and its branch are ` +
        `left for you to delete. Re-add the **${LABEL}** label to the issue to start over.`,
    );
    relabel(pending.issue, { remove: AWAITING_LABEL });
    clearPending(pending.issue.number);
    await notifySlack(
      [
        `🏰 ${issueLink(pending.issue)} — *abandoned* by ${decision.author}. Nothing was implemented.`,
        `${prLink(pending)} and its branch are left for you to delete.`,
        links(maybeLink(decision.url, "The comment"), maybeLink(pending.prUrl, "Pull request")),
      ].join("\n"),
      pending.threadTs,
    );
    return true;
  }

  if (decision.type === "revise") {
    log(`  #${pending.issue.number}: ${decision.author} asked for changes`);
    try {
      const revised = await revisePlan(pending, decision.comment);
      const posted = commentOnPr(
        revised.prNumber,
        `🏰 Plan revised — the description above is the new version. Comment \`approve\` to build it, ` +
          `or keep the feedback coming.`,
      );
      await notifySlack(
        [
          `🏰 *Plan revised* after ${decision.author}'s feedback — ${prLink(revised)}`,
          `Still ${issueLink(revised.issue)}, still nothing implemented. Comment \`approve\` to build it.`,
          links(
            maybeLink(revised.prUrl, "New plan"),
            maybeLink(decision.url, "The feedback"),
            maybeLink(posted, "Revision notice"),
            logHint(revised.branch),
          ),
        ].join("\n"),
        revised.threadTs,
      );
    } catch (error) {
      if (controller.signal.aborted) return false;
      const detail = describe(error);
      log(`  #${pending.issue.number} failed to revise: ${detail}`);
      commentOnPr(
        pending.prNumber,
        `🏖️ The agent could not revise the plan:\n\n` + "```\n" + detail + "\n```\n\n" +
          `The plan above is unchanged. Comment again to retry.`,
      );
      // The feedback stays newer than planPostedAt, so a retry would loop on it.
      // Move the clock instead: the human comments again, or approves as-is.
      savePending({ ...pending, planPostedAt: new Date().toISOString() });
      await sleep(POLL_SECONDS);
    }
    return true;
  }

  // Approved.
  log(`  #${pending.issue.number} approved by ${decision.author}`);
  await notifySlack(
    [
      `🏰 *Plan approved by ${decision.author} — implementing now* · ${prLink(pending)}`,
      `Building the approved plan for ${issueLink(pending.issue)} on \`${pending.branch}\`, resuming the session it planned in.`,
      links(
        maybeLink(decision.url, "The approval"),
        maybeLink(pending.prUrl, "The plan"),
        logHint(pending.branch),
      ),
    ].join("\n"),
    pending.threadTs,
  );

  let attempt: Attempt;
  try {
    attempt = await implementPlan(pending, decision.comment);
  } catch (error) {
    if (controller.signal.aborted) {
      log(`  cancelled — #${pending.issue.number} keeps its plan and stays pending.`);
      return false;
    }
    const detail = describe(error);
    log(`  #${pending.issue.number} errored while implementing: ${detail}`);
    attempt = {
      outcome: "no-signal",
      logRef: `.sandcastle/logs/${pending.branch.replaceAll("/", "-")}.log`,
      commits: 0,
      comment:
        `🏖️ The implementation run failed on the host, before or after the agent:\n\n` +
        "```\n" + detail + "\n```\n\n" +
        `Re-add the **${LABEL}** label to the issue to start over from planning.`,
    };
  }

  log(`  #${pending.issue.number} → ${attempt.outcome}`);
  const posted = commentOnPr(pending.prNumber, attempt.comment);
  relabel(pending.issue, { remove: AWAITING_LABEL });
  clearPending(pending.issue.number);

  const post = await notifySlack(
    attempt.pullRequest
      ? [
          `🏰 *Done — ready for your review* · ${prLink(pending)}`,
          `Implements ${issueLink(pending.issue)} with ${attempt.commits} commit(s), the gate green inside the sandbox.`,
          "Nothing else runs until you merge or close it.",
          links(
            maybeLink(`${pending.prUrl}/files`, "Files changed"),
            maybeLink(posted, "How to test it locally"),
            `log \`${attempt.logRef}\``,
          ),
        ].join("\n")
      : [
          `🏰 ${issueLink(pending.issue)} — *${attempt.outcome}* after an approved plan. Nothing was pushed.`,
          `${prLink(pending)} stays a draft. The label is off the issue; re-add it to start over from planning.`,
          links(maybeLink(posted, "What it reported"), `log \`${attempt.logRef}\``),
        ].join("\n"),
    pending.threadTs,
  );
  if (post.error) log(`  WARNING: Slack notification failed: ${post.error}`);

  // The pause. Nothing else starts until this pull request is dealt with.
  if (!attempt.pullRequest) return true;

  const state = await waitForReview(attempt.pullRequest);
  if (!state) return false; // interrupted while parked

  await notifySlack(
    state === "MERGED"
      ? `:white_check_mark: *Merged* — ${prLink(pending)} is in \`${PR_BASE}\`, ${issueLink(pending.issue)} is done. Back to watching for *${LABEL}* issues.`
      : `:no_entry_sign: *Closed without merging* — ${prLink(pending)}. ${issueLink(pending.issue)} was not implemented. Back to watching for *${LABEL}* issues.`,
    pending.threadTs,
  );

  return true;
};

// -------------------------------------------------------------------- loop

log(`Watching ${REPO} for open issues labelled "${LABEL}".`);
log(`Base ${BASE_BRANCH} · model ${MODEL} · polling every ${POLL_SECONDS}s · Ctrl-C to stop.`);
log(`Slack notifications ${slackStatus}.`);

// An issue wearing the awaiting-approval label with no state file behind it is
// stuck: its plan is on a pull request nobody is polling. Say so once at startup
// rather than leaving it silently parked forever.
try {
  const orphans = (
    JSON.parse(
      gh("issue", "list", "--state", "open", "--label", AWAITING_LABEL, "--json", "number", "--limit", "50"),
    ) as { number: number }[]
  ).filter(({ number }) => !existsSync(statePath(number)));

  if (orphans.length > 0) {
    log(
      `WARNING: #${orphans.map((o) => o.number).join(", #")} carry "${AWAITING_LABEL}" but have no state ` +
        `in .sandcastle/state/. Their plan pull requests are not being polled — close them and re-add ` +
        `the "${LABEL}" label to start over.`,
    );
  }
} catch (error) {
  log(`Could not check for orphaned plans: ${describe(error)}`);
}

while (!controller.signal.aborted) {
  // An issue out for review comes first: an approval that arrived hours ago
  // should be acted on before a newly labelled issue is planned.
  const pending = loadPending();
  if (pending) {
    if (!(await servicePending(pending))) break;
    continue;
  }

  let queue: Issue[];
  try {
    queue = queuedIssues();
  } catch (error) {
    log(`Poll failed, retrying in ${POLL_SECONDS}s: ${describe(error)}`);
    await sleep(POLL_SECONDS);
    continue;
  }

  if (queue.length === 0) {
    await sleep(POLL_SECONDS);
    continue;
  }

  const [issue, ...rest] = queue;
  log(`#${issue.number} ${issue.title}${rest.length > 0 ? ` (${rest.length} more queued)` : ""}`);

  if (!(await startIssue(issue, rest.length))) break;
}

log("Watcher stopped.");
