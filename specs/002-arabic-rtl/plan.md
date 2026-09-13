# Implementation Plan: Arabic Language & Right-to-Left Layout

**Branch**: `002-arabic-rtl` | **Date**: 2026-09-13 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-arabic-rtl/spec.md`

## Summary

Add Arabic as a second interface language with full RTL layout, using an in-repo, dependency-free
i18n layer that mirrors the ThemeProvider pattern from 001-light-theme. English and Arabic message
catalogs are plain TypeScript objects; the English catalog defines the type, so an incomplete Arabic
catalog fails the build. A `LanguageProvider` resolves the language (saved choice → device languages
→ English), exposes `t()`, rich interpolation that isolates user content, plural selection via
`Intl.PluralRules`, and Western-digit number/byte formatting via `Intl.NumberFormat`. A blocking
`public/locale-init.js` sets `<html lang dir>` before first paint (CSP-safe, like `theme-init.js`).
Layout mirrors through Tailwind 3.4's built-in logical utilities (`ms-`/`pe-`/`start-`/`text-start`)
and `rtl:` variant; user content is isolated with `dir="auto"`/`<bdi>`, and credential-style fields
are forced LTR. English server errors are mapped to translation keys on the client, and a zero-dep
check script keeps the map in sync with the server's messages. Arabic text uses IBM Plex Sans Arabic
from the Google Fonts host the app already loads Inter from, with system Arabic fonts as fallback.
Client-only: no server, API, or native Android code changes.

## Technical Context

**Language/Version**: TypeScript 5.7 (React 18.3, Vite 7), Tailwind CSS 3.4; Node ≥ 20.19

**Primary Dependencies**: Existing only — react, tailwindcss (logical properties + `rtl:`/`ltr:`
variants are built in since 3.3), lucide-react, @capacitor/core. Browser built-ins `Intl.PluralRules`,
`Intl.NumberFormat`, `navigator.languages`. No new npm dependencies (constitution IV; product owner).

**Storage**: Web `localStorage` key `lockly.lang` (`en | ar`). No database, server, or native storage.

**Testing**: No client test runner exists and none is added (IV). Verification via `npm run build`
(type-level catalog completeness), new zero-dependency `client/scripts/check-i18n.mjs` (server-message
coverage, untranslated/empty strings, placeholder parity, physical-direction class hygiene), existing
`check-contrast.mjs`, and manual scenarios in [quickstart.md](quickstart.md) on web and Android. Server
`npm test` must still pass (untouched).

**Target Platform**: Evergreen browsers (Express-served SPA) and Android via Capacitor WebView.

**Project Type**: Web application (npm workspaces `server` + `client`) with Capacitor Android shell.

**Performance Goals**: Resolved language/direction applied before first paint (0 wrong frames, SC-004);
switching language re-renders in place without remount; Arabic font files are never downloaded while
English is active.

**Constraints**: CSP `script-src 'self'`, `font-src 'self' https://fonts.gstatic.com`,
`style-src … https://fonts.googleapis.com` (no server change); user content must never be reordered
(FR-010); Western digits (FR-015); DESIGN.md contrast/touch/focus rules; self-hosted/offline devices
may not reach Google Fonts (FR-016 fallback).

**Scale/Scope**: ~85 interface strings across 6 screens + shared components; 26 error messages (16
distinct server messages, 10 client-generated in `lib/api.ts`); ~20 physical-direction class usages; 2 components with arrow-key/chevron direction logic.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Pre-research | Post-design |
|---|---|---|---|
| I. Zero Plaintext Secrets at Rest | Nothing secret persisted | ✅ Only `en`/`ar` preference stored | ✅ data-model.md: enum value in `localStorage` only |
| II. Reviewed Cryptography Only | No crypto touched | ✅ N/A | ✅ N/A — auth/session/crypto code unchanged |
| III. Server Tests for Every API Change | Tests if `/api/*` changes | ✅ N/A — errors translated client-side (FR-020) | ✅ N/A — `server/` untouched; `check-i18n.mjs` reads server sources read-only to detect drift |
| IV. Justified Dependencies | No unjustified new deps | ✅ None planned | ✅ None added. IBM Plex Sans Arabic is a web font from the already-used Google Fonts host, not a package (research R9) |
| V. Mobile + Web Parity | Both specified and verified | ✅ Spec US5, FR-019 | ✅ Same WebView code path; `navigator.languages` reflects Android system locales; quickstart covers Android |

**Result**: PASS (pre and post). No Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/002-arabic-rtl/
├── plan.md                        # This file
├── research.md                    # Phase 0 decisions R1–R13
├── data-model.md                  # Language preference, resolved language, catalog
├── quickstart.md                  # Validation guide (web + Android)
├── contracts/
│   ├── i18n-runtime.md            # Storage, DOM, provider API, catalog shape, direction rules
│   └── error-translation.md       # Every server/client English message → key → Arabic
├── checklists/requirements.md     # Spec quality checklist
└── tasks.md                       # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
client/
├── index.html                          # + locale-init.js script; + IBM Plex Sans Arabic in fonts link
├── public/
│   └── locale-init.js                  # NEW: pre-paint lang/dir resolver
├── scripts/
│   └── check-i18n.mjs                  # NEW: catalog/server-message/direction hygiene checks
├── src/
│   ├── index.css                       # + :lang(ar) font stack, letter-spacing reset
│   ├── main.tsx                        # wrap app in <LanguageProvider>
│   ├── i18n/
│   │   ├── LanguageProvider.tsx        # NEW: state, persistence, lang/dir/title sync, useI18n()
│   │   ├── languages.ts                # NEW: supported language registry (code, dir, native name, locale tag)
│   │   ├── format.ts                   # NEW: plural category, number, bytes, percent (Western digits)
│   │   ├── interpolate.tsx             # NEW: string + ReactNode interpolation with bdi isolation
│   │   ├── errors.ts                   # NEW: English server/client message → key mapping, errorText()
│   │   └── messages/
│   │       ├── en.ts                   # NEW: source-of-truth catalog (defines Messages type)
│   │       └── ar.ts                   # NEW: Arabic catalog typed as Messages
│   ├── components/
│   │   ├── ui/SegmentedControl.tsx     # NEW: generic RTL-aware radiogroup (extracted from ThemeToggle)
│   │   ├── ui/ThemeToggle.tsx          # uses SegmentedControl + translated labels
│   │   ├── ui/LanguageSwitcher.tsx     # NEW: English / العربية segmented control
│   │   ├── ui/*.tsx                    # translated aria-labels/text; logical utilities
│   │   ├── AppShell.tsx                # strings; logical utilities; directional nav indicator
│   │   ├── FilePreview.tsx             # strings; RTL paging buttons, chevrons, arrow keys; bdi/dir
│   │   ├── ItemModal.tsx, PasswordGenerator.tsx, StrengthMeter.tsx   # strings; LTR fields
│   │   └── AuroraBackground.tsx        # mirror ambient positions (cosmetic, optional)
│   ├── lib/
│   │   └── password.ts                 # strength label → score-only; label resolved via t()
│   └── pages/*.tsx                     # strings; logical utilities; dir on user content & LTR fields
DESIGN.md                               # + §14 Language & direction rules

server/                                 # NO CHANGES
client/android/                         # NO CHANGES
```

**Structure Decision**: Existing web-application layout. All work in `client/` plus a DESIGN.md
section. A new `client/src/i18n/` folder parallels `client/src/theme/`.

## Implementation Phasing (guidance for /speckit-tasks)

1. **Foundation** — languages registry, format helpers, interpolation, en catalog skeleton with all
   keys, ar catalog, LanguageProvider, `locale-init.js`, index.html, font CSS, `check-i18n.mjs`.
2. **US1 strings + mirroring** — screen-by-screen extraction to `t()`, logical utilities, directional
   icons/keys, SegmentedControl extraction.
3. **US2 content integrity** — `dir="auto"`/`<bdi>` on all user content, forced-LTR credential fields,
   mixed-direction test set.
4. **US3 switch & persistence** — LanguageSwitcher in Settings, no-flash verification incl. CSP build.
5. **US4 errors** — errors.ts mapping, replace all `err.message` toasts with `errorText()`.
6. **US5 Android** — build and walkthrough (no native code expected).
7. **Polish** — native-speaker review of ar catalog, DESIGN.md §14, full static gates.

## Complexity Tracking

No constitution violations; nothing to justify.
