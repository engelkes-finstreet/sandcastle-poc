# Two env files, one for each side

`.sandcastle/.env` did two jobs. It was the sandbox's file — @ai-hero/sandcastle forwards every
key listed in it into the container — and it was also where the watcher's own configuration had
accumulated: Slack, Watchtower, and, most recently, the Jira credentials. Those are host-side
values, and one of them is a credential that has no business inside a container. The rule
against that was written down in three places (`config.mts`, `trackers/jira.mts`, the README)
and enforced nowhere, so the file it warned about was the only file there was to put things in.
The instruction it gave instead — *put the Jira credentials in your shell* — has its own
problem: a shell profile is one per machine, and a golem's configuration is one per checkout.

So: two files, split by which side of the container boundary reads them.

## `.sandcastle/.env` is the sandbox's

Its name is not ours to choose. The library resolves it as `join(repoDir, ".sandcastle",
".env")` with no option to point it elsewhere, and takes the host's value for any key listed
there but left blank. That makes the file a **declaration of what the agent gets to see**, and
the right way to read it is as an allowlist, not as a place to keep secrets. Three keys qualify:
the agent's own login, the registry token `pnpm install` needs, and the bearer token the bundled
MCP server authenticates with.

The name being fixed is why the split runs the way it does. The obvious move — rename the
overloaded file to something that says what it is, and let `.env` mean the ordinary thing — is
not available, so the *new* file is the one that gets the speaking name.

## `.sandcastle/host.env` is the watcher's

Read by `src/env.mts` into `process.env` before `config.mts`'s body runs, and forwarded nowhere.
The tracker and its credentials, both notification sinks, and the optional overrides for
`config.mts`'s defaults.

Per checkout is the point. Two golems on one machine are now two clones with two `host.env`
files — a Jira project each, a Slack channel each, a Watchtower Project each — with nothing in a
shell profile that both of them would have to share. The shell still wins over the file, so
`SANDCASTLE_POLL_SECONDS=10 pnpm sandcastle` remains how you change one run without editing
anything.

## The rule is enforced, in both directions

`env.mts` refuses to start the process if a host-only key (`JIRA_`, `SLACK_`, `WATCHTOWER_`,
`SANDCASTLE_`) appears in `.sandcastle/.env`, or if a sandbox-only credential appears in
`host.env`. Both are fatal rather than warnings.

They fail for different reasons, and neither is visible downstream, which is what they have in
common. A tracker credential left in the sandbox's file is forwarded into the next container and
*nothing goes wrong* — the watcher works perfectly, which is precisely the problem. A sandbox
credential put in `host.env` never reaches the agent, and surfaces minutes later as
`ERR_PNPM_FETCH_401` deep in an install, or as an agent that appears to have ignored its tools.
A warning would be the wrong instrument for either: the watcher is usually started unattended,
and a line about a leaked credential scrolls past exactly like a line about a missing Slack
channel.

Prefixes on the host side, exact names on the sandbox side, because that is how the two sets are
actually shaped: every key the watcher reads is one of four families, and the sandbox's four
share nothing but their destination.

## Considered Options

**Keep one file and rely on the comments.** What we had. The comments were right and the
credentials went in anyway, because the file they warned about was the only file on offer.

**Keep the credentials in the shell profile, as the comments said.** Correct about the boundary
and wrong about the unit: `~/.zshrc` is per machine, and it makes the second golem impossible —
which is the request that prompted this.

**Load `.sandcastle/.env` into the host process too, and split by convention only.** Cheapest,
and it reintroduces exactly the hazard `slack.mts`'s hand-rolled single-key reader was written
to avoid: a sandbox credential in the host's environment can shadow the `gh` login that
`git push` and `gh pr create` run on.

**Put the split behind one file with two sections and a parser.** One place to look, and it
cannot work: the library reads the file itself, so any key we would have to hide from it has to
be in a different file.

**Warn instead of exiting.** See above — both failure modes are silent by construction, so a
warning is the one response guaranteed not to be read.

## Consequences

- **`slack.mts` loses its single-key reader.** It read one key at a time out of the sandbox's
  file specifically so that none of the rest could enter the host's environment. `host.env` has
  no such hazard — that is what the second guard is for — so it is plain `process.env` now, with
  an `import "./env.mts"` for its side effect, because the module reads at scope and does not
  import `config.mts`.
- **`config.mts` no longer imports only node builtins.** It imports `env.mts` first, for the
  side effect. The invariant it was protecting — one file you can read to know how a run is
  configured — now has two halves, and the import is the pointer between them.
- **Two tracked `.example` files.** `.env.example` and `host.env.example` are the real files
  with the values removed, so the setup path for golem number two is two copies and a fill-in.
  The root `.gitignore`'s `.env*` would have swallowed the first of them; `.sandcastle/.gitignore`
  is deeper and re-includes both.
- **An existing checkout breaks loudly on the first run after this.** Everything host-side is
  still in `.sandcastle/.env`, which is now a startup error naming the keys and the file to move
  them to. That is the intended migration: the alternative is a watcher that starts fine and
  keeps forwarding a Jira token.
- **A credential that has already been in the sandbox's file should be rotated.** The guard
  stops the next run, not the ones that already happened.
