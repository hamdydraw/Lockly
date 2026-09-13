# Quickstart & Validation: Arabic Language & Right-to-Left Layout

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

Contracts: [contracts/i18n-runtime.md](contracts/i18n-runtime.md),
[contracts/error-translation.md](contracts/error-translation.md).

## Prerequisites

- Node ≥ 20.19, `npm install`, `server/.env` per README (for signed-in scenarios).
- Android SDK + device/emulator for §4.
- A mixed-direction test set (create these items/files once):
  - Titles: `بنكي`, `My Bank`, `حساب Gmail الشخصي 2`
  - Usernames: `ahmed@example.com`, `محمد`
  - Passwords: `!pass-123#`, `(abc)`, `كلمة123`, `-leading`, `trailing.`
  - URLs: `https://example.com/a/b?x=1`, `https://مثال.مصر`
  - Server address: `192.168.1.20:4000`
  - Files: `تقرير-2026.pdf`, `budget (final).xlsx`, `ملاحظات.txt` (Arabic + English lines), `data.csv` with Arabic cells

## 1. Static checks

```bash
npm run build --workspace client
```
Expected: passes; a missing Arabic key would fail type-checking.

```bash
node client/scripts/check-i18n.mjs
```
Expected: exit 0 — all server/client messages mapped, no untranslated/empty Arabic strings,
placeholder parity, no physical-direction classes, no hard-coded English UI text.

```bash
node client/scripts/check-contrast.mjs
```
Expected: exit 0 (colors unchanged).

```bash
npm test
```
Expected: server tests pass; `git diff --stat main -- server/` is empty.

## 2. Web — development

```bash
npm run dev
```

| # | Scenario | Steps | Expected | Spec |
|---|---|---|---|---|
| W1 | Device detection | Clear site data. Chrome → Settings → Languages: put Arabic first. Reload. | Every screen Arabic + RTL; `<html lang="ar" dir="rtl">` | US1-1, FR-002 |
| W2 | Non-Arabic device | Languages: French, English. Reload. | English + LTR | US1-2 |
| W3 | Preference order | Languages: French, Arabic, English. | Arabic | Edge case |
| W4 | Full walkthrough | In Arabic: server setup (native), register, sign in, unlock, vault, item editor, generator, files, folders, preview (image/pdf/text/csv/sheet), upload progress, delete file/folder dialogs, settings, toasts, empty states, lock, sign out. | No English UI text (brand "Lockly" exempt); mirrored layout; no clipping at 375 px | SC-001, SC-002 |
| W5 | Directional icons & keys | Preview a folder with ≥ 3 files in Arabic; use on-screen arrows and keyboard ← →. Use arrow keys in theme and language controls. | "Previous" button on the right; ← goes to next file; arrow keys follow visual direction; lock/trash/download icons not flipped | US1-3, FR-009 |
| W6 | Plurals & digits | In Arabic view folders with 0, 1, 2, 3, 11, 100 files. | Correct Arabic forms; digits 0–9; sizes with Arabic units | US1-5, FR-014, FR-015 |
| W7 | Content integrity | Using the test set, view/edit/copy each value in both languages; paste copied passwords into a plain text editor. | Displayed and pasted values identical to originals; passwords/URLs/address read LTR | US2, SC-003 |
| W8 | Content direction in preview | Preview `ملاحظات.txt` and `data.csv` in English UI, then Arabic UI. | Arabic lines RTL, English lines LTR, regardless of UI language | US2-4 |
| W9 | Switch language | Settings → Language → English while on Arabic device, with an open item editor containing typed text in another tab of the SPA state. | Immediate switch, typed text preserved; labels "English"/"العربية" shown natively | US3-1, US3-2 |
| W10 | Persistence | Choose English; reload, lock, sign out. | English from first frame on Unlock/Auth | US3-3, FR-005 |
| W11 | No flash | Saved language ≠ device language; DevTools Performance with screenshots, CPU 6× slowdown, 20 reloads. | 0 frames with wrong language or direction | SC-004 |
| W12 | Bad value / blocked storage | `localStorage.setItem('lockly.lang','xx')`, reload; then private window with storage blocked. | Device detection, no errors | Edge cases |
| W13 | Server errors | In Arabic: wrong login, wrong master password, duplicate registration, rate limit (repeat logins), open deleted file, stop server then act. | Arabic messages per error-translation.md | US4, SC-006 |
| W14 | Unknown error | Temporarily point DevTools "Override content" for a request to return `{ "error": "Brand new message" }`. | Generic Arabic fallback for that action | US4-2 |
| W15 | Font fallback | DevTools → Network → block `fonts.gstatic.com`; reload in Arabic. | Arabic still joined and legible (system font) | FR-016 |
| W16 | Accessibility | Screen reader (NVDA/TalkBack) in Arabic over icon-only buttons and language options; keyboard-only walkthrough (DESIGN.md §11) in Arabic, both themes. | Arabic announcements; "العربية" pronounced in Arabic; visible focus every step | US1-4, FR-017, SC-009 |
| W17 | Themes | Repeat W4 spot checks in light and dark. | Contrast and legibility preserved | FR-017 |

## 3. Web — production build (CSP)

```bash
npm run build
```
```bash
npm start
```
Open http://localhost:4000 with Arabic device language; repeat W1, W10, W11, W15.
Expected: no CSP violations for `locale-init.js`, `theme-init.js`, or the Google Fonts stylesheet/files.

## 4. Android

```bash
npm run android:install
```

| # | Scenario | Steps | Expected | Spec |
|---|---|---|---|---|
| A1 | First launch in Arabic | Phone language Arabic; clear app data; launch. | Server setup screen Arabic + RTL | US5-1 |
| A2 | Switch & relaunch | Settings → English; force-stop; relaunch ×20. | English from first frame every time | US5-2, SC-004 |
| A3 | File viewer direction | Arabic; preview folder; tap next/previous. | Mirrored behavior matches web | US5-3 |
| A4 | Parity | Repeat W4, W6, W7, W13 on device. | Same as web | FR-019 |
| A5 | Offline font | Airplane mode after server on LAN only; Arabic UI. | Legible joined Arabic via system font | FR-016 |

## 5. Done when

- §1 checks pass; W1–W17, §3, and A1–A5 pass.
- Native Arabic reviewer signs off on all catalog strings (SC-008).
