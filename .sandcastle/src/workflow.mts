import { LABEL, MAX_REVISION_ROUNDS, PLAN_BLOCKED } from "./config.mts";
import { commentOnPr, decide, openPlanPullRequest } from "./forge.mts";
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
  reportUnclear,
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
import { tracker } from "./tracker.mts";
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

/** Stop tracking an issue, and let the tracker take its mark off with it. */
const forget = (tracked: Tracked) => {
  tracker.signal(tracked.issue, { type: "stopped", from: tracked.status });
  clearTracked(tracked.issue.key);
};

// ------------------------------------------------------------ phase 1: plan

/** Issue picked up → plan → draft pull request → tracked, awaiting approval. */
export const startIssue = async (issue: Issue, queued: number): Promise<boolean> => {
  // A no-op on GitHub, where nothing marks a pickup — but the moment belongs to
  // the lifecycle, and a tracker that can say "in progress" says it here.
  tracker.signal(issue, { type: "picked-up" });

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
      log(`  cancelled — ${tracker.issueRef(issue.key)} keeps its label and will be picked up next time.`);
      return false;
    }
    const detail = describe(error);
    log(`  ${tracker.issueRef(issue.key)} failed to plan: ${detail}`);
    const posted = tracker.release(
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
    log(`  ${tracker.issueRef(issue.key)} → blocked at planning`);
    const posted = tracker.release(
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

  const pr = openPlanPullRequest(draft, tracker.issueRef(issue.key));
  saveTracked({ ...draft, prUrl: pr.url, prNumber: pr.number });

  tracker.signal(issue, { type: "awaiting-approval" });

  log(`  plan posted to ${pr.url} — waiting for a review comment`);
  await announcePlanPosted(issue, pr, planned.branch, planned.plan, thread.ts);

  return true;
};

// ------------------------------------------------------- endings either state

/**
 * The pull request went away. From `awaiting-plan` that is somebody deleting a
 * plan nobody approved; from `awaiting-revision` it is the ordinary end of an
 * issue's life, and the only ending this factory is really aiming for.
 */
const gone = async (tracked: Tracked, state: string) => {
  log(`  ${tracked.prUrl} is ${state.toLowerCase()} — dropping ${tracker.issueRef(tracked.issue.key)}`);
  // The one moment with nothing to do on GitHub — the plan pull request's
  // `Closes` clause already closed the issue — but a tracker that has to be told
  // the work landed is told here, before the mirror of the wait comes down.
  //
  // Only from `awaiting-revision`, deliberately: a plan pull request merged
  // before approval lands one empty commit and no work, and announcePlanGone
  // below says to re-plan — an issue whose tracker was just told "shipped" is
  // not one anybody would re-plan.
  if (tracked.status === "awaiting-revision" && state === "MERGED") {
    tracker.signal(tracked.issue, { type: "shipped" });
  }
  forget(tracked);
  if (tracked.status === "awaiting-plan") await announcePlanGone(tracked, state);
  else await announceFinished(tracked, state);
};

const abandon = async (tracked: Tracked, decision: Reviewed) => {
  log(`  ${tracker.issueRef(tracked.issue.key)} abandoned by ${decision.author}`);
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
  log(`  ${tracker.issueRef(tracked.issue.key)}: ${decision.author} commented, but not a trigger word — still waiting`);
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
  saveTracked({ ...tracked, repliedThrough: decision.at });
  // No Slack message for this one — nothing happened, and a ping that says so is
  // the ping people learn to ignore. Watchtower still hears it: a timeline that
  // skipped the comment would leave the reply on the pull request unexplained.
  await reportUnclear(tracked, decision);
  return "worked";
};

// ------------------------------------------------------- phase 3: implement

/** Approved: build it, report it, and hand the pull request over. */
const implement = async (tracked: AwaitingPlan, decision: Reviewed): Promise<Serviced> => {
  log(`  ${tracker.issueRef(tracked.issue.key)} approved by ${decision.author}`);
  // A no-op on GitHub, which never marked an implementation starting; a tracker
  // with an "in progress" of its own moves the issue there now.
  tracker.signal(tracked.issue, { type: "implementing" });
  await announceApproved(tracked, decision);

  let attempt: Attempt;
  try {
    attempt = await implementPlan(tracked, decision.comment);
  } catch (error) {
    if (controller.signal.aborted) {
      log(`  cancelled — ${tracker.issueRef(tracked.issue.key)} keeps its plan and stays tracked.`);
      return "stopped";
    }
    const detail = describe(error);
    log(`  ${tracker.issueRef(tracked.issue.key)} errored while implementing: ${detail}`);
    // The run is gone, but whatever it wrote is still in a worktree on host disk that
    // git has registered against this branch — so commit it here, before the next run
    // clears the worktree. Nothing about this needs the network, which is the point:
    // the failure that most often lands in this catch is the network going away.
    attempt = hostFailureAttempt(tracked, detail, commitLeftovers(tracked.branch));
  }

  log(`  ${tracker.issueRef(tracked.issue.key)} → ${attempt.outcome}`);
  const posted = commentOnPr(tracked.prNumber, attempt.comment);

  // Only shipped code is worth keeping an eye on. Everything else has already said
  // why on the pull request, and the issue goes back to needing a human.
  if (!attempt.pullRequest) {
    forget(tracked);
    const post = await announceAttempt(tracked, attempt, posted);
    if (post.error) log(`  WARNING: Slack notification failed: ${post.error}`);
    return "worked";
  }

  // Both clocks restart at the approval itself, not at the moment this run
  // finished. The filter is strictly newer, so the approval is still not re-read —
  // but anything said *while* the agent was working is, which is the whole point:
  // "actually, also rename X" typed twenty minutes into an implementation is a
  // comment on this pull request, and a clock set to `now()` here would bury it.
  const shipped: AwaitingRevision = {
    ...tracked,
    status: "awaiting-revision",
    revisionRounds: 0,
    servicedThrough: decision.at,
    repliedThrough: decision.at,
  };
  saveTracked(shipped);
  tracker.signal(tracked.issue, { type: "awaiting-revision" });

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
      log(`  cancelled — ${tracker.issueRef(tracked.issue.key)} is pushed and ready, but unreviewed.`);
      return;
    }
    const detail = describe(error);
    log(`  ${tracker.issueRef(tracked.issue.key)} could not be reviewed: ${detail}`);
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

/**
 * What the watcher says on the pull request when it runs out of rounds. Said at the
 * end of the round that reached the bound, not when a further `revise` arrives: the
 * bound is reached the moment that round is spent, and a watcher that holds a label,
 * a state file and a `gh pr view` per poll open while having nothing left to offer is
 * worse than one that says so and lets go.
 */
const ROUNDS_SPENT =
  `🏖️ That is ${MAX_REVISION_ROUNDS} follow-up rounds spent, which is the limit — so the watcher ` +
  `has stopped tracking this issue and will not act on further comments here.\n\n` +
  `Nothing has been changed or lost: the code is exactly as the last round left it. Merge it, ` +
  `close it, or carry on with it yourself. If what is left is a separate piece of work, it is ` +
  `worth its own issue with the **${LABEL}** label rather than a fourth round on this one.`;

/** `revise` on a shipped pull request: spend a round on what was asked for. */
const revise = async (tracked: AwaitingRevision, request: ChangeRequest): Promise<Serviced> => {
  // Defensive only. A round is spent the moment it ends and the watcher lets go of
  // the issue there, so nothing should arrive here already at the bound — but a state
  // file written before that was true, or one whose `forget` half-failed, would.
  if (tracked.revisionRounds >= MAX_REVISION_ROUNDS) {
    log(`  ${tracker.issueRef(tracked.issue.key)} has spent all ${MAX_REVISION_ROUNDS} follow-up rounds — letting go`);
    const posted = commentOnPr(tracked.prNumber, ROUNDS_SPENT);
    forget(tracked);
    await announceRoundsSpent(tracked, posted);
    return "worked";
  }

  log(`  ${tracker.issueRef(tracked.issue.key)}: ${request.author} asked for a change`);
  await announceRevising(tracked, request);

  let attempt: Attempt;
  try {
    attempt = await followUp(tracked, request);
  } catch (error) {
    if (controller.signal.aborted) {
      log(`  cancelled — ${tracker.issueRef(tracked.issue.key)} keeps its pull request and stays tracked.`);
      return "stopped";
    }
    const detail = describe(error);
    log(`  ${tracker.issueRef(tracked.issue.key)} errored during follow-up: ${detail}`);
    attempt = hostFailureAttempt(tracked, detail, commitLeftovers(tracked.branch));
  }

  log(`  ${tracker.issueRef(tracked.issue.key)} → follow-up ${attempt.outcome}`);

  // The round is spent either way — a failed follow-up must not be free, or a
  // pull request could never run out of them — and spending the last one is the
  // second of only two ways an issue's life ends, so it is said in the same comment
  // that reports the round rather than waiting for somebody to ask again.
  const rounds = tracked.revisionRounds + 1;
  const spent = rounds >= MAX_REVISION_ROUNDS;
  const posted = commentOnPr(
    tracked.prNumber,
    spent ? `${attempt.comment}\n\n---\n\n${ROUNDS_SPENT}` : attempt.comment,
  );

  // The two clocks part company here, and neither is set from the host's clock:
  // both move to the *request's* timestamp, so a comment written while the container
  // was running is still newer than them and gets read on the next poll.
  //
  // `repliedThrough` always moves, or the same `revise` would be the newest
  // unanswered comment on the next poll and fire again forever. `servicedThrough`
  // moves only when the run actually acted on what was said: a blocked or dead run
  // acted on nothing, so those comments stay in the payload of the next `revise`
  // rather than having to be typed again.
  const acted = attempt.outcome === "shipped" || attempt.outcome === "no-changes";
  const after: AwaitingRevision = {
    ...tracked,
    revisionRounds: rounds,
    repliedThrough: request.at,
    servicedThrough: acted ? request.at : tracked.servicedThrough,
  };

  // On the spent path the clocks above are moot — there is no next run to hand
  // anything to, and the state file goes with the label.
  if (spent) forget(after);
  else saveTracked(after);

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
