import type { EventBody } from "@finstreet/watchtower-golem/emitter";
import type { EventType } from "@finstreet/watchtower-golem/events";
import {
  BASE_BRANCH,
  LABEL,
  MAX_REVISION_ROUNDS,
  MODEL,
  PR_BASE,
  REVIEW_MODEL,
  branchFor,
  logRefFor,
} from "./config.mts";
import { issueRef, issueUrl } from "./github.mts";
import { changeRequestText } from "./phases.mts";
import { notifyAsk, notifySlack, type SlackPost } from "./slack.mts";
import type {
  Attempt,
  AwaitingRevision,
  ChangeRequest,
  CodeReview,
  Issue,
  Reviewed,
  Tracked,
  Verdict,
} from "./types.mts";
import {
  about,
  changeRequestFor,
  changeRequestOf,
  endingOf,
  nextGeneration,
  outcomeOf,
  refFor,
  report,
} from "./watchtower.mts";

export { mentionStatus, slackStatus } from "./slack.mts";

// Every message the watcher sends, in the order a run sends them. Kept together
// and away from the state machine on purpose: the wording is what a human
// actually experiences, and it is easier to keep a conversation coherent when you
// can read the whole conversation in one file.
//
// slack.mts is the transport (a token, a POST, a thread ts). This is the voice.
//
// **Two kinds of message, and the difference is a notification.** `notifySlack` is
// a step: the factory did something and is carrying on. `notifyAsk` is a stop — the
// factory is now waiting on a person — so it is addressed to SLACK_MENTION. Both
// stay in the issue's thread; the mention is the whole difference.
//
// Which is which is not a matter of importance, it is a matter of *whose turn it
// is*. "Plan posted" asks; "implementing now" does not. A run that came back
// blocked asks, because somebody has to re-label the issue; a pull request that was
// merged does not, because the person reading it is the one who merged it. Grep for
// `notifyAsk` to see the whole list — it should stay short. Every message added to
// it makes the rest quieter, and the point of a ping is that it means something.
//
// **Two sinks, one list of moments.** Every message here also reports a structured
// event to Watchtower (watchtower.mts) — a dashboard rather than a conversation:
// the board, the timeline per issue, and whose turn it is across every project at
// once. It is fed from *here* rather than from the state machine so that the two
// sinks cannot drift apart: one moment is one message and one event, said together
// by `tell` below. The six asks map one-for-one onto the six events Watchtower
// reads as "needs a human", so that list staying short now matters in two places.
//
// Slack goes first and the event follows, and the event can never cost the
// message: see `tell`, and `report` in watchtower.mts.

// -------------------------------------------------------------- ingredients

/**
 * Slack's mrkdwn needs these three entity-escaped. Without it an issue titled
 * `Fix <Button> rendering` truncates its own link and renders as garbage.
 */
const escapeSlack = (text: string) =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const issueLink = (issue: Issue) =>
  `<${issueUrl(issue.key)}|${issueRef(issue.key)} ${escapeSlack(issue.title)}>`;

const prLink = (tracked: Pick<Tracked, "prUrl" | "prNumber">) =>
  `<${tracked.prUrl}|PR #${tracked.prNumber}>`;

/** A link, or nothing when the URL is missing — `gh` failures must not print `<undefined|…>`. */
const maybeLink = (url: string | undefined, text: string) => (url ? `<${url}|${text}>` : undefined);

/**
 * The "where to look" line each update ends with. Every step points at different
 * things — the plan, the comment that approved it, the files changed — and the
 * whole point of the thread is that you never have to go hunting for the right
 * tab. Missing links drop out rather than rendering as holes.
 */
const links = (...parts: (string | undefined)[]) => parts.filter(Boolean).join("  ·  ");

const logHint = (branch: string) => `log \`${logRefFor(branch)}\``;

const remainingText = (queued: number) =>
  queued === 0 ? "Nothing else is queued." : `${queued} more issue${queued === 1 ? "" : "s"} queued.`;

/** Absent parts drop out rather than rendering as blank lines, exactly like `links`. */
const lines = (...parts: (string | undefined)[]) => parts.filter(Boolean).join("\n");

/**
 * Both sinks, in order, for one moment.
 *
 * Slack first, because it is the sink a human is waiting on and the one that hands
 * back a thread. The event follows and cannot cost the message anything: `report`
 * swallows its own failures and builds the body inside its own guard, which is why
 * this takes a thunk rather than an object.
 *
 * The return value is Slack's, unchanged — callers thread on it.
 */
const tell = async <T extends EventType>(
  post: Promise<SlackPost>,
  type: T,
  event: () => EventBody<T>,
): Promise<SlackPost> => {
  const sent = await post;
  await report(type, event);
  return sent;
};

/** Zero rescued files is "nothing was rescued", and the wire says that by omission. */
const rescuedCount = (attempt: Attempt) => attempt.rescued || undefined;

/** What both code-writing phases report about a run that has just ended. */
const attemptResult = (tracked: Tracked, attempt: Attempt, posted: string | undefined) => ({
  outcome: outcomeOf(attempt.outcome),
  commits: attempt.commits,
  rescued: rescuedCount(attempt),
  changeRequest: changeRequestOf(tracked),
  commentUrl: posted,
  logRef: attempt.logRef,
});

// ------------------------------------------------------------ phase 1: plan

/**
 * Posted when the issue is picked up, and the parent of every later message
 * about it: the plan, progress, the outcome, and the merged/closed notice all
 * thread under this one, so the channel keeps one entry per issue rather than
 * five. Its ts is persisted with the rest of the state, so a watcher restart
 * during review keeps the thread.
 *
 * The one moment written longhand rather than through `tell`, because it is the
 * one that creates both of the things every later message reuses: Slack's thread,
 * and the Generation. A fresh plan is a fresh attempt — a human re-labelling a
 * failed issue is asking for attempt n+1 of the *same* task — so this is where
 * that number moves, and every event after it reads what it set.
 */
export const announcePlanning = async (issue: Issue, queued: number): Promise<SlackPost> => {
  const branch = branchFor(issue.key);

  const post = await notifySlack(
    lines(
      `🏰 *Planning* ${issueLink(issue)}`,
      `Branch \`${branch}\`, cut from \`${BASE_BRANCH}\`. ${remainingText(queued)}`,
    ),
  );

  await report("plan.started", () => ({
    externalRef: refFor(issue),
    generation: nextGeneration(issue.key),
    slackThreadTs: post.ts,
    payload: {
      title: issue.title,
      branch,
      baseBranch: BASE_BRANCH,
      model: MODEL,
      logRef: logRefFor(branch),
    },
  }));

  return post;
};

export const announcePlanningFailed = (issue: Issue, posted: string | undefined, threadTs?: string) =>
  tell(
    notifyAsk(
      lines(
        `🏰 ${issueLink(issue)} — *planning failed*. No plan, no pull request.`,
        "The label is off the issue; re-add it to try again.",
        links(maybeLink(posted, "What went wrong"), logHint(branchFor(issue.key))),
      ),
      threadTs,
    ),
    "plan.failed",
    () => ({
      ...about(issue, threadTs),
      payload: { commentUrl: posted, logRef: logRefFor(branchFor(issue.key)) },
    }),
  );

export const announcePlanningBlocked = (
  issue: Issue,
  why: string,
  branch: string,
  posted: string | undefined,
  threadTs?: string,
) =>
  tell(
    notifyAsk(
      lines(
        `🏰 ${issueLink(issue)} — *blocked at planning*. The agent says the issue does not say enough yet.`,
        `> ${why.split("\n")[0].slice(0, 220)}`,
        links(maybeLink(posted, "Full explanation"), logHint(branch)),
      ),
      threadTs,
    ),
    "plan.blocked",
    () => ({
      ...about(issue, threadTs),
      payload: {
        // The wire requires a reason, on the grounds that a block without one is
        // not actionable — and it is right, but the reason comes from an agent
        // that can emit the `BLOCKED:` marker with nothing after it. Slack
        // degrades to an empty blockquote; an empty string here would 422 and
        // strand the card in Planning with nothing said at all.
        why: why || "The planning run declined to plan and gave no reason.",
        branch,
        commentUrl: posted,
        logRef: logRefFor(branch),
      },
    }),
  );

/**
 * `plan` is carried for Watchtower alone. The Slack message links to the pull
 * request rather than quoting it, because a plan is pages long and a channel is
 * not where anyone reads one — but the dashboard shows the document, so it needs
 * the document, and this is the moment it exists.
 */
export const announcePlanPosted = (
  issue: Issue,
  pr: { url: string; number: number },
  branch: string,
  plan: string,
  threadTs?: string,
) =>
  tell(
    notifyAsk(
      lines(
        `🏰 *Plan posted, waiting for you* — <${pr.url}|PR #${pr.number}>`,
        `Plans ${issueLink(issue)}. Nothing is implemented yet; the branch holds one empty commit.`,
        "Comment `approve` on the pull request to build it — notes in that same comment override the plan.",
        links(
          maybeLink(pr.url, "Read the plan"),
          maybeLink(`${pr.url}#issuecomment-new`, "Reply to it"),
          logHint(branch),
        ),
      ),
      threadTs,
    ),
    "plan.posted",
    () => ({
      ...about(issue, threadTs),
      payload: {
        branch,
        changeRequest: changeRequestFor(pr),
        plan,
        maxRounds: MAX_REVISION_ROUNDS,
      },
    }),
  );

// ---------------------------------------------------------- phase 2: review

export const announcePlanGone = (tracked: Tracked, state: string) =>
  tell(
    notifySlack(
      lines(
        `🏰 ${issueLink(tracked.issue)} — ${prLink(tracked)} was ${state.toLowerCase()} before the plan was approved.`,
        `Dropped it. Re-add the **${LABEL}** label to plan it again.`,
      ),
      tracked.threadTs,
    ),
    "plan.gone",
    () => ({
      ...about(tracked.issue, tracked.threadTs),
      payload: { changeRequest: changeRequestOf(tracked), state: endingOf(state) },
    }),
  );

export const announceAbandoned = (tracked: Tracked, decision: Reviewed) =>
  tell(
    notifySlack(
      lines(
        `🏰 ${issueLink(tracked.issue)} — *abandoned* by ${decision.author}. Nothing was implemented.`,
        `${prLink(tracked)} and its branch are left for you to delete.`,
        links(maybeLink(decision.url, "The comment"), maybeLink(tracked.prUrl, "Pull request")),
      ),
      tracked.threadTs,
    ),
    "task.abandoned",
    () => ({
      ...about(tracked.issue, tracked.threadTs),
      payload: { author: decision.author, comment: decision.comment, commentUrl: decision.url },
    }),
  );

/**
 * Somebody commented and it was not a trigger word. The one moment Watchtower
 * hears about and Slack does not: `clarify` in workflow.mts answers on the pull
 * request and deliberately does not ping, because nothing happened — but a
 * timeline is a record of what happened, and somebody commenting is something
 * that happened. It moves no card and it is not an ask.
 */
export const reportUnclear = (tracked: Tracked, decision: Reviewed) =>
  report("comment.unclear", () => ({
    ...about(tracked.issue, tracked.threadTs),
    payload: { author: decision.author, comment: decision.comment, commentUrl: decision.url },
  }));

// ------------------------------------------------------- phase 3: implement

export const announceApproved = (tracked: Tracked, decision: Reviewed) =>
  tell(
    notifySlack(
      lines(
        `🏰 *Plan approved by ${decision.author} — implementing now* · ${prLink(tracked)}`,
        `Building the approved plan for ${issueLink(tracked.issue)} on \`${tracked.branch}\`, in a fresh session.`,
        links(
          maybeLink(decision.url, "The approval"),
          maybeLink(tracked.prUrl, "The plan"),
          logHint(tracked.branch),
        ),
      ),
      tracked.threadTs,
    ),
    "plan.approved",
    () => ({
      ...about(tracked.issue, tracked.threadTs),
      payload: {
        author: decision.author,
        comment: decision.comment,
        commentUrl: decision.url,
        branch: tracked.branch,
        model: MODEL,
        logRef: logRefFor(tracked.branch),
      },
    }),
  );

export const announceAttempt = (tracked: Tracked, attempt: Attempt, posted: string | undefined) =>
  tell(
    notifyAsk(
      attempt.pullRequest
        ? lines(
            `🏰 *Done — ready for your review* · ${prLink(tracked)}`,
            `Implements ${issueLink(tracked.issue)} with ${attempt.commits} commit(s), the gate green inside the sandbox.`,
            // Phase 4 is switched off in workflow.mts, so this must not promise a
            // review nobody is running. With it on, prefix the line below with:
            //   "A code review is running now and lands in this thread. "
            "Comment `revise` on the pull request for a change; merge or close it when you are done. " +
              "Other issues keep moving in the meantime.",
            links(
              maybeLink(`${tracked.prUrl}/files`, "Files changed"),
              maybeLink(posted, "How to test it locally"),
              `log \`${attempt.logRef}\``,
            ),
          )
        : lines(
            `🏰 ${issueLink(tracked.issue)} — *${attempt.outcome}* after an approved plan. Nothing was pushed.`,
            `${prLink(tracked)} stays a draft. The label is off the issue; re-add it to start over from planning.`,
            // Said out loud rather than left in the pull request comment: a failure
            // that saved an hour of work is a different thing to wake up to than one
            // that lost it, and this line is the one people actually read.
            rescueLine(attempt, tracked.branch),
            links(maybeLink(posted, "What it reported"), `log \`${attempt.logRef}\``),
          ),
      tracked.threadTs,
    ),
    "attempt.finished",
    () => ({
      ...about(tracked.issue, tracked.threadTs),
      payload: attemptResult(tracked, attempt, posted),
    }),
  );

// ----------------------------------------------------- phase 4: code review

/**
 * The verdict is the line most people will read, so it carries the whole message
 * in its first eight words. Emoji do the sorting: a green tick in the thread means
 * you can merge on the strength of the diff alone, a warning means you cannot.
 */
const VERDICT_LINE: Record<Verdict, string> = {
  CLEAN: ":white_check_mark: *Code review: clean* — nothing to change.",
  NITS: ":mag: *Code review: nits* — worth a read, nothing blocking.",
  CONCERNS: ":warning: *Code review: concerns* — something to decide before you merge.",
};

export const announceCodeReview = (
  tracked: Tracked,
  review: CodeReview,
  posted: string | undefined,
) =>
  tell(
    notifySlack(
      lines(
        `${VERDICT_LINE[review.verdict]} · ${prLink(tracked)}`,
        `A fresh agent on \`${REVIEW_MODEL}\` read the diff for ${issueLink(tracked.issue)} — it did not write this code and cannot see the session that did.`,
        review.strayCommits > 0
          ? `:warning: It also left ${review.strayCommits} commit(s) on \`${tracked.branch}\` despite being read-only. They are local and unpushed; \`git reset --hard origin/${tracked.branch}\` clears them.`
          : undefined,
        links(
          maybeLink(posted, "The review"),
          maybeLink(`${tracked.prUrl}/files`, "Files changed"),
          logHint(tracked.branch),
        ),
      ),
      tracked.threadTs,
    ),
    "review.finished",
    () => ({
      ...about(tracked.issue, tracked.threadTs),
      payload: {
        verdict: review.verdict,
        model: REVIEW_MODEL,
        strayCommits: review.strayCommits,
        commentUrl: posted,
        logRef: logRefFor(tracked.branch),
      },
    }),
  );

/**
 * The review did not happen. Said out loud rather than swallowed: silence here is
 * indistinguishable from a clean review, and that is the one wrong impression this
 * phase must never leave. Watchtower hears it for the same reason — an absent
 * verdict is never rendered there as a clean one either.
 */
export const announceCodeReviewSkipped = (tracked: Tracked, why: string) =>
  tell(
    notifySlack(
      lines(
        `:grey_question: *No code review* on ${prLink(tracked)} — ${escapeSlack(why)}`,
        `The implementation is pushed and ready either way; it just has not been read by anything but the agent that wrote it.`,
        links(maybeLink(`${tracked.prUrl}/files`, "Files changed"), logHint(tracked.branch)),
      ),
      tracked.threadTs,
    ),
    "review.skipped",
    () => ({ ...about(tracked.issue, tracked.threadTs), payload: { why } }),
  );

/**
 * What a rescued worktree gets said about it. "Not pushed" rather than "never
 * pushed", deliberately: the host itself never pushes a `wip` commit, but it sits
 * on an ordinary branch, so the *next* successful run's push carries it along into
 * the pull request. A line claiming otherwise would be found out by a `git log` on
 * the diff a human is reviewing, and the honesty of this wording is the whole point
 * of it — see docs/adr/0005-a-dead-run-does-not-take-its-work-with-it.md.
 */
const rescueLine = (attempt: Attempt, branch: string) =>
  attempt.rescued
    ? `:floppy_disk: ${attempt.rescued} uncommitted file(s) were rescued onto \`${branch}\` as a ` +
      `\`wip\` commit — never gated, and not pushed, though a later run's push would carry it. ` +
      `\`git reset --hard origin/${branch}\` drops it.`
    : undefined;

// ------------------------------------------------------- phase 5: follow-up

const roundsLine = (rounds: number) => {
  const left = MAX_REVISION_ROUNDS - rounds;
  return left === 0
    ? `That was the last of ${MAX_REVISION_ROUNDS} follow-up rounds.`
    : `${left} follow-up round${left === 1 ? "" : "s"} left of ${MAX_REVISION_ROUNDS}.`;
};

export const announceRevising = (tracked: AwaitingRevision, request: ChangeRequest) =>
  tell(
    notifySlack(
      lines(
        `🏰 *Change requested by ${request.author} — working on it* · ${prLink(tracked)}`,
        `Round ${tracked.revisionRounds + 1} of ${MAX_REVISION_ROUNDS} on \`${tracked.branch}\` for ` +
          `${issueLink(tracked.issue)}, in a fresh session that reads the diff rather than the plan.`,
        links(
          maybeLink(request.url, "The request"),
          maybeLink(`${tracked.prUrl}/files`, "Files changed"),
          logHint(tracked.branch),
        ),
      ),
      tracked.threadTs,
    ),
    "followup.started",
    () => ({
      ...about(tracked.issue, tracked.threadTs),
      payload: {
        round: tracked.revisionRounds + 1,
        maxRounds: MAX_REVISION_ROUNDS,
        author: request.author,
        // The change request as the run received it, not the trigger word alone:
        // "remove the guard" → "also rename X" → `revise` is the natural rhythm,
        // and the timeline should show what was actually asked for.
        comment: changeRequestText(request),
        commentUrl: request.url,
        model: MODEL,
        logRef: logRefFor(tracked.branch),
      },
    }),
  );

export const announceFollowUp = async (
  tracked: AwaitingRevision,
  attempt: Attempt,
  posted: string | undefined,
) => {
  const rounds = tracked.revisionRounds + 1;

  // Spending the last round *is* the watcher letting go, so this message has to say
  // so. Inviting another `revise` here would invite a comment nothing is listening
  // for any more — the state file and the label are already gone by the time this
  // posts. See the `spent` branch in workflow.mts.
  const spent = rounds >= MAX_REVISION_ROUNDS;
  const whatNext = spent
    ? "The watcher has stopped tracking this issue — merge the pull request, close it, or carry on with it yourself."
    : "Comment `revise` to try again.";

  const post = await tell(
    notifyAsk(
      attempt.pullRequest
        ? lines(
            `🏰 *Change made — back to you* · ${prLink(tracked)}`,
            `${attempt.commits} commit(s) on top of what you reviewed, the gate green inside the sandbox. ` +
              roundsLine(rounds) +
              (spent ? ` ${whatNext}` : ""),
            links(
              maybeLink(`${tracked.prUrl}/files`, "Files changed"),
              maybeLink(posted, "How to check it"),
              `log \`${attempt.logRef}\``,
            ),
          )
        : lines(
            `🏰 ${issueLink(tracked.issue)} — follow-up *${attempt.outcome}*. Nothing was pushed.`,
            `${prLink(tracked)} is exactly as you reviewed it. ${roundsLine(rounds)} ${whatNext}`,
            rescueLine(attempt, tracked.branch),
            links(maybeLink(posted, "What it reported"), `log \`${attempt.logRef}\``),
          ),
      tracked.threadTs,
    ),
    "followup.finished",
    () => ({
      ...about(tracked.issue, tracked.threadTs),
      payload: {
        round: rounds,
        maxRounds: MAX_REVISION_ROUNDS,
        ...attemptResult(tracked, attempt, posted),
      },
    }),
  );

  // One message, two facts: the round that ended, and — because it was the last
  // one — the watcher letting go. Slack can put both in a sentence; Watchtower has
  // an event for each, and without the second it would hold the card in "Awaiting
  // revision" waiting on a `revise` that nothing is listening for any more.
  // `announceRoundsSpent` below reports the same ending on the other path to it.
  if (spent) {
    await report("rounds.exhausted", () => ({
      ...about(tracked.issue, tracked.threadTs),
      payload: { round: rounds, maxRounds: MAX_REVISION_ROUNDS, commentUrl: posted },
    }));
  }

  return post;
};

/**
 * The bound from `0006` reached. Said in the channel as well as on the pull
 * request, because it is the one ending where the watcher stops without anything
 * on GitHub changing state — silence here would read as a watcher that had simply
 * stopped answering.
 */
export const announceRoundsSpent = (tracked: AwaitingRevision, posted: string | undefined) =>
  tell(
    notifyAsk(
      lines(
        `:hand: *Out of follow-up rounds* · ${prLink(tracked)}`,
        `${MAX_REVISION_ROUNDS} follow-ups have been spent on ${issueLink(tracked.issue)}, so the watcher ` +
          "has stopped tracking it. The pull request is untouched — merge it, close it, or take it from here.",
        links(maybeLink(posted, "What it said"), maybeLink(`${tracked.prUrl}/files`, "Files changed")),
      ),
      tracked.threadTs,
    ),
    "rounds.exhausted",
    () => ({
      ...about(tracked.issue, tracked.threadTs),
      payload: {
        round: tracked.revisionRounds,
        maxRounds: MAX_REVISION_ROUNDS,
        commentUrl: posted,
      },
    }),
  );

/** The last word on an issue: its pull request is merged or closed. */
export const announceFinished = (tracked: Tracked, state: string) =>
  tell(
    notifySlack(
      state === "MERGED"
        ? `:white_check_mark: *Merged* — ${prLink(tracked)} is in \`${PR_BASE}\`, ${issueLink(tracked.issue)} is done.`
        : `:no_entry_sign: *Closed without merging* — ${prLink(tracked)}. ${issueLink(tracked.issue)} was not implemented.`,
      tracked.threadTs,
    ),
    "task.finished",
    () => ({
      ...about(tracked.issue, tracked.threadTs),
      payload: { changeRequest: changeRequestOf(tracked), state: endingOf(state) },
    }),
  );
