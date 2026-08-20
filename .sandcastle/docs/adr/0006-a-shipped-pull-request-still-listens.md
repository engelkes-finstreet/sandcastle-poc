# A shipped pull request still listens, and nothing waits on it

Pull request #4 was implemented correctly, marked ready, and announced. A human read it and left one
comment asking for a small change. Nothing happened. The log said `paused — nothing else runs until
…/pull/4 is merged or closed`, and that was the truth: `waitForReview` polled `gh pr view --json
state` every two minutes and read nothing else. The comment was invisible to it, and so was the
queue behind it.

Two things were wrong, and only one of them was visible. The pause could not hear a change request —
and while it held, no other issue could be planned either. This ADR removes the pause, adds a fifth
phase that acts on a change request when a human asks for one, and replaces the watcher's single
in-flight slot with a scheduler that tracks many issues and runs one at a time.

## The pause was one of three serializations, and the least of them

`waitForReview` in `github.mts` was the visible one. Behind it sat `loadPending()` in `main.mts`,
which returns the *first* state file it finds and hands it to the loop — so while any plan waited
for approval, for however many days that took, nothing new was picked up. And behind that,
`clearLeftoverWorktrees()` in `phases.mts` deletes every worktree under `.sandcastle/worktrees/`
before every run, which would make two concurrent runs destroy each other's work.

Removing the pause alone would have made throughput *worse*. A shipped issue that keeps its state
file — which it must, for anything to listen — would occupy the single slot returned by
`loadPending()` forever. So the scheduler is not a follow-up to phase 5; it is a prerequisite of it.
The two land together or not at all.

## One run at a time, and therefore no worktree work

The waits in this factory are days long and the runs are minutes. A human reading a pull request is
the bottleneck, not a container, so concurrency in the *waiting* buys nearly everything and
concurrency in the *running* buys nearly nothing.

So the loop still awaits exactly one `run()` at a time. What changes is that it no longer awaits a
*human* — it holds a set of tracked issues, services whichever has work, and sleeps one poll only
when none of them did and the queue is empty.

That single-slot property is load-bearing, and it is what keeps this change out of `phases.mts` and
`sandbox.mts` entirely:

- `clearLeftoverWorktrees()` stays correct. It deletes every managed worktree before a run, and
  under one slot none of them is ever live. It rescues before it removes
  (`0005-a-dead-run-does-not-take-its-work-with-it.md`), so the previous issue's uncommitted work is
  committed onto its own branch first.
- `rescueLeftovers()` at startup stays correct for the same reason.
- Git's own constraint never comes up. `git worktree add` refuses to check out one branch in two
  worktrees, because HEAD would be ambiguous — a hard wall that any parallel-container design has to
  build around and this one never reaches.

Interleaving costs nothing extra because there is no persistent checkout to switch. Sandcastle names
each worktree `sandcastle-<branch>-<timestamp>-<suffix>` and creates it fresh per run, so issue #4's
follow-up and issue #7's plan are the same operation to the worktree layer: make a worktree for a
branch, run, tear it down. The branch is what persists — as a local ref in the main repository,
which every linked worktree shares, plus `origin` once phase 3 has pushed. The per-run cost is a
`pnpm install` into a ~2GB `node_modules`, and that is per *run*, not per issue.

## Phase 5 is a human's instruction, not the reviewer's findings

`0002-the-code-review-is-a-stranger-and-a-comment.md` rejected a phase 5, and the rejection stands
as written: *"a phase 5 acting on its own findings would re-open a branch you have already been told
is ready."* An agent that reviews its own work and then acts on its own review is a loop with no
human in it, and this factory is built so that a human decides and the agent does.

This phase 5 is the other thing. It runs because a person typed `revise` on a pull request they were
looking at, and it is handed what that person wrote. Phase 4 — still parked, still best-effort,
still only a comment — has no path to it. Its findings are stamped with the bot marker and are
therefore invisible to the trigger, which means switching it on later cannot accidentally wire it
into a fix loop.

The word `revise` is the word a human reaches for, so it is the trigger. It is not what the phase is
called: `0003-there-is-no-revision-run.md` is titled *"There is no revision run"*, and reusing the
noun would read as a reversal of a decision that is still correct — there is still no revision run
**for plans**, and for the same reason as before. A plan is a task list, cheap to regenerate and
cheap to correct in a clause. A shipped diff is neither. So the phase is the **follow-up run**, and
the trigger is `revise`.

Everything else about it is phase 3's machinery: the same `runOptions`, the same
`COMPLETE`/`BLOCKED` signals, the same four outcomes, the same push to the same branch, the same
Slack thread. It does not `markReadyForReview` — the pull request already is. It does not rescue
leftovers on a shipped ending, for the reason phase 3 does not: a `wip` commit made after a
successful run would ride the next push into a pull request a human is already reviewing.

And it never touches the base. A branch that has drifted into conflict is a human's call on a pull
request they already have open; a rebase would rewrite history under them, and merging `main` in
would put commits in the diff nobody asked for.

## Two watermarks, because a reply must not consume a comment

`Pending.planPostedAt` did two jobs that only look like one: it marked which comments had been
*answered* and which had been *acted on*. Those were the same thing while `clarify()` was the only
thing that answered without acting.

They come apart post-ship. The natural rhythm is *"remove the guard"* → *"also rename X"* →
`revise`, and `clarify()` bumps the watermark past each of those first two as it replies to them —
so the follow-up run would fire with an empty payload. Hence two fields: `repliedThrough`, which
advances when the bot answers an unmatched comment and exists only to stop it repeating itself, and
`servicedThrough`, which advances only when a run actually happens and defines what the next run is
handed. `revise` is given every non-bot comment newer than `servicedThrough`, including ones already
replied to.

Unmatched comments still get their one reply, and post-ship that reply matters more than it did for
plans. `0003-there-is-no-revision-run.md` rejected silence because *"a human who writes a change
request and gets nothing back learns nothing from the silence — they cannot tell it from a watcher
that has died"* — which is exactly what happened on #4, and exactly what was reported. The cost is a
bot reply per stray comment on a shipped pull request. Accepted: legibility is the entire point of
this change.

## Three rounds, then a human

`0005-a-dead-run-does-not-take-its-work-with-it.md` left a note that this change is now cashing:
*"keeping the state file and counting attempts is a change to the state machine, and it wants to be
made once, on purpose, with a bound."*

The bound is three follow-up runs. Blocked and no-signal endings consume a round too — a failed
follow-up must not silently drop a pull request — and unmatched comments do not, because no
container ran. At three, the watcher says so on the pull request and stops tracking the issue.

That makes a second terminal condition, alongside merged-or-closed. It is deliberate: a watcher that
has nothing left to offer should say so and let go, rather than hold a live state file open purely
to announce a merge it is no longer part of.

## Considered Options

**Parallel containers.** The version that was asked for first, and the one the constraints argue
hardest against. Git refuses one branch in two worktrees; `clearLeftoverWorktrees()` and
`rescueLeftovers()` would both have to learn which worktrees are live; each concurrent run adds a
~2GB tree and its own `pnpm install`; and branches cut from different commits at different times
would want a rebase story this design has just decided against. All of that to shorten a
minutes-long run inside a days-long human wait.

**Remove the pause, keep the single slot.** The smallest possible change, and a regression. The
shipped issue's state file has to survive for anything to listen, and `loadPending()` would then
return it forever.

**Any non-approval comment triggers a follow-up.** What would have made #4's comment work as typed.
Rejected on `0003-there-is-no-revision-run.md`'s cost argument, which does not weaken post-ship: a
colleague asking *"why this way?"* on a shipped pull request should not spend a container.

**Trigger on GitHub's review primitives** — a `CHANGES_REQUESTED` review, or `reviewDecision`.
Rejected on evidence. On #4, `reviews` is `[]` and `reviewDecision` is `""`; the change request was
a plain issue comment. Building on primitives nobody here uses would ship a feature that never
fires.

**Unbounded follow-up rounds.** Rejected per `0005-a-dead-run-does-not-take-its-work-with-it.md`'s
note. A badly specified issue would spend containers until somebody noticed.

## Consequences

- **`waitForReview` is deleted, not adapted.** Merged-and-closed detection already lives in
  `decide()`'s `gone` branch, which both states share. Nothing needs a blocking poll any more.
- **The `sleep` moves out of `servicePending` and into the loop.** Sleeping per-issue would multiply
  the poll interval by the number of issues tracked.
- **`Pending` becomes a tagged union** over `awaiting-plan` and `awaiting-revision`. Only those two
  states are persisted — they are the states that are true while the process is idle. Persisting
  `implementing` or `revising` would leave a crash in a state nothing can recover from without an
  explicit "was I interrupted?" check; as it stands a crash mid-implement leaves `awaiting-plan`
  with the approval still newer than `servicedThrough`, and it retries.
- **`planPostedAt` is renamed, and there is no migration.** Do this while `.sandcastle/state/` is
  empty — it is, as of this decision. An old state file would parse into a record with no `status`
  and no watermarks.
- **The scheduler costs one `gh pr view` per tracked issue per poll.** Ten tracked at 120s is ~300
  calls an hour against a 5000/hour limit. Linear in tracked issues; a batched `gh pr list` is the
  escape hatch if it ever matters.
- **Inline review comments still trigger nothing.** `gh pr view --json comments` does not contain
  them — they need `gh api repos/{owner}/{repo}/pulls/{n}/comments`. Typing `revise` on a specific
  line of the diff does nothing. Additive to fix, and called out here so it is not discovered as a
  bug.
- **`Sandcastle:awaiting-revision` joins `Sandcastle:awaiting-approval`.** The weakest part of this
  decision: a shipped pull request whose state file is lost is not stuck the way an unpolled plan is
  — you just merge it. The label is carried for legibility, so that which issues the watcher still
  believes it owns is readable on GitHub rather than out of `.sandcastle/state/`.
- **The README's flow diagram is wrong until it is updated**, in particular the `PAUSE until that
  pull request is merged or closed` line and the claim that one issue is in flight at a time. The
  same claim appears as a comment block at the top of `main.mts`.
