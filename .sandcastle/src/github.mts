import {
  ABANDONS,
  APPROVES,
  AWAITING_LABEL,
  BOT_MARKER,
  LABEL,
  PR_BASE,
  REVISES,
  REVISION_LABEL,
} from "./config.mts";
import { capture, describe, gh, git, log } from "./shell.mts";
import type { Decision, Issue, PlanDraft, Reviewed, Said, Tracked } from "./types.mts";

// Everything the watcher does to GitHub: read the queue, move labels, open the plan
// pull request, read what a human said on one, comment. Writes that are only there
// to keep a human informed degrade to a warning — losing a comment is not worth
// losing a run.

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

/** Issues wearing one of the watcher's state labels, for the startup orphan check. */
export const labelledIssueNumbers = (label: string): number[] =>
  (
    JSON.parse(
      gh("issue", "list", "--state", "open", "--label", label, "--json", "number", "--limit", "50"),
    ) as { number: number }[]
  ).map(({ number }) => number);

/**
 * The GitHub-visible mirror of the two states a tracked issue can be in. Carried
 * for legibility rather than for correctness — the state files are the truth —
 * but with several issues in flight at once, "what does the watcher think it owns"
 * should be readable without opening .sandcastle/state/.
 */
export const STATE_LABELS: Record<string, { color: string; description: string }> = {
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
export const ensureStateLabels = () => {
  for (const [name, { color, description }] of Object.entries(STATE_LABELS)) {
    try {
      gh("label", "create", name, "--color", color, "--description", description, "--force");
    } catch (error) {
      log(`  WARNING: could not create the "${name}" label: ${describe(error)}`);
    }
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
  "- Comment **`approve`** (or `lgtm`) and a fresh agent implements exactly this — the plan above",
  "  is its whole brief — then pushes here and marks the pull request ready for review.",
  "- Want something changed? Say it **in that same comment** — `approve, but use the shared modal`",
  "  — and it overrides the plan on that point. There is no separate revision round.",
  `- Comment **\`abandon\`** to stop. The branch and this pull request are left for you to delete;`,
  `  re-add the **${LABEL}** label to the issue to plan it again from scratch.`,
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
    `<!-- sandcastle:branch=${pending.branch} -->`,
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

/**
 * Bring the local branch up to what is on the remote, if it is simply behind.
 *
 * A follow-up run works on a branch a human has had open for a while, and they may
 * well have pushed a tweak to it themselves. The worktree is cut from the *local*
 * ref, so without this the agent would read a stale tree, and the push at the end
 * would be rejected as non-fast-forward — a confusing way to lose a run.
 *
 * Only ever a fast-forward. If the branch has genuinely diverged — a `wip` commit
 * here, a human's commit there — nothing is moved and nothing is discarded: the
 * warning says so, the run goes ahead on what we have, and the push that fails
 * afterwards is reported like any other host failure. Resolving that is a human's
 * call on a pull request they already have open.
 */
export const syncBranchFromOrigin = (branch: string) => {
  try {
    git("fetch", "origin", branch);
    const local = git("rev-parse", branch);
    const remote = git("rev-parse", `origin/${branch}`);
    if (local === remote) return;

    try {
      capture("git", ["merge-base", "--is-ancestor", local, remote]);
    } catch {
      log(`  WARNING: ${branch} and origin/${branch} have diverged — running on the local branch`);
      return;
    }

    git("update-ref", `refs/heads/${branch}`, remote, local);
    log(`  fast-forwarded ${branch} to origin/${branch}`);
  } catch (error) {
    log(`  WARNING: could not check ${branch} against origin: ${describe(error)}`);
  }
};

export const markReadyForReview = (prNumber: number) => {
  try {
    gh("pr", "ready", String(prNumber));
  } catch (error) {
    log(`  WARNING: could not mark PR #${prNumber} ready for review: ${describe(error)}`);
  }
};

// ------------------------------------------------------------------- review

type PrComment = { body: string; createdAt: string; url?: string; author?: { login?: string } };

const said = (c: PrComment): Said => ({
  author: c.author?.login ?? "someone",
  body: c.body.trim(),
});

/**
 * Read the decision off the pull request, and which words count depends on which
 * state the issue is in: a plan awaiting approval reads `approve`, a shipped pull
 * request reads `revise`, and both read `abandon`. The watcher's own comments are
 * filtered by marker, since they are authored by the same GitHub user as yours.
 *
 * Two clocks, and they are not interchangeable. `repliedThrough` decides *which
 * comment decides* — the latest one nobody has answered yet — so the one-reply
 * nudge cannot repeat itself every poll. `servicedThrough` decides *what a run is
 * handed*, and only a run moves it, which is what lets a `revise` act on the three
 * comments that led up to it rather than on the word alone.
 *
 * The latest unanswered comment wins, deliberately: a `revise` followed by
 * "actually, hold on" is somebody changing their mind, and the second comment is
 * the one to honour.
 */
export const decide = (tracked: Tracked): Decision => {
  const pr = JSON.parse(
    gh("pr", "view", String(tracked.prNumber), "--json", "state,comments"),
  ) as { state: string; comments: PrComment[] };

  if (pr.state !== "OPEN") return { type: "gone", state: pr.state };

  const human = pr.comments.filter((c) => !c.body.includes(BOT_MARKER));

  const latest = human.filter((c) => c.createdAt > tracked.repliedThrough).at(-1);
  if (!latest) return { type: "wait" };

  const { author, body } = said(latest);
  const reviewed: Reviewed = { comment: body, author, url: latest.url };

  if (tracked.status === "awaiting-plan") {
    if (APPROVES.test(reviewed.comment)) return { type: "approve", ...reviewed };
    if (ABANDONS.test(reviewed.comment)) return { type: "abandon", ...reviewed };
    return { type: "unclear", ...reviewed };
  }

  if (REVISES.test(reviewed.comment)) {
    const since = human.filter((c) => c.createdAt > tracked.servicedThrough).map(said);
    return { type: "revise", ...reviewed, since };
  }
  if (ABANDONS.test(reviewed.comment)) return { type: "abandon", ...reviewed };
  return { type: "unclear", ...reviewed };
};
