import { existsSync, readFileSync } from "node:fs";
import {
  AWAITING_LABEL,
  JIRA_API_TOKEN,
  JIRA_BASE_URL,
  JIRA_EMAIL,
  JIRA_PROJECT,
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
 */
const api = async (auth: string, method: string, path: string, body?: unknown): Promise<unknown> => {
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

type JiraIssue = { key: string; fields?: { summary?: string } };
type JiraSearch = { issues?: JiraIssue[] };
type JiraTransition = { id?: string; name?: string };
type JiraTransitions = { transitions?: JiraTransition[] };
type JiraComment = { author?: { displayName?: string }; created?: string; body?: AdfNode };
type JiraIssueText = {
  fields?: { description?: AdfNode | null; comment?: { comments?: JiraComment[]; total?: number } };
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

// ---------------------------------------------------------------- adapter

export const jiraTracker = (): Tracker => {
  // The missing-credentials half of the fail-fast contract, checked at
  // construction; `verify` below covers rejected ones with a real call.
  const email = JIRA_EMAIL;
  const token = JIRA_API_TOKEN;
  if (!email || !token) {
    console.error(
      `SANDCASTLE_TRACKER=jira needs JIRA_EMAIL and JIRA_API_TOKEN in the host environment ` +
        `(missing: ${[!email && "JIRA_EMAIL", !token && "JIRA_API_TOKEN"].filter(Boolean).join(", ")}).\n` +
        `Mint a personal API token at id.atlassian.com → Security → API tokens. Do not put either ` +
        `into .sandcastle/.env — every key there is forwarded into the container.`,
    );
    process.exit(1);
  }

  const auth = Buffer.from(`${email}:${token}`).toString("base64");
  const call = (method: string, path: string, body?: unknown) => api(auth, method, path, body);

  // Read here for the same reason the credentials are: construction is where an
  // adapter reads its own configuration, so a GitHub deployment never opens this
  // file and a Jira one never reads it twice.
  const transitions = readTransitionMap();
  const configured = Object.entries(transitions);

  const browseUrl = (key: string) => `${JIRA_BASE_URL}/browse/${key}`;

  const search = async (jql: string): Promise<JiraIssue[]> => {
    const result = (await call(
      "GET",
      `/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&fields=summary&maxResults=50`,
    )) as JiraSearch;
    return result.issues ?? [];
  };

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

    try {
      const offered = await offeredTransitions(issue.key);
      // Loosely matched, because the name was typed into a JSON file by a human
      // reading it off a button.
      const match = offered.find((t) => t.name?.trim().toLowerCase() === wanted.toLowerCase());
      if (!match?.id) {
        log(
          `  jira: ${issue.key} offers no "${wanted}" transition at ${moment} — skipped ` +
            `(offered: ${offered.map((t) => t.name).filter(Boolean).join(", ") || "nothing"})`,
        );
        return;
      }
      await call("POST", `/rest/api/3/issue/${issue.key}/transitions`, { transition: { id: match.id } });
      log(`  jira: ${issue.key} → "${match.name}" (${moment})`);
    } catch (error) {
      log(`  WARNING: could not transition ${issue.key} at ${moment}: ${describe(error)}`);
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

    queuedIssues: async () =>
      (
        await search(
          `project = ${JIRA_PROJECT} AND labels = "${LABEL}" AND statusCategory != Done ORDER BY created ASC`,
        )
      ).map((issue) => ({ key: issue.key, title: issue.fields?.summary ?? issue.key })),

    issueText: async (key) =>
      flattened(
        (await call("GET", `/rest/api/3/issue/${key}?fields=description,comment`)) as JiraIssueText,
      ),

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
