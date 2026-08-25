import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { run, claudeCode } from "@ai-hero/sandcastle";
import { sandbox, startupCommands } from "./sandbox.mts";

// Smoke test: prove the sandbox can see this repo, install its dependencies,
// modify files and pass its verification gate. One iteration, no commits.
//
// Run this with: pnpm sandcastle:smoke
// The image it needs comes from: pnpm sandcastle:build-image
//
// This is the sandbox's health check, kept separate from main.mts (the issue
// watcher) so there is always a cheap way to tell "the sandbox is broken" apart
// from "the agent could not do the task".

const REPORT = "SMOKE-REPORT.md";

const result = await run({
  name: "smoke-test",

  sandbox: sandbox(),

  // Sonnet is plenty for a checklist; the model choice is not what's under test.
  agent: claudeCode("sonnet"),

  promptFile: "./.sandcastle/prompts/smoke-test.md",

  // Single shot. The watcher in ./main.mts is what runs repeatedly.
  maxIterations: 1,

  // Isolated worktree merged back into HEAD. The agent is told not to commit, so
  // nothing should actually land on the current branch. Note this means the
  // sandbox sees HEAD, not your working tree — uncommitted changes are invisible
  // to it, which is a common way to get a confusing failure here.
  branchStrategy: { type: "merge-to-head" },

  hooks: { sandbox: { onSandboxReady: startupCommands() } },

  // Generous enough for the longest command in the checklist. This repo has no test
  // suite, so the gate is typecheck + lint + build, and `pnpm build` is a minute-plus
  // of near-silence on a cold `.next`. A false idle-timeout here would read as a
  // broken sandbox, which is exactly the diagnosis this script exists to get right.
  idleTimeoutSeconds: 600,
});

console.log("\n=== smoke test ===");
console.log(`iterations:        ${result.iterations.length}`);
console.log(`completion signal: ${result.completionSignal ?? "(never emitted)"}`);
console.log(`branch:            ${result.branch}`);
console.log(`commits:           ${result.commits.length} (expected 0)`);
console.log(`log file:          ${result.logFilePath ?? "(none)"}`);
console.log(`worktree:          ${result.preservedWorktreePath ?? "(not preserved)"}`);

// The agent leaves the report uncommitted, which keeps the worktree on disk. Reading
// the file back from the host is the actual proof that sandbox writes are real.
if (!result.preservedWorktreePath) {
  console.error(`\nFAIL: worktree was not preserved, so ${REPORT} was never written.`);
  process.exit(1);
}

const reportPath = join(result.preservedWorktreePath, REPORT);
if (!existsSync(reportPath)) {
  console.error(`\nFAIL: ${reportPath} is missing — the agent never wrote its report.`);
  process.exit(1);
}

console.log(`\n=== ${REPORT} ===\n${readFileSync(reportPath, "utf8")}`);

if (!result.completionSignal) {
  console.error("FAIL: the agent never emitted the completion signal.");
  process.exit(1);
}

// Each smoke run leaves a worktree carrying a ~2GB node_modules behind. Remove it
// with: git worktree remove --force <path>
console.log(`Smoke test passed. Remove ${result.preservedWorktreePath} when you're done with it.`);
