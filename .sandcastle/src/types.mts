import type { VERDICTS } from "./config.mts";

// The shapes that travel between modules. No behaviour of its own — the state
// file's format lives here, so a change to it is a change to one file.

export type Issue = { readonly number: number; readonly title: string };

/**
 * What every tracked issue carries, whichever state it is in.
 *
 * Nothing here is a dependency on the host that planned. The plan *is* the pull
 * request description, and every run is handed it in the prompt, so an issue
 * approved on a different machine — or after this file is deleted — still builds.
 * That is the whole point: no agent session is carried between phases, and the
 * only thing that has to survive is text that also lives on GitHub.
 */
type TrackedCommon = {
  readonly issue: Issue;
  readonly branch: string;
  readonly prUrl: string;
  readonly prNumber: number;
  /** The plan currently on the pull request, as approved or awaiting approval. */
  readonly plan: string;
  /** Slack thread for this issue, so posts keep threading after a restart. */
  readonly threadTs?: string;
  /**
   * Comments at or before this were already *acted on* by a run. It is what
   * defines the next run's payload, so it moves only when a container actually
   * ran.
   */
  readonly servicedThrough: string;
  /**
   * Comments at or before this the watcher has already *replied* to. Its only job
   * is to stop the one-reply nudge repeating every poll — which is why it is a
   * separate clock: a reply that also consumed the comment would starve the
   * follow-up run of the very thing it is meant to act on. See
   * `0006-a-shipped-pull-request-still-listens.md`.
   */
  readonly repliedThrough: string;
};

/** A plan is on a draft pull request, waiting for `approve` or `abandon`. */
export type AwaitingPlan = TrackedCommon & { readonly status: "awaiting-plan" };

/** The code is pushed and the pull request is ready, waiting for `revise` — or a merge. */
export type AwaitingRevision = TrackedCommon & {
  readonly status: "awaiting-revision";
  /** Follow-up runs spent so far. Bounded by MAX_REVISION_ROUNDS. */
  readonly revisionRounds: number;
};

/**
 * An issue the watcher holds a state file for. Only these two states are
 * persisted, because they are the only ones that are true while the process is
 * idle — persisting `implementing` would leave a crash in a state nothing could
 * recover from without asking "was I interrupted?". As it stands a crash
 * mid-implement leaves `awaiting-plan` with the approval still newer than
 * `servicedThrough`, and the next poll retries it.
 */
export type Tracked = AwaitingPlan | AwaitingRevision;

/** A tracked issue before its pull request exists — everything else is already known. */
export type PlanDraft = Omit<AwaitingPlan, "prUrl" | "prNumber">;

export type Planned = { readonly plan: string; readonly branch: string };

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
  /** Set only when the branch was pushed — phase 3 readies the pull request, phase 5 updates it. */
  readonly pullRequest?: string;
  /** Log file for this run, quoted in Slack so you can tail the right one. */
  readonly logRef: string;
  readonly commits: number;
  /**
   * Files the agent had written but not committed when the run died, committed onto
   * the branch by the host as a `wip` commit. Set on every ending except `shipped`,
   * where a rescue would push half-finished work into a pull request under review.
   */
  readonly rescued?: number;
};

/** A human's comment on a pull request, whatever it turned out to mean. */
export type Reviewed = {
  readonly comment: string;
  readonly author: string;
  /**
   * When GitHub says the comment was written, and the only thing a watermark is
   * ever set from. Advancing a clock to the host's `Date.now()` *after* a run
   * would swallow every comment made while that run was going — no reply, no
   * round, no trace — which is the one failure the two clocks exist to prevent.
   * Comparing GitHub's clock against GitHub's clock also removes the host's skew
   * from the comparison.
   */
  readonly at: string;
  /** Permalink to the comment, so Slack can point at what was actually said. */
  readonly url?: string;
};

/** One comment in a change request's payload. */
export type Said = { readonly author: string; readonly body: string };

/**
 * A `revise`: the comment that triggered it, plus everything said on the pull
 * request since the last run. The trigger comment alone is usually not the
 * request — "remove the guard" → "also rename X" → `revise` is the natural
 * rhythm, and all three have to reach the agent.
 */
export type ChangeRequest = Reviewed & { readonly since: readonly Said[] };

export type Decision =
  | { readonly type: "wait" }
  | ({ readonly type: "approve" } & Reviewed)
  /** Only reachable from `awaiting-revision`; carries every comment since the last run. */
  | ({ readonly type: "revise" } & ChangeRequest)
  /** Neither a trigger word nor an abandonment — there is nothing to act on. */
  | ({ readonly type: "unclear" } & Reviewed)
  | ({ readonly type: "abandon" } & Reviewed)
  | { readonly type: "gone"; readonly state: string };

/**
 * What servicing one tracked issue did, and therefore what the loop should do
 * next. `worked` means state changed and the set of tracked issues must be
 * re-read; `idle` means this issue is still waiting on a human; `stopped` means a
 * shutdown landed mid-step.
 */
export type Serviced = "worked" | "idle" | "stopped";
