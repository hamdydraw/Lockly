# Contract: Theme Runtime (web + Android WebView)

**Feature**: [../spec.md](../spec.md) | **Data model**: [../data-model.md](../data-model.md)

Interfaces that `theme-init.js`, `ThemeProvider`, CSS, and components rely on. Any change here must
be reflected in all consumers.

## 1. Storage contract

| Key | Where | Values | Writer | Readers |
|---|---|---|---|---|
| `lockly.theme` | `window.localStorage` | `"system"` \| `"light"` \| `"dark"` | `ThemeProvider.setTheme` | `public/theme-init.js`, `ThemeProvider` init |

- Absent or any other value ⇒ `"system"`.
- All access MUST be inside `try/catch`; failures MUST NOT surface errors to the user.

## 2. DOM contract

Set by `public/theme-init.js` before first paint, then maintained by `ThemeProvider`.

| Target | Value | Notes |
|---|---|---|
| `document.documentElement` attribute `data-theme` | `"light"` \| `"dark"` | Always present after `theme-init.js` runs. CSS defaults to dark if missing. |
| `<meta name="theme-color">` `content` | `#F5F6FA` (light) \| `#0B0D17` (dark) | Static `#0B0D17` in `index.html`; updated on change. |
| `document.documentElement` attribute `data-theme-switching` | present for one frame during a switch | Disables transitions (research R8). Consumers MUST NOT style on it otherwise. |

`theme-init.js` requirements:
- Plain script (no `type="module"`, no `defer`/`async`), same-origin, loaded in `<head>` before the
  app module. Must not depend on any other script.
- Resolution: stored `light`/`dark` wins; else `matchMedia('(prefers-color-scheme: light)').matches`
  ⇒ `light`; else `dark`.
- Must not throw if `localStorage` or `matchMedia` is unavailable.

## 3. CSS token contract

Declared in `client/src/index.css` under `:root, html[data-theme='dark']` and
`html[data-theme='light']`. Values: DESIGN.md §3 / §12 (source of truth).

| Variable | Format | Tailwind name |
|---|---|---|
| `--bg` | `R G B` | `bg-bg` / `text-bg` |
| `--surface-1`, `--surface-2`, `--surface-3` | `R G B` | `surface-1`, `surface-2`, `surface-3` |
| `--line`, `--line-strong` | `R G B` | `line`, `line-strong` |
| `--overlay` + `--overlay-a` | `R G B` + alpha number | `overlay` utility (scrims) |
| `--fg`, `--fg-muted`, `--fg-subtle` | `R G B` | `fg`, `fg-muted`, `fg-subtle` |
| `--accent`, `--accent-fg` | `R G B` | `accent`, `accent-fg` |
| `--secure` | `R G B` | `secure` |
| `--success`, `--warning` | `R G B` | `success`, `warning` |
| `--danger`, `--danger-solid` | `R G B` | `danger`, `danger-solid` |
| `--shadow-raised`, `--shadow-pop` | full `box-shadow` value | `shadow-raised`, `shadow-pop` |

Rules:
- Tailwind colors MUST be defined as `rgb(var(--token) / <alpha-value>)`.
- After migration, components MUST NOT use raw hex, `rgba()` literals, or `white`/`black`/`slate`
  color utilities for themed UI. Exceptions: the brand gradient in `Logo`, and user file content
  inside `FilePreview`.
- No `dark:` variants.
- Global `:focus-visible` = `outline: 2px solid rgb(var(--accent-fg)); outline-offset: 2px`.

Temporary legacy aliases (removed by end of feature): `base`, `sidebar`, `card`, `card-hover`,
`ink`, `violet-glow`, `cyan-glow`, `.glass`, `.glass-strong`, `.text-muted` → mapped to tokens per
research R3.

## 4. React context contract

Module: `client/src/theme/ThemeProvider.tsx`

```ts
export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeContextValue {
  theme: ThemePreference;            // current preference
  resolved: ResolvedTheme;           // what is displayed
  setTheme(next: ThemePreference): void;
}

export function ThemeProvider(props: { children: React.ReactNode }): JSX.Element;
export function useTheme(): ThemeContextValue; // throws if used outside ThemeProvider
```

Guarantees:
- Initial `resolved` equals the `data-theme` attribute present at mount (no re-theme on hydrate).
- `setTheme` applies synchronously to the DOM (§2), persists (§1), and calls the SystemBars plugin
  ([system-bars-plugin.md](system-bars-plugin.md)); it never unmounts children.
- While `theme === 'system'`, device appearance changes update `resolved` within 1 s.
- Mounted in `client/src/main.tsx` outside `AuthProvider`.

## 5. ThemeToggle UI contract

Module: `client/src/components/ui/ThemeToggle.tsx`

```ts
export function ThemeToggle(props: { variant?: 'compact' | 'labeled'; className?: string }): JSX.Element;
```

- Container: `role="radiogroup"`, `aria-label="Theme"`.
- Options in order: System, Light, Dark; each `role="radio"`, `aria-checked`, accessible name
  (`aria-label` in `compact`, visible text in `labeled`).
- Keyboard: Tab focuses the checked option; Arrow Left/Right/Up/Down move and select; focus ring
  visible in both themes.
- Touch target ≥ 44 px on phone layouts.
- Placements: sidebar footer (`compact`), phone top bar (`compact`), Settings → Appearance
  (`labeled`). Not rendered on Server setup, Auth, or Unlock screens.
