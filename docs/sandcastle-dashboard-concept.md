# Sandcastle Dashboard — Concept

A web application that shows what every sandcastle watcher, across every project, is doing and
has done: a board of tasks by lifecycle stage, a timeline per task of what actually happened,
and — above everything — a clear answer to the one question the Slack pings already answer per
issue: **whose turn is it?**

This document is the concept only. No code exists yet; we build against this afterwards.

---

## 1. What we are building around

Facts about the existing factory (`.sandcastle/`) that shape the whole design:

1. **The watcher is a per-repo host process.** Every project that adopts sandcastle runs its
   own watcher on some machine. There is no central component today. A multi-project dashboard
   therefore cannot "look into" watchers — the watchers have to **report to it**.
2. **Every meaningful transition already has a name.** `notify.mts` is a complete catalog:
   `announcePlanning`, `announcePlanPosted`, `announceApproved`, `announceAttempt`,
   `announceRevising`, `announceFollowUp`, `announceRoundsSpent`, `announceAbandoned`,
   `announceFinished`, plus the failure paths. Slack is already an event sink; the dashboard is
   simply a **second, structured sink** for the same moments.
3. **The persisted state is tiny and disposable.** `state/issue-<n>.json` holds only
   `awaiting-plan` and `awaiting-revision` — everything else is a run in flight or lives on
   GitHub. The dashboard must own its own history (the watcher deliberately forgets).
4. **The distinction that matters is `notifySlack` vs `notifyAsk`** (ADR 0007): a *step* vs a
   *stop that needs a human*. The dashboard inherits this as its most important UI concept:
   tasks that are **waiting on you** must be visually louder than everything else.
5. **Humans control the factory by commenting trigger words on the pull request**
   (`approve` / `revise` / `abandon`). This is a gift for a later milestone: the dashboard can
   become *write-capable without any new control channel* — an "Approve" button is just a PR
   comment posted via the GitHub API, which the watcher already reads on its next poll.

---

## 2. Architecture overview

```
┌─────────────────────────────┐          ┌─────────────────────────────┐
│  Project A (repo + machine) │          │  Project B (repo + machine) │
│  sandcastle watcher         │          │  sandcastle watcher         │
│  └─ src/dashboard.mts ──────┼──HTTPS──►│                             │
│     (new event emitter,     │  events  │                             │
│      sibling of slack.mts)  │    +     │                             │
└─────────────────────────────┘ heartbeat└──────────────┬──────────────┘
                                               │        │
                                               ▼        ▼
                              ┌────────────────────────────────────┐
                              │  NestJS API ("mission control")    │
                              │  • ingestion (REST, API-key auth)  │
                              │  • projections → task board state  │
                              │  • query API for the UI            │
                              │  • SSE stream for live updates     │
                              │  • (M3) GitHub actions: approve…   │
                              ├────────────────────────────────────┤
                              │  PostgreSQL via Prisma             │
                              │  events (append-only) + projections│
                              └────────────────┬───────────────────┘
                                               │
                                               ▼
                              ┌────────────────────────────────────┐
                              │  Next.js app (the dashboard)       │
                              │  • cross-project board (kanban)    │
                              │  • per-project board               │
                              │  • task detail: timeline + plan    │
                              │  • "needs you" queue               │
                              └────────────────────────────────────┘
```

### Why push (watcher → API) and not pull (API → GitHub)?

A pull design — the backend polling GitHub for labels, PRs and comments — was considered and
rejected as the primary source:

- It would **re-implement the watcher's state machine** a second time, and the two would drift.
- GitHub never sees the interesting details: run outcomes (`no-signal`, `no-changes`), rescue
  commits, log file locations, queue position, which container is running *right now*.
- It needs a GitHub token per project on the server from day one.

Instead, the watcher pushes. GitHub polling comes later (M4) as **reconciliation only** — a
safety net for events missed while a watcher was down, never the source of truth.

### Why NestJS for the backend (and not Next.js API routes)?

Ingestion + SSE fan-out + scheduled reconciliation are long-running server concerns with their
own lifecycle, auth model (machine API keys, not user sessions), and consumers (watchers, not
browsers). Keeping them in a NestJS service keeps the Next.js app a pure UI with user auth,
and matches the team's existing stack. Single Nest instance is fine for years at this scale
(a watcher emits a handful of events per issue per *day*).

### Monorepo layout

pnpm workspace (optionally Turborepo):

```
sandcastle-dashboard/
├── apps/
│   ├── web/        Next.js (App Router) — the UI
│   └── api/        NestJS — ingestion, queries, SSE, actions
├── packages/
│   ├── contracts/  zod schemas of every event type + TS types.
│   │               Published (GitHub Packages) so each project's
│   │               .sandcastle/src/dashboard.mts imports the SAME schema
│   │               the API validates with. One contract, two ends.
│   └── db/         Prisma schema + generated client + migrations
└── docker-compose.yml   Postgres for local dev
```

The `contracts` package is the load-bearing decision: watcher emitter and API ingestion share
one zod schema, so a contract change is one PR and a version bump, and a watcher on an old
version fails loudly at the boundary instead of writing garbage.

---

## 3. The watcher-side change (small, deliberate)

One new file per the existing pattern: **`.sandcastle/src/dashboard.mts`**, a sibling of
`slack.mts` — a transport, nothing else. `notify.mts` stays the single place that knows *when*
something is worth saying; each `announce*` additionally emits one structured event.

Properties it must have (mirroring what `notifySlack` already promises):

- **Never fails a run.** Swallows its own errors, logs a warning. A missing dashboard event
  must not cost an implementation, exactly like a missing Slack message.
- **Fire-and-forget with a tiny disk spool.** If the API is unreachable, append the event to
  `.sandcastle/outbox/` (gitignored, like `state/`) and retry on the next poll tick. This makes
  the dashboard eventually-consistent through network blips and API deploys without any queue
  infrastructure.
- **Idempotent by construction.** Every event carries a client-generated UUID (`eventId`) and
  the API upserts on it, so a retry after a timeout can never double-count.
- **Configured like Slack is**: `DASHBOARD_URL` and `DASHBOARD_TOKEN` in `.sandcastle/.env`.
  Unset = off, watcher runs normally, logs "Dashboard reporting off".

Three additions beyond mirroring `notify.mts`:

1. **Heartbeat.** Once per poll cycle the watcher sends `watcher.heartbeat` with its version,
   base branch, and the issue it is currently running (or none). The UI uses a missed
   heartbeat (> ~3 × poll interval) to grey a project out and banner "watcher offline since
   HH:MM" — without this, a dead watcher is indistinguishable from a quiet one, the same
   "silence looks like CLEAN" problem ADR-noted for the code review.
2. **State snapshot on startup.** On boot the watcher already reads every `state/issue-*.json`;
   it sends the lot as one `watcher.sync` event. This seeds the board on first adoption,
   and self-heals any drift after an outage: the projection reconciles tracked issues against
   the snapshot (issues in the snapshot but unknown → create; issues the dashboard thinks are
   waiting but absent from the snapshot → mark untracked).
3. **Queue visibility.** When the watcher polls GitHub and sees labelled issues it has not
   started yet, it reports them (`queue.snapshot`, list of issue numbers + titles). That is
   what fills the leftmost board column — today only the Slack message "Planning #n (m more
   queued)" hints at it.

Total estimated footprint in `.sandcastle/`: one new source file, one import per `announce*`
function, two `.env` keys. Nothing about phases, state files, or GitHub behaviour changes.

---

## 4. Data model (Prisma / PostgreSQL)

Two layers, deliberately:

- **`Event` — append-only source of truth.** Everything a watcher ever said, verbatim.
  This is what renders the task timeline ("what was it doing") and lets us rebuild or extend
  projections later without asking watchers to resend anything.
- **Projections (`Task`, `Run`, `WatcherStatus`) — updated transactionally on ingest.** These
  exist so the board is one indexed query, not an event-fold per page load.

### Entities

**Project** — one per repository.
| field | notes |
|---|---|
| id, slug, displayName | slug used in URLs |
| repoOwner, repoName | e.g. `finstreet / project-x`; unique together |
| apiKeyHash | per-project ingestion credential, hashed at rest; shown once on creation |
| defaultBranch | mirrors `SANDCASTLE_BASE` |
| slackChannelUrl? | optional deep link, so a card can jump to the Slack thread's channel |
| createdAt, archivedAt? | archived projects drop off the board, keep history |

**Task** — one per (project, issue). *The board row.*
| field | notes |
|---|---|
| id, projectId, issueNumber | unique (projectId, issueNumber) |
| issueTitle, issueUrl | |
| branch, prNumber?, prUrl? | PR appears at end of planning |
| status | enum, see lifecycle below — **the board column** |
| needsHuman | boolean — set true by exactly the events that were `notifyAsk` in Slack, false the moment a run starts on it. **The board's loudest signal.** |
| planMarkdown? | the current plan (PR description); rendered on the card detail |
| revisionRounds, maxRounds | the "●●○ rounds" indicator |
| generation | increments each time a failed/abandoned issue is re-labelled and planned from scratch; runs and events carry it so attempts don't interleave across restarts |
| slackThreadTs? | future deep link |
| lastEventAt, enteredStatusAt | "time in column" on the card |
| createdAt, closedAt? | |

**Run** — one per container run (phases 1, 3, 4, 5). *The unit of "what it was doing".*
| field | notes |
|---|---|
| id, taskId, generation | |
| phase | enum: `plan` \| `implement` \| `code_review` \| `follow_up` |
| model | opus/sonnet, from watcher config |
| startedAt, endedAt? | endedAt null = the live run, board shows a spinner |
| outcome? | enum: `shipped` \| `blocked` \| `no_changes` \| `no_signal` (null while running; plan runs use `shipped`/`blocked`/`no_signal` semantics) |
| verdict? | code review only: `CLEAN` \| `NITS` \| `CONCERNS` |
| commits, rescuedFiles? | rescued ⇒ show the "wip commit saved" note the README promises |
| commentUrl?, logRef | the PR comment it posted, and which log file to tail on the host |

**Event** — append-only.
| field | notes |
|---|---|
| id | the watcher-generated UUID; primary key ⇒ idempotency for free |
| projectId, taskId?, runId?, generation? | taskId null for watcher-level events |
| type | enum, the catalog in §5 |
| occurredAt | watcher clock; `receivedAt` separately, server clock |
| seq | per-task monotonic counter from the watcher, so ordering never depends on clocks |
| payload | jsonb, the zod-validated body (plan text, comment excerpt+author+url, queue list, …) |

**WatcherStatus** — one per project, upserted by heartbeats: lastSeenAt, watcherVersion,
currentTaskId?, baseBranch. Drives the online/offline indicator.

**User** — for UI auth (M3): email, name, role (`viewer` \| `operator`). Operators may use
action buttons; viewers only look.

### Task lifecycle (the board columns)

```
                        ┌──────────────────────────────────────────────────┐
                        ▼                                                  │ re-label ⇒ generation+1
 QUEUED → PLANNING → AWAITING_APPROVAL → IMPLEMENTING → AWAITING_REVISION ─┤
   │          │               │               │             │        ▲     │
   │          │ failed/       │ abandon       │ blocked /   │ revise │     │
   │          │ blocked       ▼               │ no-signal / │        │     │
   │          └────────► ┌─────────┐          │ no-changes  ▼        │     │
   │                     │ STOPPED │ ◄────────┘          REVISING ───┘     │
   │                     │ (with a │                        │              │
   │                     │ reason) │ ◄── rounds exhausted ──┘              │
   │                     └─────────┘                                       │
   └──────────────────────────────────────────────► MERGED / CLOSED ◄──────┘
```

`status` enum: `QUEUED`, `PLANNING`, `AWAITING_APPROVAL`, `IMPLEMENTING`,
`AWAITING_REVISION`, `REVISING`, `STOPPED`, `MERGED`, `CLOSED`.

`STOPPED` carries a `stopReason` (`plan_failed`, `plan_blocked`, `abandoned`, `attempt_blocked`,
`attempt_no_signal`, `attempt_no_changes`, `rounds_exhausted`, `untracked`) rather than being
eight columns — the board stays readable, the card says why, and the filter can split them.
`needsHuman` is orthogonal to status: `AWAITING_APPROVAL`, `AWAITING_REVISION` after a
follow-up, and most `STOPPED` reasons set it (mirroring exactly which messages were asks).

---

## 5. Event catalog (the contract)

One event type per `announce*` call site plus the three watcher-level additions. Names are
`<subject>.<happening>`; payloads sketched, all validated by zod in `packages/contracts`.

| event type | source in notify.mts | payload highlights | projection effect |
|---|---|---|---|
| `watcher.started` | (new, main.mts) | version, baseBranch | upsert WatcherStatus |
| `watcher.heartbeat` | (new, poll loop) | currentIssue? | update lastSeenAt |
| `watcher.sync` | (new, startup) | array of Tracked snapshots | reconcile tasks |
| `queue.snapshot` | (new, poll loop) | [{issueNumber, title, issueUrl}] | create/refresh QUEUED tasks; drop de-labelled ones |
| `plan.started` | announcePlanning | issue, queuedBehind | task → PLANNING; open Run(phase=plan) |
| `plan.posted` | announcePlanPosted | plan md, prUrl, prNumber, branch | task → AWAITING_APPROVAL, needsHuman ✓; close Run |
| `plan.failed` | announcePlanningFailed | error excerpt, logRef | task → STOPPED(plan_failed), needsHuman ✓ |
| `plan.blocked` | announcePlanningBlocked | agent's BLOCKED: reason | task → STOPPED(plan_blocked), needsHuman ✓ |
| `plan.approved` | announceApproved | comment author/url/notes | task → IMPLEMENTING; open Run(implement) |
| `plan.abandoned` / `task.abandoned` | announceAbandoned | comment author/url | task → STOPPED(abandoned) |
| `plan.gone` | announcePlanGone | pr state | task → STOPPED(untracked) |
| `attempt.finished` | announceAttempt | outcome, commits, rescued, commentUrl, logRef | close Run; shipped ⇒ AWAITING_REVISION + needsHuman ✓; else STOPPED(attempt_*) + needsHuman ✓ |
| `review.finished` | announceCodeReview | verdict, commentUrl | attach verdict to Run/Task (badge on card) |
| `review.skipped` | announceCodeReviewSkipped | why | timeline entry, "no review" badge (silence ≠ clean) |
| `followup.started` | announceRevising | request comment + everything since | task → REVISING; open Run(follow_up) |
| `followup.finished` | announceFollowUp | outcome, roundsLeft, commentUrl | close Run; → AWAITING_REVISION, needsHuman ✓; round counters |
| `rounds.exhausted` | announceRoundsSpent | commentUrl | task → STOPPED(rounds_exhausted), needsHuman ✓ |
| `task.finished` | announceFinished | merged \| closed | task → MERGED / CLOSED |
| `comment.unclear` | (decide → unclear reply) | comment author/excerpt | timeline entry only — "the watcher replied 'that's not a trigger word'" |

Ingestion endpoint: `POST /v1/events` (single or small batch), Bearer = project API key,
zod-validate, insert Event + apply projection in one transaction, publish to the SSE stream.
Unknown `type` from a newer watcher: store the raw event, skip projection, warn — old server
must not drop history.

Ordering: apply projections by `(generation, seq)`; an event arriving late (spooled offline)
still lands in the timeline correctly and projections ignore regressions (e.g. a stale
`plan.started` after `plan.posted` for the same generation does not move the column back).

---

## 6. The UI (Next.js)

### Pages

**`/` — Mission control (all projects).**
- Top strip: **"Needs you" queue** — every task with `needsHuman`, across all projects,
  ordered by how long it has been waiting. Each entry: project badge, issue, *what kind of
  turn it is* ("plan waiting for approval", "shipped — review it", "blocked — re-label?"),
  and the one link that matters for that state (the same link Slack sends). This strip is the
  product; on a good day it is empty and says so.
- Below: per-project summary cards — watcher online/offline dot (heartbeat), counts per
  status, last activity.

**`/p/[slug]` — Project board (the trellis/kanban view).**
- Columns = the lifecycle: `Queued · Planning · Awaiting approval · Implementing ·
  Awaiting revision · Revising · Stopped · Done` (Done = merged+closed, collapsed by default;
  Stopped filterable by reason).
- Cards show: `#n` + title, time-in-column, rounds dots (`●●○`) in the revision columns, a
  pulsing "container running" indicator when the task owns the live run, `needsHuman` accent
  (border + column count badge), verdict chip (✅/🔍/⚠️) once phase 4 is on, and a "wip rescued"
  chip when a dead run left a rescue commit.
- **No drag-and-drop.** Columns are projections of the factory's real state; dragging a card
  can't make GitHub true. Kanban look, read-only semantics — actions happen in the card detail
  (M3) and are explicit ("Approve plan"), not positional. This is worth stating early because
  every board library defaults to draggable.
- All-projects variant of the same board (`/board`) with project badges on cards, for people
  who run several watchers.

**`/p/[slug]/tasks/[issueNumber]` — Task detail.**
- Header: title, status, links (issue, PR, files changed, Slack thread if configured).
- **Timeline** (the "view of what it was doing"): the Event feed rendered like the Slack
  thread — planning started, plan posted (expandable full plan, markdown), approval with the
  human's notes quoted, implementation finished (outcome, commits, "how to test it" comment
  link), each follow-up round with the change request quoted, review verdicts, rescue notes.
  This is a straight render of the `Event` table; no reconstruction.
- **Runs panel**: table of container runs — phase, model, duration, outcome, commits,
  log file path on the host (copyable `tail -f` command; actual log *streaming* is a later
  milestone, see §8).
- **Plan tab**: the current plan as a document.
- (M3) **Action bar**, operators only: `Approve…`, `Request changes…`, `Abandon` — each opens
  a comment composer and posts a correctly-prefixed PR comment via the GitHub API. The
  watcher picks it up on its next poll exactly as if typed on GitHub. The UI marks the task
  "action sent, waiting for watcher" until the corresponding event arrives — the dashboard
  never fakes a transition it hasn't been told about.

### Live updates

- Nest exposes `GET /v1/stream` (SSE, per-user auth, optional project filter). Ingestion
  publishes each event to an in-process emitter → SSE. SSE over WebSockets on purpose:
  one-directional, auto-reconnect built in, plain HTTP.
- The web app keeps board state in TanStack Query (already the team standard); the SSE
  consumer patches the cache per event and falls back to refetch-on-reconnect. A 30s
  polling fallback makes the board correct even with SSE broken.
- Board data comes from projections (`Task`), one indexed query per board; timelines page
  through `Event` by task.

### Auth

- The Next app: NextAuth (the team already runs it) — credentials or SSO later; `viewer` vs
  `operator` roles matter only once M3 actions exist.
- Watchers: per-project static API keys (hashed in DB, shown once). Rotation = generate new,
  old marked expiring. No OAuth machinery for machines.

---

## 7. Multi-project from day one

- Every table hangs off `projectId`; every unique constraint is composite with it. No
  "default project" anywhere.
- Onboarding a project = create it in the UI → copy the API key → add `DASHBOARD_URL` +
  `DASHBOARD_TOKEN` to that repo's `.sandcastle/.env` → restart the watcher. Its
  `watcher.sync` seeds the board with whatever is currently tracked; no backfill scripts.
- Two projects are two watchers on possibly two machines; the dashboard never assumes shared
  disk, shared GitHub org, or even the same sandcastle version (contract versioning via the
  `contracts` package; server stores unknown event types raw).
- History of merged/closed work stays queryable per project and across projects — which is
  what later feeds the analytics (§8).

## 8. Milestones

**M1 — See the factory (the walking skeleton).**
Monorepo, Prisma schema, Nest ingestion (`POST /v1/events`) with API-key auth + idempotency,
projections for the §5 catalog, `dashboard.mts` emitter + heartbeat + sync in one pilot repo,
Next.js board (per-project + all-projects) and task timeline, 30s polling. *Definition of
done: label an issue, watch the card move Queued → Planning → Awaiting approval without
touching Slack.*

**M2 — Trust it.**
SSE live updates, watcher offline banners, `queue.snapshot`, outbox spool + replay in the
emitter, the "Needs you" strip, STOPPED reasons + filters, second project onboarded (proves
multi-project for real), basic NextAuth login.

**M3 — Act from it.**
GitHub token per project (server-side, encrypted), action bar posting `approve` / `revise` /
`abandon` comments, operator role, "action sent, awaiting watcher" state. The watcher is
untouched — this milestone is pure API + UI.

**M4 — Look deeper (pick by appetite).**
- *Log streaming:* watcher tails the run's log file and ships chunks (`run.log` events or a
  separate endpoint into object storage / a capped Postgres table) → live log view replaces
  the copyable `tail -f`. Deliberately last: the README's own position is that a forwarded
  transcript is a thing nobody reads — the timeline covers 95% of "what is it doing".
- *GitHub reconciliation:* scheduled Nest job cross-checks open PRs/labels per project and
  flags drift (never silently rewrites — it reports, the watcher stays authoritative).
- *Analytics:* cycle time per column, outcomes per project, rounds-per-PR, container minutes —
  all derivable from `Event` with no schema changes, which is why events are append-only.

## 9. Risks and open questions

- **Contract drift** between watcher emitter and API → mitigated by the shared `contracts`
  package and by storing unknown events raw; still needs a version field in every payload.
- **Events lost while a watcher is down** (crash before spool write) → `watcher.sync` on
  startup heals *state*, but a timeline can have a gap; acceptable, and M4 reconciliation
  narrows it.
- **Clock skew across machines** → ordering uses the per-task `seq`, never timestamps;
  timestamps are display-only.
- **Same issue re-planned after failure** → `generation` keeps attempts separate; the card
  shows "attempt 2" rather than a corrupted mixed history.
- **Where does the backend run?** Needs to be reachable by every watcher machine — internal
  server or small cloud instance; decide before M1 ends since `.env` files point at it.
- **Sandcastle upstream moves** (it's 0.x) → our contract binds to `notify.mts` call sites we
  own, not to sandcastle internals; an upstream upgrade that reshapes phases costs a contracts
  minor version, nothing in the dashboard's storage model.

## 10. Decisions already taken (so we don't re-litigate while building)

1. Watchers **push** events; the dashboard never scrapes GitHub as its source of truth.
2. **Append-only `Event` + projected `Task`/`Run`** — history first, board second.
3. `needsHuman` mirrors `notifyAsk` **exactly** — same list, same shortness discipline.
4. Board is **read-only kanban** until M3; no drag-and-drop ever.
5. NestJS owns machines and events; Next.js owns humans and pixels; Prisma schema lives in a
   shared package; the event contract is a versioned shared package.
6. Emitter failures never fail a run, and dashboard silence is always made visible
   (offline banners, "no review" badges) — silence must never look like success.
