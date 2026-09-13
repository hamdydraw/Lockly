# Lockly Design System

Version 1.0 · 2026-09-10 · Applies to `client/`

This document is the single source of truth for Lockly's visual language, component
contract and accessibility rules. It replaces the ad-hoc "glass" primitives. Every value
below is a token; pages never use raw hex, raw pixel sizes or one-off shadows.

Scope: **visual only.** Database, API, authentication and business logic are untouched.
The server contract (`/api/*`) is consumed exactly as today.

---

## 1. Principles

1. **Precision, not spectacle.** Lockly is a security tool. Surfaces are solid, borders
   are 1px, colour is scarce and meaningful. Gradients survive only in the logo.
2. **One accent does one job.** Violet marks brand, selection and primary action. Cyan
   (teal in light mode) marks *security state* only: encrypted, locked, verified.
3. **Both themes are first-class.** Every token has a dark and a light value with
   verified contrast. Nothing is "designed dark and inverted".
4. **Keyboard first.** Anything clickable is focusable and shows a ring. Dialogs trap
   focus and close on Escape. Feedback is announced.
5. **Quiet motion.** 120–200 ms, ease-out, opacity and small translate only. Honour
   `prefers-reduced-motion`.

---

## 2. Theming architecture

Themes are CSS custom properties on `<html data-theme="dark|light">`. Tailwind colour
utilities read those variables, so `bg-surface-2` or `text-fg-muted` resolve per theme
with no `dark:` prefixes in JSX.

```
html[data-theme="dark"]  { --bg: 11 13 23; ... }
html[data-theme="light"] { --bg: 245 246 250; ... }
```

- Preference order: stored choice (`localStorage["lockly.theme"]` = `system | light | dark`)
  → `prefers-color-scheme`. Default is **system**.
- `client/public/theme-init.js`, loaded as a blocking `<script src>` in `index.html`, sets
  `data-theme` before first paint (no flash). It is not inline because the server CSP only
  allows same-origin scripts.
- `<meta name="theme-color">` is updated per theme for browser chrome. It does not reach the
  Android app window, so the in-repo `SystemBars` Capacitor plugin sets the status bar there.
- A `ThemeProvider` exposes `{ theme, resolved, setTheme }`. The toggle lives in
  Settings and as a compact control in the sidebar footer.
- Variables are stored as space-separated RGB channels so Tailwind opacity modifiers keep
  working: `rgb(var(--accent) / <alpha-value>)`.

---

## 3. Colour tokens

Contrast ratios are WCAG 2.x, computed against the surface named in the row. Targets:
body text ≥ 4.5:1, large/secondary UI text ≥ 3:1, interactive boundary ≥ 3:1 (met via the
focus ring, not the resting border).

### 3.1 Surfaces and lines

| Token | Role | Dark | Light |
|---|---|---|---|
| `bg` | App canvas | `#0B0D17` | `#F5F6FA` |
| `surface-1` | Sidebar, nav bars, dialogs | `#111426` | `#FFFFFF` |
| `surface-2` | Cards, rows, inputs | `#171B2D` | `#FFFFFF` |
| `surface-3` | Hover, selected row, chips | `#1D2238` | `#EEF0F6` |
| `line` | Dividers, resting borders | `#2A3149` | `#E2E5EE` |
| `line-strong` | Input borders, emphasised dividers | `#3A4260` | `#B4BBCC` |
| `overlay` | Dialog scrim | `rgb(0 0 0 / .6)` | `rgb(16 18 32 / .45)` |

Light-mode cards and the sidebar share white; separation comes from the `#F5F6FA` canvas
and the 1px `line` border, which is the Linear/1Password approach and avoids grey-on-grey.

### 3.2 Text

| Token | Role | Dark | on `surface-2` | Light | on `surface-2` |
|---|---|---|---|---|---|
| `fg` | Primary text, headings | `#F4F5F7` | 15.6:1 | `#111527` | 18.1:1 |
| `fg-muted` | Labels, secondary text | `#A9B1C6` | 7.9:1 | `#5A6178` | 6.2:1 |
| `fg-subtle` | Placeholders, tertiary meta, disabled | `#7E879E` | 4.8:1 | `#7A8299` | 3.8:1 |
| `fg-on-accent` | Text on accent-filled controls | `#FFFFFF` | — | `#FFFFFF` | — |

`fg-subtle` is never used for information the user needs to act on; placeholders and
decorative meta only.

### 3.3 Accent and semantic

| Token | Role | Dark | Contrast | Light | Contrast |
|---|---|---|---|---|---|
| `accent` | Primary button fill, active nav, selection | `#6252EA` | white on it 5.4:1 | `#5B4BE0` | white on it 6.0:1 |
| `accent-fg` | Accent used *as text or icon* | `#A99DFF` | 7.3:1 on surface-2 | `#5B4BE0` | 6.0:1 on white |
| `accent-soft` | Tinted backgrounds (active nav, selected chip) | `accent / 12%` | — | `accent / 10%` | — |
| `secure` | Security state text/icon (encrypted, unlocked) | `#5EE7FF` | 11.7:1 | `#0B7C93` | 4.9:1 |
| `secure-soft` | Badge background | `secure / 10%` | — | `secure / 10%` | — |
| `success` | Confirmations | `#5BD68F` | 9.3:1 | `#157A46` | 5.4:1 |
| `warning` | HTTP warning, weak password | `#F5C451` | 10.5:1 | `#9A6700` | 4.9:1 |
| `danger` | Destructive text/icon | `#FF7A8E` | 6.8:1 | `#C8324B` | 5.2:1 |
| `danger-solid` | Destructive button fill | `#D63B55` | white on it 4.6:1 | `#C8324B` | white on it 5.2:1 |

Strength meter uses `danger → warning → success` by score (0–1 danger, 2 warning, 3–4
success), not a fixed gradient, so weak passwords look weak.

### 3.4 Focus ring

`ring: 2px solid accent-fg, offset 2px` in both themes (dark 7.3:1, light 6.0:1 against
surface). Applied via `:focus-visible` globally. The current global `outline: none` is removed.

---

## 4. Typography

Font: **Inter** for UI (already loaded, weights 400/500/600 only; 700/800 dropped).
**Monospace** (`ui-monospace, "JetBrains Mono", "Cascadia Code", Consolas, monospace`) for
passwords, card numbers, server addresses and generated values so glyphs like `l/1/I/O/0`
are distinguishable. Arabic uses **IBM Plex Sans Arabic** (400–700) from the same Google Fonts
host, falling back to the OS Arabic font when offline; `:lang(ar)` resets letter-spacing because
negative tracking breaks Arabic letter joining (§14).

| Token | Size / line | Weight | Use |
|---|---|---|---|
| `display` | 28 / 34 | 600 | Auth and unlock titles |
| `h1` | 22 / 28 | 600 | Page titles |
| `h2` | 16 / 24 | 600 | Card and section headings, dialog titles |
| `body` | 14 / 20 | 400 | Default text, inputs, buttons |
| `body-strong` | 14 / 20 | 500 | Row titles, nav items, labels |
| `small` | 13 / 18 | 400 | Secondary meta, helper text |
| `caption` | 12 / 16 | 500 | Badges, counts, chips |
| `mono` | 14 / 20 | 400 | Secrets, URLs |

Minimum rendered size is 12px. The current 11px usages (folder chips, avatar initial,
badge counts) move to `caption`. Letter-spacing: `-0.01em` on `display` and `h1`, none
elsewhere. Headings are always weight 600; the mix of extrabold/bold/semibold is removed.

---

## 5. Spacing, radius, elevation

**Spacing** is a 4px grid using Tailwind's default scale. Component rules:

| Context | Value |
|---|---|
| Page gutter | 16 (mobile) · 24 (desktop) |
| Section gap | 24 |
| Card padding | 16 (compact) · 20 (default) |
| Form field gap | 16 |
| Label → control | 6 |
| Inline icon → text | 8 |
| List row gap | 4 (rows) · 0 with dividers (dense list) |

**Control heights:** `sm` 32 · `md` 36 · `lg` 44. Mobile touch targets are ≥ 44px
(`lg` or 44px hit area on icon buttons).

**Radius:** `sm` 6 (chips, badges) · `md` 10 (buttons, inputs, rows) · `lg` 14 (cards,
dialogs) · `full`. The 16px "glass" radius is retired.

**Elevation:** flat by default. Only two shadows exist:

| Token | Dark | Light |
|---|---|---|
| `shadow-raised` (cards) | `0 1px 2px rgb(0 0 0 / .4)` | `0 1px 2px rgb(16 18 32 / .06)` |
| `shadow-pop` (dialogs, menus, toasts, mobile nav) | `0 12px 32px rgb(0 0 0 / .5)` | `0 12px 32px rgb(16 18 32 / .14)` |

The "glow" ring shadows are removed. The aurora background is kept in dark mode at its
current subtlety and replaced with a flat canvas in light mode.

---

## 6. Layout and responsive behaviour

Breakpoints: `sm` 640 · `md` 768 · `lg` 1024 (Tailwind defaults).

| Region | < md (phone) | md–lg (tablet) | ≥ lg (desktop) |
|---|---|---|---|
| Navigation | Bottom tab bar, 64px + safe-area | Left sidebar 240px | Left sidebar 240px |
| Content max width | 100% | 100% | 1120px (centred) |
| Vault | Single list, item opens as full-screen sheet | Single list + dialog | Two-pane: list 380px + detail |
| Files | Single list, row actions in menu | Current layout | Current layout |
| Settings | Stacked sections | Stacked, max 640px | Stacked, max 640px |

- Main content gets `padding-bottom: calc(64px + env(safe-area-inset-bottom))` on phones
  so nothing hides behind the tab bar. Toasts stack **above** the tab bar.
- `viewport-fit=cover` is added to the viewport meta so `env(safe-area-inset-*)` works in
  the Capacitor WebView.
- Sidebar is a flat column on `surface-1` with a right `line` border, not a floating card.

---

## 7. Motion

| Token | Duration | Easing | Use |
|---|---|---|---|
| `fast` | 120 ms | ease-out | Hover, focus, colour |
| `base` | 200 ms | cubic-bezier(.2,.8,.2,1) | Dialog, sheet, toast enter/exit |
| `slow` | 300 ms | same | Page-level fade on auth/unlock |

Rules: opacity and ≤ 8px translate only; no scale on buttons; list items do **not**
stagger on every re-render (the vault grid currently re-animates on each keystroke).
`prefers-reduced-motion` disables all of it, including the aurora drift.

---

## 8. Iconography

lucide-react, `strokeWidth 1.75`, sizes 16 (inline), 18 (nav, row actions), 20 (empty
states, dialog headers). Icons are `aria-hidden` when accompanied by text; icon-only
buttons carry `aria-label` and a `title`.

Item-type icons: Login → `KeyRound`, Card → `CreditCard`, Secure note → `StickyNote`,
Other → `Shapes`. They render as a 36px tile on `surface-3` with `accent-fg` stroke, not a
gradient block.

---

## 9. Components

All primitives live in `client/src/components/ui/`. Names drop the "Glass" prefix. Each
accepts `className` and forwards refs.

| Component | Variants / props | States | Notes |
|---|---|---|---|
| `Button` | `primary` `secondary` `ghost` `danger`; `size sm/md/lg`; `loading`; `leftIcon` | hover, active, focus-visible, disabled, loading (spinner + `aria-busy`) | Primary is solid `accent`, no gradient |
| `IconButton` | same variants; `label` (required, becomes `aria-label` + tooltip) | as above | 36px, 44px hit area on touch |
| `Input` | `label`, `hint`, `error`, `leftIcon`, `rightSlot`, `mono` | focus ring, invalid (`aria-invalid`, `aria-describedby`), disabled | Single source for search, email, URL |
| `PasswordInput` | extends Input; `reveal` toggle, optional `onCopy`, optional `onGenerate` | as Input | Replaces the inline password field in ItemModal |
| `Textarea` | `label`, `hint`, `error`, `rows`, `autoGrow` | as Input | |
| `SegmentedControl` | `options`, `value`, `onChange` | roving focus, `role="radiogroup"` | Item type picker |
| `Chip` | `active`, `count`, `icon`, `dismissible` | hover, active, focus | Folder filters (Files and Vault) |
| `Badge` | `tone secure/success/warning/danger/neutral` | — | "Encrypted", strength label |
| `Card` | `padding compact/default`, `interactive` | hover when interactive | Solid `surface-2` + `line` |
| `ListRow` | `leading`, `title`, `meta`, `trailing`, `selected`, `onClick` | hover, selected, focus | Shared by Vault list and Files list |
| `Dialog` | `title`, `description`, `size sm/md/lg`, `footer` | open/close animation | `role="dialog"`, `aria-modal`, focus trap, Escape, focus return, scroll lock. Becomes a bottom sheet under `md` |
| `ConfirmDialog` | `title`, `body`, `confirmLabel`, `tone danger` | — | Used before every delete |
| `Menu` | `items[{label, icon, onSelect, tone}]` | arrow-key navigation | Row overflow actions on phone, avatar menu |
| `Toast` | `tone info/success/error`, optional `action` | auto-dismiss 3 s, pause on hover | `role="status"` live region; error uses `role="alert"` |
| `Skeleton` | `lines`, `shape` | — | Replaces "Loading…" text |
| `EmptyState` | `icon`, `title`, `body`, `action` | — | Vault, Files, folders, search |
| `StrengthMeter` | `password` | — | 4 segments, semantic colour by score, `aria-valuenow` |
| `ThemeToggle` | `compact` | — | System / Light / Dark segmented |
| `NavItem` | `to`, `icon`, `label`, `badge` | active, hover, focus | Sidebar and tab bar share it |
| `Logo` | unchanged | — | Only place the gradient remains |

---

## 10. Patterns

**Shell.** Sidebar: logo, primary nav, a *Folders* section (Vault folders), then footer
with theme toggle, lock button and an avatar menu (email, sign out). Phone: top bar with
logo, page title, lock and avatar menu; bottom tab bar with Vault, Files, Settings.

**Vault list.** Each row shows type icon, title, username or URL, folder chip, and
trailing quick actions: copy username, copy password, open URL. Search is debounced
300 ms and filters by type/folder chips. Desktop ≥ lg opens the item in a right-hand
detail pane; below that, in a Dialog / bottom sheet. Editing happens in place in the
detail pane.

**Item forms by type.** All types share Title and Folder. Login adds Username, Password,
URL, Notes. Card adds Cardholder, Number (mono, grouped display), Expiry, CVV, PIN, Notes.
Secure note is Title plus a large Body. Other is Username, Password, URL, Notes. All
fields map onto the existing free-form `secret` record; no server change.

**Destructive actions.** Always through `ConfirmDialog`. Delete controls use `danger`
variant and are separated from safe actions by at least one gap or placed in a Menu.

**Feedback.** Mutations show loading on the triggering button, then a Toast. Copy toasts
state the clipboard clear time. Errors from the API render inline where a field is
responsible, otherwise as an error Toast.

**Loading, empty, error.** Every list has all three states: Skeleton rows, EmptyState
with a primary action, and an inline error Card with a Retry button. A failed query never
renders as "empty".

**Session.** A small lock-timer indicator in the sidebar footer; a warning Toast with a
"Stay unlocked" action one minute before auto-lock (client-side timer mirroring the
server's 15-minute TTL, refreshed on any successful request).

**Forms.** Labels always visible (no placeholder-as-label). Required fields marked in
the label. Helper text sits below the control. Submit buttons show a spinner and remain
in place. Auth explains the two passwords with one sentence each.

---

## 11. Accessibility checklist (definition of done)

- [ ] Every interactive element reachable by Tab and shows the accent focus ring.
- [ ] Dialogs: focus trapped, Escape closes, focus returns to the opener.
- [ ] Toasts announced via live region.
- [ ] Icon-only controls have `aria-label`.
- [ ] Text contrast ≥ 4.5:1 for `fg` and `fg-muted` on all surfaces in both themes.
- [ ] No text below 12px.
- [ ] Touch targets ≥ 44px on phone.
- [ ] Type picker and filter chips expose selected state (`aria-pressed` / radiogroup).
- [ ] Reduced motion honoured.
- [ ] Both themes checked on Vault, Files, Settings, Auth, Unlock, Server setup.
- [ ] Keyboard-only walkthrough of: register, login, unlock, add item, copy password,
      upload file, delete file (confirm), change theme, sign out.

---

## 12. Token implementation (proposed code)

### `client/src/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root,
html[data-theme='dark'] {
  color-scheme: dark;
  --bg: 11 13 23;
  --surface-1: 17 20 38;
  --surface-2: 23 27 45;
  --surface-3: 29 34 56;
  --line: 42 49 73;
  --line-strong: 58 66 96;
  --overlay: 0 0 0;
  --overlay-a: 0.6;
  --fg: 244 245 247;
  --fg-muted: 169 177 198;
  --fg-subtle: 126 135 158;
  --fg-on-accent: 255 255 255;
  --accent: 98 82 234;
  --accent-fg: 169 157 255;
  --secure: 94 231 255;
  --success: 91 214 143;
  --warning: 245 196 81;
  --danger: 255 122 142;
  --danger-solid: 214 59 85;
  --shadow-raised: 0 1px 2px rgb(0 0 0 / 0.4);
  --shadow-pop: 0 12px 32px rgb(0 0 0 / 0.5);
}

html[data-theme='light'] {
  color-scheme: light;
  --bg: 245 246 250;
  --surface-1: 255 255 255;
  --surface-2: 255 255 255;
  --surface-3: 238 240 246;
  --line: 226 229 238;
  --line-strong: 180 187 204;
  --overlay: 16 18 32;
  --overlay-a: 0.45;
  --fg: 17 21 39;
  --fg-muted: 90 97 120;
  --fg-subtle: 122 130 153;
  --fg-on-accent: 255 255 255;
  --accent: 91 75 224;
  --accent-fg: 91 75 224;
  --secure: 11 124 147;
  --success: 21 122 70;
  --warning: 154 103 0;
  --danger: 200 50 75;
  --danger-solid: 200 50 75;
  --shadow-raised: 0 1px 2px rgb(16 18 32 / 0.06);
  --shadow-pop: 0 12px 32px rgb(16 18 32 / 0.14);
}

html, body, #root { height: 100%; }

body {
  margin: 0;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 14px;
  line-height: 20px;
  color: rgb(var(--fg));
  background: rgb(var(--bg));
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

:focus-visible {
  outline: 2px solid rgb(var(--accent-fg));
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
  }
}
```

### `client/tailwind.config.js`

```js
const rgb = (v) => `rgb(var(${v}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'JetBrains Mono', 'Cascadia Code', 'Consolas', 'monospace'],
      },
      fontSize: {
        display: ['28px', { lineHeight: '34px', fontWeight: '600', letterSpacing: '-0.01em' }],
        h1: ['22px', { lineHeight: '28px', fontWeight: '600', letterSpacing: '-0.01em' }],
        h2: ['16px', { lineHeight: '24px', fontWeight: '600' }],
        body: ['14px', { lineHeight: '20px' }],
        small: ['13px', { lineHeight: '18px' }],
        caption: ['12px', { lineHeight: '16px', fontWeight: '500' }],
      },
      colors: {
        bg: rgb('--bg'),
        surface: { 1: rgb('--surface-1'), 2: rgb('--surface-2'), 3: rgb('--surface-3') },
        line: { DEFAULT: rgb('--line'), strong: rgb('--line-strong') },
        fg: {
          DEFAULT: rgb('--fg'),
          muted: rgb('--fg-muted'),
          subtle: rgb('--fg-subtle'),
          'on-accent': rgb('--fg-on-accent'),
        },
        overlay: 'rgb(var(--overlay) / var(--overlay-a))',
        accent: { DEFAULT: rgb('--accent'), fg: rgb('--accent-fg') },
        secure: rgb('--secure'),
        success: rgb('--success'),
        warning: rgb('--warning'),
        danger: { DEFAULT: rgb('--danger'), solid: rgb('--danger-solid') },
      },
      borderRadius: { sm: '6px', md: '10px', lg: '14px' },
      boxShadow: { raised: 'var(--shadow-raised)', pop: 'var(--shadow-pop)' },
      transitionDuration: { fast: '120ms', base: '200ms', slow: '300ms' },
      transitionTimingFunction: { out: 'cubic-bezier(.2,.8,.2,1)' },
      height: { control: '36px', 'control-sm': '32px', 'control-lg': '44px' },
      spacing: { 'tabbar': '64px' },
    },
  },
  plugins: [],
};
```

### `client/index.html` additions

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<meta name="theme-color" content="#0B0D17" />
<!-- Plain blocking script before the styles: picks the theme before first paint. -->
<script src="/theme-init.js"></script>
```

`client/public/theme-init.js` reads `localStorage["lockly.theme"]`, falls back to
`prefers-color-scheme` (also when storage is blocked), and sets `data-theme` and the
`theme-color` meta. It is a same-origin file rather than an inline script because the
server's Helmet CSP allows scripts from `'self'` only. No server change needed.

On Android, `theme-color` does not reach the app window, so the in-repo `SystemBars`
Capacitor plugin (`client/android/app/src/main/java/com/hamdydraw/lockly/SystemBarsPlugin.java`)
sets the status/navigation bar colour and icon contrast, and saves the last resolved theme
so `MainActivity` paints the right background before the WebView loads.

---

## 13. Migration map

✅ = shipped in `specs/001-light-theme`; everything else is still pending.

| File | Change |
|---|---|
| `index.css`, `tailwind.config.js`, `index.html` | ✅ Tokens, themes, focus ring, viewport-fit, theme init |
| `components/ui/*` | ✅ Token colours and `ThemeToggle`. Pending: rename Glass\* → Button, Input, Card, Dialog; add IconButton, PasswordInput, Textarea, SegmentedControl, Chip, Badge, ListRow, ConfirmDialog, Menu, Skeleton, EmptyState, NavItem |
| `theme/ThemeProvider.tsx` (new) | ✅ Theme state, persistence, `theme-color` meta sync, Android system bars |
| `components/AppShell.tsx` | ✅ Tokens; theme control in sidebar footer and phone top bar. Pending: sidebar 240px with folders; tab bar; safe areas; content bottom padding |
| `components/AuroraBackground.tsx` | ✅ Dark only; flat canvas in light |
| `pages/VaultPage.tsx` | ✅ Tokens. Pending: list + filters + quick copy; two-pane on desktop |
| `components/ItemModal.tsx` → `components/ItemEditor.tsx` | ✅ Tokens. Pending: type-specific forms; used by pane and sheet |
| `pages/FilesPage.tsx` | ✅ Tokens, ConfirmDialog on delete. Pending: row Menu on phone, Skeleton/error states |
| `pages/SettingsPage.tsx` | ✅ Appearance (theme). Pending sections: Security (master reset with confirm field), About/How data is protected |
| `pages/AuthPage.tsx`, `UnlockPage.tsx`, `ServerSetupPage.tsx` | ✅ Tokens. Pending: display type, two-password explainer, inline errors |
| `i18n/*`, `ui/SegmentedControl.tsx`, `ui/LanguageSwitcher.tsx` (new) | ✅ English/Arabic catalogs, RTL layout, language switch (`specs/002-arabic-rtl`) |
| `lib/api.ts`, `lib/*`, `auth/*` | **No changes** |

---

## 14. Language & direction

Lockly ships English and Arabic (`specs/002-arabic-rtl`). These rules keep both correct.

- **Strings.** Every UI string comes from `client/src/i18n/messages/<lang>.ts` through
  `useI18n()` (`t`, `tx`, `plural`, `pluralx`). `en.ts` defines the shape and other catalogs are
  typed against it, so a missing key fails the build. One key per complete sentence; never
  concatenate translated fragments.
- **Direction.** `public/locale-init.js` sets `<html lang dir>` before first paint and
  `LanguageProvider` keeps them in sync. Use logical utilities only: `ms- me- ps- pe- start- end-
  text-start text-end border-s border-e rounded-s rounded-e`. `client/scripts/check-i18n.mjs`
  rejects physical `left/right/ml/mr/pl/pr`; symmetric centring (`left-1/2 -translate-x-1/2`) is
  allowed, and an `i18n-allow-physical` comment with a reason exempts the next line.
- **Icons.** Arrows and chevrons that mean back, next or exit get `rtl:-scale-x-100`. Lock, trash,
  download, eye and other non-directional icons never flip.
- **Keyboard.** Horizontal arrow keys follow the visual direction, so they swap in RTL (segmented
  controls, file viewer paging).
- **User content keeps its own direction.** Put `dir="auto"` on elements that show titles,
  usernames, folders, file names, notes and cell text; inside translated sentences pass the value
  through `tx` (rendered in `<bdi dir="auto">`). Emails, passwords, URLs and server addresses are
  always `dir="ltr"` with `rtl:text-right`.
- **Numbers.** Western digits 0–9 in every language (`ar-u-nu-latn`). Format with `formatNumber`,
  `formatBytes` or `plural`, never `toLocaleString()` or string concatenation.
- **Errors.** Server messages are English; `client/src/i18n/errors.ts` maps each to a key
  (`useErrorText`). `check-i18n.mjs` fails when the server adds a message without a mapping.
- **Language control.** Settings → Language (`LanguageSwitcher`), each option labelled in its own
  language. The choice is stored per device in `localStorage["lockly.lang"]`; first launch follows
  the device language.
