import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Slack notifications for the watcher, over a bot token rather than an incoming
// webhook. A webhook URL is welded to one channel; a token posts wherever the bot
// is invited, and — the reason it is worth the extra setup here — hands back the
// message timestamp, so the "PR merged, resuming" notice lands as a reply in the
// original message's thread instead of as a second post in the channel.
//
// Setup: create a Slack app, give it the `chat:write` bot scope, install it, and
// invite it to the channel. Then in .sandcastle/.env (gitignored):
//
//   SLACK_BOT_TOKEN=xoxb-...
//   SLACK_CHANNEL=C0123456789
//   SLACK_MENTION=U0123456789     # optional; who to ping when it is their turn
//
// Any of them can come from the shell instead, which takes precedence.
//
// Notifications are best-effort. A watcher that dies because Slack had a bad
// minute would be worse than one that misses a ping.

const ENV_FILE = fileURLToPath(new URL("../.env", import.meta.url));

/**
 * Read a single key out of .sandcastle/.env rather than loading the file.
 *
 * That file holds the sandbox's credentials, and loading all of it into the
 * host process would let one of them shadow a host credential — the `git push`
 * and `gh pr create` in main.mts run on your own gh login, and a stray token
 * from the env file must not be able to take their place.
 */
const readEnvKey = (key: string) => {
  if (!existsSync(ENV_FILE)) return undefined;
  for (const line of readFileSync(ENV_FILE, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (match?.[1] !== key) continue;
    return match[2].trim().replace(/^["']|["']$/g, "") || undefined;
  }
  return undefined;
};

const TOKEN = process.env.SLACK_BOT_TOKEN ?? readEnvKey("SLACK_BOT_TOKEN");
const CHANNEL = process.env.SLACK_CHANNEL ?? readEnvKey("SLACK_CHANNEL");
const MENTION_RAW = process.env.SLACK_MENTION ?? readEnvKey("SLACK_MENTION");

/**
 * Turn whatever is in SLACK_MENTION into something Slack will actually notify on.
 *
 * The trap worth catching is a display name. `@patrick` in message text is plain
 * text to Slack — it renders looking exactly like a mention and pings nobody, so a
 * misconfiguration here is invisible in the one place you would look for it. Only
 * an id works: a member id from your profile (⋮ → Copy member ID), a user group id,
 * or the literal `here`/`channel`.
 *
 * The length floors are what keep a name like `Uwe` from being read as a member id.
 */
const renderMention = (raw: string | undefined) => {
  const value = raw?.trim();
  if (!value) return undefined;
  if (/^<[@!][^>]+>$/.test(value)) return value; // already Slack markup
  if (/^[UW][A-Z0-9]{7,}$/.test(value)) return `<@${value}>`; // member
  if (/^S[A-Z0-9]{7,}$/.test(value)) return `<!subteam^${value}>`; // user group
  if (/^(here|channel)$/i.test(value)) return `<!${value.toLowerCase()}>`;
  return undefined;
};

/** Prefixed onto every ask, or absent. See `notifyAsk`. */
const MENTION = renderMention(MENTION_RAW);

/** Reported at startup — half-configured is the interesting case, so name it. */
export const slackStatus = TOKEN
  ? CHANNEL
    ? `on (channel ${CHANNEL})`
    : "off — SLACK_BOT_TOKEN is set but SLACK_CHANNEL is missing"
  : CHANNEL
    ? "off — SLACK_CHANNEL is set but SLACK_BOT_TOKEN is missing"
    : "off — set SLACK_BOT_TOKEN and SLACK_CHANNEL in .sandcastle/.env to get pinged";

/**
 * Who gets pinged, reported at startup next to `slackStatus` for the same reason:
 * half-configured is the interesting case. A SLACK_MENTION that is not an id is
 * the worst of those, because the messages still look right.
 */
export const mentionStatus = !MENTION_RAW
  ? "nobody — set SLACK_MENTION to your Slack member ID to be pinged when it is your turn"
  : MENTION
    ? `${MENTION} on every message that needs a human`
    : `nobody — SLACK_MENTION="${MENTION_RAW}" is not a Slack ID. Copy your member ID from your ` +
      `Slack profile (⋮ → Copy member ID): a display name is plain text to Slack and pings no one`;

export type SlackPost = {
  /** Slack's message id. Pass it back as `threadTs` to reply in its thread. */
  readonly ts?: string;
  /** Set when the message did not get through. */
  readonly error?: string;
};

/** Post to Slack, optionally as a reply in an existing message's thread. */
export const notifySlack = async (text: string, threadTs?: string): Promise<SlackPost> => {
  if (!TOKEN || !CHANNEL) return {};

  try {
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        authorization: `Bearer ${TOKEN}`,
        "content-type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        channel: CHANNEL,
        text,
        thread_ts: threadTs,
      }),
    });

    // Slack answers 200 with `ok: false` for a bad token, an unknown channel or a
    // bot that was never invited. Checking the HTTP status alone would report
    // every one of those as a delivered message.
    const body = (await response.json()) as { ok?: boolean; ts?: string; error?: string };
    if (!body.ok) return { error: body.error ?? `HTTP ${response.status}` };

    return { ts: body.ts };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
};

/**
 * The same post, marked as one the factory is waiting on a human for.
 *
 * One thing differs: it is addressed to SLACK_MENTION, because a mention is the
 * one thing Slack reliably turns into a notification even under a thread nobody
 * is following. The post itself stays in the thread with every other message
 * about that issue — a copy in the channel would say nothing the mention has not
 * already said, and it would say it where the rest of the conversation is not.
 *
 * Reserved for exactly the posts that stop on a person. A ping on every step is a
 * ping that gets muted, and then the one that mattered goes with it — the same
 * argument that removed the progress heartbeat.
 */
export const notifyAsk = (text: string, threadTs?: string): Promise<SlackPost> =>
  notifySlack(MENTION ? `${MENTION} ${text}` : text, threadTs);
