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
git fetch origin, clear any leftover worktree
   ↓
post to Slack: "🏰 Working on #n"   ← every later message threads under this one
   ↓
container: .npmrc written, pnpm install, agent implements the issue
   ↓  it commits; it cannot push (SSH remote, no key in the container)
host: git push, gh pr create   ← your credentials, not the sandbox's
   ↓
remove the label, comment on the issue, reply in the Slack thread
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
| `main.mts` | the watcher — poll, dispatch, push, open PR, notify, pause |
| `implement-issue.md` | the agent's prompt: one issue, passed in by the host |
| `smoke.mts` + `smoke-test.md` | nine checks proving the sandbox works at all |
| `sandbox.mts` | store mount, `.npmrc` injection and startup commands, shared by both entry points |
| `slack.mts` | `chat.postMessage` over a bot token |
| `Dockerfile` | node 22 + pnpm + gh + jq + Claude Code |
| `.env` | secrets, gitignored — see below |
| `docs/adr/` | decisions about how the factory behaves, scoped to this directory rather than to the host repo |
| `logs/`, `worktrees/` | per-run output, gitignored |

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

Every key in this file is forwarded into the container. A key listed with an **empty value**
falls back to the host shell's value, so `NPM_AUTH_TOKEN=` is enough when your `~/.zshrc`
already exports it — the secret then lives in one place. A key that is *absent* from the file
is not forwarded at all, whatever the shell says.

Slack is optional; without it the watcher logs `Slack notifications off` and runs normally.

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

Every attempt ends in exactly one of these. In all four the label comes off the issue and a
comment explains what happened — **re-add the label to ask for another attempt.**

| | | Pauses? |
|---|---|---|
| `shipped` | Agent signalled `COMPLETE` and committed. PR opened. | yes |
| `blocked` | Agent signalled `BLOCKED` — usually the issue needs more detail. | no |
| `no-signal` | Run died: idle timeout, crash, or a host-side failure. | no |
| `no-changes` | Agent said done but committed nothing. | no |

The label always coming off is deliberate. Without it, one unimplementable issue would be
retried in a loop all night.

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
| Agent immediately reports `blocked` | Read the log. Almost always an issue too vague to implement — add detail and re-label. |
| A run seems stuck | 15 minutes of total silence ends it. Watch progress with `tail -f .sandcastle/logs/<branch>-*.log`. |
