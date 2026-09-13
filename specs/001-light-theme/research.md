# Research: Light Theme

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Date**: 2026-09-13

All Technical Context unknowns are resolved below. No `NEEDS CLARIFICATION` remains.

---

## R1. Pre-paint theme script under the production CSP

**Decision**: Ship the resolver as a static file `client/public/theme-init.js`, loaded with a
plain, synchronous (non-`module`, non-`defer`) `<script src="/theme-init.js">` placed in `<head>`
before the stylesheet/app module in `client/index.html`.

**Rationale**: The server's Helmet CSP sets `script-src 'self'` (`server/src/index.ts`), so an
inline `<script>` — as literally requested — would be blocked in production and the page would
flash. A same-origin file satisfies `'self'`, runs synchronously before first paint, and is
copied by Vite to `dist/` unchanged, so it works for the Express-served build and the Capacitor
bundle alike. DESIGN.md §12 already calls for this. No server change (FR-016).

**Alternatives considered**:
- Inline script + CSP hash/nonce: requires editing the server CSP — violates "no server changes".
- Resolve theme inside React only: first paint happens before React mounts → visible flash (FR-007).
- `media`-query-only CSS (no JS): cannot honor an explicit saved choice before paint.

---

## R2. Token architecture

**Decision**: Implement DESIGN.md §12 as written: RGB-channel custom properties on
`:root, html[data-theme='dark']` and `html[data-theme='light']`, `color-scheme` per theme,
shadows as full-value variables, and Tailwind colors defined as
`rgb(var(--token) / <alpha-value>)`. Token values come verbatim from DESIGN.md §3.

**Rationale**: Channels keep Tailwind opacity modifiers (`bg-accent/10`) working; a single
attribute switch re-themes the whole app without re-rendering React; `:root` defaulting to dark
means a missing attribute still renders the current look.

**Alternatives considered**:
- Tailwind `darkMode: 'class'` with `dark:` variants: doubles class strings in every JSX file and
  DESIGN.md explicitly forbids `dark:` prefixes.
- CSS-in-JS theme object: new dependency or large refactor; conflicts with Tailwind usage.

---

## R3. Migrating ~20 files of hard-coded colors safely

**Decision**: Two steps.
1. Add the DESIGN.md token colors **and** temporary legacy aliases in `tailwind.config.js` that
   point the existing names at tokens: `base→--bg`, `sidebar→--surface-1`, `card→--surface-2`,
   `card-hover→--surface-3`, `line→--line`, `ink→--fg`, `violet.glow→--accent-fg`,
   `cyan.glow→--secure`, `danger→--danger`; point `.glass`, `.glass-strong`, `.text-muted` at
   tokens in `index.css`.
2. Per file, replace what aliases cannot fix — `bg-white/[.04]`/`bg-white/10` hover tints →
   `bg-surface-3` or `bg-fg/5`; `bg-black/50|70` scrims → `bg-[rgb(var(--overlay)/var(--overlay-a))]`
   via an `overlay` utility; raw hex and inline `rgba()` → tokens — then rename usages to the
   DESIGN.md names and delete the aliases in the final migration task.

**Rationale**: Step 1 makes the app largely themeable immediately with a tiny diff and zero
visual change in dark; step 2 can proceed file-by-file with each screen verifiable in isolation.
Component *renames* (Glass* → Button, etc.) are out of scope (spec Assumptions).

**Alternatives considered**:
- Big-bang rename across all files: large risky diff, hard to review.
- Keep aliases permanently: two vocabularies for the same colors; contradicts DESIGN.md.

---

## R4. Android status bar color without new dependencies

**Decision**: Add an in-repo Capacitor plugin `SystemBarsPlugin.java` (registered in
`MainActivity` via `registerPlugin`) exposing `setTheme({ resolved, background })`. It uses
`androidx.core` (`WindowCompat.getInsetsController(...).setAppearanceLightStatusBars` /
`setAppearanceLightNavigationBars`), sets `window.statusBarColor` on API < 35, sets the window and
WebView background color, and saves `resolved` to `SharedPreferences`. The JS side calls it via
`registerPlugin('SystemBars')` from `@capacitor/core` and is a no-op on web.

**Rationale**: `<meta name="theme-color">` is honored by browser UI (Chrome address bar, PWA) but
not by the Capacitor WebView's host window, so it cannot color the Android status bar.
`@capacitor/status-bar` would be a new npm dependency (constitution IV). A local plugin is ~60
lines, uses libraries already on the classpath (`androidx.core 1.15` via Capacitor), and keeps
icon contrast correct. On Android 15+ (targetSdk 35 enforces edge-to-edge) `statusBarColor` is
ignored and the area shows the window/WebView background — which the plugin also sets — so the
visible result matches the theme on all API levels.

**Alternatives considered**:
- `@capacitor/status-bar`: official and simple, but a new dependency; rejected per user input and IV.
- `theme-color` meta only: no effect on the native status bar.
- Changing `android.adjustMarginsForEdgeToEdge`: alters existing layout/insets behavior; out of scope.
  Current value (`disable`, default) is left unchanged.

---

## R5. No flash on Android cold start

**Decision**: (a) Remove the hard-coded `backgroundColor: '#0B0D17'` from `capacitor.config.ts`;
(b) define `@color/lockly_bg` in `res/values` (light `#F5F6FA`) and `res/values-night` (dark
`#0B0D17`) and use it as the activity window background, so first-ever launch follows the device;
(c) in `MainActivity.onCreate` (after `super.onCreate`), read `lockly.theme.resolved` from
`SharedPreferences` and, if present, apply that background + bar appearance to the window and
WebView before the page loads; (d) `theme-init.js` then sets `data-theme` before first web paint.

**Rationale**: The native window and WebView paint before any JavaScript runs. Without (c), a user
who explicitly chose Light on a dark-mode phone would see a dark frame at launch (SC-003). The
native side only needs the last *resolved* theme, which the plugin stores on every change.

**Alternatives considered**:
- Keep splash screen visible until JS signals ready: delays launch and still needs native colors.
- Read `localStorage` natively: WebView storage is not reliably accessible from Java before load.

---

## R6. ThemeProvider behavior

**Decision**: `client/src/theme/ThemeProvider.tsx` provides `{ theme, resolved, setTheme }`.
Initial `theme` reads `localStorage` (guarded by try/catch, invalid → `system`); initial
`resolved` reads the `data-theme` attribute already set by `theme-init.js` so React agrees with
the first paint. A `matchMedia('(prefers-color-scheme: light)')` `change` listener is active
while `theme === 'system'`. On every resolved change it sets `data-theme`, updates
`<meta name="theme-color">` to the `bg` token hex, and calls `systemBars.setTheme`. It is mounted
at the root (`main.tsx`) above `AuthProvider`, so Server setup/Auth/Unlock screens are themed.

**Rationale**: Single owner for side effects; storage failures degrade to session-only (spec edge
case); attribute switching avoids re-mounting pages, preserving dialogs and form state (FR-005).

**Alternatives considered**:
- Store in AuthProvider/account: would need an API change and ties theme to sign-in.
- `useSyncExternalStore` over `localStorage` events for cross-tab sync: not required by the spec;
  can be added later without contract changes.

---

## R7. Fallback when device reports no preference

**Decision**: `prefers-color-scheme: light` → Light; anything else (dark or no preference) → Dark.

**Rationale**: Matches spec Assumptions and DESIGN.md §12 snippet; preserves today's appearance for
users on older devices.

---

## R8. Theme switch transitions and reduced motion

**Decision**: On `setTheme`, add `data-theme-switching` to `<html>` for one animation frame with
`[data-theme-switching] * { transition: none !important }`, so the change is instant everywhere.
The existing global `prefers-reduced-motion` rule remains; the Aurora drift is not rendered in
light and is already disabled under reduced motion.

**Rationale**: Many components have `transition-colors`; without suppression the switch produces a
150 ms staggered cross-fade that looks glitchy and ignores FR-015 for users who opted out of
motion. Suppressing for all users is simpler and matches "quiet motion" in DESIGN.md §1.

---

## R9. Control placement and accessibility

**Decision**: One `ThemeToggle` component with two variants:
- `compact`: three 32 px icon buttons (Monitor/Sun/Moon from lucide-react) in a `role="radiogroup"`
  with `aria-label="Theme"`, each `role="radio"` + `aria-checked` + `aria-label`; arrow keys move
  selection. Used in the sidebar footer (above Lock/Sign out) and in the phone top bar next to the
  lock button, where hit areas expand to 44 px.
- `labeled`: same radiogroup with visible "System / Light / Dark" text, in a new first
  "Appearance" card on `SettingsPage`.

**Rationale**: All three options reachable in one interaction from any signed-in screen (SC-004);
meets DESIGN.md §11 (radiogroup semantics, aria-labels, focus ring, 44 px touch targets). Phone
has no sidebar footer today, so the top bar is the nearest equivalent (spec Assumptions).

**Alternatives considered**:
- Cycling single icon button: hides current option set, 1–2 extra taps to reach a value, weaker
  semantics.
- Dropdown menu: needs a Menu component that doesn't exist yet (part of the out-of-scope §13 work).

---

## R10. Verifying contrast (SC-002) without new dependencies

**Decision**: `client/scripts/check-contrast.mjs` (plain Node, no imports beyond `node:fs`) parses
the two token blocks from `client/src/index.css`, computes WCAG 2.x relative-luminance contrast for
the pairs listed in DESIGN.md §3 (fg/fg-muted on surface-1/2/3 and bg; accent-fg, secure, success,
warning, danger on surface-2; white on accent and danger-solid), and exits non-zero if any pair
falls below its threshold. `fg-subtle` is checked against 3:1 (placeholder/decorative use only per
DESIGN.md §3.2).

**Rationale**: Guards against token drift, runs anywhere Node runs, respects constitution IV.

**Alternatives considered**: axe/Lighthouse packages — new dependencies; manual browser DevTools
checks — kept as a supplementary step in quickstart but not repeatable.
