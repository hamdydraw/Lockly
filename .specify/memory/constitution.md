<!--
Sync Impact Report
==================
Version change: (template, unversioned) → 1.0.0
Bump rationale: initial ratification; all principles and sections defined for the first time.

Principles defined:
  - [PRINCIPLE_1_NAME] → I. Zero Plaintext Secrets at Rest (NON-NEGOTIABLE)
  - [PRINCIPLE_2_NAME] → II. Reviewed Cryptography Only
  - [PRINCIPLE_3_NAME] → III. Server Tests for Every API Change (NON-NEGOTIABLE)
  - [PRINCIPLE_4_NAME] → IV. Justified Dependencies
  - [PRINCIPLE_5_NAME] → V. Mobile + Web Parity

Added sections:
  - Technology & Security Constraints
  - Development Workflow & Quality Gates
  - Governance

Removed sections: none

Templates:
  ✅ .specify/templates/tasks-template.md — server tests no longer "OPTIONAL" for API changes
  ✅ .specify/templates/plan-template.md — Constitution Check gates are derived from this file;
     no edit needed (Complexity Tracking table is used for Principle IV justifications)
  ✅ .specify/templates/spec-template.md — no mandatory section changes required
  ✅ .specify/templates/checklist-template.md — no constitution references
  ✅ .claude/skills/speckit-*/SKILL.md — generic; no outdated references
  ✅ README.md — consistent (documents encryption model and recovery-escrow tradeoff)

Deferred TODOs: none
-->

# Lockly Constitution

## Core Principles

### I. Zero Plaintext Secrets at Rest (NON-NEGOTIABLE)

Secret values MUST never be persisted unencrypted — not in the database, blob storage,
logs, audit records, caches, backups, client storage, or the repository.

- A "secret" is: any password, card number, PIN, note body, secret field of a vault item,
  file contents, master password, data key (DK), `JWT_SECRET`, or `DATA_ENCRYPTION_KEY`.
- Vault items and files MUST be encrypted with the per-account DK (AES-256-GCM) before
  they are written to SQLite/Postgres or `server/storage/` (or DB blobs when
  `BLOB_STORAGE=db`).
- The decrypted DK MAY exist only in server memory for an unlock session and MUST be
  discarded on lock or inactivity timeout.
- Only explicitly listed non-secret metadata (title, username, URL, folder, filename) MAY
  be stored in plaintext for search. Adding a field to that list requires a constitution
  amendment.
- Master passwords MUST be stored only as argon2 hashes; key material MUST come from the
  environment or a secret manager, never a committed file.
- Logs, error responses, and audit events MUST NOT include secret values.
- The server-side recovery escrow of the DK is a documented, accepted tradeoff (see
  README). Any further weakening of this model needs an amendment.

Rationale: Lockly exists to protect credentials and files; one leak defeats the product.

### II. Reviewed Cryptography Only

All cryptography MUST use vetted primitives (Node `crypto`, argon2) through the
`server/src/services/crypto.ts` boundary. Custom algorithms, hand-rolled constructions,
and ad-hoc crypto calls elsewhere in the codebase are prohibited.

- Any change to encryption, key derivation (scrypt/argon2 parameters), key wrapping,
  IV/nonce generation, token signing, or session/unlock handling MUST be called out in
  the PR description as a crypto change and receive an explicit review before merge.
- IVs/nonces MUST come from a CSPRNG and MUST NOT be reused with the same key.
- Crypto changes MUST keep existing ciphertext decryptable or ship a tested migration.
- `crypto.test.ts` (or sibling tests) MUST cover round-trip, tamper detection (GCM auth
  failure), and wrong-key rejection for any modified path.

Rationale: subtle crypto mistakes are silent and irreversible; review is the only defense.

### III. Server Tests for Every API Change (NON-NEGOTIABLE)

Every change that adds or modifies `/api/*` behavior — routes, middleware (auth, unlock,
rate limiting, errors), or services they depend on — MUST ship with Vitest tests in
`server/` that exercise the changed behavior.

- Tests MUST cover the success path and the relevant failure paths (unauthenticated,
  locked vault, validation error, not found/forbidden).
- `npm test` MUST pass before merge; a failing or skipped test is a blocking defect.
- Bug fixes to the API MUST include a regression test that fails without the fix.
- Client-only changes are exempt from this principle but MUST NOT change the API contract.

Rationale: the server is the security boundary; untested endpoints are unverified guards.

### IV. Justified Dependencies

No new runtime or dev dependency MAY be added to `server/`, `client/`, or the root
workspace without a written justification.

- The justification MUST appear in the feature's `plan.md` (Complexity Tracking) or the
  PR description and state: why it is needed, why existing code/stdlib/current deps are
  insufficient, maintenance/security posture, and bundle/APK size impact for the client.
- Dependencies touching crypto, auth, or file handling additionally fall under Principle II.
- Removing an unused dependency needs no justification and is encouraged.

Rationale: every dependency is supply-chain attack surface inside a password vault.

### V. Mobile + Web Parity

Every user-facing feature MUST work in both the web SPA and the Capacitor Android app.

- Specs MUST state the expected behavior on both platforms; plans MUST note any
  platform-specific implementation (e.g., `@capacitor/filesystem`, `@capacitor/share`
  instead of browser downloads).
- A feature is not done until verified in the browser and in an Android build
  (`npm run android:build`) or the gap is recorded as an explicit, time-bound follow-up
  task in `tasks.md`.
- UI MUST follow `DESIGN.md` tokens and accessibility rules on both platforms.

Rationale: users rely on Lockly on their phone as much as on desktop; a feature that
exists on one platform only is a broken promise.

## Technology & Security Constraints

- Runtime: Node.js ≥ 20.19 (`.nvmrc`); npm workspaces `server` and `client` only.
- Server: Express + TypeScript, Prisma. `server/prisma/schema.prisma` (SQLite) is the
  source of truth; `prisma/postgres/` is derived via `server/scripts/prisma.mjs` and MUST
  NOT be hand-edited independently.
- Client: React + Vite + TypeScript, Tailwind, TanStack Query; Capacitor 7 for Android.
- Crypto: AES-256-GCM for data at rest, scrypt for master-password key wrapping, argon2
  for login hashing — changing any of these is a Principle II change.
- Production MUST be served over HTTPS with `secure` auth cookies; secrets load from the
  environment or a secret manager.
- Schema changes MUST ship as Prisma migrations that work on both SQLite and Postgres.

## Development Workflow & Quality Gates

- Features follow Spec Kit: `/speckit-specify` → (`/speckit-clarify`) → `/speckit-plan` →
  `/speckit-tasks` → (`/speckit-analyze`) → `/speckit-implement` → `/speckit-converge`.
- `plan.md` MUST pass the Constitution Check against Principles I–V before research and
  again after design; any violation is recorded in Complexity Tracking with justification.
- `tasks.md` MUST include server test tasks for every API change (Principle III) and
  Android verification tasks for user-facing work (Principle V).
- Merge gates: `npm run build` succeeds, `npm test` passes, crypto changes carry an
  explicit review (Principle II), new dependencies are justified (Principle IV).

## Governance

This constitution supersedes other practices and guidance in this repository. Where
`README.md`, `DESIGN.md`, or agent guidance conflict with it, this document wins until
amended.

- Amendments: proposed via PR that edits `.specify/memory/constitution.md`, updates the
  Sync Impact Report, and propagates changes to `.specify/templates/*` in the same PR.
- Versioning: semantic — MAJOR for removing or redefining a principle, MINOR for adding a
  principle/section or materially expanding guidance, PATCH for clarifications.
- Compliance: every PR and every `/speckit-plan` / `/speckit-analyze` run MUST check
  adherence; reviewers MUST block non-compliant changes or require a recorded justification.

**Version**: 1.0.0 | **Ratified**: 2026-09-13 | **Last Amended**: 2026-09-13
