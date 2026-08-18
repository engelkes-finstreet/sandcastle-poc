import { existsSync } from "node:fs";
import { AWAITING_LABEL, BASE_BRANCH, LABEL, MODEL, POLL_SECONDS } from "./config.mts";
import { REPO, awaitingIssueNumbers, queuedIssues } from "./github.mts";
import { slackStatus } from "./notify.mts";
import { describe, log } from "./shell.mts";
import { controller, sleep } from "./shutdown.mts";
import { loadPending, statePath } from "./state.mts";
import { startIssue, servicePending } from "./workflow.mts";
import type { Issue } from "./types.mts";

// The watcher. Runs until you stop it, polling GitHub for open issues labelled
// `Sandcastle`. Each issue goes through four phases, and a human sits between
// the first and the third:
//
//   1. plan        — a container reads the issue, runs the `kickoff` skill, and
//                    returns a plan. It writes no code. The host opens a *draft*
//                    pull request whose description is that plan.
//   2. review      — you comment on that pull request. `approve` moves to phase 3;
//                    anything else is a change request and the agent revises the
//                    plan; `abandon` stops. No container is alive while you think.
//   3. implement   — a new container *resumes the planning session*, so the agent
//                    still has everything it read in phase 1, and writes the code.
//                    The host pushes and marks the pull request ready for review.
//   4. code review — a container with *no* memory of any of that reads the diff
//                    the way a stranger would: is it more complicated than the
//                    problem, does it hold to this repo's standards, and does each
//                    part follow the skill that part should have followed. The
//                    host posts it as a pull request comment. It never fixes.
//                    *Switched off for now* — written and wired, but its one call
//                    is commented out in workflow.mts. An issue is done after 3.
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
// Phase 2 can last days, and the watcher survives being restarted inside it:
// what it needs is written to .sandcastle/state/issue-<n>.json and mirrored into
// the pull request description. See the Pending type in types.mts for what is
// durable and why.
//
// One issue is in flight at a time — while an issue waits for plan approval,
// nothing else is picked up. Same reasoning as the old pause on open pull
// requests: parallel branches cut from the same commit conflict with each other,
// and a queue of half-reviewed plans is worse than a queue of untouched issues.
//
// This file is the loop and nothing else. The parts it drives:
//
//   config.mts    every knob and path             state.mts     the state file
//   types.mts     the shapes that travel          github.mts    issues, labels, the plan PR
//   shell.mts     git, gh, logging                notify.mts    what Slack says, in order
//   shutdown.mts  Ctrl-C, interruptible sleep     phases.mts    the four agent runs
//   sandbox.mts   the container and its startup   workflow.mts  what to do with an issue
//   slack.mts     the Slack transport

log(`Watching ${REPO} for open issues labelled "${LABEL}".`);
log(`Base ${BASE_BRANCH} · model ${MODEL} · polling every ${POLL_SECONDS}s · Ctrl-C to stop.`);
log(`Slack notifications ${slackStatus}.`);

// An issue wearing the awaiting-approval label with no state file behind it is
// stuck: its plan is on a pull request nobody is polling. Say so once at startup
// rather than leaving it silently parked forever.
try {
  const orphans = awaitingIssueNumbers().filter((number) => !existsSync(statePath(number)));

  if (orphans.length > 0) {
    log(
      `WARNING: #${orphans.join(", #")} carry "${AWAITING_LABEL}" but have no state ` +
        `in .sandcastle/state/. Their plan pull requests are not being polled — close them and re-add ` +
        `the "${LABEL}" label to start over.`,
    );
  }
} catch (error) {
  log(`Could not check for orphaned plans: ${describe(error)}`);
}

while (!controller.signal.aborted) {
  // An issue out for review comes first: an approval that arrived hours ago
  // should be acted on before a newly labelled issue is planned.
  const pending = loadPending();
  if (pending) {
    if (!(await servicePending(pending))) break;
    continue;
  }

  let queue: Issue[];
  try {
    queue = queuedIssues();
  } catch (error) {
    log(`Poll failed, retrying in ${POLL_SECONDS}s: ${describe(error)}`);
    await sleep(POLL_SECONDS);
    continue;
  }

  if (queue.length === 0) {
    await sleep(POLL_SECONDS);
    continue;
  }

  const [issue, ...rest] = queue;
  log(`#${issue.number} ${issue.title}${rest.length > 0 ? ` (${rest.length} more queued)` : ""}`);

  if (!(await startIssue(issue, rest.length))) break;
}

log("Watcher stopped.");
