import { execFileSync } from "node:child_process";
import { REPO_ROOT } from "./config.mts";

// Talking to the outside world through child processes, and to you through
// stdout. Everything the watcher knows about GitHub and git comes through here.

export const log = (message: string) =>
  console.log(`[${new Date().toISOString().replace("T", " ").slice(0, 19)}] ${message}`);

export const describe = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * execFileSync with the child's stderr folded into the thrown error.
 *
 * `input` is stdin, for the plumbing commands that take their argument that way —
 * `git mktree` reads a tree listing from it. Optional, so every existing caller is
 * unchanged, and never a place to put a secret: an argument list is visible in `ps`
 * and so, briefly, is nothing on stdin, but neither is a hiding place.
 */
export const capture = (file: string, args: string[], input?: string) => {
  try {
    return execFileSync(file, args, { cwd: REPO_ROOT, encoding: "utf8", input }).trim();
  } catch (error) {
    const { stderr, stdout } = error as { stderr?: string; stdout?: string };
    const detail = (stderr || stdout || "").trim() || describe(error);
    throw new Error(`\`${file} ${args.join(" ")}\` failed: ${detail}`);
  }
};

export const git = (...args: string[]) => capture("git", args);
export const gh = (...args: string[]) => capture("gh", args);
