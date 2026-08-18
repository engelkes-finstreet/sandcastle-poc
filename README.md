# finstreet Frontend Boilerplate

This is a [finstreet](https://finstreet.de) boilerplate for a Next.js application. It is designed to be cloned and adapted to the specific needs of your project.

## Libraries

| Library | Description |
|---|---|
| `@finstreet/ui` | Beautifully designed UI components |
| `@finstreet/forms` | Easy-to-use form building and validation |
| `@finstreet/secure-fetch` | Type-safe fetch requests to the backend |

## Getting Started

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## What's Included

### Auth Section (`/src/app/(auth)`)

A complete authentication flow with the following pages:

| Route | Description |
|---|---|
| `/anmelden` | Login |
| `/passwort-vergessen` | Request a password reset |
| `/passwort-zuruecksetzen` | Reset password with token |
| `/neues-passwort-vergeben` | Set a new password |
| `/einladung-annehmen` | Accept an invitation |
| `/konto-entsperren` | Unlock an account |
| `/konto-entsperrung-anfordern` | Request an account unlock |
| `/marketing-zustimmung` | Marketing consent confirmation |

Authentication is handled via **NextAuth** using a JWT strategy with a 24-hour session. On login, it calls `/sessions` on the backend and fetches user permissions from `/permissions`.

**What needs to be changed:**
- `src/shared/auth/roleConfig.ts` — extend with all roles your application uses and define their `defaultRedirect` and `allowedPaths`

---

### Admin Section — Members Management (`/admin/benutzer`)

A full member management UI for FSP admins.

**Features:**
- List all active members
- List pending invitations
- Invite new members (with department and signing group assignment)
- Update member details
- Revoke member access

**What needs to be changed:**
- The department and signing group options are fetched from the backend — ensure the corresponding endpoints exist and return data in the expected format
- Review the `InviteMemberForm`, `UpdateMemberForm`, and `RevokeMemberForm` schemas to match your backend's expected payloads
- Role-based access control: ensure only users with the appropriate role can access `/admin/*` (configured in `src/shared/auth/roleConfig.ts` and `src/middleware.ts`)

---

### Legal Representatives (`/src/features/legalRepresentatives`)

Manages legal representatives for financing cases.

**Features:**
- Display existing legal representatives in a panel/grid
- Create, update, and delete representatives via modals
- Confirm the list of legal representatives
- Validates: first name, last name, email, phone number, sole signature authorization

**What needs to be changed:**
- Wire up the server actions to your backend endpoints (create, update, delete)
- Verify the schema fields match your backend's data model for legal representatives

---

### Internal Remarks (`/src/features/financingCaseOverview`)

A panel for FSP-internal remarks on financing cases.

**Features:**
- Display internal remarks panel
- Update internal remarks via a form

**What needs to be changed:**
- `src/features/financingCaseOverview/common/fsp/forms/updateInternalRemarksForm/updateInternalRemarkFormAction.ts` — the backend call is **not yet implemented** (marked with `// TODO: Implement backend call`). Replace the placeholder with the actual API call.

---

### Portal Separation — Customer vs. FSP (`/src/shared/types/Portal.ts`)

The application is split into two distinct portals, each serving a different group of users. This separation is enforced at the routing, layout, and component level.

| Portal | Route prefix      | Description |
|---|-------------------|---|
| `customer` | `/kunde/...`      | End-user facing portal (e.g. property manager or client of the bank) |
| `operations` | `/operations/...` | Internal FSP/operations portal for staff |

**How it works:**

- **`src/shared/types/Portal.ts`** — defines the `Portal` type as `"customer" | "operations"`
- **`src/shared/context/portal/portalContext.tsx`** — provides a `PortalProvider` and `usePortal()` hook. Components use this to render different UI depending on which portal the user is in
- **`src/routes.ts`** — route definitions are split into `routes.customer.*` and `routes.fsp.*` namespaces, making it easy to reference the correct paths throughout the app
- **`src/shared/auth/roleConfig.ts`** — each role's `allowedPaths` array controls which portal prefix that role can access (e.g. `["/kunde"]` for customer-side roles)
- **`src/middleware.ts`** — enforces path-level access on every request by checking the user's roles against `roleConfig.allowedPaths`

**What needs to be changed:**

 **Rename `"customer"` to something meaningful for your project.** The term `customer` is a generic placeholder. Rename it to reflect the actual user group in your domain (e.g. `"borrower"`, `"client"`, `"investor"`, `"property-manager"`). You need to update it in the following places consistently:

 - `src/shared/types/Portal.ts` — change the `"customer"` string literal in the `Portal` type
 - `src/routes.ts` — rename the `customer` key inside the `routes` object and update the URL prefixes (`/kunde/...`) to match your domain
 - `src/shared/auth/roleConfig.ts` — update `allowedPaths` to reflect the new route prefix
 - Any component using `usePortal()` that checks `portal === "customer"` — update the comparison string
 - `messages/de.json` — update any translation keys or values that reference the customer portal by name

---

## Project-Wide Configuration

The following items need to be updated before deploying a project based on this boilerplate:

### `src/shared/utils/constants.ts`

| Constant | Current Value | Description |
|---|---|---|
| `companyName` | `"Beispiel Bank"` | Replace with the actual company/bank name |
| `termsAndConditionsUrl` | `"https://google.com"` | Replace with the actual Terms & Conditions URL |
| `imprintUrl` | `"https://google.com"` | Replace with the actual imprint/legal notice URL |

### `messages/de.json`

All UI copy is managed through `next-intl` translations in this file. Review and update all strings to match your product's language and terminology.
