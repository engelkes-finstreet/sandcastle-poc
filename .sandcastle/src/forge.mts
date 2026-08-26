import {
  ABANDONS,
  APPROVES,
  BOT_MARKER,
  LABEL,
  MAX_SHOTS,
  PR_BASE,
  REVISES,
  WALKTHROUGH_MODEL,
  shotsBranchFor,
} from "./config.mts";
import { capture, describe, gh, git, log } from "./shell.mts";
// Type-only, so the tracker → adapter → forge import chain stays acyclic at runtime.
import type { PlanPrParts } from "./tracker.mts";
import type { Decision, PlanDraft, Reviewed, Said, Shot, Tracked, Walkthrough } from "./types.mts";

// The forge: everything pull-request-shaped. The branch push, the draft pull
// request that carries the plan, comments on it, ready-for-review, reading what a
// human said, and noticing a merge or a close.
//
// Deliberately not a port, and it gains no interface. Work can arrive from
// different trackers — that seam is tracker.mts — but the code always goes to
// GitHub, and an abstraction with one implementation is a fake seam somebody has
// to maintain. See docs/adr/0008-the-tracker-is-a-port-the-forge-is-github.md.
//
// Writes that are only there to keep a human informed degrade to a warning —
// losing a comment is not worth losing a run.

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

/**
 * What the tracker dictates about the plan pull request, supplied by the caller
 * because the forge does not know which tracker minted the key: the port's
 * PlanPrParts, plus `commitRef` — the port's `issueRef` — for the plan commit's
 * message. On GitHub the ref line is the `Closes` clause that closes the issue
 * on merge, which is why that tracker's `shipped` moment can be a no-op.
 */
export type PlanDress = PlanPrParts & { readonly commitRef: string };

export const planBody = (pending: PlanDraft, refLine: string) =>
  [
    refLine,
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
const emptyPlanCommit = (title: string, commitRef: string, branch: string) => {
  const tree = git("rev-parse", `${branch}^{tree}`);
  const parent = git("rev-parse", branch);
  const sha = capture("git", [
    "commit-tree", tree,
    "-p", parent,
    "-m", `plan(${commitRef}): ${title}`,
  ]);
  git("update-ref", `refs/heads/${branch}`, sha, parent);
};

/** Opens the draft pull request that carries the plan, and returns it. */
export const openPlanPullRequest = (
  draft: PlanDraft,
  dress: PlanDress,
): { url: string; number: number } => {
  emptyPlanCommit(draft.issue.title, dress.commitRef, draft.branch);
  git("push", "--set-upstream", "origin", draft.branch);

  const existing = JSON.parse(
    gh("pr", "list", "--head", draft.branch, "--state", "open", "--json", "url,number"),
  ) as { url: string; number: number }[];

  if (existing.length > 0) {
    const found = existing[0];
    gh("pr", "edit", String(found.number), "--body", planBody(draft, dress.refLine));
    return found;
  }

  const output = gh(
    "pr", "create",
    "--draft",
    "--base", PR_BASE,
    "--head", draft.branch,
    "--title", dress.title,
    "--body", planBody(draft, dress.refLine),
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

// -------------------------------------------------------------- screenshots

/**
 * Where an issue's screenshots are readable, keyed by filename. Not folded into
 * `Shot`, which already has a `url` — that one is the route the agent visited inside
 * the application, and conflating "the page I loaded" with "where the picture of it
 * lives" is a confusion that would eventually be printed at a human.
 */
export type ShotLinks = ReadonlyMap<string, string>;

/**
 * Put an issue's screenshots on a branch of their own, and answer with the URL each
 * one is now readable at.
 *
 * This exists because of a gap in GitHub rather than a preference: there is no public
 * API for uploading an image to a pull request — the web UI's drag-and-drop uses a
 * private endpoint — so the only way a body can show a picture is for the picture to
 * already be in the repository. Hence a branch; hence, emphatically, not the branch
 * under review, which is a diff somebody is reading.
 *
 * Written with plumbing rather than a checkout, exactly like `emptyPlanCommit` and for
 * the same reason: this branch is checked out nowhere on the host, and a `git add`
 * from REPO_ROOT would stage the PNGs onto whatever the host happens to have out.
 * `hash-object` writes each blob, `mktree` builds one flat tree from stdin, and
 * `commit-tree` with no parent makes it an orphan — so a second walkthrough
 * force-pushes a fresh single commit instead of growing a history nobody will read.
 *
 * Best-effort like every other write in this file. A push that fails costs the images
 * in the body, and the caller still says what was photographed and where the files
 * are on the host.
 */
export const pushShots = (
  issueKey: string,
  shots: readonly Shot[],
  commitRef: string,
): ShotLinks | undefined => {
  const branch = shotsBranchFor(issueKey);
  try {
    // --no-filters: these are binaries, and a stray text filter from .gitattributes
    // corrupting a PNG would show up as an image that will not render rather than as
    // an error anybody could trace back to here.
    const entries = shots.map(
      (shot) => `100644 blob ${git("hash-object", "-w", "--no-filters", shot.path)}\t${shot.file}`,
    );

    const tree = capture("git", ["mktree"], `${entries.join("\n")}\n`);
    const sha = capture("git", [
      "commit-tree", tree,
      "-m", `shots(${commitRef}): ${shots.length} screenshot(s) from a walkthrough`,
    ]);

    git("update-ref", `refs/heads/${branch}`, sha);
    // Force, and safely so: an orphan commit never fast-forwards onto the last one, and
    // nothing but the body this run is about to write points at what is being replaced.
    git("push", "--force", "origin", `${branch}:refs/heads/${branch}`);

    log(`  pushed ${shots.length} screenshot(s) to ${branch}`);
    return new Map(
      shots.map((shot) => [
        shot.file,
        `https://github.com/${REPO}/raw/${branch}/${encodeURIComponent(shot.file)}`,
      ]),
    );
  } catch (error) {
    log(`  WARNING: could not push screenshots to ${branch}: ${describe(error)}`);
    return undefined;
  }
};

/**
 * The block a walkthrough adds to the pull request body, and the markers that let the
 * next one replace it rather than stack under it.
 *
 * In the body rather than in a comment, which is the one way this differs from the
 * code review. A comment is a thing said at a moment; the body is what the pull
 * request *is*, and it is what a reviewer opening it tomorrow reads first. A picture
 * of the change belongs there, next to the plan it was built from.
 */
const SHOTS_OPEN = "<!-- sandcastle:shots -->";
const SHOTS_CLOSE = "<!-- /sandcastle:shots -->";
// Global, so a duplicate left by a half-failed run is cleared rather than pushed one
// block further down the description on every walkthrough after it.
const SHOTS_BLOCK = new RegExp(`\\n*${SHOTS_OPEN}[\\s\\S]*?${SHOTS_CLOSE}`, "g");

/**
 * Route, status and caption, as reported — any of the three may be missing, and the
 * arrow only appears between two things that are both there. A status on its own reads
 * as `404`, not as `→ 404` pointing at nothing.
 */
const shotCaption = (shot: Shot) => {
  const where = shot.url
    ? [shot.url, shot.status && `→ ${shot.status}`].filter(Boolean).join(" ")
    : shot.status;
  const parts = [`\`${shot.file}\``, where, shot.caption].filter(Boolean);
  return `_${parts.join(" · ")}_`;
};

const shotsBody = (walkthrough: Walkthrough, links: ShotLinks | undefined, branch: string) =>
  [
    SHOTS_OPEN,
    "",
    "## Screens",
    "",
    "🏰 **Walkthrough.** A fresh agent logged into staging, drove a browser to the pages this",
    "pull request touches, and photographed them. These are evidence that it renders — not a",
    "review, and not a claim that it is right. No human has read the code yet.",
    "",
    ...walkthrough.shots.flatMap((shot) => {
      const href = links?.get(shot.file);
      return [
        // width, because a 2x viewport screenshot renders a page-wide slab otherwise, and
        // six of those turn the description into something nobody scrolls to the end of.
        href
          ? `<img src="${href}" width="900" alt="${shot.file}">`
          : `_(\`${shot.file}\` could not be uploaded — it is on the host at \`${shot.path}\`)_`,
        "",
        shotCaption(shot),
        "",
      ];
    }),
    ...(walkthrough.summary ? [walkthrough.summary, ""] : []),
    "---",
    "",
    walkthrough.dropped > 0
      ? `_${walkthrough.dropped} further screenshot(s) were taken and dropped — over ${MAX_SHOTS} shots, ` +
        `or too large to commit. What is above is therefore not everything the agent looked at._`
      : undefined,
    `_Driven on \`${WALKTHROUGH_MODEL}\` against staging. The images live on \`${branch}\`; deleting_`,
    "_that branch breaks them here and nothing else._",
    "",
    SHOTS_CLOSE,
  ]
    .filter((line) => line !== undefined)
    .join("\n");

/**
 * Add the walkthrough's screens to the pull request body, replacing whatever a
 * previous walkthrough left there.
 *
 * Read-modify-write against the live body rather than a body this process remembers,
 * because it is not the only author: a human edits the description, and a run that
 * rebuilt it from the plan alone would silently delete what they wrote. Only the
 * marked block is ever touched.
 */
export const attachShots = (
  prNumber: number,
  issueKey: string,
  walkthrough: Walkthrough,
  links: ShotLinks | undefined,
): boolean => {
  try {
    const { body } = JSON.parse(gh("pr", "view", String(prNumber), "--json", "body")) as {
      body: string;
    };
    const kept = body.replace(SHOTS_BLOCK, "").trimEnd();
    const block = shotsBody(walkthrough, links, shotsBranchFor(issueKey));
    gh("pr", "edit", String(prNumber), "--body", `${kept}\n\n${block}`);
    return true;
  } catch (error) {
    log(`  WARNING: could not attach screenshots to PR #${prNumber}: ${describe(error)}`);
    return false;
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
  const reviewed: Reviewed = { comment: body, author, at: latest.createdAt, url: latest.url };

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
