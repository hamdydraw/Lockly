# Contract: i18n Runtime (web + Android WebView)

**Feature**: [../spec.md](../spec.md) | **Data model**: [../data-model.md](../data-model.md)

## 1. Storage

| Key | Where | Values | Writer | Readers |
|---|---|---|---|---|
| `lockly.lang` | `localStorage` | `"en"` \| `"ar"` | `LanguageProvider.setLanguage` | `public/locale-init.js`, `LanguageProvider` init |

Invalid/absent ⇒ detect from device. All access inside `try/catch`.

## 2. DOM

| Target | Value | Set by |
|---|---|---|
| `<html lang>` | `en` \| `ar` | static default `en` in `index.html`; `locale-init.js` pre-paint; `LanguageProvider` on change |
| `<html dir>` | `ltr` \| `rtl` | same |
| `document.title` | `t('app.documentTitle')` | `LanguageProvider` |

`locale-init.js` requirements: plain script, same-origin, in `<head>` before stylesheets and the app
module, no dependencies, never throws. Resolution per data-model.md "ResolvedLanguage". Supported codes
are duplicated as a literal list inside the script with a comment pointing to `languages.ts`.

## 3. Provider API

Module `client/src/i18n/LanguageProvider.tsx`:

```ts
export type LanguageCode = 'en' | 'ar';          // from languages.ts
export type Direction = 'ltr' | 'rtl';
export type MessageKey = /* union of dot-paths to plain/interpolated leaves */;
export type PluralKey = /* union of dot-paths to plural leaves */;
export type Params = Record<string, string | number>;

export interface I18nContextValue {
  lang: LanguageCode;
  dir: Direction;
  /** Translated string; {name} tokens replaced; numbers formatted with Western digits. */
  t(key: MessageKey, params?: Params): string;
  /** Like t(), but params may be React nodes; string params that are user content are wrapped in <bdi dir="auto">. */
  tx(key: MessageKey, params: Record<string, React.ReactNode>): React.ReactNode;
  /** Plural form for count (count is also available as {count}). */
  plural(key: PluralKey, count: number, params?: Params): string;
  /** Plural form with React-node params (added during implementation for the delete-folder dialog). */
  pluralx(key: PluralKey, count: number, params: Record<string, React.ReactNode>): React.ReactNode;
  formatNumber(n: number): string;
  formatBytes(bytes: number): string;
  setLanguage(next: LanguageCode): void;
}

export function LanguageProvider(props: { children: React.ReactNode }): JSX.Element;
export function useI18n(): I18nContextValue; // throws outside provider
```

Guarantees:
- Initial `lang` equals `<html lang>` set by `locale-init.js` when valid (no re-render flip on mount).
- `setLanguage` persists, updates `<html lang dir>` and title before paint, never unmounts children.
- Missing key at runtime (should be impossible after type-check) returns the English string.
- Mounted in `main.tsx` outside `ThemeProvider`'s children tree root (order: `LanguageProvider` >
  `ThemeProvider` > …), so every screen including pre-sign-in screens is covered.

## 4. Catalog conventions

- Files: `client/src/i18n/messages/<code>.ts`, `export const <code> = { … }`.
- `en.ts` is the source of truth: `export type Messages = DeepWiden<typeof en>`.
- Non-English catalogs: `export const ar: Messages = { … }`.
- Keys are camelCase, grouped by screen namespace (see data-model.md).
- Placeholders `{camelCase}`; user-content placeholders are rendered through `tx` so they are
  bidi-isolated.
- Plural leaves use `Intl.LDMLPluralRule` keys; `other` required.
- Never concatenate translated fragments; one key per complete sentence.

## 5. Error translation

Module `client/src/i18n/errors.ts`:

```ts
export function errorKey(message: string): { key: MessageKey; params?: Params } | null;
/** For toasts/inline errors: translated known message, else translated fallback. */
export function useErrorText(): (err: unknown, fallback: MessageKey) => string;
```

Mapping table: [error-translation.md](error-translation.md). Call sites replace
`err instanceof ApiError ? err.message : '…'` with `errorText(err, 'errors.…')`.

## 6. Direction rules for components

| Situation | Rule |
|---|---|
| Spacing/position/alignment | Logical utilities only: `ms- me- ps- pe- start- end- text-start text-end border-s border-e rounded-s rounded-e` |
| Physical utilities | Forbidden in `client/src` except symmetric centring (`left-1/2` with `-translate-x-1/2`) and `inset-*`/`inset-x-*` |
| Directional icons (chevrons, arrows meaning back/next) | Add `rtl:-scale-x-100` |
| Non-directional icons | Never flipped |
| User content display | `dir="auto"` on the element; inside sentences via `tx` (`<bdi dir="auto">`) |
| Password, email, URL, server address inputs and values | `dir="ltr"` plus `rtl:text-right` |
| Username, title, folder, notes inputs | `dir="auto"` |
| Horizontal arrow-key navigation | Invert Left/Right when `dir === 'rtl'` |
| Numbers in UI text | `formatNumber` / `formatBytes` / `plural` only |

## 7. SegmentedControl

Module `client/src/components/ui/SegmentedControl.tsx`:

```ts
export interface SegmentOption<T extends string> {
  value: T;
  label: string;          // accessible name (translated)
  icon?: LucideIcon;
  labelLang?: string;     // e.g. 'ar' for "العربية"
}

export function SegmentedControl<T extends string>(props: {
  options: SegmentOption<T>[];
  value: T;
  onChange(value: T): void;
  ariaLabel: string;
  variant?: 'compact' | 'labeled';
  className?: string;
}): JSX.Element;
```

Behavior is exactly 001's ThemeToggle contract (roving tabindex, Home/End, 44 px phone targets, focus
ring) plus RTL arrow inversion. `ThemeToggle` and `LanguageSwitcher` are thin wrappers.

## 8. Fonts

`index.html` Google Fonts URL requests `Inter:wght@400;500;600;700;800` and
`IBM+Plex+Sans+Arabic:wght@400;500;600;700` with `display=swap`. `index.css`:

```css
:lang(ar) body { font-family: 'IBM Plex Sans Arabic', 'Inter', 'Noto Sans Arabic', 'Segoe UI', Tahoma, system-ui, sans-serif; }
:lang(ar) * { letter-spacing: 0 !important; }
```

Elements explicitly marked `lang="en"` or `dir="ltr"` inside Arabic UI still inherit the Arabic stack;
Plex Sans Arabic includes Latin glyphs, so mixed content stays consistent.
