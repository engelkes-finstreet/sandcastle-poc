# The Sandcastle Factory

The agent factory in `.sandcastle/`: a long-running host process that turns labelled GitHub
issues into pull requests by running Claude Code in disposable containers, with a human deciding
at two points. This is not the product — the Next.js application the factory operates on has its
own vocabulary, and none of it belongs here.

## Language

### The work

**Issue**:
A GitHub issue wearing the `Sandcastle` label. The only way work enters the factory.
_Avoid_: ticket, task, story

**Plan**:
The kickoff task list phase 1 produces, which is also the description of the draft pull request
that carries it. Not a design document — see `0003-there-is-no-revision-run.md`.
_Avoid_: spec, design doc, proposal

**Approval**:
The comment on a plan's pull request that authorizes implementation. Whatever it says beyond the
trigger word overrides the plan on that point.
_Avoid_: sign-off

**Attempt**:
The result of a run that was meant to write code: what it produced, how it ended, and what to
say about it.

**Outcome**:
How an attempt ended — shipped, blocked, no-changes, or no-signal. Exactly one per attempt.

**Gate**:
`tsc --noEmit`, `pnpm lint` and `pnpm build`, green inside the sandbox. This repo has no test
suite, so the gate is the whole of the automated check: it proves the code compiles, never that
it works.

### The phases

**Phase**:
One numbered stage of an issue's life. Either an agent run or a human's decision, never both.

**Plan run** (phase 1):
The read-only run that produces a plan and writes no code.

**Implementation run** (phase 3):
The run that builds an approved plan, in a session that carries nothing from phase 1 — see
`0004-the-implementation-run-starts-fresh.md`.

**Code review** (phase 4):
The *agent* reviewer: a stranger to the code, reads the diff, posts a comment, fixes nothing.
Currently switched off.
_Avoid_: review, PR review — both read as a human's review, and this one is an agent's

**Follow-up run** (phase 5):
The run that acts on a human's change request against a diff that has already shipped.
_Avoid_: revision run — the noun is spent by `0003-there-is-no-revision-run.md`, which is about
plans; fix loop — the thing `0002-the-code-review-is-a-stranger-and-a-comment.md` rejected, a
reviewer acting on its own findings

### The watcher and its memory

**Watcher**:
The host process that drives everything. One agent run at a time, many issues tracked at once.
_Avoid_: daemon, worker, orchestrator

**Tracked issue**:
An issue the watcher holds a state file for, waiting either for a plan approval or for a change
request. Only a tracked issue can be serviced.
_Avoid_: pending — it named the era when there could be only one

**Trigger word**:
The word at the start of a comment that the watcher acts on: `approve`, `abandon`, `revise`. Any
other comment earns one reply and changes nothing.

**Watermark**:
A timestamp separating comments already dealt with from comments still to read. There are two:
one advances when a run acts on comments, the other when the watcher merely replies to one.

**Rescue**:
Committing what a dead run left uncommitted in its worktree onto that run's branch, as a `wip`
commit. A checkpoint, never a claim that anything passed the gate — see
`0005-a-dead-run-does-not-take-its-work-with-it.md`.

**Ask**:
A Slack post the factory has stopped on: it needs a person before anything else can happen. It
is @-mentioned and broadcast out of its thread, and nothing else is — see
`0007-a-ping-means-it-is-your-turn.md`.
_Avoid_: alert, notification — both are true of every post, and the distinction is the point

**Sandbox**:
The container a run happens inside. Deleted when the run ends.

**Worktree**:
The disposable checkout a container is given, created fresh for one run and deleted after it. The
branch is the thing that persists, not the worktree.
_Avoid_: checkout, sandbox directory — the sandbox is the container, not the tree
