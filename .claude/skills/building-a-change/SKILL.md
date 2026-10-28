---
name: building-a-change
description: "Building a decided change to this Next.js frontend on the current branch: the plan or issue read as behaviours, built step by step in the shape of the existing features, the gate run green, and a hand-back saying how to try it. Use when a Golem's run or a person hands you an approved plan or an issue to build."
---

# Building a change

Build one piece of work that has already been decided — an approved plan, or an issue that is
its own specification — on the branch you are on. The plan is settled: build it as written.
The build ends in commits on this branch and a hand-back; the push, the pull request and the
merge are your caller's. On `main`, stop and hand back.

## 1. Read the spec

Read the plan (and any instruction that came with its approval) or the issue, whole. Restate
it as **behaviours**: what a person can see or do once it is built. A step that contradicts
the code you find, or a plan that turns out to be wrong, is a reason to stop and say so, not
to build something else.

**Done when** every step of the plan maps to a behaviour you can check.

## 2. Build it in the shape of what is here

One behaviour at a time:

- Put each piece where its kind lives: a route under `src/app/`, a form, list or modal under
  `src/features/<feature>/<audience>/<kind>/<Name>/`, words in `messages/`. Open the nearest
  existing one of the same kind and follow it: its file names, its exports, how it reaches
  the backend (`@finstreet/secure-fetch`), how it builds a form (`@finstreet/forms`) and
  which `@finstreet/ui` components it draws.
- Run `pnpm exec tsc --noEmit` often.
- Commit when a behaviour works, with a message that says what now works.

**Done when** every behaviour from step 1 is built and committed.

## 3. Run the gate

From the root, in order, each green before the next:

1. `pnpm exec tsc --noEmit` — clean.
2. `pnpm lint` — no new errors (the warning on `getFspFinancingCaseOverview` predates you).
3. `pnpm build` — reaches Next's route table.

A red one is fixed before anything else, whatever caused it.

**Done when** all three are green on the last commit.

## 4. Check it as a person would

Read your diff once, whole, as a reviewer: a literal string where a message belongs, a
component that does not follow its neighbours, a step of the plan left out. Fix what stays
inside the change and commit. Then write down how a person tries it: which route to open,
what to do, what should happen, and what you could not check (the end-to-end suite under
`e2e/` needs a backend this sandbox does not have).

**Done when** the diff holds nothing you would ask a colleague to change, and the
instructions are written.

## Hand back

`git status` shows a clean tree. Report the commits, the behaviours built, the gate's three
results, how to try it, and anything left undone with its reason.
