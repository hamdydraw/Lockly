# Research: Arabic Language & Right-to-Left Layout

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Date**: 2026-09-13

All Technical Context unknowns are resolved. No `NEEDS CLARIFICATION` remains.

---

## R1. i18n architecture without dependencies

**Decision**: Typed in-repo catalogs. `client/src/i18n/messages/en.ts` exports a nested `const en`
object (strings, `{name}` placeholders, and plural objects). `Messages` is derived from it with string
leaves widened; `messages/ar.ts` is declared `const ar: Messages`, so a missing or extra key is a
TypeScript error at `npm run build`. `t(key, params)` takes a dot-path key typed as a union of all leaf
paths. A `languages.ts` registry lists `{ code, dir, nativeName, locale }` per language; adding a
language = one registry entry + one catalog file (SC-007).

**Rationale**: ~85 strings and 2 languages don't justify i18next (+2 packages, runtime JSON loading).
Compile-time completeness is stronger than runtime missing-key warnings. Same provider pattern as
ThemeProvider keeps the codebase consistent.

**Alternatives considered**:
- `react-i18next`/`i18next`: pluralization and tooling, but new dependencies (constitution IV; rejected
  by product owner).
- `FormatJS/react-intl`: ICU messages, heavier, also a dependency.
- JSON catalogs loaded at runtime: loses type-checking and needs async loading before first paint.

---

## R2. Language resolution and persistence

**Decision**: `localStorage["lockly.lang"]` ∈ `en | ar`. Resolution: valid saved value → first entry in
`navigator.languages` (fallback `navigator.language`) whose base subtag (`ar-EG` → `ar`) is supported →
`en`. Storage access wrapped in try/catch; invalid values ignored.

**Rationale**: Matches spec FR-002/FR-005 and edge cases (multi-language preference order, bad values,
blocked storage). Mirrors `lockly.theme`. Android WebView exposes the system locale list through
`navigator.languages`, so no native code is needed (FR-019).

**Alternatives considered**: Account-level preference (needs API change, FR-020); `Accept-Language`
detection on the server (server change, doesn't work for Capacitor local assets).

---

## R3. Pre-paint language and direction

**Decision**: New same-origin blocking script `client/public/locale-init.js`, loaded in `<head>` next to
`theme-init.js` and before stylesheets. It resolves the language (R2) and sets
`document.documentElement.lang` and `.dir`. `index.html` keeps static `lang="en" dir="ltr"` as the
no-JS default. `LanguageProvider` reads the attributes at mount so React agrees with the first paint.

**Rationale**: Direction must be correct before layout, otherwise the whole page visibly flips
(SC-004). Inline scripts are blocked by `script-src 'self'`. A separate file keeps theme and locale
concerns independent; both are tiny and cached.

**Alternatives considered**: Merge into `theme-init.js` (renaming breaks 001 contracts/docs and mixes
concerns); set `dir` in React only (flash of LTR layout on Arabic devices).

---

## R4. Mirroring strategy

**Decision**: Drive everything from `html[dir]`. Replace physical utilities with Tailwind 3.4 logical
equivalents: `ml-/mr-` → `ms-/me-`, `pl-/pr-` → `ps-/pe-`, `left-/right-` → `start-/end-`,
`text-left/right` → `text-start/end`, `border-l/r` → `border-s/e`, `rounded-l/r` → `rounded-s/e`. Use
the built-in `rtl:` variant only where logical properties can't express intent: flipping directional
icons (`rtl:-scale-x-100`) and translate-based indicators. Centering patterns (`left-1/2
-translate-x-1/2`) are symmetric and stay. `check-i18n.mjs` fails on new physical-direction classes
outside an allowlist.

**Rationale**: Logical properties mirror automatically with zero duplicated class strings; the browser
handles it, including on Android WebView (Chromium). Tailwind ≥ 3.3 ships these utilities, so no plugin.

**Alternatives considered**: `tailwindcss-rtl` plugin (dependency); separate RTL stylesheet or
`rtl:` overrides everywhere (duplicated, error-prone); CSS `transform: scaleX(-1)` on the root (mirrors
text and user content — unacceptable).

---

## R5. Protecting user content (bidi isolation)

**Decision**:
- Elements that render user content (titles, usernames, folder names, file names, notes, URLs, sheet
  cells, text preview) get `dir="auto"` so direction follows the first strong character; the 9 existing
  `dir="auto"` usages are kept.
- When user content is embedded inside a translated sentence ("“{filename}” will be permanently
  deleted"), the interpolation helper wraps the value in `<bdi dir="auto">` so neutral characters
  (quotes, parentheses, digits) around it don't reorder.
- Credential-style fields and values — password inputs and reveals, email, URL, server address,
  generated password, copied-value previews — are forced `dir="ltr"`; in RTL they also get
  `text-end`-aligned placeholders via `rtl:text-right` so they line up with Arabic labels while the
  value still reads left to right (FR-011).
- Copy/download paths use stored values only; no string transformation is ever applied (FR-010).

**Rationale**: The Unicode Bidi algorithm's isolates are the standard, lossless solution; they change
display order only, never the stored or copied characters. Passwords with leading/trailing symbols are
the classic failure case in RTL UIs (`!abc` rendering as `abc!`); forcing LTR removes it.

**Alternatives considered**: Inserting Unicode control characters (LRM/RLI) into strings — risks
leaking into copied values; `unicode-bidi: plaintext` everywhere — inconsistent support for inputs.

---

## R6. Plurals, numbers, units, dates

**Decision**:
- Plural entries are objects keyed by `Intl.PluralRules` categories. English uses `one|other`; Arabic
  provides `zero|one|two|few|many|other`. `plural(key, count, params)` selects via
  `new Intl.PluralRules(locale).select(count)`, falling back to `other`.
- Numbers use `new Intl.NumberFormat(locale, { numberingSystem: 'latn' })` with locale tags `en` and
  `ar-u-nu-latn`, guaranteeing Western digits 0–9 (FR-015).
- Byte sizes via `formatBytes(n)`: units from the catalog — en `B/KB/MB`, ar `بايت/ك.ب/م.ب`.
- The only existing locale call (`toLocaleString()` in FilePreview) is replaced with `formatNumber`.
  No dates are displayed today; `formatDate` is not added (YAGNI) but the locale tag above supports it.

**Rationale**: Intl is built into all targets including Android WebView; Arabic pluralization with six
categories cannot be done correctly with `count === 1 ? … : …`.

**Alternatives considered**: Hand-written Arabic plural rules (error-prone); Eastern Arabic digits
(rejected by product owner).

---

## R7. Translating server errors without server changes

**Decision**: `client/src/i18n/errors.ts` maps each exact English message the client can receive to a
catalog key (full list in [contracts/error-translation.md](contracts/error-translation.md)): 16 distinct
server messages from `HttpError`/error middleware/rate limiter and 10 client-generated `ApiError`
messages in `lib/api.ts`. Pattern entries cover dynamic messages (`Server responded {status}`). `errorText(err,
fallbackKey)` returns the translated message for an `ApiError` with a known message, otherwise the
translated `fallbackKey` (per-action generic, e.g. "Save failed") — never the raw English text when a
non-English language is active. In English, known messages render identically to today.
`ApiError.message` stays English for logs/debugging; `lib/api.ts` is unchanged.

`check-i18n.mjs` scans `server/src/**/*.ts` (read-only) for `new HttpError(…, '…')`, `error: '…'` and
`lib/api.ts` for `new ApiError(…, '…')`, and fails if any message lacks a mapping.

**Rationale**: Satisfies FR-012/FR-020 and constitution III (no API change). The drift check prevents
the classic problem of new server messages silently appearing untranslated.

**Alternatives considered**: Server-side error codes (API change + server tests — declined by product
owner); fuzzy matching (unpredictable).

---

## R8. Directional interactions

**Decision**:
- `FilePreview` paging: buttons positioned with `start-2 sm:start-4` / `end-2 sm:end-4`; "previous" is
  always the start side. Icons: previous uses `ChevronLeft` with `rtl:-scale-x-100` (so it points right
  in RTL), next likewise. Keyboard: in RTL, `ArrowLeft` → next and `ArrowRight` → previous (visual
  direction). Labels "(←)/(→)" in titles become direction-aware.
- New `ui/SegmentedControl.tsx` generalises ThemeToggle's roving-tabindex radiogroup; arrow keys invert
  when `dir === 'rtl'`; Home/End unchanged. ThemeToggle and LanguageSwitcher both use it.
- AppShell active-nav indicator moves from `left-0` to `start-0`; the mobile nav stays centred.
- There are no swipe gestures in the app today; spec "swipe" requirements apply only if added later.

**Rationale**: WAI-ARIA APG specifies that horizontal arrow keys follow visual direction in RTL.
Extracting the radiogroup avoids duplicating subtle keyboard logic.

---

## R9. Arabic typeface

**Decision**: Add **IBM Plex Sans Arabic** (weights 400, 500, 600, 700) to the existing Google Fonts
stylesheet link. In `index.css`: `:lang(ar) body { font-family: 'IBM Plex Sans Arabic', 'Inter',
'Noto Sans Arabic', 'Segoe UI', Tahoma, system-ui, sans-serif; }` and
`:lang(ar) * { letter-spacing: 0 !important; }`. `font-extrabold` (800) resolves to 700 in Arabic.

**Rationale**: Plex Sans Arabic is designed to pair with Latin grotesques like Inter (similar x-height
and stroke contrast), is OFL-licensed, and is legible at 12–14 px. Google Fonts serves it with
`unicode-range` subsets and browsers only fetch faces that are used, so English sessions don't download
it. The host is already allowed by the CSP (`style-src fonts.googleapis.com`, `font-src fonts.gstatic.com`)
— no server change. Negative tracking (`tracking-tight`) breaks Arabic cursive joining, hence the reset.
Offline/LAN devices fall back to the OS Arabic font (Noto Sans Arabic on Android, Segoe UI/Tahoma on
Windows), which joins letters correctly (FR-016).

**Alternatives considered**: Noto Kufi Arabic (geometric, less readable at small sizes); Cairo/Tajawal
(stylistically further from Inter); self-hosting font files (adds binary assets; possible later for
fully offline deployments).

---

## R10. Android

**Decision**: No native changes. `locale-init.js` and `LanguageProvider` run in the WebView;
`navigator.languages` reflects the Android per-app/system locale list. The native splash screen and
launcher label remain untranslated (spec out of scope). The status bar is unaffected by direction.

**Rationale**: All UI is web content. Verified behavior path is identical to the web (FR-019).

---

## R11. Document language, direction, and title

**Decision**: `LanguageProvider` keeps `<html lang>` and `<html dir>` in sync and sets
`document.title` from `t('app.documentTitle')`. The language option labels carry their own `lang`
attribute (`<span lang="ar">العربية</span>`) so screen readers pronounce them correctly (FR-003, FR-018).

---

## R12. Language control placement and switch behavior

**Decision**: A "Language" card in `SettingsPage` directly below "Appearance", containing
`LanguageSwitcher` (labelled variant of SegmentedControl, options `English` and `العربية`). Switching
calls `setLanguage`, which updates state, storage, and `<html lang dir>` synchronously in a layout
effect; React re-renders all `t()` consumers in place — no remount, so dialogs and form state persist
(FR-004). Not placed in the sidebar or pre-sign-in screens (spec Assumptions).

---

## R13. Verification without new dependencies

**Decision**: `client/scripts/check-i18n.mjs` (Node built-ins only) checks:
1. Every server/client English error message (R7 scan) has a mapping in `errors.ts`.
2. `ar.ts` has no empty strings and no values identical to `en.ts` except an allowlist (brand
   "Lockly", format tokens like "PDF", "CSV").
3. Placeholder parity: each `{name}` in an English string exists in the Arabic string.
4. No physical-direction Tailwind classes (`ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`,
   `text-left`, `text-right`, `border-l`, `border-r`, `rounded-l`, `rounded-r`) in `client/src`, except
   allowlisted centring (`left-1/2`) and inset utilities like `inset-x-0`.
5. No hard-coded English JSX text: flags JSX text nodes and `aria-label`/`title`/`placeholder` string
   literals containing Latin letters, with an allowlist for brand/technical tokens.

Type-level completeness comes from `tsc` in `npm run build`. Translation quality is verified by a
native Arabic reviewer (spec SC-008), recorded as a task.

**Alternatives considered**: eslint-plugin-i18next / i18n-ally / Playwright visual tests — all add
dependencies.
