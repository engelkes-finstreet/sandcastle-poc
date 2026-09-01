# Photograph this application, logged in

This is a health check, not a review and not a walkthrough of a change. Nothing was implemented
here and there is no diff to reason about. The question is mechanical:

**Can a container in this repository start the application, log into it, drive a browser to a
page behind the login, and leave a PNG on the host?**

Six things have to work for that, and every one of them breaks silently: the bind mount, the
playwright MCP server, the chromium in this image, the dev server, the login against staging, and
the host reading files back after this container is gone. You are the part in the middle. A
picture of a page that is genuinely broken is still a **pass** — what is being checked is the
camera, not the subject.

## Where you are

- Working directory: !`pwd`
- Branch: !`git rev-parse --abbrev-ref HEAD`
- Screenshot directory: `{{SHOTS_DIR}}` — !`ls -la {{SHOTS_DIR}} 2>&1 | head -3`
- Node and pnpm: !`node --version && pnpm --version`
- Test accounts carried in: !`grep -oE '^[[:space:]]*(export[[:space:]]+)?E2E_TEST_[A-Z0-9_]*' .env.e2e 2>/dev/null | tr -d ' ' | sort -u | grep . || echo 'NONE — no account was carried into this container, so you cannot log in'`

Dependencies are installed. `{{SHOTS_DIR}}` is a directory on the **host**, mounted in, and it is
the only thing that survives this container — anything you save there is read back the moment you
finish, and anything you write anywhere else is deleted with the container.

The application's `.env`, `.env.local` and `.env.e2e` have been written into the worktree for
you. They point at
**staging**, with throwaway accounts. That listing above is the variable *names* the run was given.
Read the values with the shell when you need them; **never print one**, and never put one in a
`<shot>` line or the `<walkthrough>` block.

{{app_guide}}

## Step 1 — start the application

```bash
pnpm dev > /tmp/dev.log 2>&1 &
```

Next is slow to compile the first route on a cold `.next`, so wait for the server rather than
assuming it. This repository has a health endpoint that needs no session:

```bash
for i in $(seq 1 60); do
  curl -sf http://localhost:3000/api/health && break
  sleep 5
done
```

A `{"message":"Server is running"}` means it is up. If sixty attempts pass without one, read
`/tmp/dev.log`, stop, and report what it says — a dev server that will not boot is a **result**
for this check, and a precise one. Do not work around it and do not photograph anything.

## Step 2 — decide what to photograph

Take the roles the guide names, keep the ones whose account variables are in the listing above,
and plan **one shot of that role's landing page each**. Landing pages are the right subject for a
health check: every role has one, the guide says exactly where it is, and getting there proves the
login and the role's routing in one picture.

Then add **one public page** — `/anmelden` is the obvious one — and take it **first**, before any
login. It is the control: if the authenticated shots fail, that picture is what separates "the
browser never worked" from "the browser worked and the login did not", and those are two different
bugs with two different fixes.

If the listing shows no accounts at all, the plan is the public pages alone. Say so, photograph
`/anmelden` and `/passwort-vergessen`, and do not go looking for credentials.

At most **{{MAX_SHOTS}}** screenshots are read back, so stop planning at that many.

## Step 3 — drive the browser

The playwright MCP server is registered for this run and already pointed at the chromium in this
image — you do not need to install a browser or choose one.

Work through the plan one role at a time. For each:

1. **Clear cookies first.** A session survives between navigations, so a second login without
   clearing leaves you on the first role's session, and you photograph the wrong portal with
   nothing to warn you.
2. Log in as the guide describes.
3. Confirm the URL is the landing page the guide names. If you are still on `/anmelden`, the login
   failed — do not photograph the login form and caption it as the landing page.
4. Let the page settle, then take a **full-page** screenshot. Nothing cropped, nothing annotated,
   no device emulation.

Name each file `NN-role-what-it-is.png` — a two-digit order prefix, the role, and the page:

```
{{SHOTS_DIR}}/01-public-login.png
{{SHOTS_DIR}}/02-fsp-admin-members.png
{{SHOTS_DIR}}/03-customer-financing-cases.png
```

**Give the screenshot tool the absolute path, exactly like those.** A bare filename resolves
against the worktree, not against `{{SHOTS_DIR}}`, and a PNG in the worktree is deleted with this
container.

## Step 4 — confirm the files are in `{{SHOTS_DIR}}`

**Do not skip this.** A PNG anywhere else on this filesystem is worth nothing, so check rather
than assume:

```bash
ls -la {{SHOTS_DIR}}
```

Every file you took must be listed there and non-empty. The directory will also hold the server's
own `page-*.yml` and `console-*.log` files; ignore those, they are not yours and the host filters
them out. If a PNG is missing, find where it actually landed, `cp` it in, and run the `ls` again.
If you cannot get a file into that directory at all, say so plainly: that is the single most
useful failure this run can report, and working around it silently would hide it.

## The honesty rules

- **Never save an image of a page you did not load.** No placeholder images, nothing drawn or
  assembled, nothing copied from `public/`. A fabricated PNG makes this check pass while the
  mechanism it checks is broken, which is worse than no check at all.
- **A login that failed is a reportable result, not an obstacle to work around.** Say which role,
  say what the browser did instead, and move on to the next one. One retry at most — accounts lock.
- **A page that fails to load is a reportable result.** Photograph what the browser actually
  showed; an error page is a legitimate shot. Label it with the URL and status you got, not the
  one you aimed at.
- **Never print a credential**, in the log, in a caption, or in the `<walkthrough>` block. Naming
  the role is all any of this needs.
- **Do not commit anything, and do not fix anything.** Not the dev server, not a broken page, not
  a type error you notice on the way past. This run changes nothing.

## Done

One `<shot>` line per file you actually saved, then a `<walkthrough>` block:

```
<shot file="01-public-login.png" url="/anmelden" status="200">The login form, before any session.</shot>
<shot file="02-fsp-admin-members.png" url="/admin/benutzer" status="200">The member list, logged in as the FSP admin.</shot>

<walkthrough>
Photographed the login page, then logged in as the FSP admin and as the customer, clearing cookies
between the two. Both landed on the page the guide names. All three files verified in the shots
directory.

Not reached: the operations portal — E2E_TEST_FSP_EMAIL was not in this container.
</walkthrough>
```

If you took no screenshots, still write the `<walkthrough>` block and say exactly which of the six
links in the chain broke and what it did instead. That block is the whole report when there are no
pictures, and the host prints it.

Then, last of all, the completion signal on its own line — the host treats a run without it as one
that was cut off, however many pictures it took:

<promise>COMPLETE</promise>
