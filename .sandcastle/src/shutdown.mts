import { log } from "./shell.mts";

// Ctrl-C handling, shared by everything that waits. One signal stops the watcher
// after the step it is in; a second one gives up on being polite.

export const controller = new AbortController();

const requestShutdown = () => {
  if (controller.signal.aborted) {
    log("Second interrupt — exiting now.");
    process.exit(130);
  }
  log("Stopping after the current step. Ctrl-C again to kill it immediately.");
  controller.abort(new Error("watcher interrupted"));
};

process.on("SIGINT", requestShutdown);
process.on("SIGTERM", requestShutdown);

/** Sleep that returns early on shutdown, so Ctrl-C is never stuck behind a poll. */
export const sleep = (seconds: number) =>
  new Promise<void>((resolve) => {
    const done = () => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(done, seconds * 1000);
    controller.signal.addEventListener("abort", done, { once: true });
  });
