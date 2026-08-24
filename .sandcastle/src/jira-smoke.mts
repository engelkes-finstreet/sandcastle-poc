import { JIRA_BASE_URL, JIRA_PROJECT } from "./config.mts";
import { describe, log } from "./shell.mts";
import { jiraApi, jiraCredentials } from "./trackers/jira.mts";

// `pnpm sandcastle:jira-smoke` — can this machine see the Jira project the
// factory would take work from? Three questions, in the order they can fail,
// each one the prerequisite of the next: are the credentials there and accepted,
// is the project visible to that account, and does a real issue come back. The
// last one prints, because a key and a summary you recognise is the only proof
// that answers "the *right* project" rather than "a project".
//
// It writes nothing. Everything here is a GET, so it is safe against a
// production site and safe to run in a loop while you sort a token out — which
// is the point: run it before starting the watcher, and before blaming the
// watcher for an empty queue.
//
// The sandbox has its own smoke test (`pnpm sandcastle:smoke`, prompts/
// smoke-test.md) and the two do not overlap on purpose. That one runs *inside*
// the container, where these credentials deliberately do not exist.

const { email, auth } = jiraCredentials();
const call = (method: string, path: string) => jiraApi(auth, method, path);

/**
 * Every failure here is a configuration failure, so each one says which of the
 * three questions failed and what to do about it, rather than printing a stack
 * at somebody who has just pasted a token into the wrong shell.
 */
const fail = (what: string, hint: string, error: unknown): never => {
  console.error(`\n✗ ${what}\n\n${describe(error)}\n\n${hint}\n`);
  process.exit(1);
};

type Me = { displayName?: string; emailAddress?: string };
type Project = { name?: string; projectTypeKey?: string; lead?: { displayName?: string } };
type Found = {
  issues?: {
    key: string;
    fields?: {
      summary?: string;
      status?: { name?: string };
      created?: string;
      reporter?: { displayName?: string };
      labels?: string[];
    };
  }[];
};

/** `2026-08-24T18:02:11.000+0200` → `2026-08-24 18:02`, which is all anyone reads. */
const stamp = (created?: string) => created?.replace("T", " ").slice(0, 16) ?? "sometime";

log(`Jira smoke test — ${JIRA_BASE_URL}, project ${JIRA_PROJECT}`);

// 1. The credentials, proved rather than assumed. This is the same call the
//    watcher's verify() makes at startup, against the same endpoint.
const me = (await call("GET", "/rest/api/3/myself").catch((error) =>
  fail(
    `${JIRA_BASE_URL} rejected the credentials for ${email}.`,
    `Check JIRA_EMAIL and JIRA_API_TOKEN in *this* shell (\`env | grep JIRA_\`). Tokens are minted at\n` +
      `id.atlassian.com → Security → API tokens, and they expire. A 401 means the pair is wrong; a 403\n` +
      `usually means the token is fine but the account is not allowed onto this site.`,
    error,
  ),
)) as Me;
log(`  1/3  credentials   authenticated as ${me.displayName ?? "someone"} <${me.emailAddress ?? email}>`);

// 2. The project itself, which is a different permission from being logged in:
//    an account can hold a valid token and still not be allowed to browse ESCB.
const project = (await call("GET", `/rest/api/3/project/${encodeURIComponent(JIRA_PROJECT)}`).catch(
  (error) =>
    fail(
      `${me.displayName ?? email} cannot see a project called ${JIRA_PROJECT}.`,
      `A 404 here means either the key is wrong — set JIRA_PROJECT if the factory should watch another\n` +
        `project — or the account lacks "Browse Projects" on it, which looks identical from outside.`,
      error,
    ),
)) as Project;
log(
  `  2/3  project       ${JIRA_PROJECT} — "${project.name ?? "unnamed"}"` +
    `${project.projectTypeKey ? ` (${project.projectTypeKey})` : ""}` +
    `${project.lead?.displayName ? `, lead ${project.lead.displayName}` : ""}`,
);

// 3. A real issue, read the way the watcher reads its queue — the same endpoint
//    and the same `project = …` clause, only ordered newest-first instead of
//    oldest, and unfiltered by the label so that an empty queue still prints
//    something you can recognise.
const jql = `project = "${JIRA_PROJECT}" ORDER BY created DESC`;
const found = (await call(
  "GET",
  `/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}` +
    `&fields=summary,status,created,reporter,labels&maxResults=1`,
).catch((error) =>
  fail(
    `The search for the newest issue in ${JIRA_PROJECT} failed.`,
    `The credentials and the project are both fine, so this is the query or the site: check that\n` +
      `${JIRA_BASE_URL} is a Jira Cloud site (this uses REST v3 and the /search/jql endpoint), and\n` +
      `that "${JIRA_PROJECT}" needs no quoting beyond what is here.`,
    error,
  ),
)) as Found;

const newest = found.issues?.[0];
if (!newest) {
  log(`  3/3  newest issue  none — ${JIRA_PROJECT} is reachable but holds no issues at all`);
  log(`Jira is reachable. Create an issue in ${JIRA_PROJECT} and run this again to see it here.`);
} else {
  const fields = newest.fields;
  log(`  3/3  newest issue  ${newest.key} — ${fields?.summary ?? "(no summary)"}`);
  console.log(`
       status    ${fields?.status?.name ?? "unknown"}
       created   ${stamp(fields?.created)} by ${fields?.reporter?.displayName ?? "someone"}
       labels    ${fields?.labels?.length ? fields.labels.join(", ") : "none"}
       url       ${JIRA_BASE_URL}/browse/${newest.key}
`);
  log(`Jira is reachable, and ${JIRA_PROJECT} is the project the watcher would take work from.`);
}
