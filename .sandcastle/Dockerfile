FROM node:22-bookworm

# Install system dependencies.
# ca-certificates backs every TLS fetch (gh, the npm registries, Claude Code);
# jq backs the `gh ... --jq` queries in the prompt files.
RUN apt-get update && apt-get install -y \
  git \
  curl \
  jq \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Install GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
  | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
  | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
  && apt-get update && apt-get install -y gh \
  && rm -rf /var/lib/apt/lists/*

# Install pnpm. This repo is a single Next.js app (no pnpm workspace) with a
# pnpm-lock.yaml at lockfileVersion 9.0 and no package-lock.json — npm cannot
# install it.
#
# There is no `packageManager` field in package.json to pin against, so keep
# PNPM_VERSION in sync with the pnpm you use on the host; a lockfile written by
# a newer pnpm than the container's makes --frozen-lockfile fail.
ARG PNPM_VERSION=10.28.1
RUN npm install -g pnpm@${PNPM_VERSION}

# Chromium, for the walkthrough phase: an agent that logs into staging, drives a
# real browser to the pages a pull request touches, and photographs them. Every
# other phase is text-only and none of them pay for this at runtime — the layer is
# built once, and only `walkPages` in the Engine's `phases.ts` asks for the browser.
#
# Keep PLAYWRIGHT_VERSION in sync with @playwright/test in package.json, for the
# same reason PNPM_VERSION is pinned above and with a nastier failure mode: a
# playwright release pins exactly one chromium revision and looks for that revision
# and no other. A skew does not break this build — it breaks at first use, minutes
# into a run, with "Executable doesn't exist".
ARG PLAYWRIGHT_VERSION=1.58.2

# /ms-playwright rather than the default ~/.cache/ms-playwright. The install below
# runs as root (--with-deps is apt work), the agent runs as `agent`, and a browser
# under root's home is unreadable to it — so it goes somewhere neutral, and a+rX
# afterwards is what makes it readable rather than a chown per run. The path is
# also the one the official playwright images use, so tooling that assumes that
# convention finds the browser instead of downloading its own copy.
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npx --yes playwright@${PLAYWRIGHT_VERSION} install --with-deps chromium \
  && chmod -R a+rX /ms-playwright \
  && rm -rf /var/lib/apt/lists/*

# Build-args for UID/GID alignment: sandcastle docker build-image
# defaults these to the host user's UID/GID so image-built files
# and bind-mounted files share an owner without runtime chown.
ARG AGENT_UID=1000
ARG AGENT_GID=1000

# Rename the base image's "node" user to "agent" and align UID/GID.
RUN groupmod -o -g $AGENT_GID node && usermod -o -u $AGENT_UID -g $AGENT_GID -d /home/agent -m -l agent node
USER ${AGENT_UID}:${AGENT_GID}

# Install Claude Code CLI
RUN curl -fsSL https://claude.ai/install.sh | bash

# Add Claude and pnpm's global bin dir to PATH.
ENV PNPM_HOME="/home/agent/.local/share/pnpm"
ENV PATH="/home/agent/.local/bin:$PNPM_HOME:$PATH"

# The container is recreated per run, so `pnpm install` would start from a cold
# store every time. The Engine's `main.ts` bind-mounts a persistent Linux store at the path
# below — keep the two in sync:
#   /home/agent/pnpm-store  ←  ~/.cache/golem-pnpm-store
# Not the host's own store (~/Library/pnpm/store): that one is darwin-arm64 and
# is your local dev state.
#
# package-import-method=copy is load-bearing, not a preference. A bind-mounted
# store is a different device from the bind-mounted worktree, so pnpm's default
# (hardlink) is impossible — and rather than fail, pnpm silently abandons the
# configured store and builds a fresh one at <project>/.pnpm-store, downloading
# everything again. Telling it to copy makes it honour the mount.
ENV npm_config_store_dir="/home/agent/pnpm-store"
ENV npm_config_package_import_method="copy"

# The repo's .npmrc pulls @finstreet/* from GitHub Packages and expands
# ${NPM_AUTH_TOKEN} for it, so the `pnpm install` startup command fails with 401
# unless that token reaches the container. It arrives at *runtime*, from the
# NPM_AUTH_TOKEN key in .sandcastle/.env — never as a build ARG, which would bake
# the secret into a layer that `docker history` prints back.

WORKDIR /home/agent

# In worktree sandbox mode, Sandcastle bind-mounts the git worktree at /home/agent/workspace
# and overrides the working directory to /home/agent/workspace at container start.
# Structure your Dockerfile so that /home/agent/workspace can serve as the project root.
ENTRYPOINT ["sleep", "infinity"]
