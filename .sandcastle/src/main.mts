import { existsSync } from "node:fs";
import { BASE_BRANCH, LABEL, MODEL, POLL_SECONDS } from "./config.mts";
import { mentionStatus, slackStatus } from "./notify.mts";
import { rescueLeftovers } from "./phases.mts";
import { describe, log } from "./shell.mts";
import { controller, sleep } from "./shutdown.mts";
import { loadTracked, statePath } from "./state.mts";
import { tracker } from "./tracker.mts";
import {
  flushReports,
  reportQueue,
  reportStarted,
  reportSync,
  startHeartbeat,
  watchtowerStatus,
  workingOn,
} from "./watchtower.mts";
import { startIssue, serviceTracked } from "./workflow.mts";
import type { Issue } from "./types.mts";

// The watcher. Runs until you stop it, polling GitHub for open issues labelled
// `Sandcastle`. Each issue goes through five phases, and a human sits between
// the first and the third, and again after it:
//
//   1. plan        — a container reads the issue, runs the `kickoff` skill, and
//                    returns a plan. It writes no code. The host opens a *draft*
//                    pull request whose description is that plan.
//   2. review      — you comment on that pull request. `approve` moves to phase 3,
//                    and whatever else that comment says overrides the plan;
//                    `abandon` stops. Any other comment changes nothing — the
//                    watcher says so and keeps waiting. No container is alive
//                    while you think.
//   3. implement   — a new container, a *fresh* session: the approved plan and the
//                    repo's skills are the whole brief, and nothing of phase 1's
//                    conversation is carried over. It writes the code; the host
//                    pushes and marks the pull request ready for review.
//   4. code review — a container with *no* memory of any of that reads the diff
//                    the way a stranger would: is it more complicated than the
//                    problem, does it hold to this repo's standards, and does each
//                    part follow the skill that part should have followed. The
//                    host posts it as a pull request comment. It never fixes.
//                    *Switched off for now* — written and wired, but its one call
//                    is commented out in workflow.mts.
//   5. follow-up   — you read the shipped code and comment `revise`. A fresh
//                    container is handed the diff and everything you have said
//                    since the last run, and changes what you asked for. Three
//                    rounds, then the watcher says so and lets go. Merging or
//                    closing the pull request is what actually ends an issue.
//
//   pnpm sandcastle                              # foreground, Ctrl-C to stop
//   node_modules/.bin/tsx .sandcastle/src/main.mts & # background, stop with kill -INT
//
// Background it through tsx rather than pnpm: pnpm does not forward a signal
// sent to it alone, so `kill` on the pnpm pid leaves the watcher running.
//
// The image comes from `pnpm sandcastle:build-image`; `pnpm sandcastle:smoke`
// checks the sandbox itself when a run fails in a way that smells structural.
//
// **One run at a time, many issues tracked.** The waits here are days long — a
// human reading a plan, a human reading a diff — and the runs are minutes, so the
// watcher never blocks on a person. It holds every issue that has a state file,
// services whichever one has something to act on, and only sleeps when none of
// them did. What it does *not* do is run two containers at once: that would want
// worktree isolation git will not give it, to shorten the part of the cycle that
// was never the bottleneck. See
// docs/adr/0006-a-shipped-pull-request-still-listens.md.
//
// Phases 2 and 5 can last days, and the watcher survives being restarted inside
// either: what it needs is in .sandcastle/state/issue-<n>.json and mirrored into
// the pull request. See the Tracked type in types.mts for what is durable and why.
//
// This file is the loop and nothing else. The parts it drives:
//
//   config.mts    every knob and path             state.mts       the state files
//   types.mts     the shapes that travel          tracker.mts     the Tracker port; trackers/ its adapters
//   shell.mts     git, gh, logging                forge.mts       the plan PR and everything PR-shaped
//   shutdown.mts  Ctrl-C, interruptible sleep     notify.mts      what both sinks say
//   sandbox.mts   the container and its startup   phases.mts      the agent runs
//   slack.mts     the Slack transport             workflow.mts    what to do with an issue
//                                                 watchtower.mts  the dashboard transport

// Fail-fast: a tracker the watcher cannot authenticate against must end the
// process with a message saying what to fix, not surface later as an empty
// queue. A no-op on GitHub, where importing the forge already proved `gh`.
await tracker.verify();

log(`Watching ${tracker.source}.`);
log(`Base ${BASE_BRANCH} · model ${MODEL} · polling every ${POLL_SECONDS}s · Ctrl-C to stop.`);
log(`Slack notifications ${slackStatus}.`);
log(`Pinging ${mentionStatus}.`);
log(`Watchtower ${watchtowerStatus}.`);

// A run that died without reaching workflow.mts's error path — Ctrl-C, `kill`, a
// closed laptop, a crashed host — never got the chance to save what it had written.
// Its worktree is still on disk with the files in it, so the first thing a fresh
// watcher does is commit them onto their branch. See rescueLeftovers in phases.mts.
rescueLeftovers();

// An issue the tracker's mirror says the watcher is holding, with no state file
// behind it, is stuck: its pull request is not being polled by anything. Say so
// once at startup rather than leaving it silently parked forever.
try {
  const orphans = (await tracker.mirroredKeys()).filter((key) => !existsSync(statePath(key)));

  if (orphans.length > 0) {
    log(
      `WARNING: ${[...new Set(orphans)].map(tracker.issueRef).join(", ")} carry a Sandcastle state label but have no ` +
        `state in .sandcastle/state/. Their pull requests are not being polled — merge or close ` +
        `them, or re-add the "${LABEL}" label to the issue to start over.`,
    );
  }
} catch (error) {
  log(`Could not check for orphaned issues: ${describe(error)}`);
}

// Watchtower's board is seeded from the state files rather than from a backfill
// script: the watcher says it is up, then says what it is already holding, and a
// Project onboarded this morning has this afternoon's pull requests on it. Then
// the heartbeat, which runs on its own timer rather than on this loop — see
// startHeartbeat for why. All three are silent no-ops until the project is
// onboarded, and none of them can fail a run.
await reportStarted();
await reportSync(loadTracked());
startHeartbeat();

/**
 * Tracked issues first, oldest first, and only then something new. It is the old
 * "service the pending issue before planning another" rule generalised: finish what
 * you started before taking work on, or a growing pile of half-reviewed pull
 * requests gets fed by a watcher that would rather plan something fresh.
 */
while (!controller.signal.aborted) {
  const tracked = loadTracked();
  let worked = false;

  for (const issue of tracked) {
    workingOn(issue.issue);
    const serviced = await serviceTracked(issue);
    workingOn(undefined);
    if (serviced === "stopped") break;
    // State changed on disk, so the set of tracked issues is stale — go round
    // again and re-read it rather than servicing the rest against old records.
    if (serviced === "worked") {
      worked = true;
      break;
    }
  }

  if (controller.signal.aborted) break;
  if (worked) continue;

  let queue: Issue[];
  try {
    queue = await tracker.queuedIssues();
  } catch (error) {
    log(`Poll failed, retrying in ${POLL_SECONDS}s: ${describe(error)}`);
    await sleep(POLL_SECONDS);
    continue;
  }

  // Everything currently labelled, whether or not this watcher is about to act on
  // it. Watchtower reads it as the full truth about what is queued, so an issue
  // that lost its label is dropped from the board by being absent from this.
  await reportQueue(queue);

  // Relabelling normally keeps a tracked issue out of this queue, but somebody
  // re-adding the label by hand should not start a second run against a branch
  // that already has one.
  const fresh = queue.filter((issue) => !tracked.some((t) => t.issue.key === issue.key));

  if (fresh.length === 0) {
    await sleep(POLL_SECONDS);
    continue;
  }

  const [issue, ...rest] = fresh;
  const waiting = tracked.length > 0 ? `, ${tracked.length} in flight` : "";
  log(`${tracker.issueRef(issue.key)} ${issue.title}${rest.length > 0 ? ` (${rest.length} more queued${waiting})` : waiting}`);

  workingOn(issue);
  const started = await startIssue(issue, rest.length);
  workingOn(undefined);
  if (!started) break;
}

// Whatever is still in the outbox has nowhere else to go: there is no next tick to
// retry on, and an event that dies here is a card left saying something untrue.
await flushReports();

log("Watcher stopped.");
