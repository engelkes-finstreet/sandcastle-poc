import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join, sep } from "node:path";
import { Output, claudeCode, run } from "@ai-hero/sandcastle";
import {
  BASE_BRANCH,
  BLOCKED,
  CODE_REVIEW_PROMPT,
  COMPLETE,
  FOLLOW_UP_PROMPT,
  IDLE_TIMEOUT_SECONDS,
  IMPLEMENT_PROMPT,
  LABEL,
  LOGS,
  MAX_REVISION_ROUNDS,
  MODEL,
  PLAN_PROMPT,
  PLAN_TAG,
  PR_BASE,
  REPO_ROOT,
  REVIEW_MODEL,
  VERDICTS,
  WORKTREES,
  branchFor,
  logFileFor,
  logRefFor,
} from "./config.mts";
import { markReadyForReview, syncBranchFromOrigin } from "./github.mts";
import { sandbox, startupCommands } from "./sandbox.mts";
import { describe, git, log } from "./shell.mts";
import { controller } from "./shutdown.mts";
import type {
  Attempt,
  AwaitingRevision,
  ChangeRequest,
  CodeReview,
  Issue,
  Outcome,
  Planned,
  Tracked,
  Verdict,
} from "./types.mts";

// The agent runs, and everything about how a container is configured. Each phase is
// one `run()`; the host decides what happens around it. Only one is ever alive at a
// time, which is what keeps the worktree handling below as simple as it is —
// docs/adr/0006-a-shipped-pull-request-still-listens.md.

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

// ------------------------------------------ rescuing what a dead run left behind

/** An issue branch, for the `Refs #n` line of a rescue commit. */
const ISSUE_BRANCH = /^sandcastle\/issue-(\d+)$/;

type HostWorktree = { readonly path: string; readonly branch: string };

/**
 * Every worktree under WORKTREES that git still has registered, with the branch it
 * is on. Asked of git rather than derived from the directory name: sandcastle names
 * its own worktrees, and a naming convention we do not own has no business being
 * hardcoded into a recovery path. A detached worktree is skipped — there is no
 * branch to commit onto.
 */
const managedWorktrees = (): HostWorktree[] =>
  git("worktree", "list", "--porcelain")
    .split("\n\n")
    .map((block) => ({
      path: /^worktree (.+)$/m.exec(block)?.[1],
      branch: /^branch refs\/heads\/(.+)$/m.exec(block)?.[1],
    }))
    // `WORKTREES + sep`, not `WORKTREES`: a bare prefix would also claim a sibling
    // directory whose name merely starts the same way, and this list decides what
    // gets committed to somebody's branch.
    .filter(
      (wt): wt is HostWorktree =>
        !!wt.path && !!wt.branch && wt.path.startsWith(WORKTREES + sep),
    );

/**
 * Commit whatever a run left uncommitted in one worktree, as a single `wip` commit
 * on the branch that worktree is on. Returns the number of files committed, 0 when
 * there was nothing to commit.
 *
 * This is the whole of the crash-recovery story, and it works because of where the
 * work actually is. The worktree is a git worktree of *this* repo, bind-mounted into
 * the container, so the agent's files land on host disk as it writes them and the
 * branch is an ordinary local branch. Committing them needs neither the container
 * (deleted the moment the run ended) nor the network (a commit writes objects and
 * moves a local ref) — which is why a run that died *because* the connection dropped
 * can still have its work saved, minutes or days later.
 *
 * Never pushed, and `wip` in the subject line: none of this passed the gate, and
 * some of it is half a file. It is a checkpoint on a branch nobody has merged, so
 * that a retry starts from the last run's work instead of from nothing — and so that
 * `clearLeftoverWorktrees` can delete a 2GB worktree without deleting an hour of
 * work along with it.
 *
 * Best-effort by construction: every caller is already reporting a failure, and a
 * rescue that threw would replace that report with its own.
 */
const commitWorktree = ({ path, branch }: HostWorktree): number => {
  try {
    // A container killed mid-`git` leaves a lock behind, and the next `add` fails
    // with something that reads like a corrupt repository. The index of a linked
    // worktree lives in the main repo's .git/worktrees/<name>/, not in the worktree.
    rmSync(join(git("-C", path, "rev-parse", "--absolute-git-dir"), "index.lock"), { force: true });

    // `-uall` so the count is files: without it a whole new feature directory is one
    // porcelain line, and "rescued 1 file" for nine files is worse than no number.
    const dirty = git("-C", path, "status", "--porcelain", "-uall").split("\n").filter(Boolean);
    if (dirty.length === 0) return 0;

    // Safe to sweep everything in: node_modules, .next, styled-system, .npmrc and
    // .env are all gitignored, so what is left is what the agent wrote.
    git("-C", path, "add", "-A");

    const issue = ISSUE_BRANCH.exec(branch)?.[1];
    git(
      "-C", path,
      "commit",
      "--no-verify",
      "-m",
      `wip(${issue ? `#${issue}` : branch}): uncommitted work from a run that died` +
        `\n\nCommitted by the Sandcastle host, not by the agent. It never passed the gate.` +
        (issue ? `\n\nRefs #${issue}` : ""),
    );

    log(`  rescued ${dirty.length} uncommitted file(s) onto ${branch} as a wip commit`);
    return dirty.length;
  } catch (error) {
    log(`  WARNING: could not rescue the worktree at ${path}: ${describe(error)}`);
    return 0;
  }
};

/** The same, for the one worktree a given branch is checked out in. */
export const commitLeftovers = (branch: string): number => {
  const worktree = managedWorktrees().find((wt) => wt.branch === branch);
  return worktree ? commitWorktree(worktree) : 0;
};

/**
 * Commit what every leftover worktree holds, and remove nothing.
 *
 * Called at startup, where leftovers belong to a process that is no longer running:
 * a Ctrl-C, a `kill`, a closed laptop, a host crash. None of those reach the error
 * path in workflow.mts, so nothing there gets the chance to report — or to save —
 * what the run had written. This is the watcher coming back for it afterwards, and
 * it needs nothing that expires: the files are on disk and the branch is local.
 *
 * The worktrees themselves are left where they are, so the last one is still there
 * to inspect. `clearLeftoverWorktrees` deletes them at the start of the next run.
 */
export const rescueLeftovers = () => {
  if (!existsSync(WORKTREES)) return;
  for (const worktree of managedWorktrees()) commitWorktree(worktree);
};

/**
 * Each run leaves a worktree carrying a ~2GB node_modules. Sandcastle removes it
 * itself when the agent left nothing uncommitted, but a crash or an abort does
 * not. Clearing them before the next run keeps at most one on disk, and still
 * leaves the last one around to inspect after a Ctrl-C.
 *
 * Nothing is removed before its contents are on a branch: the rescue runs first, so
 * "clear the leftovers" can never mean "throw away the work in them".
 */
const clearLeftoverWorktrees = () => {
  if (!existsSync(WORKTREES)) return;
  rescueLeftovers();
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
 * Shared by all four phases; the prompt, the output and the model are what differ.
 * The model is a parameter because the reviewer runs on a cheaper one than the
 * agent it reviews — see REVIEW_MODEL.
 */
const runOptions = (branch: string, model: string = MODEL) => {
  mkdirSync(LOGS, { recursive: true });
  clearLeftoverWorktrees();

  // Cut from a current base rather than from whatever the host has checked out.
  git("fetch", "origin", "--prune");

  return {
    cwd: REPO_ROOT,
    sandbox: sandbox(),
    agent: claudeCode(model, { effort: "high" as const }),

    // One log file per branch, named rather than auto-generated: all four phases
    // of an issue append to it, and the path is quoted at a human in Slack and in
    // pull request comments, so it has to be predictable from the branch alone.
    logging: {
      type: "file" as const,
      path: logFileFor(branch),
    },

    // Required by `output`, and right anyway: the loop out here is what handles
    // "there is more work".
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

// ------------------------------------------------------------ phase 1: plan

/** Reads the issue, runs the kickoff skill, writes no code. */
export const planIssue = async (issue: Issue): Promise<Planned> => {
  const branch = branchFor(issue.number);
  log(`  planning on ${branch}, cut from ${BASE_BRANCH}`);

  const result = await run({
    ...runOptions(branch),
    name: `issue-${issue.number}-plan`,
    promptFile: PLAN_PROMPT,
    promptArgs: { ISSUE_NUMBER: String(issue.number), ISSUE_TITLE: issue.title },
    output: Output.string({ tag: PLAN_TAG }),
  });

  return { plan: result.output.trim(), branch };
};

// ------------------------------------------------------- phase 3: implement

/**
 * What to say on the pull request about work a dead run left behind. Read by a human
 * who is being told their issue failed, so it says where the code is and what it is
 * not: not pushed, not gated, not necessarily finished.
 */
const leftoversNote = (rescued: number, branch: string) =>
  rescued === 0
    ? ""
    : `\n\nThe ${rescued} file(s) it had written but not committed are now on \`${branch}\` as a ` +
      `\`wip\` commit, and none of it passed the gate. \`git log ${branch}\` to see it; a retry ` +
      `starts from it rather than from nothing.\n\nThe host does not push it — but it is an ` +
      `ordinary commit on this branch, so the next run that *does* push will carry it into this ` +
      `pull request. \`git reset --hard origin/${branch}\` on the host drops it if you would ` +
      `rather it never appeared here.`;

/** What both code-writing phases know about their own run, before it is judged. */
type Ran = { readonly branch: string; readonly logRef: string; readonly commits: number };

/**
 * The endings that leave nothing pushed, and the one thing every one of them has to
 * do before it can say so: commit whatever the dead run left in the worktree, so
 * the next attempt starts from it rather than from nothing.
 *
 * Only the mechanics are shared. The prose is what a human reads on the pull
 * request, and it differs by ending *and* by phase — a follow-up that came back
 * blocked is a different message from an implementation that did — so it arrives as
 * a function of what was rescued.
 */
const unshipped = (outcome: Outcome, { branch, logRef, commits }: Ran, body: (rescued: number) => string): Attempt => {
  const rescued = commitLeftovers(branch);
  return { outcome, logRef, commits, rescued, comment: body(rescued) + leftoversNote(rescued, branch) };
};

/**
 * Builds the approved plan, then pushes and readies the pull request — but only
 * for the one outcome that earned it. Every other ending returns an Attempt whose
 * comment says what happened, leaves the branch unpushed, and rescues whatever the
 * agent left uncommitted — see commitWorktree.
 *
 * The shipped path deliberately does not rescue. The agent is told to leave the
 * worktree clean, and a `wip` commit made *after* a successful implementation would
 * ride along on the next push into a pull request a human is already reviewing.
 */
export const implementPlan = async (tracked: Tracked, approval: string): Promise<Attempt> => {
  const { issue, branch, prNumber, prUrl } = tracked;
  log(`  implementing #${issue.number} on ${branch}`);

  const result = await run({
    ...runOptions(branch),
    name: `issue-${issue.number}-implement`,
    promptFile: IMPLEMENT_PROMPT,
    promptArgs: {
      ISSUE_NUMBER: String(issue.number),
      ISSUE_TITLE: issue.title,
      PR_URL: prUrl,
      PLAN: tracked.plan,
      APPROVAL: approval,
    },
    completionSignal: [COMPLETE, BLOCKED],
  });

  const commits = result.commits.length;
  const logRef = result.logFilePath ?? ".sandcastle/logs/";
  const ran: Ran = { branch, logRef, commits };
  log(`  signal ${result.completionSignal ?? "(none)"} · ${commits} commit(s) · log ${logRef}`);

  if (result.completionSignal === BLOCKED) {
    return unshipped(
      "blocked",
      ran,
      () =>
        `🏖️ The agent could not implement the approved plan and reported itself blocked` +
        `${commits > 0 ? ` (it left ${commits} commit(s) on \`${branch}\`, unpushed)` : ""}.\n\n` +
        `The reasoning is in \`${logRef}\` on the host. This pull request stays a draft. ` +
        `Re-add the **${LABEL}** label to the issue to start over from planning.`,
    );
  }

  if (!result.completionSignal) {
    return unshipped(
      "no-signal",
      ran,
      () =>
        `🏖️ The implementation run ended without finishing — no completion signal, ${commits} commit(s). ` +
        `That normally means it hit the idle timeout or crashed mid-task.\n\n` +
        `Log: \`${logRef}\`. Nothing was pushed. Re-add the **${LABEL}** label to the issue to try again.`,
    );
  }

  if (commits === 0) {
    return unshipped(
      "no-changes",
      ran,
      (rescued) =>
        `🏖️ The agent reported done but committed nothing, so there is nothing to review.\n\n` +
        (rescued > 0
          ? `It did change files and never committed them.`
          : `Either the work was already on \`${PR_BASE}\`, or it left nothing behind at all.`) +
        ` Log: \`${logRef}\`.`,
    );
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
 * Read the pushed diff and report on it. Every phase runs in a fresh session now,
 * but for this one it is a requirement rather than a saving: the run that reviews
 * must not be the run that wrote the code. An agent reading its own conversation
 * agrees with itself, which is the same as no review at all — so the reviewer gets
 * the diff, the approved plan and the repo's skills, and nothing else.
 *
 * Runs after the push, not before it. The implementation is finished either way,
 * and a reviewer that stood between working code and the remote would turn every
 * one of its own failures into a lost pull request. Findings are a comment; what
 * to do about them is a human's call.
 */
export const reviewCode = async (tracked: Tracked): Promise<CodeReview | undefined> => {
  const { issue, branch } = tracked;
  log(`  reviewing #${issue.number} on ${branch} with model ${REVIEW_MODEL}`);

  const result = await run({
    ...runOptions(branch, REVIEW_MODEL),
    name: `issue-${issue.number}-code-review`,
    promptFile: CODE_REVIEW_PROMPT,
    promptArgs: {
      ISSUE_NUMBER: String(issue.number),
      ISSUE_TITLE: issue.title,
      PLAN: tracked.plan,
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

// -------------------------------------------------------- phase 5: follow-up

/**
 * How the change request reads in the prompt: who said what, oldest first. Also
 * what Watchtower's timeline shows as the request, via notify.mts — one rendering,
 * so what the run was handed and what the dashboard says it was handed cannot
 * drift apart.
 */
export const changeRequestText = (request: ChangeRequest) =>
  request.since.map(({ author, body }) => `**@${author} wrote:**\n\n${body}`).join("\n\n---\n\n");

/**
 * The follow-up prompt's answer when it changed nothing on purpose. Pulled out by
 * hand for the same reason as `<testing>`: a missing tag is worth a vaguer comment,
 * never a discarded run.
 */
const NOTE_TAG = /<note>([\s\S]*?)<\/note>/;

/**
 * Act on a change request against a diff that has already shipped.
 *
 * Phase 3's machinery, and deliberately so: same container, same gate, same four
 * endings, same branch. Two things differ. It does not mark the pull request ready
 * — it already is — and it starts by reconciling the branch with its remote,
 * because the human who asked for the change has had this branch open for a while
 * and may have pushed to it themselves.
 *
 * What it never does is touch the base. A branch that has drifted into conflict is
 * a human's call on a pull request they are already reading; a rebase would rewrite
 * history underneath them. See
 * docs/adr/0006-a-shipped-pull-request-still-listens.md.
 */
export const followUp = async (
  tracked: AwaitingRevision,
  request: ChangeRequest,
): Promise<Attempt> => {
  const { issue, branch, prUrl } = tracked;
  const round = tracked.revisionRounds + 1;
  log(`  follow-up ${round}/${MAX_REVISION_ROUNDS} for #${issue.number} on ${branch}`);

  syncBranchFromOrigin(branch);

  const result = await run({
    ...runOptions(branch),
    name: `issue-${issue.number}-follow-up-${round}`,
    promptFile: FOLLOW_UP_PROMPT,
    promptArgs: {
      ISSUE_NUMBER: String(issue.number),
      ISSUE_TITLE: issue.title,
      PR_URL: prUrl,
      PLAN: tracked.plan,
      REQUEST: changeRequestText(request),
      BASE: BASE_BRANCH,
    },
    completionSignal: [COMPLETE, BLOCKED],
  });

  const commits = result.commits.length;
  const logRef = result.logFilePath ?? ".sandcastle/logs/";
  const ran: Ran = { branch, logRef, commits };
  const spent = `Round ${round} of ${MAX_REVISION_ROUNDS} is spent.`;
  log(`  signal ${result.completionSignal ?? "(none)"} · ${commits} commit(s) · log ${logRef}`);

  if (result.completionSignal === BLOCKED) {
    return unshipped(
      "blocked",
      ran,
      () =>
        `🏖️ The agent could not make the change you asked for and reported itself blocked` +
        `${commits > 0 ? ` (it left ${commits} commit(s) on \`${branch}\`, unpushed)` : ""}.\n\n` +
        `Its reasoning is in \`${logRef}\` on the host. **Nothing here has changed** — the code you ` +
        `reviewed is still exactly what is on this pull request. ${spent} Comment \`revise\` again ` +
        `with more to go on, or take it from here yourself.`,
    );
  }

  if (!result.completionSignal) {
    return unshipped(
      "no-signal",
      ran,
      () =>
        `🏖️ The follow-up run ended without finishing — no completion signal, ${commits} commit(s). ` +
        `That normally means it hit the idle timeout or crashed mid-task.\n\n` +
        `Log: \`${logRef}\`. Nothing was pushed, so this pull request is unchanged. ${spent} ` +
        `Comment \`revise\` to try again.`,
    );
  }

  if (commits === 0) {
    const note = NOTE_TAG.exec(result.stdout)?.[1]?.trim();
    return unshipped(
      "no-changes",
      ran,
      () =>
        `🏖️ The agent read your request and changed nothing.\n\n` +
        (note ?? `It left no explanation; \`${logRef}\` on the host has what it did.`) +
        `\n\n${spent} If that is the wrong answer, say so and comment \`revise\` again.`,
    );
  }

  git("push", "origin", branch);

  const subjects = git("log", `-n${commits}`, "--reverse", "--pretty=format:%s", branch)
    .split("\n")
    .filter(Boolean);

  const testing = testingNotes(result.stdout);
  if (!testing) log("  WARNING: the agent left no <testing> block — the comment has no manual steps");

  return {
    outcome: "shipped",
    logRef,
    commits,
    comment: [
      `🏰 Made the change you asked for and pushed ${commits} commit(s). ${spent}`,
      "",
      "`pnpm exec tsc --noEmit`, `pnpm lint` and `pnpm build` were green inside the sandbox — the same",
      "gate as before, and the same limits: nothing here has been *used*, only compiled.",
      "",
      "## What changed this round",
      "",
      ...subjects.map((subject) => `- ${subject}`),
      "",
      "## How to check it",
      "",
      testing ??
        "_The agent did not leave testing instructions. Check the run log on the host " +
          "(`.sandcastle/logs/`) for what it did, and exercise the change manually._",
    ].join("\n"),
    pullRequest: prUrl,
  };
};

/**
 * The Attempt to report when the host itself failed around the agent — a dropped
 * connection, a dead container, a `run()` that threw. `rescued` comes from the
 * caller, which commits the worktree before building this: see the catch in
 * workflow.mts, and commitWorktree above for why that is possible at all.
 */
export const hostFailureAttempt = (tracked: Tracked, detail: string, rescued: number): Attempt => ({
  outcome: "no-signal",
  logRef: logRefFor(tracked.branch),
  commits: 0,
  rescued,
  comment:
    `🏖️ The run failed on the host, before or after the agent:\n\n` +
    "```\n" + detail + "\n```\n\n" +
    (tracked.status === "awaiting-plan"
      ? `Re-add the **${LABEL}** label to the issue to start over from planning.`
      : `Nothing was pushed, so this pull request is unchanged. Comment \`revise\` to try again.`) +
    leftoversNote(rescued, tracked.branch),
});
