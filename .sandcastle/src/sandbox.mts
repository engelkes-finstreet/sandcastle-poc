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

/**
 * Where a walkthrough writes its screenshots inside the container. Deliberately not
 * under /home/agent/workspace: the worktree is git's, and anything the agent leaves
 * there is either swept into a commit by the next run's rescue or deleted with the
 * worktree when sandcastle finds it clean. A directory of its own, bind-mounted from
 * the host, is neither — the PNG is on host disk the moment it is saved.
 *
 * The host half is `shotsHostDir` in config.mts.
 */
export const SHOTS_SANDBOX_DIR = "/home/agent/shots";

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const HOST_NPMRC = `${REPO_ROOT}.npmrc`;

// The application's own environment: what `next dev` needs to boot and what a login
// against staging needs to succeed. Both are gitignored, so both are absent from a
// sandbox worktree for exactly the reason .npmrc is — see appEnv() below for the
// rule about which phase is allowed to be handed them.
const HOST_APP_ENV = `${REPO_ROOT}.env`;
const HOST_E2E_ENV = `${REPO_ROOT}.env.e2e`;
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
// Deliberately absent: `mattpocock-skills`, whose skills are for a person at a terminal
// — no prompt under .sandcastle/prompts loads one, and the review prompt carries its own
// two-axis structure and smell baseline inline precisely so a run does not depend on it.
//
// `playwright` used to be listed here as absent too, because its MCP server connects and
// then fails on first use against an image with no browsers. The image has chromium now,
// so it moved to PLAYWRIGHT below rather than into this list: one phase needs a browser
// and four do not, and a plugin every phase installs is a plugin every phase can be
// broken by.
const SANDBOX_PLUGINS = [
  "finstreet-dev@finstreet-plugins",
  "finstreet-fe@finstreet-plugins",
];

/**
 * The browser, for the one phase that drives one. Asked for per phase rather than
 * added to the list above — see the note there.
 *
 * Its MCP server carries its own playwright, which pins its own chromium revision;
 * the image pins one too (PLAYWRIGHT_VERSION in the Dockerfile). When those agree the
 * browser is already on disk and costs nothing. When they drift the server downloads
 * the revision it wants at first use, which is slow but works — so a skew shows up as
 * a long first screenshot rather than as a dead phase.
 */
export const PLAYWRIGHT = "playwright@claude-plugins-official";

/**
 * What one phase needs from its container over and above what every phase gets.
 * Declared once by the phase and handed to both `sandbox` and `startupCommands`, so
 * the environment a container is built with and the commands run inside it cannot
 * disagree about what that phase was supposed to have.
 */
export type SandboxNeeds = {
  /** Plugins beyond SANDBOX_PLUGINS. */
  readonly plugins?: readonly string[];
  /**
   * Carry the host's application environment in, so `next dev` boots and a login
   * reaches a real backend.
   */
  readonly appEnv?: boolean;
  /**
   * A host directory to expose at SHOTS_SANDBOX_DIR, for a phase that produces files
   * the host has to read back after the container is gone.
   */
  readonly shotsHostDir?: string;
};

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
 * The host's application environment, carried in the same way and for the same
 * reason as .npmrc: the file is gitignored, a sandbox worktree is a checkout of
 * committed history, and without it `next dev` boots without a backend to talk to.
 *
 * **This is the one place a container is handed a credential that is not its own,
 * and it is deliberate.** AUTH_SECRET, HMAC_SECRET and the two API base URLs are
 * how the walkthrough reaches a real login; E2E_TEST_* is who it logs in as. They
 * are staging, throwaway, and rotatable, which is the whole basis on which this is
 * acceptable — a production value in .env turns every walkthrough container into a
 * place production credentials have been. Nothing enforces that but this comment.
 *
 * It bypasses env.mts's two-file rule rather than breaking it. That rule is about
 * keys in .sandcastle/.env, which are forwarded to *every* container; this is a file
 * read at the moment one phase is built, and only the phase that asks for it. The
 * rule it does keep is the one that matters: no tracker credential, ever — the
 * walkthrough talks to the application, never to GitHub or Jira.
 *
 * Missing files are a warning, never a throw. An absent .env means the walkthrough
 * will not get a page to photograph and will say so on the pull request, which is a
 * far better failure than a watcher that will not start.
 */
const appEnv = () => {
  const read = (path: string, what: string) => {
    if (existsSync(path)) return readFileSync(path, "utf8");
    console.warn(
      `  WARNING: no ${path}. The walkthrough phase carries it into the container to ${what}; ` +
        `without it the phase will report that it could not reach the application.`,
    );
    return "";
  };

  return {
    SANDCASTLE_APP_ENV: read(HOST_APP_ENV, "boot the dev server against staging"),
    SANDCASTLE_E2E_ENV: read(HOST_E2E_ENV, "know which test user to log in as"),
  };
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
const pluginCommands = (plugins: readonly string[]) => {
  const settings = JSON.parse(readFileSync(CLAUDE_SETTINGS, "utf8")) as {
    enabledPlugins?: Record<string, boolean>;
    extraKnownMarketplaces?: Record<string, { source?: { repo?: string } }>;
  };

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

export const sandbox = (needs: SandboxNeeds = {}) => {
  mkdirSync(STORE_DIR, { recursive: true });

  // Created here rather than left to the container: a bind mount whose host side does
  // not exist yet is a directory docker makes, owned by root, that the agent then
  // cannot write a single screenshot into.
  if (needs.shotsHostDir) mkdirSync(needs.shotsHostDir, { recursive: true });

  // Image name defaults to `sandcastle:<repo dir>` — i.e. `sandcastle:sandcastle-poc`,
  // built by `pnpm sandcastle:build-image`.
  return docker({
    mounts: [
      { hostPath: STORE_DIR, sandboxPath: "/home/agent/pnpm-store" },
      ...(needs.shotsHostDir
        ? [{ hostPath: needs.shotsHostDir, sandboxPath: SHOTS_SANDBOX_DIR }]
        : []),
    ],
    env: {
      SANDCASTLE_NPMRC: npmrc(),
      // claude-plugins-official is a big repo and the CLI gives a marketplace clone
      // 120s by default, which it does not finish inside — `fatal: early EOF`, and
      // because the plugin chain is a startup command that failure kills the run in
      // setup. Nothing here is cached between runs, so every run pays this clone.
      CLAUDE_CODE_PLUGIN_GIT_TIMEOUT_MS: "600000",
      // Only for the phase that asked. Every other container is built without these
      // keys in its environment at all, which is a stronger statement than a phase
      // that has them and does not read them.
      ...(needs.appEnv ? appEnv() : {}),
    },
  });
};

// Run before the agent starts. The worktree is a fresh checkout, so node_modules
// is absent and has to be installed here. Deliberately NOT
// `copyToWorktree: ["node_modules"]`: the host tree's native packages are
// darwin-arm64, so a copied tree dies on the first command. The store mount is
// what keeps this off the network.
// The entries run *concurrently* — sandcastle uses `concurrency: "unbounded"` for
// onSandboxReady hooks. That is fine here, because dependencies (npmrc → install, catalog
// → plugin install) live inside each entry as an `&&` chain, and the env files below are
// independent of both. Anything order-dependent that gets split into two entries will fail
// intermittently, which is the worst way to fail.
export const startupCommands = (needs: SandboxNeeds = {}) => [
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
  { command: pluginCommands([...SANDBOX_PLUGINS, ...(needs.plugins ?? [])]), timeoutMs: 300_000 },
  // Same trick as .npmrc, same safety: `.env*` is gitignored, so neither file can end up
  // in a commit. Only for the phase that asked for it — see appEnv().
  ...(needs.appEnv
    ? [
        {
          command:
            `printf '%s\n' "$SANDCASTLE_APP_ENV" > .env && ` +
            `printf '%s\n' "$SANDCASTLE_E2E_ENV" > .env.e2e`,
          timeoutMs: 30_000,
        },
      ]
    : []),
];
