# Implement the approved plan for issue {{ISSUE_REF}}: {{ISSUE_TITLE}}

The plan you wrote was approved on pull request {{PR_URL}}. Implement it, verify it, commit it,
and stop.

You did not write this plan — a previous run did, in a conversation you do not have. This is a
fresh session, and the plan below plus this repo's skills are your whole brief. It has been read
and approved by a human, so treat it as settled: build it, do not re-litigate it, and do not
re-establish what it already states.

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

You are on the branch the pull request is already open against. Dependencies are installed.

The branch normally holds one empty `plan(#n)` commit and nothing else. If `git log` shows a
`wip(#n)` commit as well, an earlier run on this branch died — a timeout, a dropped connection —
and the host committed what it had written so it would not be lost. Treat that as a starting
point, not as finished work: none of it passed the gate, some of it may be half a file, and the
plan below is still the brief. Read it with `git show`, keep what is right, fix or delete the
rest, and commit your own work on top. Say in your final message what you kept and what you
threw away.

This container is thrown away when you exit. The gate below still comes before your commit, so
plan on committing once at the end — if the run dies before that, the host commits what is in the
worktree as a `wip` commit for the next attempt. That is a safety net for a run that fails, not a
way to hand work over: what it saves is unverified by definition.

## The issue, for reference

The full text — body and every comment, oldest first — as it stood when this container
started. It is your only copy: this sandbox has no tracker credential.

If the text opens with a **Scope:** line, the issue is a story split into subtasks and only the
subtask(s) named there are this repository's work. The sections marked *for context* — the story
itself, and what the other subtasks cover — are there so what you do fits against work somebody
else is doing. They are not yours to do.

{{ISSUE_TEXT}}

## How to work

1. **Follow the plan's step order.** It was ordered so each step's output feeds the next, and
   it was reviewed in that shape.
2. **Use the skill each step names.** `form`, `ui`, `page`, `secure-fetch`, `path-resolver`,
   `modal`, and the rest are installed, along with the `finstreet-mcp` tools. They carry this
   repo's conventions — file layout, naming, which component to reach for. Code written
   without them tends to look plausible and land in the wrong place.

   The plan names tasks and skills, not files, and that is deliberate — the skills carry the
   detail. Resolve paths with `path-resolver` and let each skill decide the file layout; do not
   treat the absence of a file list as licence to invent one.

   **Read the skills, not the whole repo.** The plan was written by an agent that explored this
   codebase, and anything it found that you could not reasonably work out yourself is already
   written down — usually under open questions. So do not re-verify the plan's claims about how
   a package behaves or which pattern this repo uses. Read what you need to write *this* code
   and start writing.
3. **`CLAUDE.md` at the repo root is binding** where it exists. Its rules about branching,
   pushing and opening pull requests do not apply to you — the host does that.
4. **Verify.** This repo has no unit or integration test suite, so the gate is all three of:
   - `pnpm exec tsc --noEmit` — must be clean;
   - `pnpm lint` — no new errors. One pre-existing warning about an unused
     `getFspFinancingCaseOverview` is expected; leave it alone;
   - `pnpm build` — must reach Next's route table.

   All three must pass before you commit. Quote any failure you cannot legitimately fix rather
   than working around it. `e2e/` is out of scope: the image has chromium, but only the
   walkthrough phase is handed the application's environment, so nothing here can reach a login.
5. **Commit.** One commit, or a few well-scoped ones, in the repo's conventional-commit style
   (`feat(scope): …`, `fix(scope): …`), referencing the issue in the body as
   `Refs {{ISSUE_REF}}`.

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
feature *works* — nobody has clicked it, and this container has nothing to click: no staging
credentials reach it, so there is no running application it could log into. So
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
- **What you could not check.** Be specific and honest — the e2e suite (no login from here), any
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
