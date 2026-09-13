---

description: "Task list for 001-light-theme"
---

# Tasks: Light Theme

**Input**: Design documents from `specs/001-light-theme/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: No `/api/*` behavior changes (FR-016), so constitution Principle III server tests are not required; server `npm test` must still pass (T046). No client test runner exists and none is added (Principle IV). Verification = `npm run build`, `client/scripts/check-contrast.mjs`, and quickstart scenarios. Android verification is included (Principle V, T043).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4 from spec.md)
- All paths are relative to the repository root

## Path Conventions

- Web client: `client/src/`, static assets `client/public/`, scripts `client/scripts/`
- Android shell: `client/android/app/src/main/`
- Server: `server/` — **must not change**

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Baseline and tooling used by every later phase

- [X] T001 Record baseline: from repo root run `npm run build` and `npm test` (scripts in `package.json`); both must succeed before any change. If either fails, stop and report — do not fix unrelated failures in this feature.
- [X] T002 [P] Create zero-dependency contrast checker `client/scripts/check-contrast.mjs` per research R10: import only `node:fs`/`node:path`/`node:url`; read `client/src/index.css`; extract the `:root, html[data-theme='dark']` block and the `html[data-theme='light']` block; parse `--name: R G B;` variables; compute WCAG 2.x contrast; check in **each** theme: `fg` and `fg-muted` on `bg`, `surface-1`, `surface-2`, `surface-3` (≥ 4.5); `fg-subtle` on `surface-2` (≥ 3.0); `accent-fg`, `secure`, `success`, `warning`, `danger` on `surface-2` (≥ 4.5); `fg-on-accent` on `accent` and on `danger-solid` (≥ 4.5); print a table of pair/ratio/threshold/PASS|FAIL; `process.exit(1)` on any failure or if either block is missing. (It is expected to fail until T003 lands.)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Token system, pre-paint script, and ThemeProvider. After this phase dark mode looks unchanged, and `document.documentElement.dataset.theme = 'light'` already re-themes everything that uses legacy class names.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Token migration map (reference for T011–T030)

Use this map whenever a task says "migrate colors". Keep layout, spacing, radius (`rounded-glass` stays), and animation classes unchanged.

| Legacy / literal | Replace with | Notes |
|---|---|---|
| `bg-base` | `bg-bg` | |
| `bg-sidebar` | `bg-surface-1` | sidebar, nav bars, dialogs |
| `bg-card` | `bg-surface-2` | cards, rows, inputs |
| `bg-card-hover`, `hover:bg-card-hover` | `bg-surface-3`, `hover:bg-surface-3` | |
| `text-ink`, `hover:text-ink`, `group-hover:text-ink` | `text-fg` (same prefixes) | |
| `text-muted` | `text-fg-muted` | |
| `border-line`, `border-line/60` | unchanged name (now a token) | |
| `hover:bg-white/[0.04]`…`[0.09]`, `hover:bg-white/10`, `focus:bg-white/10` | `hover:bg-surface-3` (drop `focus:bg-*` on inputs) | hover tints |
| `bg-white/[0.012]`…`[0.06]` | `bg-fg/[0.03]` (use `bg-fg/[0.06]` where the original was ≥ 0.05) | subtle stripes/drop zones — tints correctly in both themes |
| Input chrome `bg-white/5 border-white/12` / `border-white/10` | `bg-surface-2 border-line-strong` | |
| `focus:border-cyan-glow/60`, `shadow-glow-cyan` on inputs | `focus:border-accent-fg` (remove glow shadow) | focus uses accent per DESIGN.md §3.4 |
| `placeholder:text-white/30` | `placeholder:text-fg-subtle` | |
| `text-violet-glow`, `hover:text-violet-glow` | `text-accent-fg` (same prefixes) | |
| `bg-violet-glow` | `bg-accent` | active-nav indicator |
| `bg-violet-glow/10`, `bg-violet-glow/[0.12]`, `/[0.15]` | `bg-accent/10` | accent-soft |
| `border-violet-glow/40`, `ring-violet-glow/40` | `border-accent-fg/40`, `ring-accent-fg/40` | |
| `ring-cyan-glow`, `ring-cyan-glow/40`, `/50` used for **focus/selection/drag-over** | `ring-accent-fg` (keep opacity) | |
| `text-cyan-glow`, `bg-cyan-glow/…`, `border-cyan-glow/…` used for **security state** (encrypted/locked badges, upload/encrypting progress) | `text-secure`, `bg-secure/…`, `border-secure/…` | if unsure, read surrounding copy: security wording ⇒ `secure`, otherwise `accent-fg` |
| `bg-cyan-glow` (progress bar fill) + `#0B0D17` text on it + `#7cebff` hover | `bg-secure`, `text-bg`, `hover:bg-secure/90` | |
| `from-violet-glow to-cyan-glow` (+ `/80`) gradient buttons with `text-[#1a1035]` | `bg-accent text-fg-on-accent hover:bg-accent/90` | DESIGN.md §1: gradients only in Logo |
| `shadow-glow-violet`, `shadow-glow-cyan` (non-input) | `shadow-raised` | glows retired |
| `shadow-card` / `shadow-pop` | `shadow-raised` / `shadow-pop` | |
| `bg-black/50`, `bg-black/70`, `hover:bg-black/70` | `bg-overlay`, `hover:bg-overlay` | scrims and controls over media |
| `text-red-200/300/400`, `hover:text-red-200` | `text-danger` (same prefixes) | |
| `bg-red-500/90`, `hover:bg-red-500` + `text-white` | `bg-danger-solid hover:bg-danger-solid/90 text-fg-on-accent` | destructive buttons |
| `bg-red-400/[0.08]`, `border-red-400/25`, `ring-red-400` | `bg-danger/10`, `border-danger/25`, `ring-danger` | |
| `text-rose-300` | `text-danger` | |
| `text-emerald-200` | `text-success` | |
| `text-amber-200/80`, `border-amber-400/20`, `bg-amber-400/5` | `text-warning`, `border-warning/25`, `bg-warning/10` | |
| `accent-cyan-glow` (native range/checkbox accent-color) | `accent-accent` | |
| class `glass` | `bg-surface-2 border border-line shadow-raised` | |
| class `glass-strong` | `bg-surface-1 border border-line shadow-pop` | |
| `bg-white` inside `FilePreview` behind user document content | **keep** | user content is not recolored (spec edge case) |
| hex in `components/ui/Logo.tsx` | **keep** | brand gradient exception |

### Implementation

- [X] T003 Rewrite `client/src/index.css` per DESIGN.md §12 and contracts/theme-runtime.md §3: (a) replace the `:root { color-scheme: dark; }` block with `:root, html[data-theme='dark'] { … }` and `html[data-theme='light'] { … }` containing exactly the DESIGN.md §12 variables, **plus** `--fg-on-accent: 255 255 255;` in both blocks; (b) `body` uses `color: rgb(var(--fg)); background: rgb(var(--bg));` (keep font-family, smoothing; do not add the §12 font-size/line-height); (c) replace `*:focus-visible { outline: none; }` with `:focus-visible { outline: 2px solid rgb(var(--accent-fg)); outline-offset: 2px; }`; (d) add `html[data-theme-switching] *, html[data-theme-switching] *::before, html[data-theme-switching] *::after { transition: none !important; }`; (e) keep the reduced-motion block; (f) temporarily keep `.glass`, `.glass-strong`, `.text-muted` but rewrite them to use tokens (`rgb(var(--surface-2))`, `rgb(var(--line))`, `var(--shadow-raised)`; `rgb(var(--surface-1))`, `var(--shadow-pop)`; `rgb(var(--fg-muted))`). Then run `node client/scripts/check-contrast.mjs` — must exit 0.
- [X] T004 [P] Rewrite `client/tailwind.config.js` colors per research R2/R3: add `const rgb = (v) => \`rgb(var(${v}) / <alpha-value>)\`;`; define DESIGN.md §12 colors `bg`, `surface.{1,2,3}`, `line.{DEFAULT,strong}`, `fg.{DEFAULT,muted,subtle,'on-accent'}`, `accent.{DEFAULT,fg}`, `secure`, `success`, `warning`, `danger.{DEFAULT,solid}`, plus `overlay: 'rgb(var(--overlay) / var(--overlay-a))'`; `boxShadow` `raised: 'var(--shadow-raised)'`, `pop: 'var(--shadow-pop)'`. Add **temporary legacy aliases** (comment `// LEGACY — removed in T030`): colors `base: rgb('--bg')`, `sidebar: rgb('--surface-1')`, `card: rgb('--surface-2')`, `'card-hover': rgb('--surface-3')`, `ink: rgb('--fg')`, `violet: { glow: rgb('--accent-fg') }`, `cyan: { glow: rgb('--secure') }`; boxShadow `card: 'var(--shadow-raised)'`, `'glow-violet': '0 0 0 1px rgb(var(--accent-fg) / 0.35)'`, `'glow-cyan': '0 0 0 1px rgb(var(--accent-fg) / 0.35)'`. Keep `fontFamily`, `borderRadius.glass`, `keyframes`, `animation` unchanged. Do not add DESIGN.md font sizes/heights/spacing (out of scope).
- [X] T005 [P] Create `client/public/theme-init.js` per contracts/theme-runtime.md §2: a plain IIFE (no modules) that, inside try/catch, reads `localStorage.getItem('lockly.theme')`; if `'light'` or `'dark'` use it, else use `window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'`; on any exception use `'dark'`; set `document.documentElement.setAttribute('data-theme', t)`; set the `meta[name="theme-color"]` content to `#F5F6FA` (light) or `#0B0D17` (dark) if the element exists. Keep under ~25 lines with a header comment explaining why it is not inline (server CSP `script-src 'self'`).
- [X] T006 [P] Edit `client/index.html` `<head>`: change viewport to `width=device-width, initial-scale=1.0, viewport-fit=cover`; add `<meta name="theme-color" content="#0B0D17" />`; add `<script src="/theme-init.js"></script>` (no `type`, `defer`, or `async`) immediately after the theme-color meta and **before** the font `<link>`s. Leave the module script in `<body>` unchanged.
- [X] T007 [P] Create `client/src/theme/systemBars.ts` per contracts/system-bars-plugin.md "JS interface": `import { Capacitor, registerPlugin } from '@capacitor/core'`; export `SystemBarsTheme` type; `const Native = registerPlugin<SystemBarsPlugin>('SystemBars')`; export `systemBars.setTheme(opts)` that returns immediately when `Capacitor.getPlatform() !== 'android'`, otherwise `await Native.setTheme(opts)` inside try/catch that swallows errors.
- [X] T008 Create `client/src/theme/ThemeProvider.tsx` per contracts/theme-runtime.md §4 and research R6/R8: export `ThemePreference`, `ResolvedTheme`, `ThemeContextValue`, `THEME_STORAGE_KEY = 'lockly.theme'`, `THEME_BG = { light: '#F5F6FA', dark: '#0B0D17' } as const`, `ThemeProvider`, `useTheme` (throws outside provider). Behavior: initial `theme` from guarded `localStorage` read (invalid ⇒ `'system'`); initial `resolved` from `document.documentElement.dataset.theme` (fallback compute); `useEffect` subscribes to `matchMedia('(prefers-color-scheme: light)')` `change` only while `theme === 'system'` (use `addEventListener`, fallback `addListener`); an `apply(resolved)` helper sets `data-theme-switching` on `<html>`, sets `data-theme`, updates `meta[name="theme-color"]` to `THEME_BG[resolved]`, calls `systemBars.setTheme({ resolved, background: THEME_BG[resolved] })`, and removes `data-theme-switching` in a `requestAnimationFrame` (double rAF); `setTheme(next)` updates state, writes storage in try/catch, and applies synchronously. Call `systemBars.setTheme` once on mount. Memoize the context value. Never unmount children.
- [X] T009 Edit `client/src/main.tsx`: import `ThemeProvider` from `./theme/ThemeProvider` and make it the outermost provider inside `<React.StrictMode>` (wrapping `QueryClientProvider`), so Server setup, Auth, and Unlock screens are covered.
- [X] T010 Foundation check: run `node client/scripts/check-contrast.mjs` (exit 0) and `npm run build --workspace client` (no errors). Start `npm run dev`, open http://localhost:5173: dark theme looks as before; in the console run `document.documentElement.dataset.theme='light'` and confirm surfaces/text switch without errors; confirm no console errors from `theme-init.js`.

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 - App follows my device's appearance (Priority: P1) 🎯 MVP

**Goal**: Every screen renders correctly in Light and Dark and follows the device appearance by default.

**Independent Test**: With no saved preference, emulate `prefers-color-scheme: light` and visit Server setup, Auth, Unlock, Vault, Files, Settings — all light; switch emulation to dark — all dark, live, without losing state (quickstart W1–W3, W13).

### Implementation for User Story 1

Each task below: migrate every color class/literal in the named file using the **Token migration map** above; do not change behavior, layout, or copy; run no formatting on untouched lines.

- [X] T011 [P] [US1] Update `client/src/components/AuroraBackground.tsx`: `const { resolved } = useTheme()`; when `resolved === 'light'` return `<div className="fixed inset-0 -z-10 bg-bg" />` (flat canvas); in dark replace `bg-base` → `bg-bg` and inline `rgba(...)` gradients with token-based equivalents (`rgb(var(--accent-fg) / 0.10)`, `rgb(var(--secure) / 0.07)`, `rgb(var(--accent-fg) / 0.04)`, and `transparent` for the 0-alpha stops).
- [X] T012 [P] [US1] Migrate colors in `client/src/components/ui/GlassCard.tsx` (`glass`, `glass-strong` → map; keep `rounded-glass`).
- [X] T013 [P] [US1] Migrate colors in `client/src/components/ui/GlassButton.tsx` (primary gradient + `text-[#1a1035]` → `bg-accent text-fg-on-accent hover:bg-accent/90`; `shadow-glow-violet` → `shadow-raised`; `glass` → map; `hover:bg-white/10` → `hover:bg-surface-3`; `ring-cyan-glow` → `ring-accent-fg`).
- [X] T014 [P] [US1] Migrate colors in `client/src/components/ui/GlassInput.tsx` (input chrome, placeholder, focus border, remove `shadow-glow-cyan`, `text-muted`, `text-ink`).
- [X] T015 [P] [US1] Migrate colors in `client/src/components/ui/GlassModal.tsx` (`bg-black/50` → `bg-overlay`, `glass-strong`, `hover:bg-white/10`, `text-muted`, `hover:text-ink`).
- [X] T016 [P] [US1] Migrate colors in `client/src/components/ui/ConfirmModal.tsx` (destructive button → `bg-danger-solid … text-fg-on-accent`; `text-red-400`, `bg-red-400/[0.08]`, `border-red-400/25`, `ring-red-400` → danger tokens; `ring-cyan-glow` → `ring-accent-fg`; white-alpha hovers → `hover:bg-surface-3`; `bg-white/[0.04]` → `bg-fg/[0.03]`).
- [X] T017 [P] [US1] Migrate colors in `client/src/components/ui/Toast.tsx` (`glass`/`glass-strong`, `text-emerald-200` → `text-success`, `text-red-200` → `text-danger`, `text-ink`).
- [X] T018 [P] [US1] Migrate colors in `client/src/components/AppShell.tsx` only (sidebar/mobile nav surfaces, nav active/hover states, avatar chip, footer buttons). Do not add the theme control yet (T033).
- [X] T019 [P] [US1] Migrate colors in `client/src/components/ItemModal.tsx` (inputs ×2, placeholders, focus, gradient save button `#1a1035`, `shadow-glow-cyan`, `glass`, `text-red-300`/`hover:text-red-200` → danger).
- [X] T020 [P] [US1] Migrate colors in `client/src/components/PasswordGenerator.tsx` (`accent-cyan-glow` → `accent-accent`, `bg-white/5 border-white/10` → input chrome, `text-muted`).
- [X] T021 [P] [US1] Update `client/src/components/StrengthMeter.tsx`: track `bg-white/10` → `bg-surface-3`; replace the violet→cyan gradient fill with a score-based token per DESIGN.md §3.3 (score 0–1 `bg-danger`, 2 `bg-warning`, 3–4 `bg-success`) using the component's existing score value; `text-muted` → `text-fg-muted`.
- [X] T022 [P] [US1] Migrate colors in `client/src/components/FilePreview.tsx` (surfaces, 13 `border-line`, `ring-cyan-glow/40|50` → `ring-accent-fg/…`, `hover:text-cyan-glow` → `hover:text-accent-fg`, `bg-black/50|70` and `hover:bg-black/70` → overlay, `bg-violet-glow/[0.15]` → `bg-accent/10`, `bg-cyan-glow` + `#0B0D17` + `#7cebff` → secure/bg/`hover:bg-secure/90`, white-alpha tints per map). **Keep** `bg-white` that sits behind rendered document content; add a short comment there noting it is intentional.
- [X] T023 [P] [US1] Migrate colors in `client/src/pages/FilesPage.tsx` (largest file: surfaces, text, `ring-cyan-glow/*` focus → `ring-accent-fg/*`, encryption/upload progress and badges → `secure`, drag-over/selected → `accent-fg`/`accent/10`, `ring-danger/40`, `hover:bg-danger/10`, `hover:text-danger`, `text-red-400` → `text-danger`, `hover:bg-card-hover` → `hover:bg-surface-3`, `#0B0D17`/`#7cebff` per map, all `bg-white/[…]` tints per map).
- [X] T024 [P] [US1] Migrate colors in `client/src/pages/VaultPage.tsx` (search input chrome, placeholder, focus, gradient button `from-violet-glow/80 to-cyan-glow/80` + `#1a1035`, `shadow-glow-violet`, `glass`, `bg-white/10` chips, `text-muted`, `text-ink`).
- [X] T025 [P] [US1] Migrate colors in `client/src/pages/UnlockPage.tsx` (gradient unlock button + `#1a1035`, `shadow-glow-cyan` → `shadow-raised`, `text-muted`, `hover:text-ink`).
- [X] T026 [P] [US1] Migrate colors in `client/src/pages/AuthPage.tsx` (`text-muted`, `hover:text-ink`).
- [X] T027 [P] [US1] Migrate colors in `client/src/App.tsx` (`text-muted`).
- [X] T028 [P] [US1] Migrate colors in `client/src/pages/ServerSetupPage.tsx` (amber warning box → warning tokens, `text-rose-300` → `text-danger`, `text-muted`, `text-ink`).
- [X] T029 [P] [US1] Migrate colors in `client/src/pages/SettingsPage.tsx` only (amber warning box → warning tokens, `text-muted`). Do not add the Appearance section yet (T034).
- [X] T030 [US1] Remove legacy aliases (depends on T011–T029): delete the `// LEGACY` colors and boxShadows from `client/tailwind.config.js` and the `.glass`, `.glass-strong`, `.text-muted` rules from `client/src/index.css`. Run the token-hygiene grep from quickstart.md §1; the only allowed hits are `components/ui/Logo.tsx` hex and the commented `bg-white` in `FilePreview.tsx`. Fix any remaining hits in their files. Run `npm run build --workspace client` — must pass (Tailwind silently drops unknown classes, so also re-grep for `base|sidebar|card-hover|\bink\b|violet-glow|cyan-glow|glass\b|text-muted` in `client/src`).
- [X] T031 [US1] Validate US1 per `specs/001-light-theme/quickstart.md` scenarios W1, W2, W3, W8, W13 in `npm run dev` with DevTools `prefers-color-scheme` emulation, on all six screens in both themes; fix visual defects (unreadable text, invisible borders, dark-only artifacts) in the owning file.

**Checkpoint**: User Story 1 is fully functional and testable independently (MVP)

---

## Phase 4: User Story 2 - Choose my theme explicitly (Priority: P2)

**Goal**: System / Light / Dark selectable in Settings and from a compact control in the sidebar footer and phone top bar.

**Independent Test**: Choose Light in Settings while device is dark — app turns light immediately; choose Dark from the sidebar control — app turns dark and Settings reflects it; device changes are ignored while explicit (quickstart W4, W5, W10–W12).

### Implementation for User Story 2

- [X] T032 [P] [US2] Create `client/src/components/ui/ThemeToggle.tsx` per contracts/theme-runtime.md §5 and research R9: props `{ variant?: 'compact' | 'labeled'; className?: string }`; uses `useTheme()`; options `[{ value: 'system', label: 'System', icon: Monitor }, { value: 'light', label: 'Light', icon: Sun }, { value: 'dark', label: 'Dark', icon: Moon }]` from `lucide-react`; container `role="radiogroup" aria-label="Theme"` styled as a segmented control (`inline-flex rounded-lg border border-line bg-surface-2 p-0.5`); each option a `<button type="button" role="radio" aria-checked>` with roving `tabIndex` (0 on checked, −1 otherwise), `ArrowLeft/ArrowUp` and `ArrowRight/ArrowDown` move + select (wrap), `Home/End` jump; checked style `bg-accent/10 text-accent-fg`, unchecked `text-fg-muted hover:text-fg hover:bg-surface-3`; `compact` = icon-only with `aria-label={label}` and `title={label}`, size `h-8 w-8` with `max-md:h-11 max-md:w-11` for 44 px phone targets; `labeled` = icon + visible text, `h-9 px-3`. Use `cn` from `./cn`.
- [X] T033 [US2] Edit `client/src/components/AppShell.tsx` (depends on T018, T032): in the sidebar footer `div.mt-4.border-t` insert `<ThemeToggle variant="compact" className="mx-2 mb-2" />` above the user row; in the mobile top bar replace the lone lock button wrapper with a `flex items-center gap-2` containing `<ThemeToggle variant="compact" />` and the lock button; give the icon-only mobile lock button `aria-label="Lock vault"`.
- [X] T034 [P] [US2] Edit `client/src/pages/SettingsPage.tsx` (depends on T029, T032): add a first `GlassCard` with `className="mb-4"` containing `<h2 className="mb-1 font-semibold">Appearance</h2>`, a `text-sm text-fg-muted` line "Choose how Lockly looks. System follows your device setting.", and `<ThemeToggle variant="labeled" className="mt-3" />`.
- [X] T035 [US2] Validate US2 per quickstart.md W4, W5, W10 (keyboard walkthrough incl. arrow keys and visible focus ring in both themes), W11 (reduced motion), W12 (375 px phone layout, ≤ 2 taps, 44 px targets); fix defects in T032–T034 files.

**Checkpoint**: User Stories 1 and 2 both work independently

---

## Phase 5: User Story 3 - My choice sticks, with no flash (Priority: P2)

**Goal**: Saved choice survives reload, lock, sign-out, restart; first painted frame is already correct, including in the CSP-protected production build.

**Independent Test**: Choose Light on a dark device, reload/lock/sign out — always light with no dark frame (quickstart W6, W7, W9, production CSP check).

### Implementation for User Story 3

- [X] T036 [US3] Audit `client/src/auth/AuthProvider.tsx`, `client/src/lib/api.ts`, and `client/src/lib/config.ts` for `localStorage.clear()`, `sessionStorage`/`localStorage` removal loops, or `removeItem` calls on sign-out, lock, or server change; if any would remove `lockly.theme`, change them to remove only their own keys. Confirm `ThemeProvider` wraps the Server setup, Auth, and Unlock routes (T009). Record findings (even "none found") in the task's commit message.
- [X] T037 [US3] Validate production behavior: `npm run build` then `npm start`; open http://localhost:4000 and run quickstart.md W6, W7 (20 reloads with CPU throttling and Performance screenshots, choice ≠ device), W9 (storage blocked), and confirm the DevTools console shows **no** Content-Security-Policy violation for `/theme-init.js`. If a flash is observed, fix ordering in `client/index.html` or `client/public/theme-init.js`.

**Checkpoint**: User Stories 1–3 work independently

---

## Phase 6: User Story 4 - Android app matches, including system bars (Priority: P3)

**Goal**: Same behavior on Android; status bar color and icon contrast follow the theme at launch and on change, with no wrong-color cold start.

**Independent Test**: On an Android build, cycle System/Light/Dark and toggle device night mode — app and status bar match every time, including cold start (quickstart A1–A6).

### Implementation for User Story 4

- [X] T038 [P] [US4] Add night-aware background color resources: create or extend `client/android/app/src/main/res/values/colors.xml` with `<color name="lockly_bg">#F5F6FA</color>` (preserve any existing entries, e.g. `colorPrimary`, `colorPrimaryDark`, `colorAccent`), and create `client/android/app/src/main/res/values-night/colors.xml` with `<color name="lockly_bg">#0B0D17</color>`.
- [X] T039 [US4] Edit `client/android/app/src/main/res/values/styles.xml` (depends on T038): in `AppTheme.NoActionBar` add `<item name="android:windowBackground">@color/lockly_bg</item>`; leave `AppTheme.NoActionBarLaunch` (splash) unchanged.
- [X] T040 [P] [US4] Create `client/android/app/src/main/java/com/hamdydraw/lockly/SystemBarsPlugin.java` per contracts/system-bars-plugin.md: `@CapacitorPlugin(name = "SystemBars")` extending `Plugin`; `@PluginMethod public void setTheme(PluginCall call)` validating `resolved` (`light|dark`) and `background` (`Color.parseColor` in try/catch) with the specified reject messages; on `getActivity().runOnUiThread` call a `public static void apply(Activity activity, WebView webView, boolean light, int color)` helper that sets `window.getDecorView().setBackgroundColor(color)`, `webView.setBackgroundColor(color)` when non-null, `WindowCompat.getInsetsController(window, decorView).setAppearanceLightStatusBars(light)` and `setAppearanceLightNavigationBars(light)`, and when `Build.VERSION.SDK_INT < 35` `window.setStatusBarColor(color)` / `window.setNavigationBarColor(color)`; persist `resolved` via `getContext().getSharedPreferences("lockly", Context.MODE_PRIVATE)` key `lockly.theme.resolved`; `call.resolve()`. Also expose `public static final String PREFS = "lockly"` and `KEY_RESOLVED`.
- [X] T041 [US4] Edit `client/android/app/src/main/java/com/hamdydraw/lockly/MainActivity.java` (depends on T040): override `onCreate(Bundle)`; call `registerPlugin(SystemBarsPlugin.class)` **before** `super.onCreate(savedInstanceState)`; after it, read `lockly.theme.resolved` from `SharedPreferences("lockly")`; if present, call `SystemBarsPlugin.apply(this, getBridge().getWebView(), "light".equals(v), Color.parseColor("light".equals(v) ? "#F5F6FA" : "#0B0D17"))`; otherwise derive `light` from `(getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) != Configuration.UI_MODE_NIGHT_YES` and apply with the matching color.
- [X] T042 [P] [US4] Edit `client/capacitor.config.ts`: remove the top-level `backgroundColor: '#0B0D17'` (the native side now sets window/WebView background, research R5). Keep all other options and comments.
- [ ] T043 [US4] Build and validate on Android: `npm run android:install`; run quickstart.md A1–A6 on an API 29–34 device/emulator and an API 35 emulator (use `adb shell cmd uimode night yes|no`, force-stop cold starts ×20 with `adb shell screenrecord`); also repeat W4, W6, W10–W13 inside the app. Fix defects in T038–T042 files.

**Checkpoint**: All user stories independently functional on web and Android

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation and final gates

- [X] T044 [P] Update `DESIGN.md`: in §2 note that the pre-paint script is `client/public/theme-init.js` (not inline) and that Android status bar color is set by the in-repo `SystemBars` plugin because `theme-color` does not affect the Capacitor window; in §12 replace the inline `<script>` snippet with the `<script src="/theme-init.js">` form and add `--fg-on-accent`; in §13 mark the `index.css`/`tailwind.config.js`/`index.html`, `theme/ThemeProvider.tsx`, `AuroraBackground.tsx`, and theme parts of `AppShell.tsx`/`SettingsPage.tsx` rows as done for 001-light-theme.
- [X] T045 Run full static gates and accessibility pass: `npm run build`, `node client/scripts/check-contrast.mjs`, the token-hygiene grep (quickstart.md §1), then tick DESIGN.md §11 items relevant to theming (focus ring, contrast, icon-only aria-labels on theme/lock controls, radiogroup state, reduced motion, both themes on Vault, Files, Settings, Auth, Unlock, Server setup). Note any pre-existing §11 gaps unrelated to theming as follow-ups rather than fixing them here.
- [X] T046 Constitution gates: run `npm test` (server suite passes) and `git diff --stat main -- server/` (must be empty — FR-016, Principles III & IV); confirm `git diff main -- package.json client/package.json server/package.json package-lock.json` adds no dependencies (Principle IV).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: depends on Setup — BLOCKS all user stories
- **US1 (Phase 3)**: depends on Foundational
- **US2 (Phase 4)**: depends on Foundational; T033 depends on T018 and T034 depends on T029 (same files as US1 migration)
- **US3 (Phase 5)**: depends on Foundational; best validated after US1 + US2 so choices can be set via UI (can use `localStorage.setItem('lockly.theme', …)` otherwise)
- **US4 (Phase 6)**: depends on Foundational (T007/T008 JS bridge); native tasks are independent of US1–US3; T043 validation is most meaningful after US1 + US2
- **Polish (Phase 7)**: depends on all stories

### Task-level dependencies

- T003 → T010; T004, T005, T006, T007 in parallel with T003; T008 depends on T007; T009 depends on T008; T010 depends on T003–T009
- T011 depends on T008 (uses `useTheme`); T012–T029 depend only on T003/T004
- T030 depends on T011–T029; T031 depends on T030
- T032 depends on T008; T033 depends on T018 + T032; T034 depends on T029 + T032; T035 depends on T033 + T034
- T039 depends on T038; T041 depends on T040; T043 depends on T038–T042

### User Story Dependencies

- **US1 (P1)**: independent after Foundational
- **US2 (P2)**: independent feature-wise; shares files with US1 (sequence T018→T033, T029→T034)
- **US3 (P2)**: independent; verification uses US2 controls if present
- **US4 (P3)**: independent; verification uses US2 controls if present

---

## Parallel Examples

### Phase 2

```text
Task: "T004 Rewrite client/tailwind.config.js colors with tokens + legacy aliases"
Task: "T005 Create client/public/theme-init.js"
Task: "T006 Edit client/index.html head"
Task: "T007 Create client/src/theme/systemBars.ts"
```

### User Story 1 (after Foundational)

```text
Task: "T012 Migrate client/src/components/ui/GlassCard.tsx"
Task: "T013 Migrate client/src/components/ui/GlassButton.tsx"
Task: "T014 Migrate client/src/components/ui/GlassInput.tsx"
Task: "T015 Migrate client/src/components/ui/GlassModal.tsx"
Task: "T016 Migrate client/src/components/ui/ConfirmModal.tsx"
Task: "T017 Migrate client/src/components/ui/Toast.tsx"
Task: "T022 Migrate client/src/components/FilePreview.tsx"
Task: "T023 Migrate client/src/pages/FilesPage.tsx"
Task: "T024 Migrate client/src/pages/VaultPage.tsx"
# …T011, T018–T021, T025–T029 likewise — all different files
```

### User Story 4

```text
Task: "T038 Add values/ and values-night/ colors.xml"
Task: "T040 Create SystemBarsPlugin.java"
Task: "T042 Remove backgroundColor from client/capacitor.config.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 Setup → Phase 2 Foundational
2. Phase 3 US1 → **STOP and VALIDATE** (T031): light/dark follow the device on all screens
3. Shippable: users on light-mode devices get light mode with zero configuration

### Incremental Delivery

1. Setup + Foundational → dark unchanged, token system in place
2. + US1 → device-following themes (MVP)
3. + US2 → explicit choice controls
4. + US3 → persistence/no-flash hardening verified in production build
5. + US4 → Android status bar parity
6. Polish → docs + constitution gates

### Suggested commits

One commit per phase (or per checkpoint), e.g. `feat(theme): token system and ThemeProvider (T001–T010)`.

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- Tailwind drops unknown class names silently — always grep after renames (T030)
- Keep `rounded-glass`, animation classes, and component names (`Glass*`) — renames are out of scope
- Do not modify anything under `server/`
