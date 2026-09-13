# Contract: SystemBars Capacitor Plugin (Android)

**Feature**: [../spec.md](../spec.md) (US4, FR-013, FR-014) | **Research**: [../research.md](../research.md#r4-android-status-bar-color-without-new-dependencies)

An in-repo Capacitor plugin — no npm package. Native code lives in the Android project; the JS
wrapper uses `registerPlugin` from the existing `@capacitor/core`.

## JS interface

Module: `client/src/theme/systemBars.ts`

```ts
export interface SystemBarsTheme {
  resolved: 'light' | 'dark';
  background: string; // '#RRGGBB' — the bg token for the resolved theme
}

export interface SystemBarsPlugin {
  setTheme(options: SystemBarsTheme): Promise<void>;
}

export const systemBars: { setTheme(options: SystemBarsTheme): Promise<void> };
```

- On web (`Capacitor.getPlatform() !== 'android'`) `setTheme` resolves immediately and does nothing.
- On Android, rejections are caught and ignored (theme still applies in the WebView).
- Called by `ThemeProvider` once at mount and on every `resolved` change.

## Native interface

Class: `com.hamdydraw.lockly.SystemBarsPlugin` annotated `@CapacitorPlugin(name = "SystemBars")`,
registered in `MainActivity` with `registerPlugin(SystemBarsPlugin.class)` **before**
`super.onCreate`.

### `setTheme({ resolved, background })`

| Input | Validation | Invalid ⇒ |
|---|---|---|
| `resolved` | `"light"` or `"dark"` | `call.reject("invalid resolved")` |
| `background` | parses with `Color.parseColor` | `call.reject("invalid background")` |

Effects (on the UI thread):
1. Window background and bridge WebView background color = `background`.
2. `WindowCompat.getInsetsController(window, decorView)`:
   `setAppearanceLightStatusBars(resolved == "light")` and
   `setAppearanceLightNavigationBars(resolved == "light")`.
3. If `Build.VERSION.SDK_INT < 35`: `window.setStatusBarColor(background)` and
   `window.setNavigationBarColor(background)`.
4. Persist `resolved` to `SharedPreferences("lockly", MODE_PRIVATE)` key `lockly.theme.resolved`.
5. `call.resolve()`.

## Launch behavior (`MainActivity`)

After `super.onCreate`:
- If `lockly.theme.resolved` exists, apply effects 1–3 using the matching bg hex
  (`#F5F6FA` light, `#0B0D17` dark).
- Otherwise leave the window background from `@color/lockly_bg`, which follows the device via
  `res/values` (light) and `res/values-night` (dark), and set bar icon appearance from the current
  `uiMode` night flag.

## Non-goals

- Does not change `android.adjustMarginsForEdgeToEdge` or safe-area insets.
- Does not read or write `localStorage`; the web preference remains the source of truth, and the
  native cache only stores the last resolved theme.
- No other native behavior (splash timing, orientation) is altered.
