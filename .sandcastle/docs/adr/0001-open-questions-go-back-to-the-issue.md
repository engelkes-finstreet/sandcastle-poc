# Open questions go back to the issue, and the run ends

An agent working an issue sometimes needs a decision it has no business making — which of two
plausible readings the issue meant, whether a behaviour change is acceptable, which of two
existing patterns to follow. Until now the only thing it could do was report `BLOCKED`, which
says "this could not be implemented" and throws away the most valuable thing a failed attempt
produces: a specific account of what was missing.

When the agent needs a human, it now **posts its questions as a comment on the issue** and
emits `<promise>QUESTION</promise>`. The host reports that outcome, removes the label as it
does for every other outcome, and moves to the next issue. The human answers on the issue and
re-adds the label. The next attempt runs in a fresh container and reads the question and the
answer as ordinary issue context, because the prompt already opens with the issue and its
comments.

Three properties fall out of this, and they are the point:

- **The issue tracker is the only record.** The question, the answer, and the reasoning live
  where the work is already tracked and where the next attempt already looks. Chat is a
  doorbell — it says a question is waiting and links to it — never a place an answer is given.
- **Nothing waits.** The watcher parks only on a pull request, where the wait is bounded by a
  thing the human is already holding. A question can sit overnight; parking on one would idle
  the factory for as long as the human is asleep.
- **Nothing is remembered between attempts.** No session to resume, no state keyed by issue,
  nothing pinned to the host that ran the first attempt. The label is the entire mechanism.

That last one is what makes this a decision worth recording rather than an implementation
detail. This runs as a package across several repositories and will move between machines; a
factory that keeps no state between attempts can be restarted, relocated, or run somewhere
else entirely with a question already outstanding, and nothing is lost.

## Considered Options

**Live question-and-answer in chat, with the session resumed.** The agent asks, the host posts
to a chat thread, polls for a reply, and calls `resume()` so the agent continues with its full
context. The most responsive option, and rejected on three counts. It needs an inbound read
scope on the chat workspace — a per-installation approval, which is a real tax on a package
meant to be dropped into many repositories, and in at least one workspace took days. It makes
the chat thread the place answers live, so the tracker no longer holds the whole story. And it
parks the queue on a human being available.

**Resume the session after the answer, without live chat.** Keeps the tracker as the source of
truth and only borrows the agent's context back. Rejected because the saving is smaller than it
looks and the cost is structural: the captured session is a file on the host that ran the first
attempt, so the factory can no longer move or restart between question and answer. A resumed
agent also carries forward the reading that made it uncertain, while a fresh one reads an issue
that is now genuinely clearer. What is actually lost by starting over is one exploration pass —
minutes, on a task well-specified enough to have got that far.

**Keep `BLOCKED` as the only escape.** Free. Rejected because it conflates two situations that
call for different human actions: an issue too vague to attempt at all, which must be rewritten,
and a single decision that would unblock an otherwise well-understood task, which needs one
comment. Reporting both the same way trains the reader to skim past both.

## Consequences

- The prompt's rule against commenting on the issue gains a carve-out: the agent may post
  questions, and nothing else.
- **Questions must be batched.** One comment carrying everything the agent needs, because every
  round costs a full container start — dependency install and database boot — before the agent
  reads a line. An agent that asks serially turns a ten-minute task into an afternoon.
- **Questions must be decisions only a human can make.** Anything determinable by reading the
  code is not a question; it is research the agent skipped. This belongs in the prompt and is
  where the mechanism will succeed or fail.
- Work done before the question is discarded, so the prompt should push clarification early —
  while the cost of starting over is an exploration pass rather than an implementation.
- Chat notification stays outbound-only. Installing into a new workspace needs a write scope and
  nothing more, which keeps the setup cost of a new repository low.
- An unanswered question needs no timeout. The issue simply sits without its label, exactly like
  every other issue nobody has picked up, and nothing is running or waiting on it.
- The retry is a fresh attempt, not a continuation, so it can reach a different conclusion than
  the attempt that asked. That is a feature; it is also a surprise the first time it happens.
- **This weakens the pressure to write well-specified issues**, which is the premise the factory
  runs on. The counter-pressure is that questions are expensive and visible: each one costs a
  re-run and announces itself. Worth watching over the first several real runs — if issues get
  vaguer because asking is easy, the answer is a stricter bar for applying the label, not a
  cleverer question mechanism.
- Assumes a tracker whose issues take comments the agent's own credentials may write. True of
  GitHub Issues, the only tracker supported today.
