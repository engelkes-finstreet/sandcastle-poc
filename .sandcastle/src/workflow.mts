import { AWAITING_LABEL, LABEL, PLAN_BLOCKED, POLL_SECONDS } from "./config.mts";
import {
  commentOnPr,
  decide,
  ensureAwaitingLabel,
  openPlanPullRequest,
  relabel,
  release,
  waitForReview,
} from "./github.mts";
import {
  announceAbandoned,
  announceApproved,
  announceAttempt,
  announceCodeReview,
  announceCodeReviewSkipped,
  announcePlanGone,
  announcePlanPosted,
  announcePlanRevised,
  announcePlanning,
  announcePlanningBlocked,
  announcePlanningFailed,
  announceReviewFinished,
} from "./notify.mts";
import { hostFailureAttempt, implementPlan, planIssue, reviewCode, revisePlan } from "./phases.mts";
import { describe, log } from "./shell.mts";
import { controller, sleep } from "./shutdown.mts";
import { clearPending, savePending } from "./state.mts";
import type { Attempt, CodeReview, Decision, Issue, Pending, Reviewed } from "./types.mts";

// The state machine: what the watcher does with an issue, and with the human's
// answer to a plan. Both functions return false when the watcher should stop —
// the only reason for that is a shutdown mid-step.

// ------------------------------------------------------------ phase 1: plan

/** Issue picked up → plan → draft pull request → pending state. */
export const startIssue = async (issue: Issue, queued: number): Promise<boolean> => {
  // Announced before any work starts, so the channel shows the issue was picked
  // up rather than going quiet for the minutes the agent takes. If this post
  // failed, ts is absent and later messages degrade to top-level posts rather
  // than to nothing.
  const thread = await announcePlanning(issue, queued);
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
    await announcePlanningFailed(issue, posted, thread.ts);
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
    await announcePlanningBlocked(issue, why, planned.branch, posted, thread.ts);
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
  await announcePlanPosted(issue, pr, planned.branch, thread.ts);

  return true;
};

// ------------------------------- phases 2, 3 and 4: review, implement, review

/** The pull request was closed or merged while its plan was still out for review. */
const dropPending = async (pending: Pending, state: string) => {
  log(`  ${pending.prUrl} is ${state.toLowerCase()} — dropping #${pending.issue.number}`);
  relabel(pending.issue, { remove: AWAITING_LABEL });
  clearPending(pending.issue.number);
  await announcePlanGone(pending, state);
};

const abandon = async (pending: Pending, decision: Reviewed) => {
  log(`  #${pending.issue.number} abandoned by ${decision.author}`);
  commentOnPr(
    pending.prNumber,
    `🏖️ Abandoned at your request. Nothing was implemented; this pull request and its branch are ` +
      `left for you to delete. Re-add the **${LABEL}** label to the issue to start over.`,
  );
  relabel(pending.issue, { remove: AWAITING_LABEL });
  clearPending(pending.issue.number);
  await announceAbandoned(pending, decision);
};

/** Feedback that is not an approval: re-plan, rewrite the description, wait again. */
const revise = async (pending: Pending, decision: Reviewed): Promise<boolean> => {
  log(`  #${pending.issue.number}: ${decision.author} asked for changes`);
  try {
    const revised = await revisePlan(pending, decision.comment);
    const posted = commentOnPr(
      revised.prNumber,
      `🏰 Plan revised — the description above is the new version. Comment \`approve\` to build it, ` +
        `or keep the feedback coming.`,
    );
    await announcePlanRevised(revised, decision, posted);
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
};

/**
 * Phase 4, and best-effort by construction. It runs only once the branch is
 * pushed and the pull request is ready, so nothing it can do — throwing, timing
 * out, coming back without a `<review>` block — costs anything but the review
 * itself. Hence no return value: a shutdown here still leaves shipped code.
 *
 * What it must never do is fail quietly. Silence in the thread is
 * indistinguishable from a clean review, so every way out of here says something.
 *
 * **Currently switched off, and therefore currently uncalled** — see the commented
 * call in `implement` below for what to uncomment and why it is commented. It is
 * exported like this module's other two entry points rather than left local,
 * which is also what keeps `noUnusedLocals` from failing the typecheck while it
 * is parked.
 */
export const codeReview = async (pending: Pending) => {
  let review: CodeReview | undefined;

  try {
    review = await reviewCode(pending);
  } catch (error) {
    if (controller.signal.aborted) {
      log(`  cancelled — #${pending.issue.number} is pushed and ready, but unreviewed.`);
      return;
    }
    const detail = describe(error);
    log(`  #${pending.issue.number} could not be reviewed: ${detail}`);
    await announceCodeReviewSkipped(pending, `the review run failed: ${detail}`);
    return;
  }

  if (!review) {
    await announceCodeReviewSkipped(pending, "the reviewer came back without a review");
    return;
  }

  const posted = commentOnPr(pending.prNumber, review.comment);
  await announceCodeReview(pending, review, posted);
};

/** Approved: build it, review it, report both, then park on the pull request. */
const implement = async (pending: Pending, decision: Reviewed): Promise<boolean> => {
  log(`  #${pending.issue.number} approved by ${decision.author}`);
  await announceApproved(pending, decision);

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
    attempt = hostFailureAttempt(pending, detail);
  }

  log(`  #${pending.issue.number} → ${attempt.outcome}`);
  const posted = commentOnPr(pending.prNumber, attempt.comment);
  relabel(pending.issue, { remove: AWAITING_LABEL });
  clearPending(pending.issue.number);

  const post = await announceAttempt(pending, attempt, posted);
  if (post.error) log(`  WARNING: Slack notification failed: ${post.error}`);

  // Only shipped code is worth reviewing, and only shipped code makes the watcher
  // wait. Everything else has already said why and moved on.
  if (!attempt.pullRequest) return true;

  // ---- phase 4, switched off for now -------------------------------------
  // The whole point of the first runs is to watch plan → approve → implement
  // work end to end. A reviewer landing its own comment in the middle of that
  // is one more thing to read while you are still deciding whether the part you
  // actually care about worked — and it doubles the container time per issue
  // before anyone has seen the first pull request.
  //
  // Everything it needs is in place: `codeReview` above, `reviewCode` in
  // phases.mts, `prompts/code-review.md`, and the Slack wording in notify.mts.
  // Turning it on is this line plus the matching line in `announceAttempt`.
  //
  // await codeReview(pending);
  // ------------------------------------------------------------------------

  // The pause. Nothing else starts until this pull request is dealt with.
  const state = await waitForReview(attempt.pullRequest);
  if (!state) return false; // interrupted while parked

  await announceReviewFinished(pending, state);
  return true;
};

/**
 * One turn of servicing the issue that already has a plan out for review: read
 * the decision off the pull request and act on it. Everything here is one poll
 * long, so a shutdown never waits on more than a `gh` call.
 */
export const servicePending = async (pending: Pending): Promise<boolean> => {
  let decision: Decision;
  try {
    decision = decide(pending);
  } catch (error) {
    log(`  could not read ${pending.prUrl}, will retry: ${describe(error)}`);
    await sleep(POLL_SECONDS);
    return true;
  }

  switch (decision.type) {
    case "wait":
      await sleep(POLL_SECONDS);
      return true;
    case "gone":
      await dropPending(pending, decision.state);
      return true;
    case "abandon":
      await abandon(pending, decision);
      return true;
    case "revise":
      return revise(pending, decision);
    case "approve":
      return implement(pending, decision);
  }
};
