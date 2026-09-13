# Feature Specification: Arabic Language & Right-to-Left Layout

**Feature Branch**: `002-arabic-rtl`

**Created**: 2026-09-13

**Status**: Draft

**Input**: User description: "Add Arabic as a second interface language alongside English, with full right-to-left (RTL) layout when Arabic is active. On first launch the language follows the device/browser language (Arabic device → Arabic, otherwise English); users can switch between English and العربية in Settings, and the choice persists per device across reloads, sign-out and auto-lock, like the theme preference. The correct language and text direction must apply before first paint with no flash of the wrong language or direction, on the web app and the Android app. Every user-facing string is translated: all screens (server setup, sign in/register, unlock, vault, item editor, password generator, files, folders, file preview, upload progress, delete confirmations, settings), navigation, toasts, empty states, and accessibility labels. Error messages returned by the server in English are shown in Arabic by mapping known messages on the client, with a generic Arabic fallback for unknown ones — no server or API changes. Layout mirrors in RTL (navigation, icons with direction such as chevrons and back/next, paging arrows and keyboard arrow behavior in the file viewer, spacing and alignment), while user content keeps its own direction: vault titles, usernames, URLs, passwords, file names, server addresses and file contents are never reversed or reshaped. Numbers use Western digits 0–9 in both languages. Arabic text uses a font with proper Arabic glyphs that matches the existing design and meets DESIGN.md contrast and accessibility rules in both light and dark themes. Architecture must allow adding more languages later without restructuring, and must add no new dependencies."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Arabic speakers get a complete Arabic, right-to-left app (Priority: P1)

A user whose phone or browser is set to Arabic opens Lockly for the first time. Every screen —
server setup, sign in and registration, unlock, vault, item editor, password generator, files,
folders, file preview, upload progress, confirmations, and settings — appears in Arabic and reads
right to left: navigation sits on the right, text is right-aligned, and arrows point the way an
Arabic reader expects. The user never has to find a setting.

**Why this priority**: This is the core value of the feature. Without a complete, correctly
mirrored Arabic interface, adding a language switch has nothing to switch to.

**Independent Test**: With no saved language choice and the device language set to Arabic, walk
through every screen and dialog listed above; all interface text is Arabic and the layout is
mirrored. With the device set to any other language, the same walkthrough is entirely English and
left-to-right.

**Acceptance Scenarios**:

1. **Given** no saved language choice and a device set to Arabic, **When** the user opens Lockly,
   **Then** every screen, dialog, toast, empty state, and navigation element is in Arabic and laid
   out right to left.
2. **Given** no saved language choice and a device set to a language other than Arabic, **When**
   the user opens Lockly, **Then** the interface is in English and laid out left to right.
3. **Given** Arabic is active, **When** the user looks at icons that imply direction (back/next,
   chevrons, paging arrows, "expand" indicators), **Then** they point in the mirrored direction;
   icons without direction (lock, trash, download, eye) are not flipped.
4. **Given** Arabic is active, **When** a screen reader reads any icon-only control, **Then** its
   spoken label is in Arabic.
5. **Given** Arabic is active, **When** counts are shown (e.g., number of files, items in a
   folder), **Then** the wording uses the grammatically correct Arabic form for that number
   (including the dual and plural forms) and digits are Western 0–9.

---

### User Story 2 - My data looks exactly the way I typed it, in either language (Priority: P1)

A user stores a mix of English and Arabic data: an Arabic vault title, an English username, a URL,
a password full of symbols, a server address, and files named in both scripts. Whichever interface
language is active, each value displays in its own natural direction, characters are never
reversed or reordered, and passwords and addresses read left to right exactly as entered.

**Why this priority**: Lockly stores credentials. If mirroring garbles a password, URL, or address
— even visually — users can copy or retype the wrong thing. Correctness here is as important as the
translation itself.

**Independent Test**: Create items and files with Arabic-only, English-only, and mixed-direction
values (including passwords with leading/trailing symbols such as `!pass-123#`, URLs with paths,
and `192.168.1.20:4000`). View, edit, copy, and preview them in both languages; displayed and
copied values match the originals character for character, in the original order.

**Acceptance Scenarios**:

1. **Given** Arabic is active, **When** an English username, URL, email, password, or server
   address is displayed or typed, **Then** it reads left to right with punctuation and symbols in
   their original positions.
2. **Given** English is active, **When** an Arabic vault title, folder name, or file name is
   displayed, **Then** it reads right to left correctly and does not disturb surrounding English text.
3. **Given** either language, **When** the user copies a password or downloads a file, **Then** the
   copied value or downloaded file name is identical to what was stored.
4. **Given** either language, **When** a text file, CSV, or spreadsheet is previewed, **Then** its
   content keeps the direction of the content itself, not the interface.

---

### User Story 3 - Switch language and have it stick, without a flash (Priority: P2)

A user who prefers a different language than their device opens Settings, chooses English or
العربية, and the whole app changes immediately. After reloading, restarting, signing out, or an
auto-lock, Lockly opens directly in the chosen language and direction — never showing a frame of
the other language or a layout that jumps from left-to-right to right-to-left.

**Why this priority**: Needed by bilingual users and by anyone whose device language differs from
their preference; builds on Story 1.

**Independent Test**: On an Arabic device choose English in Settings; the app turns English and
left-to-right immediately. Reload, sign out, and restart; every launch shows English from the first
frame. Repeat in reverse on an English device.

**Acceptance Scenarios**:

1. **Given** the user is on Settings, **When** they choose a language, **Then** all visible text and
   layout direction change immediately, without reloading, signing out, re-locking, or losing
   open dialogs or typed text.
2. **Given** the language options are shown, **When** the user reads them, **Then** each language is
   labelled in its own language ("English", "العربية") so it is recognisable whatever is active.
3. **Given** the user chose a language, **When** they reload, restart, sign out, or the vault
   auto-locks, **Then** the app, including the sign-in and unlock screens, opens in that language
   from the first visible frame.
4. **Given** the user chose a language on one device, **When** they open Lockly on another device,
   **Then** that device uses its own saved choice, or its device language if none.

---

### User Story 4 - Errors and feedback are in my language (Priority: P2)

An Arabic-interface user types a wrong password, uploads a file that is too large, or loses the
connection to their server. The error and confirmation messages they see are in Arabic, even though
the server itself only speaks English.

**Why this priority**: Errors are where users most need to understand what happened; an English
error inside an Arabic app breaks trust. Depends on Story 1.

**Independent Test**: With Arabic active, trigger each known server error (invalid credentials,
wrong master password, locked vault, file too large, not found, rate limited, server unreachable)
and a deliberately unknown error; each shows an Arabic message, and the unknown one shows a generic
Arabic error.

**Acceptance Scenarios**:

1. **Given** Arabic is active, **When** the server responds with any known error message, **Then**
   the user sees the matching Arabic message.
2. **Given** Arabic is active, **When** the server responds with an error message that has no
   translation, **Then** the user sees a generic Arabic error rather than English text.
3. **Given** English is active, **When** any server error occurs, **Then** messages appear exactly as
   they do today.

---

### User Story 5 - Android app behaves the same (Priority: P3)

A user of the Android app gets the same language detection, Settings choice, persistence, mirrored
layout, and translated errors as on the web, including on the server setup screen that appears
before sign-in.

**Why this priority**: Required for platform parity (constitution Principle V); builds on the same
behavior as Stories 1–4.

**Independent Test**: On an Android build with the phone language set to Arabic, complete server
setup, sign in, browse vault and files, and switch to English in Settings; results match the web
walkthrough, including a cold start with no wrong-language frame.

**Acceptance Scenarios**:

1. **Given** an Android phone set to Arabic and no saved choice, **When** the app launches for the
   first time, **Then** the server setup screen is in Arabic and right to left.
2. **Given** the Android app, **When** the user switches language in Settings and relaunches, **Then**
   the chosen language and direction apply from the first frame.
3. **Given** the Android app in Arabic, **When** the user swipes or taps paging controls in the file
   viewer, **Then** "next" and "previous" follow the mirrored direction.

---

### Edge Cases

- Saved language value is missing, unreadable, or not a supported language → device language
  detection applies, falling back to English; no error shown.
- Device lists several preferred languages (e.g., French then Arabic) → the first supported
  language in the device's preference order wins; if none is supported, English.
- Storage is unavailable → the choice applies for the current session only.
- Language is switched while a dialog, file preview, upload in progress, or toast is visible →
  those surfaces update without closing or losing progress; toasts already on screen may finish in
  the previous language.
- The Arabic font cannot be downloaded (offline device, self-hosted server on a LAN without
  internet) → Arabic still renders legibly with correct letter joining using the device's own
  Arabic font.
- Very long Arabic labels or translations longer than English → no clipped or overlapping text in
  navigation, buttons, chips, or dialogs on a 375 px-wide phone screen.
- Keyboard navigation in RTL → arrow keys in horizontal controls (theme switch, language choice,
  sheet tabs, file viewer paging) move in the visual direction of the mirrored layout.
- A value that mixes scripts, e.g. an Arabic title containing an English product name and a
  number → displayed in correct logical order without characters jumping to the wrong end.
- Password field with the reveal toggle → the typed password always reads left to right; the
  reveal button position mirrors with the layout.
- Server returns an English error that includes dynamic parts (e.g., a size limit number) → the
  Arabic message preserves the dynamic value.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST offer two interface languages, English and Arabic, and MUST be able to
  add further languages by supplying their translations without changing individual screens.
- **FR-002**: When no language has been chosen on the device, the app MUST select Arabic if the
  device's preferred languages list Arabic before any other supported language, and English
  otherwise.
- **FR-003**: Users MUST be able to choose the interface language in Settings; each option MUST be
  labelled in its own language.
- **FR-004**: Changing the language MUST take effect immediately across the whole app without a
  reload, sign-out, re-lock, or loss of on-screen state.
- **FR-005**: The language choice MUST persist on the device across reloads, app restarts, sign-out,
  and auto-lock, and MUST NOT require an account, network access, or an unlocked vault.
- **FR-006**: On every launch and reload, the first visible frame MUST already use the resolved
  language and text direction.
- **FR-007**: When Arabic is active, 100% of interface text MUST be in Arabic, including screen
  titles, labels, buttons, placeholders, helper and warning text, navigation, toasts, empty states,
  confirmation dialogs, password strength and generator labels, theme option labels, loading and
  progress text, browser/app title, and accessibility labels. The brand name "Lockly" is exempt.
- **FR-008**: When Arabic is active, the layout MUST mirror: reading order, alignment, navigation
  placement, spacing, and directional icons flip; non-directional icons do not.
- **FR-009**: In the file viewer and any horizontal control, "next/previous" buttons, swipe/arrow-key
  behavior, and keyboard arrow navigation MUST follow the active text direction.
- **FR-010**: User-entered and stored content — vault titles, usernames, emails, URLs, passwords,
  notes, folder names, file names, server addresses, and file contents — MUST display in its own
  natural direction regardless of interface language and MUST never be altered, reordered, or
  reshaped in display, copy, or download.
- **FR-011**: Fields for passwords, emails, URLs, and server addresses MUST always accept and display
  text left to right.
- **FR-012**: Error messages received from the server MUST be shown in the active language: known
  English messages MUST map to their translation (preserving any dynamic values), and unknown
  messages MUST fall back to a generic message in the active language.
- **FR-013**: Messages generated by the app itself (validation, size limits, clipboard, connection
  failures) MUST be translated.
- **FR-014**: Counts shown with words MUST use the grammatically correct form for the number in each
  language, including Arabic dual and plural forms.
- **FR-015**: All displayed numbers, including file sizes, counts, percentages, and password length,
  MUST use Western digits 0–9 in both languages; units MUST be presented in the active language.
- **FR-016**: Arabic text MUST render with a typeface that provides proper Arabic glyphs and letter
  joining, visually consistent with the existing design, and MUST remain legible with correct
  joining when that typeface is unavailable.
- **FR-017**: Both languages MUST meet DESIGN.md contrast, focus-visibility, minimum text size, and
  touch-target rules in light and dark themes.
- **FR-018**: The page/app MUST declare the active language and direction so browsers, the Android
  WebView, and assistive technologies pronounce and lay out content correctly.
- **FR-019**: The web app and Android app MUST offer the same languages, detection, persistence, and
  behavior.
- **FR-020**: This feature MUST NOT change server behavior, API contracts, stored data, or encryption;
  the language choice is a non-secret, device-local display preference.

### Key Entities

- **Language preference**: The language the user chose on this device — English or Arabic — or no
  choice yet. Stored per device, not per account; non-secret.
- **Resolved language**: The language actually displayed, derived from the preference or, when there
  is none, from the device's preferred languages; determines text direction (English → left to
  right, Arabic → right to left).
- **Translation catalog**: The complete set of interface messages for one language, including plural
  forms and known server-error translations; every supported language provides the same set of
  messages.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With Arabic active, a full walkthrough of every screen and dialog listed in FR-007
  finds 0 untranslated interface strings (excluding user content and the brand name).
- **SC-002**: With Arabic active, 100% of screens pass a mirrored-layout review with no misaligned,
  clipped, or overlapping elements on a 375 px-wide phone and a desktop window.
- **SC-003**: Across a test set of at least 20 mixed-direction values (Arabic, English, mixed, and
  symbol-heavy passwords, URLs, and addresses), 100% display and copy character-for-character
  identical to the stored value in both languages.
- **SC-004**: Across 20 consecutive cold launches and reloads per platform with a saved language that
  differs from the device language, 0 launches show a frame in the wrong language or direction.
- **SC-005**: A user can change the language from any signed-in screen in 3 interactions or fewer.
- **SC-006**: 100% of known server error messages display in Arabic when Arabic is active, and an
  unknown error displays a generic Arabic message.
- **SC-007**: Adding a third test language requires supplying only its translations; 0 screens need
  to be modified.
- **SC-008**: A native Arabic reader rates the interface wording as clear and natural on every
  screen, with no machine-translation errors reported in review.
- **SC-009**: 100% of text/surface pairs in both languages and both themes meet DESIGN.md contrast
  thresholds, and the keyboard-only walkthrough in DESIGN.md §11 completes in Arabic with a visible
  focus indicator at every step.

## Assumptions

- **Languages in scope**: English (default and fallback) and Modern Standard Arabic. Regional Arabic
  dialects, other RTL languages (Hebrew, Persian, Urdu), and a third language are out of scope, but
  the design must not preclude them (FR-001).
- **Detection**: "Device language" means the browser's or Android system's ordered list of preferred
  languages; any Arabic regional variant counts as Arabic.
- **Choice location**: The language control lives in Settings, as requested. Pre-sign-in screens
  honor the detected or saved language but do not show a language control; an English-device user
  who wants Arabic switches after signing in.
- **Per-device preference**: The language choice is stored on each device/browser and is not synced
  to the account, consistent with "no server or API changes" and matching the theme preference.
- **Server errors**: Translation covers the finite set of error messages the current server sends;
  new server messages added later appear as the generic fallback until a translation is added.
- **Digits and units**: Western digits 0–9 everywhere (chosen by the product owner); file size units
  are shown with Arabic abbreviations in Arabic mode.
- **Dates**: Any displayed dates use the active language's month/day names with Western digits and
  the Gregorian calendar.
- **User content is never translated**: vault data, file names, and file contents appear as stored.
- **Out of scope**: translating README/DESIGN/deployment documentation, server logs, the Android
  launcher label and splash screen, and the `specs/` documents.
- **Font availability**: A web font with Arabic glyphs is preferred for visual consistency; when it
  cannot load, the device's built-in Arabic font is acceptable (FR-016).
- **Translation quality**: Translations are written or reviewed by a fluent Arabic speaker before
  release (SC-008); machine translation alone is not sufficient.
- **Security posture**: The language preference is non-secret display data; storing it unencrypted
  on the device is consistent with constitution Principle I.
