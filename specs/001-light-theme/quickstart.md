# Quickstart & Validation: Light Theme

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

Runnable checks that prove the feature meets the spec. Contract details:
[contracts/theme-runtime.md](contracts/theme-runtime.md),
[contracts/system-bars-plugin.md](contracts/system-bars-plugin.md).

## Prerequisites

- Node ≥ 20.19, `npm install` at repo root, `server/.env` created per README.
- For Android: Android SDK + a device or emulator (API 29+ and one API 35 image recommended), `adb`
  on PATH.

## 1. Static checks

```bash
npm run build
```
Expected: server and client build with no TypeScript errors.

```bash
node client/scripts/check-contrast.mjs
```
Expected: every DESIGN.md §3 pair passes in both themes; exit code 0 (SC-002).

```bash
npm test
```
Expected: server tests still pass (no server changes).

Token hygiene (after migration is complete) — expect no themed-UI literals outside the documented
exceptions (Logo gradient, FilePreview content):

```bash
grep -rnE "#[0-9A-Fa-f]{6}\b|rgba?\(|\b(bg|text|border)-(white|black)\b|\b(base|sidebar|card|ink|violet-glow|cyan-glow)\b" client/src --include=*.tsx
```

## 2. Web — development

```bash
npm run dev
```
Open http://localhost:5173.

| # | Scenario | Steps | Expected | Spec |
|---|---|---|---|---|
| W1 | System follows device | Clear site data. In DevTools → Rendering, emulate `prefers-color-scheme: light`, reload. Visit Server setup/Auth/Unlock/Vault/Files/Settings. | All screens light; Aurora not shown | US1, FR-003, FR-008 |
| W2 | Live device change | With System selected, toggle emulation to dark and back. | App switches within 1 s; open dialog/typed text preserved | US1-3, SC-005, FR-005 |
| W3 | No preference | Emulate `no-preference`. Reload. | Dark | US1-4 |
| W4 | Explicit choice | Settings → Appearance → Light while emulating dark. Then use sidebar control → Dark. | Theme switches instantly; both controls show same selection | US2, FR-004 |
| W5 | Explicit ignores device | With Dark chosen, emulate light. | Stays dark | US2-3 |
| W6 | Persistence | Choose Light, reload, lock vault, sign out. | Light on every screen including Unlock/Auth | US3, SC-007 |
| W7 | No flash | Choose Light while emulating dark; DevTools → Performance, record reload with screenshots (CPU 6× slowdown). Repeat 20×. | No frame shows dark UI | FR-007, SC-003 |
| W8 | Bad storage value | In console: `localStorage.setItem('lockly.theme','purple')`; reload. | Treated as System, no error | Edge case |
| W9 | Storage blocked | Open in a private window with site data blocked; change theme. | Theme changes for session; no errors | Edge case |
| W10 | Keyboard & a11y | Keyboard-only walkthrough from DESIGN.md §11 in each theme; use arrows in ThemeToggle. | Focus ring visible every step; radiogroup announces options + checked state | FR-010, FR-011, SC-006 |
| W11 | Reduced motion | Emulate `prefers-reduced-motion: reduce`; switch themes. | Instant switch, no animation | FR-015 |
| W12 | Phone layout | Device toolbar at 375 px wide; use top-bar control. | All 3 options reachable in ≤ 2 taps; targets ≥ 44 px | FR-004, SC-004 |
| W13 | Files surfaces | In light theme open file preview (image/PDF/text), upload progress, folder dialog, delete confirmation. | Chrome themed; file content not recolored | FR-008, edge case |

## 3. Web — production build (CSP)

```bash
npm run build
```
```bash
npm start
```
Open http://localhost:4000, repeat W1, W6, W7.
Expected: DevTools console shows **no** CSP violation for `theme-init.js`; theme applies before
first paint.

## 4. Android

```bash
npm run android:install
```

| # | Scenario | Steps | Expected | Spec |
|---|---|---|---|---|
| A1 | System + status bar | `adb shell cmd uimode night no`, launch app. Then `adb shell cmd uimode night yes`. | Light app with light status bar + dark icons; then dark app with dark bar + light icons | US4-1/2, FR-013 |
| A2 | Explicit choice | Settings → Light while device night mode is on. | App and status bar turn light together | US4-3 |
| A3 | Cold start no flash | With Light chosen and night mode on: `adb shell am force-stop com.hamdydraw.lockly`, relaunch; screen-record with `adb shell screenrecord /sdcard/l.mp4`. Repeat 20×. | No dark frame in window, WebView, or status bar | FR-007, SC-003 |
| A4 | Persistence | Lock, sign out, reboot device; reopen. | Chosen theme kept | SC-007 |
| A5 | Parity | Repeat W4, W6, W10–W13 in the app. | Same behavior as web | FR-014, SC-001 |
| A6 | API 35 edge-to-edge | Run A1–A3 on an API 35 emulator. | Status bar area matches theme; icons legible | FR-013 |

## 5. Done when

- All checks in §1 pass.
- W1–W13, production CSP check, and A1–A6 pass.
- DESIGN.md §11 checklist ticked for both themes on Vault, Files, Settings, Auth, Unlock, Server setup.
