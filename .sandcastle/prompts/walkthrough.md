# Photograph the change made for issue {{ISSUE_REF}}: {{ISSUE_TITLE}}

Another agent planned this work, a human approved the plan, and a third run implemented it and
pushed it. The gate it passed — {{gate_commands}} — proves the code holds
together. It proves nothing at all about what the pages look like, because nothing has ever
loaded one.

**Your whole job is to load them and take pictures.** Log into the running application, walk to
the pages this change touched, and save a screenshot of each. That is the deliverable: image
files. Not a verdict, not a review, not a fix.

That distinction is the point of this run, so it is worth being blunt about. Nobody downstream
is going to act on your opinion of the code — a human looks at your screenshots and forms their
own. So a screenshot of a page that is genuinely broken is a **success** for this run, and the
one thing that would make it a failure is describing a page you did not actually load.

## Where you are

- Working directory: !`pwd`
- Branch: !`git rev-parse --abbrev-ref HEAD`
- Commits in this change: !`git log --oneline {{BASE}}..HEAD`
- Files changed: !`git diff --stat {{BASE}}...HEAD`
- Screenshot directory: `{{SHOTS_DIR}}` — !`ls -la {{SHOTS_DIR}} 2>&1 | head -3`

Dependencies are installed and the repo's skills and `finstreet-mcp` tools are available. This
container is thrown away when you exit, and `{{SHOTS_DIR}}` is the **only** thing that survives
it: it is a directory on the host, mounted in. Anything you save there is read back by the host
the moment you finish; anything you write anywhere else is deleted with the container.

The application's own environment — `.env`, `.env.local` and `.env.e2e` — has been written into
the worktree
for you. It points at **staging**, with throwaway test logins. That is the one thing this phase
is trusted with that no other phase is. Read a credential with the shell when you need it and
**never print one** — not in the log, not in a caption, not in the `<walkthrough>` block. Naming
the role you logged in as is all any of this needs.

The accounts this container was actually given, by variable name:

!`grep -oE '^[[:space:]]*(export[[:space:]]+)?E2E_TEST_[A-Z0-9_]*' .env.e2e 2>/dev/null | tr -d ' ' | sort -u | grep . || echo 'NONE — no account was carried into this container, so you cannot log in'`

{{app_guide}}

## What was asked for

The issue and the approved plan are below. You are not judging the code against them — you are
using them to work out **which pages are worth photographing**. A change that adds a members
list means somebody wants to see the members list.

### The issue as filed

{{ISSUE_TEXT}}

### The approved plan

{{PLAN}}

## Step 1 — decide what to photograph

Work it out from the diff, not from the plan's prose. `git diff --stat {{BASE}}...HEAD` names the
files; the routes are what matter.

- Files under `src/app/` are routes. A new or changed `page.tsx` is a page you can navigate to,
  and its directory path is its URL — read `src/routes.ts` rather than assembling a path by hand,
  because that file is where this repo's URLs actually live.
- A changed component under `src/features/` or `src/shared/` is not a page. Find the page that
  renders it and photograph that.
- A changed form or modal usually needs two shots to say anything: the page with it closed, and
  the page with it open.
- Nothing visual in the diff — a `secure-fetch` request, a type, a config — means there may be
  nothing to photograph. That is a legitimate finding. Say so and stop; do not go hunting for an
  unrelated page to fill the quota.

At most **{{MAX_SHOTS}}** screenshots reach the pull request, and the host drops the rest, so
choose before you start rather than photographing everything and hoping. Pick the pages a human
reviewing this change would actually want to see.

## Step 2 — drive the browser

### Start the application

```bash
pnpm dev > /tmp/dev.log 2>&1 &
```

Next compiles the first route on a cold `.next`, which is slow, so wait for the server rather
than assuming it. The health endpoint needs no session:

```bash
for i in $(seq 1 60); do
  curl -sf http://localhost:3000/api/health && break
  sleep 5
done
```

A `{"message":"Server is running"}` means it is up. If sixty attempts pass without one, read
`/tmp/dev.log` and stop. **A dev server that will not boot on this branch is one of the most
valuable things this phase can report** — it is a failure the gate cannot catch, because
`pnpm build` compiles the app without ever running it. Say what the log said, take no
screenshots, and skip to **Done**.

### Log in

The playwright MCP server is registered for this run and already pointed at the chromium in this
image — you do not need to install a browser or choose one. Everything here is a browser action
against `http://localhost:3000`: this is not the Playwright test suite, and the page objects
under `e2e/` are not available to you, though they are worth reading as documentation of a flow.

The guide above says which role sees the pages you picked in Step 1, and how a login is done in
this application. Follow it. Two things it cannot tell you, which apply every time:

- **Clear cookies before each login.** The session survives between navigations, so logging in as
  a second role without clearing leaves you on the first one's session — and you photograph the
  wrong portal with nothing to warn you.
- **Confirm where you landed before you photograph.** A successful login redirects. If you are
  still on the login page, it failed, and photographing that page as if it were the feature is
  the one thing this phase must never do.

If a login fails, that is a **reportable result and not an obstacle to work around**. Say which
role, say what the browser did instead, and carry on with what you can still reach. **One retry
at most** — these are shared accounts and repeated failures lock them for everybody. Do not try
another role's credentials, and do not go looking for a password in the repository.

### Take the pictures

Full-page screenshots of each page you chose in Step 1, in the order a human should read them.
Nothing cropped, nothing annotated, no device emulation.

A modal or a drawer usually needs the page behind it as well — closed, then open — because the
question a reviewer is asking is what changed, and one picture of an open modal does not answer
it.

Wait for the page to settle before each shot. A screenshot taken mid-load is a picture of a
spinner, it is indistinguishable from a broken page, and it will be read as one.

## Step 3 — save the screenshots

One PNG per shot, into `{{SHOTS_DIR}}`, named `NN-what-it-is.png` — a two-digit order prefix and
a short slug:

```
{{SHOTS_DIR}}/01-members-list-empty.png
{{SHOTS_DIR}}/02-invite-modal-open.png
```

The prefix is the order a human should look at them in, and it is the order the pull request will
show them in. Full-page shots of the viewport, nothing cropped, nothing annotated.

Then, for each file you saved, one `<shot>` line — see **Done**.

### The honesty rules, which matter more than the coverage

- **Never save an image of a page you did not load.** No placeholders, no re-used shots, nothing
  drawn or assembled.
- **A login that failed is a reportable result, not an obstacle to work around.** If you cannot
  get in, do not photograph the login page and caption it as the feature. Say you could not log
  in, and say what it did instead.
- **Report the URL and the status you actually got.** A `404` or a `500` gets photographed and
  labelled `404` or `500`. A page that redirected you somewhere else gets labelled with where you
  actually ended up, not where you were aiming.
- **An empty state is a real answer.** If the page renders but has no data on staging, photograph
  the empty state and say that is what it is. Do not go and create data to make it look better.
- **Do not describe what you cannot show.** If a shot did not save, its `<shot>` line does not
  exist. Words about a missing picture are worse than the missing picture.

## Rules

- **Change nothing that git can see.** No edits to tracked files, no new tracked files, no
  commits, no branches, no pushes. `{{SHOTS_DIR}}` is outside the repository, which is why it is
  where your output goes. A commit you make here is stranded on a branch the host has already
  pushed, and it will be reported as a warning against this run.
- **Fix nothing.** You will probably find something broken — that is a large part of why this
  phase exists. Photograph it, caption it plainly, and leave it. A fix from here would land on a
  pull request a human has already been told is ready.
- **Do not run the gate.** {{gate_commands}} were green before this run
  started. You need a running app, not a re-verified one.
- **Do not talk to GitHub or the tracker.** This container has no credential for either, by
  design. The host puts your screenshots on the pull request.
- **Do not print the value of any token, secret or password**, including the test login's. Saying
  which role you logged in as is all any of this needs.

## Done

First one `<shot>` line per saved file, then one `<walkthrough>` block of prose. Both go to
stdout; the host reads the files off disk and uses these only to caption them.

<shot file="01-members-list-empty.png" url="/admin/members" status="200">The members list before
an invite — one row for the logged-in admin.</shot>
<shot file="02-invite-modal-open.png" url="/admin/members" status="200">The invite modal, with the
new role field this change adds.</shot>

<walkthrough>
Logged in as the FSP admin and walked to the two pages this change touches. Both rendered; the
new role field appears in the modal and is required as the plan describes.

Not reached: the confirmation screen after submitting, which needs a real invitation email.
</walkthrough>

Three things about that skeleton:

- The filenames in the `<shot>` lines must be files that exist in `{{SHOTS_DIR}}`. A line naming
  a file you did not save is dropped, and a file you saved without a line goes up with no caption.
- `url` and `status` are what you observed. Leave an attribute out rather than guessing it.
- The `<walkthrough>` block is **prose only** — it is published verbatim in the pull request
  description, underneath the images. Put no `<shot>` lines inside it. It should say who you
  logged in as, what you walked, and — the most valuable sentence in it — what you could **not**
  reach and why.
