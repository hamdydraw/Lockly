# Data Model: Light Theme

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Date**: 2026-09-13

This feature has no database or server data. It introduces two small client-side values.

## Entities

### ThemePreference

The user's chosen option. Per device/browser, not per account. Non-secret.

| Field | Type | Values | Default |
|---|---|---|---|
| `theme` | enum string | `system` \| `light` \| `dark` | `system` |

- **Web storage**: `localStorage["lockly.theme"]`.
- **Validation**: any missing, unreadable, or unrecognized stored value is treated as `system`.
  Reads and writes are wrapped so that storage errors never throw to the UI; on write failure the
  preference still applies for the current session.
- **Written when**: the user selects an option in any `ThemeToggle`.
- **Never cleared by**: sign-out, auto-lock, lock vault, server change.

### ResolvedTheme

The theme actually displayed. Derived, not user-editable.

| Field | Type | Values |
|---|---|---|
| `resolved` | enum string | `light` \| `dark` |

- **Derivation**:
  - `theme = light` → `light`
  - `theme = dark` → `dark`
  - `theme = system` → `light` if the device matches `prefers-color-scheme: light`, else `dark`
- **Reflected to**:
  - `<html data-theme="{resolved}">` (drives all CSS tokens)
  - `<meta name="theme-color">` = `bg` token hex (`#F5F6FA` light, `#0B0D17` dark)
  - Android only: `SharedPreferences["lockly.theme.resolved"]`, status bar color/icons, window and
    WebView background (see [contracts/system-bars-plugin.md](contracts/system-bars-plugin.md))

## Relationships

```text
ThemePreference (stored, user-set)
        │  + device appearance (prefers-color-scheme)
        ▼
ResolvedTheme (derived) ──► DOM attribute ──► CSS tokens ──► every screen
                        ├─► theme-color meta (web browser chrome)
                        └─► SystemBars plugin (Android status bar + native pre-paint cache)
```

## State Transitions

```text
            select Light                select Dark
 ┌────────┐ ───────────► ┌────────┐ ───────────► ┌────────┐
 │ system │              │ light  │              │  dark  │
 └────────┘ ◄─────────── └────────┘ ◄─────────── └────────┘
      ▲      select System      (any option is reachable from any state)
      │
  default / invalid stored value
```

- While `theme = system`, a device appearance change triggers a new `ResolvedTheme` without changing
  `ThemePreference`.
- While `theme = light | dark`, device appearance changes are ignored.
- Every change to `ResolvedTheme` updates all reflections listed above in the same tick.

## Token Set (reference)

The CSS token names and per-theme values are defined in DESIGN.md §3 and §12 and are the contract
listed in [contracts/theme-runtime.md](contracts/theme-runtime.md#3-css-token-contract). They are
not duplicated here.
