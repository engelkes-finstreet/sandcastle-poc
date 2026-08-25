import type { ChangeRequestRef, ExternalRef } from "@finstreet/watchtower-golem/events";
import { TRACKER } from "./config.mts";
import { githubTracker } from "./trackers/github.mts";
import { jiraTracker } from "./trackers/jira.mts";
import type { Issue, Tracked } from "./types.mts";

// The Tracker port: where work comes from, and how the watcher's state is
// mirrored back there. Everything the factory says to a tracker goes through the
// `tracker` instance below; the adapters live in trackers/, and a new tracker is
// a new file there plus one entry in ADAPTERS. The forge — branches, the plan
// pull request, trigger words — is deliberately not behind a port and stays
// plain GitHub: see docs/adr/0008-the-tracker-is-a-port-the-forge-is-github.md.
//
// The port is asynchronous even though the GitHub adapter never needs to be —
// `gh` is a blocking CLI, but a tracker spoken to over plain HTTP has no
// synchronous option, and the port's shape has to fit its widest implementor.

/**
 * The six moments of an issue's life the watcher tells its tracker about, fired
 * exactly where the GitHub labels used to swap. Each adapter mirrors them in its
 * tracker's native way — labels, comments, workflow transitions — and a moment
 * its tracker has no way to say is a no-op, not an error.
 *
 * Two of them carry the pull request's URL, because on a tracker that GitHub
 * does not close for us the mirror is a comment a human follows: the plan
 * waiting for approval is *somewhere*, and so is the merge that shipped.
 * `stopped` carries which state the watcher is letting go of, because a mirror
 * that marks the two waits differently needs to know which mark to take off.
 */
export type Moment =
  | { readonly type: "picked-up" }
  | { readonly type: "awaiting-approval"; readonly prUrl: string }
  | { readonly type: "implementing" }
  | { readonly type: "awaiting-revision" }
  | { readonly type: "shipped"; readonly prUrl: string }
  | { readonly type: "stopped"; readonly from: Tracked["status"]; readonly prUrl?: string };

/**
 * What every tracker can do for the factory. The six operations are the whole of
 * the watcher's tracker traffic — queue, text, moments, release, and the two
 * renderings of an issue's identity — plus the small members they imply:
 * `verify` (the fail-fast startup check), `source` (the banner line),
 * `planPullRequest` (the tracker-shaped parts of the plan pull request), and
 * `mirroredKeys`, the read-back of the mirror `signal` writes, which exists only
 * for the startup orphan check.
 *
 * This port is also the seam any future test would fake: an adapter that answers
 * from memory can drive the watcher's whole lifecycle without a network.
 */
export type Tracker = {
  /** Where work comes from, for the startup banner: "Watching <source>." */
  readonly source: string;
  /**
   * The fail-fast credential check, run once at startup before anything else.
   * Missing or rejected credentials must end the process with a message that
   * says what to fix — the watcher is usually started unattended, and a tracker
   * it cannot reach should not surface as an empty queue.
   */
  verify(): Promise<void>;
  /**
   * How a key reads in commits, comments, links and log lines — `#42` on GitHub,
   * a bare `ESCB-123` on Jira. The one place that rendering is spelled: nothing
   * else may interpolate a key into a human-facing reference.
   */
  issueRef(key: string): string;
  /** The issue's identity on the wire: which tracker minted the key, and where it lives. */
  externalRef(issue: Issue): ExternalRef;
  /** See PlanPrParts for what these are and why the tracker supplies them. */
  planPullRequest(issue: Issue): PlanPrParts;
  /** Everything queued for the factory, oldest first. */
  queuedIssues(): Promise<Issue[]>;
  /**
   * The issue's full text — body and every comment, oldest first — fetched on the
   * host and injected into the prompts as `{{ISSUE_TEXT}}`. The container never
   * talks to the tracker: this read is what lets the sandbox run with no tracker
   * credential at all. The text is frozen at container start by design — a
   * comment made mid-run reaches the *next* run, through the watermarks in
   * types.mts, not this one.
   */
  issueText(key: string): Promise<string>;
  /** Mirror one lifecycle moment into the tracker. Best-effort: legibility, never correctness. */
  signal(issue: Issue, moment: Moment): Promise<void>;
  /**
   * Take the issue out of the queue and say why. Returns a link to the comment
   * when the tracker handed one back, for Slack to point at.
   */
  release(issue: Issue, comment: string): Promise<string | undefined>;
  /**
   * Keys the tracker's mirror claims the watcher is holding, for the startup
   * orphan check: any of these without a state file is an issue nothing is
   * polling, and somebody should be told.
   */
  mirroredKeys(): Promise<string[]>;
};

/**
 * The tracker-shaped parts of the plan pull request. The title, because the key
 * has to appear wherever the tracker's tooling reads titles — Jira's development
 * panel, nothing on GitHub. And the body's opening reference line: `Closes #42`
 * where that clause closes the issue on merge, a plain `Refs ESCB-123` where
 * nothing parses it and the `shipped` moment does the closing work instead.
 */
export type PlanPrParts = { readonly title: string; readonly refLine: string };

/**
 * Queue order for issue keys: numeric-aware rather than plain lexicographic, so
 * "10" does not sort before "2" and the queue stays oldest-first — while a
 * non-numeric key (`ESCB-123`) still gets a stable, human-expected order. A
 * property of keys rather than of one tracker, which is why it lives on the
 * port. The locale is pinned so the order cannot vary with the host's.
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

/**
 * Factories rather than instances, so only the selected adapter is ever built.
 * Construction is where an adapter reads its own configuration, and a GitHub
 * deployment must not fail over Jira credentials it never needed.
 */
const ADAPTERS: Record<string, () => Tracker> = {
  github: githubTracker,
  jira: jiraTracker,
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
export const tracker: Tracker = selected();

/**
 * Everything a prompt is told about the issue itself, in one place. ISSUE_REF is
 * the tracker's own rendering — `#42`, `ESCB-123` — so the headings and `Refs`
 * lines the prompts build from it come out in the tracker's vocabulary, and the
 * commit messages the agent writes are what that tracker's tooling links.
 */
export const issuePromptArgs = async (issue: Issue) => ({
  ISSUE_REF: tracker.issueRef(issue.key),
  ISSUE_TITLE: issue.title,
  ISSUE_TEXT: await tracker.issueText(issue.key),
});
