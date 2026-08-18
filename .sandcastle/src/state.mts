import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { STATE } from "./config.mts";
import { describe, log } from "./shell.mts";
import type { Pending } from "./types.mts";

// The watcher's memory across restarts, in .sandcastle/state/. Phase 2 can last
// days; this is what makes stopping the watcher during it a non-event.

export const statePath = (issueNumber: number) => join(STATE, `issue-${issueNumber}.json`);

/**
 * The one pending issue, if any. Deliberately tolerant: an unreadable or
 * malformed state file is renamed rather than deleted, so a bug here cannot
 * silently lose the only pointer to an open plan.
 */
export const loadPending = (): Pending | undefined => {
  if (!existsSync(STATE)) return undefined;

  for (const name of readdirSync(STATE).filter((n) => n.endsWith(".json")).sort()) {
    const path = join(STATE, name);
    try {
      return JSON.parse(readFileSync(path, "utf8")) as Pending;
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
  return undefined;
};

export const savePending = (pending: Pending) => {
  mkdirSync(STATE, { recursive: true });
  writeFileSync(statePath(pending.issue.number), `${JSON.stringify(pending, null, 2)}\n`);
};

export const clearPending = (issueNumber: number) => rmSync(statePath(issueNumber), { force: true });
