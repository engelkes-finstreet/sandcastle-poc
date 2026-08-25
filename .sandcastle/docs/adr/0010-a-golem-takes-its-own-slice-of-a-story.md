# A golem takes its own slice of a story

An ESCB story is not one piece of work. It is written as one issue with a `[FE]` subtask and a
`[BE]` subtask under it, and those two are different *repositories* — the frontend app and the
backend service — each with its own golem. The label, meanwhile, goes on the story: one label, on
the thing a product owner is looking at.

Before this, a golem handed that story implemented all of it. In a frontend repository that means
planning a backend subtask it cannot write, or worse, writing a frontend approximation of it. The
factory had no notion that an issue might be a container for several repositories' work.

## The rule is a committed per-repository file

`.sandcastle/jira-subtasks.json`, read by `trackers/jira.mts` at construction:

```json
{ "mine": "[FE]", "others": ["[BE]"] }
```

`mine` marks the subtasks to work on; `others` marks the ones to leave alone. Both are matched as
substrings of the subtask's summary, ignoring case, because what a team has is a naming
convention, not a Jira field.

A file rather than environment variables, for the reason the transition map is one (§0008) and one
reason more. Which transitions a workflow offers is a property of the *project*; which discipline
a golem writes is a property of the *repository it is pointed at* — and a repository's own file is
the only place that fact cannot drift away from the code it describes. The backend golem's copy of
this file differs in two words and lives in the backend repository.

The validation follows the transition map exactly: a malformed file, an unknown key, or an
`others` list above an empty `mine` is a startup failure naming the file, because committed
configuration a human just edited must not fail silently. An absent file, or an empty `mine`, is
every run scoped to the labelled issue itself — which is what every deployment did before this,
and what a project not using discipline subtasks wants.

### Three answers, and the third is the point

`scopeOf` is pure and is the only place the decision is made. `queuedIssues` uses it to filter,
`issueText` to compose the prompt, `moveWorkflow` to pick which issue a transition moves.

- **An open `[FE]` subtask** → that subtask is the work. Plural, deliberately: a story with two
  frontend subtasks has both in scope, because taking only the first would silently drop the
  second and nothing would ever come back for it.
- **No `[FE]` subtask but a `[BE]` one — or an `[FE]` subtask already done, or an issue whose own
  summary is marked `[BE]`** → the story is another repository's, and this golem leaves it alone.
- **Nothing the rule recognises** → the issue itself is the work, as before.

The second answer is what the `others` list buys, and it is the reason the fallback is not simply
"no subtask of mine, so the whole story": that fallback, in a frontend repository, quietly
implements the backend half. `statusCategory` is Jira's own three-way grouping, so "still open"
needs no configuration of its own.

## What a scope narrows is the prompt, not the issue's identity

This is the decision most worth recording, because the other choice looks tidier.

The branch, the state file, the plan pull request, the `Sandcastle` label swap, the release
comment and Watchtower's external ref all stay on **the labelled issue**. What changes is what the
agent is told: the prompts get the story *and* the scoped subtask, with a `**Scope:**` line before
anything else, the subtask's own text under `### Your scope`, and the siblings listed under
`### Not your scope` as work to fit against rather than to do.

The alternative — make the subtask the tracked issue, so the branch is `sandcastle/issue-EBS-83`
and Jira's development panel hangs the pull request off the subtask — is closer to how a developer
works, and it is a much larger change than it looks. `Issue` would have to carry two keys (the one
being worked and the one wearing the label), because the queue label lives on the story and
`release` has to find it again days later with nothing on disk but the state file; the startup
orphan check compares mirrored keys against state filenames and would read every tracked issue as
an orphan until it learned the difference; and the state labels would have to pick a side. None of
that is unreasonable, and none of it was needed to stop a frontend golem writing backend code.

Two consequences follow, and both are deliberate:

- **A story left to another repository keeps its label.** The golem drops it from its own queue and
  says why in the log, once per issue rather than once per poll. It does not release it: that label
  is the intake for *every* golem watching the project, and taking it off a backend story would be
  dropping somebody else's work on their behalf. Nothing starves for it either — the watcher only
  ever starts the first issue of its queue, so a story that is not in the queue cannot hold up the
  ones that are.
- **Transitions follow the scope, alone among the mirrors.** With `jira-transitions.json` filled
  in, it is the subtask that moves from column to column, because the subtask is what a developer
  would move and a story that jumped to In Review while both its halves sat in To Do is a lie on
  the board. Labels and comments stay on the labelled issue, which is where whoever labelled it is
  looking. Every log line names the key it moved, so which of the two happened is never a guess.

The scope is also resolved from Jira every time rather than remembered: the same answer has to come
out after a restart, days into a wait, with nothing but the key. That costs one call per moment and
one per run, and it means a story reshaped mid-flight is simply read as it now is.

### The prompt is scoped more loosely than the queue

`issueText` does not consult done-ness, while the queue filter does. A subtask closed by hand while
its plan sat waiting for approval is still the slice the run is implementing, and widening the
prompt back out to the whole story because of it would be the worse mistake of the two.

## Considered Options

**Put the convention in the code.** `[FE]` and `[BE]` are ESCB's words, and the first team to write
`FE:` instead would have to patch the adapter. The file is one line to change and reviewable.

**An environment variable instead of a file.** The rule is three values and grows a list; and the
question it answers is a property of the repository, not of whoever's shell started the watcher.
`host.env` is the wrong home for something that should be reviewed with the code it scopes.

**Release the stories that belong to another repository, with a comment.** Tidier queue, wrong
semantics: it takes the label off work another golem is polling for. Filtering is enough, because
the watcher never starts anything but the head of its queue.

**Fall back to the whole story whenever no `[FE]` subtask is found.** Simplest rule, and the exact
failure the change exists to prevent: a story with only a `[BE]` subtask would be implemented
whole, in the frontend repository.

**Work only the first matching subtask.** Fewer moving parts, and it drops work silently — the
story leaves the queue when the first subtask ships, and the second is never picked up by anything.

**Make the subtask the tracked issue.** See above. Better shaped, several times the change, and
available later without undoing any of this.

## Consequences

- **Two golems on one Jira project want the subtasks labelled, not the story.** The label swap at
  `awaiting-approval` takes `Sandcastle` off the labelled issue, so if both golems watch a story,
  whichever picks it up first removes the other's intake. Labelling both subtasks instead works
  today and works cleanly: each golem recognises its own by the labelled issue's *own* summary,
  takes it as the work, pulls the parent story in as context, and swaps labels only on its own
  subtask. Making a shared story safe for several golems would mean a per-deployment queue label
  or a claim marker, and neither is needed until somebody wants one branch per story.
- **A `[FE]` subtask that is already done takes its story out of this golem's queue for good.**
  That is what stops a shipped story being picked up and planned a second time, and it is also why
  a `shipped` transition that closes the subtask is worth configuring.
- **The story's text always reaches the agent.** A subtask's body is usually one line — the
  requirement is written on the story, and so is every comment. The scope narrows what the agent
  does, never what it may read.
- **This is Jira's alone.** GitHub issues have no subtasks, and the GitHub adapter is untouched. If
  a tracker with a different notion of "part of a larger issue" ever arrives, it brings its own
  file; nothing about the scope reached the port.
