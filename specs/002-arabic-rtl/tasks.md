---

description: "Task list for 002-arabic-rtl"
---

# Tasks: Arabic Language & Right-to-Left Layout

**Input**: Design documents from `specs/002-arabic-rtl/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: No `/api/*` behavior changes (FR-020), so constitution Principle III server tests are not required; server `npm test` must still pass (T057). No client test runner exists and none is added (Principle IV). Automated verification = `npm run build` (catalog completeness via types), `client/scripts/check-i18n.mjs` (T002), `client/scripts/check-contrast.mjs`; manual = quickstart scenarios. Android verification is included (Principle V, T054).

**Organization**: Tasks are grouped by user story (US1–US5 from spec.md) to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1–US5
- All paths are relative to the repository root

## Path Conventions

- Web client: `client/src/`, static assets `client/public/`, scripts `client/scripts/`
- Server `server/` and native `client/android/` — **must not change**

---

## Phase 1: Setup (Shared Infrastructure)

- [X] T001 Record baseline from repo root: `npm run build --workspace client`, `node client/scripts/check-contrast.mjs`, and the server suite (`npm test`; if `server/.env` is absent, run `npx vitest run` in `server/` with throwaway `DATABASE_URL`/`JWT_SECRET`/`DATA_ENCRYPTION_KEY` env vars as in 001). All must pass before changes. Do **not** run the root `npm run build` (it regenerates `server/prisma/postgres/schema.prisma` line endings).
- [X] T002 [P] Create zero-dependency `client/scripts/check-i18n.mjs` per research R13 using only `node:fs`, `node:path`, `node:url`. Checks, each printing PASS/FAIL with file:line, exit 1 on any failure: (1) **server coverage** — collect English messages from `server/src/**/*.ts` (excluding `*.test.ts`) matching `new HttpError(<n>, '<msg>')` and `error: '<msg>'`, and from `client/src/lib/api.ts` matching `new ApiError(<x>, '<msg>')`/`"<msg>"` literals (skip template literals; `Server responded ${…}` is covered by a pattern), and require each exact string to appear in `client/src/i18n/errors.ts`; (2) **catalog sanity** — the catalogs are `.ts` files that Node cannot import directly, so use a regex scan of `client/src/i18n/messages/ar.ts` for `''`/`""` empty values and for any string value that also appears verbatim in `en.ts` except an allowlist (`Lockly`, `PDF`, `CSV`, `B`, `KB`, `MB`, `English`, `العربية`); (3) **placeholder parity** — for each `{token}` found in `en.ts`, verify the same token appears in `ar.ts` at least as many times; (4) **direction hygiene** — in `client/src/**/*.tsx` flag class tokens matching `^(?:[a-z-]+:)*-?(?:ml|mr|pl|pr)-|^(?:[a-z-]+:)*-?(?:left|right)-|^(?:[a-z-]+:)*text-(?:left|right)$|^(?:[a-z-]+:)*border-(?:l|r)(?:-|$)|^(?:[a-z-]+:)*rounded-(?:l|r|tl|tr|bl|br)(?:-|$)` inside `className`/`cn(`/string literals, allowlisting `left-1/2` and `-translate-x-1/2`; (5) **hard-coded text** — in `client/src/**/*.tsx` flag JSX text nodes (`>` … `<` containing ≥ 3 consecutive Latin letters, ignoring `{…}` expressions) and `aria-label|title|placeholder|alt="…"` literals with Latin letters, allowlisting `Lockly`. Print a summary count per check. (Checks 1–5 are expected to fail until later phases.)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: i18n runtime, catalogs, pre-paint direction, fonts. After this phase the app still shows English text (screens not yet migrated), but setting `localStorage['lockly.lang']='ar'` flips `<html dir="rtl">` before first paint.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Catalog key guide (reference for T006, T007 and all string-extraction tasks)

Namespaces and required keys. Extraction tasks MAY add keys to the correct namespace (update `en.ts` and `ar.ts` together); they MUST NOT rename these.

| Namespace | Keys (non-exhaustive where marked …) |
|---|---|
| `app` | `documentTitle` ("Lockly — Secure Passwords & Files"), `loading` ("Loading…") |
| `common` | `cancel`, `save`, `saving`, `delete`, `create`, `move`, `moving`, `close`, `download`, `preview`, `dismiss`, `connect`, `connecting`, `pleaseWait`, `signOut`, `lockVault` |
| `nav` | `vault`, `files`, `settings` |
| `theme` | `label` ("Theme"), `system`, `light`, `dark` |
| `language` | `label` ("Language"), `description` |
| `auth` | `welcomeBack`, `createVault`, `email`, `password`, `loginPassword`, `masterPasswordEncrypts`, `masterPlaceholder` ("At least 10 characters"), `signIn`, `createAccount`, `noAccount`, `haveAccount` |
| `unlock` | `title` ("Vault locked"), `prompt` ("Enter your master password to unlock."), `promptWithEmail` ("Enter your master password to unlock, {email}."), `placeholder`, `unlock`, `unlocking` |
| `serverSetup` | `title`, `description`, `addressLabel`, `willConnect` ("Will connect to {address}"), `insecureWarning` (rich: `{http}`, `{https}` nodes) |
| `vault` | `title`, `addItem`, `searchPlaceholder`, `noMatches`, `empty`, `types.{LOGIN,CARD,SECURE_NOTE,OTHER}` |
| `item` | `newTitle`, `editTitle`, `title`, `titlePlaceholder`, `username`, `folder`, `folderPlaceholder`, `url`, `password`, `notes`, `notesPlaceholder`, `reveal`, `hide`, `copy`, `generate`, `copied` ("Password copied — clears in 20s"), `saved`, `updated`, `deleted` |
| `generator` | `length` ("Length: {count}"), `lower`, `upper`, `digits`, `symbols`, `generate` |
| `strength` | `empty`, `veryWeak`, `weak`, `fair`, `strong`, `veryStrong` |
| `files` | `title` ("Secure files"), `summary` (plural: "{count} file · {size}" / "{count} files · {size}"), `folderSummary` ("{folder} · {summary}"), `upload`, `uploading` (plural), `allFiles`, `noFolder`, `newFolder`, `deleteFolderLabel` ("Delete folder {name}"), `dropHere`, `dropInto` ("Drop files here to add to “{folder}”"), `dropHint` ("Encrypted · Max {max} MB"), `encrypted`, `encryptingOnServer` ("Encrypting on the server… · {size}"), `uploadingPercent` ("Uploading {percent}% · {size}"), `uploadingAria` ("Uploading {name}"), `uploadedToast` ("{name} uploaded & encrypted"), `empty`, `emptyFolder` ("“{folder}” is empty"), `emptyHint`, `emptyFolderHint`, `moveToFolder`, `orTypeFolder`, `folderName`, `folderNamePlaceholder`, `newFolderHint`, `movedTo` ("Moved to {folder}"), `removedFromFolder`, `fileDeleted`, `deleteFileTitle`, `deleteFileBody` (rich: `{name}`, `{size}`), `deleteFileConfirm`, `deleteFolderTitle`, `deleteFolderBody` (rich + plural count), `keepFiles`, `deleteFolderConfirm` (plural), `folderDeletedWithFiles` (plural), `folderDeletedKeptFiles` (plural), `kinds.{excel,word,pdf,image,archive,text,file}` |
| `preview` | `dialogLabel` ("Preview of {name}"), `position` ("{index} of {total}"), `decryptedHere` ("Decrypted in this tab only"), `decrypting`, `rendering`, `readingWorkbook`, `unavailableTitle`, `loadFailed`, `previous`, `next`, `previousHint` ("Previous"), `nextHint` ("Next"), `closeHint` ("Close (Esc)"), `openInPdfTitle`, `openInPdfBody`, `openWith`, `tooLargeTitle`, `tooLargeBody` ("Files of this type over {size} are not rendered…"), `sheetUnreadable`, `cannotReadSheet`, `emptyWorkbook`, `noSheets`, `emptySheet`, `truncated` ("Showing the first {rows} rows and {cols} columns. Download the file for the full data.") |
| `settings` | `title`, `appearance`, `appearanceDescription`, `account`, `server`, `changeServer`, `changeMaster`, `changeMasterDescription`, `newMaster`, `updateMaster`, `updating`, `masterUpdated`, `recoverableWarning` |
| `units` | `b`, `kb`, `mb` |
| `errors` | every key in [contracts/error-translation.md](contracts/error-translation.md) plus `generic`, `fileTooLarge` ("{name} is larger than {max} MB") |

Plural leaves: `{ one, other }` in `en.ts`; `{ zero, one, two, few, many, other }` in `ar.ts`. Always include `{count}` where the number is shown.

### Implementation

- [X] T003 [P] Create `client/src/i18n/languages.ts`: `export const LANGUAGES = { en: { code: 'en', dir: 'ltr', nativeName: 'English', locale: 'en' }, ar: { code: 'ar', dir: 'rtl', nativeName: 'العربية', locale: 'ar-u-nu-latn' } } as const`; export `LanguageCode = keyof typeof LANGUAGES`, `Direction`, `LANGUAGE_STORAGE_KEY = 'lockly.lang'`, `isLanguageCode(v): v is LanguageCode`, and `detectLanguage(langs: readonly string[]): LanguageCode` (first entry whose lowercased base subtag is supported, else `'en'`). Header comment: `public/locale-init.js` duplicates the supported list.
- [X] T004 [P] Create `client/src/i18n/format.ts` per research R6: `formatNumber(locale, n, opts?)` using a cached `Intl.NumberFormat(locale, { numberingSystem: 'latn', ...opts })`; `pluralCategory(locale, n)` via cached `Intl.PluralRules`; `formatBytes(locale, bytes, units: { b; kb; mb })` reproducing current thresholds (`< 1024` → B, `< 1024²` → KB with 1 decimal, else MB with 1 decimal) and returning `"{number} {unit}"`; `formatPercent` not needed (percent is interpolated as a number). All outputs use Western digits.
- [X] T005 [P] Create `client/src/i18n/interpolate.tsx`: `interpolate(template: string, params?: Record<string, string | number>, fmt?: (n: number) => string): string` replacing `{name}` (numbers through `fmt`, unknown tokens left as-is); `interpolateNodes(template, params: Record<string, ReactNode>): ReactNode[]` splitting on tokens, wrapping **string/number** params in `<bdi dir="auto">` (user content isolation, research R5) and passing ReactElement params through unchanged, with stable `key`s.
- [X] T006 Create `client/src/i18n/messages/en.ts` with every English UI string currently in `client/src/**/*.tsx` and the error texts, organised per the **Catalog key guide** (copy current English wording exactly so English UI is unchanged). Export `const en = { … } as const`, `type DeepWiden<T>` (string literals → `string`, preserving object shape), `export type Messages = DeepWiden<typeof en>`, `export type PluralLeaf = { other: string } & Partial<Record<Intl.LDMLPluralRule, string>>`, and `MessageKey`/`PluralKey` dot-path union types (plural leaves identified by having an `other` property).
- [X] T007 Create `client/src/i18n/messages/ar.ts` (depends T006): `export const ar: Messages = { … }` with Modern Standard Arabic for every key; use the Arabic drafts from [contracts/error-translation.md](contracts/error-translation.md) for `errors.*`; plural leaves with all six categories (e.g. files: zero "لا توجد ملفات", one "ملف واحد", two "ملفان", few "{count} ملفات", many "{count} ملفًا", other "{count} ملف"); keep `{tokens}` identical; brand "Lockly" untranslated; units `بايت`, `ك.ب`, `م.ب`; theme labels `النظام`, `فاتح`, `داكن`. Add a header comment: "Draft — requires native-speaker review (T055)".
- [X] T008 Create `client/src/i18n/errors.ts` (depends T006) per [contracts/error-translation.md](contracts/error-translation.md) and contracts/i18n-runtime.md §5: an ordered `ERROR_MAP: Array<{ match: string | RegExp; key: MessageKey; params?: (m: RegExpMatchArray) => Params }>` containing **every** English message row (16 server, 10 client), `errorKey(message)`, and `useErrorText()` returning `(err: unknown, fallback: MessageKey) => string` that uses `useI18n().t`. Import `ApiError` type from `../lib/api`.
- [X] T009 Create `client/src/i18n/LanguageProvider.tsx` (depends T003–T006) per contracts/i18n-runtime.md §3: initial `lang` from `document.documentElement.lang` if supported, else guarded `localStorage` then `detectLanguage(navigator.languages ?? [navigator.language])`; `useLayoutEffect` on `lang` sets `<html lang dir>` and `document.title = t('app.documentTitle')`; `setLanguage` writes storage in try/catch and updates state; `t(key, params)` resolves dot path in the active catalog with fallback to `en`, then `interpolate` with `formatNumber`; `tx(key, params)` → `interpolateNodes`; `plural(key, count, params)` picks `pluralCategory` leaf (fallback `other`) and interpolates with `count`; `formatNumber`, `formatBytes` bound to the active locale and `units.*`. Memoise the context value. Export `useI18n()` (throws outside provider).
- [X] T010 [P] Create `client/public/locale-init.js` per contracts/i18n-runtime.md §2: plain IIFE; supported `['en','ar']` and rtl `['ar']` literals with a comment pointing to `src/i18n/languages.ts`; try saved `localStorage.getItem('lockly.lang')`, else first `navigator.languages`/`navigator.language` base subtag supported, else `'en'`; set `documentElement.lang` and `.dir`; never throw (wrap storage and navigator access).
- [X] T011 Edit `client/index.html` (depends T010): `<html lang="en" dir="ltr">`; add `<script src="/locale-init.js"></script>` immediately after the `theme-init.js` script; change the Google Fonts stylesheet URL to `https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&display=swap`.
- [X] T012 [P] Edit `client/src/index.css` per contracts/i18n-runtime.md §8: after the `body` rule add `:lang(ar) body { font-family: 'IBM Plex Sans Arabic', 'Inter', 'Noto Sans Arabic', 'Segoe UI', Tahoma, system-ui, sans-serif; }` and `:lang(ar) * { letter-spacing: 0 !important; }` with a comment that negative tracking breaks Arabic letter joining.
- [X] T013 Edit `client/src/main.tsx` (depends T009): import `LanguageProvider` and make it the outermost provider inside `<React.StrictMode>` (wrapping `ThemeProvider`).
- [X] T014 Foundation check (depends T002–T013): `npm run build --workspace client` passes; `node client/scripts/check-i18n.mjs` — checks 1–3 (server coverage, catalog sanity, placeholder parity) PASS, checks 4–5 may still FAIL; in `client-dev` preview run `localStorage.setItem('lockly.lang','ar'); location.reload()` and confirm `<html lang="ar" dir="rtl">` before React mounts (inspect `document.documentElement` in a `DOMContentLoaded` listener or Performance screenshots) and no console errors; clear the key afterwards.

**Checkpoint**: Foundation ready

---

## Phase 3: User Story 1 - Arabic speakers get a complete Arabic, right-to-left app (Priority: P1) 🎯 MVP

**Goal**: Every screen fully translated and mirrored when Arabic resolves.

**Independent Test**: No saved choice, device/browser language Arabic → walk all screens: all interface text Arabic, layout mirrored, directional icons/keys mirrored, correct plurals, Western digits (quickstart W1–W6).

### Implementation for User Story 1

Each extraction task: replace every user-visible English literal (JSX text, `aria-label`, `title`, `placeholder`, `alt`, toast/inline messages, `document`-visible strings) with `t`/`tx`/`plural` from `useI18n()`; replace physical direction classes with logical ones per contracts/i18n-runtime.md §6; replace `humanSize`/`toLocaleString` with `formatBytes`/`formatNumber`; keep error fallbacks as `t('errors.…')` for now (US4 swaps in `errorText`). Add any missing keys to both `en.ts` and `ar.ts`.

- [X] T015 [P] [US1] Create `client/src/components/ui/SegmentedControl.tsx` per contracts/i18n-runtime.md §7 by generalising `client/src/components/ui/ThemeToggle.tsx` (same classes, roving tabindex, Home/End, `max-md:h-11 max-md:w-11`), adding `labelLang` (sets `lang` on the label span) and RTL arrow inversion using `useI18n().dir` (ArrowRight/ArrowDown → previous in RTL; ArrowLeft/ArrowUp → next).
- [X] T016 [US1] Rewrite `client/src/components/ui/ThemeToggle.tsx` (depends T015) as a thin wrapper over `SegmentedControl` with labels `t('theme.system'|'theme.light'|'theme.dark')` and `ariaLabel={t('theme.label')}`; same props and placements as today.
- [X] T017 [P] [US1] Edit `client/src/lib/password.ts` to remove the English `label` from `estimateStrength` (return `{ score }` plus `empty: boolean`), and edit `client/src/components/StrengthMeter.tsx` to show `t('strength.empty' | 'strength.veryWeak' | 'strength.weak' | 'strength.fair' | 'strength.strong' | 'strength.veryStrong')` by score/empty.
- [X] T018 [P] [US1] Translate `client/src/App.tsx` (`Loading…` → `t('app.loading')`).
- [X] T019 [P] [US1] Translate and mirror `client/src/components/AppShell.tsx`: nav labels via `t('nav.*')` (move the `nav` array inside the component or map labels at render), `Lock vault`, `Sign out`, mobile lock `aria-label`; active indicator `left-0` → `start-0`; keep `left-1/2 -translate-x-1/2` centring on the mobile nav.
- [X] T020 [P] [US1] Translate `client/src/components/ui/GlassModal.tsx` close button `aria-label` → `t('common.close')`.
- [X] T021 [P] [US1] Translate `client/src/components/ui/ConfirmModal.tsx` `Cancel` → `t('common.cancel')`.
- [X] T022 [P] [US1] Translate and mirror `client/src/components/ItemModal.tsx`: `TYPES` labels via `t('vault.types.*')`, dialog titles, field labels, placeholders, `Delete`, `Cancel`, `Save`/`Saving…`, toasts (`item.copied|saved|updated|deleted`, `errors.clipboard`, `errors.saveFailed`), `aria-label` Hide/Reveal/Copy/Generate; `pr-10` → `pe-10`, `right-2.5` → `end-2.5`.
- [X] T023 [P] [US1] Translate `client/src/components/PasswordGenerator.tsx`: `t('generator.length', { count })`, checkbox labels `t('generator.lower'|'upper'|'digits'|'symbols')`, `t('generator.generate')`.
- [X] T024 [P] [US1] Translate and mirror `client/src/components/FilePreview.tsx`: all strings in header, loader, `Renderer`, `Notice`, `TooLarge`, `SheetRenderer`, `Grid` per `preview.*` keys; `humanSize` → `formatBytes`; `MAX_TABLE_ROWS.toLocaleString()` → `formatNumber`; `dialogLabel`/`position` via `t`; classes `border-r` → `border-e`, `pr-3` → `pe-3`, `pl-3` → `ps-3`, `text-right` → `text-end`, sticky `left-0` → `start-0`; **RTL paging (research R8)**: `PageButton` takes `side: 'start' | 'end'` positioned with `start-2 sm:start-4` / `end-2 sm:end-4`, start = previous, end = next; icons `ChevronLeft` for start and `ChevronRight` for end both with `rtl:-scale-x-100`; keyboard handler: `const forward = dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight'` → `step(1)`, the other arrow → `step(-1)`; button titles `t('preview.previousHint')`/`t('preview.nextHint')` without literal arrow glyphs.
- [X] T025 [P] [US1] Translate and mirror `client/src/pages/FilesPage.tsx`: `fileKind` labels via `files.kinds.*` (return a key, translate at render), header title and `summary` via `plural('files.summary', count, { size: formatBytes(total) })`, upload button (`plural('files.uploading', n)`), folder chips (`files.allFiles`, `files.noFolder`, `deleteFolderLabel`), `New folder`, dropzone texts, `UploadRow` texts (`encryptingOnServer`, `uploadingPercent` with `formatNumber(percent)`, `uploadingAria`, `common.dismiss`), empty states, row action `aria-label`/`title` (`common.preview`, `files.moveToFolder`, `common.download`, `common.delete`), all toasts, both `ConfirmModal` bodies via `tx` (filename/folder params are strings → bdi-isolated) and confirm/secondary labels via `plural`, New folder and Move dialogs; `humanSize` → `formatBytes`; `errors.fileTooLarge`; classes `mr-1` → `me-1`, `pr-1.5` → `pe-1.5`, `text-left` → `text-start`.
- [X] T026 [P] [US1] Translate and mirror `client/src/pages/VaultPage.tsx`: title, `Add item`, search placeholder, loading/empty/no-match texts, card fallback `item.type` → `t('vault.types.' + type)`; `left-3.5` → `start-3.5`, `pl-10 pr-4` → `ps-10 pe-4`.
- [X] T027 [P] [US1] Translate `client/src/pages/AuthPage.tsx`: subtitle, all labels/placeholders, submit labels, mode switch link, toast fallback `errors.generic`.
- [X] T028 [P] [US1] Translate `client/src/pages/UnlockPage.tsx`: title, prompt via `tx('unlock.promptWithEmail', { email: <bdi dir="ltr">{email}</bdi> })` or `t('unlock.prompt')` when no session, placeholder, button labels, `Sign out`, fallback `errors.unlockFailed`.
- [X] T029 [P] [US1] Translate `client/src/pages/ServerSetupPage.tsx`: title, description, label, `willConnect` via `tx` with the normalized address in `<span dir="ltr" className="text-fg">`, button labels, fallback `errors.addressUnreachable`, insecure warning via `tx('serverSetup.insecureWarning', { http: <span className="font-semibold">http://</span>, https: <span className="font-semibold">https://</span> })`.
- [X] T030 [P] [US1] Translate `client/src/pages/SettingsPage.tsx`: all card titles/descriptions (Appearance, Account, Server, Change server, Change master password), input label/placeholder, button labels, toasts (`settings.masterUpdated`, `errors.updateFailed`), recoverable-encryption warning.
- [X] T031 [US1] Hygiene pass (depends T015–T030): run `node client/scripts/check-i18n.mjs`; fix every remaining hard-coded string (check 5) and physical-direction class (check 4) in the reported files, adding keys to both catalogs; then `npm run build --workspace client` must pass and all 5 checks PASS.
- [X] T032 [US1] Validate US1 with quickstart.md W1–W6 (Chrome language order; mocked API from 001's approach is acceptable when no server is available) on all screens at desktop and 375 px, both themes; fix clipping/overflow of longer Arabic labels in the owning file (prefer `min-w-0`/`truncate`/wrapping over fixed widths).

**Checkpoint**: User Story 1 functional and testable independently (MVP)

---

## Phase 4: User Story 2 - My data looks exactly the way I typed it (Priority: P1)

**Goal**: User content keeps its own direction; credential-style values always LTR; nothing reordered in display, copy, or download.

**Independent Test**: Mixed-direction test set from quickstart.md Prerequisites displays and copies identically in both languages (W7, W8).

### Implementation for User Story 2

- [X] T033 [US2] Edit `client/src/components/ItemModal.tsx` (depends T022): password `<input>` gets `dir="ltr"` and `rtl:text-right`; URL `GlassInput` gets `dir="ltr" inputMode="url"` and `className="rtl:text-right"`; title, username, folder `GlassInput`s and notes `<textarea>` get `dir="auto"`. Confirm `GlassInput` forwards `dir`/`className` via `...rest` (it does).
- [X] T034 [P] [US2] Edit `client/src/pages/VaultPage.tsx` (depends T026): card title `<p>` and folder chip get `dir="auto"`; the username/URL subtitle gets `dir="auto"` (URLs start with Latin so resolve LTR); search input gets `dir="auto"`.
- [X] T035 [P] [US2] Edit `client/src/pages/AuthPage.tsx` (depends T027): email, password, master-password inputs get `dir="ltr"` and `className="rtl:text-right"`.
- [X] T036 [P] [US2] Edit `client/src/pages/UnlockPage.tsx` (depends T028): master-password input `dir="ltr"` + `rtl:text-right`.
- [X] T037 [P] [US2] Edit `client/src/pages/ServerSetupPage.tsx` (depends T029): server address input `dir="ltr"` + `rtl:text-right`.
- [X] T038 [P] [US2] Edit `client/src/pages/SettingsPage.tsx` (depends T030): new master-password input `dir="ltr"` + `rtl:text-right`; account email and server origin `<p>`s `dir="ltr"` with `text-start` inside an RTL card replaced by `rtl:text-right`.
- [X] T039 [P] [US2] Edit `client/src/components/FilePreview.tsx` (depends T024): keep existing `dir="auto"` on file name; `TextRenderer` `<pre>` gets `dir="auto"` and inline style `unicodeBidi: 'plaintext'` so each line takes its own direction; `Grid` data `<td>`s get `dir="auto"`; sheet tab buttons get `dir="auto"`; line-number `<ol>` and row-number cells get `dir="ltr"`.
- [X] T040 [P] [US2] Edit `client/src/pages/FilesPage.tsx` (depends T025): verify all existing `dir="auto"` usages still wrap file/folder names; add `dir="auto"` to the Move dialog filename `<p>`, folder chip in file rows, and upload row name; confirm ConfirmModal bodies render names through `tx` (bdi). Ensure download/copy paths pass `f.filename` untouched.
- [X] T041 [US2] Validate US2 with `specs/002-arabic-rtl/quickstart.md` W7 and W8 using the full mixed-direction test set in English and Arabic (paste copied passwords into a plain editor and compare); fix any reordering in the owning file.

**Checkpoint**: User Stories 1 and 2 functional

---

## Phase 5: User Story 3 - Switch language and have it stick, without a flash (Priority: P2)

**Goal**: Language choice in Settings, immediate switch, persistence, no wrong-language frame (including production CSP).

**Independent Test**: quickstart.md W9–W12 and §3.

### Implementation for User Story 3

- [X] T042 [P] [US3] Create `client/src/components/ui/LanguageSwitcher.tsx`: `SegmentedControl` variant `labeled`, options from `LANGUAGES` (`label = nativeName`, `labelLang = code`), `value = lang`, `onChange = setLanguage`, `ariaLabel = t('language.label')`.
- [X] T043 [US3] Edit `client/src/pages/SettingsPage.tsx` (depends T038, T042): add a `GlassCard className="mb-4"` directly after Appearance with `<h2>` `t('language.label')`, description `t('language.description')`, and `<LanguageSwitcher className="mt-3" />`.
- [X] T044 [US3] Validate W9–W12 in `client-dev`, then the production CSP check (quickstart §3): serve `client/dist` with the server's CSP (real `npm start`, or 001's scratchpad CSP server via a temporary launch config removed afterwards) and confirm no CSP violations for `locale-init.js`, `theme-init.js`, `fonts.googleapis.com` CSS, or `fonts.gstatic.com` font files; saved language ≠ device language shows correct language/direction on first paint.

**Checkpoint**: User Stories 1–3 functional

---

## Phase 6: User Story 4 - Errors and feedback are in my language (Priority: P2)

**Goal**: All server/client error messages translated with per-action fallbacks.

**Independent Test**: quickstart.md W13–W14.

### Implementation for User Story 4

Replace each `err instanceof ApiError ? err.message : t('errors.X')` (or equivalent) with `errorText(err, 'errors.X')` from `useErrorText()`; remove now-unused `ApiError` imports.

- [X] T045 [P] [US4] Apply `errorText` in `client/src/components/ItemModal.tsx` (save mutation `onError`) (depends T033).
- [X] T046 [P] [US4] Apply `errorText` in `client/src/pages/FilesPage.tsx` (upload catch → row error and toast, delete, delete folder, move, download) (depends T040).
- [X] T047 [P] [US4] Apply `errorText` in `client/src/components/FilePreview.tsx` (download catch; blob load failure uses `t('preview.loadFailed')`) (depends T039).
- [X] T048 [P] [US4] Apply `errorText` in `client/src/pages/AuthPage.tsx` (fallback `errors.generic`) (depends T035).
- [X] T049 [P] [US4] Apply `errorText` in `client/src/pages/UnlockPage.tsx` (fallback `errors.unlockFailed`) (depends T036).
- [X] T050 [P] [US4] Apply `errorText` in `client/src/pages/ServerSetupPage.tsx` (inline error; fallback `errors.addressUnreachable`) (depends T037).
- [X] T051 [P] [US4] Apply `errorText` in `client/src/pages/SettingsPage.tsx` (master reset; fallback `errors.updateFailed`) (depends T043).
- [X] T052 [US4] Run `node client/scripts/check-i18n.mjs` (check 1 must PASS) and `grep -rn "err.message\|\.message :" client/src --include=*.tsx` (must be empty); validate quickstart W13–W14 (real server preferred; otherwise override responses in DevTools).

**Checkpoint**: User Stories 1–4 functional

---

## Phase 7: User Story 5 - Android app behaves the same (Priority: P3)

**Goal**: Parity on Android; no native code changes expected.

**Independent Test**: quickstart.md A1–A5.

- [X] T053 [US5] Confirm no native change is needed: `git diff --stat main -- client/android/` must show no files changed by this feature; if `cap sync` rewrites `client/android/app/capacitor.build.gradle` or `client/android/capacitor.settings.gradle` line endings only, restore them with `git checkout --`.
- [ ] T054 [US5] On a machine with the Android SDK: `npm run android:install`, then `specs/002-arabic-rtl/quickstart.md` A1–A5 (first launch in Arabic, switch & 20× relaunch, file viewer direction, parity walkthrough, offline font fallback). Record results; fix defects in the web source files that own them.

**Checkpoint**: All user stories functional on web and Android

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T055 Native Arabic review of `client/src/i18n/messages/ar.ts` (human task, SC-008): reviewer checks every string, plural forms, error drafts, and screen context; apply corrections; remove the "Draft" header comment when signed off.
- [X] T056 [P] Update `DESIGN.md`: add "§14 Language & direction" summarising contracts/i18n-runtime.md §6 (logical utilities only, directional icon flip, user-content `dir="auto"`/`bdi`, forced-LTR credential fields, RTL arrow keys, Western digits, catalogs + `check-i18n.mjs`), note IBM Plex Sans Arabic and the `:lang(ar)` tracking reset in §4 Typography, and add `SegmentedControl`/`LanguageSwitcher` to the §13 migration map as done.
- [X] T057 Final gates: `npm run build --workspace client`; `node client/scripts/check-i18n.mjs`; `node client/scripts/check-contrast.mjs`; server suite (as in T001); `git diff --stat main -- server/ client/android/` empty; `git diff main -- package.json client/package.json server/package.json package-lock.json` shows no dependency changes; DESIGN.md §11 keyboard walkthrough in Arabic, both themes (W16).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → **Foundational (Phase 2)** → user stories
- **US1 (Phase 3)**: after Foundational
- **US2 (Phase 4)**: after US1 tasks for the same files (T033←T022, T034←T026, T035←T027, T036←T028, T037←T029, T038←T030, T039←T024, T040←T025)
- **US3 (Phase 5)**: T042 after T015; T043 after T038
- **US4 (Phase 6)**: each file task after that file's US2 task (listed per task)
- **US5 (Phase 7)**: after US1–US4 for meaningful validation
- **Polish (Phase 8)**: T055 can start once T007 exists but must finish before release; T056/T057 last

### Task-level dependencies

- T006 → T007, T008, T009; T003–T005 → T009; T009 → T013; T010 → T011; T002–T013 → T014
- T015 → T016, T042; T015–T030 → T031 → T032
- US2/US4 per-file chains as listed above; T041 after T033–T040; T052 after T045–T051

### User Story Dependencies

- US1 is the base for all others (strings must exist before direction/error/switch work on the same files)
- US2, US3, US4 are feature-independent but share files with US1 and each other, hence the per-file chains
- US5 validates everything on Android

---

## Parallel Examples

### Phase 2

```text
Task: "T003 Create client/src/i18n/languages.ts"
Task: "T004 Create client/src/i18n/format.ts"
Task: "T005 Create client/src/i18n/interpolate.tsx"
Task: "T010 Create client/public/locale-init.js"
Task: "T012 Edit client/src/index.css (:lang(ar) typography)"
```

### User Story 1 (after Foundational)

```text
Task: "T015 Create SegmentedControl.tsx"
Task: "T017 password.ts + StrengthMeter.tsx"
Task: "T019 AppShell.tsx"   Task: "T022 ItemModal.tsx"   Task: "T024 FilePreview.tsx"
Task: "T025 FilesPage.tsx"  Task: "T026 VaultPage.tsx"   Task: "T027 AuthPage.tsx"
Task: "T028 UnlockPage.tsx" Task: "T029 ServerSetupPage.tsx" Task: "T030 SettingsPage.tsx"
```

### User Story 2 / 4

```text
Task: "T034 VaultPage dir attributes"  Task: "T035 AuthPage LTR fields"  Task: "T039 FilePreview bidi"
Task: "T046 FilesPage errorText"       Task: "T048 AuthPage errorText"   Task: "T050 ServerSetupPage errorText"
```

---

## Implementation Strategy

### MVP First

1. Phases 1–2 → foundation
2. Phase 3 (US1) → **validate** (T032): complete Arabic RTL app
3. Phase 4 (US2) → **validate** (T041): data integrity — ship US1 and US2 together, since RTL without content isolation risks misreading credentials

### Incremental Delivery

1. Foundation → 2. US1 + US2 (MVP) → 3. US3 language switch → 4. US4 translated errors → 5. US5 Android verification → 6. Polish (native review is a release blocker)

### Suggested commits

One commit per phase, e.g. `feat(i18n): language runtime, catalogs and pre-paint direction (T001–T014)`.

---

## Notes

- English UI must look and read exactly as before (copy strings verbatim into `en.ts`)
- Never concatenate translated fragments; one key per sentence
- Tailwind drops unknown classes silently — `check-i18n.mjs` check 4 and a build are both required after class changes
- Do not modify `server/` or `client/android/`
