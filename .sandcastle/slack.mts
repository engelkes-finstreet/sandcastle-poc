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
//
// Either can come from the shell instead, which takes precedence.
//
// Notifications are best-effort. A watcher that dies because Slack had a bad
// minute would be worse than one that misses a ping.

const ENV_FILE = fileURLToPath(new URL(".env", import.meta.url));

/**
 * Read a single key out of .sandcastle/.env rather than loading the file.
 *
 * That file also holds GH_TOKEN, which is scoped for the sandbox's issue reads.
 * Loading it into the host process would shadow your own gh credentials for the
 * `git push` and `gh pr create` in main.mts, and those need permissions the
 * sandbox token does not have.
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

/** Reported at startup — half-configured is the interesting case, so name it. */
export const slackStatus = TOKEN
  ? CHANNEL
    ? `on (channel ${CHANNEL})`
    : "off — SLACK_BOT_TOKEN is set but SLACK_CHANNEL is missing"
  : CHANNEL
    ? "off — SLACK_CHANNEL is set but SLACK_BOT_TOKEN is missing"
    : "off — set SLACK_BOT_TOKEN and SLACK_CHANNEL in .sandcastle/.env to get pinged";

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
      body: JSON.stringify({ channel: CHANNEL, text, thread_ts: threadTs }),
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
