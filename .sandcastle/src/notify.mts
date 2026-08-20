import {
  BASE_BRANCH,
  LABEL,
  MAX_REVISION_ROUNDS,
  PR_BASE,
  REVIEW_MODEL,
  branchFor,
  logRefFor,
} from "./config.mts";
import { REPO } from "./github.mts";
import { notifySlack, type SlackPost } from "./slack.mts";
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

export { slackStatus } from "./slack.mts";

// Every Slack message the watcher sends, in the order a run sends them. Kept
// together and away from the state machine on purpose: the wording is what a
// human actually experiences, and it is easier to keep a conversation coherent
// when you can read the whole conversation in one file.
//
// slack.mts is the transport (a token, a POST, a thread ts). This is the voice.

// -------------------------------------------------------------- ingredients

/**
 * Slack's mrkdwn needs these three entity-escaped. Without it an issue titled
 * `Fix <Button> rendering` truncates its own link and renders as garbage.
 */
const escapeSlack = (text: string) =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const issueLink = (issue: Issue) =>
  `<https://github.com/${REPO}/issues/${issue.number}|#${issue.number} ${escapeSlack(issue.title)}>`;

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

// ------------------------------------------------------------ phase 1: plan

/**
 * Posted when the issue is picked up, and the parent of every later message
 * about it: the plan, progress, the outcome, and the merged/closed notice all
 * thread under this one, so the channel keeps one entry per issue rather than
 * five. Its ts is persisted with the rest of the state, so a watcher restart
 * during review keeps the thread.
 */
export const announcePlanning = (issue: Issue, queued: number): Promise<SlackPost> =>
  notifySlack(
    lines(
      `🏰 *Planning* ${issueLink(issue)}`,
      `Branch \`${branchFor(issue.number)}\`, cut from \`${BASE_BRANCH}\`. ${remainingText(queued)}`,
    ),
  );

export const announcePlanningFailed = (issue: Issue, posted: string | undefined, threadTs?: string) =>
  notifySlack(
    lines(
      `🏰 ${issueLink(issue)} — *planning failed*. No plan, no pull request.`,
      "The label is off the issue; re-add it to try again.",
      links(maybeLink(posted, "What went wrong"), logHint(branchFor(issue.number))),
    ),
    threadTs,
  );

export const announcePlanningBlocked = (
  issue: Issue,
  why: string,
  branch: string,
  posted: string | undefined,
  threadTs?: string,
) =>
  notifySlack(
    lines(
      `🏰 ${issueLink(issue)} — *blocked at planning*. The agent says the issue does not say enough yet.`,
      `> ${why.split("\n")[0].slice(0, 220)}`,
      links(maybeLink(posted, "Full explanation"), logHint(branch)),
    ),
    threadTs,
  );

export const announcePlanPosted = (
  issue: Issue,
  pr: { url: string; number: number },
  branch: string,
  threadTs?: string,
) =>
  notifySlack(
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
  );

// ---------------------------------------------------------- phase 2: review

export const announcePlanGone = (tracked: Tracked, state: string) =>
  notifySlack(
    lines(
      `🏰 ${issueLink(tracked.issue)} — ${prLink(tracked)} was ${state.toLowerCase()} before the plan was approved.`,
      `Dropped it. Re-add the **${LABEL}** label to plan it again.`,
    ),
    tracked.threadTs,
  );

export const announceAbandoned = (tracked: Tracked, decision: Reviewed) =>
  notifySlack(
    lines(
      `🏰 ${issueLink(tracked.issue)} — *abandoned* by ${decision.author}. Nothing was implemented.`,
      `${prLink(tracked)} and its branch are left for you to delete.`,
      links(maybeLink(decision.url, "The comment"), maybeLink(tracked.prUrl, "Pull request")),
    ),
    tracked.threadTs,
  );

// ------------------------------------------------------- phase 3: implement

export const announceApproved = (tracked: Tracked, decision: Reviewed) =>
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
  );

export const announceAttempt = (tracked: Tracked, attempt: Attempt, posted: string | undefined) =>
  notifySlack(
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
          attempt.rescued
            ? `:floppy_disk: ${attempt.rescued} uncommitted file(s) were rescued onto \`${tracked.branch}\` ` +
              `as a \`wip\` commit — host only, never pushed, never gated.`
            : undefined,
          links(maybeLink(posted, "What it reported"), `log \`${attempt.logRef}\``),
        ),
    tracked.threadTs,
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
  );

/**
 * The review did not happen. Said out loud rather than swallowed: silence here is
 * indistinguishable from a clean review, and that is the one wrong impression this
 * phase must never leave.
 */
export const announceCodeReviewSkipped = (tracked: Tracked, why: string) =>
  notifySlack(
    lines(
      `:grey_question: *No code review* on ${prLink(tracked)} — ${escapeSlack(why)}`,
      `The implementation is pushed and ready either way; it just has not been read by anything but the agent that wrote it.`,
      links(maybeLink(`${tracked.prUrl}/files`, "Files changed"), logHint(tracked.branch)),
    ),
    tracked.threadTs,
  );

// ------------------------------------------------------- phase 5: follow-up

const roundsLine = (rounds: number) => {
  const left = MAX_REVISION_ROUNDS - rounds;
  return left === 0
    ? `That was the last of ${MAX_REVISION_ROUNDS} follow-up rounds.`
    : `${left} follow-up round${left === 1 ? "" : "s"} left of ${MAX_REVISION_ROUNDS}.`;
};

export const announceRevising = (tracked: AwaitingRevision, request: ChangeRequest) =>
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
  );

export const announceFollowUp = (
  tracked: AwaitingRevision,
  attempt: Attempt,
  posted: string | undefined,
) =>
  notifySlack(
    attempt.pullRequest
      ? lines(
          `🏰 *Change made — back to you* · ${prLink(tracked)}`,
          `${attempt.commits} commit(s) on top of what you reviewed, the gate green inside the sandbox. ` +
            roundsLine(tracked.revisionRounds + 1),
          links(
            maybeLink(`${tracked.prUrl}/files`, "Files changed"),
            maybeLink(posted, "How to check it"),
            `log \`${attempt.logRef}\``,
          ),
        )
      : lines(
          `🏰 ${issueLink(tracked.issue)} — follow-up *${attempt.outcome}*. Nothing was pushed.`,
          `${prLink(tracked)} is exactly as you reviewed it. ${roundsLine(tracked.revisionRounds + 1)} ` +
            "Comment `revise` to try again.",
          attempt.rescued
            ? `:floppy_disk: ${attempt.rescued} uncommitted file(s) were rescued onto \`${tracked.branch}\` ` +
              `as a \`wip\` commit — host only, never pushed, never gated.`
            : undefined,
          links(maybeLink(posted, "What it reported"), `log \`${attempt.logRef}\``),
        ),
    tracked.threadTs,
  );

/**
 * The bound from `0006` reached. Said in the channel as well as on the pull
 * request, because it is the one ending where the watcher stops without anything
 * on GitHub changing state — silence here would read as a watcher that had simply
 * stopped answering.
 */
export const announceRoundsSpent = (tracked: AwaitingRevision, posted: string | undefined) =>
  notifySlack(
    lines(
      `:hand: *Out of follow-up rounds* · ${prLink(tracked)}`,
      `${MAX_REVISION_ROUNDS} follow-ups have been spent on ${issueLink(tracked.issue)}, so the watcher ` +
        "has stopped tracking it. The pull request is untouched — merge it, close it, or take it from here.",
      links(maybeLink(posted, "What it said"), maybeLink(`${tracked.prUrl}/files`, "Files changed")),
    ),
    tracked.threadTs,
  );

/** The last word on an issue: its pull request is merged or closed. */
export const announceFinished = (tracked: Tracked, state: string) =>
  notifySlack(
    state === "MERGED"
      ? `:white_check_mark: *Merged* — ${prLink(tracked)} is in \`${PR_BASE}\`, ${issueLink(tracked.issue)} is done.`
      : `:no_entry_sign: *Closed without merging* — ${prLink(tracked)}. ${issueLink(tracked.issue)} was not implemented.`,
    tracked.threadTs,
  );
