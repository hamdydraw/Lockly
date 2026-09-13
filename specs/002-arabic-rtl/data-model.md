# Data Model: Arabic Language & Right-to-Left Layout

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Date**: 2026-09-13

No database or server data. Client-side values only.

## Entities

### Language (registry entry)

Defined once in `client/src/i18n/languages.ts`.

| Field | Type | English | Arabic |
|---|---|---|---|
| `code` | `LanguageCode` | `en` | `ar` |
| `dir` | `'ltr' \| 'rtl'` | `ltr` | `rtl` |
| `nativeName` | string | `English` | `العربية` |
| `locale` | BCP 47 tag for `Intl` | `en` | `ar-u-nu-latn` |
| `messages` | `Messages` | `en` catalog | `ar` catalog |

- **Validation**: `code` unique; every entry's `messages` satisfies the `Messages` type.
- Adding a language = one new entry + one catalog file.

### LanguagePreference

The user's saved choice on this device. Non-secret.

| Field | Type | Values | Default |
|---|---|---|---|
| `lang` | `LanguageCode \| null` | `en`, `ar`, or none | none |

- **Storage**: `localStorage["lockly.lang"]`.
- **Validation**: unrecognised or unreadable value ⇒ treated as none. Storage errors never surface.
- **Written when**: user selects an option in `LanguageSwitcher`.
- **Never cleared by**: sign-out, auto-lock, lock vault, server change, theme change.

### ResolvedLanguage

The language displayed. Derived.

- **Derivation**:
  1. `LanguagePreference.lang` if set and supported.
  2. Otherwise the first entry of `navigator.languages` (or `navigator.language`) whose base subtag
     (text before `-`, case-insensitive) is a supported `code`.
  3. Otherwise `en`.
- **Reflected to**: `<html lang={code} dir={dir}>`, `document.title`, all `t()` output, `Intl`
  formatting locale.

### Messages (translation catalog)

Nested object; leaves are one of:

| Leaf kind | Shape | Example |
|---|---|---|
| Plain | `string` | `'Lock vault'` |
| Interpolated | `string` with `{name}` tokens | `'Moved to {folder}'` |
| Plural | `Partial<Record<Intl.LDMLPluralRule, string>> & { other: string }` | `{ one: '{count} file', other: '{count} files' }` |

- **Validation rules**:
  - Arabic plural leaves provide `zero, one, two, few, many, other`; English provides `one, other`.
  - Placeholder names in a translation ⊆ names in the English source (parity check).
  - No empty strings.
- **Namespaces** (top-level keys): `app`, `common`, `nav`, `theme`, `language`, `auth`, `unlock`,
  `serverSetup`, `vault`, `item`, `generator`, `strength`, `files`, `preview`, `settings`, `units`,
  `errors`.

### ErrorMapping

`client/src/i18n/errors.ts`: ordered list of `{ match: string | RegExp, key, params? }`. The exact set
is defined in [contracts/error-translation.md](contracts/error-translation.md).

## Relationships

```text
LanguagePreference (stored) ─┐
navigator.languages ─────────┼─► ResolvedLanguage ─► Language registry entry
                             │                        ├─► dir  ─► <html dir> ─► logical CSS mirroring
                             │                        ├─► locale ─► Intl plural/number formatting
                             │                        └─► messages ─► t() / plural() / errorText()
ApiError.message (English) ──────────────────────────► ErrorMapping ─► errors.* keys
```

## State Transitions

```text
          select English            select العربية
 (none) ─────────────────► en ◄───────────────────► ar
    │                                                ▲
    └──── device languages start with Arabic ────────┘  (resolution only; nothing is stored)
```

- Selecting a language always stores it; there is no "follow device" option once a choice is made
  (spec: two options). Clearing site data returns to "none".
- Each change to ResolvedLanguage updates `<html lang dir>`, `document.title`, and all rendered text in
  the same commit.
