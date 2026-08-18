# Revise the plan for issue #{{ISSUE_NUMBER}}

Your plan is on pull request {{PR_URL}} and the reviewer asked for changes instead of
approving it. This run produces the next version of the plan. Still no implementation.

## What the reviewer said

{{FEEDBACK}}

## The plan they were reading

{{PLAN}}

## What to do

Take the feedback as binding — the reviewer decides scope here, not you. If it asks for
something you believe is wrong or impossible, say so *in the revised plan* under open
questions and offer the alternative; do not silently ignore it and do not silently do it.

Re-read whatever the feedback points at before rewriting. If it names a component, a path or a
skill you have not looked at, look at it now — `finstreet-fe` skills and the `finstreet-mcp`
tools are available. If the feedback changes the shape of the work, run the
**`finstreet-fe:kickoff`** skill again rather than patching the step list by hand.

Keep everything the reviewer did not object to. A revision that silently rewrites the parts
they already accepted makes them re-review the whole thing.

## Rules

- **Change nothing on disk.** No edits, no commits, no branches, no pushes. Read-only, exactly
  like the previous run.
- **Do not comment on the pull request or the issue.** The host posts the revision for you.

## Done

Output the complete revised plan inside a single `<plan>` tag — the whole thing, not a diff
against the last one, since it replaces the pull request description wholesale. Same structure
as before: what changes, files, ordered steps with skills, verification, open questions.

Add a short **What changed since the last plan** section at the top, so the reviewer can see
what you did with their feedback without re-reading everything.

<plan>
… your revised markdown plan …
</plan>

If the feedback makes the issue unplannable — it contradicts itself, or asks for something the
repo cannot do — start the tag with `BLOCKED:` and explain, as before.
