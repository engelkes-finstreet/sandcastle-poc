import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { STATE } from "./config.mts";
import { compareIssueKeys } from "./github.mts";
import { describe, log } from "./shell.mts";
import type { Tracked } from "./types.mts";

// The watcher's memory across restarts, in .sandcastle/state/. An issue can wait
// days for a plan approval and days more for a change request; this is what makes
// stopping the watcher during either a non-event.
//
// One file per issue, and every one of them live at once. The watcher runs a
// single agent at a time but tracks as many issues as have state here — see
// docs/adr/0006-a-shipped-pull-request-still-listens.md.

export const statePath = (issueKey: string) => join(STATE, `issue-${issueKey}.json`);

/**
 * Every tracked issue, oldest issue first, so the loop services them FIFO.
 *
 * Sorted by key with numeric-aware comparison rather than by filename:
 * `issue-10.json` sorts before `issue-2.json` as a plain string, which would make
 * the queue newest-wins for any repository that reaches double digits.
 *
 * Deliberately tolerant: an unreadable or malformed state file is renamed rather
 * than deleted, so a bug here cannot silently lose the only pointer to an open
 * pull request. One bad file no longer costs the others their turn either — it is
 * skipped, not returned.
 */
export const loadTracked = (): Tracked[] => {
  if (!existsSync(STATE)) return [];

  const tracked: Tracked[] = [];

  for (const name of readdirSync(STATE).filter((n) => n.endsWith(".json"))) {
    const path = join(STATE, name);
    try {
      tracked.push(JSON.parse(readFileSync(path, "utf8")) as Tracked);
    } catch (error) {
      const broken = `${path}.broken`;
      log(`  WARNING: ${path} is unreadable (${describe(error)}); moved to ${broken}`);
      try {
        execFileSync("mv", [path, broken]);
      } catch {
        rmSync(path, { force: true });
      }
    }
  }

  return tracked.sort((a, b) => compareIssueKeys(a.issue.key, b.issue.key));
};

export const saveTracked = (tracked: Tracked) => {
  mkdirSync(STATE, { recursive: true });
  writeFileSync(statePath(tracked.issue.key), `${JSON.stringify(tracked, null, 2)}\n`);
};

export const clearTracked = (issueKey: string) => rmSync(statePath(issueKey), { force: true });
