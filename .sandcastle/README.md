# Sandcastle

An autonomous coding agent for this repo, running in a Docker container.
[Sandcastle](https://github.com/mattpocock/sandcastle) provides the sandbox; everything in
this directory is the wiring around it.

`src/main.mts` is the watcher: a long-running host process that turns
`Sandcastle`-labelled GitHub issues into pull requests, stops for review at two points, and
acts on what you say at both. It runs **one agent at a time but tracks as many issues as it
has state for**, so nothing waits on you. It never merges.

```
pnpm sandcastle:build-image   # once, and after any Dockerfile change
pnpm sandcastle               # start watching — Ctrl-C to stop
pnpm sandcastle:smoke         # health-check the sandbox itself
```

## What one issue looks like

```
poll GitHub every 2 minutes for open issues labelled `Sandcastle`
   ↓  oldest first
post to Slack: "🏰 Planning #n"   ← every later message threads under this one
   ↓
PHASE 1 · container: the agent runs the `kickoff` skill; its task list IS the plan. No code.
   ↓  the plan comes back through an <plan> tag, not a file
host: one empty commit, git push, gh pr create --draft   ← your credentials, not the sandbox's
   ↓  the plan IS the pull request description
label swap → `Sandcastle:awaiting-approval`, state written to state/issue-n.json
   ↓
PHASE 2 · you read the plan and comment on the pull request
   ↓  no container is alive here; this can take days, and the watcher can restart
comment `approve` ─────────────→ PHASE 3   ← notes in that comment override the plan
comment `abandon` ─────────────→ stop, PR left for you to delete
anything else ─→ nothing changes; the watcher says so on the PR and keeps waiting
   ↓
PHASE 3 · container: a FRESH session — the approved plan is the whole brief — implements,
   ↓  runs the gate, commits
   ↓  it commits; it cannot push (SSH remote, no key in the container)
host: git push, gh pr ready, comment with the commits and how to test it locally
   ↓
PHASE 4 · container: a FRESH session — no memory of the plan or the code — reviews the diff
   ↓  complexity, this repo's standards, and each part against the skill it should have used
host: comment with the findings and a verdict   ← it reviews, it never fixes
   ↓  ⚠ SWITCHED OFF right now. See below
label swap → `Sandcastle:awaiting-revision`, both watermarks reset
   ↓
PHASE 5 · you read the shipped code and comment on the pull request
   ↓  no container is alive here either; the watcher is off servicing other issues
comment `revise` ──────────────→ a FRESH session gets the diff and everything you have
   ↓                              said since the last run, and changes what you asked for
comment `abandon` ─────────────→ stop tracking; the code stays where it is
anything else ─→ nothing changes; the watcher says so on the PR and keeps waiting
   ↓  three rounds, then the watcher says so and lets go
you merge or close the pull request   ← the only thing that ends an issue
```

**Nothing above is a pause.** While one issue sits in phase 2 or phase 5, the watcher is
planning the next issue, implementing a third and answering a comment on a fourth — one run at a
time, in issue order, tracked issues before new ones. See
`docs/adr/0006-a-shipped-pull-request-still-listens.md`.

Branches are named `sandcastle/issue-<n>` and cut from `origin/main`. Pull requests carry
`Closes #<n>`, so the issue closes when you merge.

## Files

```
.sandcastle/
├── src/          the watcher: TypeScript the host runs
├── prompts/      what the agent is told, one file per phase
├── docs/adr/     why it behaves the way it does
├── Dockerfile    the image every run starts from
├── .env          secrets, gitignored — see below
└── logs/ worktrees/ state/ watchtower/    per-run output, gitignored
```

Two things live in `.sandcastle` and only two: **code that runs on your machine** (`src/`) and
**prose the agent reads** (`prompts/`). If you are changing what the agent *does*, you are in
`prompts/`; if you are changing what happens *around* it, you are in `src/`.

### `src/` — read it in this order

| File | |
|---|---|
| `main.mts` | the entry point: the banner, the orphan check, and the scheduler. Nothing else |
| `workflow.mts` | the state machine — what to do with a new issue, and with anything you say on its pull request |
| `phases.mts` | the agent runs, and how a container is configured for them |
| `github.mts` | issues, labels, comments, and the draft pull request that carries the plan |
| `notify.mts` | every message the watcher sends, in the order a run sends them — Slack and Watchtower both |
| `state.mts` | `state/issue-<n>.json`, one per tracked issue — what survives a restart during review |
| `config.mts` | every knob, every path, every marker. Start here |
| `types.mts` | the shapes that travel between the modules, `Tracked` above all |
| `shell.mts` | `git`, `gh`, and the timestamped log line |
| `shutdown.mts` | Ctrl-C, and the sleep that returns early for it |
| `sandbox.mts` | store mount, `.npmrc` injection, plugin install and startup commands, shared with the smoke test |
| `slack.mts` | the transport: `chat.postMessage` over a bot token |
| `watchtower.mts` | the other transport: the dashboard's event emitter, the identifiers, and the heartbeat |
| `smoke.mts` | the health check — `pnpm sandcastle:smoke` |

### `prompts/` — one per run

| File | |
|---|---|
| `plan-issue.md` | phase 1: read the issue, run `kickoff`, return its task list as the plan, change nothing |
| `implement-plan.md` | phase 3: build the approved plan, and say how to test it by hand |
| `follow-up.md` | phase 5: make the change a human asked for on a shipped diff, and nothing else |
| `code-review.md` | phase 4: read the pushed diff and report on it, in a session that did not write it. Switched off — see below |
| `smoke-test.md` | eleven checks proving the sandbox works at all |

A prompt is loaded from disk on every run, so editing one changes the next run with no restart.
`{{PLACEHOLDER}}` values are filled in by `phases.mts`; a placeholder with no matching
`promptArgs` key reaches the agent as literal text, which is the usual cause of a run that
ignores something you thought you told it.

## Setup

**1. Build the image.** `pnpm sandcastle:build-image`. Takes a couple of minutes; the result is
~525MB and holds no application dependencies — those arrive per run from the mounted pnpm store.

> The sandcastle CLI swallows each build step's stderr, so a failure can look like success.
> When something breaks, get the real error from `docker build --progress=plain .sandcastle`.

**2. Fill in `.sandcastle/.env`** (gitignored, never commit it):

| Key | |
|---|---|
| `CLAUDE_CODE_OAUTH_TOKEN` | from `claude setup-token` on your host — lets the agent use your subscription |
| `GH_TOKEN` | fine-grained PAT, Issues read/write + Metadata read. Used *inside* the container to read issues |
| `SLACK_BOT_TOKEN` | optional, `xoxb-…`, from a Slack app with the `chat:write` bot scope |
| `SLACK_CHANNEL` | optional, the channel ID (`C0123…`) — the bot must be invited to it |
| `SLACK_MENTION` | optional, your Slack **member ID** (`U0123…`) — who gets @-mentioned when it is your turn. A user group (`S0123…`) or the literal `here`/`channel` also work |
| `WATCHTOWER_URL` | optional, the Watchtower api's origin (`https://…`) — both this and the key come from its settings page |
| `WATCHTOWER_API_KEY` | optional, `wt_…`, this repository's Project key. Shown once, at creation, and stored only as a hash |
| `NPM_AUTH_TOKEN` | GitHub Packages token (`read:packages`) for `@finstreet/*` — `pnpm install` in the container 401s without it |
| `FINSTREET_MCP_TOKEN` | bearer token for the `finstreet-mcp` server the `finstreet-fe` plugin carries — without it the server is configured but never connects |

Every key in this file is forwarded into the container. A key listed with an **empty value**
falls back to the host shell's value, so `NPM_AUTH_TOKEN=` is enough when your `~/.zshrc`
already exports it — the secret then lives in one place. A key that is *absent* from the file
is not forwarded at all, whatever the shell says.

Slack is optional; without it the watcher logs `Slack notifications off` and runs normally. So is
Watchtower — see below.

### What the Slack thread looks like

One top-level post per issue; everything else replies under it, so the channel keeps one entry
per issue however long the review takes. Each update ends with the links that matter *for that
step* — the point is never having to hunt for the right tab:

| Update | Links it carries | Pings you |
|---|---|---|
| 🏰 Planning #n | the issue | |
| 🏰 Plan posted, waiting for you | the plan (PR description), where to reply, the log | **yes** |
| 🏰 Plan approved — implementing now | your approval comment, the plan, the log | |
| 🏰 Done — ready for your review | files changed, the comment telling you how to test it, the log | **yes** |
| ✅ / 🔍 / ⚠️ Code review: clean / nits / concerns | the review comment, files changed, the log — *off right now* | |
| 🏰 Change requested by *you* — working on it | your request, files changed, the log | |
| 🏰 Change made — back to you | files changed, how to check it, the log, and how many rounds are left | **yes** |
| ✋ Out of follow-up rounds | the comment that says so, files changed | **yes** |
| ✅ Merged / 🚫 Closed | the pull request and the issue | |

The unhappy paths post too — planning failed, blocked at planning, abandoned, and the
`blocked` / `no-signal` / `no-changes` outcomes — each linking the comment that explains itself.
All of those ping you, because every one of them ends with something only you can do. A Slack
failure never fails a run: `notifySlack` swallows its own errors and the watcher logs a warning,
because a missing notification is not a reason to lose an implementation.

Each issue gets **one thread**: a top-level "Working on #n" message when it is picked up, then
the outcome and the merged/closed notice as replies under it. **Every message is a step, not a
sign of life.** There is no progress heartbeat — an agent's tool calls forwarded into a channel
are a transcript nobody reads, and they push the message that actually needs answering off the
screen. Between "planning" and "plan posted" the thread is quiet on purpose; `tail -f` the log
if you want to watch it work.

### A ping means it is your turn

Slack treats a thread reply as a quieter thing than the message that started it: replies under a
thread you are not following raise no badge and no push. That is fine for most of what the
watcher says — and exactly wrong for the two or three messages that are the whole reason you are
in the channel.

So the messages split in two, and the line is **whose turn it is**, not how important the news
is. `notifySlack` is a step. `notifyAsk` is a *stop* — the factory has run out of things it can
do without you — and it @-mentions `SLACK_MENTION`, because a mention is the one thing Slack
reliably turns into a notification even under a thread nobody is following.

That mention is the *only* difference. Everything the watcher says about an issue stays in that
issue's thread, asks included — a copy in the channel adds nothing the mention has not already
delivered, and it puts the message that needs answering away from the conversation it belongs to.

"Plan posted" asks. "Implementing now" does not. A run that came back `blocked` asks, because
somebody has to re-label the issue; a pull request that got merged does not, because the person
reading that message is the one who merged it. `grep notifyAsk src/notify.mts` is the whole list,
and it should stay short — every message added to it makes the rest quieter, and then the one
that mattered gets muted along with them. That is the same argument that removed the progress
heartbeat.

`SLACK_MENTION` must be an **ID**, not a name. `@patrick` in message text is plain text to Slack:
it renders looking exactly like a mention and notifies nobody. Copy your member ID from your
Slack profile (**⋮ → Copy member ID**). The watcher prints what it resolved at startup —
`Pinging <@U0123…> on every message that needs a human` — and says so loudly when the value is
not an ID, because that is the one misconfiguration the messages themselves look right under.
Leave it unset and the asks still post in the thread; they just address nobody.

### Watchtower — the same moments, on a dashboard

Slack is a conversation: one thread per issue, and you read it as it happens. [Watchtower]
answers the question a channel cannot — *what is every issue in every repository doing right
now, and whose turn is it?* — as a board, a timeline per issue, and a "Needs you" strip. It is a
second sink fed from the same list of moments, not a second source of truth.

It is off until you onboard this repository, and off means off: no directory, no log line, no
way to tell the package is installed.

**Onboarding.** On Watchtower's `/settings/projects`, create a Project for this repository. It
mints an API key, shows it exactly once, and gives you two lines. Paste them into
`.sandcastle/.env` and restart the watcher:

```
WATCHTOWER_URL=http://localhost:3101
WATCHTOWER_API_KEY=wt_…
```

The startup banner then says `Watchtower on (→ …/v1/events)`, or `off — …` naming which half is
missing. There is no backfill: the watcher's startup sync reports whatever it currently has a
state file for, so the board arrives already holding this morning's pull requests.

**What it costs a run: nothing that matters.** The emitter never throws. A Watchtower that is
*down* refuses the connection instantly and costs nothing measurable; one that *hangs* costs five
seconds per message, and a failed send buys a 30-second cooldown so messages sent back to back
pay it once — the phases between them are minutes long, so the six asks in a run each pay their
own. Either way it is logged once per outage, not once per message. Events are written to
`.sandcastle/watchtower/` before they are sent and drain on the next tick, so a network blip
loses nothing. What is at stake when it fails is a card being briefly wrong, never a run.

**One thing it remembers that the factory does not.** A re-labelled issue is planned from scratch
as the *next attempt* of the same task, and the watcher cannot know that — its state file was
deleted when the last attempt ended. So `watchtower.mts` keeps a counter in
`.sandcastle/watchtower/generations.json`, bumped once per plan. Delete that directory and
attempts count from 1 again, which Watchtower will decline as a step backwards until a fresh
plan counts past it.

[Watchtower]: https://github.com/finstreet/watchtower

**3. Check the sandbox.** `pnpm sandcastle:smoke` — repo readable, writes land, dependencies
install as Linux binaries, and `tsc --noEmit` / `pnpm lint` / `pnpm build` all pass. Do this
before blaming the agent for anything.

**4. Label an issue** `Sandcastle` and start the watcher.

## Configuration

Environment variables, all optional:

| | Default | |
|---|---|---|
| `SANDCASTLE_BASE` | `origin/main` | what branches are cut from, and what PRs target |
| `SANDCASTLE_POLL_SECONDS` | `120` | how often to check GitHub. One `gh pr view` per tracked issue per poll |
| `SANDCASTLE_MODEL` | `opus` | passed to Claude Code as `--model` for planning and implementing |
| `SANDCASTLE_REVIEW_MODEL` | `sonnet` | the model phase 4 reviews on, when phase 4 is on |
| `SLACK_BOT_TOKEN`, `SLACK_CHANNEL`, `SLACK_MENTION` | — | override `.env` |
| `WATCHTOWER_URL`, `WATCHTOWER_API_KEY` | — | override `.env` |

## Outcomes

**Phase 1** ends the issue's turn in one of two ways. Either a draft pull request exists and the
issue now wears `Sandcastle:awaiting-approval`, or the label comes off with a comment saying
why — the agent declined to plan (`BLOCKED:`), or the run itself failed. Re-add the label to
ask for another attempt.

**Phase 3** ends in exactly one of these, each reported as a comment on the pull request:

| | | Still tracked? |
|---|---|---|
| `shipped` | Agent signalled `COMPLETE` and committed. PR marked ready for review, with testing instructions. | yes → phase 5 |
| `blocked` | Agent signalled `BLOCKED` — the plan did not survive contact with the code. PR stays a draft. | no |
| `no-signal` | Run died: idle timeout, crash, or a host-side failure. Nothing pushed. | no |
| `no-changes` | Agent said done but committed nothing. | no |

In every case except `shipped` the `Sandcastle:awaiting-approval` label comes off and the state
file is deleted, so the watcher stops rather than re-reading an approval it already acted on.
Starting over means re-adding the **`Sandcastle`** label, which plans from scratch — an approved
plan is not retried on its own, because whatever broke the first attempt is still there.

On `shipped`, the label becomes `Sandcastle:awaiting-revision` and the state file stays. That is
what lets phase 5 exist.

**Phase 5** ends the same four ways, and the issue stays tracked through all of them — a
follow-up that failed should not take your pull request off the watcher's books:

| | | Round spent? |
|---|---|---|
| `shipped` | The change was made, gated and pushed on top of what you reviewed. | yes |
| `no-changes` | The agent read the request and deliberately changed nothing — it was a question, or the code already did it. Its answer is the comment. | yes |
| `blocked` | It could not do what was asked. **Nothing is pushed, so the PR is exactly as you reviewed it.** | yes |
| `no-signal` | The run died. Nothing pushed. | yes |

Every ending spends a round, or a pull request could never run out of them. After three, the
watcher says so on the pull request and stops tracking the issue — the second of only two ways
an issue's life ends. The other is you merging or closing it.

One asymmetry, and it is deliberate: on `shipped` and `no-changes` the watcher marks your
comments as acted on, but on `blocked` and `no-signal` it does not. A run that achieved nothing
consumed nothing, so the notes that led to it are still in the payload of your next `revise`
rather than having to be typed again.

### A dead run does not take its work with it

In every case except `shipped`, the host commits whatever the agent left uncommitted in its
worktree as one `wip(#n)` commit on the issue branch, and says so in the pull request comment and
in Slack. The 2GB worktree is still deleted before the next run; the work in it is not.

This is possible because of where that work actually is. The worktree is a git worktree of this
repo, bind-mounted into the container, so the agent's files land on host disk as it writes them
and the branch is an ordinary local branch — committing them needs neither the container (deleted
when the run ended) nor the network (a commit writes objects and moves a local ref). A run that
died *because* the connection dropped can therefore still have its work saved, and saved later:
`rescueLeftovers()` runs at startup too, which is what covers a Ctrl-C, a `kill`, a closed laptop
or a crashed host, where nothing in `workflow.mts` ever got to report anything.

What survives is the *files*, never the session — Claude Code ran inside the container and its
JSONL died with it. A `wip` commit is unverified by construction: the gate runs before the
agent's own commit, so anything the host rescues never reached it. Treat it as a starting point
for the next attempt, which is exactly how `prompts/implement-plan.md` tells the next agent to
treat it. `git log sandcastle/issue-<n>` finds it; `git show` reads it.

**The host never pushes it — but that is not the same as it never being pushed.** A `wip` commit
sits on an ordinary branch, so the next run that succeeds on that branch pushes it along with
its own work, and it turns up in the diff on the pull request. The comment and the Slack line say
so, because a `git log` on a pull request under review would find it out either way. If you would
rather it never appeared, `git reset --hard origin/sandcastle/issue-<n>` on the host before the
next round.

### Phase 4 is switched off

Nothing reviews the diff for you right now: after phase 3 the pull request is pushed, ready, and
read by nobody but you (though phase 5 will act on what you say about it). The reviewer is written and wired — `prompts/code-review.md`, `reviewCode` in
`phases.mts`, `codeReview` in `workflow.mts`, the Slack wording in `notify.mts` — but its single
call site is commented out.

That is deliberate for the first runs. What those are for is watching plan → approve →
implement work end to end, and a reviewer posting its own comment in the middle of that is one
more thing to read while you are still deciding whether the part you care about worked. It also
doubles the container time per issue before anyone has seen the first pull request.

**To turn it on, uncomment two lines:**

| | |
|---|---|
| `src/workflow.mts` | `await codeReview(shipped);` in `implement`, under the `phase 4, switched off for now` banner |
| `src/notify.mts` | in `announceAttempt`, prefix the `revise` line with the sentence commented above it |

Both are commented in place with that instruction, so neither is findable only from here.

**Phase 4**, once on, only happens after `shipped`, and ends in one of four ways, three of which
are a comment on the pull request:

| | |
|---|---|
| `CLEAN` | Nothing to change. |
| `NITS` | Worth reading before you merge; nothing blocking. |
| `CONCERNS` | At least one finding a human should decide on before merging. |
| no review | The run failed, timed out, or came back without a `<review>` block. Said out loud in Slack rather than swallowed — silence would be indistinguishable from `CLEAN`. |

None of them change what happens next. The pull request is already pushed and ready either way,
and the findings are yours to act on or ignore. A verdict is not a gate, and **the reviewer has
no path into phase 5**: its comments carry the `<!-- sandcastle -->` marker, so `decide` cannot
read them as a change request. Switching phase 4 on cannot turn phase 5 into an agent reviewing
and then fixing itself — the line `docs/adr/0002-…` drew and `0006` keeps.

**How you review a plan.** Comment on the pull request. `approve`, `approved`, `lgtm`,
`ship it`, `go ahead`, `looks good` or 👍 at the *start* of the comment means build it. `abandon`,
`reject`, `cancel` or `stop` means give up. Those two are the only things read here.

**Corrections ride along with the approval.** Everything after the approval word is passed to
the implementation run as `{{APPROVAL}}`, and the prompt tells it that a nudge, a preference or
a "yes, but" overrides the plan on that point. `approve, but use the shared ConfirmationModal`
is a complete review. Anything larger than a clause is a different plan: `abandon` and re-add
the **`Sandcastle`** label to plan it again from scratch, in a fresh container that reads your
comments on the issue as ordinary context.

**Any other comment changes nothing.** The watcher posts one reply saying so and goes back to
waiting, and it moves its *replied* clock past your comment so it does not repeat itself every
poll. There is no revision run on a **plan** — see
`docs/adr/0003-there-is-no-revision-run.md`.

**How you ask for a change to shipped code.** Comment on the pull request again. `revise`,
`rework` or `changes requested` at the *start* of the comment spends a follow-up round;
`abandon` stops the watcher tracking it. Everything else gets one reply and changes nothing —
same as phase 2.

You do not have to say it all in one comment. `revise` is handed **every non-bot comment since
the last run**, so the natural rhythm works: *"remove the guard"*, then *"also rename the
helper"*, then `revise`. The trigger word alone is enough; what it carries is the conversation.

That is why there are two clocks, not one. The *replied* clock stops the one-reply nudge
repeating itself; the *serviced* clock decides what a run is handed. A reply must never consume a
comment, or `revise` would fire with an empty payload — see
`docs/adr/0006-a-shipped-pull-request-still-listens.md`.

Both are set from the timestamp GitHub gives the comment that moved them, never from the host's
clock when a run finished. So a comment you write *while* a container is running is still newer
than either clock when the run ends: it gets read on the next poll, and answered or acted on like
any other. Setting them to "now" would have swallowed it — no reply, no round, no trace.

**A comment on a specific line of the diff triggers nothing.** Inline review comments and
GitHub review submissions are not in the payload `gh pr view --json comments` returns, so the
watcher never sees them. Ordinary pull request comments are what it reads. This is a known
limitation, not a bug.

The watcher ignores its own comments by an HTML marker (`<!-- sandcastle -->`), because the pull
request is opened with your credentials — by author it cannot tell itself from you.

## Day to day

**Logs.** One file per run under `logs/`, named after the branch. The watcher prints the
path when the run ends; issue comments quote it too.

**Stopping.** Ctrl-C in the foreground. It finishes the current step and exits — press
again to kill it. Backgrounded, send the signal to `tsx`, not to `pnpm`:

```sh
node_modules/.bin/tsx .sandcastle/src/main.mts > watcher.log 2>&1 &
kill -INT %1
```

pnpm does not forward a signal sent to it alone, so `kill` on the pnpm pid leaves the
watcher running.

**Disk.** Each run's worktree carries a ~2GB `node_modules`. Sandcastle removes it when the
agent left nothing uncommitted; the watcher clears any leftovers before starting the next
issue, so at most one sits around. Nothing is cleared before its contents are committed — the
rescue described under *Outcomes* runs first, so deleting a worktree can never delete work. The
pnpm store at `~/.cache/sandcastle-pnpm-store` grows to ~2GB once and is then reused — deleting
it just means the next run re-downloads.

**Branches.** Merged `sandcastle/issue-<n>` branches are not deleted locally. `git branch
--merged main | grep sandcastle/` finds them.

## Why it is built this way

**The agent commits; the host pushes.** `origin` is an SSH remote and the container has no
key, so pushing from inside is impossible. It turns out to be the better split anyway:
branch and PR decisions stay on the side of the fence that has your credentials, and the
container's GitHub token stays scoped to reading issues. It works because Sandcastle
bind-mounts the real `.git` into the container — a commit made in the sandbox is a commit
in your repo, and survives the container and the worktree.

**A human approves the plan, and nothing else crosses the gap.** The expensive mistake is not
a bad line of code, it is a container that spends twenty minutes building the wrong thing
confidently. So phase 1 returns a plan and nothing else, and you approve it on a pull request.

The two phases are two containers, because keeping one alive across a human review is the wrong
shape — `idleTimeoutSeconds` exists to kill a silent agent, and an idle container burning hours
waiting for a comment is worse than no container. **The only thing that crosses the gap is
text.** Phase 3 starts a fresh session and is handed the issue, the approved plan and the repo's
skills. No conversation is resumed, no session id is stored, nothing depends on the host that
planned — see `docs/adr/0004-the-implementation-run-starts-fresh.md`.

That is what makes `state/issue-<n>.json` disposable: the plan *is* the pull request
description, so an approval acted on from a different machine, or after that file is deleted,
builds exactly the same thing.

**The reviewer must not be the author.** Phase 4 is a fresh session for a second reason on top
of cost: an agent handed its own conversation agrees with itself, and a review that always
approves is worse than no review, because it looks like one. So the reviewer gets the diff, the
approved plan and the repo's skills, and nothing else. It reads the code the way you would:
cold.

It runs on `sonnet` rather than `opus`, and that is not only about cost. Reviewing is a bounded
reading task against a diff that already compiles, and the judgement it needs is in the skills
rather than in the model. A review that costs a fraction of the implementation is a review
nobody is tempted to switch off.

**The review runs after the push, and changes nothing.** It would be tempting to put phase 4
between the commits and the remote and let it block a bad diff. That trade is bad twice over:
every timeout, crash or malformed tag in the reviewer would turn finished work into a lost pull
request, and a verdict nobody can override is a gate an agent controls. So the branch is pushed
and the pull request is ready *before* the reviewer starts, the findings land as a comment, and
what to do about them is yours. There is no fix loop: an agent that reviews its own work and then
acts on its own review is a loop with no human in it. Phase 5 is the other thing — it runs
because *you* typed `revise`, and it is handed what you wrote.

Because none of it is load-bearing, every failure in phase 4 is best-effort and *loud*: the
review says in Slack that it did not happen. Silence would be indistinguishable from a clean
review, which is the single wrong impression this phase must never leave.

**One run at a time, many issues in flight.** The watcher never blocks on a person. It holds
every issue that has a state file, services whichever one has something to act on — tracked
issues before new ones, oldest first — and only sleeps when none of them did.

What it will not do is run two containers at once, and the reason is not caution. The waits here
are *days* (you, reading) and the runs are *minutes*, so parallelism buys almost nothing; and git
refuses to check one branch out in two worktrees, because `HEAD` would be ambiguous. Serialising
runs sidesteps that entirely — `clearLeftoverWorktrees()` can keep deleting every worktree before
a run, because under one slot none of them is ever live.

Interleaving costs nothing extra, either, because there is no persistent checkout to switch.
Every run gets a *fresh* worktree (`git worktree add` on the existing branch) and it is destroyed
afterwards; the branch is what persists, as a local ref plus `origin` once phase 3 has pushed.
Issue #4's follow-up and issue #7's plan are the same operation to that layer. The per-run cost
is a `pnpm install` into a ~2GB tree — per *run*, not per issue, so N interleaved issues cost
what N sequential runs cost.

Branches are still cut from `origin/main` at the moment their issue is picked up, so two issues
started a week apart start from different commits. Nothing reconciles them: a conflict is a
human's call on a pull request they already have open, and a follow-up run never touches the
base. It will fast-forward its own branch from `origin` if you have pushed to it yourself, and
that is the only history it moves.

**The host carries `.npmrc` in.** It is gitignored, and a worktree is a checkout of committed
history, so the container would otherwise install without the `@finstreet` auth line and fail
on a 401 minutes in. `src/sandbox.mts` reads the host's copy and a startup command writes it into
the worktree. The file holds no secret — only a `${NPM_AUTH_TOKEN}` reference, expanded inside
the container from `.sandcastle/.env`.

**Plugins are installed per run, from `.claude/settings.json`.** That file is tracked, so the
worktree already declares which plugins this repo wants — but declaring is not installing.
A fresh container has no `~/.claude/plugins` at all and nothing populates it: a `claude --print`
session runs to completion with zero skills and zero MCP servers, which reads as an agent that
ignored its tools rather than as missing setup. So `src/sandbox.mts` derives the work from that same
file — fetch each marketplace's catalog, then `claude plugin install … -s user`. Installing at
user scope keeps the container's own `enabledPlugins` out of the tracked settings the agent
might commit. It costs about 10 seconds and 14MB per run, and adding a plugin to
`.claude/settings.json` is the only edit needed to get it into the sandbox. `playwright` is the
one exception, skipped by name in `src/sandbox.mts`: its MCP server connects and then fails on first
use, because the image has no browsers.

**Startup commands run in parallel, so ordering lives inside them.** Sandcastle executes
`onSandboxReady` hooks with `concurrency: "unbounded"`, so two entries are two races, not two
steps. Both dependent chains are therefore single entries joined with `&&`: `.npmrc` before
`pnpm install`, and the marketplace catalog before `claude plugin install`. Split them and the
install starts before its catalog exists and fails with `Plugin "x" not found in marketplace
"y"` — a message that points at the marketplace rather than at the race, which is what makes
this worth writing down. The two entries themselves are genuinely independent, so the plugin
install overlaps the pnpm minute for free.

**No `node_modules` is copied in.** The host tree's native packages are darwin-arm64 and the
container needs the 15 Linux equivalents (`esbuild`, `sharp`, `@swc/core`, the Next binaries),
so a copied tree dies on the first command. The mounted pnpm store is the version of that idea
that works: a cold install takes ~1 minute against a warm store.

## Gotchas

**The sandbox sees `HEAD`, not your working tree.** Worktrees are checkouts of committed
history. An uncommitted change to a file the agent needs is invisible to it, and the
resulting failure looks like a bug in the repo. Commit first.

**`package-import-method=copy` in the Dockerfile is load-bearing.** A bind-mounted store is
on a different device from the worktree, so pnpm cannot hardlink — and rather than fail, it
silently abandons the configured store and builds a fresh one at `<project>/.pnpm-store`,
re-downloading everything. Telling it to copy makes it honour the mount.

**Turbo caches typecheck failures as successes.** If a run looks too clean, re-run the
package directly: `pnpm --filter <pkg> exec tsc --noEmit`. The agent's prompt says the same.

**The first commit on every branch is empty.** A pull request needs a diff, and phase 1 is
strictly read-only, so the host adds one empty commit (`plan(#n): …`) to give the plan somewhere
to live. It is made with `git commit-tree` plus `update-ref` rather than `git commit`, because
the branch is not checked out anywhere on the host at that moment. A squash merge drops it.

**There is no CI on pull requests.** The only workflow is `claude.yml`, the `@claude`
mention bot. The sandbox's green test run is the only verification a PR gets before you
read it.

## Troubleshooting

| | |
|---|---|
| `The watcher needs an authenticated gh` | `gh auth login` on the host. This is your login, not the container's `GH_TOKEN`. |
| Slack says `not_in_channel` | `/invite @YourApp` in the target channel. |
| Slack says `invalid_auth` | Wrong or revoked token, or a user token (`xoxp-`) where a bot token (`xoxb-`) is needed. |
| `pnpm install` fails with `ERR_PNPM_FETCH_401` | `NPM_AUTH_TOKEN` did not reach the container. It must be listed as a key in `.sandcastle/.env` — an export in your shell alone is not forwarded. |
| `claude mcp list` shows `finstreet-mcp` failing | `FINSTREET_MCP_TOKEN` did not reach the container — list it as a key in `.sandcastle/.env`. The URL resolving means the plugin installed; only the credential is missing. |
| The agent never uses a skill or an MCP tool | Check the startup command output in the log. `Plugin "x" not found in marketplace "y"` means the catalog was not fetched before the install — almost always because the two were split into separate hooks, which run concurrently. |
| The watcher ignores an approval you left | Check `.sandcastle/state/`. No file means nothing is polling that pull request — the startup log lists issues in that state. Close the PR and re-add the **Sandcastle** label. |
| The watcher ignored a comment on a shipped PR | Only `revise` and `abandon` are read there, and only at the *start* of the comment. It replies once saying so — if you got no reply either, check `.sandcastle/state/` for that issue. |
| `revise` did not include your earlier notes | It should: everything since the last run is sent. If a *previous* `revise` already ran on them, they are spent — restate what still matters. |
| Follow-up rounds ran out | Three is the limit. The watcher stopped tracking it and said so. Merge it, take it from here, or file the rest as its own issue. |
| `no commits between main and sandcastle/issue-n` | The empty plan commit was not created, so `gh pr create` had no diff. Look for a `git commit-tree`/`update-ref` failure earlier in the log. |
| Agent immediately reports `blocked` | Read the log. Almost always an issue too vague to implement — add detail and re-label. |
| A run seems stuck | 15 minutes of total silence ends it. Watch progress with `tail -f .sandcastle/logs/<branch>-*.log`. |
| A run died mid-implementation (timeout, dropped connection, Ctrl-C) | Its uncommitted files are on the branch as a `wip(#n)` commit — `git log sandcastle/issue-<n>`. Never gated, and the host does not push it. Re-add the **Sandcastle** label and the next attempt starts from it. |
| A `wip(#n)` commit you do not want | `git reset --hard origin/sandcastle/issue-<n>` on the host, or delete the branch. Do it before the next round on that branch: the host never pushes a `wip` commit, but the next successful run's push carries it into the pull request. |
| Slack says *No code review* | The phase-4 run failed or came back without a `<review>` block. The implementation is unaffected — it is pushed and ready. The reason is in the same branch log, after the implementation's. |
| The review says the reviewer left commits | It committed despite being told not to. Those commits are local and never pushed, so the pull request is unaffected: `git reset --hard origin/sandcastle/issue-<n>` clears them. |
| The code review repeats the plan back at you | It read `{{PLAN}}` and not the diff. Check the log for the `git diff` calls; if the branch had no commits to read, the implementation is the thing to look at. |
