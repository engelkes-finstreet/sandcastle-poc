# Act on a change request for issue {{ISSUE_REF}}: {{ISSUE_TITLE}}

Code for this issue is already implemented, pushed, and open for review at {{PR_URL}}. A human has
read it and asked for a change. Make that change, verify it, commit it, and stop.

You did not write this code — a previous run did, in a conversation you do not have. This is a
fresh session. The diff on this branch is the subject, the request below is the brief, and this
repo's skills are how you write anything new.

## What they asked for

{{REQUEST}}

**This is binding, and it is the whole of your scope.** It overrides the plan below wherever the
two disagree — the plan was approved before anyone had seen the code, and the request was written
by someone looking at it. Do exactly what it asks and nothing more.

If it reads as a question rather than an instruction — *"why is this a separate component?"* — then
answer it and change nothing; see **Nothing to change** below. Do not guess at a change nobody
asked for.

## The plan this was built from, for context

{{PLAN}}

Context only. Do not re-implement it, do not look for parts of it that were missed, and do not
re-litigate it. If the request asks for something the plan forbids, the request wins.

## Where you are

- Working directory: !`pwd`
- Branch: !`git rev-parse --abbrev-ref HEAD`
- Recent commits: !`git log --oneline -8`
- Working tree: !`git status --porcelain | head -10`

You are on the branch the pull request is open against, with every commit that has already shipped.
Dependencies are installed.

**Read the diff before you change anything.** `git diff {{BASE}}...HEAD` is what the human was
looking at when they wrote the request, and it is the fastest way to understand both what exists
and what they mean. `git log` may also show a `wip(#n)` commit — an earlier run that died and had
its uncommitted files saved by the host. That never passed the gate; treat it as a draft, not as
finished work.

This container is thrown away when you exit. The gate below comes before your commit, so plan on
committing once at the end.

## The issue and the full conversation, for reference

The issue's full text — body and every comment, oldest first — as it stood when this
container started. It is your only copy: this sandbox has no tracker credential.

If the text opens with a **Scope:** line, the issue is a story split into subtasks and only the
subtask(s) named there are this repository's work. The sections marked *for context* — the story
itself, and what the other subtasks cover — are there so what you do fits against work somebody
else is doing. They are not yours to do.

{{ISSUE_TEXT}}

## How to work

1. **Change the smallest thing that satisfies the request.** This is a pull request somebody is
   part-way through reviewing. Every file you touch that they did not ask about is a file they have
   to re-read. Do not reformat, do not rename for taste, do not refactor something you would have
   written differently, do not "while I'm here".
2. **Use the skill that owns whatever you touch.** `form`, `ui`, `page`, `secure-fetch`,
   `path-resolver`, `modal` and the rest are installed, along with the `finstreet-mcp` tools. They
   carry this repo's conventions, and code written without them tends to look plausible and land in
   the wrong place. Read the skill for the area you are editing even though the code already
   exists — especially if the request is *because* the first attempt did not follow it.
3. **`CLAUDE.md` at the repo root is binding** where it exists. Its rules about branching, pushing
   and opening pull requests do not apply to you — the host does that.
4. **Verify.** This repo has no unit or integration test suite, so the gate is all three of:
   - `pnpm exec tsc --noEmit` — must be clean;
   - `pnpm lint` — no new errors. One pre-existing warning about an unused
     `getFspFinancingCaseOverview` is expected; leave it alone;
   - `pnpm build` — must reach Next's route table.

   All three must pass before you commit. Quote any failure you cannot legitimately fix rather than
   working around it. `e2e/` is out of scope: it needs browsers this image does not have.
5. **Commit** in the repo's conventional-commit style, referencing the issue in the body as
   `Refs {{ISSUE_REF}}`. Write the subject for someone reading the pull request's commit list
   after having already reviewed it once — say what changed now, not what the feature is.

## `messages/de.po` will change under you

Running the gate is not read-only: `pnpm build` makes next-intl extract messages into the tracked
`messages/de.po`, and it picks up keys from across the codebase that were never committed — not
just yours. So after the gate:

- if your change introduced new translatable strings, commit that file on its own as
  `chore(i18n): update extracted messages`;
- if it did not, `git checkout -- messages/de.po` and say so in your final message.

Either way it must not ride along inside a feature commit.

## Rules

- **Do not push, do not edit the pull request, do not comment anywhere.** The host pushes your
  commits and posts your report. Pushing would not work anyway: the remote is SSH and this
  container has no key.
- **Do not create or switch branches, and do not rebase or merge `{{BASE}}`.** Somebody has this
  pull request open; rewriting its history under them is worse than any conflict. Commits on any
  other branch are lost.
- **Do not revert or undo shipped commits** unless the request explicitly asks you to. Build on
  what is there.
- **Leave the worktree clean.** `git status --porcelain` empty when you finish, ignoring build
  output.
- No commented-out code, no `TODO` comments, no weakening a check to get it green.
- Do not print the value of any token or secret.

## Tell them how to check it

End with instructions for exercising *this change* on a Mac — not the whole feature again — inside
a single `<testing>` tag:

<testing>
… how to check this change, in markdown …
</testing>

The host posts that verbatim as a pull request comment. Write it for the person who asked for the
change and has already seen the rest. Cover the exact URL and click path to reach the thing you
touched, what should now be different, and anything you could not check — no real API calls, no
browser, no e2e suite in here. If the request was ambiguous and you picked a reading, say which.

No preamble, no restating the request.

## Done

When the change is made, all three gate commands pass, everything is committed, and the `<testing>`
block is written:

<promise>COMPLETE</promise>

## Nothing to change

If the right answer is that no code should change — the request was a question, the behaviour they
asked for is already what the code does, or they were reading it wrong — then **do not invent a
change to have something to commit.** Explain it in a `<note>` block and finish:

<note>
… what they asked, what the code actually does, and why that needs no change …
</note>

<promise>COMPLETE</promise>

The host posts that note as the pull request comment, so write it as a reply to a colleague: point
at the file and line that answers them. Commit nothing.

## Blocked

If you cannot do what was asked — it contradicts something load-bearing, it needs a decision only a
human can make, a gate failure you cannot legitimately fix — then **do not commit a half-finished
change**. Explain what blocked you and what you would need, and output:

<promise>BLOCKED</promise>

Nothing is pushed on that path, so the pull request stays exactly as they reviewed it. That is a
better outcome than a commit that does something other than what was asked.
