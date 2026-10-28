---
name: planning-a-change
description: "Planning a change to this Next.js frontend from an issue: reading it as behaviours, finding the feature, route and messages it touches, and writing a plan a fresh agent can build without the conversation. Use when a Golem's plan Run or a person hands you an issue to plan."
---

# Planning a change

Turn one issue into a plan that somebody else builds. The builder is a fresh agent with the
issue, your plan and this repository, and nothing of your conversation, so the plan has to
stand on its own. Plan only: write no code and commit nothing.

## 1. Read the issue as behaviours

Read the issue's text and every comment. Restate it as **behaviours**: what a person can see
or do once it is built ("an Administrator revokes a member from the members list, and the
member disappears from it"). A requirement you cannot turn into a behaviour, or two that
contradict each other, is a question for a person (step 4).

**Done when** every requirement in the issue maps to a behaviour or a question.

## 2. Find where it lives

- **Routes** are under `src/app/`, in German path segments (`(auth)/passwort-vergessen`,
  `operations/factoring-antraege/[financingCaseId]`). `src/routes.ts` names them.
- **Features** are under `src/features/<feature>/`, split by audience (`fsp`, `customer`,
  `common`) and then by kind: `forms/`, `lists/`, `modals/`, one folder per component.
  Read the nearest existing one of the same kind before planning a new one: a new form is
  planned in the shape of `src/features/members/fsp/forms/memberForm/`.
- **Words** are messages in `messages/` (next-intl); a new sentence on a screen is a new
  message, never a literal in a component.
- **Requests to the backend** go through `@finstreet/secure-fetch`; **forms** through
  `@finstreet/forms` on `react-hook-form` and `zod`; **components** through `@finstreet/ui`
  and Panda CSS (`panda.config.ts`).

**Done when** each behaviour names the route, the feature folder and the files it touches,
existing or new.

## 3. Write the plan

Markdown, in this order:

1. **Goal**: one or two sentences in the issue's terms.
2. **Behaviours**: the list from step 1, each with how a person checks it in the running
   app.
3. **Steps**: a numbered list, one per file or small group of files, each naming the path,
   what changes there and the existing file it follows. Show code only where a name or a
   shape would otherwise be guessed.
4. **Out of scope**: what the issue might suggest and this plan leaves alone.

The builder must pass `pnpm exec tsc --noEmit`, `pnpm lint` and `pnpm build`; a step that
would not is not done.

**Done when** a reader with only the issue and the plan could build it.

## 4. Ask, don't guess

A decision the issue leaves open and the code does not answer is a **question**: its title,
why it matters, the answer you propose as the default, and the alternatives. The plan
assumes the default, and says so where it does. A Golem's plan Run writes the questions
where its prompt says; a person planning by hand asks them.

**Done when** every open decision is a question with a default, and the plan builds on the
defaults.
