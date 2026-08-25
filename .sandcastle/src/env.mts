import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// The two env files, and the rule that keeps them apart.
//
// `.sandcastle/.env` is the **sandbox's** file. Its name is not ours to choose:
// @ai-hero/sandcastle resolves it as `join(repoDir, ".sandcastle", ".env")` with
// no option to point it elsewhere, and forwards *every key listed in it* into the
// container — taking the host's value for a key left blank. So that file is a
// declaration of what the agent gets to see, and nothing else may live there.
//
// `.sandcastle/host.env` is the **watcher's** file, read here and never
// forwarded. Tracker credentials, the two notification sinks, and the knobs in
// config.mts. It is where per-checkout configuration goes, which is what makes
// more than one golem on one machine possible: two clones, two host.env files,
// two Jira projects and two Slack channels, and nothing in a shell profile that
// both of them would have to share.
//
// The shell still wins over both. A key already in the environment is left
// alone, so `SANDCASTLE_POLL_SECONDS=10 pnpm sandcastle` is still how you
// override one run without editing anything.
//
// Imported for its side effect, first thing in config.mts — every read of
// process.env in this codebase happens at module scope below that import, so the
// file has to be in the environment before config.mts's own body runs. Also first
// in slack.mts, which reads at scope without importing config, and in sandbox.mts,
// so that the guards below run before anything starts a container.

const SANDCASTLE_DIR = new URL("../", import.meta.url);

/** The sandbox's file. Read here only to police it — never loaded into this process. */
const SANDBOX_ENV = fileURLToPath(new URL(".env", SANDCASTLE_DIR));

/** The watcher's file. */
const HOST_ENV = fileURLToPath(new URL("host.env", SANDCASTLE_DIR));

/** The same paths as a human would quote them, for the messages that name them. */
export const SANDBOX_ENV_REF = ".sandcastle/.env";
export const HOST_ENV_REF = ".sandcastle/host.env";

/**
 * `KEY=value` lines, `#` comments, blank lines, and matching quotes stripped —
 * the same shape @ai-hero/sandcastle's own parser accepts, deliberately, so that
 * a line moved from one file to the other means the same thing in both.
 */
const parse = (file: string): Record<string, string> => {
  const vars: Record<string, string> = {};
  if (!existsSync(file)) return vars;

  for (const line of readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    const raw = trimmed.slice(eq + 1).trim();
    const quoted = raw.length >= 2 && (raw[0] === '"' || raw[0] === "'") && raw.at(-1) === raw[0];
    vars[key] = quoted ? raw.slice(1, -1) : raw;
  }
  return vars;
};

/**
 * Keys that belong to the host and must never be listed in the sandbox's file.
 * Prefixes rather than an exact list: the point is that a *new* `JIRA_` or
 * `SLACK_` key added later is covered without anyone remembering to come back
 * here, and every key the watcher itself reads already starts with one of these.
 */
const HOST_ONLY = ["JIRA_", "SLACK_", "WATCHTOWER_", "SANDCASTLE_"];

const isHostOnly = (key: string) => HOST_ONLY.some((prefix) => key.startsWith(prefix));

/**
 * The other direction: credentials that only mean anything *inside* the
 * container. Exact names rather than prefixes, because these four share no shape
 * — they are the agent's login, the registry pnpm authenticates against, and the
 * MCP server the plugins carry.
 *
 * Listing one in host.env is not a leak, but it is a silent misconfiguration: the
 * key never reaches the container, and what you see instead is
 * ERR_PNPM_FETCH_401 nine minutes into an install, or an agent that looks like it
 * ignored its tools. Cheaper to say so here.
 */
const SANDBOX_ONLY = [
  "CLAUDE_CODE_OAUTH_TOKEN",
  "ANTHROPIC_API_KEY",
  "NPM_AUTH_TOKEN",
  "FINSTREET_MCP_TOKEN",
];

// The rule, enforced rather than documented. A tracker credential in the sandbox's
// file is forwarded into a container on the next run, and nothing downstream can
// tell that it happened — the watcher works perfectly, which is the problem. It is
// fatal rather than a warning because the watcher is usually started unattended,
// and a warning about a leaked credential scrolls past exactly like one about a
// missing Slack channel.
const misplaced = Object.keys(parse(SANDBOX_ENV)).filter(isHostOnly);

if (misplaced.length > 0) {
  console.error(
    `${misplaced.join(", ")} ${misplaced.length === 1 ? "is" : "are"} in ${SANDBOX_ENV_REF}, ` +
      `and every key in that file is forwarded into the sandbox container.\n` +
      `Move ${misplaced.length === 1 ? "it" : "them"} to ${HOST_ENV_REF}, which the watcher ` +
      `reads on the host and never forwards. If a credential has been sitting there, rotate it.`,
  );
  process.exit(1);
}

const hostVars = parse(HOST_ENV);
const stranded = Object.keys(hostVars).filter((key) => SANDBOX_ONLY.includes(key));

if (stranded.length > 0) {
  console.error(
    `${stranded.join(", ")} ${stranded.length === 1 ? "is" : "are"} in ${HOST_ENV_REF}, which the ` +
      `watcher reads on the host and never forwards — so ${stranded.length === 1 ? "it" : "they"} ` +
      `will not reach the agent.\nMove ${stranded.length === 1 ? "it" : "them"} to ` +
      `${SANDBOX_ENV_REF}, the file the container is given.`,
  );
  process.exit(1);
}

// The shell wins: a key already set is configuration for this one run, and the
// file is the checked-out default underneath it.
for (const [key, value] of Object.entries(hostVars)) {
  if (value && process.env[key] === undefined) process.env[key] = value;
}
