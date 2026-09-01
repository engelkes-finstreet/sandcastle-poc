## How this application works

Written for the agent that runs the walkthrough phase — the one that boots this
application, logs in, and photographs pages. The Engine renders this whole file into that
agent's prompt in place of the `app_guide` placeholder.

Two rules follow from being rendered into another document rather than read on its own.
Headings start at `##`, because a `#` here would be a second title competing with the
prompt's. And nothing may sit in `{{ }}` — a lowercase name in braces reaches the prompt
intact and stops the run; write `app_guide` as prose, as above.

**This file is committed, so it must never contain a password.** It names roles and it
names the environment variable each role's account comes from. The values live in
`.env.e2e`, which is gitignored and which the Engine hands only to the walkthrough
container. If you are editing this file and about to paste a credential into it, that is
the signal you wanted `.env.e2e` instead — see `env.e2e.example`.

### What the application is

A Next.js App Router frontend for a factoring portal. A **customer** files financing
applications (*Factoring-Anträge*) and uploads documents against them; the **financial
service provider** processes those applications from a second portal; an **admin**
manages who has access. The backend is a separate service — this repository talks to it
over HTTP and holds no database. The interface is in German throughout.

It is a template that has been filled in partway. `TODO(boilerplate)` markers are real
unfinished work, not decoration, and some of them are load-bearing here: the `customer`
portal key and its `/kunde/` prefix are still the template's placeholder names.

### Where the URLs are

`src/routes.ts` is the only correct source for a path. **Read it rather than assembling a
URL from a directory name** — several routes have German paths that do not match their
English route keys (`admin.members.index` is `/admin/benutzer`), and some take query
parameters that change what renders.

Routes that take an `id` need a real record from staging. Get one by loading the list
page for that role first and clicking through, never by inventing an id — a fabricated id
gets you a 404 you might mistake for a broken page.

### Pages with no login

`src/middleware.ts` protects `/`, `/admin/*`, `/kunde/*` and `/operations/*`. Everything
else is public, and these four are the useful ones:

| Path | What it is |
| --- | --- |
| `/anmelden` | Login |
| `/passwort-vergessen` | Request a password reset |
| `/passwort-zuruecksetzen` | Set a new password — needs a token from an email, so it renders its error state without one |
| `/konto-entsperren` | Unlock a locked account — same, needs a token |

### The roles

Roles come from the backend on the session token; `src/shared/auth/roleConfig.ts` maps
each one to where it lands and which path prefix it may enter. Entering a prefix a role
does not hold redirects to `/notAllowed` — so **photographing the wrong portal for a role
gets you a redirect, not a page.**

| Role | Account from | Lands on | May enter |
| --- | --- | --- | --- |
| `PropertyManagement::PropertyManager` | `E2E_TEST_PROPERTY_MANAGER_EMAIL` / `_PASSWORD` | `/kunde/factoring-antraege` | `/kunde` |
| `FinancialServiceProvider::Processor` | `E2E_TEST_FSP_EMAIL` / `_PASSWORD` | `/operations/factoring-antraege` | `/operations` |
| `FinancialServiceProvider::Admin` | `E2E_TEST_FSP_ADMIN_EMAIL` / `_PASSWORD` | `/admin/benutzer` | `/admin` |
| `FinancialServiceProvider::MasterDataManager` | `E2E_TEST_FSP_MASTER_DATA1_EMAIL` / `_PASSWORD` | `/operations/factoring-antraege` | `/operations` |

Three roles in the enum have **no test account**: `Administration::Admin`,
`PropertyManagement::Scalara` and `PropertyManagement::Admin`. A change that only affects
one of those cannot be photographed logged in, and saying so is the right answer.

`MasterDataManager` and `Processor` share a portal and differ only in permissions
(`src/shared/backend/models/auth/schema.ts` has the permission shape). Photograph
`Processor` unless the change is specifically about master data; `_MASTER_DATA2_` is a
second account of the same role, there so the e2e suite can test two users interacting,
and the walkthrough has no use for it.

### Logging in

The dev server runs on `http://localhost:3000`. Every step below is a browser action —
this is the playwright MCP server driving a real page, not the Playwright test suite. The
page objects under `e2e/` are for `pnpm test:e2e` and are **not** available to you; they
are worth reading only as documentation of what a flow does.

1. Navigate to `http://localhost:3000/anmelden`.
2. Fill the **E-Mail-Adresse** field with the role's email.
3. Fill the **Passwort** field with the role's password.
4. Submit — the button is `[data-testid="login-button"]`, labelled *Jetzt anmelden*.
5. Wait for the URL to change. **A successful login always redirects**, to the role's
   landing page in the table above. Still sitting on `/anmelden` means it failed.

Prefer `data-testid` over a visible label wherever one exists: the labels are translated
strings from `messages/de.po` and change, the testids in `e2e/data/dataTestIds.ts` do not.

Session is a cookie, so once you are in you stay in — navigate directly to any path the
role may enter. **To photograph a second role, clear cookies first.** Logging in again
without clearing them leaves you on the first role's session and you will photograph the
wrong portal without any error to warn you.

#### When a login fails

Report it and move on to what you *can* reach. Do not retry more than once, do not try
another role's credentials on a page, and do not go looking for a password anywhere in
the repository. The likely causes, in order: the account does not exist on staging any
more, `.env.e2e` was not carried in, or the backend `AUTH_API_BASE_URL` is down — none of
which you can fix from inside the container, and all of which a human fixes in a minute
once your report names which one it looked like.

An account can also be **locked** by failed attempts, which is why the retry limit
matters: a few careless logins take a shared test account out for everybody.

### Worth photographing

By area, with the role to be logged in as. These are the pages a human reviewing a change
actually wants to see.

**Admin — `FinancialServiceProvider::Admin`**

- `/admin/benutzer` — the member list. The invite modal opens from
  `[data-testid="invite-member-button"]`; a form change usually needs the page closed and
  the modal open, which is two shots.
- `/admin/benutzer/<membershipId>` — one member's substitutes, reached by clicking through
  the list.

**Customer — `PropertyManagement::PropertyManager`**

- `/kunde/factoring-antraege` — the application list, and the landing page for this role.
- `/kunde/factoring-antraege/<id>` — one application, with tabs for `/anfrage`,
  `/dokumente` and `/vertretungsberechtigte`. The document tab is where uploads show up.
- `/kunde/benutzer` — this customer's own users.

**Operations — `FinancialServiceProvider::Processor`**

- `/operations/factoring-antraege` — the processing queue, and this role's landing page.
- `/operations/factoring-antraege/<id>` — the same application from the provider's side,
  with `/anfrage-details`, `/dokumente` and `/vertretungsberechtigte`.
- `/operations/vertretungen` — substitutions.

**Two things that render differently and are easy to miss**

- Lists have an **empty state**, and staging is often empty. That is a real page and a
  real answer; photograph it and label it as empty rather than going to create data.
- Long lists paginate and search. If a change is about filtering, the shot that says
  something is the filtered list, not the top of the page.
