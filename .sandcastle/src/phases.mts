import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { Output, claudeCode, run } from "@ai-hero/sandcastle";
import {
  BASE_BRANCH,
  BLOCKED,
  CODE_REVIEW_PROMPT,
  COMPLETE,
  IDLE_TIMEOUT_SECONDS,
  IMPLEMENT_PROMPT,
  LABEL,
  LOGS,
  MODEL,
  PLAN_PROMPT,
  PLAN_TAG,
  PR_BASE,
  REPO_ROOT,
  REVIEW_MODEL,
  REVISE_PROMPT,
  VERDICTS,
  WORKTREES,
  branchFor,
  logFileFor,
  logRefFor,
} from "./config.mts";
import { markReadyForReview, updatePlanBody } from "./github.mts";
import { progressReporter } from "./notify.mts";
import { sandbox, startupCommands } from "./sandbox.mts";
import { git, log } from "./shell.mts";
import { controller } from "./shutdown.mts";
import { savePending } from "./state.mts";
import type { Attempt, CodeReview, Issue, Pending, Planned, Session, Verdict } from "./types.mts";

// The four agent runs, and everything about how a container is configured. Each
// phase is one `run()`; the host decides what happens around it.

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
 * The code review's two answers, pulled out of stdout by hand for the same reason
 * as `<testing>` and more so: phase 4 runs *after* the branch is pushed, so a
 * malformed tag must degrade to "no review" rather than throw away a shipped
 * implementation. `Output.string` would throw.
 */
const REVIEW_BODY = /<review>([\s\S]*?)<\/review>/;
const REVIEW_VERDICT = new RegExp(`<verdict>\\s*(${VERDICTS.join("|")})\\s*</verdict>`, "i");

/**
 * A review whose verdict is missing is not a clean one. Defaulting to `NITS`
 * makes the Slack line say "read it" rather than "nothing to see", which is the
 * safe direction to be wrong in when the reviewer half-followed its prompt.
 */
const verdictOf = (stdout: string): Verdict =>
  (REVIEW_VERDICT.exec(stdout)?.[1]?.toUpperCase() as Verdict | undefined) ?? "NITS";

/** How the verdict reads on the pull request, where there is room to say what it means. */
const VERDICT_SUMMARY: Record<Verdict, string> = {
  CLEAN: "**Verdict: clean.** Nothing to change.",
  NITS: "**Verdict: nits.** Worth reading before you merge; nothing here should stop it.",
  CONCERNS: "**Verdict: concerns.** At least one finding a human should decide on before merging.",
};

const reviewComment = (verdict: Verdict, body: string) =>
  [
    "🏰 **Code review.** No human has read this pull request yet — a second agent has.",
    "",
    VERDICT_SUMMARY[verdict],
    "",
    "---",
    "",
    body,
    "",
    "---",
    "",
    `_Reviewed on \`${REVIEW_MODEL}\` by an agent that did not write this code and cannot see the_`,
    "_session that did. It read the diff and the code around it, checked it for complexity and_",
    "_against this repo's standards, and checked each part against the skill that part should have_",
    "_followed. It reviews; it never fixes — every finding here is yours to act on or ignore._",
  ].join("\n");

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

/**
 * Shared by all four phases; the prompt, the output, the resume and the model are
 * what differ. The model is a parameter because the reviewer runs on a cheaper
 * one than the agent it reviews — see REVIEW_MODEL.
 */
const runOptions = (branch: string, threadTs?: string, model: string = MODEL) => {
  mkdirSync(LOGS, { recursive: true });
  clearLeftoverWorktrees();

  // Cut from a current base rather than from whatever the host has checked out.
  git("fetch", "origin", "--prune");

  return {
    cwd: REPO_ROOT,
    sandbox: sandbox(),
    agent: claudeCode(model, { effort: "high" as const }),

    // Naming the log file is what buys the progress callback: sandcastle only
    // offers onAgentStreamEvent in log-to-file mode, and that mode wants an
    // explicit path rather than the auto-generated one it would pick itself.
    logging: {
      type: "file" as const,
      path: logFileFor(branch),
      onAgentStreamEvent: progressReporter(threadTs),
    },

    // Required by both `output` and `resumeSession`, and right anyway: the loop
    // out here is what handles "there is more work".
    maxIterations: 1 as const,

    // A branch of its own, so a bad attempt is a branch nobody merges rather than
    // commits on whatever you were working on. Sandcastle reuses the branch when
    // it already exists, which is what lets all four phases share it — and what
    // gives the reviewer the implementation's commits to read.
    branchStrategy: { type: "branch" as const, branch, baseBranch: BASE_BRANCH },

    hooks: { sandbox: { onSandboxReady: startupCommands } },

    idleTimeoutSeconds: IDLE_TIMEOUT_SECONDS,

    signal: controller.signal,
  };
};

const sessionOf = (result: { iterations: { sessionId?: string; sessionFilePath?: string }[] }): Session => {
  const last = result.iterations.at(-1);
  return { sessionId: last?.sessionId, sessionFilePath: last?.sessionFilePath };
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

// ------------------------------------------------------------ phase 1: plan

/** Reads the issue, runs the kickoff skill, writes no code. */
export const planIssue = async (issue: Issue, threadTs?: string): Promise<Planned> => {
  const branch = branchFor(issue.number);
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

// ---------------------------------------------------------- phase 2: revise

/** Phase 2's other branch: feedback that is not an approval. */
export const revisePlan = async (pending: Pending, feedback: string): Promise<Pending> => {
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

  updatePlanBody(revised);
  savePending(revised);
  return revised;
};

// ------------------------------------------------------- phase 3: implement

/**
 * Builds the approved plan, then pushes and readies the pull request — but only
 * for the one outcome that earned it. Every other ending returns an Attempt whose
 * comment says what happened and leaves the branch unpushed.
 */
export const implementPlan = async (pending: Pending, approval: string): Promise<Attempt> => {
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
  markReadyForReview(prNumber);

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

// ----------------------------------------------------- phase 4: code review

/**
 * Read the pushed diff and report on it. Deliberately *not* resumed: this is the
 * one run in the sequence that must not have written the code it is reading. An
 * agent reviewing its own session agrees with itself, which is the same as no
 * review at all — so the reviewer gets the diff, the approved plan and the repo's
 * skills, and nothing else.
 *
 * Runs after the push, not before it. The implementation is finished either way,
 * and a reviewer that stood between working code and the remote would turn every
 * one of its own failures into a lost pull request. Findings are a comment; what
 * to do about them is a human's call.
 */
export const reviewCode = async (pending: Pending): Promise<CodeReview | undefined> => {
  const { issue, branch } = pending;
  log(`  reviewing #${issue.number} on ${branch} with model ${REVIEW_MODEL}`);

  const result = await run({
    ...runOptions(branch, pending.threadTs, REVIEW_MODEL),
    name: `issue-${issue.number}-code-review`,
    promptFile: CODE_REVIEW_PROMPT,
    promptArgs: {
      ISSUE_NUMBER: String(issue.number),
      ISSUE_TITLE: issue.title,
      PLAN: pending.plan,
      BASE: BASE_BRANCH,
    },
  });

  // The prompt says read-only, and nothing here pushes, so a reviewer that
  // committed anyway has stranded those commits on the local branch — ahead of
  // what the pull request shows. Worth saying out loud rather than fixing
  // silently: resetting a branch under a worktree that may still exist is a
  // worse failure than a line in the log.
  const strayCommits = result.commits.length;
  if (strayCommits > 0) {
    log(
      `  WARNING: the review run committed ${strayCommits} time(s) on ${branch} despite being ` +
        `told not to. Those commits are local and unpushed — \`git reset --hard origin/${branch}\` clears them.`,
    );
  }

  const body = REVIEW_BODY.exec(result.stdout)?.[1]?.trim();
  if (!body) {
    log("  WARNING: the review run left no <review> block — nothing to post");
    return undefined;
  }

  const verdict = verdictOf(result.stdout);
  log(`  #${issue.number} reviewed → ${verdict}`);
  return { verdict, comment: reviewComment(verdict, body), strayCommits };
};

/** The Attempt to report when the host itself failed around the agent. */
export const hostFailureAttempt = (pending: Pending, detail: string): Attempt => ({
  outcome: "no-signal",
  logRef: logRefFor(pending.branch),
  commits: 0,
  comment:
    `🏖️ The implementation run failed on the host, before or after the agent:\n\n` +
    "```\n" + detail + "\n```\n\n" +
    `Re-add the **${LABEL}** label to the issue to start over from planning.`,
});
