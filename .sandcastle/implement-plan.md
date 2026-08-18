# Implement the approved plan for issue #{{ISSUE_NUMBER}}: {{ISSUE_TITLE}}

The plan you wrote was approved on pull request {{PR_URL}}. Implement it, verify it, commit it,
and stop.

This continues the session where you planned, so you already have the context — the plan is
repeated below because a session can be lost between the two runs, and because it is what you
are held to.

## The approved plan

{{PLAN}}

## What the reviewer said when approving

{{APPROVAL}}

If that carries an instruction — a nudge, a preference, a "yes, but" — it overrides the plan on
that point. Otherwise implement the plan as written.

## Where you are

- Working directory: !`pwd`
- Branch: !`git rev-parse --abbrev-ref HEAD`
- Recent commits: !`git log --oneline -3`
- Working tree: !`git status --porcelain | head -10`

You are on the branch the pull request is already open against, one empty commit ahead of the
base. Dependencies are installed. This container is thrown away when you exit, so anything you
do not commit is gone.

## The issue, for reference

!`gh issue view {{ISSUE_NUMBER}} --comments`

## How to work

1. **Follow the plan's step order.** It was ordered so each step's output feeds the next, and
   it was reviewed in that shape.
2. **Use the skill each step names.** `form`, `ui`, `page`, `secure-fetch`, `path-resolver`,
   `modal`, and the rest are installed, along with the `finstreet-mcp` tools. They carry this
   repo's conventions — file layout, naming, which component to reach for. Code written
   without them tends to look plausible and land in the wrong place.
3. **`CLAUDE.md` at the repo root is binding** where it exists. Its rules about branching,
   pushing and opening pull requests do not apply to you — the host does that.
4. **Verify.** This repo has no unit or integration test suite, so the gate is all three of:
   - `pnpm exec tsc --noEmit` — must be clean;
   - `pnpm lint` — no new errors. One pre-existing warning about an unused
     `getFspFinancingCaseOverview` is expected; leave it alone;
   - `pnpm build` — must reach Next's route table.

   All three must pass before you commit. Quote any failure you cannot legitimately fix rather
   than working around it. `e2e/` is out of scope: it needs browsers this image does not have.
5. **Commit.** One commit, or a few well-scoped ones, in the repo's conventional-commit style
   (`feat(scope): …`, `fix(scope): …`), referencing the issue in the body as
   `Refs #{{ISSUE_NUMBER}}`.

## `messages/de.po` will change under you

Running the gate is not read-only: `pnpm build` makes next-intl extract messages into the
tracked `messages/de.po`, and it currently picks up keys from across the codebase that were
never committed — not just yours. So after the gate:

- if your work introduced new translatable strings, commit that file on its own as
  `chore(i18n): update extracted messages`, so a reviewer can see the churn separately from
  your code;
- if it did not, `git checkout -- messages/de.po` and say so in your final message.

Either way it must not ride along inside a feature commit. Unexplained locale noise in a diff
is the fastest way to lose a reviewer's trust in the rest of it.

## Rules

- **Do not push, do not open or edit a pull request, do not comment on the issue.** The host
  pushes your commits and marks the pull request ready for review. Pushing would not work
  anyway: the remote is SSH and this container has no key.
- **Do not create or switch branches.** Commits on any other branch are lost.
- **Leave the worktree clean.** `git status --porcelain` empty when you finish, ignoring build
  output.
- **Stay inside the plan.** If you notice something else worth doing, name it in your final
  message and let a human file it. Scope the reviewer already approved is the scope you have.
- If the plan turns out to be wrong once you are in the code, stop and say so rather than
  improvising a different feature — see `BLOCKED` below.
- No commented-out code, no `TODO` comments, no weakening a check to get it green.
- Do not print the value of any token or secret.

## Tell the reviewer how to try it

The gate proves the code compiles, lints and builds. It proves nothing about whether the
feature *works* — nobody has clicked it, and this container has no browser to click it with. So
hand that over deliberately: end with instructions for running your change on a Mac, inside a
single `<testing>` tag.

<testing>
… how to try this, in markdown …
</testing>

The host posts that verbatim as a pull request comment, so write it for someone who has the
repo but has not read your diff, and who does not know which of the 25 routes you touched.
Cover, in whatever order serves the change:

- **Getting there.** The exact commands (`pnpm install` if you changed the lockfile,
  `pnpm dev`) and the exact URL, with a real path — `http://localhost:3000/operations/…`, not
  "the operations page". If the route needs a param, say where to get a valid one. If it needs
  a login or a role, say which.
- **What to do and what should happen.** The click path, and what proves it worked. Name real
  labels and real button text so they can be found on screen, and remember this app's UI is
  German while the code is English.
- **What to pay attention to.** The parts most likely to be wrong or to feel wrong: an edge
  case you could not exercise, a loading or error state, a validation rule, a value that
  depends on backend data this repo mocks. If you had to guess at intent, this is where you
  say so.
- **What you could not check.** Be specific and honest — the e2e suite (no browsers here), any
  real API call, anything needing data or credentials the sandbox does not have, anything
  behind a flag. A reviewer who knows where the holes are can cover them in two minutes; one
  who assumes it was all verified will ship the hole.

No preamble, no restating the plan, no "as described above" — the comment stands alone.

## Done

When the plan is implemented, all three gate commands pass, everything is committed, and you
have written the `<testing>` block:

<promise>COMPLETE</promise>

If you cannot finish — the plan does not survive contact with the code, something is missing,
a gate failure you cannot legitimately fix — then **do not commit a half-finished change**.
Explain what blocked you, and what you would need, in your final message and output:

<promise>BLOCKED</promise>

The host reports whichever signal you emit onto the pull request. `BLOCKED` after an approved
plan is disappointing but useful; a commit that does not do what was approved is worse.
