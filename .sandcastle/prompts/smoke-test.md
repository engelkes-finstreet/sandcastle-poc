# Sandcastle smoke test

You are running inside a Sandcastle sandbox against **fs-fe-boilerplate** — a single-package
Next.js 16 app (App Router, Panda CSS, next-intl, next-auth), not a monorepo. There is no
`apps/`, no `packages/`, no turbo and no database.

This is a smoke test, not a coding task. Do not implement features, fix bugs, refactor, or
install dependencies. Your only job is to prove that the sandbox can see and modify this
repository and verify it, then report what you found.

## Environment snapshot

The block below is expanded inside the sandbox before you start — treat it as ground truth
about where you are.

- Working directory: !`pwd`
- Branch: !`git rev-parse --abbrev-ref HEAD`
- Tracked files: !`git ls-files | wc -l`
- Top-level entries: !`ls -A`
- Git status (expected: empty apart from gitignored install output): !`git status --porcelain | head -20`
- Recent commits: !`git log --oneline -3`
- Toolchain: !`node --version; git --version; (claude --version || true); (pnpm --version || echo "pnpm: not installed"); (jq --version || true)`
- Registry config: !`cat .npmrc 2>&1 || echo ".npmrc: MISSING"`
- Credentials reaching the container (names only): !`env | grep -oE '^(NPM_AUTH_TOKEN|CLAUDE_CODE_OAUTH_TOKEN|SLACK_BOT_TOKEN|FINSTREET_MCP_TOKEN)=' | sed 's/=$/: set/' || echo "none set"`
- Tracker credential (expected absent — the host feeds issue text into the prompts): !`env | grep -q '^GH_TOKEN=' && echo "GH_TOKEN: SET, and it should not be" || echo "GH_TOKEN: absent, as designed"`
- Installed packages: !`ls node_modules/.pnpm 2>/dev/null | wc -l`
- Native binaries: !`ls node_modules/.pnpm 2>/dev/null | grep -ciE "linux" | sed 's/^/linux: /'; ls node_modules/.pnpm 2>/dev/null | grep -ciE "darwin" | sed 's/^/darwin: /'`

Two things about this environment are expected and are **not** failures:

- The sandbox is a checkout of committed history, so anything uncommitted on the host is
  invisible here. `.sandcastle/` itself may be absent for that reason.
- `.npmrc` is untracked on the host and was written into this worktree by a startup command
  before you began. It is supposed to be there, and its `${NPM_AUTH_TOKEN}` is a reference
  expanded by pnpm at runtime, not a leaked secret.

## Checks

Run all eleven. Record each as PASS or FAIL with the concrete evidence (a count, a path, a
command's output) — never a bare assertion. A FAIL is a useful result: report it and keep
going instead of trying to fix it.

1. **Repo is complete.** Every tracked file is readable, and none are missing from the
   worktree. Something like `git ls-files -z | xargs -0 -n 100 cat > /dev/null` surfaces
   unreadable files; report the count of tracked files and any path that failed.
2. **Expected structure is present.** `package.json`, `pnpm-lock.yaml`, `next.config.ts`,
   `panda.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `playwright.config.ts` and the
   `src/app/`, `messages/`, `public/`, `e2e/` directories all exist. Report the number of
   route files under `src/app` and the locale files in `messages/`. List what you actually
   found rather than what you expected.
3. **Reads work.** Read `package.json`, one page or component under `src/app/`, and one file
   under `messages/`. Quote one real line from each, with its `path:line`.
4. **Writes work.** Create `scratch-smoke.txt` at the repo root, append a second line to it,
   read it back, confirm the contents, then delete it. Confirm `git status --porcelain` no
   longer mentions it.
5. **Git works.** Report the current branch, `git config user.name` / `user.email` as
   configured in the sandbox, and confirm the branch is a Sandcastle working branch rather
   than `main`.
6. **Install is complete and authenticated.** `pnpm install` already ran before you started,
   against a pnpm store mounted from the host. Confirm all four:
   - `node_modules/` exists at the repo root;
   - `node_modules/@finstreet/` contains the private packages (`forms`, `ui`,
     `secure-fetch`) — these come from GitHub Packages, so their presence is the proof that
     `.npmrc` plus `NPM_AUTH_TOKEN` reached the container;
   - `styled-system/` exists, which means the `prepare` lifecycle script (`panda codegen`)
     ran as part of the install;
   - `pnpm install --frozen-lockfile --offline` is a no-op the second time — report its
     summary line, and say what it wants to install if it is not.
7. **Native binaries match the platform.** The host that built the lockfile is macOS; you are
   on Linux. Confirm the installed tree is the Linux one: `node_modules/.pnpm` should contain
   `*linux*` packages and no `*darwin*` ones, and `pnpm exec next --version`,
   `pnpm exec panda --version` and `pnpm exec tsc --version` should all print a version
   rather than fail with an exec-format error. Report the versions.
8. **The verification gate runs.** This repo has no unit or integration test suite, so the
   gate an agent has to pass is typecheck, lint and build. Run all three and report the
   outcome and rough duration of each:
   - `pnpm exec tsc --noEmit` — expected clean;
   - `pnpm lint` — expected 0 errors; warnings are fine, say how many;
   - `pnpm build` — expected to reach Next's route table.

   Quote any error verbatim. That is the most valuable thing this whole smoke test can tell
   us. The Playwright suite in `e2e/` is deliberately **out of scope**: it needs browsers
   that are not in this image and a running server.
9. **Skills and MCP are wired.** Startup commands installed the plugins that
   `.claude/settings.json` enables — that file only *declares* them, and nothing installs
   them on its own, so skills and MCP tools exist here only if those commands worked.
   Report all three:
   - `claude plugin list` — every plugin and whether it is enabled;
   - the skills on disk: `ls -d ~/.claude/plugins/cache/*/*/*/skills/*/ | wc -l` and their
     names;
   - `claude mcp list` — every server with its health line. `finstreet-mcp` is the one that
     matters: it must say `✔ Connected`. Anything else means `FINSTREET_MCP_TOKEN` did not
     reach the container, and it is worth reporting loudly, because a configured-but-dead
     MCP server is indistinguishable from an agent that ignored its tools.
10. **Skills and MCP actually work.** Check 9 proves they are installed and reachable; this one
    proves you can use them. Two parts, and both belong in the report verbatim enough that a
    reader can tell the difference between a real answer and a plausible guess:
    - **Call an MCP tool.** Invoke `list_components` on the `finstreet-mcp` server. Report the
      number of components it returned and the first ten names exactly as the server spelled
      them. If the tool is not in your tool list at all, say so — that is a different failure
      from a tool that errored, and the distinction matters.
    - **Use the `form` skill.** Load the `finstreet-fe:form` skill and summarise how this repo
      builds a form as a numbered list of steps, a few words each — no code. Name the skill
      file you actually read, with its path. Do not answer from general React knowledge: if the
      skill did not load, say that instead, because an answer that merely sounds right is worse
      than a reported failure here.
11. **Write-through.** Write your results to `SMOKE-REPORT.md` at the repo root, as a markdown
    table of check / result / evidence, plus a short notes section for anything surprising
    (missing tools, permission errors, unexpected git state). Check 10's two answers go into
    the report in full, not summarised away into the table.

## Rules

- **Do not commit anything, and do not create or switch branches.** `SMOKE-REPORT.md` must be
  left uncommitted — the host reads it out of the preserved worktree, and that is how the
  write-through check is verified.
- Leave `scratch-smoke.txt` deleted; `SMOKE-REPORT.md` is the only file you leave behind.
  `node_modules`, `styled-system`, `.next` and other gitignored install or build output do
  not count as files you left behind.
- Do not try to repair a failed install, a type error, a lint error or a broken build — the
  checks above are the only commands in scope. Report failures; don't fix them.
- Do not print the value of any token or secret, in the report or to stdout. Saying that a
  variable is set, or that a server connected, is all checks 6 and 9 need; the value is never
  useful. `claude mcp list` prints the MCP URL — redact any token that shows up inside it.
- Do not talk to GitHub at all — no issue or PR reads, no `gh` calls. The container carries no
  tracker credential by design, so there is nothing to prove by trying.

## Done

Print the same table you wrote to `SMOKE-REPORT.md` to stdout, then output the completion
signal on its own line:

<promise>COMPLETE</promise>
