# The tracker is a port; the forge is GitHub

The factory conflated two things it had always kept apart in its workflow: where work comes
from, and where code changes go. One module spoke to GitHub for both, so a project whose intake
lives in another tracker — Jira is the first concrete case — could not use the factory at all,
even though nothing about planning, approving or shipping actually cares where the issue text
was typed.

The fix is asymmetric on purpose, and this records why the asymmetry is a decision rather than
an accident.

## The Tracker is a port

`src/tracker.mts` defines what a tracker is to the factory, and `src/trackers/github.mts` is its
first adapter, selected by `SANDCASTLE_TRACKER` (unset means GitHub, so an existing deployment
upgrades without touching anything). The port is six operations:

- **list the queued issues** — whatever "wearing the `Sandcastle` label" translates to there
- **fetch an issue's text** — body and comments, injected into the prompts as `{{ISSUE_TEXT}}`
  by the host, so the container needs no tracker credential
- **signal a lifecycle moment** — see below
- **release an issue with a comment** — out of the queue, with the reason where its author looks
- **produce the external ref** — tracker type, key, URL: the issue's identity on the wire
- **produce the commit reference** — how a key reads to a human: `#42` here, `ESCB-123` there

plus the small members the six imply: `mirroredKeys`, the read-back of the mirror `signal`
writes, which exists only so the startup orphan check can ask "what does the tracker think I am
holding"; `source`, the one line the startup banner prints about where work comes from;
`verify`, the fail-fast credential check run once at startup; and `planPullRequest`, the
tracker-shaped parts of the plan pull request — its title and the reference line its body opens
with — because which of those the tracker's tooling reads is tracker knowledge.

*(Amended for the Jira adapter, #14.)* The port is asynchronous. The GitHub adapter never needs
to be — `gh` is a blocking CLI — but a tracker spoken to over plain HTTP has no synchronous
option, and the port's shape has to fit its widest implementor. Adapters are also selected as
factories rather than instances, so only the chosen one is ever constructed: construction is
where an adapter reads its own configuration, and a GitHub deployment must not fail over Jira
credentials it never needed.

The seam is real because both sides of it already existed. Issue identity was made an opaque
string key first, and the host was already feeding issue text into the prompts — so the port
extracts assumptions rather than inventing indirection. It is also the seam any future test
would fake: an adapter that answers from memory drives the whole lifecycle without a network.

### Six moments, fired where the labels used to swap

The watcher tells its tracker about exactly six moments of an issue's life: **picked-up,
awaiting-approval, implementing, awaiting-revision, shipped, stopped**. The list is fixed by the
watcher and each fires exactly where a label swap (or nothing) sat before, so on GitHub the
behaviour is byte-for-byte what it was. Three of them are no-ops there — nothing ever marked a
pickup or an implementation starting, and `shipped` needs no hand because the plan pull
request's `Closes` clause already closes the issue when it merges. A no-op is a fact about
GitHub, not a gap in the port: a tracker with an "In Progress" of its own says it at those
moments, and the watcher neither knows nor cares which kind it is talking to.

*(Amended for the Jira transition map, #15.)* The Jira adapter is the tracker with an "In
Progress" of its own, and how it says it stayed **out** of the port: which transition each of the
six moments fires is declared in a committed per-project file,
`.sandcastle/jira-transitions.json`, by transition *name*. Three things about that shape were
deliberate. It is a file
rather than environment variables, because which transitions a workflow offers is a property of
the project and belongs in review, not in whoever's shell starts the watcher. It is names
rather than ids, because an id is a per-workflow integer nobody can read. And nothing is
resolved until the moment fires — Jira offers only the transitions the issue's current status
allows, so there is no startup check to write, and a name the issue does not offer is a log line
listing the ones it does. The unhappy paths all degrade the same way: what is unconfigured or
unresolvable is skipped, and the labels — which every Jira project has, whatever its workflow —
remain the mirror that has to work. The one thing that *is* loud is a misspelled moment key,
because that would read as a factory ignoring the file.

Two consequences of putting the map behind the adapter rather than on the port. The map is
additive to the labels, not a replacement: with it empty the Jira mirror is byte-for-byte the
labels-first one, which is what makes filling it in safe. And `shipped` gets the last word — the
`stopped` the watcher fires one breath later, letting go of a merged issue, moves nothing,
because a `stopped` transition would drag the issue back out of the status shipping just put it
in. Nothing is ever transitioned *back*, either: an issue released before it was tracked keeps
the status `picked-up` moved it to, and re-adding the label simply finds that transition no
longer offered.

## The Forge is not a port

Everything pull-request-shaped stays in `src/forge.mts` as plain GitHub with no interface over
it: the branch push, the draft pull request that carries the plan, trigger-word comments,
ready-for-review, and merged/closed detection. Work can arrive from different trackers; the code
always goes to GitHub.

An abstraction with one implementation is a fake seam. It costs a layer of names on every call,
it drifts because nothing exercises its generality, and it advertises a flexibility nobody has
asked for — a second forge would reshape the *workflow* (what is a draft, what is "ready", what
is a review comment), not just the mechanics, so the port that would survive it cannot be
designed from one example anyway. If a second forge ever becomes real, the seam gets cut then,
from two examples.

Two consequences of the split are worth naming. The `Closes` clause in the plan pull request's
body is written by the forge but *supplied* by the tracker — `planBody` takes the issue
reference as an argument — because whether that line closes anything is a fact about the
tracker, and it is the whole reason the GitHub adapter's `shipped` moment can be a no-op. And
the change-request ref the Golem reports lives on the port module rather than on an adapter:
the forge is GitHub for every tracker, so the ref does not vary — but it is minted next to
`externalRef`, so both of the wire's identities come from one place.

## Considered Options

**Make the forge a port too, for symmetry.** The symmetry is the whole appeal and it is false:
there is a second tracker on the roadmap and no second forge anywhere in sight. See above.

**Skip the port; branch on `SANDCASTLE_TRACKER` inline.** Honest about the small number of
adapters, but it spreads the tracker back into every module the port just pulled it out of —
the pre-refactor state, with a flag.

**Signal arbitrary state strings instead of six fixed moments.** More flexible, and flexibility
in the wrong place: the moments are the watcher's state machine made audible, and an adapter
inventing its own vocabulary would mean nobody can say what a tracker must implement to be
correct. Six names, fixed by the watcher, each adapter free only in *how* it says them.

**Read the queue from Watchtower instead of a tracker.** Inverts the architecture — Watchtower
is a sink fed by the factory, not a source of work — and couples running the factory to running
a dashboard that is deliberately optional.

## Consequences

- **A second tracker is one file plus one entry — for the mechanics.** An adapter in
  `src/trackers/`, a line in `ADAPTERS`, and whatever config it needs: the phases, the state
  files and the sinks already speak in keys, moments and refs. What that does *not* cover is
  prose. The watcher still composes its release comments, its orphan warning and a handful of
  messages in GitHub's vocabulary ("re-add the **Sandcastle** label"), above the port — kept
  there because this refactor's acceptance bar was byte-for-byte equivalence, not neutral
  wording. The second adapter (Jira, #14) shipped labels-first without paying this down: it
  posts the watcher's prose as plain text, where GitHub markdown renders as literal asterisks —
  legible, not pretty. Moving that prose behind the port is still open, and still the first
  thing to reach for when the wording starts to matter.
- **`SANDCASTLE_TRACKER` is validated, not trusted.** A typo is a loud startup failure, because
  a watcher silently falling back to GitHub against a queue that lives elsewhere would look
  exactly like a watcher with nothing to do.
- **The GitHub adapter borrows the forge's `REPO`.** The tracker and the forge are the same
  repository on a GitHub-tracked project, and asking `gh` twice would be a second credential
  check pretending to be independence. A GitHub tracker for a *different* repository than the
  forge's is not a supported shape.
- **The wording stays GitHub-flavoured, and not only inside the adapter.** Comments on issues
  and pull requests still say "re-add the **Sandcastle** label", because on this deployment
  that is the instruction — and some of that prose is composed in the watcher, not behind the
  port (see above). The port does not pretend the current prose is neutral.
- **Nothing below the port is worth testing in isolation** — the adapter is `gh` calls — but
  everything above it now can be, without a network.
