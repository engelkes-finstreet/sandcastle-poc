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

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const HOST_NPMRC = `${REPO_ROOT}.npmrc`;

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
export const startupCommands = [
  // Must precede the install — see the comment on npmrc() above. Writing it into
  // the worktree costs nothing: .npmrc is gitignored, so it cannot end up in a
  // commit the agent makes.
  { command: `printf '%s\n' "$SANDCASTLE_NPMRC" > .npmrc` },
  {
    command: "pnpm install --frozen-lockfile --prefer-offline",
    timeoutMs: 900_000,
  },
];
