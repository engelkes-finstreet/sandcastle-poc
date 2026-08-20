# There is no revision run, and the plan is the kickoff task list

> **Scope, per `0006-a-shipped-pull-request-still-listens.md`:** this decision is about **plans**,
> and within that scope it stands unchanged — there is still no revision round between a plan and
> its approval, for the reasons below. `0006` adds a follow-up run on a *shipped diff*, triggered
> by a human typing `revise` on the pull request. The distinction is the one this ADR draws: a
> plan is a task list, cheap to regenerate and cheap to correct in a clause, so a round trip to
> amend one earns nothing. A shipped diff is neither. `0006` also splits `planPostedAt` — see the
> consequence noted below — into `servicedThrough` and `repliedThrough`, because a reply that
> consumes a comment would starve the follow-up run of its payload.

The first real plan this factory produced ran to nine thousand characters: a fifteen-row file
inventory with a reason per file, a section explaining how the form, the modal and the server
action fit together, zod rules quoted field by field, and seven open questions. It was not
wrong. It was a specification written by an agent for a human who wanted to answer one question
— *is this the right shape of work?* — and it made that question expensive to answer.

Two things were producing it, and both are now gone.

**The plan prompt asked for a design document.** It wanted files with reasons, steps, and
detail enough for the plan to stand on its own. But the plan does not have to stand on its own:
phase 3 resumes the planning session, so the agent that implements already read everything the
plan could have said, and each task names a `finstreet-fe` skill that carries this repo's
conventions — where files go, what they are called, which component to reach for — into the
implementation whether the plan repeats them or not. Detail written into the plan is therefore
detail written twice, once for nobody. The prompt now asks for the `kickoff` skill's output and
three short sections around it: what changes, how it will be verified, and what only a human
can decide. Fifty lines, and the skill list is the part that is allowed to be long.

**Any comment that was not an approval started a revision run.** A container, a resumed session,
a rewritten pull request description, and a new wait — to change a plan that is now a task list.
The cost of that round is a container start; the thing it produces is usually a sentence. So
`approve, but use the shared modal` now does the whole job: everything after the approval word
reaches phase 3 as `{{APPROVAL}}`, and the implementation prompt already treats it as binding
where it contradicts the plan. `prompts/revise-plan.md`, `revisePlan`, `updatePlanBody` and the
`revise` decision are deleted.

## Considered Options

**Keep the revision run and only slim the prompt.** The obvious half-measure, and it leaves the
expensive path in place for the case it is worst at. A task list is cheap to regenerate from
scratch and cheap to correct in a clause; the round trip in between earns its cost only when the
plan is long — which is exactly what the other half of this change removes.

**Treat any non-approval comment as an abandonment.** Cheaper still, and hostile. A colleague
who asks a question on the pull request would have their branch dropped for it.

**Let a non-approval comment sit silently.** What "no revision run" means literally: the watcher
reads the comment, matches neither pattern, and keeps waiting. Rejected because a human who
writes a change request and gets nothing back learns nothing from the silence — they cannot tell
it from a watcher that has died. It now posts one reply saying what the two words are and that
notes ride along with the approval.

## Consequences

- **The reviewer's job is smaller and more honest.** A task list with skills is a thing you can
  read in a minute and disagree with in a clause. A file inventory invites line-by-line review of
  files that do not exist yet, whose paths `path-resolver` decides at implementation time anyway.
- **Corrections are bounded by what fits in a comment.** Anything bigger is a re-plan: `abandon`,
  then re-add the label. The next attempt is a fresh container that reads the issue *and its
  comments*, so the conversation is not lost — it is in the tracker, which is where
  `0001-open-questions-go-back-to-the-issue.md` already put everything else.
- **`planPostedAt` now moves when a comment is answered, not only when a plan is posted.** That
  is what stops the one-reply nudge from repeating every poll, and it is durable across a restart
  because it lives in the state file rather than in memory.
- **Open questions in a plan must be answerable in a sentence**, since the answer arrives as part
  of an approval. The planning prompt says so. A question that cannot be answered that way is a
  sign the issue was not ready.
- The plan is still the pull request description and still the thing phase 3 is held to. Nothing
  about durability changes: state file, description, resumed session, in that order.
- **Watch for plans that are too thin.** Removing detail is only free while the skills carry it.
  If phase 3 starts putting files in the wrong place or reaching for the wrong component, the
  answer is a better skill or a more specific task line, not a plan that spells out the repo's
  conventions again.
