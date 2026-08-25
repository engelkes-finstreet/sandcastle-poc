# The Sandcastle Factory

The agent factory in `.sandcastle/`: a long-running host process that turns queued issues into
pull requests by running Claude Code in disposable containers, with a human deciding at two
points. This is not the product — the Next.js application the factory operates on has its own
vocabulary, and none of it belongs here.

## Language

### The work

**Issue**:
A unit of work queued in the tracker, identified by an opaque string key. The only way work
enters the factory. On a GitHub-tracked project it is a GitHub issue wearing the `Sandcastle`
label and its key is the issue number as a string.
_Avoid_: ticket, task, story

**Tracker**:
Where work comes from, and where the watcher mirrors its state back to: the queue, an issue's
text, the six lifecycle moments, the release comment, and both renderings of an issue's
identity. A port — `src/tracker.mts`, chosen by `SANDCASTLE_TRACKER` — with two adapters:
GitHub, and Jira for ESCB. See `0008-the-tracker-is-a-port-the-forge-is-github.md`.
_Avoid_: using it to mean GitHub specifically — the point of the word is that it may not be

**Moment**:
One of the six points in an issue's life the watcher tells its tracker about — picked-up,
awaiting-approval, implementing, awaiting-revision, shipped, stopped. Fixed by the watcher; each
adapter is free only in *how* it says one, and saying nothing is a legitimate way.
_Avoid_: event, hook, state — the first two suggest something subscribable, and the states are
the watcher's own (`Tracked["status"]`), which is a shorter list

**Transition map**:
`jira-transitions.json`: the committed, per-project file naming which Jira transition each moment
fires. Optional entry by entry and absent by default, so the Jira mirror is labels-first until a
team fills it in. Only the Jira adapter has one.
_Avoid_: workflow config — the workflow is Jira's, and the map only names moves inside it

**Flow**:
One issue type's workflow, as the transition map sees it: the moments named under `"Sub-task"`, or
under `"*"` for every type not named. A Jira workflow scheme binds a workflow per issue type, so
ESCB has two — they use the same words for the two buttons the map fills in today, so the committed
file is the flat single-flow shape, and they diverge after In CodeReview, which is where a flow per
type will be needed. Which flow a moment uses is decided by the type of the issue it lands on,
which for a scoped story is the subtask's, not the story's.
_Avoid_: workflow (Jira's word for the whole graph, of which a flow is only the moments we name),
map per type (there is one map file; a flow is a section of it)

**Subtask rule**:
`jira-subtasks.json`: the committed, per-*repository* file saying which of a story's subtasks this
golem implements — `mine` to work, `others` to leave alone, matched against subtask summaries. A
sibling of the transition map, answering a different question: the map is about which board column
a moment moves, this is about which half of a story is ours at all. Only the Jira adapter has one.
_Avoid_: calling it a filter — it also composes what the prompt is told, not just what is queued

**Scope**:
What one labelled issue's work turns out to be, once the subtask rule is applied: the issue itself,
some of its subtasks, or another repository's (in which case this golem leaves the issue alone with
its label on). It narrows the *prompt* and the workflow transitions, never the issue's identity —
the branch, the state file, the pull request and the label swap stay on the labelled issue. See
`0010-a-golem-takes-its-own-slice-of-a-story.md`.
_Avoid_: using it for how large a plan is allowed to be, which is the prompts' word for something
else

**Forge**:
Where the code changes go: branches, the plan pull request, trigger-word comments,
ready-for-review, merged and closed. Plain GitHub on purpose — not a port, and it gains no
interface, per the same ADR.
_Avoid_: treating tracker and forge as one thing, which is the conflation the split undid

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
The *agent* reviewer: a stranger to the code, reads the diff along both axes, posts a comment,
fixes nothing. Currently switched off.
_Avoid_: review, PR review — both read as a human's review, and this one is an agent's

**Axis**:
One of the two questions the code review asks of a diff — Standards, does it follow how this repo
writes code; Spec, does it do what the issue asked and only that. Each is a subagent of its own and
a section of its own, findings never move between them, and the verdict is the only place they
meet. Standards fans out further (a baseline agent plus up to three heavy skills); Spec never does.
_Avoid_: pass — what the prompt called them when one agent read the diff twice; dimension, lens

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
is @-mentioned, in its issue's thread like every other post, and nothing else is @-mentioned —
see `0007-a-ping-means-it-is-your-turn.md`.
_Avoid_: alert, notification — both are true of every post, and the distinction is the point

**Sandbox**:
The container a run happens inside. Deleted when the run ends.

**Worktree**:
The disposable checkout a container is given, created fresh for one run and deleted after it. The
branch is the thing that persists, not the worktree.
_Avoid_: checkout, sandbox directory — the sandbox is the container, not the tree
