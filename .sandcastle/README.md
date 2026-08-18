# Sandcastle

An autonomous coding agent for this repo, running in a Docker container.
[Sandcastle](https://github.com/mattpocock/sandcastle) provides the sandbox; everything in
this directory is the wiring around it.

`main.mts` is the watcher: a long-running host process that turns
`Sandcastle`-labelled GitHub issues into pull requests, one at a time, and stops for review
after each one. It never merges.

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
PHASE 1 · container: the agent runs the `kickoff` skill and returns a plan. No code.
   ↓  the plan comes back through an <plan> tag, not a file
host: one empty commit, git push, gh pr create --draft   ← your credentials, not the sandbox's
   ↓  the plan IS the pull request description
label swap → `Sandcastle:awaiting-approval`, state written to state/issue-n.json
   ↓
PHASE 2 · you read the plan and comment on the pull request
   ↓  no container is alive here; this can take days, and the watcher can restart
comment `approve` ─────────────→ PHASE 3
anything else ─→ agent revises the plan, rewrites the description, back to PHASE 2
comment `abandon` ─────────────→ stop, PR left for you to delete
   ↓
PHASE 3 · container: RESUMES the planning session, implements, runs the gate, commits
   ↓  it commits; it cannot push (SSH remote, no key in the container)
host: git push, gh pr ready, comment with the commits and how to test it locally
   ↓
PAUSE until that pull request is merged or closed
   ↓
next issue
```

Branches are named `sandcastle/issue-<n>` and cut from `origin/main`. Pull requests carry
`Closes #<n>`, so the issue closes when you merge.

## Files

| File | |
|---|---|
| `main.mts` | the watcher — poll, dispatch all three phases, push, open PR, notify, pause |
| `plan-issue.md` | phase 1's prompt: read the issue, run `kickoff`, return a plan, change nothing |
| `revise-plan.md` | phase 2's prompt when you ask for changes instead of approving |
| `implement-plan.md` | phase 3's prompt: build the approved plan, and say how to test it by hand |
| `smoke.mts` + `smoke-test.md` | eleven checks proving the sandbox works at all |
| `sandbox.mts` | store mount, `.npmrc` injection, plugin install and startup commands, shared by both entry points |
| `slack.mts` | `chat.postMessage` over a bot token |
| `Dockerfile` | node 22 + pnpm + gh + jq + Claude Code |
| `.env` | secrets, gitignored — see below |
| `docs/adr/` | decisions about how the factory behaves, scoped to this directory rather than to the host repo |
| `logs/`, `worktrees/` | per-run output, gitignored |
| `state/` | one JSON file per issue waiting for plan approval, gitignored |

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
| `NPM_AUTH_TOKEN` | GitHub Packages token (`read:packages`) for `@finstreet/*` — `pnpm install` in the container 401s without it |
| `FINSTREET_MCP_TOKEN` | bearer token for the `finstreet-mcp` server the `finstreet-fe` plugin carries — without it the server is configured but never connects |

Every key in this file is forwarded into the container. A key listed with an **empty value**
falls back to the host shell's value, so `NPM_AUTH_TOKEN=` is enough when your `~/.zshrc`
already exports it — the secret then lives in one place. A key that is *absent* from the file
is not forwarded at all, whatever the shell says.

Slack is optional; without it the watcher logs `Slack notifications off` and runs normally.

### What the Slack thread looks like

One top-level post per issue; everything else replies under it, so the channel keeps one entry
per issue however long the review takes. Each update ends with the links that matter *for that
step* — the point is never having to hunt for the right tab:

| Update | Links it carries |
|---|---|
| 🏰 Planning #n | the issue |
| 🏰 Plan posted, waiting for you | the plan (PR description), where to reply, the log |
| 🏰 Plan revised after *your* feedback | the new plan, your comment, the revision notice, the log |
| 🏰 Plan approved — implementing now | your approval comment, the plan, the log |
| ⏳ heartbeat, at most one every 2 min | — (one line of what the agent is doing) |
| 🏰 Done — ready for your review | files changed, the comment telling you how to test it, the log |
| ✅ Merged / 🚫 Closed | the pull request and the issue |

The unhappy paths post too — planning failed, blocked at planning, abandoned, and the
`blocked` / `no-signal` / `no-changes` outcomes — each linking the comment that explains itself.
A Slack failure never fails a run: `notifySlack` swallows its own errors and the watcher logs a
warning, because a missing notification is not a reason to lose an implementation.

Each issue gets **one thread**: a top-level "Working on #n" message when it is picked up, then
progress, the outcome, and the merged/closed notice as replies under it. Progress is a
heartbeat, not a transcript — at most one update every two minutes, whatever the agent was
last doing.

**3. Check the sandbox.** `pnpm sandcastle:smoke` — repo readable, writes land, dependencies
install as Linux binaries, and `tsc --noEmit` / `pnpm lint` / `pnpm build` all pass. Do this
before blaming the agent for anything.

**4. Label an issue** `Sandcastle` and start the watcher.

## Configuration

Environment variables, all optional:

| | Default | |
|---|---|---|
| `SANDCASTLE_BASE` | `origin/main` | what branches are cut from, and what PRs target |
| `SANDCASTLE_POLL_SECONDS` | `120` | how often to check GitHub, and how often to re-check a parked PR |
| `SANDCASTLE_MODEL` | `opus` | passed to Claude Code as `--model` |
| `SLACK_BOT_TOKEN`, `SLACK_CHANNEL` | — | override `.env` |

## Outcomes

**Phase 1** ends the issue's turn in one of two ways. Either a draft pull request exists and the
issue now wears `Sandcastle:awaiting-approval`, or the label comes off with a comment saying
why — the agent declined to plan (`BLOCKED:`), or the run itself failed. Re-add the label to
ask for another attempt.

**Phase 3** ends in exactly one of these, each reported as a comment on the pull request:

| | | Pauses? |
|---|---|---|
| `shipped` | Agent signalled `COMPLETE` and committed. PR marked ready for review, with testing instructions. | yes |
| `blocked` | Agent signalled `BLOCKED` — the plan did not survive contact with the code. PR stays a draft. | no |
| `no-signal` | Run died: idle timeout, crash, or a host-side failure. Nothing pushed. | no |
| `no-changes` | Agent said done but committed nothing. | no |

In every case except `shipped` the `Sandcastle:awaiting-approval` label comes off and the state
file is deleted, so the watcher moves on rather than re-reading an approval it already acted on.
Starting over means re-adding the **`Sandcastle`** label, which plans from scratch — an approved
plan is not retried on its own, because whatever broke the first attempt is still there.

**How you review a plan.** Comment on the pull request. `approve`, `approved`, `lgtm`,
`ship it`, `go ahead`, `looks good` or 👍 at the start of the comment means build it. `abandon`,
`reject`, `cancel` or `stop` means give up. **Anything else is a change request** — the agent
revises the plan and rewrites the description, keeping everything it read while planning. That
default is deliberate: a comment the watcher cannot classify should start a conversation, never
a build.

The watcher ignores its own comments by an HTML marker (`<!-- sandcastle -->`), because the pull
request is opened with your credentials — by author it cannot tell itself from you.

## Day to day

**Logs.** One file per run under `logs/`, named after the branch. The watcher prints the
path when the run ends; issue comments quote it too.

**Stopping.** Ctrl-C in the foreground. It finishes the current step and exits — press
again to kill it. Backgrounded, send the signal to `tsx`, not to `pnpm`:

```sh
node_modules/.bin/tsx .sandcastle/main.mts > watcher.log 2>&1 &
kill -INT %1
```

pnpm does not forward a signal sent to it alone, so `kill` on the pnpm pid leaves the
watcher running.

**Disk.** Each run's worktree carries a ~2GB `node_modules`. Sandcastle removes it when the
agent left nothing uncommitted; the watcher clears any leftovers before starting the next
issue, so at most one sits around. The pnpm store at `~/.cache/sandcastle-pnpm-store` grows
to ~2GB once and is then reused — deleting it just means the next run re-downloads.

**Branches.** Merged `sandcastle/issue-<n>` branches are not deleted locally. `git branch
--merged main | grep sandcastle/` finds them.

## Why it is built this way

**The agent commits; the host pushes.** `origin` is an SSH remote and the container has no
key, so pushing from inside is impossible. It turns out to be the better split anyway:
branch and PR decisions stay on the side of the fence that has your credentials, and the
container's GitHub token stays scoped to reading issues. It works because Sandcastle
bind-mounts the real `.git` into the container — a commit made in the sandbox is a commit
in your repo, and survives the container and the worktree.

**A human approves the plan, and the session survives the wait.** The expensive mistake is not
a bad line of code, it is a container that spends twenty minutes building the wrong thing
confidently. So phase 1 returns a plan and nothing else, and you approve it on a pull request.

The two phases are two containers, because keeping one alive across a human review is the wrong
shape — `idleTimeoutSeconds` exists to kill a silent agent, and an idle container burning hours
waiting for a comment is worse than no container. What crosses the gap is the *session*:
Sandcastle captures the agent's session JSONL to `~/.claude/projects/…` after every iteration,
and phase 3 passes `resumeSession`, so the agent that implements is the one that planned — it
still has the files it read and the reasoning behind the plan. Without that, phase 3 would be a
stranger reading a summary of its own work.

Three things persist, and the order matters when one is missing: `state/issue-<n>.json` is the
fast path; the session id is mirrored into the pull request description; and the plan itself
*is* that description. So if `~/.claude/projects` is cleared, or the plan is approved on a
different machine, phase 3 still runs — the plan is passed in the prompt either way and the
agent re-reads the code. Resume is an optimisation, not a dependency.

**One PR at a time.** Branches are cut from `origin/main` when the issue is dispatched.
Without the pause, a queue of issues becomes a stack of pull requests all forked from the
same commit, conflicting with each other. Waiting means the next branch starts from a main
that already contains your merge. Parking is free — no container, no tokens, just a `gh`
call every poll.

**The host carries `.npmrc` in.** It is gitignored, and a worktree is a checkout of committed
history, so the container would otherwise install without the `@finstreet` auth line and fail
on a 401 minutes in. `sandbox.mts` reads the host's copy and a startup command writes it into
the worktree. The file holds no secret — only a `${NPM_AUTH_TOKEN}` reference, expanded inside
the container from `.sandcastle/.env`.

**Plugins are installed per run, from `.claude/settings.json`.** That file is tracked, so the
worktree already declares which plugins this repo wants — but declaring is not installing.
A fresh container has no `~/.claude/plugins` at all and nothing populates it: a `claude --print`
session runs to completion with zero skills and zero MCP servers, which reads as an agent that
ignored its tools rather than as missing setup. So `sandbox.mts` derives the work from that same
file — fetch each marketplace's catalog, then `claude plugin install … -s user`. Installing at
user scope keeps the container's own `enabledPlugins` out of the tracked settings the agent
might commit. It costs about 10 seconds and 14MB per run, and adding a plugin to
`.claude/settings.json` is the only edit needed to get it into the sandbox. `playwright` is the
one exception, skipped by name in `sandbox.mts`: its MCP server connects and then fails on first
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
| The agent re-plans instead of building | Your comment did not match an approval pattern, so it counted as feedback. Comment exactly `approve`. |
| `no commits between main and sandcastle/issue-n` | The empty plan commit was not created, so `gh pr create` had no diff. Look for a `git commit-tree`/`update-ref` failure earlier in the log. |
| Agent immediately reports `blocked` | Read the log. Almost always an issue too vague to implement — add detail and re-label. |
| A run seems stuck | 15 minutes of total silence ends it. Watch progress with `tail -f .sandcastle/logs/<branch>-*.log`. |
