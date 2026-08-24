import {
  AWAITING_LABEL,
  JIRA_API_TOKEN,
  JIRA_BASE_URL,
  JIRA_EMAIL,
  JIRA_PROJECT,
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
// `shipped` moment does real work here. Workflow transitions are the follow-up
// issue's job (#15); until then the labels are the mirror.
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

  const browseUrl = (key: string) => `${JIRA_BASE_URL}/browse/${key}`;

  const search = async (jql: string): Promise<JiraIssue[]> => {
    const result = (await call(
      "GET",
      `/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&fields=summary&maxResults=50`,
    )) as JiraSearch;
    return result.issues ?? [];
  };

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
   * On a merge the watcher says `shipped` and then, letting go, `stopped` — two
   * moments, one breath apart, in the same turn. Both would comment; the second
   * would only repeat the first. So `shipped` leaves its key here and the
   * `stopped` that follows takes it back out, commenting only when it is the
   * whole story (abandoned, failed, rounds spent, closed unmerged).
   */
  const justShipped = new Set<string>();

  const STOP_LABEL: Record<Tracked["status"], string> = {
    "awaiting-plan": AWAITING_LABEL,
    "awaiting-revision": REVISION_LABEL,
  };

  const signal = async (issue: Issue, moment: Moment) => {
    switch (moment.type) {
      // Nothing labels-first has to say — the follow-up issue's transition map
      // (#15) is what will move the Jira workflow at these moments.
      case "picked-up":
      case "implementing":
        return;
      case "awaiting-approval":
        await relabel(issue, { add: AWAITING_LABEL, remove: LABEL });
        await tryComment(issue.key, [
          paragraph(`🏰 Sandcastle posted a plan — approve or abandon on the pull request:`, moment.prUrl),
        ]);
        return;
      case "awaiting-revision":
        await relabel(issue, { add: REVISION_LABEL, remove: AWAITING_LABEL });
        return;
      case "shipped":
        justShipped.add(issue.key);
        await tryComment(issue.key, [
          paragraph(`🏰 Shipped — the pull request for this issue was merged:`, moment.prUrl),
        ]);
        return;
      case "stopped":
        await relabel(issue, { remove: STOP_LABEL[moment.from] });
        if (!justShipped.delete(issue.key)) {
          await tryComment(issue.key, [
            paragraph(
              `🏰 Sandcastle stopped tracking this issue — the pull request says why.` +
                ` Add the "${LABEL}" label again to start over.`,
              moment.prUrl,
            ),
          ]);
        }
        return;
    }
  };

  return {
    source: `${JIRA_PROJECT} on ${JIRA_BASE_URL} for issues labelled "${LABEL}"`,

    /** The rejected-credentials half of fail-fast: prove the token before the banner. */
    verify: async () => {
      try {
        const me = (await call("GET", "/rest/api/3/myself")) as { displayName?: string };
        log(`Jira: authenticated as ${me.displayName ?? email} against ${JIRA_BASE_URL}.`);
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
