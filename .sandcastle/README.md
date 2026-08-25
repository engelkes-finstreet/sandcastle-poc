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
├── .env          the sandbox's secrets — forwarded into the container, gitignored
├── host.env      the watcher's own config — never forwarded, gitignored
├── jira-transitions.json    moment → Jira transition, one flow per issue type
├── jira-subtasks.json       which subtask of a story is this repository's work
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
| `tracker.mts` | the Tracker port: where work comes from, and how the watcher's state is mirrored back. `SANDCASTLE_TRACKER` picks the adapter |
| `trackers/github.mts` | the GitHub adapter: the `Sandcastle` label family, `gh issue` reads, the release comment |
| `trackers/jira.mts` | the Jira adapter: the same labels via JQL and REST v3, the comments GitHub's `Closes` clause makes unnecessary there, the transition map and its flow per issue type, and the subtask rule that decides which half of a story this repository implements — see below |
| `forge.mts` | everything pull-request-shaped: the draft pull request that carries the plan, comments, trigger words. Plain GitHub, not a port — see `docs/adr/0008` |
| `notify.mts` | every message the watcher sends, in the order a run sends them — Slack and Watchtower both |
| `state.mts` | `state/issue-<n>.json`, one per tracked issue — what survives a restart during review |
| `config.mts` | every knob, every path, every marker. Start here |
| `env.mts` | the two env files and the rule that keeps them apart — imported first by `config.mts`, for its side effect |
| `types.mts` | the shapes that travel between the modules, `Tracked` above all |
| `shell.mts` | `git`, `gh`, and the timestamped log line |
| `shutdown.mts` | Ctrl-C, and the sleep that returns early for it |
| `sandbox.mts` | store mount, `.npmrc` injection, plugin install and startup commands, shared with the smoke test |
| `slack.mts` | the transport: `chat.postMessage` over a bot token |
| `watchtower.mts` | the other transport: the dashboard's event emitter, the identifiers, and the heartbeat |
| `smoke.mts` | the health check — `pnpm sandcastle:smoke` |
| `jira-smoke.mts` | the other health check — `pnpm sandcastle:jira-smoke`, the host's half: credentials, project, newest issue |

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

**2. Fill in the two env files.** Both are gitignored; both have a tracked `.example` next to
them, so this step is two copies and a fill-in:

```bash
cp .sandcastle/.env.example      .sandcastle/.env
cp .sandcastle/host.env.example  .sandcastle/host.env
```

They are split by **which side of the container boundary reads them**, and the split is
enforced at startup rather than merely documented — see
[ADR 0009](docs/adr/0009-two-env-files-one-for-each-side.md).

**`.sandcastle/.env` — the sandbox's.** Every key listed here is forwarded into the container.

| Key | |
|---|---|
| `CLAUDE_CODE_OAUTH_TOKEN` | from `claude setup-token` on your host — lets the agent use your subscription |
| `NPM_AUTH_TOKEN` | GitHub Packages token (`read:packages`) for `@finstreet/*` — `pnpm install` in the container 401s without it |
| `FINSTREET_MCP_TOKEN` | bearer token for the `finstreet-mcp` server the `finstreet-fe` plugin carries — without it the server is configured but never connects |

A key listed with an **empty value** falls back to the host shell's value, so `NPM_AUTH_TOKEN=`
is enough when your `~/.zshrc` already exports it — the secret then lives in one place. A key
that is *absent* from the file is not forwarded at all, whatever the shell says.

The file's unhelpful name is not ours to pick: `@ai-hero/sandcastle` resolves it as
`<repo>/.sandcastle/.env` with no option to point it elsewhere. Read it as an allowlist of what
the agent gets to see.

**`.sandcastle/host.env` — the watcher's.** Read on the host and forwarded nowhere.

| Key | |
|---|---|
| `SANDCASTLE_TRACKER` | optional, `github` (default) or `jira` |
| `JIRA_BASE_URL`, `JIRA_PROJECT`, `JIRA_EMAIL`, `JIRA_API_TOKEN` | the Jira site, project key and credentials, when the tracker is `jira` |
| `SLACK_BOT_TOKEN` | optional, `xoxb-…`, from a Slack app with the `chat:write` bot scope |
| `SLACK_CHANNEL` | optional, the channel ID (`C0123…`) — the bot must be invited to it |
| `SLACK_MENTION` | optional, your Slack **member ID** (`U0123…`) — who gets @-mentioned when it is your turn. A user group (`S0123…`) or the literal `here`/`channel` also work |
| `WATCHTOWER_URL` | optional, the Watchtower api's origin (`https://…`) — both this and the key come from its settings page |
| `WATCHTOWER_API_KEY` | optional, `wt_…`, this repository's Project key. Shown once, at creation, and stored only as a hash |

The shell still wins over this file, so `SANDCASTLE_POLL_SECONDS=10 pnpm sandcastle` changes one
run without editing anything.

Per checkout rather than per machine, which is what makes **more than one golem on one machine**
work: a second clone gets its own `host.env` — its own project, channel and board — with nothing
in `~/.zshrc` that both would have to share.

**Putting a key in the wrong file is a startup error**, naming the key and the file to move it
to. Both directions are caught, because both are invisible downstream: a tracker credential left
in `.sandcastle/.env` gets forwarded into the next container and *nothing goes wrong*, and a
`NPM_AUTH_TOKEN` stranded in `host.env` surfaces minutes later as `ERR_PNPM_FETCH_401` inside an
install.

Note what is in *neither* list: no GitHub credential ever enters the container. The host reads
the issue — body and comments — with your own `gh` login and injects it into the prompts as
`{{ISSUE_TEXT}}`, frozen at container start. Do not add a `GH_TOKEN` key to `.sandcastle/.env`;
the sandbox has no legitimate use for one.

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
`.sandcastle/host.env` and restart the watcher:

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
| `SANDCASTLE_TRACKER` | `github` | which tracker adapter reads the queue and mirrors state: `github` or `jira`. Anything else refuses to start |
| `SANDCASTLE_POLL_SECONDS` | `120` | how often to check GitHub. One `gh pr view` per tracked issue per poll |
| `JIRA_BASE_URL` | `https://finstreet-team.atlassian.net` | the Jira Cloud site, when the tracker is `jira` |
| `JIRA_PROJECT` | `ESCB` | the Jira project whose issues feed the factory |
| `JIRA_EMAIL`, `JIRA_API_TOKEN` | — | Jira credentials, **`host.env` or the shell — never `.sandcastle/.env`**. See below |
| `SANDCASTLE_MODEL` | `opus` | passed to Claude Code as `--model` for planning and implementing |
| `SANDCASTLE_REVIEW_MODEL` | `sonnet` | the model phase 4 reviews on, when phase 4 is on |
| `SLACK_BOT_TOKEN`, `SLACK_CHANNEL`, `SLACK_MENTION` | — | override `host.env` |
| `WATCHTOWER_URL`, `WATCHTOWER_API_KEY` | — | override `host.env` |

Every one of these can be set in `.sandcastle/host.env` instead, which is the usual place; the
shell overrides it for a single run.

Two pieces of configuration are deliberately *not* environment variables, and both are
committed, reviewable files under `.sandcastle/`. `jira-transitions.json` maps lifecycle moments
to Jira workflow transitions, one flow per issue type; `jira-subtasks.json` says which subtask of
a story this repository implements. Which transitions a project's workflow offers is a property of
the project, and which discipline a golem writes is a property of the repository it is pointed at —
neither is a property of the shell that starts the watcher. Both are described below.

### Jira as the tracker

`SANDCASTLE_TRACKER=jira` points the *intake* at Jira; everything else stays exactly where it
was. A team member labels an ESCB issue **`Sandcastle`** in Jira, the watcher finds it by JQL
(`project = ESCB AND labels = Sandcastle AND statusCategory != Done`, oldest first), and from
there the life is the one described above — the branch, the plan pull request,
`approve`/`revise`/`abandon`, the merge — all on GitHub. The issue's summary, description and
comments are flattened out of Jira's document format and injected into the prompts as
`{{ISSUE_TEXT}}`, same as GitHub issue text is.

One thing about the intake is not a straight translation of GitHub's, because ESCB stories are
not shaped like GitHub issues: a story labelled here is usually split into a `[FE]` subtask and a
`[BE]` one, and only one of them is this repository's work. Which one, and what happens to the
other, is the subtask rule below.

What Jira sees back is deliberately thin — links and state, never prose:

- the same three labels the GitHub adapter uses (`Sandcastle`, `Sandcastle:awaiting-approval`,
  `Sandcastle:awaiting-revision`), swapped at the same moments. Jira creates a label the first
  time it is added, so there is no ensure-labels step;
- one comment with the pull request link when the plan is posted;
- one comment when the pull request merges (Jira has no `Closes` clause, so the `shipped`
  moment does the closing work a GitHub issue gets for free) or when the watcher stops
  tracking the issue, and the trigger label comes off with it.

The labels and comments land on the labelled issue, which is where whoever labelled it is
looking. Workflow transitions, when they are configured, land on whatever the run is actually
implementing — the subtask, on a story that has one. See both sections below.

Branch names, pull request titles and commit refs carry the key bare — `ESCB-123`, never
`#ESCB-123` — which is what Jira's development panel matches, so the branch and pull request
appear on the issue with no factory-side integration at all.

**Credentials: `JIRA_EMAIL` and `JIRA_API_TOKEN`, from `.sandcastle/host.env` or the shell —
never from `.sandcastle/.env`.** Every key in that file is forwarded into the container, and no
tracker credential may enter the sandbox; `src/env.mts` refuses to start the watcher if one is
listed there, and the smoke test asserts their absence the same way it does `GH_TOKEN`'s. Mint the token at id.atlassian.com → Security → API tokens (it authenticates as
you; a service account is a recorded follow-up). With Jira selected and either credential
missing or rejected, the watcher refuses to start and says what to fix.

#### Which subtask of a story is this repository's work

An ESCB story is not one piece of work. It is written as one issue with a `[FE]` subtask and a
`[BE]` subtask under it, and those two are *different repositories*: the frontend golem must
implement the frontend subtask, the backend golem the backend one, and neither may implement the
story whole. The label, though, goes on the story — one label, on the thing a product owner is
looking at — so the golem has to work out which half of it is its own.

That is **`.sandcastle/jira-subtasks.json`**, committed, and shipped filled in for this
repository:

```json
{
  "mine": "[FE]",
  "others": ["[BE]"]
}
```

`mine` marks the subtasks to work on and `others` marks the ones to leave alone. Both are matched
anywhere in the subtask's summary, ignoring case — `[FE]` finds `[CB][FE] - the login screen` —
because what a team has here is a naming convention, not a Jira field. Nothing but this file
needs changing for the backend golem: `{ "mine": "[BE]", "others": ["[FE]"] }`, in the backend
repository.

Given a labelled story, the rule has three answers, and the third is the one it exists for:

| The story | What happens |
|---|---|
| has an open `[FE]` subtask | **that subtask is the work.** The prompts get the story *and* the subtask, with the subtask marked as the scope and the rest marked as somebody else's. Two `[FE]` subtasks are both in scope — taking only the first would silently drop the second, and nothing would ever come back for it |
| has no `[FE]` subtask, but has a `[BE]` one — or its `[FE]` subtask is already **done** | **the story is left alone.** It is not in this golem's queue, its label stays exactly where it is, and a line in the log says which story and why |
| has no subtask this rule recognises, or no subtasks at all | **the issue itself is the work**, exactly as it was before this existed |

The label staying on is the part worth being deliberate about: it is the intake for *every* golem
watching this project, so a frontend golem taking it off a backend story would be dropping
somebody else's work on their behalf. Nothing starves for it either — the watcher only ever
starts the *first* issue of its queue, and a story that is not in the queue cannot hold up the
ones that are.

What the agent is handed looks like this — one block of text, the scope stated before anything
else, and every section that is only context labelled as only context:

```
**Scope: EBS-83.** This story is split into subtasks and that one is this repository's share of
it — plan and implement it and nothing else. …

### The story: EBS-81 — [CB] - Golem test story

This is a test story to confirm the Jira connection is working in the poc golem.

### Your scope: EBS-83 — [CB][FE] - This is the FE subtask

…

### Not your scope

Another repository's golem — or a colleague — implements these. Do not implement them here. …

- EBS-82 — [CB][BE] - this is an example BE subtask — To Do
```

Four more things worth knowing:

- **The story's text always comes along.** A subtask's own body is usually one line; the
  requirement is written on the story. So is every comment. The scope narrows what the agent
  *does*, never what it is allowed to read.
- **Label a subtask directly and that works too**, on any project, rule or no rule: the golem
  takes the subtask as the work and pulls its parent story in as context, plus a list of its
  siblings. It is the smaller-grained way to use this — one branch and one pull request per
  subtask instead of per story — and it is what to reach for if a story's two halves need to be
  planned separately. It is also the shape to use when a frontend golem and a backend golem watch
  the same Jira project: label **both** subtasks, and each golem takes its own and leaves the
  other alone, because the rule reads the labelled issue's own summary as well as its subtasks'.
  Labelling the story instead gives the first golem to pick it up the label swap, and the second
  golem then sees nothing to do — see `docs/adr/0010`.
- **Transitions follow the scope.** With `jira-transitions.json` filled in, it is the *subtask*
  that moves from column to column, not the story — because the subtask is what a developer
  would move, and stories are what subtasks add up to. Every log line names the key it moved.
- **Emptying `mine`, or deleting the file, turns all of this off**: every run is scoped to the
  labelled issue itself, which is what a project not using discipline subtasks wants and what
  every deployment did before this existed. A malformed file, an unknown key, or an `others`
  list with an empty `mine` is a startup failure naming the file — the same rule the transition
  map follows, for the same reason.

To try it without a watcher running, `pnpm sandcastle:jira-smoke` prints the rule under the
banner and then the decision it reached for every labelled story:

```
Jira: subtasks — working the "[FE]" subtask of a labelled story, leaving "[BE]" to another
repository; a story with neither is worked whole.
  jira: EBS-81 → EBS-83 — the "[FE]" work on it (leaving EBS-82)
  jira: EBS-90 left for another repository's golem — it has no "[FE]" subtask, and EBS-91
        belongs to another repository
  queue: 1 issue(s) labelled "Sandcastle", not Done, and this repository's work
```

#### The transition map

Labels are the mirror every Jira project gets for free. Moving the *workflow* — the board
column the issue sits in — is opt-in, because a transition that exists on one project's workflow
does not exist on another's. It is configured in **`.sandcastle/jira-transitions.json`**, which
is committed, and which in this repository holds what ESCB agreed the golem may move:

```json
{
  "picked-up": "In progress",
  "awaiting-approval": "",
  "implementing": "",
  "awaiting-revision": "Ready for CR",
  "shipped": "",
  "stopped": ""
}
```

Two moves, and they are the two a developer would make by hand: **To Do → In Progress** when the
golem takes the issue, and **In Progress → In CodeReview** when its implementation pull request
goes up for review. The merge is a human's, and so is the column after it — for now. What a moment
names is a **transition**, the words on the button in Jira, matched ignoring case and surrounding
space, and not the board column, which is the status the button leads *to*: on both ESCB workflows
the button says `Ready for CR` where the column says `In CodeReview`.

The six moments are the watcher's, and they are the same six on every tracker:

| Moment | Fires when |
|---|---|
| `picked-up` | the issue leaves the queue and phase 1 starts |
| `awaiting-approval` | the plan is posted and a human's approval is what happens next |
| `implementing` | approval landed and phase 3 starts |
| `awaiting-revision` | the implementation pull request is up for review and the watcher is listening for `revise` |
| `shipped` | the pull request merged |
| `stopped` | the watcher let the issue go — abandoned, blocked, rounds spent, closed unmerged |

Every entry is optional, and so is the file: with everything empty, or the file deleted, the
mirror is labels only and Jira behaves exactly as it did before this existed.

##### Why the other four are empty

`awaiting-approval` has nothing honest to move to: ESCB has no status for *a plan is waiting for a
human*, and `In CodeReview` would be a lie, because no code exists yet. The issue stays In
Progress and the `Sandcastle:awaiting-approval` label carries that state on its own. `implementing`
would ask for `In progress` on an issue that is already In Progress — which Jira does not offer
from there, so it would print a skip line every run to change nothing. `shipped` is empty because
the agreement is that a human merges the pull request and moves Jira with it. And `stopped` is
empty on purpose, for the reason in the list below.

`shipped` is the one likely to change. The day the golem is trusted to close its own work, that is
the entry to fill in — and it is also where ESCB's two workflows part company, which is what the
next section is about.

##### One flow per issue type

A Jira workflow scheme binds a workflow **per issue type**, and ESCB has two:

| Issue type | Its flow |
|---|---|
| **Sub-task** | `To Do → In Progress → In CodeReview → Done` |
| **Story**, **Task**, **Bug** | `To refine → To Do → In Progress → In CodeReview → In QA → Ready for Deployment → Done`, with `QA Rejected → In Progress` |

One board, and the same words on the buttons the two share — `In progress` and `Ready for CR` are
the same transition names on a Sub-task as on a Story — so the two moments the map fills in today
need only one flow, and the file above is the flat shape. They part company *after* In CodeReview:
a subtask's life ends at `Done`, while the story above it carries on to a QA pass and a deployment
the golem knows nothing about. A `shipped` that closed its own work would have to mean `Done` on a
subtask and something else on a story — one map, two answers.

So the file takes a second shape for that, keyed by issue type with `"*"` for the ones not named:

```json
{
  "*":        { "picked-up": "In progress", "awaiting-revision": "Ready for CR" },
  "Sub-task": { "shipped": "Done" }
}
```

A named type overrides `"*"` **moment by moment** rather than replacing it whole, so two flows
share what they agree on — which is most of it. An entry that is present and empty is how a type
says *this moment moves nothing here* against a fallback that moves something. Mixing the shapes —
a moment and an issue type side by side at the top level — is a startup failure naming both: it is
a half-finished edit, and the one case where guessing would quietly drop half of what was written.

Which flow applies is decided from the issue the moment is *landing on*, not from the labelled
one: on a story scoped to its `[FE]` subtask, every moment moves the subtask, so the **Sub-task**
flow is the one that applies. The subtask's type arrives with the story, so that costs no extra
call; a labelled issue worked whole costs one, remembered for the rest of the run; the flat shape
costs none, because it never has to ask.

##### Worth knowing

- **Names are resolved at the moment, not at startup.** Jira offers only the transitions the
  issue's *current* status allows, so a name is available at one moment and not at another. A
  name the issue does not offer is skipped with a log line that lists the ones it does — which
  is the fastest way to find out what belongs in the file. A workflow edited in Jira degrades
  the mirror; it never fails a run.
- **A misspelled *moment* is a startup failure.** The six keys above are the only ones allowed,
  at either level, because a typo'd key would silently never fire and read as "transitions don't
  work". The watcher says which file, which flow and which key, and stops.
- **A misspelled *issue type* is a warning.** `"Subtask"` where ESCB has `Sub-task` is the same
  class of mistake — an override that never applies — but catching it takes a call to Jira, so
  startup says `names "Subtask", which ESCB has no issue type called … Its types are Task,
  Sub-task, Story, Bug, Epic` and carries on rather than refusing to run on something the network
  told it.
- **An empty name one level down is a silence, not a gap.** In `"*"`, and in the flat shape, an
  empty name is a moment left unconfigured. Under a named type it is louder: it overrides a
  fallback that *does* move something, which is how one issue type opts out of a moment every
  other type mirrors.
- **`awaiting-revision` fires once.** It is signalled where phase 3 ends, and a follow-up round
  after a `revise` comment does *not* re-signal it — so the In CodeReview move happens exactly
  once and the column never bounces while a pull request is being reworked.
- **`shipped` is the last word.** On a merge the watcher fires `shipped` and then, letting go,
  `stopped`. The stop that trails a ship moves nothing and says nothing — otherwise a `stopped`
  transition would drag the issue back out of the status shipping just put it in. This is why
  `stopped` is empty and would stay empty even if `shipped` were filled in.
- **Nothing is ever transitioned back.** If a run fails before the issue is tracked, the
  `Sandcastle` label comes off with a comment (as it always did) but the `picked-up` transition
  stands: the map has no reverse. Re-adding the label picks the issue up again, and the
  `picked-up` transition its status no longer offers is skipped with a log line.
- **What moves is what the run implements.** On a story scoped to a `[FE]` subtask by
  `jira-subtasks.json`, every one of these moments transitions the *subtask*: it is the thing a
  developer would move, and a story that jumped to In CodeReview while both its halves sat in To
  Do would be a lie on the board. Where there is no subtask to scope to, the labelled issue
  moves, as it always did. Each log line names the key it moved, so the two cases are never a
  guess.

Startup prints the map, one line per flow, right before the `Watching …` banner, so the answer to
"will this move anything, and on what" is in the first lines of the log. What ESCB's committed file
prints today:

```
Jira: transitions — picked-up → "In progress", awaiting-revision → "Ready for CR".
```

and what the per-type shape in the example above would print instead:

```
Jira: transitions on any other issue — picked-up → "In progress", awaiting-revision → "Ready for CR".
Jira: transitions on a Sub-task — shipped → "Done".
```

#### Trying it for real, on a scratch issue

Nothing below needs a second repository or a second Jira project. It does need an issue you are
willing to have an agent read and a pull request you are willing to throw away, so use a scratch
issue in ESCB — the transitions this exercises are the real ones on the real workflow.

**1. Credentials, in `.sandcastle/host.env`.** Never in `.sandcastle/.env`:

```
SANDCASTLE_TRACKER=jira
JIRA_EMAIL=you@finstreet.de
JIRA_API_TOKEN=…                   # id.atlassian.com → Security → API tokens
```

Exporting them in the shell that starts the watcher works too, and wins over the file — but the
file is per checkout, which is what a second golem on the same machine needs.

Then prove them before involving the watcher at all:

```bash
pnpm sandcastle:jira-smoke
```

Three questions in the order they can fail — are the credentials accepted, is `JIRA_PROJECT`
visible to that account, and does a real issue come back — and the third one prints the newest
issue in the project, because a key and a summary you recognise is what tells you it is the
*right* project rather than *a* project:

```
[…] Jira smoke test — https://finstreet-team.atlassian.net, project ESCB
[…]   1/3  credentials   authenticated as … <…@finstreet.de>
[…]   2/3  project       ESCB — "…" (software), lead …
[…]   3/3  newest issue  ESCB-128 — …

       status    To Do
       created   2026-08-24 18:02 by …
       labels    Sandcastle
       url       https://finstreet-team.atlassian.net/browse/ESCB-128

[…] Jira is reachable, and ESCB is the project the watcher would take work from.
```

Every step is a GET, so it is safe against the production site and safe to re-run while you sort
a token out. Whichever step fails says what to fix — a rejected token, a project the account
cannot browse, a site that is not Jira Cloud. It is the host's half of `pnpm sandcastle:smoke`,
which checks the *container*, where these credentials deliberately do not exist.

**2. Learn the transition names from the issue itself.** Names, not board columns: the button
says *In progress* where the column says *In Progress*, and *Ready for CR* where the column says
*In CodeReview* — the map wants the button.

```bash
curl -su "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  https://finstreet-team.atlassian.net/rest/api/3/issue/ESCB-123/transitions |
  jq -r '.transitions[] | "\(.name)  →  \(.to.name)"'
```

Run it again after each moment: the list is *not* fixed. It is what ESCB-123's current status
offers, which is why the map resolves names at the moment rather than at startup — and why the
skip line prints the offered names when a configured one is not among them. Ask a **subtask** as
well as a story, because the two run different workflows — they happen to agree on the two names
the map uses today, and diverge after In CodeReview, which is what a `"Sub-task"` flow would have
to be filled in from.

**3. Configure one moment first — `picked-up`.** It fires within seconds of the watcher
noticing the label, so the wiring is confirmed or not before an agent has done any work. ESCB's
committed map already does this, and either shape says it:

```json
{ "picked-up": "In progress" }
```

**4. A scratch issue with a real, tiny task.** Give it a summary and a description an agent can
act on ("add a `README` line documenting `pnpm sandcastle:smoke`") rather than a placeholder: an
agent that declines to plan releases the issue right after the pickup, and every later moment
goes untested. Label it **`Sandcastle`**.

To exercise the subtask rule as well, make it a story with two subtasks — one `[FE]`, one `[BE]`
— and put the actual task in the `[FE]` one. Then the pickup line names which subtask it took,
the plan should mention the `[BE]` subtask only as somebody else's, and the transitions in step 6
land on the subtask rather than on the story. A second scratch story with a `[BE]` subtask and no
`[FE]` one proves the other half: it should never be picked up, and it should keep its label.

**5. Start the watcher.** A short poll and — until this branch is on `main` — the branch the
factory is running from as the base:

```bash
SANDCASTLE_TRACKER=jira \
SANDCASTLE_POLL_SECONDS=30 \
SANDCASTLE_BASE=origin/sandcastle/epic-10 \
pnpm sandcastle
```

The first four lines answer everything about configuration:

```
Jira: authenticated as … against https://finstreet-team.atlassian.net.
Jira: transitions — picked-up → "In progress", awaiting-revision → "Ready for CR".
Jira: subtasks — working the "[FE]" subtask of a labelled story, leaving "[BE]" to another repository; a story with neither is worked whole.
Watching ESCB on https://finstreet-team.atlassian.net for issues labelled "Sandcastle".
```

**6. What to check, moment by moment.** The log line is the claim; Jira is the evidence.

| After | The log says | Check in Jira |
|---|---|---|
| pickup | `jira: ESCB-123 → ESCB-124 — the "[FE]" work on it`, then `jira: ESCB-124 → "In progress" (picked-up)` | the **subtask** moved column, and its History tab records it. Where the story has no `[FE]` subtask, both lines name the story instead |
| the plan is posted | `jira: … (awaiting-approval)`, if configured | `Sandcastle` swapped for `Sandcastle:awaiting-approval`, a comment with the pull request link, and the branch and PR under **Development** — that panel is Jira matching the bare key, with no integration on our side |
| you comment `approve` | nothing from `implementing`, which is unconfigured | the column has not moved: the issue was already In Progress |
| the implementation pull request goes up | `jira: ESCB-124 → "Ready for CR" (awaiting-revision)` | the **subtask** is In CodeReview, its History records it, and the pull request is marked ready for review |
| you merge | nothing from `shipped`, and nothing from the `stopped` one second later | the column is yours to move — this is the moment to confirm the golem did **not** touch it |

**7. Then break it on purpose**, because the failure modes are the reason the map is shaped this
way. Each takes one edit and one poll:

- **A name that does not resolve.** Put `"awaiting-approval": "Nope"` in the map. Expect
  `offers no "Nope" transition at awaiting-approval — skipped (offered: …)`, the labels and the
  comment landing anyway, and the run carrying on.
- **A transition Jira refuses.** Point a moment at a transition whose screen requires a field
  (a resolution, typically). Expect `WARNING: could not transition … Field 'resolution' is
  required` and an unharmed run — then leave that moment unconfigured, because the map cannot
  fill a required field.
- **Nothing configured at all.** Empty the map, or `mv` the file away, and re-run: labels and
  comments only, exactly as before the map existed. This is the one to try last — it is what
  every other project gets.
- **A misspelled moment.** `"picked_up"` instead of `"picked-up"`, at either level. The watcher
  refuses to start and names the file, the flow and the six valid keys. A typo here is the one
  thing that is *not* best-effort.
- **A misspelled issue type.** `"Subtask"` instead of `"Sub-task"`. Startup warns that ESCB has
  no such type and lists the ones it has, then runs: that override simply never applies, and every
  subtask takes the `"*"` flow instead.
- **Two flows disagreeing on one moment.** Move the map into the per-type shape and put
  `"awaiting-revision": ""` under `"Sub-task"`. A scoped story's subtask then stays in In Progress
  when its pull request goes up, while a story worked whole still moves — which is what an empty
  name under a named type is for.

**8. Clean up after yourself.** The scratch issue's label comes off when you merge or close the
pull request, but the rest is yours to remove:

```bash
rm -f .sandcastle/state/issue-ESCB-123.json .sandcastle/logs/sandcastle-issue-ESCB-123.log
git push origin --delete sandcastle/issue-ESCB-123
```

and transition the issue back by hand — the map has no reverse, on purpose. If you filled the
map in for the trial and do not want it live yet, empty it again: it is committed, so leaving a
name in there configures it for everybody.

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
might commit.

**What a run installs is an allowlist, not everything you have enabled.** `SANDBOX_PLUGINS` in
`src/sandbox.mts` names it in full — `finstreet-dev` and `finstreet-fe` — and settings.json is
consulted only for where those marketplaces live. The two directions fail differently, which is
the whole argument: a plugin the sandbox wants and does not get is an agent quietly ignoring this
repo's conventions, while a plugin it gets and does not want can take the run down in setup,
before the agent starts. The second is not hypothetical. Enabling one personal plugin from
`claude-plugins-official` broke every phase twice over — first on a marketplace clone the
container cannot authenticate over SSH, then on one too large for the CLI's 120-second default.
Under a list of exceptions that is what a local convenience costs by default; under an allowlist a
plugin nobody named cannot reach a container at all.

So `playwright` (its MCP server connects and then fails on first use — the image has no browsers)
and `mattpocock-skills` (workflow skills for a person at a terminal) are simply absent rather than
excluded by name. The price of the allowlist is a second edit: a plugin this repo's *runs* need is
enabled in `.claude/settings.json` **and** named in `SANDBOX_PLUGINS`. Two entries that change
rarely is a cheap place to pay it, and forgetting the second half is visible in the log as a run
whose plugin chain is shorter than you expected.

A plugin named in `SANDBOX_PLUGINS` and explicitly `false` in settings.json is a contradiction,
not a default, so it throws at startup rather than resolving itself silently. The SSH and clone
timeout wiring (`url."https://github.com/".insteadOf`, `CLAUDE_CODE_PLUGIN_GIT_TIMEOUT_MS`) stays
as insurance: no allowlisted plugin comes from the marketplace that failed that way, but the first
entry from any other one brings the shorthand clone straight back.

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
| `The watcher needs an authenticated gh` | `gh auth login` on the host. The host is the only place a GitHub credential exists — the container gets none. |
| Slack says `not_in_channel` | `/invite @YourApp` in the target channel. |
| Slack says `invalid_auth` | Wrong or revoked token, or a user token (`xoxp-`) where a bot token (`xoxb-`) is needed. |
| `pnpm install` fails with `ERR_PNPM_FETCH_401` | `NPM_AUTH_TOKEN` did not reach the container. It must be listed as a key in `.sandcastle/.env` — an export in your shell alone is not forwarded, and `host.env` is never forwarded at all. |
| Startup says a key `is in .sandcastle/.env` and must move | A host-side key (`JIRA_`, `SLACK_`, `WATCHTOWER_`, `SANDCASTLE_`) is in the file that gets forwarded into the container. Move it to `.sandcastle/host.env`. If it is a credential, rotate it — the guard stops the next run, not the ones already gone. |
| Startup says a key `is in .sandcastle/host.env` and will not reach the agent | The reverse: a sandbox credential in the file that is never forwarded. Move it to `.sandcastle/.env`. |
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
