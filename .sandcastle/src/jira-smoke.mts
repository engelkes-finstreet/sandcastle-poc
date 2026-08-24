import { JIRA_BASE_URL, JIRA_PROJECT, LABEL, TRACKER } from "./config.mts";
import { describe, log } from "./shell.mts";
import { tracker } from "./tracker.mts";
import { jiraApi, jiraCredentials } from "./trackers/jira.mts";

// `pnpm sandcastle:jira-smoke` — the watcher's own startup, stopped after the
// first look at Jira.
//
// It boots what `pnpm sandcastle` boots and in the same order: this repo's
// config, the `gh` credential check the forge runs the moment it is imported,
// the tracker selection in tracker.mts, and the same `verify()` that would
// refuse to start the watcher. Then it asks Jira for the queue — the identical
// call the poll loop makes every two minutes — and for the project's newest
// issue, so that there is always a real ticket on screen to recognise.
//
// It boots the real thing rather than re-implementing it because a health check
// that takes its own path proves only that *its* path works. If this is green,
// `pnpm sandcastle` gets past startup and finds the same issues.
//
// Nothing here is simulated: every value it prints came off the wire from
// JIRA_BASE_URL a moment earlier. It also writes nothing — the three calls are
// all GETs, so it is safe against the production site and safe to re-run.
//
// The sandbox has its own smoke test (`pnpm sandcastle:smoke`) and the two do
// not overlap on purpose: that one runs *inside* the container, where these
// credentials deliberately do not exist.

if (TRACKER !== "jira") {
  console.error(
    `This is the Jira half of the health check, but SANDCASTLE_TRACKER is "${TRACKER}".\n` +
      `Run it as \`pnpm sandcastle:jira-smoke\`, which sets SANDCASTLE_TRACKER=jira for you.`,
  );
  process.exit(1);
}

const fail = (what: string, hint: string, error: unknown): never => {
  console.error(`\n✗ ${what}\n\n${describe(error)}\n\n${hint}\n`);
  process.exit(1);
};

log(`Jira smoke test — the watcher's intake against ${JIRA_BASE_URL}, project ${JIRA_PROJECT}.`);

// 1. The boot. Importing tracker.mts has already proved `gh` (the forge checks it
//    at import) and built the Jira adapter, which exits here if either credential
//    is missing. verify() is the watcher's own startup check, credentials proved
//    with a real call, and it prints who Jira says you are and which lifecycle
//    moments the transition map will fire.
await tracker.verify();

// 2. The queue, read through the port — byte for byte the call the poll loop
//    makes: `project = … AND labels = "Sandcastle" AND statusCategory != Done`,
//    oldest first. This is the answer to "would the watcher find anything?", and
//    an empty queue is a real answer, not a failure.
const queued = await tracker.queuedIssues().catch((error) =>
  fail(
    `The queue read failed, though the credentials were accepted.`,
    `The account can log in but something about the project or the query is wrong: check that\n` +
      `JIRA_PROJECT ("${JIRA_PROJECT}") is a project this account may browse, and that ${JIRA_BASE_URL}\n` +
      `is a Jira Cloud site — the adapter speaks REST v3 and the /search/jql endpoint.`,
    error,
  ),
);

log(`  queue: ${queued.length} issue(s) labelled "${LABEL}" and not Done`);
for (const issue of queued) log(`    ${tracker.issueRef(issue.key)} — ${issue.title}`);
if (!queued.length) log(`    (nothing queued — label an issue "${LABEL}" and it appears here)`);

// 3. The project's newest issue, labelled or not, so the output always carries a
//    ticket you can check against Jira in the browser. A key and a summary you
//    recognise is what tells you this is the *right* project rather than a
//    project. Same door as everything above: the adapter's own HTTP helper.
type Newest = {
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

const { auth } = jiraCredentials();
const jql = `project = "${JIRA_PROJECT}" ORDER BY created DESC`;
const newest = (
  (await jiraApi(
    auth,
    "GET",
    `/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}` +
      `&fields=summary,status,created,reporter,labels&maxResults=1`,
  ).catch((error) =>
    fail(
      `The queue read worked but the newest-issue read did not.`,
      `Odd, because it is the same endpoint with a different ORDER BY. The response body above is\n` +
        `Jira's own explanation.`,
      error,
    ),
  )) as Newest
).issues?.[0];

if (!newest) {
  log(`  newest issue: none — ${JIRA_PROJECT} is reachable but holds no issues at all`);
} else {
  const fields = newest.fields;
  log(`  newest issue: ${newest.key} — ${fields?.summary ?? "(no summary)"}`);
  log(`    status   ${fields?.status?.name ?? "unknown"}`);
  // Jira hands back `2026-08-24T18:02:11.000+0200`; the minute is all anyone reads.
  log(
    `    created  ${fields?.created?.replace("T", " ").slice(0, 16) ?? "sometime"}` +
      ` by ${fields?.reporter?.displayName ?? "someone"}`,
  );
  log(`    labels   ${fields?.labels?.length ? fields.labels.join(", ") : "none"}`);
  log(`    url      ${JIRA_BASE_URL}/browse/${newest.key}`);
}

log(`Jira is reachable, and ${JIRA_PROJECT} is the project the watcher would take work from.`);
