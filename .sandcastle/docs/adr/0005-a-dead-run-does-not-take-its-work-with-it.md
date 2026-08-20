# A dead run does not take its work with it

The first implementation run to reach twenty-four minutes died at the twenty-fifth. Not the
agent's fault and not the sandbox's: the host's internet went away, `claude-code` exited 1 with
`Request timed out`, and `run()` threw. The watcher did what it was told — commented the failure
onto the pull request, took the label off, deleted the state file — and the nine files the agent
had written sat in `.sandcastle/worktrees/sandcastle-issue-1`, uncommitted, waiting for
`clearLeftoverWorktrees()` to force-remove them at the start of the next run.

So the cost of a dropped connection was the whole run, and the thing that would have deleted the
evidence was our own housekeeping.

**The host now commits what the run left behind.** One `wip(#n)` commit on the issue branch, made
by `commitWorktree` in `phases.mts`, on every phase-3 ending except `shipped`, and again at
startup for the runs that never reached an error path at all — a Ctrl-C, a `kill`, a closed
laptop. The pull request comment and the Slack line say how many files, where they are, and what
they are not.

This is only possible because of where the work already is, which is worth writing down because
it is the load-bearing fact. The worktree is a git worktree of *this* repo, bind-mounted into the
container: the agent's files land on host disk as it writes them, and the branch is an ordinary
local branch. Committing them needs neither the container, which is deleted the moment the run
ends, nor the network, because a commit writes objects and moves a local ref. The failure that
most often kills a run is precisely the one that cannot stop us from saving its output.

## Considered Options

**Resume the dead session instead.** The version of this that saves the *reasoning* rather than
the files, and it is not available even in principle: `0004-the-implementation-run-starts-fresh.md`
retired resume on cost grounds, and a docker run could not have offered it anyway. Claude Code
runs inside the container, so the session JSONL is written to the container's
`~/.claude/projects/` and deleted with it — the host has no record of a run that happened in
Docker unless a host directory is mounted at `/home/agent/.claude/projects`, which nothing does.
Files are the part that is expensive to reproduce and cheap to keep.

**Push the `wip` commit.** Durable off the host, visible on the pull request — and it puts
unverified, sometimes half-written code into a diff a human is being asked to review, on a branch
whose pull request is the *plan*. The gate runs before the agent's own commit, so by construction
nothing the host rescues has passed it. It stays local; `git log` is one command.

**Have the agent commit as it goes.** Would make the rescue unnecessary, and breaks the rule that
makes an implementation reviewable: `tsc`, `lint` and `build` all pass before anything is
committed. Trading a verified single commit for a branch of unverified increments is a bad deal
when the increments are only ever read after a failure.

**Retry the run automatically.** The obvious next thing, and deliberately not part of this. A
thrown `run()` still retires the issue: label off, state file deleted, re-add the label to start
over from planning. Keeping the state file and counting attempts is a change to the state machine,
and it wants to be made once, on purpose, with a bound — not smuggled in behind a commit.

## Consequences

- **A failed run is now cheap to pick up from.** The next attempt inherits the last one's files,
  because `git worktree add <path> <branch>` checks the existing local branch out as it is —
  nothing resets it to the base. `prompts/implement-plan.md` tells the next agent what a `wip`
  commit is, that it never passed the gate, and to say what it kept and what it threw away.
- **The prompt can no longer claim the branch is "one empty commit ahead of the base".** It was
  true until this change and is now conditional, which is exactly the kind of sentence an agent
  reads literally. It has been rewritten around `git log`.
- **`clearLeftoverWorktrees()` rescues before it removes.** The 2GB worktree still goes; what was
  in it does not. That inversion is the whole safety property, so it lives in one place rather
  than being remembered at each call site.
- **`wip` commits accumulate on the host** until a retry supersedes them or the branch is deleted.
  A shipped run's push carries any earlier `wip` commits from the same branch with it, which is
  honest history and a squash merge flattens. If the agent ends a *shipped* run with a dirty
  worktree, the next sweep will commit that too — unpushed, marked `wip`, and visible.
- **The rescue never throws.** Every caller is already reporting a failure, and a rescue that
  threw would replace that report with its own. It logs a warning and returns 0.
- **What is saved is files, never verification.** A `wip` commit is a checkpoint, not a claim.
  Nothing in the pull request, the Slack thread or the prompt describes it as anything else, and
  that wording is load-bearing: a rescued run that reads as a partially successful one would be
  worse than no rescue at all.
