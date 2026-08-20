# The code review is a stranger, and it is only a comment

> **Scope, per `0006-a-shipped-pull-request-still-listens.md`:** the phase 5 rejected below — a
> reviewer acting on its own findings — is still rejected, and for the reason given: that is a loop
> with no human in it. `0006` adds a phase 5 of a different kind, which runs only because a person
> typed `revise` on a pull request they were reading, and which is handed what that person wrote.
> Phase 4 has no path into it: its comments carry `BOT_MARKER`, so they are invisible to the
> trigger, and switching phase 4 on cannot wire it into a fix loop by accident. Note also that the
> claim below that "phase 3 resumes phase 1" was true when this was written and was reversed by
> `0004-the-implementation-run-starts-fresh.md`.

Until now the plan was reviewed and the code was not. A human read a plan on a draft pull
request and approved it; what came back an hour later was pushed, marked ready, and read by
nobody until they got to it. The gate — `tsc --noEmit`, `pnpm lint`, `pnpm build` — proves the
code compiles, and this repo has no test suite, so between "the agent said `COMPLETE`" and "a
human found time" there was no reading at all.

Phase 4 is that reading. It is one more container on the same branch, after the push, with
`prompts/code-review.md`. Two decisions in it are worth recording, because both are the
opposite of what the rest of this design does.

## It does not resume the session

Every other phase resumes: phase 3 resumes phase 1 because continuity is what makes the
implementation faithful to the plan the human approved. Phase 4 refuses it, and refuses it for
exactly the same reason. An agent handed its own session agrees with itself. A review that
always approves is worse than no review, because it looks like one, and its verdict ends up in
Slack where somebody reads it instead of the diff.

So the reviewer gets three things and nothing else: the diff, the approved plan it is held to,
and this repo's skills. That last one is what the review is really made of — the general pass
asks whether the code is more complicated than the problem and whether it holds to this repo's
standards, and then a subagent per touched area re-reads the relevant skill (`form`, `ui`,
`secure-fetch`, `path-resolver`, …) against the files that should have followed it. Code written
without the skills compiles, lints, builds, and is still wrong in the way that costs a reviewer
an afternoon; the skills are the only thing that catches it, and the reviewer has to actually
open them rather than answer from general React knowledge.

It runs on `sonnet` rather than `opus` on the same logic. Reviewing is a bounded reading task
against a diff that already compiles, and the judgement lives in the skills rather than in the
model. A review costing a fraction of the implementation is a review nobody switches off.

## It runs after the push, and it changes nothing

The tempting version puts phase 4 between the commits and the remote, and lets a bad verdict
hold the branch back. That trade is bad twice.

Every failure inside the reviewer would become a lost implementation. A timeout, a crash, a
missing `<review>` tag — none of which say anything about the code — would strand finished work
in a deleted container. The implementation is the expensive thing here; a commentary on it must
never be able to destroy it.

And a verdict nobody can override is a gate an agent controls. The whole shape of this factory
is that a human decides and the agent does: the human approves the plan, the human merges the
pull request. A reviewer that could refuse to ship would be the one place that inverted.

So the branch is pushed and the pull request is ready before the reviewer starts, the findings
land as an ordinary comment, and what to do with them is yours. There is no fix loop either — a
phase 5 acting on its own findings would re-open a branch you have already been told is ready,
which is the thing this design avoids everywhere else. If the findings are worth acting on, they
are worth acting on the way any review is: by a person, or by a new issue.

## What follows from both

Because nothing downstream depends on it, phase 4 is best-effort in the code: it cannot return
false, it cannot fail the run, and a shutdown during it still leaves shipped code. The one thing
it must not do is fail quietly. Silence in the Slack thread is indistinguishable from a clean
review, so every way out of the phase — including "the run died" — says so out loud.
