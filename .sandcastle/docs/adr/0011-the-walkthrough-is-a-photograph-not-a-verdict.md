# The walkthrough is a photograph, not a verdict

> **Status: built, and switched off.** The call in `workflow.mts` is commented out beside phase
> 4's, and `prompts/walkthrough.md` still has an unwritten Step 2 where the browser-driving
> instructions go. What comes first is verifying that a simplified flow works end to end through
> Jira on the new infrastructure; a third container per issue — one that boots the application,
> logs into staging and drives a browser — is the largest new moving part in this factory, and
> adding it to the run being established makes a failure in either harder to read. Nothing below
> is retracted by that: what is recorded here is why this phase is shaped the way it is, and the
> section that argued it could ship *ahead* of phase 4 is corrected in place.

The gate this factory holds every implementation to is `tsc --noEmit`, `pnpm lint` and
`pnpm build`. This repository has no unit or integration suite, so that is the whole of it, and
the implementation prompt is honest about what it therefore does not know: nothing here has been
*used*, only compiled. A page that renders its translation keys as `messages.members.title`,
a form whose three fields land on top of each other because a Panda recipe never regenerated, a
route that answers 500 the first time anybody opens it — all three pass the gate. Every one of
them is also obvious in one second to a human looking at the page.

Phase 6 is that second. It runs after the push, logs into staging, drives a browser to the pages
the diff touched, saves a PNG per page, and puts them in the pull request description.

Three decisions in it are worth recording.

## It does not have to be a stranger to be worth anything

`0002-the-code-review-is-a-stranger-and-a-comment.md` is why phase 4 exists and `workflow.mts` is
why it is commented out: watching plan → approve → implement work end to end is easier without a
second agent's opinion landing in the middle of it. Every word of that still holds, and it holds
for this phase too — which is why both are parked, and why this one is parked *behind* the other
rather than instead of it.

What that argument does **not** decide is how this phase has to be built. Phase 4 is a stranger
to the code by construction, and the cost of that is a whole extra session with no context. This
phase needs none of it, and the difference is what each one hands to a human — not a difference
of degree.

A code review is a judgement. Its value depends entirely on whether you can trust the thing that
made it, which is why phase 4 had to be built as a stranger — an agent reading its own session
agrees with itself, and a review that always approves is worse than no review because it looks
like one. All of that machinery exists to make a judgement trustworthy enough to read.

A screenshot is not a judgement. It is a picture of a page, and it is exactly as good taken by
the agent that wrote the code as by anybody else — there is no session to agree with, nothing to
flatter, no finding to soften. The human who opens the pull request reads it in a second and
forms their own opinion, which is the opinion that was always going to decide. There is nothing
here for a human to over-trust, which is why the stranger machinery phase 4 needs would be spent
on nothing here.

That asymmetry is enforced in the code and not just described here. The images come off the
filesystem — `walkPages` in `phases.mts` lists the directory and counts the bytes. What the agent
*says* only ever becomes a caption under a picture that already exists. A shot it claimed and did
not save does not appear; a shot it saved and did not mention appears under its own filename.
The prompt is blunt about the same thing from the other side: photographing a page that is
genuinely broken is a success for the run, and the single way to fail it is to describe a page you
did not load.

The rest of phase 4's shape is kept exactly, because all of it was right for reasons that have
nothing to do with judgement: a fresh session, after the push, read-only, best-effort, no return
value, and unable to fail a run. A commentary on an implementation must never be able to destroy
it. And like phase 4 it must not fail quietly — a description with no screens is
indistinguishable from a walkthrough nobody ran, so every way out of the phase says which it was.

## It goes in the body, not in a comment

Phase 4 posts a comment, and `0002` is right that a comment is the humble place for findings
somebody may ignore. Screenshots go in the description instead.

A comment is a thing said at a moment; the body is what the pull request *is*. It is what
somebody opening this tomorrow reads first, above the conversation, next to the plan the change
was built from — and a picture of the change belongs beside the description of it, not twelve
comments down. So `attachShots` reads the live body, replaces its own marked block and leaves
everything else alone. Read-modify-write rather than rebuild, because a human edits descriptions
too, and a phase that regenerated the body from the plan would quietly delete what they wrote.

The images have to be in the repository for a body to point at them: GitHub has no public API for
uploading one, and the web UI's drag-and-drop is a private endpoint. Hence a branch per issue,
force-pushed as a single orphan commit — `sandcastle/shots/issue-<key>`, beside the issue branch
and emphatically not on it. The diff a human is reading has no business carrying half a megabyte
of PNG. Deleting that branch breaks the pictures in one pull request body and nothing else, which
is the right blast radius for something this disposable. The bounds in `config.mts` are part of
the same trade: every shot is a binary blob committed forever, an agent told to photograph what
changed has no natural stopping point, and anything dropped is named on the pull request rather
than dropped quietly — a body that read as complete coverage of a change it half photographed
would be worse than no body at all.

## It is the one container trusted with the application's own credentials

Every other phase is text against a diff. This one needs a running Next.js app and a login that a
real backend accepts, which means `AUTH_SECRET`, `HMAC_SECRET`, the two API base URLs and a test
user's password all have to reach a container. Nothing else in this factory does that, and
`env.mts` exists to make the equivalent mistake impossible in the other direction: a tracker
credential in `.sandcastle/.env` is fatal at startup, because that file is forwarded into every
container and nothing downstream could tell it had happened.

This is deliberate and it is narrower than it looks. It is a file read at the moment one phase's
container is built — `appEnv` in `sandbox.mts`, reached only through `SandboxNeeds` — so no other
phase's container has these keys in its environment at all, which is a stronger statement than a
phase that holds them and does not read them. The rule that actually mattered is kept intact: no
tracker credential, ever. The walkthrough talks to the application and cannot reach GitHub or
Jira any more than the reviewer can.

What makes it acceptable is the nature of the values rather than the plumbing around them. They
are staging, throwaway and rotatable. Nothing enforces that but the comment on `appEnv` and this
paragraph: a production value in `.env` would turn every walkthrough container into a place
production credentials have been, and the plumbing would not notice.

## The gap this leaves

Every other moment in `notify.mts` speaks to Slack and to Watchtower together, deliberately, so
that the conversation and the record cannot drift. This one speaks only to Slack. The event
catalog is a closed union in `@finstreet/watchtower-golem/events` and has no `walkthrough.*` in
it, and asserting past the type to reuse a neighbouring event would be worse than the silence —
the api validates server-side, and a screenshot filed as a code review is a lie a dashboard would
go on repeating. Closing it is two schemas in that package and two `tell` calls here. Until then
Watchtower's timeline for an issue jumps from the implementation to the merge with no sign this
phase ran, which is worth knowing when reading one.
