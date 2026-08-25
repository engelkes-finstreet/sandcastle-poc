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

// Enabled for local development but pointless in here. The playwright plugin's MCP
// server connects fine and then fails on first use: the image has no browsers, and
// e2e is out of the sandbox's scope. Skipping it keeps the agent from being offered
// a tool it cannot use — .claude/settings.json stays the source of truth for your
// own sessions.
const SANDBOX_EXCLUDED_PLUGINS = ["playwright@claude-plugins-official"];

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
 * Derived from settings.json rather than hardcoded: enable a plugin there and the next
 * sandbox run picks it up, with no second list to forget. Costs ~10s and ~14MB per run.
 */
const pluginCommands = () => {
  const settings = JSON.parse(readFileSync(CLAUDE_SETTINGS, "utf8")) as {
    enabledPlugins?: Record<string, boolean>;
    extraKnownMarketplaces?: Record<string, { source?: { repo?: string } }>;
  };

  const plugins = Object.entries(settings.enabledPlugins ?? {})
    .filter(([id, enabled]) => enabled && !SANDBOX_EXCLUDED_PLUGINS.includes(id))
    .map(([id]) => id);

  const sources = [...new Set(plugins.map((id) => id.split("@")[1]))].map((name) => {
    const source =
      settings.extraKnownMarketplaces?.[name]?.source?.repo ??
      BUILTIN_MARKETPLACE_SOURCES[name];
    if (!source) {
      throw new Error(
        `Plugin marketplace "${name}" is enabled in .claude/settings.json but has no source. ` +
          `Add it under extraKnownMarketplaces there, so the sandbox can fetch its catalog.`,
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
  return [
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
    env: { SANDCASTLE_NPMRC: npmrc() },
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
