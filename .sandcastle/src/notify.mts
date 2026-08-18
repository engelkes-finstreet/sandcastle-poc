import type { AgentStreamEvent } from "@ai-hero/sandcastle";
import {
  BASE_BRANCH,
  LABEL,
  PROGRESS_SECONDS,
  PR_BASE,
  REVIEW_MODEL,
  branchFor,
  logRefFor,
} from "./config.mts";
import { REPO } from "./github.mts";
import { notifySlack, type SlackPost } from "./slack.mts";
import type { Attempt, CodeReview, Issue, Pending, Reviewed, Verdict } from "./types.mts";

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
      "Comment `approve` on the pull request to build it, or comment feedback to have it re-plan.",
      links(
        maybeLink(pr.url, "Read the plan"),
        maybeLink(`${pr.url}#issuecomment-new`, "Reply to it"),
        logHint(branch),
      ),
    ),
    threadTs,
  );

// ---------------------------------------------------------- phase 2: review

export const announcePlanGone = (pending: Pending, state: string) =>
  notifySlack(
    lines(
      `🏰 ${issueLink(pending.issue)} — ${prLink(pending)} was ${state.toLowerCase()} before the plan was approved.`,
      `Dropped it. Re-add the **${LABEL}** label to plan it again.`,
    ),
    pending.threadTs,
  );

export const announceAbandoned = (pending: Pending, decision: Reviewed) =>
  notifySlack(
    lines(
      `🏰 ${issueLink(pending.issue)} — *abandoned* by ${decision.author}. Nothing was implemented.`,
      `${prLink(pending)} and its branch are left for you to delete.`,
      links(maybeLink(decision.url, "The comment"), maybeLink(pending.prUrl, "Pull request")),
    ),
    pending.threadTs,
  );

export const announcePlanRevised = (
  revised: Pending,
  decision: Reviewed,
  posted: string | undefined,
) =>
  notifySlack(
    lines(
      `🏰 *Plan revised* after ${decision.author}'s feedback — ${prLink(revised)}`,
      `Still ${issueLink(revised.issue)}, still nothing implemented. Comment \`approve\` to build it.`,
      links(
        maybeLink(revised.prUrl, "New plan"),
        maybeLink(decision.url, "The feedback"),
        maybeLink(posted, "Revision notice"),
        logHint(revised.branch),
      ),
    ),
    revised.threadTs,
  );

// ------------------------------------------------------- phase 3: implement

export const announceApproved = (pending: Pending, decision: Reviewed) =>
  notifySlack(
    lines(
      `🏰 *Plan approved by ${decision.author} — implementing now* · ${prLink(pending)}`,
      `Building the approved plan for ${issueLink(pending.issue)} on \`${pending.branch}\`, resuming the session it planned in.`,
      links(
        maybeLink(decision.url, "The approval"),
        maybeLink(pending.prUrl, "The plan"),
        logHint(pending.branch),
      ),
    ),
    pending.threadTs,
  );

export const announceAttempt = (pending: Pending, attempt: Attempt, posted: string | undefined) =>
  notifySlack(
    attempt.pullRequest
      ? lines(
          `🏰 *Done — ready for your review* · ${prLink(pending)}`,
          `Implements ${issueLink(pending.issue)} with ${attempt.commits} commit(s), the gate green inside the sandbox.`,
          // Phase 4 is switched off in workflow.mts, so this must not promise a
          // review nobody is running. With it on, the line becomes:
          //   "A code review is running now and lands in this thread. Nothing else runs until you merge or close it.",
          "Nothing else runs until you merge or close it.",
          links(
            maybeLink(`${pending.prUrl}/files`, "Files changed"),
            maybeLink(posted, "How to test it locally"),
            `log \`${attempt.logRef}\``,
          ),
        )
      : lines(
          `🏰 ${issueLink(pending.issue)} — *${attempt.outcome}* after an approved plan. Nothing was pushed.`,
          `${prLink(pending)} stays a draft. The label is off the issue; re-add it to start over from planning.`,
          links(maybeLink(posted, "What it reported"), `log \`${attempt.logRef}\``),
        ),
    pending.threadTs,
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
  pending: Pending,
  review: CodeReview,
  posted: string | undefined,
) =>
  notifySlack(
    lines(
      `${VERDICT_LINE[review.verdict]} · ${prLink(pending)}`,
      `A fresh agent on \`${REVIEW_MODEL}\` read the diff for ${issueLink(pending.issue)} — it did not write this code and cannot see the session that did.`,
      review.strayCommits > 0
        ? `:warning: It also left ${review.strayCommits} commit(s) on \`${pending.branch}\` despite being read-only. They are local and unpushed; \`git reset --hard origin/${pending.branch}\` clears them.`
        : undefined,
      links(
        maybeLink(posted, "The review"),
        maybeLink(`${pending.prUrl}/files`, "Files changed"),
        logHint(pending.branch),
      ),
    ),
    pending.threadTs,
  );

/**
 * The review did not happen. Said out loud rather than swallowed: silence here is
 * indistinguishable from a clean review, and that is the one wrong impression this
 * phase must never leave.
 */
export const announceCodeReviewSkipped = (pending: Pending, why: string) =>
  notifySlack(
    lines(
      `:grey_question: *No code review* on ${prLink(pending)} — ${escapeSlack(why)}`,
      `The implementation is pushed and ready either way; it just has not been read by anything but the agent that wrote it.`,
      links(maybeLink(`${pending.prUrl}/files`, "Files changed"), logHint(pending.branch)),
    ),
    pending.threadTs,
  );

/** The last word on an issue: the pull request the watcher was parked on is gone. */
export const announceReviewFinished = (pending: Pending, state: string) =>
  notifySlack(
    state === "MERGED"
      ? `:white_check_mark: *Merged* — ${prLink(pending)} is in \`${PR_BASE}\`, ${issueLink(pending.issue)} is done. Back to watching for *${LABEL}* issues.`
      : `:no_entry_sign: *Closed without merging* — ${prLink(pending)}. ${issueLink(pending.issue)} was not implemented. Back to watching for *${LABEL}* issues.`,
    pending.threadTs,
  );

// ----------------------------------------------------------------- progress

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

/**
 * Forward what the agent is doing into the issue's thread — as a heartbeat, not
 * a transcript. A post per tool call would be hundreds of messages for one issue
 * and would run into chat.postMessage's one-per-second-per-channel limit, so at
 * most one update lands every PROGRESS_SECONDS and the rest are dropped.
 *
 * Fire-and-forget on purpose: a slow Slack must not stall the agent's stream.
 * notifySlack never throws, and sandcastle swallows anything this callback does.
 */
export const progressReporter = (threadTs?: string) => {
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
