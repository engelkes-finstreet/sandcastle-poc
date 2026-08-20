import {
  AWAITING_LABEL,
  LABEL,
  MAX_REVISION_ROUNDS,
  PLAN_BLOCKED,
  REVISION_LABEL,
} from "./config.mts";
import {
  commentOnPr,
  decide,
  ensureStateLabels,
  openPlanPullRequest,
  relabel,
  release,
} from "./github.mts";
import {
  announceAbandoned,
  announceApproved,
  announceAttempt,
  announceCodeReview,
  announceCodeReviewSkipped,
  announceFinished,
  announceFollowUp,
  announcePlanGone,
  announcePlanPosted,
  announcePlanning,
  announcePlanningBlocked,
  announcePlanningFailed,
  announceRevising,
  announceRoundsSpent,
} from "./notify.mts";
import {
  commitLeftovers,
  followUp,
  hostFailureAttempt,
  implementPlan,
  planIssue,
  reviewCode,
} from "./phases.mts";
import { describe, log } from "./shell.mts";
import { controller } from "./shutdown.mts";
import { clearTracked, saveTracked } from "./state.mts";
import type {
  Attempt,
  AwaitingPlan,
  AwaitingRevision,
  ChangeRequest,
  CodeReview,
  Decision,
  Issue,
  PlanDraft,
  Reviewed,
  Serviced,
  Tracked,
} from "./types.mts";

// The state machine: what the watcher does with an issue, and with whatever a
// human says on its pull request. Every function here is at most one poll long —
// nothing waits on a person — so a shutdown never blocks on more than the step it
// is in. `Serviced` is how each of them reports back: see types.mts.

const now = () => new Date().toISOString();

/** The GitHub label that mirrors whichever state this issue is in. */
const labelFor = (tracked: Tracked) =>
  tracked.status === "awaiting-plan" ? AWAITING_LABEL : REVISION_LABEL;

/** Stop tracking an issue, and take its label off with it. */
const forget = (tracked: Tracked) => {
  relabel(tracked.issue, { remove: labelFor(tracked) });
  clearTracked(tracked.issue.number);
};

// ------------------------------------------------------------ phase 1: plan

/** Issue picked up → plan → draft pull request → tracked, awaiting approval. */
export const startIssue = async (issue: Issue, queued: number): Promise<boolean> => {
  // Announced before any work starts, so the channel shows the issue was picked
  // up rather than going quiet for the minutes the agent takes. If this post
  // failed, ts is absent and later messages degrade to top-level posts rather
  // than to nothing.
  const thread = await announcePlanning(issue, queued);
  if (thread.error) log(`  WARNING: Slack start notification failed: ${thread.error}`);

  let planned: Awaited<ReturnType<typeof planIssue>>;
  try {
    planned = await planIssue(issue);
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

  const stamp = now();
  const draft: PlanDraft = {
    status: "awaiting-plan",
    issue,
    branch: planned.branch,
    plan: planned.plan,
    threadTs: thread.ts,
    servicedThrough: stamp,
    repliedThrough: stamp,
  };

  const pr = openPlanPullRequest(draft);
  saveTracked({ ...draft, prUrl: pr.url, prNumber: pr.number });

  ensureStateLabels();
  relabel(issue, { add: AWAITING_LABEL, remove: LABEL });

  log(`  plan posted to ${pr.url} — waiting for a review comment`);
  await announcePlanPosted(issue, pr, planned.branch, thread.ts);

  return true;
};

// ------------------------------------------------------- endings either state

/**
 * The pull request went away. From `awaiting-plan` that is somebody deleting a
 * plan nobody approved; from `awaiting-revision` it is the ordinary end of an
 * issue's life, and the only ending this factory is really aiming for.
 */
const gone = async (tracked: Tracked, state: string) => {
  log(`  ${tracked.prUrl} is ${state.toLowerCase()} — dropping #${tracked.issue.number}`);
  forget(tracked);
  if (tracked.status === "awaiting-plan") await announcePlanGone(tracked, state);
  else await announceFinished(tracked, state);
};

const abandon = async (tracked: Tracked, decision: Reviewed) => {
  log(`  #${tracked.issue.number} abandoned by ${decision.author}`);
  commentOnPr(
    tracked.prNumber,
    tracked.status === "awaiting-plan"
      ? `🏖️ Abandoned at your request. Nothing was implemented; this pull request and its branch are ` +
          `left for you to delete. Re-add the **${LABEL}** label to the issue to start over.`
      : `🏖️ Abandoned at your request — the watcher has stopped tracking this issue and will not act ` +
          `on further comments here. The code that shipped is untouched: merge it, close it, or carry ` +
          `on with it yourself.`,
  );
  forget(tracked);
  await announceAbandoned(tracked, decision);
};

/**
 * A comment that is not one of this state's trigger words. Nothing happens — but
 * it has to *say* nothing happened, because silence is indistinguishable from a
 * watcher that has died, which is the failure this whole design was corrected for.
 * See docs/adr/0006-a-shipped-pull-request-still-listens.md.
 *
 * `repliedThrough` moves past the comment and `servicedThrough` does not, so the
 * nudge cannot repeat itself while the comment stays available to the next run
 * that is actually asked for.
 */
const clarify = async (tracked: Tracked, decision: Reviewed): Promise<Serviced> => {
  log(`  #${tracked.issue.number}: ${decision.author} commented, but not a trigger word — still waiting`);
  commentOnPr(
    tracked.prNumber,
    tracked.status === "awaiting-plan"
      ? `🏰 Only \`approve\` and \`abandon\` are read here, so nothing has changed and the plan above ` +
          `still stands. Notes ride along with the approval — \`approve, but …\` overrides the plan on ` +
          `that point. To start from a blank sheet instead, \`abandon\` and re-add the **${LABEL}** ` +
          `label to the issue.`
      : `🏰 Nothing has changed — only \`revise\` and \`abandon\` are read here. Comment \`revise\` and ` +
          `everything said since the last run reaches a fresh agent, so you can leave your notes ` +
          `first and trigger it when you are done. \`abandon\` stops the watcher tracking this ` +
          `pull request and leaves the code where it is.`,
  );
  saveTracked({ ...tracked, repliedThrough: now() });
  return "worked";
};

// ------------------------------------------------------- phase 3: implement

/** Approved: build it, report it, and hand the pull request over. */
const implement = async (tracked: AwaitingPlan, decision: Reviewed): Promise<Serviced> => {
  log(`  #${tracked.issue.number} approved by ${decision.author}`);
  await announceApproved(tracked, decision);

  let attempt: Attempt;
  try {
    attempt = await implementPlan(tracked, decision.comment);
  } catch (error) {
    if (controller.signal.aborted) {
      log(`  cancelled — #${tracked.issue.number} keeps its plan and stays tracked.`);
      return "stopped";
    }
    const detail = describe(error);
    log(`  #${tracked.issue.number} errored while implementing: ${detail}`);
    // The run is gone, but whatever it wrote is still in a worktree on host disk that
    // git has registered against this branch — so commit it here, before the next run
    // clears the worktree. Nothing about this needs the network, which is the point:
    // the failure that most often lands in this catch is the network going away.
    attempt = hostFailureAttempt(tracked, detail, commitLeftovers(tracked.branch));
  }

  log(`  #${tracked.issue.number} → ${attempt.outcome}`);
  const posted = commentOnPr(tracked.prNumber, attempt.comment);

  // Only shipped code is worth keeping an eye on. Everything else has already said
  // why on the pull request, and the issue goes back to needing a human.
  if (!attempt.pullRequest) {
    forget(tracked);
    const post = await announceAttempt(tracked, attempt, posted);
    if (post.error) log(`  WARNING: Slack notification failed: ${post.error}`);
    return "worked";
  }

  // Both clocks start again here. The approval that got us this far is older than
  // both, which is what stops it being read as a comment on the shipped code.
  const stamp = now();
  const shipped: AwaitingRevision = {
    ...tracked,
    status: "awaiting-revision",
    revisionRounds: 0,
    servicedThrough: stamp,
    repliedThrough: stamp,
  };
  saveTracked(shipped);
  relabel(tracked.issue, { add: REVISION_LABEL, remove: AWAITING_LABEL });

  const post = await announceAttempt(shipped, attempt, posted);
  if (post.error) log(`  WARNING: Slack notification failed: ${post.error}`);

  // ---- phase 4, switched off for now -------------------------------------
  // The whole point of the first runs is to watch plan → approve → implement
  // work end to end. A reviewer landing its own comment in the middle of that
  // is one more thing to read while you are still deciding whether the part you
  // actually care about worked — and it doubles the container time per issue
  // before anyone has seen the first pull request.
  //
  // Everything it needs is in place: `codeReview` below, `reviewCode` in
  // phases.mts, `prompts/code-review.md`, and the Slack wording in notify.mts.
  // Turning it on is this line plus the matching line in `announceAttempt`.
  //
  // Its comments carry BOT_MARKER, so `decide` cannot read them as a change
  // request — switching it on cannot turn phase 5 into a fix loop. That is the
  // line `0002` drew and `0006` keeps.
  //
  // await codeReview(shipped);
  // ------------------------------------------------------------------------

  return "worked";
};

// ------------------------------------------------------- phase 4: code review

/**
 * Best-effort by construction. It runs only once the branch is pushed and the pull
 * request is ready, so nothing it can do — throwing, timing out, coming back
 * without a `<review>` block — costs anything but the review itself. Hence no
 * return value: a shutdown here still leaves shipped code.
 *
 * What it must never do is fail quietly. Silence in the thread is
 * indistinguishable from a clean review, so every way out of here says something.
 *
 * **Currently switched off, and therefore currently uncalled** — see the commented
 * call in `implement` above for what to uncomment and why it is commented. It is
 * exported like this module's other entry points rather than left local, which is
 * also what keeps `noUnusedLocals` from failing the typecheck while it is parked.
 */
export const codeReview = async (tracked: Tracked) => {
  let review: CodeReview | undefined;

  try {
    review = await reviewCode(tracked);
  } catch (error) {
    if (controller.signal.aborted) {
      log(`  cancelled — #${tracked.issue.number} is pushed and ready, but unreviewed.`);
      return;
    }
    const detail = describe(error);
    log(`  #${tracked.issue.number} could not be reviewed: ${detail}`);
    await announceCodeReviewSkipped(tracked, `the review run failed: ${detail}`);
    return;
  }

  if (!review) {
    await announceCodeReviewSkipped(tracked, "the reviewer came back without a review");
    return;
  }

  const posted = commentOnPr(tracked.prNumber, review.comment);
  await announceCodeReview(tracked, review, posted);
};

// -------------------------------------------------------- phase 5: follow-up

/** `revise` on a shipped pull request: spend a round on what was asked for. */
const revise = async (tracked: AwaitingRevision, request: ChangeRequest): Promise<Serviced> => {
  if (tracked.revisionRounds >= MAX_REVISION_ROUNDS) {
    log(`  #${tracked.issue.number} has spent all ${MAX_REVISION_ROUNDS} follow-up rounds — letting go`);
    const posted = commentOnPr(
      tracked.prNumber,
      `🏖️ That is ${MAX_REVISION_ROUNDS} follow-up rounds spent, which is the limit — so the watcher ` +
        `has stopped tracking this issue and will not act on further comments here.\n\n` +
        `Nothing has been changed or lost: the code is exactly as the last round left it. Merge it, ` +
        `close it, or carry on with it yourself. If what is left is a separate piece of work, it is ` +
        `worth its own issue with the **${LABEL}** label rather than a fourth round on this one.`,
    );
    forget(tracked);
    await announceRoundsSpent(tracked, posted);
    return "worked";
  }

  log(`  #${tracked.issue.number}: ${request.author} asked for a change`);
  await announceRevising(tracked, request);

  let attempt: Attempt;
  try {
    attempt = await followUp(tracked, request);
  } catch (error) {
    if (controller.signal.aborted) {
      log(`  cancelled — #${tracked.issue.number} keeps its pull request and stays tracked.`);
      return "stopped";
    }
    const detail = describe(error);
    log(`  #${tracked.issue.number} errored during follow-up: ${detail}`);
    attempt = hostFailureAttempt(tracked, detail, commitLeftovers(tracked.branch));
  }

  log(`  #${tracked.issue.number} → follow-up ${attempt.outcome}`);
  const posted = commentOnPr(tracked.prNumber, attempt.comment);

  // The round is spent either way — a failed follow-up must not be free, or a
  // pull request could never run out of them.
  //
  // The two clocks part company here. `repliedThrough` always moves, or the same
  // `revise` would be the newest unanswered comment on the next poll and fire
  // again forever. `servicedThrough` moves only when the run actually acted on
  // what was said: a blocked or dead run acted on nothing, so those comments stay
  // in the payload of the next `revise` rather than having to be typed again.
  const acted = attempt.outcome === "shipped" || attempt.outcome === "no-changes";
  const stamp = now();
  saveTracked({
    ...tracked,
    revisionRounds: tracked.revisionRounds + 1,
    repliedThrough: stamp,
    servicedThrough: acted ? stamp : tracked.servicedThrough,
  });

  const post = await announceFollowUp(tracked, attempt, posted);
  if (post.error) log(`  WARNING: Slack notification failed: ${post.error}`);

  return "worked";
};

// ------------------------------------------------------------- the one turn

/**
 * One turn of servicing one tracked issue: read what the pull request says and act
 * on it. Never sleeps and never waits on a human — the loop in main.mts owns the
 * poll interval, because sleeping in here would multiply it by the number of
 * issues being tracked.
 */
export const serviceTracked = async (tracked: Tracked): Promise<Serviced> => {
  let decision: Decision;
  try {
    decision = decide(tracked);
  } catch (error) {
    log(`  could not read ${tracked.prUrl}, will retry: ${describe(error)}`);
    return "idle";
  }

  switch (decision.type) {
    case "wait":
      return "idle";
    case "gone":
      await gone(tracked, decision.state);
      return "worked";
    case "abandon":
      await abandon(tracked, decision);
      return "worked";
    case "unclear":
      return clarify(tracked, decision);
    // `decide` only offers each trigger in the state that reads it, so the other
    // branch of these is unreachable. Narrowed rather than asserted: an impossible
    // decision should degrade to the one-reply nudge, not to a crash.
    case "approve":
      return tracked.status === "awaiting-plan"
        ? implement(tracked, decision)
        : clarify(tracked, decision);
    case "revise":
      return tracked.status === "awaiting-revision"
        ? revise(tracked, decision)
        : clarify(tracked, decision);
  }
};
