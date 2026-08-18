# Migrate from `useTranslations` / `getTranslations` to `useExtracted` / `getExtracted`

This guide instructs an AI agent how to systematically migrate every file in this codebase from the key-based `useTranslations` / `getTranslations` API to the inline `useExtracted` / `getExtracted` API provided by `next-intl >= 4.5`.

## Prerequisites

The `next.config.ts` is already configured with the extraction plugin:

```ts
const withNextIntl = createNextIntlPlugin({
  experimental: {
    extract: {
      srcPath: "./src",
      sourceLocale: "de",
      messages: {
        path: "./messages",
        format: "json",
        locales: "infer",
      },
    },
  },
});
```

The source locale is **`de`** (German). All inline strings you write must be the **German translations** from `messages/de.json`.

---

## How the New API Works

| Old API | New API | Import |
|---|---|---|
| `useTranslations("namespace")` | `useExtracted()` | `import { useExtracted } from "next-intl"` |
| `getTranslations("namespace")` | `getExtracted()` | `import { getExtracted } from "next-intl/server"` |

Instead of referencing keys that point to `messages/de.json`, you write the **actual German string inline**. The extraction plugin automatically generates minified keys and maintains the message catalog at build/dev time.

### Basic example

**Before:**
```ts
import { useTranslations } from "next-intl";

const t = useTranslations("auth.login");
return <h1>{t("headline")}</h1>;
// Resolves to "Jetzt anmelden" via messages/de.json → auth.login.headline
```

**After:**
```ts
import { useExtracted } from "next-intl";

const t = useExtracted();
return <h1>{t("Jetzt anmelden")}</h1>;
```

### With ICU interpolation

**Before:**
```ts
const t = useTranslations("substitutes.admin");
t("title", { name: user.name });
// de.json: "Vertretungen von {name} verwalten"
```

**After:**
```ts
const t = useExtracted();
t("Vertretungen von {name} verwalten", { name: user.name });
```

### With rich text (`t.rich`)

**Before:**
```ts
const t = useTranslations("substitutes.admin");
t.rich("description", { br: () => <br /> });
// de.json: "Im Falle einer Abwesenheit...{name}.<br></br>{name} erhält..."
```

**After:**
```ts
const t = useExtracted();
t.rich("Im Falle einer Abwesenheit...{name}.<br></br>{name} erhält...", { br: () => <br /> });
```

### Server components (async)

**Before:**
```ts
import { getTranslations } from "next-intl/server";

const t = await getTranslations("headers.customer");
return <span>{t("userNav.logout")}</span>;
// de.json: "Abmelden"
```

**After:**
```ts
import { getExtracted } from "next-intl/server";

const t = await getExtracted();
return <span>{t("Abmelden")}</span>;
```

---

## Step-by-Step Migration Process

### Step 1: Read `messages/de.json`

Load the full contents of `messages/de.json` into context. You will need it to resolve every `t("key")` call to its actual German string value.

### Step 2: Find all files to migrate

Search for all files importing `useTranslations` from `"next-intl"` or `getTranslations` from `"next-intl/server"`. Migrate **one file at a time**.

### Step 3: For each file, apply these transformations

#### 3a. Change the import

| Before | After |
|---|---|
| `import { useTranslations } from "next-intl"` | `import { useExtracted } from "next-intl"` |
| `import { getTranslations } from "next-intl/server"` | `import { getExtracted } from "next-intl/server"` |

If a file imports **both** `useTranslations` and other named exports from `"next-intl"`, only replace `useTranslations` with `useExtracted` in the import. Same for `getTranslations` / `getExtracted`.

#### 3b. Replace the hook/function call

| Before | After |
|---|---|
| `const t = useTranslations("some.namespace")` | `const t = useExtracted()` |
| `const t = await getTranslations("some.namespace")` | `const t = await getExtracted()` |

**Important:** `useExtracted()` and `getExtracted()` take **no namespace argument** (or an optional string namespace for organizational purposes — do not use this during migration).

#### 3c. Replace every `t("key")` call with the resolved German string

1. Take the **namespace** from the old `useTranslations("namespace")` / `getTranslations("namespace")` call.
2. For each `t("key")` call, resolve the full path: `namespace + "." + key`.
3. Look up that path in `messages/de.json` to get the German string.
4. Replace `t("key")` with `t("German string")`.

**Example resolution:**
- Old: `useTranslations("auth.login")` → `t("headline")`
- Full path: `auth.login.headline`
- Value in de.json: `"Jetzt anmelden"`
- New: `t("Jetzt anmelden")`

#### 3d. Preserve interpolation parameters

If the old call had parameters, keep them:

- Old: `t("content", { userName: name })` → resolve key → `t("Möchten Sie die Einladung an {userName} erneut senden?", { userName: name })`

#### 3e. Preserve `t.rich()` calls

Same as above, but use `t.rich()`:

- Old: `t.rich("content", { name: () => <strong>{name}</strong> })`
- New: `t.rich("Resolved German string with <name>tag</name>", { name: () => <strong>{name}</strong> })`

#### 3f. Handle multiple `useTranslations` / `getTranslations` calls in the same file

Some files call `useTranslations` / `getTranslations` multiple times with different namespaces (e.g., `const tActions = await getTranslations("buttons")` and `const t = await getTranslations("substitutes")`).

**Merge them into a single `useExtracted()` / `getExtracted()` call.** Since the inline strings are self-contained, you no longer need multiple translation instances. Use a single `t` variable.

**Before:**
```ts
const tActions = await getTranslations("buttons");
const t = await getTranslations("substitutes");
// ...
tActions("cancel")  // → "Abbrechen"
t("admin.title", { name })  // → "Vertretungen von {name} verwalten"
```

**After:**
```ts
const t = await getExtracted();
// ...
t("Abbrechen")
t("Vertretungen von {name} verwalten", { name })
```

---

## Files That MUST NOT Be Migrated

Some files use **dynamic keys** or **programmatic namespace resolution** that cannot work with the extraction API. **Do not migrate these files:**

### Any file where `t()` is called with a variable instead of a string literal

If you encounter `t(someVariable)` or `t(\`template.${dynamic}\`)`, **do not migrate that call**. The extraction plugin requires static string arguments.

---

## Files That Need Special Attention

### Files with `t()` inside switch/case or if/else branches

Files like `src/i18n/useTranslatedError.ts` call `t()` many times across different branches of a switch/case. These **can and should be migrated** — the extraction plugin statically analyzes all `t()` calls in the source code regardless of runtime control flow. As long as every `t()` argument is a **static string literal**, it works.

### Files with `t.rich()` and complex HTML-like tags

Look up the full ICU string in `messages/de.json` carefully. The rich text syntax uses XML-like tags (e.g., `<name></name>`, `<br></br>`, `<link>text</link>`, `<p>text</p>`). Copy these exactly as they appear in de.json.

### Files using `useTranslations` for form field options

Some files pass translation results into arrays or objects. The migration is the same — just inline the German string. Example:

**Before:**
```ts
const t = useTranslations("components.form.yesNoRadioGroup.options");
const options = [
  { label: t("yes"), value: true },
  { label: t("no"), value: false },
];
```

**After:**
```ts
const t = useExtracted();
const options = [
  { label: t("Ja"), value: true },
  { label: t("Nein"), value: false },
];
```

---

## Using `collectGroupedData` with `getExtracted`

`collectGroupedData` no longer accepts a `translationKey`. Instead, callers build a `titles` map with static `getExtracted()` calls and pass it in.

**Before (bfw-fe):**
```ts
import { getTranslations } from "next-intl/server";

const data = await collectGroupedData({
  searchParams,
  groupConfig: {
    queryParam: "q[status_eq]",
    values: ["unmapped", "in_progress", "active_contract"],
    translationKey: "statusTitles",
  },
  path: "/financing_cases",
  translationKey: "financingCases.groups",
  apiCall: (apiUrl) => fetchFinancingCases(apiUrl),
});
```

**After (bfw-fe):**
```ts
import { getExtracted } from "next-intl/server";

const t = await getExtracted();
const data = await collectGroupedData({
  searchParams,
  groupConfig: {
    queryParam: "q[status_eq]",
    values: ["unmapped", "in_progress", "active_contract"],
  },
  path: "/financing_cases",
  titles: {
    unmapped: t("Unklar"),
    in_progress: t("In Bearbeitung"),
    active_contract: t("Aktiver Vertrag"),
  },
  apiCall: (apiUrl) => fetchFinancingCases(apiUrl),
});
```

---

## Post-Migration Cleanup

### 1. Clean up `messages/de.json`

After **all** files are migrated (except the excluded ones above), the manually-managed keys in `messages/de.json` that are no longer referenced by any `useTranslations` / `getTranslations` call can be removed.

The extraction plugin will **automatically add** new entries for all `useExtracted` / `getExtracted` inline strings when you run `next dev` or `next build`. These auto-generated entries will coexist alongside the manually-managed ones.

### 2. Remove unused imports

After migration, ensure no file still imports `useTranslations` or `getTranslations` unless it's one of the excluded files. Clean up any unused imports.

### 3. Verify the build

Run `pnpm build` to ensure the extraction plugin correctly processes all inline strings and that no translation errors occur.

---

## Migration Checklist

- [ ] Read `messages/de.json` into context
- [ ] Find all files with `useTranslations` / `getTranslations` imports
- [ ] For each file (except excluded ones):
  - [ ] Change import to `useExtracted` / `getExtracted`
  - [ ] Remove namespace argument from hook/function call
  - [ ] Replace every `t("key")` with `t("resolved German string")`
  - [ ] Preserve interpolation parameters and `t.rich()` calls
  - [ ] Merge multiple translation instances into one `t`
  - [ ] Remove unused imports
- [ ] Remove unused keys from `messages/de.json` (keep `validations.*` and dynamically-referenced namespaces)
- [ ] Run `pnpm build` to verify

---

## Quick Reference: Import Mapping

```ts
// Client components
// Before:
import { useTranslations } from "next-intl";
// After:
import { useExtracted } from "next-intl";

// Server components / server actions
// Before:
import { getTranslations } from "next-intl/server";
// After:
import { getExtracted } from "next-intl/server";
```
