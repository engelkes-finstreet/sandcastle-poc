import type { VERDICTS } from "./config.mts";

// The shapes that travel between modules. No behaviour of its own — the state
// file's format lives here, so a change to it is a change to one file.

export type Issue = { readonly number: number; readonly title: string };

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
export type Pending = {
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

/** A pending issue before its pull request exists — everything else is already known. */
export type PlanDraft = Omit<Pending, "prUrl" | "prNumber">;

/** What one agent run hands back about the session it used, for the next phase to resume. */
export type Session = {
  readonly sessionId?: string;
  readonly sessionFilePath?: string;
};

export type Planned = Session & { readonly plan: string; readonly branch: string };

export type Outcome = "shipped" | "blocked" | "no-changes" | "no-signal";

/** How the code review came out. Ordered by how much it should worry you. */
export type Verdict = (typeof VERDICTS)[number];

/**
 * Phase 4's result. Optional everywhere it is used: the code is already pushed by
 * the time the reviewer runs, so a review that fails, times out or comes back
 * malformed costs a comment, never the implementation.
 */
export type CodeReview = {
  readonly verdict: Verdict;
  /** Posted back onto the pull request, the reviewer's findings and their framing. */
  readonly comment: string;
  /** Commits the reviewer made despite being told not to — local only, never pushed. */
  readonly strayCommits: number;
};

export type Attempt = {
  readonly outcome: Outcome;
  /** Posted back onto the pull request. */
  readonly comment: string;
  /** Set only when the pull request is ready for review — the watcher pauses on it. */
  readonly pullRequest?: string;
  /** Log file for this run, quoted in Slack so you can tail the right one. */
  readonly logRef: string;
  readonly commits: number;
};

/** A human's comment on the plan, whatever it turned out to mean. */
export type Reviewed = {
  readonly comment: string;
  readonly author: string;
  /** Permalink to the comment, so Slack can point at what was actually said. */
  readonly url?: string;
};

export type Decision =
  | { readonly type: "wait" }
  | ({ readonly type: "approve" } & Reviewed)
  | ({ readonly type: "revise" } & Reviewed)
  | ({ readonly type: "abandon" } & Reviewed)
  | { readonly type: "gone"; readonly state: string };
