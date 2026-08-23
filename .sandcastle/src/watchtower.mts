import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createEmitter, type EventBody } from "@finstreet/watchtower-golem/emitter";
import type {
  ChangeRequestRef,
  ChangeRequestState,
  EventType,
  ExternalRef,
  RunOutcome,
  SyncedTask,
} from "@finstreet/watchtower-golem/events";
import { BASE_BRANCH, MAX_REVISION_ROUNDS, SANDCASTLE } from "./config.mts";
import { issueUrl } from "./github.mts";
import { describe, git, log } from "./shell.mts";
import { controller } from "./shutdown.mts";
import type { Issue, Outcome, Tracked } from "./types.mts";

// Watchtower, the second sink. slack.mts's sibling and read the same way: the
// transport, the identifiers and the one thing that has to be remembered, with
// notify.mts as the voice over both.
//
// Slack is a conversation and this is a record, but they are fed from exactly the
// same moments — every announce* in notify.mts sends its event beside its
// message, and the four Golem-level events here are the ones Slack has no message
// for: the process came up, it is still up, this is what it is holding, this is
// what is queued.
//
// **Nothing here may cost a run.** The emitter's own contract is that it never
// throws and that unset config is silently off (@finstreet/watchtower-golem), so
// a repository nobody has onboarded cannot tell the package is installed. This
// module adds the same discipline to the small amount of work it does on top:
// every event body is built inside `report`'s guard, and every file it touches is
// best-effort.
//
// Setup is two lines in .sandcastle/.env, minted by Watchtower's settings page
// when the Project is created:
//
//   WATCHTOWER_URL=https://…
//   WATCHTOWER_API_KEY=wt_…
//
// Either of them missing is reported at startup as off, saying which half.

/** Everything the second sink remembers, in one gitignored directory. */
const WATCHTOWER = join(SANDCASTLE, "watchtower");

const emitter = createEmitter({
  // The package lives in node_modules and cannot find the watcher's .env for
  // itself. Same file slack.mts reads, and read for the same reason: it is the
  // checked-out default that a shell variable may override for one run.
  envFile: new URL("../.env", import.meta.url),
  // Inside .sandcastle/ rather than the process's cwd, which for the watcher is
  // the repository it is working in — an untracked directory appearing at the
  // root mid-run is something a `git add -A` can swallow.
  outboxDir: WATCHTOWER,
  log: (message) => log(`  watchtower: ${message}`),
});

/** Reported at startup beside slackStatus — half-configured is the interesting case. */
export const watchtowerStatus = emitter.status;

/**
 * Report one event, and swallow everything that could go wrong doing it.
 *
 * The body arrives as a thunk rather than a value for two reasons. Building it
 * is then inside the guard — an event body reads a Generation off disk and
 * interpolates a URL, and a Slack message a human is waiting on must not be able
 * to fail because the second sink could not spell a ref. And it does not happen
 * at all when the emitter is off: `emit` is already a silent no-op, but building
 * the body would still count a Generation and create a directory, which is a
 * trace in a repository nobody has onboarded. Off is off on this side too.
 */
export const report = async <T extends EventType>(
  type: T,
  event: () => EventBody<T>,
): Promise<void> => {
  if (!emitter.on) return;
  try {
    await emitter.emit(type, event());
  } catch (error) {
    log(`  WARNING: watchtower ${type} was not reported: ${describe(error)}`);
  }
};

/** Empty the outbox on the way out: there is no next tick to retry on. */
export const flushReports = () => emitter.flush();

// ------------------------------------------------------------- identifiers

/**
 * How this factory's issues are named on the wire. The watcher's own identity for
 * an issue is already the opaque string key the wire wants, so this only has to
 * say which tracker minted it and where it lives.
 */
export const refFor = (issue: Issue): ExternalRef => ({
  trackerType: "github",
  externalKey: issue.key,
  url: issueUrl(issue.key),
});

/** The same for a pull request, from whichever shape has one in hand. */
export const changeRequestFor = (pr: { number: number; url: string }): ChangeRequestRef => ({
  kind: "github_pull_request",
  key: String(pr.number),
  url: pr.url,
});

export const changeRequestOf = (tracked: Pick<Tracked, "prNumber" | "prUrl">): ChangeRequestRef =>
  changeRequestFor({ number: tracked.prNumber, url: tracked.prUrl });

/** The factory says `no-changes`; the wire says `no_changes`. Mapped, never guessed. */
const OUTCOMES: Record<Outcome, RunOutcome> = {
  shipped: "shipped",
  blocked: "blocked",
  "no-changes": "no_changes",
  "no-signal": "no_signal",
};

export const outcomeOf = (outcome: Outcome): RunOutcome => OUTCOMES[outcome];

/** `gh pr view` answers MERGED or CLOSED, and only those two reach here. */
export const endingOf = (state: string): ChangeRequestState =>
  state.toUpperCase() === "MERGED" ? "merged" : "closed";

// ------------------------------------------------------------- generations

/**
 * The Generation counter — the one fact the wire needs that the factory
 * deliberately does not keep.
 *
 * A Generation is the attempt counter on a Task: a human re-labelling a failed
 * issue gets the *same* Task planned again as attempt n+1, so the two attempts
 * never interleave into one history. The watcher cannot tell you that, because a
 * stopped issue's state file is deleted — the forgetting is the feature — so the
 * number is remembered here, beside the emitter's own outbox and for the same
 * reason: what is handed out has to survive the process that handed it out.
 *
 * Kept out of .sandcastle/state/ on purpose. `loadTracked` parses every *.json in
 * there as a tracked issue, so a counter file would come back as a nonsense one.
 *
 * Losing this file resets every issue to generation 1, and Watchtower declines an
 * event that goes backwards — those cards would freeze where they are until a
 * fresh plan counts past them again. That is the same exposure the outbox already
 * carries for `seq`, which is why the two live in the same directory.
 */
const GENERATIONS = join(WATCHTOWER, "generations.json");

let generations: Record<string, number> | undefined;

/**
 * Whether what was on disk is the record of numbers the rest of this file
 * assumes. `JSON.parse` is happy to hand back `null`, a number or an array, and
 * every one of those reaches `current[key] = next` as a `TypeError` that
 * `report` would swallow — leaving a watcher whose banner says `Watchtower on`
 * and whose every event silently disappears. The outbox shape-checks its own
 * counters for the same reason.
 */
const isCounters = (value: unknown): value is Record<string, number> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  return Object.values(value).every((count) => typeof count === "number");
};

/** What a lost or unusable counter file costs, said once and the same way for both. */
const startingOver = (why: string): Record<string, number> => {
  log(
    `  WARNING: ${GENERATIONS} ${why} — attempts will be counted from 1 again, and Watchtower ` +
      `will hold any card that is already past that until a fresh plan counts past it`,
  );
  return {};
};

const loaded = (): Record<string, number> => {
  if (generations) return generations;

  let parsed: unknown;
  try {
    if (!existsSync(GENERATIONS)) return (generations = {});
    parsed = JSON.parse(readFileSync(GENERATIONS, "utf8"));
  } catch (error) {
    return (generations = startingOver(`is unreadable (${describe(error)})`));
  }

  return (generations = isCounters(parsed)
    ? parsed
    : startingOver("is not a record of attempt counts"));
};

/** Written whole and renamed into place, so a crash mid-write cannot leave half a number. */
const persist = (current: Record<string, number>) => {
  try {
    mkdirSync(WATCHTOWER, { recursive: true });
    const temporary = `${GENERATIONS}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(current, null, 2)}\n`);
    renameSync(temporary, GENERATIONS);
  } catch (error) {
    log(`  WARNING: ${GENERATIONS} could not be saved: ${describe(error)}`);
  }
};

/** Which attempt this issue is on. Unknown means the first one. */
export const generationOf = (issueKey: string): number => loaded()[issueKey] ?? 1;

/**
 * A fresh plan is a fresh attempt, so this is the one place the number moves.
 * Called from announcePlanning; every event after it reads what it set.
 */
export const nextGeneration = (issueKey: string): number => {
  const current = loaded();
  const next = (current[issueKey] ?? 0) + 1;
  current[issueKey] = next;
  persist(current);
  return next;
};

/**
 * The three fields every Task event carries, from whatever names the Task at that
 * call site. The Slack thread rides along on all of them rather than belonging to
 * one: it is created by the first message and survives a restart, so any event is
 * as good a carrier as the next.
 */
export const about = (issue: Issue, threadTs?: string) => ({
  externalRef: refFor(issue),
  generation: generationOf(issue.key),
  slackThreadTs: threadTs,
});

// ------------------------------------------------------------ Golem level

/**
 * Which Golem this is, as precisely as the host can say it: the last commit that
 * touched .sandcastle/, which is the factory's own source. Best-effort — a
 * shallow clone or a missing git is worth a vaguer answer, never a failed
 * startup.
 */
const golemVersion = (() => {
  try {
    return git("log", "-1", "--format=%h", "--", ".sandcastle") || "unknown";
  } catch {
    return "unknown";
  }
})();

/** The two states the watcher persists, in Watchtower's vocabulary. */
const SYNCED_STATUS = {
  "awaiting-plan": "AWAITING_APPROVAL",
  "awaiting-revision": "AWAITING_REVISION",
} as const;

const syncedFrom = (tracked: Tracked): SyncedTask => ({
  externalRef: refFor(tracked.issue),
  title: tracked.issue.title,
  status: SYNCED_STATUS[tracked.status],
  generation: generationOf(tracked.issue.key),
  branch: tracked.branch,
  changeRequest: changeRequestOf(tracked),
  rounds: tracked.status === "awaiting-revision" ? tracked.revisionRounds : undefined,
  maxRounds: MAX_REVISION_ROUNDS,
  plan: tracked.plan,
  slackThreadTs: tracked.threadTs,
});

/** The Golem came up. The first thing a newly onboarded Project ever sees. */
export const reportStarted = () =>
  report("Golem.started", () => ({ payload: { golemVersion, baseBranch: BASE_BRANCH } }));

/**
 * What the watcher is holding, read straight off the state files at startup.
 *
 * This is what makes onboarding a running factory a restart rather than a
 * backfill script: a Project created today gets yesterday's in-flight pull
 * requests on its board. It heals *state*, not history — the events missed while
 * Watchtower was unreachable stay missed, and a state file has no record of who
 * was pinged, so it can put a card in the right column but never in the "Needs
 * you" strip.
 */
export const reportSync = (tracked: readonly Tracked[]) =>
  report("Golem.sync", () => ({
    payload: { golemVersion, tasks: tracked.map(syncedFrom) },
  }));

/**
 * Everything currently labelled, as a whole list rather than a delta: an issue
 * that lost its label while the watcher was busy is only observable as an absence
 * from a complete one.
 */
export const reportQueue = (queued: readonly Issue[]) =>
  report("queue.snapshot", () => ({
    payload: {
      queued: queued.map((issue) => ({ externalRef: refFor(issue), title: issue.title })),
    },
  }));

// -------------------------------------------------------------- heartbeat

/** What the watcher is working on right now, for the heartbeat to carry. */
let currentTask: Issue | undefined;

export const workingOn = (issue: Issue | undefined) => {
  currentTask = issue;
};

const beat = () =>
  report("Golem.heartbeat", () => ({
    payload: { golemVersion, currentTask: currentTask ? refFor(currentTask) : null },
  }));

/**
 * How often to speak, and **not** a knob.
 *
 * Watchtower assumes this cadence rather than asking for it — deliberately, so
 * that a Golem which slowed to an hourly tick could not keep calling itself
 * healthy — and calls a Golem offline after three missed beats. Its constant is
 * `HEARTBEAT_INTERVAL_MS` in `@watchtower/contract`, and this one has to match it.
 *
 * Which is why this is not `POLL_SECONDS`. That is a documented knob: an operator
 * raising it to 600 to cut `gh` API load would push the beat past Watchtower's
 * six-minute threshold and render a perfectly healthy watcher permanently dead —
 * the exact lie the heartbeat exists to prevent, arrived at from the other side.
 * How often this watcher checks GitHub and how often it says it is alive are two
 * different questions.
 */
const HEARTBEAT_SECONDS = 120;

/**
 * The sign of life, on a timer rather than in the poll loop.
 *
 * The loop is the obvious place and the wrong one. A single implement run holds
 * it for as long as the work takes — up to the fifteen-minute idle timeout — and
 * Watchtower calls a Golem offline after three missed beats, so a watcher doing
 * exactly what it is meant to be doing would render dead in the middle of doing
 * it. The one thing a heartbeat is for is telling a dead watcher from a quiet one,
 * and a heartbeat that lies about the busy case tells you nothing at all.
 *
 * So the timer says what is true — the process is up — and `workingOn` says what
 * it is up to. `currentTask: null` is a fact, not an omission: idle is worth
 * stating.
 */
export const startHeartbeat = () => {
  void beat();
  const timer = setInterval(() => void beat(), HEARTBEAT_SECONDS * 1000);
  // Nothing about a heartbeat should hold the process open on the way out, or
  // keep beating after Ctrl-C while the current step finishes.
  timer.unref();
  controller.signal.addEventListener("abort", () => clearInterval(timer), { once: true });
};
