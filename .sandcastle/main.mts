import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { run, claudeCode, type AgentStreamEvent } from "@ai-hero/sandcastle";
import { sandbox, startupCommands } from "./sandbox.mts";
import { notifySlack, slackStatus } from "./slack.mts";

// The watcher. Runs until you stop it, polling GitHub for open issues labelled
// `Sandcastle`. Each one it finds gets its own container, its own branch off
// origin/main, and one shot at being implemented — then the host pushes the
// branch and opens a pull request. It never merges anything.
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
// The issue leaves the queue no matter how the attempt ends: on success, failure
// and blocked alike the label is removed and a comment explains what happened.
// That is deliberate — without it, one unimplementable issue would be retried in
// a loop all night. Re-add the label to ask for another attempt.
//
// Every outcome is also announced on Slack (see ./slack.mts). Opening a pull
// request additionally *pauses* the watcher: it will not touch another issue
// until you merge or close that one. Two reasons — you get to review at your own
// pace, and the next branch is then cut from a main that already contains the
// merge, instead of a stack of PRs all forked from the same commit that conflict
// with each other.

const LABEL = "Sandcastle";
const COMPLETE = "<promise>COMPLETE</promise>";
const BLOCKED = "<promise>BLOCKED</promise>";

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
const PROMPT_FILE = join(REPO_ROOT, ".sandcastle", "implement-issue.md");
const WORKTREES = join(REPO_ROOT, ".sandcastle", "worktrees");
const LOGS = join(REPO_ROOT, ".sandcastle", "logs");

type Issue = { readonly number: number; readonly title: string };
type Outcome = "shipped" | "blocked" | "no-changes" | "no-signal";
type Attempt = {
  readonly outcome: Outcome;
  /** Posted back onto the issue. */
  readonly comment: string;
  /** Set only when a pull request was opened — the watcher pauses on it. */
  readonly pullRequest?: string;
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

// ------------------------------------------------------------------ github

/** Oldest first, so the queue is FIFO rather than newest-wins. */
const queuedIssues = (): Issue[] =>
  (
    JSON.parse(
      gh("issue", "list", "--state", "open", "--label", LABEL, "--json", "number,title", "--limit", "50"),
    ) as Issue[]
  ).sort((a, b) => a.number - b.number);

/**
 * Take the issue out of the queue and say why. The label comes off first: it is
 * the only thing standing between a permanently failing issue and an infinite
 * retry loop, so it must not depend on the comment succeeding.
 */
const release = (issue: Issue, comment: string) => {
  gh("issue", "edit", String(issue.number), "--remove-label", LABEL);
  gh("issue", "comment", String(issue.number), "--body", comment);
};

const openPullRequest = (issue: Issue, branch: string) => {
  git("push", "--set-upstream", "origin", branch);

  const existing = JSON.parse(
    gh("pr", "list", "--head", branch, "--state", "open", "--json", "url"),
  ) as { url: string }[];
  if (existing.length > 0) return existing[0].url;

  const subjects = git("log", "--reverse", "--pretty=format:%s", `${BASE_BRANCH}..${branch}`)
    .split("\n")
    .filter(Boolean);

  const body = [
    `Closes #${issue.number}`,
    "",
    "Implemented by the Sandcastle agent in a container, with `pnpm exec tsc --noEmit`,",
    "`pnpm lint` and `pnpm build` green inside the sandbox. This repo has no test suite, so",
    "that is the whole gate. No human has read this yet — review it like a stranger's first PR.",
    "",
    "## Commits",
    "",
    ...subjects.map((subject) => `- ${subject}`),
  ].join("\n");

  const output = gh(
    "pr", "create",
    "--base", PR_BASE,
    "--head", branch,
    "--title", subjects[0] ?? issue.title,
    "--body", body,
  );
  return output.split("\n").filter(Boolean).pop() ?? `(created, see ${branch})`;
};

// --------------------------------------------------------------- worktrees

/**
 * Each run leaves a worktree carrying a ~2GB node_modules. Sandcastle removes it
 * itself when the agent left nothing uncommitted, but a crash or an abort does
 * not. Clearing them before the next issue keeps at most one on disk, and still
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

// ------------------------------------------------------------------ worker

const implement = async (issue: Issue, threadTs?: string): Promise<Attempt> => {
  const branch = `sandcastle/issue-${issue.number}`;

  // Naming the log path ourselves means we also have to guarantee its directory;
  // sandcastle only creates the one it picks itself.
  mkdirSync(LOGS, { recursive: true });

  clearLeftoverWorktrees();

  // Cut from a current base rather than from whatever the host has checked out.
  git("fetch", "origin", "--prune");

  log(`  running on ${branch}, cut from ${BASE_BRANCH}`);

  const result = await run({
    name: `issue-${issue.number}`,
    cwd: REPO_ROOT,
    sandbox: sandbox(),

    agent: claudeCode(MODEL, { effort: "high" }),

    promptFile: PROMPT_FILE,
    promptArgs: { ISSUE_NUMBER: String(issue.number), ISSUE_TITLE: issue.title },

    // Naming the log file is what buys the progress callback: sandcastle only
    // offers onAgentStreamEvent in log-to-file mode, and that mode wants an
    // explicit path rather than the auto-generated one it would pick itself.
    // Kept to the same branch-derived name sandcastle would have chosen, so
    // `tail -f .sandcastle/logs/<branch>-*.log` still finds it.
    logging: {
      type: "file",
      path: join(LOGS, `${branch.replaceAll("/", "-")}.log`),
      onAgentStreamEvent: progressReporter(threadTs),
    },

    // One shot per issue. The loop out here is what handles "there is more work",
    // and a retry that starts from the same prompt rarely does better anyway.
    maxIterations: 1,

    // A branch of its own, so a bad attempt is a branch nobody merges rather than
    // commits on whatever you were working on.
    branchStrategy: { type: "branch", branch, baseBranch: BASE_BRANCH },

    hooks: { sandbox: { onSandboxReady: startupCommands } },

    // The agent reports blocked as its own signal — a run that ends without
    // either is a run that died, and is treated as a failure below.
    completionSignal: [COMPLETE, BLOCKED],

    // Fifteen minutes of total silence. The test suite alone is ~2 minutes.
    idleTimeoutSeconds: 900,

    signal: controller.signal,
  });

  const commits = result.commits.length;
  const logRef = result.logFilePath ?? ".sandcastle/logs/";
  log(`  signal ${result.completionSignal ?? "(none)"} · ${commits} commit(s) · log ${logRef}`);

  if (result.completionSignal === BLOCKED) {
    return {
      outcome: "blocked",
      comment:
        `🏖️ The Sandcastle agent could not implement this and reported itself blocked` +
        `${commits > 0 ? ` (it left ${commits} commit(s) on \`${branch}\`, unpushed)` : ""}.\n\n` +
        `The reasoning is in \`${logRef}\` on the host. ` +
        `Usually this means the issue needs more detail. Re-add the **${LABEL}** label once it does.`,
    };
  }

  if (!result.completionSignal) {
    return {
      outcome: "no-signal",
      comment:
        `🏖️ The Sandcastle run ended without finishing — no completion signal, ${commits} commit(s). ` +
        `That normally means it hit the idle timeout or crashed mid-task.\n\n` +
        `Log: \`${logRef}\`. Branch \`${branch}\` is left as it was, unpushed. ` +
        `Re-add the **${LABEL}** label to try again.`,
    };
  }

  if (commits === 0) {
    return {
      outcome: "no-changes",
      comment:
        `🏖️ The Sandcastle agent reported done but committed nothing, so there is no pull request.\n\n` +
        `Either the work was already on \`${PR_BASE}\`, or it changed files and never committed them ` +
        `(those are gone — the container is deleted). Log: \`${logRef}\`.`,
    };
  }

  const url = openPullRequest(issue, branch);
  return {
    outcome: "shipped",
    comment: `🏖️ Implemented by the Sandcastle agent: ${url}\n\nThis issue closes when that pull request is merged.`,
    pullRequest: url,
  };
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

const remainingText = (queued: number) =>
  queued === 0 ? "Nothing else is queued." : `${queued} more issue${queued === 1 ? "" : "s"} queued.`;

/**
 * Posted when the issue is picked up, and the parent of every later message
 * about it: progress, outcome, and the merged/closed notice all thread under
 * this one, so the channel keeps one entry per issue rather than three.
 */
const startMessage = (issue: Issue, queued: number) =>
  [
    `🏰 *Working on* ${issueLink(issue)}`,
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

const slackMessage = (issue: Issue, attempt: Attempt, queued: number) => {
  const link = issueLink(issue);
  const remaining = remainingText(queued);

  if (attempt.pullRequest) {
    return [
      `🏰 *Pull request ready for review* — ${attempt.pullRequest}`,
      `Implements ${link}.`,
      `Nothing else runs until you merge or close it. ${remaining}`,
    ].join("\n");
  }

  return [
    `🏰 ${link} — *${attempt.outcome}*, no pull request.`,
    "The label is off the issue; re-add it to ask for another attempt.",
    `Still watching. ${remaining}`,
  ].join("\n");
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

// ----------------------------------------------------------- one issue

/**
 * An issue from picked-up to dealt-with: run the agent, report the outcome to
 * GitHub and Slack, and — if it produced a pull request — park until that is
 * merged or closed. Returns false when the watcher should stop.
 */
const processIssue = async (issue: Issue, queued: number): Promise<boolean> => {
  // Announced before any work starts, so the channel shows the issue was picked
  // up rather than going quiet for the ten minutes the agent takes. Its ts is the
  // thread everything else about this issue hangs off; if this post failed, ts is
  // absent and the later messages degrade to top-level posts rather than to
  // nothing.
  const thread = await notifySlack(startMessage(issue, queued));
  if (thread.error) log(`  WARNING: Slack start notification failed: ${thread.error}`);

  let attempt: Attempt;
  try {
    attempt = await implement(issue, thread.ts);
  } catch (error) {
    if (controller.signal.aborted) {
      log(`  cancelled — #${issue.number} keeps its label and will be picked up next time.`);
      return false;
    }
    const detail = describe(error);
    log(`  #${issue.number} errored: ${detail}`);
    attempt = {
      outcome: "no-signal",
      comment:
        `🏖️ The Sandcastle run for this issue failed on the host, before or after the agent:\n\n` +
        "```\n" + detail + "\n```\n\n" +
        `Re-add the **${LABEL}** label once that is sorted.`,
    };
  }

  log(`  #${issue.number} → ${attempt.outcome}`);

  try {
    release(issue, attempt.comment);
  } catch (error) {
    // The label is still on the issue, so the next poll picks it up again. That is
    // the right behaviour for a GitHub blip and the wrong one for anything else —
    // hence the loud log.
    log(`  WARNING: could not update #${issue.number} on GitHub, it stays queued: ${describe(error)}`);
    await sleep(POLL_SECONDS);
  }

  const post = await notifySlack(slackMessage(issue, attempt, queued), thread.ts);
  if (post.error) log(`  WARNING: Slack notification failed: ${post.error}`);

  // The pause. Everything above this line is one issue; nothing below starts
  // another until the pull request is dealt with.
  if (!attempt.pullRequest) return true;

  const state = await waitForReview(attempt.pullRequest);
  if (!state) return false; // interrupted while parked

  // Threaded under the issue's start message, alongside the progress updates and
  // the outcome, so the channel keeps one entry per issue.
  await notifySlack(
    state === "MERGED"
      ? `:white_check_mark: Merged. Back to watching for *${LABEL}* issues.`
      : `:no_entry_sign: Closed without merging. Back to watching for *${LABEL}* issues.`,
    thread.ts,
  );

  return true;
};

// -------------------------------------------------------------------- loop

log(`Watching ${REPO} for open issues labelled "${LABEL}".`);
log(`Base ${BASE_BRANCH} · model ${MODEL} · polling every ${POLL_SECONDS}s · Ctrl-C to stop.`);
log(`Slack notifications ${slackStatus}.`);

while (!controller.signal.aborted) {
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

  if (!(await processIssue(issue, rest.length))) break;
}

log("Watcher stopped.");
