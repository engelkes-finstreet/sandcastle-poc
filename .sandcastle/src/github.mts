import {
  ABANDONS,
  APPROVES,
  AWAITING_LABEL,
  BOT_MARKER,
  LABEL,
  POLL_SECONDS,
  PR_BASE,
} from "./config.mts";
import { capture, describe, gh, git, log } from "./shell.mts";
import { controller, sleep } from "./shutdown.mts";
import type { Decision, Issue, PlanDraft, Pending, Reviewed } from "./types.mts";

// Everything the watcher does to GitHub: read the queue, move labels, open and
// read the plan pull request, comment. Writes that are only there to keep a human
// informed degrade to a warning — losing a comment is not worth losing a run.

/**
 * Doubles as the credential check. The watcher is usually started unattended, so
 * a missing `gh` login should say so rather than land as a stack trace above an
 * empty log.
 */
export const REPO = (() => {
  try {
    return gh("repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner");
  } catch (error) {
    console.error(
      `The watcher needs an authenticated \`gh\` on the host — it is what pushes branches\n` +
        `and opens pull requests. Run \`gh auth login\`, then start it again.\n\n${describe(error)}`,
    );
    process.exit(1);
  }
})();

// ------------------------------------------------------------------- issues

/** Oldest first, so the queue is FIFO rather than newest-wins. */
export const queuedIssues = (): Issue[] =>
  (
    JSON.parse(
      gh("issue", "list", "--state", "open", "--label", LABEL, "--json", "number,title", "--limit", "50"),
    ) as Issue[]
  ).sort((a, b) => a.number - b.number);

/** Issues wearing the awaiting-approval label, for the startup orphan check. */
export const awaitingIssueNumbers = (): number[] =>
  (
    JSON.parse(
      gh("issue", "list", "--state", "open", "--label", AWAITING_LABEL, "--json", "number", "--limit", "50"),
    ) as { number: number }[]
  ).map(({ number }) => number);

/** Best-effort: the flow works without the label, it is just less legible on GitHub. */
export const ensureAwaitingLabel = () => {
  try {
    gh(
      "label", "create", AWAITING_LABEL,
      "--color", "BFD4F2",
      "--description", "Sandcastle posted a plan and is waiting for a review comment",
      "--force",
    );
  } catch (error) {
    log(`  WARNING: could not create the "${AWAITING_LABEL}" label: ${describe(error)}`);
  }
};

export const relabel = (issue: Issue, { add, remove }: { add?: string; remove?: string }) => {
  const args = ["issue", "edit", String(issue.number)];
  if (add) args.push("--add-label", add);
  if (remove) args.push("--remove-label", remove);
  try {
    gh(...args);
  } catch (error) {
    log(`  WARNING: could not relabel #${issue.number}: ${describe(error)}`);
  }
};

/**
 * Take the issue out of the queue and say why. The label comes off first: it is
 * the only thing standing between a permanently failing issue and an infinite
 * retry loop, so it must not depend on the comment succeeding.
 */
export const release = (issue: Issue, comment: string): string | undefined => {
  gh("issue", "edit", String(issue.number), "--remove-label", LABEL);
  // `gh` prints the new comment's URL, which is what Slack links to. Never worth
  // failing a run over, so a broken comment degrades to a missing link.
  try {
    return gh("issue", "comment", String(issue.number), "--body", `${comment}\n\n${BOT_MARKER}`);
  } catch (error) {
    log(`  WARNING: could not comment on #${issue.number}: ${describe(error)}`);
    return undefined;
  }
};

export const commentOnPr = (prNumber: number, body: string): string | undefined => {
  try {
    return gh("pr", "comment", String(prNumber), "--body", `${body}\n\n${BOT_MARKER}`);
  } catch (error) {
    log(`  WARNING: could not comment on PR #${prNumber}: ${describe(error)}`);
    return undefined;
  }
};

// ------------------------------------------------------- the plan pull request

const HOW_TO_REVIEW = [
  "---",
  "",
  "🏰 **Planned by the Sandcastle agent** with the `kickoff` skill. Nothing is implemented yet —",
  "this branch holds one empty commit so that this pull request can exist.",
  "",
  "- Comment **`approve`** (or `lgtm`) and the agent implements exactly this, resuming the session",
  "  it planned in, then pushes here and marks the pull request ready for review.",
  "- Comment **anything else** and it is treated as a change request: the agent revises the plan,",
  "  keeping everything it already read, and rewrites this description.",
  "- Comment **`abandon`** to stop. The branch and this pull request are left for you to delete.",
].join("\n");

export const planBody = (pending: PlanDraft) =>
  [
    `Closes #${pending.issue.number}`,
    "",
    "## Plan",
    "",
    pending.plan,
    "",
    HOW_TO_REVIEW,
    "",
    BOT_MARKER,
    `<!-- sandcastle:session=${pending.sessionId ?? "none"} branch=${pending.branch} -->`,
  ].join("\n");

/**
 * A pull request needs a diff, and the planning run is deliberately read-only, so
 * the branch is identical to its base and GitHub refuses it. Hence one empty
 * commit — made with plumbing rather than `git commit`, because the branch is not
 * checked out anywhere on the host (its worktree is gone) and committing from
 * REPO_ROOT would land on whatever the host has checked out instead.
 *
 * It survives as the first commit of the pull request, which is a fair record of
 * how the branch started; a squash merge drops it entirely.
 */
const emptyPlanCommit = (issue: Issue, branch: string) => {
  const tree = git("rev-parse", `${branch}^{tree}`);
  const parent = git("rev-parse", branch);
  const sha = capture("git", [
    "commit-tree", tree,
    "-p", parent,
    "-m", `plan(#${issue.number}): ${issue.title}`,
  ]);
  git("update-ref", `refs/heads/${branch}`, sha, parent);
};

/** Opens the draft pull request that carries the plan, and returns it. */
export const openPlanPullRequest = (draft: PlanDraft): { url: string; number: number } => {
  emptyPlanCommit(draft.issue, draft.branch);
  git("push", "--set-upstream", "origin", draft.branch);

  const existing = JSON.parse(
    gh("pr", "list", "--head", draft.branch, "--state", "open", "--json", "url,number"),
  ) as { url: string; number: number }[];

  if (existing.length > 0) {
    const found = existing[0];
    gh("pr", "edit", String(found.number), "--body", planBody(draft));
    return found;
  }

  const output = gh(
    "pr", "create",
    "--draft",
    "--base", PR_BASE,
    "--head", draft.branch,
    "--title", `${draft.issue.title} (plan)`,
    "--body", planBody(draft),
  );
  const url = output.split("\n").filter(Boolean).pop() ?? "";
  const { number } = JSON.parse(gh("pr", "view", url, "--json", "number")) as { number: number };
  return { url, number };
};

/** Replace the plan on an existing pull request with a revised one. */
export const updatePlanBody = (pending: Pending) =>
  gh("pr", "edit", String(pending.prNumber), "--body", planBody(pending));

export const markReadyForReview = (prNumber: number) => {
  try {
    gh("pr", "ready", String(prNumber));
  } catch (error) {
    log(`  WARNING: could not mark PR #${prNumber} ready for review: ${describe(error)}`);
  }
};

// ------------------------------------------------------------------- review

type PrComment = { body: string; createdAt: string; url?: string; author?: { login?: string } };

/**
 * Read the review decision off the pull request. Only comments newer than the
 * current plan count — a revision resets that clock, so feedback already acted on
 * is not read twice — and the watcher's own comments are filtered by marker,
 * since they are authored by the same GitHub user as yours.
 */
export const decide = (pending: Pending): Decision => {
  const pr = JSON.parse(
    gh("pr", "view", String(pending.prNumber), "--json", "state,comments"),
  ) as { state: string; comments: PrComment[] };

  if (pr.state !== "OPEN") return { type: "gone", state: pr.state };

  const fresh = pr.comments.filter(
    (c) => c.createdAt > pending.planPostedAt && !c.body.includes(BOT_MARKER),
  );
  const latest = fresh.at(-1);
  if (!latest) return { type: "wait" };

  const reviewed: Reviewed = {
    comment: latest.body.trim(),
    author: latest.author?.login ?? "someone",
    url: latest.url,
  };

  if (APPROVES.test(reviewed.comment)) return { type: "approve", ...reviewed };
  if (ABANDONS.test(reviewed.comment)) return { type: "abandon", ...reviewed };
  return { type: "revise", ...reviewed };
};

/**
 * Hold until the pull request is merged or closed, and report which. Cheap — no
 * container, no tokens, just a `gh` call every poll — and interruptible, so
 * Ctrl-C still works while parked here. Returns undefined if we were interrupted
 * rather than resolved.
 */
export const waitForReview = async (url: string): Promise<string | undefined> => {
  log(`  paused — nothing else runs until ${url} is merged or closed`);

  while (!controller.signal.aborted) {
    await sleep(POLL_SECONDS);
    if (controller.signal.aborted) return undefined;

    try {
      const { state } = JSON.parse(gh("pr", "view", url, "--json", "state")) as { state: string };
      if (state !== "OPEN") {
        log(`  ${url} is ${state.toLowerCase()} — resuming`);
        return state;
      }
    } catch (error) {
      log(`  could not read ${url}, will retry: ${describe(error)}`);
    }
  }

  return undefined;
};
