# The implementation run starts fresh

Phase 3 used to resume phase 1's conversation. Sandcastle captures each run's session JSONL to
`~/.claude/projects/…`, `implementPlan` passed `resumeSession`, and the agent that wrote the code
was — literally — the agent that had written the plan, still holding every file it had read.

The first run under the new planning prompt showed what that costs and what it buys. Phase 1
ended at **76k tokens of context**. Phase 3 began by loading all of it, then spent its first
sixteen tool calls reading skill files that phase 1 had never opened, and re-grepped
`@finstreet/forms` for the `formId` behaviour that phase 1 had already established over twelve
calls. It inherited a conversation, paid for it on every turn, and then re-derived part of it
anyway.

The resumed prefix is never cached across the gap, either. Prompt caching is prefix-matched with
a five-minute default TTL, and phase 2 is a human reading a pull request — minutes at best,
usually longer. Every implementation run therefore pays a cold read of the entire planning
transcript before it writes a line, and ~0.1× that on every turn after.

So phase 3 now starts a fresh session. It is handed the issue, the approved plan, and the repo's
skills. `resumeIfPossible`, `sessionOf`, the `Session` type, the `sessionId`/`sessionFilePath`
fields on `Pending`, and the session id mirrored into the pull request description are all
deleted — nothing captures a session id any more, because nothing reads one.

What makes this safe is not the resume being useless; it is that **the plan is a kickoff task
list** (`0003-there-is-no-revision-run.md`). Each task names a skill, and each skill carries this
repo's conventions — file layout, naming, which component to reach for — into whichever agent
reads it. Continuity was carrying context the skills already carry. What the skills *cannot*
carry is a surprise the planning agent found by reading: a package that does not behave the way
its documentation says, a file that has to move. The planning prompt now names that as the test
for what belongs in a plan — *would a competent agent, holding this plan and these skills but
none of my exploration, get this right on its own?* — and the answer goes under open questions,
where a human sees it before approving.

## Considered Options

**Keep resume, and tell phase 3 to trust it.** A prompt line — "you established this while
planning; do not re-verify" — would cut the duplicated grepping without giving up continuity.
Rejected as the primary fix because it treats the symptom: the 76k is paid whether or not the
agent re-reads, and the instruction is a request, not a guarantee.

**Make it a knob (`SANDCASTLE_RESUME=0`) and measure both ways.** The careful option, and the one
to reach for if the fresh runs disappoint. Rejected for now because a knob is a decision deferred:
both paths stay supported, both need prompts that are true either way, and the prompts are where
this design actually lives. One mode, stated plainly, is worth more than two modes and a flag.

**Fork the session (`--fork-session`) instead of resuming it.** Solves a different problem —
mutating the original JSONL — and costs exactly the same tokens.

## Consequences

- **Phase 3 starts near-empty instead of at 76k.** It re-reads what it needs, which for this
  codebase is mostly skill files it would have read anyway.
- **The factory is now genuinely portable.** Nothing pins an issue to the machine that planned
  it: no session file, no `~/.claude/projects` dependency, no host-local state that a restart or
  a move can invalidate. `0001-open-questions-go-back-to-the-issue.md` argued for exactly this
  property on the question path; the implementation path now has it too.
- **The plan carries more weight.** Anything phase 1 discovered that the skills do not encode has
  to be written down or it is lost. That is a real risk and the thing to watch: if phase 3 starts
  making decisions phase 1 had already settled, the fix is a plan that names the finding, not a
  resumed session.
- **`state/issue-<n>.json` is now purely a convenience.** Every field in it either lives on the
  pull request too or is trivially recoverable.
- **Phase 4's independence is no longer special.** It used to be the one run that deliberately did
  not resume; now no run resumes, and phase 4's freshness is simply the house rule.
