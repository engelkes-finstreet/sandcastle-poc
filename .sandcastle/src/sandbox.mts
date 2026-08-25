// First, for its side effect: this module is what both container-launching entry
// points go through, and starting a container is the exact moment a host-side key
// left in .sandcastle/.env would be forwarded. env.mts refuses to let that run.
// smoke.mts reaches the guard only through here — it imports no config.
import "./env.mts";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";

// Sandbox wiring shared by both entry points — smoke.mts (health check) and
// main.mts (issue watcher). Every value here is coupled to .sandcastle/Dockerfile;
// if you change one, change the other.

// A pnpm store that belongs to the sandbox, not to your Mac. The host store is
// full of darwin-arm64 packages; a Linux container needs different binaries for
// esbuild/sharp/swc, and letting a container write into the store your local dev
// depends on is a bad trade for a few seconds of download.
// Created on first run and reused by every run after it. The sandbox path and
// package-import-method=copy are set by ENV in the Dockerfile — see the comment
// there for why copy is load-bearing.
const STORE_DIR = `${homedir()}/.cache/sandcastle-pnpm-store`;

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const HOST_NPMRC = `${REPO_ROOT}.npmrc`;
const CLAUDE_SETTINGS = `${REPO_ROOT}.claude/settings.json`;

// Marketplaces the CLI knows by name but whose source .claude/settings.json does
// not spell out, because Claude Code ships it. Anything else has to be declared
// in extraKnownMarketplaces or we cannot fetch it.
const BUILTIN_MARKETPLACE_SOURCES: Record<string, string> = {
  "claude-plugins-official": "anthropics/claude-plugins-official",
};

// The plugins a run installs, in full. An allowlist rather than a list of exceptions,
// because the two directions fail differently: a plugin the sandbox wants and does not
// get is an agent that quietly ignores this repo's conventions, while a plugin it gets
// and does not want can take the whole run down in setup, before the agent starts. The
// second is not hypothetical — enabling one personal plugin in .claude/settings.json
// broke every phase twice over, first on a clone the container cannot authenticate over
// SSH and then on one too large for the CLI's default timeout. Under a denylist that is
// what a local convenience costs by default; here a plugin nobody named cannot reach a
// container at all.
//
// The price is that this is a second edit: a plugin this repo's *runs* need has to be
// enabled in .claude/settings.json (for your own sessions, and so its marketplace
// source is declared) and named here. Two entries that change rarely is a cheap place
// to pay it.
//
// Deliberately absent: `playwright`, whose MCP server connects and then fails on first
// use because the image has no browsers, and `mattpocock-skills`, whose skills are for a
// person at a terminal — no prompt under .sandcastle/prompts loads one, and the review
// prompt carries its own two-axis structure and smell baseline inline precisely so a run
// does not depend on it.
const SANDBOX_PLUGINS = [
  "finstreet-dev@finstreet-plugins",
  "finstreet-fe@finstreet-plugins",
];

/**
 * The repo's .npmrc is gitignored, and a sandbox worktree is a checkout of
 * committed history — so the container gets a tree without it. The lockfile
 * still points @finstreet/* at npm.pkg.github.com (resolution URLs are baked
 * into it), but nothing supplies the matching auth line, and `pnpm install`
 * dies on ERR_PNPM_FETCH_401 several minutes in.
 *
 * So we carry the host's copy in ourselves. It is read here rather than
 * duplicated into a heredoc: the host file stays the single source of truth,
 * and a registry change on your Mac reaches the sandbox with no edit here.
 *
 * The file holds no secret — only a `${NPM_AUTH_TOKEN}` reference, which pnpm
 * expands inside the container from the key of that name in .sandcastle/.env.
 */
const npmrc = () => {
  if (!existsSync(HOST_NPMRC)) {
    throw new Error(
      `No .npmrc at ${HOST_NPMRC}. The sandbox copies the host's into the worktree to ` +
        `authenticate @finstreet/* against GitHub Packages; without it every run fails ` +
        `at install with a 401. Restore it from env.example or a teammate.`,
    );
  }
  return readFileSync(HOST_NPMRC, "utf8");
};

/**
 * Skills and MCP servers reach the agent through plugins, and .claude/settings.json
 * is tracked — so the worktree already says which ones this repo wants. Declaring
 * is not installing, though: a fresh container has no ~/.claude/plugins at all, and
 * nothing populates it. A real `claude --print` session runs to completion with zero
 * plugins, zero skills and zero MCP servers, which reads as an agent that ignored its
 * tools rather than as missing setup.
 *
 * Both steps below are needed. `claude plugin install` cannot resolve a marketplace
 * that was merely declared — the catalog has to be cloned first, or install fails with
 * `Plugin "x" not found in marketplace "y"` — and `marketplace update` does not see a
 * project-scoped declaration either, so we add each source explicitly.
 *
 * What to install comes from SANDBOX_PLUGINS; where its marketplaces live still comes
 * from settings.json, which is the file that declares them. A plugin this repo has
 * explicitly disabled there is a contradiction rather than a default, so it throws.
 */
const pluginCommands = () => {
  const settings = JSON.parse(readFileSync(CLAUDE_SETTINGS, "utf8")) as {
    enabledPlugins?: Record<string, boolean>;
    extraKnownMarketplaces?: Record<string, { source?: { repo?: string } }>;
  };

  const plugins = SANDBOX_PLUGINS;

  // Absent from enabledPlugins is fine — installing at user scope inside the container
  // enables it there. An explicit `false` is not: it says this repo turned the plugin
  // off while this file says a run needs it, and silently honouring either half would
  // leave an agent without a skill nobody noticed it had lost.
  const disabled = plugins.filter((id) => settings.enabledPlugins?.[id] === false);
  if (disabled.length > 0) {
    throw new Error(
      `${disabled.join(", ")} is named in SANDBOX_PLUGINS (src/sandbox.mts) but disabled in ` +
        `.claude/settings.json. Decide which is right: drop it from the sandbox list, or ` +
        `enable it there.`,
    );
  }

  const sources = [...new Set(plugins.map((id) => id.split("@")[1]))].map((name) => {
    const source =
      settings.extraKnownMarketplaces?.[name]?.source?.repo ??
      BUILTIN_MARKETPLACE_SOURCES[name];
    if (!source) {
      throw new Error(
        `Plugin marketplace "${name}" is needed by SANDBOX_PLUGINS (src/sandbox.mts) but has ` +
          `no source. Declare it under extraKnownMarketplaces in .claude/settings.json, so the ` +
          `sandbox can fetch its catalog.`,
      );
    }
    return source;
  });

  // One `&&` chain, not one hook per step: sandcastle runs onSandboxReady hooks with
  // `concurrency: "unbounded"`, so separate entries race each other. Fetching a catalog
  // and installing from it is strictly ordered — as separate hooks the install starts
  // first and dies on `Plugin "x" not found in marketplace "y"`, which reads as a broken
  // marketplace rather than as a race.
  //
  // The marketplace sources are public repos, so no credentials — unlike the npm registry.
  // Installs use user scope, so the container's own enabledPlugins land in its
  // ~/.claude/settings.json and cannot dirty the tracked one the agent might commit.
  // `marketplace add owner/repo` clones over SSH, and the container has no SSH key and
  // no github.com host key — so the clone dies on `Host key verification failed` and
  // takes the whole run with it, in setup, before the agent starts. Rewriting the
  // shorthand to HTTPS is enough: every marketplace here is a public repo.
  //
  // Insurance rather than load-bearing as things stand: SANDBOX_PLUGINS names only
  // finstreet-plugins, whose catalog is reachable, and the clone that failed this way was
  // claude-plugins-official's — which no allowlisted plugin comes from. Kept because the
  // first entry from any other marketplace brings the shorthand clone straight back, and
  // this failure lands in setup where it costs a whole run.
  //
  // Kept here rather than in the Dockerfile on purpose: it costs nothing per run and
  // needs no image rebuild, so a fresh clone of this repo works without one.
  // --add on both: they are two values of one key, and a plain `git config` would have
  // the second silently replace the first.
  const httpsOnly = `git config --global --add url."https://github.com/".insteadOf "git@github.com:" && ` +
    `git config --global --add url."https://github.com/".insteadOf "ssh://git@github.com/"`;

  return [
    httpsOnly,
    ...sources.map((source) => `claude plugin marketplace add ${source}`),
    ...plugins.map((id) => `claude plugin install ${id} -s user -y`),
  ].join(" && ");
};

export const sandbox = () => {
  mkdirSync(STORE_DIR, { recursive: true });

  // Image name defaults to `sandcastle:<repo dir>` — i.e. `sandcastle:sandcastle-poc`,
  // built by `pnpm sandcastle:build-image`.
  return docker({
    mounts: [{ hostPath: STORE_DIR, sandboxPath: "/home/agent/pnpm-store" }],
    env: {
      SANDCASTLE_NPMRC: npmrc(),
      // claude-plugins-official is a big repo and the CLI gives a marketplace clone
      // 120s by default, which it does not finish inside — `fatal: early EOF`, and
      // because the plugin chain is a startup command that failure kills the run in
      // setup. Nothing here is cached between runs, so every run pays this clone.
      CLAUDE_CODE_PLUGIN_GIT_TIMEOUT_MS: "600000",
    },
  });
};

// Run before the agent starts. The worktree is a fresh checkout, so node_modules
// is absent and has to be installed here. Deliberately NOT
// `copyToWorktree: ["node_modules"]`: the host tree's native packages are
// darwin-arm64, so a copied tree dies on the first command. The store mount is
// what keeps this off the network.
// These two entries run *concurrently* — sandcastle uses `concurrency: "unbounded"` for
// onSandboxReady hooks. That is fine here, because dependencies (npmrc → install, catalog
// → plugin install) live inside each entry as an `&&` chain. Anything order-dependent that
// gets split into two entries will fail intermittently, which is the worst way to fail.
export const startupCommands = [
  // The .npmrc must exist before pnpm resolves anything — see the comment on npmrc() above.
  // Writing it into the worktree costs nothing: .npmrc is gitignored, so it cannot end up in
  // a commit the agent makes.
  {
    command: `printf '%s\n' "$SANDCASTLE_NPMRC" > .npmrc && pnpm install --frozen-lockfile --prefer-offline`,
    timeoutMs: 900_000,
  },
  // Independent of the install, so it overlaps with it and costs no extra wall clock. The
  // finstreet-mcp server these plugins carry authenticates with FINSTREET_MCP_TOKEN from
  // .sandcastle/.env — without it the server is configured but never connects.
  { command: pluginCommands(), timeoutMs: 300_000 },
];
