import { existsSync, readFileSync } from "node:fs";
import {
  AWAITING_LABEL,
  JIRA_API_TOKEN,
  JIRA_BASE_URL,
  JIRA_EMAIL,
  JIRA_PROJECT,
  JIRA_SUBTASKS,
  JIRA_SUBTASKS_REF,
  JIRA_TRANSITIONS,
  JIRA_TRANSITIONS_REF,
  LABEL,
  REVISION_LABEL,
} from "../config.mts";
import { describe, log } from "../shell.mts";
import type { Moment, Tracker } from "../tracker.mts";
import type { Issue, Tracked } from "../types.mts";

// The Jira adapter: SANDCASTLE_TRACKER=jira, labels-first. Work is a Jira issue
// wearing the `Sandcastle` label, found by JQL; the watcher's state is mirrored
// with the same three label strings the GitHub adapter uses, which Jira brings
// into existence on first use — there is deliberately no ensure-labels step.
// Everything else about an issue's life stays on GitHub: the branch, the plan
// pull request, approve/revise/abandon. Jira's development panel links the
// branch and pull request by itself, because the key appears bare — `ESCB-123`,
// never `#ESCB-123` — in the branch name, the PR title and every commit ref.
//
// Write-back is thin: links and state, never prose. A comment when the plan is
// posted (the PR link), a one-liner when the issue ships or the watcher lets
// go, and the label swaps. Jira has no `Closes` clause, so unlike on GitHub the
// `shipped` moment does real work here.
//
// On top of the labels sits the transition map: a committed file naming, per
// moment, a Jira transition to fire. It ships empty, so labels-first is still
// the behaviour until a team fills it in — see `readTransitionMap` below.
//
// Beside it sits the subtask rule, which answers a different question: given a
// story that is split into a frontend subtask and a backend one, which of them is
// *this* repository's work. The label goes on the story, the golem takes its own
// slice of it, and a story whose slice belongs to another repository is left in
// the queue for that repository's golem — see `readSubtaskRule` and `scopeOf`.
//
// Credentials are basic auth against the REST v3 API — JIRA_EMAIL plus a
// personal API token — read from the host shell and never from
// .sandcastle/.env, because every key in that file is forwarded into the
// container and no tracker credential may enter the sandbox. Best-effort
// writes degrade to a warning, exactly like the GitHub adapter: losing a
// comment or a label swap is not worth losing a run.

// ------------------------------------------------------------------ the API

/**
 * One Jira REST call. Errors carry the method, path and response body — never
 * the credentials — and 4xx bodies are included because Jira puts the actual
 * reason there ("The issue no longer exists", a JQL parse error) while the
 * status line says only 400.
 *
 * Exported for the Jira smoke test, which is the one other thing that talks to
 * this site and should reach it through the same door — same headers, same error
 * text — so that what it proves is what the watcher will do.
 */
export const jiraApi = async (
  auth: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<unknown> => {
  const response = await fetch(`${JIRA_BASE_URL}${path}`, {
    method,
    headers: {
      authorization: `Basic ${auth}`,
      accept: "application/json",
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    throw new Error(
      `Jira ${method} ${path.split("?")[0]} failed: HTTP ${response.status}${detail ? ` — ${detail}` : ""}`,
    );
  }
  return response.status === 204 ? undefined : response.json();
};

// -------------------------------------------------- ADF, in both directions

/**
 * Jira's descriptions and comments arrive as Atlassian Document Format — a JSON
 * tree, not text. The prompts need words, so this flattens it: lossy by design,
 * keeping the text, the list shape, code fences and link targets, and dropping
 * everything else. An unknown node contributes its children, so a new ADF node
 * type degrades to its text rather than to a hole in the issue.
 */
type AdfNode = {
  type?: string;
  version?: number;
  text?: string;
  content?: AdfNode[];
  marks?: { type: string; attrs?: Record<string, string> }[];
  attrs?: { text?: string; shortName?: string; url?: string; level?: number };
};

const inlineText = (node: AdfNode): string => {
  switch (node.type) {
    case "text":
      return node.text ?? "";
    case "hardBreak":
      return "\n";
    case "mention":
    case "status":
      return node.attrs?.text ?? "";
    case "emoji":
      return node.attrs?.shortName ?? "";
    case "inlineCard":
      return node.attrs?.url ?? "";
    default:
      return (node.content ?? []).map(inlineText).join("");
  }
};

const blockText = (node: AdfNode): string => {
  const children = node.content ?? [];
  switch (node.type) {
    case "paragraph":
    case "heading":
      return inlineText(node);
    case "codeBlock":
      return "```\n" + inlineText(node) + "\n```";
    case "blockquote":
      return children.map(blockText).join("\n\n").split("\n").map((line) => `> ${line}`).join("\n");
    case "bulletList":
    case "orderedList":
      return children.map((item) => `- ${(item.content ?? []).map(blockText).join(" ")}`).join("\n");
    case "rule":
      return "---";
    case "table":
      return children
        .map((row) => (row.content ?? []).map((cell) => (cell.content ?? []).map(blockText).join(" ")).join(" | "))
        .join("\n");
    case "mediaGroup":
    case "mediaSingle":
      return "[attachment]";
    default:
      return children.map(blockText).join("\n\n");
  }
};

const adfToText = (doc: AdfNode | null | undefined): string =>
  (doc?.content ?? []).map(blockText).filter(Boolean).join("\n\n").trim();

/**
 * The other direction, for the little the adapter writes: paragraphs of plain
 * text, with at most one trailing link. Deliberately no markdown conversion —
 * write-back is links and state, and the one multi-paragraph write (`release`,
 * whose prose the watcher composes) is readable as plain text.
 */
const paragraph = (text: string, link?: string): AdfNode => ({
  type: "paragraph",
  content: [
    // ADF text nodes must not contain newlines, so single line breaks inside a
    // paragraph become hardBreak nodes.
    ...text.split("\n").flatMap((line, i): AdfNode[] => [
      ...(i > 0 ? [{ type: "hardBreak" }] : []),
      ...(line ? [{ type: "text", text: line }] : []),
    ]),
    ...(link
      ? [
          { type: "text", text: " " },
          { type: "text", text: link, marks: [{ type: "link", attrs: { href: link } }] },
        ]
      : []),
  ],
});

const adfDoc = (paragraphs: AdfNode[]): AdfNode => ({
  type: "doc",
  version: 1,
  content: paragraphs,
});

// ----------------------------------------------------------------- shapes

/**
 * A subtask as it arrives inside its parent's `subtasks` field, and as a parent
 * arrives inside its child's `parent` field: a compact issue — key, summary,
 * status — rather than a full one. Enough to decide scope, which is why
 * `queuedIssues` can resolve every story it finds without a second call.
 */
type JiraRelated = {
  key: string;
  fields?: {
    summary?: string;
    status?: { name?: string; statusCategory?: { key?: string } };
    /** Only ever present on a full issue — a subtask cannot have subtasks. */
    subtasks?: JiraRelated[];
  };
};

type JiraIssue = {
  key: string;
  fields?: { summary?: string; subtasks?: JiraRelated[]; parent?: JiraRelated };
};
type JiraSearch = { issues?: JiraIssue[] };
type JiraTransition = { id?: string; name?: string };
type JiraTransitions = { transitions?: JiraTransition[] };
type JiraComment = { author?: { displayName?: string }; created?: string; body?: AdfNode };
type JiraIssueText = {
  key?: string;
  fields?: {
    summary?: string;
    description?: AdfNode | null;
    comment?: { comments?: JiraComment[]; total?: number };
    subtasks?: JiraRelated[];
    parent?: JiraRelated;
  };
};

/** ADF version of the GitHub adapter's oldest-first body-plus-comments flattening. */
const flattened = (issue: JiraIssueText): string => {
  const comments = issue.fields?.comment?.comments ?? [];
  const total = issue.fields?.comment?.total ?? comments.length;
  // The issue endpoint pages comments oldest-first and the happy path never
  // fills a page; said out loud when it someday does, because a silently
  // truncated issue text reads as a human who never commented — and it is the
  // *newest* comments, the ones most likely to matter, that fall off the end.
  if (total > comments.length) {
    log(`  jira: only ${comments.length} of ${total} comments fit the page — the newest are missing from the prompt`);
  }

  return [
    adfToText(issue.fields?.description) || "_The issue has no body._",
    ...comments.map(
      (c) => `**@${c.author?.displayName ?? "someone"} commented (${c.created ?? "sometime"}):**\n\n${adfToText(c.body)}`,
    ),
  ].join("\n\n---\n\n");
};

// ------------------------------------------------- composing the issue text

/**
 * The prompts are handed one block of text per issue, so a run whose scope is a
 * subtask of a story needs both of them in it — and needs the seam between them to
 * be unmissable. These four compose that block. The headings are `###` because the
 * prompt already spends `##` on its own sections, and the whole thing lands under
 * one of them.
 */

/** The gap between composed sections. */
const BREAK = "\n\n";

const named = (issue: JiraRelated) => `${issue.key} — ${issue.fields?.summary ?? "(no summary)"}`;

const heading = (title: string, body: string) => `### ${title}\n\n${body || "_No description._"}`;

/**
 * The subtasks this run must not implement, with their status — the status because
 * "already done" and "not started" are different things to plan against.
 */
const notYours = (subtasks: JiraRelated[]) =>
  [
    `Another repository's golem — or a colleague — implements these. Do not implement them here. ` +
      `Take what they provide as given, and where your work depends on something of theirs that ` +
      `does not exist yet, say so rather than building it.`,
    "",
    ...subtasks.map(
      (s) => `- ${named(s)}${s.fields?.status?.name ? ` — ${s.fields.status.name}` : ""}`,
    ),
  ].join("\n");

// -------------------------------------------------------- the transition map

/**
 * Which Jira transition each lifecycle moment fires. Named rather than numbered:
 * a transition id is a per-workflow integer nobody can read or review, while the
 * name is the word on the button. Every entry is optional and so is the file, so
 * a project that configures nothing keeps the labels-first mirror it started
 * with — see `.sandcastle/jira-transitions.json`, which ships with all six
 * moments spelled out and empty.
 */
type TransitionMap = Partial<Record<Moment["type"], string>>;

/**
 * The six moment names as values, which is what checking the file's keys needs.
 * A Record over the union rather than a list of strings, deliberately: add a
 * moment to the port and this file stops compiling until it says what that
 * moment does here.
 */
const MOMENTS: Record<Moment["type"], true> = {
  "picked-up": true,
  "awaiting-approval": true,
  implementing: true,
  "awaiting-revision": true,
  shipped: true,
  stopped: true,
};

const MOMENT_NAMES = Object.keys(MOMENTS);

// `hasOwn` rather than `in`, which would also answer yes to "toString" and
// "constructor" — a typo that lands on an Object.prototype key would otherwise
// pass the check below, print in the startup banner as configured, and never fire.
const isMoment = (key: string): key is Moment["type"] => Object.hasOwn(MOMENTS, key);

/**
 * A map file that cannot be understood ends the process, like a missing
 * credential and unlike anything else in this adapter. It is committed
 * configuration a human just edited: a mistake in it should surface as a startup
 * failure naming the file, not as six moments that quietly never fire.
 */
function unusableMap(detail: string): never {
  console.error(
    `${JIRA_TRANSITIONS_REF} cannot be read as a transition map: ${detail}\n\n` +
      `It maps lifecycle moments to the names of Jira transitions, and every entry is optional:\n` +
      `  { ${MOMENT_NAMES.map((moment) => `"${moment}": ""`).join(", ")} }\n` +
      `An empty name means that moment does not move the workflow; deleting the file means none of ` +
      `them do, and the mirror is labels only.`,
  );
  process.exit(1);
}

/**
 * Read the map once, at construction. Validated rather than trusted, in the same
 * spirit as SANDCASTLE_TRACKER: an unknown key is almost always a misspelled
 * moment, and a misspelled moment is indistinguishable from a factory that
 * ignores the file.
 *
 * Note what is *not* validated — the transition names themselves. Jira offers
 * only the transitions an issue's current status allows, so a name is available
 * at one moment and not at another and there is nothing to check up front; that
 * resolution happens at the moment, in `moveWorkflow`.
 */
const readTransitionMap = (): TransitionMap => {
  // Absent means labels-first — the deployment that never opted in.
  if (!existsSync(JIRA_TRANSITIONS)) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(JIRA_TRANSITIONS, "utf8"));
  } catch (error) {
    unusableMap(describe(error));
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    unusableMap(`it holds ${Array.isArray(parsed) ? "an array" : `a JSON ${typeof parsed}`}, not an object`);
  }

  const map: TransitionMap = {};
  for (const [key, name] of Object.entries(parsed)) {
    if (!isMoment(key)) {
      unusableMap(`"${key}" is not a lifecycle moment — the six are ${MOMENT_NAMES.join(", ")}`);
    }
    if (typeof name !== "string") {
      unusableMap(`"${key}" must name a transition as a string, but holds ${JSON.stringify(name)}`);
    }
    // The shipped file spells all six keys out so that whoever fills it in can
    // see them; an empty one is a moment left unconfigured, not a nameless
    // transition to go looking for.
    if (name.trim()) map[key] = name.trim();
  }
  return map;
};

// ---------------------------------------------------------- the subtask rule

/**
 * Which of a story's subtasks this deployment implements. A story in ESCB is
 * written as one issue with a `[FE]` subtask and a `[BE]` one, and each of them
 * is a different repository's work — so the golem watching the frontend
 * repository must take the frontend subtask and leave the other alone, even
 * though the `Sandcastle` label sits on the story they share.
 *
 * The rule is a committed per-repository file, `.sandcastle/jira-subtasks.json`,
 * for the reason the transition map is one and one reason more: which discipline
 * a golem implements is a property of the repository it is pointed at, and the
 * repository's own file is the only place that fact cannot drift away from the
 * code it describes.
 */
type SubtaskRule = {
  /**
   * Marks a subtask as this repository's work. Matched anywhere in the subtask's
   * summary, ignoring case — `[FE]` finds `[CB][FE] - the FE subtask` — because
   * what a team has is a naming convention, not a field.
   */
  readonly mine: string;
  /**
   * Marks a subtask as somebody else's. Optional, and it buys one thing: a story
   * split into disciplines where *mine is absent or already done* is recognised as
   * another repository's work rather than falling back to the whole story. Without
   * it, the fallback is "no subtask of mine, so the story itself" — which in a
   * frontend repository would quietly implement the backend half too.
   */
  readonly others: readonly string[];
};

const RULE_KEYS: Record<keyof SubtaskRule, true> = { mine: true, others: true };

const isRuleKey = (key: string): key is keyof SubtaskRule => Object.hasOwn(RULE_KEYS, key);

const RULE_SHAPE = `  { "mine": "[FE]", "others": ["[BE]"] }`;

/**
 * Like `unusableMap`: committed configuration a human just edited, so a mistake in
 * it ends the process naming the file rather than surfacing as a golem that takes
 * the wrong half of a story.
 */
function unusableRule(detail: string): never {
  console.error(
    `${JIRA_SUBTASKS_REF} cannot be read as a subtask rule: ${detail}\n\n` +
      `It says which of a story's subtasks this repository implements:\n${RULE_SHAPE}\n` +
      `"mine" marks the subtasks to work on, matched anywhere in the summary and ignoring case. ` +
      `"others" is optional and marks the subtasks that belong to another repository, so a story ` +
      `holding only those is left alone instead of being implemented whole. An empty "mine" — or ` +
      `deleting the file — means every run is scoped to the labelled issue itself.`,
  );
  process.exit(1);
}

/**
 * Read the rule once, at construction, and validate rather than trust it. An
 * unknown key is almost always a misspelling of one of the two, and a misspelled
 * key is indistinguishable from a golem that ignores the file.
 */
const readSubtaskRule = (): SubtaskRule | undefined => {
  // Absent means unscoped — the deployment that never opted in, and every
  // deployment that existed before this did.
  if (!existsSync(JIRA_SUBTASKS)) return undefined;

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(JIRA_SUBTASKS, "utf8"));
  } catch (error) {
    unusableRule(describe(error));
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    unusableRule(`it holds ${Array.isArray(parsed) ? "an array" : `a JSON ${typeof parsed}`}, not an object`);
  }

  const entries = Object.entries(parsed);
  for (const [key] of entries) {
    if (!isRuleKey(key)) {
      unusableRule(`"${key}" is not part of a subtask rule — the two keys are mine, others`);
    }
  }

  const { mine, others = [] } = parsed as { mine?: unknown; others?: unknown };
  if (mine !== undefined && typeof mine !== "string") {
    unusableRule(`"mine" must be a string, but holds ${JSON.stringify(mine)}`);
  }
  if (!Array.isArray(others) || others.some((o) => typeof o !== "string" || !o.trim())) {
    unusableRule(`"others" must be a list of non-empty strings, but holds ${JSON.stringify(others)}`);
  }

  const claim = (mine ?? "").trim();
  // An empty "mine" is the file shipped and not filled in, which is unscoped —
  // but an empty "mine" *with* an "others" list is a golem that would never claim
  // anything and skip half the queue for it. That is a mistake, not a default.
  if (!claim) {
    if (others.length > 0) {
      unusableRule(`"others" is set but "mine" is empty, so nothing would ever be claimed`);
    }
    return undefined;
  }

  return { mine: claim, others: (others as string[]).map((o) => o.trim()) };
};

/**
 * What one labelled issue's work turns out to be. Three answers, and the third is
 * the one the rule exists for.
 */
type Scope =
  /**
   * The labelled issue is the work, whole — no rule configured, or a story that is
   * not split by discipline at all. This is what every run was before the rule.
   * `own` is set when the issue's own summary carries this repository's mark: a
   * `[FE]` subtask labelled directly is *already* the slice, and the log line
   * should not say it has no `[FE]` subtask of its own.
   */
  | { readonly kind: "issue"; readonly own?: true }
  /**
   * The work is these subtasks of the labelled issue. Plural because a story may
   * carry two frontend subtasks, and taking only the first would silently drop the
   * other: nothing would ever pick the story up again.
   */
  | { readonly kind: "subtasks"; readonly work: JiraRelated[]; readonly others: JiraRelated[] }
  /**
   * The story is split by discipline and this repository's share is not available —
   * absent, or already done. The golem leaves it in the queue **with its label on**,
   * because that label is what the repository whose work it is polls for too.
   */
  | { readonly kind: "elsewhere"; readonly why: string };

const marked = (needle: string, summary: string | undefined) =>
  (summary ?? "").toLowerCase().includes(needle.toLowerCase());

/**
 * Jira's own notion of finished, rather than a status name: `statusCategory` is
 * the three-way grouping (`new`, `indeterminate`, `done`) every workflow's
 * statuses are mapped into, so "is this subtask still open" needs no per-project
 * configuration of its own.
 */
const isDone = (subtask: JiraRelated) => subtask.fields?.status?.statusCategory?.key === "done";

const listed = (subtasks: JiraRelated[]) => subtasks.map((s) => s.key).join(", ");

/** So the log lines read as English whether a story has one of something or three. */
const plural = (subtasks: JiraRelated[], one: string, many: string) =>
  subtasks.length === 1 ? one : many;

/**
 * The rule applied to one labelled issue — its own summary and its subtasks. Pure,
 * and the only place the three answers are decided: `queuedIssues` uses it to
 * filter, `moveWorkflow` to pick which issue a transition moves, and the prompt's
 * scope in `issueText` is the same rule with the done-ness test left out.
 */
const scopeOf = (rule: SubtaskRule | undefined, issue: JiraRelated): Scope => {
  if (!rule) return { kind: "issue" };

  const summary = issue.fields?.summary;
  const subtasks = issue.fields?.subtasks ?? [];

  // The labelled issue is itself marked as somebody else's — a `[BE]` subtask
  // labelled directly, most likely. Checked before the subtasks, and `mine` wins a
  // tie: labelling both halves of a story is the tidiest way to run two golems off
  // one project, and it only works if each of them recognises the other's.
  const notMine = marked(rule.mine, summary)
    ? undefined
    : rule.others.find((other) => marked(other, summary));
  if (notMine) {
    return { kind: "elsewhere", why: `it is itself marked "${notMine}" — another repository's work` };
  }

  const mine = subtasks.filter((s) => marked(rule.mine, s.fields?.summary));
  const open = mine.filter((s) => !isDone(s));
  if (open.length > 0) {
    const claimed = new Set(open.map((s) => s.key));
    return { kind: "subtasks", work: open, others: subtasks.filter((s) => !claimed.has(s.key)) };
  }

  // Mine exists but is finished. Whatever is left on this story is somebody
  // else's, and re-implementing a done subtask is the one thing that must not
  // happen — this is also what keeps a shipped story from being picked up twice.
  if (mine.length > 0) {
    return {
      kind: "elsewhere",
      why:
        `its "${rule.mine}" ${plural(mine, "subtask", "subtasks")} (${listed(mine)}) ` +
        `${plural(mine, "is", "are")} already done`,
    };
  }

  // No subtask of mine, but the story is split by discipline: it is another
  // repository's, and its golem is polling the same label.
  const theirs = subtasks.filter((s) => rule.others.some((other) => marked(other, s.fields?.summary)));
  if (theirs.length > 0) {
    return {
      kind: "elsewhere",
      why:
        `it has no "${rule.mine}" subtask, and ${listed(theirs)} ` +
        `${plural(theirs, "belongs", "belong")} to another repository`,
    };
  }

  // Subtasks that mean nothing to the rule — or none at all — leave the issue
  // itself as the work, which is what a project not using the convention gets,
  // and what a directly labelled `[FE]` subtask is.
  return marked(rule.mine, summary) ? { kind: "issue", own: true } : { kind: "issue" };
};

// ---------------------------------------------------------------- adapter

/**
 * The missing-credentials half of the fail-fast contract: the configured
 * credentials as an `Authorization` value, or a loud exit naming what is absent.
 * (`verify` on the adapter covers *rejected* credentials, with a real call.)
 *
 * Exported for the same reason `jiraApi` is: the smoke test must refuse to start
 * for the same reason and with the same words the watcher would.
 */
export const jiraCredentials = (): { email: string; auth: string } => {
  const email = JIRA_EMAIL;
  const token = JIRA_API_TOKEN;
  if (!email || !token) {
    console.error(
      `Talking to Jira needs JIRA_EMAIL and JIRA_API_TOKEN in the host environment ` +
        `(missing: ${[!email && "JIRA_EMAIL", !token && "JIRA_API_TOKEN"].filter(Boolean).join(", ")}).\n` +
        `Mint a personal API token at id.atlassian.com → Security → API tokens. Do not put either ` +
        `into .sandcastle/.env — every key there is forwarded into the container.`,
    );
    process.exit(1);
  }
  return { email, auth: Buffer.from(`${email}:${token}`).toString("base64") };
};

export const jiraTracker = (): Tracker => {
  const { email, auth } = jiraCredentials();
  const call = (method: string, path: string, body?: unknown) => jiraApi(auth, method, path, body);

  // Read here for the same reason the credentials are: construction is where an
  // adapter reads its own configuration, so a GitHub deployment never opens this
  // file and a Jira one never reads it twice.
  const transitions = readTransitionMap();
  const configured = Object.entries(transitions);
  const rule = readSubtaskRule();

  const browseUrl = (key: string) => `${JIRA_BASE_URL}/browse/${key}`;

  const search = async (jql: string, fields = "summary"): Promise<JiraIssue[]> => {
    const result = (await call(
      "GET",
      `/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&fields=${fields}&maxResults=50`,
    )) as JiraSearch;
    return result.issues ?? [];
  };

  /**
   * The scope decision, said once per issue rather than once per poll. It is the
   * answer to "why is that story not being worked on", and the two-minute poll
   * would bury it — so the line is kept and only reprinted when the answer
   * changes, which is exactly when it is news.
   */
  const spoken = new Map<string, string>();

  const announceScope = (key: string, line: string) => {
    if (spoken.get(key) === line) return;
    spoken.set(key, line);
    log(`  jira: ${line}`);
  };

  const describeScope = (key: string, scope: Scope) => {
    if (!rule) return;
    if (scope.kind === "subtasks") {
      announceScope(
        key,
        `${key} → ${listed(scope.work)} — the "${rule.mine}" work on it` +
          (scope.others.length ? ` (leaving ${listed(scope.others)})` : ""),
      );
    } else if (scope.kind === "elsewhere") {
      announceScope(key, `${key} left for another repository's golem — ${scope.why}`);
    } else {
      announceScope(
        key,
        scope.own
          ? `${key} is "${rule.mine}" work itself — the issue is worked whole`
          : `${key} has no "${rule.mine}" subtask — the issue is worked whole`,
      );
    }
  };

  /**
   * One issue's scope, resolved from Jira rather than remembered: the same answer
   * has to come out after a restart, days into a wait, with nothing on disk but the
   * key. One call, and none at all when no rule is configured.
   */
  const scopeFor = async (key: string): Promise<Scope> => {
    if (!rule) return { kind: "issue" };
    const issue = (await call("GET", `/rest/api/3/issue/${key}?fields=summary,subtasks`)) as JiraIssue;
    const scope = scopeOf(rule, issue);
    describeScope(key, scope);
    return scope;
  };

  /** The issues a moment moves: this repository's subtasks, or the issue itself. */
  const workKeys = (key: string, scope: Scope) =>
    scope.kind === "subtasks" ? scope.work.map((s) => s.key) : [key];

  /**
   * The transitions the issue is offering *now*. Asked per moment and never
   * cached: Jira offers only what the issue's current status allows, and that
   * status is whatever the last moment left it in.
   */
  const offeredTransitions = async (key: string): Promise<JiraTransition[]> =>
    ((await call("GET", `/rest/api/3/issue/${key}/transitions`)) as JiraTransitions).transitions ?? [];

  /** Add and remove in one update; a label is created by being added, so no ensure step exists. */
  const relabel = async (issue: Issue, { add, remove }: { add?: string; remove?: string }) => {
    try {
      await call("PUT", `/rest/api/3/issue/${issue.key}`, {
        update: {
          labels: [...(add ? [{ add }] : []), ...(remove ? [{ remove }] : [])],
        },
      });
    } catch (error) {
      log(`  WARNING: could not relabel ${issue.key}: ${describe(error)}`);
    }
  };

  /** Post one comment; returns a link a human can follow to it. */
  const comment = async (key: string, paragraphs: AdfNode[]): Promise<string | undefined> => {
    const posted = (await call("POST", `/rest/api/3/issue/${key}/comment`, {
      body: adfDoc(paragraphs),
    })) as { id?: string };
    return posted.id ? `${browseUrl(key)}?focusedCommentId=${posted.id}` : browseUrl(key);
  };

  /** The same, where losing the comment must not lose the run. */
  const tryComment = async (key: string, paragraphs: AdfNode[]): Promise<string | undefined> => {
    try {
      return await comment(key, paragraphs);
    } catch (error) {
      log(`  WARNING: could not comment on ${key}: ${describe(error)}`);
      return undefined;
    }
  };

  /**
   * Fire the transition this moment is mapped to, if it is mapped to one and the
   * issue is offering it. Everything else — an unconfigured moment, a name this
   * status does not offer, a rejected POST — is a log line and a shrug: a
   * workflow edited in Jira degrades the mirror, never the factory. The offered
   * names go into the skipped line, because they are exactly what belongs in the
   * map file instead.
   */
  const moveWorkflow = async (issue: Issue, moment: Moment["type"]) => {
    const wanted = transitions[moment];
    if (!wanted) return;

    // The board column that should move is the one the golem is actually working:
    // a story whose frontend subtask this run implements has its *subtask* started
    // and finished, and stories are what subtasks add up to. Resolved per moment
    // for the same reason the transition names are — this is a mirror, and the
    // shape of the story may have changed since the run began.
    let keys: string[];
    try {
      keys = workKeys(issue.key, await scopeFor(issue.key));
    } catch (error) {
      log(`  WARNING: could not read ${issue.key}'s subtasks at ${moment}: ${describe(error)}`);
      keys = [issue.key];
    }

    for (const key of keys) {
      try {
        const offered = await offeredTransitions(key);
        // Loosely matched, because the name was typed into a JSON file by a human
        // reading it off a button.
        const match = offered.find((t) => t.name?.trim().toLowerCase() === wanted.toLowerCase());
        if (!match?.id) {
          log(
            `  jira: ${key} offers no "${wanted}" transition at ${moment} — skipped ` +
              `(offered: ${offered.map((t) => t.name).filter(Boolean).join(", ") || "nothing"})`,
          );
          continue;
        }
        await call("POST", `/rest/api/3/issue/${key}/transitions`, { transition: { id: match.id } });
        log(`  jira: ${key} → "${match.name}" (${moment})`);
      } catch (error) {
        log(`  WARNING: could not transition ${key} at ${moment}: ${describe(error)}`);
      }
    }
  };

  /**
   * On a merge the watcher says `shipped` and then, letting go, `stopped` — two
   * moments, one breath apart, in the same turn. Both would speak; the second
   * would only repeat the first. So `shipped` leaves its key here and the
   * `stopped` that follows takes it back out, speaking only when it is the whole
   * story (abandoned, failed, rounds spent, closed unmerged).
   */
  const justShipped = new Set<string>();

  const STOP_LABEL: Record<Tracked["status"], string> = {
    "awaiting-plan": AWAITING_LABEL,
    "awaiting-revision": REVISION_LABEL,
  };

  const signal = async (issue: Issue, moment: Moment) => {
    switch (moment.type) {
      // The two moments labels-first has nothing to say at. The map may.
      case "picked-up":
      case "implementing":
        break;
      case "awaiting-approval":
        await relabel(issue, { add: AWAITING_LABEL, remove: LABEL });
        await tryComment(issue.key, [
          paragraph(`🏰 Sandcastle posted a plan — approve or abandon on the pull request:`, moment.prUrl),
        ]);
        break;
      case "awaiting-revision":
        await relabel(issue, { add: REVISION_LABEL, remove: AWAITING_LABEL });
        break;
      case "shipped":
        justShipped.add(issue.key);
        await tryComment(issue.key, [
          paragraph(`🏰 Shipped — the pull request for this issue was merged:`, moment.prUrl),
        ]);
        break;
      case "stopped":
        await relabel(issue, { remove: STOP_LABEL[moment.from] });
        // The stop that trails a ship takes the label off and says nothing else:
        // the comment would repeat the ship's, and a second transition would move
        // a workflow the ship has just settled — `shipped` is the last word on an
        // issue that landed.
        if (justShipped.delete(issue.key)) return;
        await tryComment(issue.key, [
          paragraph(
            `🏰 Sandcastle stopped tracking this issue — the pull request says why.` +
              ` Add the "${LABEL}" label again to start over.`,
            moment.prUrl,
          ),
        ]);
        break;
    }

    // Every moment consults the map, which is why this is one call and not six.
    await moveWorkflow(issue, moment.type);
  };

  return {
    source: `${JIRA_PROJECT} on ${JIRA_BASE_URL} for issues labelled "${LABEL}"`,

    /** The rejected-credentials half of fail-fast: prove the token before the banner. */
    verify: async () => {
      try {
        const me = (await call("GET", "/rest/api/3/myself")) as { displayName?: string };
        log(`Jira: authenticated as ${me.displayName ?? email} against ${JIRA_BASE_URL}.`);
        // Said out loud at startup because it is committed configuration nobody
        // has been notified about: the operator should see which moments will move
        // the workflow before an issue does it for them.
        log(
          configured.length
            ? `Jira: transitions — ${configured.map(([moment, name]) => `${moment} → "${name}"`).join(", ")}.`
            : `Jira: no transitions configured in ${JIRA_TRANSITIONS_REF}; the mirror is labels only.`,
        );
        // And for the same reason: which half of a story this golem will take is
        // the difference between a queue that looks empty and one that is.
        log(
          rule
            ? `Jira: subtasks — working the "${rule.mine}" subtask of a labelled story` +
                (rule.others.length
                  ? `, leaving ${rule.others.map((o) => `"${o}"`).join(" and ")} to another repository`
                  : ``) +
                `; a story with neither is worked whole.`
            : `Jira: no subtask rule in ${JIRA_SUBTASKS_REF}; every run is scoped to the labelled issue itself.`,
        );
      } catch (error) {
        console.error(
          `The watcher is configured for Jira (SANDCASTLE_TRACKER=jira) but ${JIRA_BASE_URL} ` +
            `rejected the credentials for ${email}. Check JIRA_EMAIL and JIRA_API_TOKEN — tokens ` +
            `are minted at id.atlassian.com → Security → API tokens.\n\n${describe(error)}`,
        );
        process.exit(1);
      }
    },

    /** Bare, never `#`-prefixed: `ESCB-123` is what Jira's development panel links. */
    issueRef: (key) => key,

    externalRef: (issue) => ({
      trackerType: "jira",
      externalKey: issue.key,
      url: browseUrl(issue.key),
    }),

    // The key leads the title because the development panel reads titles, and
    // `Refs` rather than `Closes` because GitHub closes nothing here — the
    // `shipped` moment above is what ends the issue's life on Jira.
    planPullRequest: (issue) => ({
      title: `${issue.key}: ${issue.title} (plan)`,
      refLine: `Refs ${issue.key}`,
    }),

    /**
     * Everything labelled, minus the stories whose work is another repository's.
     * The subtasks come back with the search — a compact issue each, key, summary
     * and status — so the whole queue is resolved in the one call the poll always
     * made.
     *
     * A story that is left out keeps its label, deliberately: the label is the
     * intake for *every* golem watching this project, and a frontend golem taking
     * it off a backend story would be dropping work on somebody else's behalf.
     * Nothing starves for it either — the watcher only ever starts the first issue
     * of this list, so a story that is not in it cannot hold up the ones that are.
     */
    queuedIssues: async () => {
      const found = await search(
        `project = ${JIRA_PROJECT} AND labels = "${LABEL}" AND statusCategory != Done ORDER BY created ASC`,
        "summary,subtasks",
      );

      return found
        .filter((issue) => {
          const scope = scopeOf(rule, issue);
          describeScope(issue.key, scope);
          return scope.kind !== "elsewhere";
        })
        .map((issue) => ({ key: issue.key, title: issue.fields?.summary ?? issue.key }));
    },

    issueText: async (key) => {
      const issue = (await call(
        "GET",
        `/rest/api/3/issue/${key}?fields=summary,description,comment,subtasks,parent`,
      )) as JiraIssueText;
      const own = flattened(issue);
      const parent = issue.fields?.parent;

      // Somebody labelled a subtask directly. Its own body is usually one line —
      // the story above it holds the requirement — so the story comes along as
      // context whether or not a rule is configured. Nothing about this is the
      // rule's doing: a subtask without its story is misleading on any project.
      if (parent) {
        const story = (await call(
          "GET",
          `/rest/api/3/issue/${parent.key}?fields=summary,description,comment,subtasks`,
        )) as JiraIssueText;
        const siblings = (story.fields?.subtasks ?? []).filter((s) => s.key !== key);

        return [
          `**Scope: ${key}.** It is a subtask of ${parent.key}, whose text follows it below for ` +
            `context. Plan and implement this subtask only.`,
          heading(`${key} — ${issue.fields?.summary ?? "(no summary)"}`, own),
          heading(
            `For context — the story it belongs to: ${named(parent)}`,
            flattened(story),
          ),
          ...(siblings.length
            ? [heading(`For context — the story's other subtasks`, notYours(siblings))]
            : []),
        ].join(BREAK);
      }

      // A story split by discipline. The prompt gets the whole story — it is where
      // the requirement is written — with this repository's subtasks marked as the
      // scope and the rest marked as not.
      //
      // Done-ness is deliberately not consulted here, unlike in the queue: a
      // subtask closed by hand while its plan sat waiting for approval is still the
      // slice this run is implementing, and widening the prompt back out to the
      // whole story because of it would be the worse mistake.
      const subtasks = issue.fields?.subtasks ?? [];
      const work = rule ? subtasks.filter((s) => marked(rule.mine, s.fields?.summary)) : [];
      if (work.length === 0) return own;

      const claimed = new Set(work.map((s) => s.key));
      const theirs = subtasks.filter((s) => !claimed.has(s.key));
      log(`  jira: the prompt for ${key} is scoped to ${listed(work)}`);

      // One call per claimed subtask, which is one call in every case anybody has:
      // the summary alone ("the FE subtask") is never the requirement.
      const bodies = await Promise.all(
        work.map(async (s) => {
          const full = (await call(
            "GET",
            `/rest/api/3/issue/${s.key}?fields=description,comment`,
          )) as JiraIssueText;
          return heading(`Your scope: ${named(s)}`, flattened(full));
        }),
      );

      return [
        `**Scope: ${listed(work)}.** This story is split into subtasks and ${
          work.length > 1 ? "those are" : "that one is"
        } this repository's share of it — plan and implement ${
          work.length > 1 ? "them" : "it"
        } and nothing else. The story itself is below for context, and so is what the other subtasks ` +
          `cover, because the work you do has to fit against them.`,
        heading(`The story: ${key} — ${issue.fields?.summary ?? "(no summary)"}`, own),
        ...bodies,
        ...(theirs.length ? [heading(`Not your scope`, notYours(theirs))] : []),
      ].join(BREAK);
    },

    signal,

    release: async (issue, text) => {
      // The label comes off first and un-wrapped, exactly like the GitHub
      // adapter: it is the only thing standing between a permanently failing
      // issue and an infinite retry loop, so it must not depend on the comment.
      await call("PUT", `/rest/api/3/issue/${issue.key}`, {
        update: { labels: [{ remove: LABEL }] },
      });
      return tryComment(issue.key, text.split("\n\n").map((chunk) => paragraph(chunk)));
    },

    // `statusCategory != Done` for the same reason the GitHub adapter passes
    // `--state open`: a finished issue with a stale state label — a swallowed
    // best-effort relabel — is history, not an orphan to warn about forever.
    mirroredKeys: async () =>
      (
        await search(
          `project = ${JIRA_PROJECT} AND labels in ("${AWAITING_LABEL}", "${REVISION_LABEL}") AND statusCategory != Done`,
        )
      ).map((issue) => issue.key),
  };
};
