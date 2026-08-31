# Deploying Lockly to a public URL (Railway)

Lockly runs as a **single web service**: the Express server serves the built React
app *and* the API (under `/api`) from one origin. You need a host that runs Node and
gives you a **persistent disk** (for the SQLite database and encrypted file blobs).
These steps use [Railway](https://railway.app); Render/Fly.io are similar.

> ⚠️ This is a personal vault. Anyone with the URL can reach the login page. Use a
> strong login **and** master password. Registration auto-closes after the first
> account is created (see `ALLOW_REGISTRATION`).

## 1. Create the project

1. Sign in to Railway with GitHub.
2. **New Project → Deploy from GitHub repo → `hamdydraw/Lockly`**.
3. Railway reads [`railway.json`](railway.json): it runs `npm run build`, then
   `npm start` (which applies DB migrations and boots the server), and health-checks
   `/api/health`.

## 2. Add a persistent volume (critical)

Without this, your vault DB and uploaded files are wiped on every redeploy.

- In the service: **Settings → Volumes → New Volume**, mount path **`/data`**.

## 3. Set environment variables

Service → **Variables** → add:

| Variable              | Value                                                        |
| --------------------- | ------------------------------------------------------------ |
| `DATABASE_URL`        | `file:/data/prod.db`                                         |
| `STORAGE_DIR`         | `/data/storage`                                              |
| `JWT_SECRET`          | 64+ random chars — `openssl rand -base64 48`                 |
| `DATA_ENCRYPTION_KEY` | base64 of 32 bytes — `openssl rand -base64 32`               |
| `NODE_ENV`            | `production`                                                 |
| `JWT_EXPIRES_IN`      | `2h` (optional)                                              |

> 🔑 **Keep `DATA_ENCRYPTION_KEY` safe and unchanged.** It unwraps your data key. If
> you lose it *and* forget your master password, encrypted data is unrecoverable. If
> it leaks, the server-side recovery escrow can be used to decrypt your vault.

Railway sets `PORT` automatically — don't override it.

## 4. First run

1. Deploy. When the health check passes, open the generated URL
   (**Settings → Networking → Generate Domain**), e.g. `https://lockly-xxxx.up.railway.app`.
2. Create your account on the login page (**Create one**). This is the *only* account
   you'll be able to create — registration then closes automatically.
3. Add the domain to your GitHub repo's **About → Website** field.

## 5. Reopening registration (rarely needed)

Set `ALLOW_REGISTRATION=true` in Variables to allow another sign-up, then remove it.

## Notes

- **HTTPS is required** — the auth cookie is `Secure` in production. Railway/Render
  provide TLS automatically; `trust proxy` is already enabled so the cookie works.
- To move off SQLite later, change `provider` in `server/prisma/schema.prisma` to
  `postgresql`, set `DATABASE_URL` to your Postgres URL, and add a managed Postgres
  plugin. App code is unchanged.
- Back up the `/data` volume (DB + `storage/`) periodically.
