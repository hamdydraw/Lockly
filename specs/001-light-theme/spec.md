# Feature Specification: Light Theme

**Feature Branch**: `001-light-theme`

**Created**: 2026-09-13

**Status**: Draft

**Input**: User description: "Add a light theme alongside the existing dark theme, as defined in DESIGN.md. Users can choose System, Light, or Dark in Settings and from a compact control in the sidebar footer; \"System\" follows the device setting and is the default. The choice persists across sessions, applies before first paint with no flash, and works identically in the web app and the Android app (including the status-bar color). Both themes must meet the contrast and accessibility rules in DESIGN.md. No server or API changes."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - App follows my device's appearance (Priority: P1)

A user whose phone or computer is set to light appearance opens Lockly and sees the whole app
in a light theme; a user whose device is set to dark sees the existing dark theme. They never
had to touch a setting. If they change the device appearance while Lockly is open, Lockly
follows.

**Why this priority**: This delivers light mode to every user who wants it with zero effort,
and it is the default behavior. It also requires every screen to have a complete, legible
light appearance, which is the bulk of the value.

**Independent Test**: With no saved preference, set the device to light appearance and open
each screen (Server setup, Sign in/Register, Unlock, Vault, Files, Settings); all render in
the light theme. Switch the device to dark; all render in the dark theme.

**Acceptance Scenarios**:

1. **Given** no saved theme choice and the device set to light appearance, **When** the user
   opens Lockly, **Then** every screen is shown in the light theme.
2. **Given** no saved theme choice and the device set to dark appearance, **When** the user
   opens Lockly, **Then** every screen is shown in the dark theme.
3. **Given** Lockly is open with the "System" choice, **When** the user changes the device
   appearance, **Then** Lockly switches to the matching theme without reload and without
   losing in-progress work (open dialogs, typed text, unlock state).
4. **Given** the device reports no appearance preference, **When** the user opens Lockly with
   the "System" choice, **Then** the dark theme is shown.

---

### User Story 2 - Choose my theme explicitly (Priority: P2)

A user wants Lockly to look a particular way regardless of their device setting. They open
Settings, find an Appearance section, and pick System, Light, or Dark. Alternatively, from any
signed-in screen, they use a compact theme control in the sidebar footer (or its equivalent
on phone) to do the same.

**Why this priority**: Gives control to users whose preference differs from their device, but
the app is already useful in both themes after Story 1.

**Independent Test**: Choose Light in Settings while the device is dark; the app turns light
immediately. Choose Dark from the sidebar control; the app turns dark and the Settings
selection updates to match.

**Acceptance Scenarios**:

1. **Given** the user is on Settings, **When** they select Light, Dark, or System under
   Appearance, **Then** the theme changes immediately and the selected option is visibly and
   programmatically marked as selected.
2. **Given** the user is on any signed-in screen, **When** they use the compact theme control,
   **Then** they can reach all three options (System, Light, Dark) and the theme changes
   immediately.
3. **Given** the user picked Light or Dark explicitly, **When** the device appearance changes,
   **Then** Lockly keeps the explicitly chosen theme.
4. **Given** the user changes the theme from one control, **When** they look at the other
   control, **Then** both show the same current choice.

---

### User Story 3 - My choice sticks, with no flash (Priority: P2)

A user who chose a theme closes Lockly and reopens it later — including after locking,
signing out, or restarting the device. The app opens directly in their chosen theme, and at
no point during startup does the screen flash the other theme.

**Why this priority**: A flash of bright white on a dark-preferring user (or the reverse) at
every launch feels broken and, for a security tool, unpolished; losing the choice makes
Story 2 pointless.

**Independent Test**: Choose Light, fully close and reopen the app (web and Android); it opens
light with no dark frame visible. Repeat with Dark on a light device.

**Acceptance Scenarios**:

1. **Given** the user chose Light, **When** they reload or reopen Lockly, **Then** the first
   visible frame is already in the light theme.
2. **Given** the user chose a theme and then signed out or the vault auto-locked, **When** they
   see the Sign in or Unlock screen, **Then** it is shown in their chosen theme.
3. **Given** the user chose a theme on one device, **When** they open Lockly on a different
   device or browser, **Then** that device uses its own saved choice (or System by default).

---

### User Story 4 - Android app matches, including system bars (Priority: P3)

A user of the Android app gets the same three options and behavior as on the web. The phone's
status bar (and navigation bar area, where the app controls it) matches the active theme so
the app does not look like a light page inside dark system chrome or vice versa, and status
bar icons remain legible.

**Why this priority**: Required for platform parity (constitution Principle V), but builds on
the same theme behavior delivered in Stories 1–3.

**Independent Test**: On an Android build, cycle System/Light/Dark and toggle the device dark
setting; the app content and the status bar color/icons match each time, including at launch.

**Acceptance Scenarios**:

1. **Given** the Android app in the light theme, **When** the user looks at the status bar,
   **Then** it uses the light theme's background color with dark, legible icons.
2. **Given** the Android app in the dark theme, **When** the user looks at the status bar,
   **Then** it uses the dark theme's background color with light, legible icons.
3. **Given** the user changes the theme on Android, **When** the change applies, **Then** the
   status bar updates at the same time as the app content.

---

### Edge Cases

- Saved preference is missing, unreadable, or contains an unexpected value → treated as
  "System" without an error shown to the user.
- Storage is unavailable (e.g., private browsing, storage blocked) → theme choice still works
  for the current session; it silently falls back to "System" on next launch.
- User changes theme while a dialog, file preview, upload progress, or toast is showing → those
  surfaces re-render in the new theme without closing or losing state.
- User has "reduce motion" enabled → theme switches instantly with no animated transition.
- Device appearance changes while the vault is locked or on the Sign in screen with "System"
  selected → the screen follows the device.
- File previews (images, PDFs, text) → the user's file content itself is never recolored; only
  the surrounding app chrome changes theme.
- Content that depends on theme-specific decoration (the dark-mode background effect) → shown
  only in dark; the light theme uses a flat background.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST provide two complete visual themes, Dark and Light, with values for
  every color, surface, border, shadow, and focus style defined in DESIGN.md.
- **FR-002**: Users MUST be able to choose one of three theme options: System, Light, or Dark.
  System MUST be the default when no choice has been saved.
- **FR-003**: When System is selected, the app MUST display the theme matching the device's
  appearance setting, fall back to Dark when the device reports no preference, and follow
  changes to the device setting while the app is open.
- **FR-004**: The theme option MUST be selectable from an Appearance section in Settings and
  from a compact theme control in the sidebar footer on larger screens, with an equivalent,
  reachable control on phone layouts.
- **FR-005**: Changing the theme option MUST take effect immediately, without a reload, without
  signing out or re-locking, and without losing on-screen state.
- **FR-006**: The theme choice MUST persist on the device across reloads, app restarts, sign-out,
  and auto-lock, and MUST NOT require an account, network access, or an unlocked vault.
- **FR-007**: On every launch and reload, the first visible frame MUST already use the resolved
  theme; no frame of the other theme may be displayed.
- **FR-008**: Every screen and shared surface MUST render correctly in both themes: Server setup,
  Sign in/Register, Unlock, Vault (including item editor and password generator), Files
  (including file preview, upload progress, folder dialogs, and delete confirmation), Settings,
  navigation, dialogs, menus, and toasts.
- **FR-009**: In both themes, body text and secondary text MUST meet a contrast ratio of at least
  4.5:1 against the surfaces they appear on; large or secondary UI text and interactive
  boundaries MUST meet at least 3:1, per DESIGN.md.
- **FR-010**: In both themes, every interactive element MUST show a visible focus indicator
  meeting DESIGN.md's focus ring rule when reached by keyboard.
- **FR-011**: The theme controls MUST be keyboard operable, expose their options and current
  selection to assistive technology, and have an accessible name on icon-only variants.
- **FR-012**: Theme meaning MUST be preserved across themes: the brand accent marks brand,
  selection, and primary actions; the security-state color marks encrypted/locked/verified
  states; semantic colors (success, warning, danger) remain distinguishable in both themes.
- **FR-013**: In the Android app, the status bar color and icon contrast MUST match the active
  theme at launch and whenever the theme changes.
- **FR-014**: The web app and Android app MUST offer the same theme options, defaults, and
  behavior.
- **FR-015**: When the user has requested reduced motion, theme changes and theme-specific
  decorative effects MUST not animate.
- **FR-016**: This feature MUST NOT change any server behavior, API, stored vault data, or
  encryption; the theme choice is a non-secret, device-local display preference.

### Key Entities

- **Theme preference**: The user's chosen option — System, Light, or Dark. Stored per device,
  not per account; non-secret; defaults to System.
- **Resolved theme**: The theme actually displayed — Light or Dark — derived from the theme
  preference and, for System, the device's current appearance setting.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the screens and surfaces listed in FR-008 pass visual review in both
  themes on web and Android, with no unreadable text, invisible borders, or dark-only
  artifacts in the light theme.
- **SC-002**: 100% of text/surface pairs defined in DESIGN.md meet the contrast thresholds in
  FR-009 in both themes.
- **SC-003**: Across 20 consecutive cold launches and reloads per platform with a saved choice
  that differs from the device setting, 0 launches show a visible frame of the wrong theme.
- **SC-004**: A user can change the theme from any signed-in screen in 2 interactions or fewer
  using the compact control.
- **SC-005**: After changing the device appearance with System selected, the app reflects the
  new theme within 1 second, without user action.
- **SC-006**: The keyboard-only walkthrough in DESIGN.md §11 (including "change theme") can be
  completed in both themes with a visible focus indicator at every step.
- **SC-007**: The theme choice survives 100% of tested restart, sign-out, and auto-lock cycles
  on both platforms.

## Assumptions

- **Scope boundary**: This feature covers the theme system, the light theme values, the theme
  controls, and applying themed styling to all existing screens. The broader layout and
  component redesign in DESIGN.md §13 (e.g., two-pane vault, renamed components, new mobile
  navigation) is out of scope except where a surface must be restyled to support both themes.
  If the existing layout lacks a sidebar footer on a given screen size, the compact control is
  placed in the nearest equivalent location (e.g., phone top bar or menu).
- **Per-device preference**: The theme choice is stored on each device/browser and is not synced
  across devices or tied to the account, consistent with "no server or API changes".
- **Pre-sign-in screens**: Server setup, Sign in/Register, and Unlock screens honor the saved
  choice or System, but do not themselves show the theme control.
- **Fallback**: When the device reports no appearance preference, Dark is used, matching the
  app's current look.
- **Android chrome**: "Status-bar color" means the Android status bar background and icon
  brightness; the navigation bar is matched only where the app already controls it.
- **Design source of truth**: Exact token values, contrast figures, and focus ring styling come
  from DESIGN.md (version 1.0, 2026-09-10); if DESIGN.md is amended, the amended values apply.
- **Security posture**: The theme preference is non-secret display data, so storing it
  unencrypted on the device is consistent with constitution Principle I.
