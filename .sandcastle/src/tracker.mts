import type { ChangeRequestRef, ExternalRef } from "@finstreet/watchtower-golem/events";
import { TRACKER } from "./config.mts";
import { githubTracker } from "./trackers/github.mts";
import type { Issue, Tracked } from "./types.mts";

// The Tracker port: where work comes from, and how the watcher's state is
// mirrored back there. Everything the factory says to a tracker goes through the
// `tracker` instance below; the GitHub mechanics live in trackers/github.mts as
// its first adapter, and a second tracker is a new file in trackers/ plus one
// entry in ADAPTERS. The forge — branches, the plan pull request, trigger words —
// is deliberately not behind a port and stays plain GitHub: see
// docs/adr/0008-the-tracker-is-a-port-the-forge-is-github.md.

/**
 * The six moments of an issue's life the watcher tells its tracker about, fired
 * exactly where the GitHub labels used to swap. Each adapter mirrors them in its
 * tracker's native way — labels here, workflow transitions on a tracker that has
 * them — and a moment its tracker has no way to say is a no-op, not an error.
 *
 * `stopped` carries which state the watcher is letting go of, because a mirror
 * that marks the two waits differently needs to know which mark to take off.
 */
export type Moment =
  | { readonly type: "picked-up" }
  | { readonly type: "awaiting-approval" }
  | { readonly type: "implementing" }
  | { readonly type: "awaiting-revision" }
  | { readonly type: "shipped" }
  | { readonly type: "stopped"; readonly from: Tracked["status"] };

/**
 * What every tracker can do for the factory. The six operations are the whole of
 * the watcher's tracker traffic — queue, text, moments, release, and the two
 * renderings of an issue's identity — plus `mirroredKeys`, the read-back of the
 * mirror `signal` writes, which exists only for the startup orphan check.
 *
 * This port is also the seam any future test would fake: an adapter that answers
 * from memory can drive the watcher's whole lifecycle without a network.
 */
export type Tracker = {
  /** Where work comes from, for the startup banner: "Watching <source>." */
  readonly source: string;
  /**
   * How a key reads in commits, comments, links and log lines — `#42` on GitHub,
   * `ESCB-123` elsewhere. The one place that rendering is spelled: nothing else
   * may interpolate a key into a human-facing reference.
   */
  issueRef(key: string): string;
  /** The issue's identity on the wire: which tracker minted the key, and where it lives. */
  externalRef(issue: Issue): ExternalRef;
  /** Everything queued for the factory, oldest first. */
  queuedIssues(): Issue[];
  /**
   * The issue's full text — body and every comment, oldest first — fetched on the
   * host and injected into the prompts as `{{ISSUE_TEXT}}`. The container never
   * talks to the tracker: this read is what lets the sandbox run with no tracker
   * credential at all. The text is frozen at container start by design — a
   * comment made mid-run reaches the *next* run, through the watermarks in
   * types.mts, not this one.
   */
  issueText(key: string): string;
  /** Mirror one lifecycle moment into the tracker. Best-effort: legibility, never correctness. */
  signal(issue: Issue, moment: Moment): void;
  /**
   * Take the issue out of the queue and say why. Returns a link to the comment
   * when the tracker handed one back, for Slack to point at.
   */
  release(issue: Issue, comment: string): string | undefined;
  /**
   * Keys the tracker's mirror claims the watcher is holding, for the startup
   * orphan check: any of these without a state file is an issue nothing is
   * polling, and somebody should be told.
   */
  mirroredKeys(): string[];
};

/**
 * Queue order for issue keys: numeric-aware rather than plain lexicographic, so
 * "10" does not sort before "2" and the queue stays oldest-first — while a
 * non-numeric key (a future `ESCB-123`) still gets a stable, human-expected
 * order. A property of keys rather than of one tracker, which is why it lives on
 * the port. The locale is pinned so the order cannot vary with the host's.
 */
export const compareIssueKeys = (a: string, b: string) =>
  a.localeCompare(b, "en", { numeric: true });

/**
 * The wire ref for a pull request. On the port rather than on an adapter,
 * deliberately: the forge is GitHub for every tracker, so how a change request is
 * named does not vary with where the issue lives — but it is minted here, beside
 * `externalRef`, so both of the refs the Golem reports come from one place.
 */
export const changeRequestFor = (pr: { number: number; url: string }): ChangeRequestRef => ({
  kind: "github_pull_request",
  key: String(pr.number),
  url: pr.url,
});

export const changeRequestOf = (tracked: Pick<Tracked, "prNumber" | "prUrl">): ChangeRequestRef =>
  changeRequestFor({ number: tracked.prNumber, url: tracked.prUrl });

// -------------------------------------------------------------- selection

const ADAPTERS: Record<string, Tracker> = {
  github: githubTracker,
};

// Validated rather than trusted, like POLL_SECONDS: a typo in SANDCASTLE_TRACKER
// must be a loud startup failure, not a watcher that silently falls back to
// GitHub against a queue that lives somewhere else.
const selected = ADAPTERS[TRACKER];
if (!selected) {
  throw new Error(
    `SANDCASTLE_TRACKER must be one of ${Object.keys(ADAPTERS).join(", ")}, got "${TRACKER}"`,
  );
}

/** The tracker this deployment reads work from. Unset means GitHub — see config.mts. */
export const tracker: Tracker = selected;

/**
 * Everything a prompt is told about the issue itself, in one place. ISSUE_NUMBER
 * renders as `#{{ISSUE_NUMBER}}` in headings and `Refs` lines, which the key
 * satisfies on this tracker; a tracker whose keys read differently is a change
 * here, next to the port that knows how they read, not in the three phases that
 * spread this.
 */
export const issuePromptArgs = (issue: Issue) => ({
  ISSUE_NUMBER: issue.key,
  ISSUE_TITLE: issue.title,
  ISSUE_TEXT: tracker.issueText(issue.key),
});
