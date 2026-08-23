import { AWAITING_LABEL, BOT_MARKER, LABEL, REVISION_LABEL } from "../config.mts";
import { REPO } from "../forge.mts";
import { describe, gh, log } from "../shell.mts";
// A value import from the port, which imports this file back. Safe because it is
// only ever used inside a function body, by which time both modules are done
// evaluating — nothing here may read it at the top level.
import { compareIssueKeys, type Moment, type Tracker } from "../tracker.mts";
import type { Issue } from "../types.mts";

// The GitHub adapter: the Tracker port's first implementation, and the one every
// deployment gets until SANDCASTLE_TRACKER says otherwise. Work is a GitHub issue
// wearing the `Sandcastle` label, the watcher's state is mirrored as the
// `Sandcastle:*` label family, and a key is the issue number rendered as a
// string — so everything derived from it is byte-for-byte what it was before the
// port existed.
//
// It reads the same repository the forge writes to, which is why it borrows the
// forge's REPO rather than asking `gh` a second time.
//
// Writes that are only there to keep a human informed degrade to a warning —
// losing a comment or a label swap is not worth losing a run.

/**
 * The two renderings of an issue key, and the only place they are spelled. On
 * this tracker a key reads as `#42` — in commits, comments, links and log
 * lines — and lives at the issues URL.
 */
const issueRef = (key: string) => `#${key}`;

const issueUrl = (key: string) => `https://github.com/${REPO}/issues/${key}`;

type IssueComment = { author?: { login?: string }; createdAt: string; body: string };

/** See `issueText` on the port for what this is and why the host reads it. */
const issueText = (key: string): string => {
  const { body, comments } = JSON.parse(
    gh("issue", "view", key, "--json", "body,comments"),
  ) as { body: string; comments: IssueComment[] };

  return [
    body.trim() || "_The issue has no body._",
    ...comments.map(
      (c) => `**@${c.author?.login ?? "someone"} commented (${c.createdAt}):**\n\n${c.body.trim()}`,
    ),
  ].join("\n\n---\n\n");
};

/** GitHub answers with numbers; the watcher's identity for an issue is the key. */
const keyOf = (number: number) => String(number);

const keyed = ({ number, title }: { number: number; title: string }): Issue => ({
  key: keyOf(number),
  title,
});

/** Oldest first, so the queue is FIFO rather than newest-wins. */
const queuedIssues = (): Issue[] =>
  (
    JSON.parse(
      gh("issue", "list", "--state", "open", "--label", LABEL, "--json", "number,title", "--limit", "50"),
    ) as { number: number; title: string }[]
  )
    .map(keyed)
    .sort((a, b) => compareIssueKeys(a.key, b.key));

/** Keys of issues wearing one of the watcher's state labels. */
const labelledIssueKeys = (label: string): string[] =>
  (
    JSON.parse(
      gh("issue", "list", "--state", "open", "--label", label, "--json", "number", "--limit", "50"),
    ) as { number: number }[]
  ).map(({ number }) => keyOf(number));

/**
 * The GitHub-visible mirror of the two states a tracked issue can be in. Carried
 * for legibility rather than for correctness — the state files are the truth —
 * but with several issues in flight at once, "what does the watcher think it owns"
 * should be readable without opening .sandcastle/state/.
 */
const STATE_LABELS: Record<string, { color: string; description: string }> = {
  [AWAITING_LABEL]: {
    color: "BFD4F2",
    description: "Sandcastle posted a plan and is waiting for a review comment",
  },
  [REVISION_LABEL]: {
    color: "FEF2C0",
    description: "Sandcastle shipped this and is waiting for `revise`, a merge or a close",
  },
};

/** Best-effort: the flow works without the labels, it is just less legible on GitHub. */
const ensureStateLabels = () => {
  for (const [name, { color, description }] of Object.entries(STATE_LABELS)) {
    try {
      gh("label", "create", name, "--color", color, "--description", description, "--force");
    } catch (error) {
      log(`  WARNING: could not create the "${name}" label: ${describe(error)}`);
    }
  }
};

const relabel = (issue: Issue, { add, remove }: { add?: string; remove?: string }) => {
  const args = ["issue", "edit", issue.key];
  if (add) args.push("--add-label", add);
  if (remove) args.push("--remove-label", remove);
  try {
    gh(...args);
  } catch (error) {
    log(`  WARNING: could not relabel ${issueRef(issue.key)}: ${describe(error)}`);
  }
};

/**
 * The six moments, as label swaps — each firing exactly where its swap sat before
 * the port existed. Three are no-ops, and each is a fact about GitHub rather than
 * an omission: nothing here marked a pickup or an implementation starting, and
 * `shipped` needs no hand because the plan pull request's `Closes` clause already
 * closes the issue when it merges.
 */
const signal = (issue: Issue, moment: Moment) => {
  switch (moment.type) {
    case "picked-up":
    case "implementing":
    case "shipped":
      return;
    case "awaiting-approval":
      ensureStateLabels();
      relabel(issue, { add: AWAITING_LABEL, remove: LABEL });
      return;
    case "awaiting-revision":
      relabel(issue, { add: REVISION_LABEL, remove: AWAITING_LABEL });
      return;
    case "stopped":
      relabel(issue, {
        remove: moment.from === "awaiting-plan" ? AWAITING_LABEL : REVISION_LABEL,
      });
      return;
  }
};

/**
 * The label comes off first: it is the only thing standing between a permanently
 * failing issue and an infinite retry loop, so it must not depend on the comment
 * succeeding.
 */
const release = (issue: Issue, comment: string): string | undefined => {
  gh("issue", "edit", issue.key, "--remove-label", LABEL);
  // `gh` prints the new comment's URL, which is what Slack links to. Never worth
  // failing a run over, so a broken comment degrades to a missing link.
  try {
    return gh("issue", "comment", issue.key, "--body", `${comment}\n\n${BOT_MARKER}`);
  } catch (error) {
    log(`  WARNING: could not comment on ${issueRef(issue.key)}: ${describe(error)}`);
    return undefined;
  }
};

export const githubTracker: Tracker = {
  source: `${REPO} for open issues labelled "${LABEL}"`,
  issueRef,
  externalRef: (issue) => ({
    trackerType: "github",
    externalKey: issue.key,
    url: issueUrl(issue.key),
  }),
  queuedIssues,
  issueText,
  signal,
  release,
  mirroredKeys: () => [AWAITING_LABEL, REVISION_LABEL].flatMap(labelledIssueKeys),
};
