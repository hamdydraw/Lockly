# Lockly — Secure Passwords & Files

A self-hosted, single-user vault for sensitive credentials (bank logins, Windows/OS
accounts, cards, notes) and important files — everything encrypted at rest. Premium
dark, security-focused UI (Linear / 1Password vibe).

- **Frontend:** React + Vite + TypeScript, Tailwind, Framer Motion, TanStack Query
- **Backend:** Node + Express + TypeScript, Prisma
- **Database:** SQLite locally (no server needed); Postgres (e.g. free Neon) when hosted
- **Crypto:** AES-256-GCM at rest, master-password unlock, argon2 login hashing

> 🚀 **Want it online for free?** See [DEPLOY.md](DEPLOY.md): Render (free web service)
> + Neon (free Postgres), one click from a Blueprint. The server serves the SPA + API together.

## Prerequisites

- Node.js 20+ (tested on 22)

## Setup

```bash
npm install
```

Create the server env file and generate secrets:

```bash
cd server
node -e "const c=require('crypto');const fs=require('fs');fs.writeFileSync('.env',`DATABASE_URL=\"file:./dev.db\"\nJWT_SECRET=\"${c.randomBytes(48).toString('base64url')}\"\nJWT_EXPIRES_IN=\"2h\"\nDATA_ENCRYPTION_KEY=\"${c.randomBytes(32).toString('base64')}\"\nPORT=4000\nNODE_ENV=development\nCORS_ORIGIN=\"http://localhost:5173\"\n`)"
```

Apply the database schema:

```bash
npm run prisma:migrate --workspace server
```

## Run (development)

From the repo root:

```bash
npm run dev
```

- API: http://localhost:4000
- App: http://localhost:5173

## Test

```bash
npm test
```

## How the encryption works

Each account has a random 256-bit **data key (DK)** that encrypts all vault items and
files (AES-256-GCM). The DK is wrapped two ways:

1. with a key derived from your **master password** (scrypt) — the normal unlock path;
2. with the server's `DATA_ENCRYPTION_KEY` — a **recovery escrow** so a forgotten master
   password can be reset (this was a deliberate product choice).

Non-secret metadata (title, username, URL, folder) is stored in plaintext for search;
all secret values live only inside the encrypted blob. The decrypted DK is held in server
memory during an unlock session and auto-locks after 15 minutes of inactivity.

> **Security tradeoff:** because reset is allowed, the server *can* decrypt data. A future
> zero-knowledge mode (client-side key derivation) would remove that ability at the cost of
> recoverability.

## Production notes

- Serve strictly over **HTTPS**; the auth cookie is marked `secure` when `NODE_ENV=production`.
- Load `DATA_ENCRYPTION_KEY` and `JWT_SECRET` from a secret manager, not a file.
- Point `DATABASE_URL` at a Postgres URL and the build picks the Postgres schema/migrations
  automatically (`server/scripts/prisma.mjs`); `server/prisma/schema.prisma` (SQLite) stays
  the source of truth and `prisma/postgres/` is derived from it.
- Encrypted file blobs live on disk in `server/storage/` by default, or in the database
  (`BLOB_STORAGE=db`) on hosts without a persistent disk. Back up whichever you use.

## Project layout

```
client/   React SPA (dark security UI)
server/   Express API, Prisma, crypto services
server/prisma/schema.prisma   data model
```
