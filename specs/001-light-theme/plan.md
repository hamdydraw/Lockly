# Implementation Plan: Light Theme

**Branch**: `001-light-theme` | **Date**: 2026-09-13 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-light-theme/spec.md`

## Summary

Add a Light theme next to the existing Dark theme, selectable as System (default), Light, or
Dark, following DESIGN.md §2, §3, §12 and the theming rows of §13. Colors move from hard-coded
hex/Tailwind literals to CSS custom properties on `html[data-theme]`, which Tailwind reads via
`rgb(var(--token) / <alpha-value>)`. A synchronous pre-paint script sets the theme before first
render; a `ThemeProvider` owns preference state, persistence in `localStorage["lockly.theme"]`,
live `prefers-color-scheme` tracking, and syncing `<meta name="theme-color">`. On Android, a
small in-repo Capacitor plugin (no npm dependency) sets the status bar color and icon contrast
and remembers the last resolved theme so the native window never flashes the wrong color.
Controls: an Appearance section in Settings, a compact segmented control in the sidebar footer,
and the same compact control in the phone top bar. Client-only; no server or API change.

## Technical Context

**Language/Version**: TypeScript 5.7 (React 18.3, Vite 7), CSS via Tailwind 3.4; Java 17 for the
Android native plugin (compileSdk/targetSdk 35); Node ≥ 20.19

**Primary Dependencies**: Existing only — tailwindcss, react, lucide-react (icons),
@capacitor/core + @capacitor/android 7.6.9, androidx.core 1.15 (already pulled in by Capacitor).
No new dependencies (constitution IV; user input).

**Storage**: Web `localStorage` key `lockly.theme` (`system | light | dark`); Android
`SharedPreferences` key `lockly.theme.resolved` (`light | dark`) for native pre-WebView paint.
No database or server storage.

**Testing**: No client test runner exists and none will be added (IV). Verification via
`npm run build` (type-check), a zero-dependency Node contrast script
(`client/scripts/check-contrast.mjs`) for SC-002, and the manual scenarios in
[quickstart.md](quickstart.md) on web and Android. Server `npm test` must still pass (untouched).

**Target Platform**: Modern evergreen browsers (web SPA served by the Express server); Android
app via Capacitor WebView (minSdk per project, targetSdk 35).

**Project Type**: Web application (npm workspaces `server` + `client`) with a Capacitor Android
shell in `client/android`.

**Performance Goals**: Resolved theme applied before first paint (0 wrong-theme frames, SC-003);
live device-appearance changes reflected within 1 s (SC-005); theme switch does not re-mount the
React tree.

**Constraints**: CSP `script-src 'self'` in production (no inline scripts); no server changes
(FR-016); DESIGN.md token values and contrast thresholds are authoritative; honor
`prefers-reduced-motion`; storage may be unavailable (must not throw).

**Scale/Scope**: 6 screens (Server setup, Auth, Unlock, Vault, Files, Settings) plus shared
components; ~20 client files contain hard-coded colors (heaviest: `pages/FilesPage.tsx`,
`components/FilePreview.tsx`, `components/AppShell.tsx`). DESIGN.md §13 layout/component
redesign is out of scope (spec Assumptions).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Pre-research | Post-design |
|---|---|---|---|
| I. Zero Plaintext Secrets at Rest | Nothing secret persisted | ✅ Only a display preference (`system/light/dark`) is stored; non-secret per spec Assumptions | ✅ data-model.md stores only enum values in `localStorage` / `SharedPreferences` |
| II. Reviewed Cryptography Only | No crypto touched | ✅ N/A | ✅ N/A — no auth, session, or crypto code changes |
| III. Server Tests for Every API Change | Tests if `/api/*` changes | ✅ N/A — no API change (FR-016) | ✅ N/A — `server/` untouched; `npm test` still required to pass |
| IV. Justified Dependencies | No unjustified new deps | ✅ None planned | ✅ None added. Android plugin is in-repo Java using androidx.core already shipped by Capacitor (research R4) |
| V. Mobile + Web Parity | Both platforms specified and verified | ✅ Spec US4, FR-013, FR-014 | ✅ Same ThemeProvider on both; native bars plugin for Android; quickstart covers web + Android build |

Additional repo constraints: CSP compatibility respected without server change (research R1);
DESIGN.md is the token source (research R2).

**Result**: PASS (pre and post). No Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/001-light-theme/
├── plan.md                      # This file
├── research.md                  # Phase 0 decisions
├── data-model.md                # Theme preference / resolved theme model
├── quickstart.md                # Validation guide (web + Android)
├── contracts/
│   ├── theme-runtime.md         # DOM, storage, CSS token, and React context contracts
│   └── system-bars-plugin.md    # JS ⇄ Android native plugin contract
├── checklists/requirements.md   # Spec quality checklist (from /speckit-specify)
└── tasks.md                     # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
client/
├── index.html                               # + theme-color meta, <script src="/theme-init.js">
├── public/
│   └── theme-init.js                        # NEW: synchronous pre-paint theme resolver
├── tailwind.config.js                       # token colors via rgb(var(--x) / <alpha-value>);
│                                            #   temporary legacy aliases (research R3)
├── capacitor.config.ts                      # remove hard-coded backgroundColor (set natively)
├── scripts/
│   └── check-contrast.mjs                   # NEW: zero-dep WCAG check of DESIGN.md token pairs
├── src/
│   ├── index.css                            # :root/dark + light token blocks, focus ring, body
│   ├── main.tsx                             # wrap app in <ThemeProvider>
│   ├── theme/
│   │   ├── ThemeProvider.tsx                # NEW: state, persistence, matchMedia, meta + bars sync
│   │   └── systemBars.ts                    # NEW: registerPlugin('SystemBars') wrapper, no-op on web
│   ├── components/
│   │   ├── ui/ThemeToggle.tsx               # NEW: segmented radiogroup (compact + labeled variants)
│   │   ├── ui/*.tsx                         # migrate literals → tokens (Glass* names kept)
│   │   ├── AppShell.tsx                     # tokens; ThemeToggle in sidebar footer + phone top bar
│   │   ├── AuroraBackground.tsx             # render only when resolved theme is dark
│   │   ├── FilePreview.tsx, ItemModal.tsx,
│   │   │   PasswordGenerator.tsx, StrengthMeter.tsx   # migrate literals → tokens
│   └── pages/
│       ├── SettingsPage.tsx                 # + Appearance section; tokens
│       └── AuthPage, UnlockPage, ServerSetupPage, VaultPage, FilesPage .tsx  # tokens
└── android/app/src/main/
    ├── java/com/hamdydraw/lockly/
    │   ├── MainActivity.java                # register plugin; apply saved theme in onCreate
    │   └── SystemBarsPlugin.java            # NEW: status bar color/icons + persist resolved theme
    └── res/
        ├── values/colors.xml                # NEW: lockly_bg light (#F5F6FA)
        ├── values-night/colors.xml          # NEW: lockly_bg dark (#0B0D17)
        └── values/styles.xml                # window background → @color/lockly_bg

server/                                      # NO CHANGES
```

**Structure Decision**: Existing web-application layout (`server/` + `client/`) with the
Capacitor Android project under `client/android`. All work is in `client/`; a new
`client/src/theme/` folder holds theme state per DESIGN.md §13. `server/` is not modified.

## Implementation Phasing (guidance for /speckit-tasks)

1. **Foundation** — tokens in `index.css`, Tailwind token colors + legacy aliases, focus ring,
   `theme-init.js` + `index.html`, `ThemeProvider`, contrast script. After this, dark looks
   unchanged and forcing `data-theme="light"` already themes all alias-mapped classes. (US1 base)
2. **Screen migration** — replace remaining literals (`bg-white/…`, `bg-black/…`, raw hex, inline
   `rgba`) with tokens per file; Aurora dark-only; then delete legacy aliases. (US1, FR-008)
3. **Controls** — `ThemeToggle`, Settings Appearance section, sidebar footer, phone top bar. (US2)
4. **Persistence & no-flash hardening** — storage failure paths, sign-out/lock screens. (US3)
5. **Android** — `SystemBarsPlugin`, `MainActivity`, night resources, capacitor config. (US4)
6. **Verification** — contrast script, DESIGN.md §11 checklist in both themes, quickstart on
   web + Android build.

## Complexity Tracking

No constitution violations; nothing to justify.
