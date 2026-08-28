import { defineConfig } from "@finstreet/golem-engine";

// This golem's configuration: everything the Engine refuses to have an opinion
// about, because the Engine is a pinned dependency several repositories share and
// a default that suits one of them is a trap for the others.
//
// The Engine validates this file when it loads it and refuses to start on a
// problem, naming the file and every problem in it at once. `defineConfig` is an
// identity function — it is here for the editor types and for the argument that
// these comments are worth more than JSON's terseness.
//
// What is *not* here: which board this golem polls, which Slack channel it talks
// to, which credentials it holds. That is the Profile, and it lives in
// `.sandcastle/host.env`, which is not committed.

export default defineConfig({
  /**
   * The gate: what an agent must run green before it commits, in order, and what
   * each must produce. This repository has no unit or integration test suite, so
   * these three are the whole of it — nothing here has been *used*, only checked,
   * and every pull request the golem opens says so.
   *
   * That last sentence is why the claim lives *here* rather than in a prompt: it is
   * true of this repository and not of the stack, and a Kit that asserted it would
   * be asserting it about every repository it is vendored into.
   *
   * Edit this and everything that names the gate changes with it. The six prompts
   * carry `{{gate}}` or `{{gate_commands}}` and the Engine renders them as it loads
   * each one; the two pull-request comments that claim the gate was green build
   * their sentence from the same value. It used to be prose in all eight, each in
   * its own words, and nothing kept them in step.
   *
   * The wording below is quoted from those prompts rather than invented, so that
   * single-sourcing changed nothing about what an agent is told.
   */
  gate: [
    { command: "pnpm exec tsc --noEmit", expect: "must be clean" },
    {
      command: "pnpm lint",
      expect:
        "no new errors. One pre-existing warning about an unused " +
        "`getFspFinancingCaseOverview` is expected; leave it alone",
    },
    { command: "pnpm build", expect: "must reach Next's route table" },
  ],

  /**
   * The plugins every run installs, in full. An allowlist rather than a list of
   * exceptions: a plugin nobody named cannot reach a container at all, which is
   * what stops a personal plugin enabled in `.claude/settings.json` from taking a
   * run down in setup — that is not hypothetical, it happened twice over, first on
   * a clone the container cannot authenticate over SSH and then on one too large
   * for the CLI's default timeout.
   *
   * A plugin a run needs has to be in both places: enabled in
   * `.claude/settings.json`, so its marketplace source is declared, and named here.
   *
   * Deliberately absent, and both worth leaving absent:
   *
   * - `mattpocock-skills`, whose skills are for a person at a terminal. No prompt
   *   under `.sandcastle/prompts` loads one, and `code-review.md` carries its own
   *   two-axis structure and smell baseline inline precisely so that a run does not
   *   depend on it.
   * - `playwright`, which the walkthrough phase asks for by itself. One phase needs
   *   a browser and four do not, and a plugin every phase installs is a plugin every
   *   phase can be broken by.
   */
  plugins: ["finstreet-dev@finstreet-plugins", "finstreet-fe@finstreet-plugins"],

  /**
   * Keys that only mean anything *inside* the container, so that the Engine can
   * refuse to start when one of them has been left in `host.env` — where it would
   * never reach the agent. That failure is silent: what you see instead is
   * ERR_PNPM_FETCH_401 nine minutes into an install, or an agent that looks like it
   * ignored its tools.
   *
   * The agent's login, then the registry `pnpm` authenticates against, then the
   * bearer token for the finstreet-mcp server the `finstreet-fe` plugin carries.
   * Declaring one here does not forward it — `.sandcastle/.env` is what does that,
   * because @ai-hero/sandcastle reads that path and forwards every key listed in it.
   */
  sandboxOnlyKeys: [
    "CLAUDE_CODE_OAUTH_TOKEN",
    "ANTHROPIC_API_KEY",
    "NPM_AUTH_TOKEN",
    "FINSTREET_MCP_TOKEN",
  ],

  /**
   * The two cheap phases. Both read through the Engine's config, where
   * `GOLEM_REVIEW_MODEL` and `GOLEM_WALKTHROUGH_MODEL` still win for a single run.
   *
   * The review is a bounded reading task against a diff that already compiles — the
   * skills carry the judgement, so the model mostly has to follow them carefully,
   * and a review costing a fraction of the implementation is a review nobody is
   * tempted to switch off. The walkthrough is one step stronger: its output is a
   * photograph, and what it *judges* never reaches the pull request, only what it
   * *loaded*. Driving a login and a couple of routes is mechanical.
   */
  models: {
    review: "sonnet",
    walkthrough: "sonnet",
  },

  /**
   * The two optional phases. Both off, which is what this golem has always done —
   * they used to be commented-out call sites in the Engine, and turning one on meant
   * editing a dependency four repositories share.
   *
   * Declared rather than defaulted, like everything else here. A phase costs a
   * container per issue and changes what a pull request carries, so the Engine makes
   * every golem say which of them it wants rather than letting one be inherited from
   * a version bump.
   *
   * `codeReview` is ready to switch on and costs one more container per issue — a
   * fresh session that reads the pushed diff along two axes and comments. What is
   * being established first is that plan → approve → implement works end to end
   * through Jira on this infrastructure, and a second opinion landing in the middle
   * of that is one more thing to read while you are still deciding whether the part
   * you care about worked.
   *
   * `walkthrough` is behind it and needs something this repository has not written:
   * `prompts/walkthrough.md` leaves its Step 2 — how to start the app, log in and
   * drive a browser — as a placeholder. Switching it on today reaches the phase and
   * gets an honest *No walkthrough* in Slack, which is the phase working correctly
   * and not what anybody wants it for.
   */
  phases: {
    codeReview: false,
    walkthrough: false,
  },
});
