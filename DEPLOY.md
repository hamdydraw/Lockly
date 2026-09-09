# Put Lockly online for free (Render + Neon)

You do not need your own server. Two free services do the job:

| Service | What it does | Cost |
| ------- | ------------ | ---- |
| [Neon](https://neon.tech) | Hosts the database (your vault entries **and** your files) | Free, no credit card |
| [Render](https://render.com) | Runs the Lockly app and gives you an `https://….onrender.com` address | Free, no credit card |

Lockly runs as **one web service**: the server serves the app *and* the API from one
address. Files are stored inside the database (`BLOB_STORAGE=db`), so nothing depends on
the server's disk, which Render's free plan wipes on every deploy.

> ⚠️ This is a personal vault. Anyone with the URL can reach the login page. Use a
> strong login password **and** a strong master password. Registration closes
> automatically after the first account is created.

Total time: about 15 minutes. You only need a GitHub account (the one that owns the
`hamdydraw/Lockly` repository).

---

## Step 1 — Create the free database (Neon)

1. Go to <https://neon.tech> and click **Sign up**, choose **Continue with GitHub**.
2. Click **New project**.
   - Project name: `lockly`
   - Region: pick the one closest to you, for example **Europe (Frankfurt)**.
     Remember this choice for Step 2.
   - Leave everything else as default. Click **Create project**.
3. On the project page click **Connect** (or "Connection string").
   - **Turn OFF "Pooled connection"** (the app's migrations need a direct connection).
   - Make sure the format is **Prisma** or plain **Connection string**; either works.
   - Click the copy icon. It looks like:
     ```
     postgresql://neondb_owner:npg_xxxxxxxx@ep-cool-name-a1b2c3d4.eu-central-1.aws.neon.tech/neondb?sslmode=require
     ```
4. Paste it into a note for now. You will need it once, in Step 2.

That is the whole database setup. Tables are created automatically the first time
Lockly starts.

## Step 2 — Deploy the app (Render)

1. Go to <https://render.com> and click **Get started**, choose **GitHub**.
   Allow Render to see the `Lockly` repository when asked.
2. In the Render dashboard click **New +** → **Blueprint**.
3. Select the **`hamdydraw/Lockly`** repository and click **Connect**.
   Render reads [`render.yaml`](render.yaml) from the repo and shows one service named
   **lockly**.
4. Render asks for the values it cannot generate itself. There is just one:
   - **DATABASE_URL** → paste the Neon connection string from Step 1.

   `JWT_SECRET` and `DATA_ENCRYPTION_KEY` are generated for you.
5. If you picked a Neon region other than Frankfurt, change the **region** to match
   (this can also be edited later in `render.yaml`).
6. Click **Apply**. The first build takes 5–8 minutes. Wait until the service shows
   **Live** with a green dot.

## Step 3 — First login

1. Open the address shown at the top of the service page, e.g.
   `https://lockly-xxxx.onrender.com`.
2. Click **Create one** and create your account: an email, a login password, and a
   master password. **This is the only account that can be created**; registration then
   closes by itself.
3. Add a test entry and upload a small file to confirm everything works.

## Step 4 — Back up your two secret keys (important)

In Render, open the **lockly** service → **Environment**. Copy the values of
**`DATA_ENCRYPTION_KEY`** and **`JWT_SECRET`** and store them somewhere safe *outside*
Lockly (for example, a printed note or another password manager).

- `DATA_ENCRYPTION_KEY` is what lets the server reset a forgotten master password. If
  Render ever loses it **and** you forget your master password, your encrypted data
  cannot be recovered.
- If you ever recreate the Render service, paste the **same** two values back in.

## Step 5 — Connect the Android app

Open the Lockly app on your phone. On the server screen, enter your Render address
(for example `https://lockly-xxxx.onrender.com`) and log in. Details in
[ANDROID.md](ANDROID.md).

---

## What "free" means in practice

- **The app sleeps after 15 minutes without visitors.** The next visit takes about a
  minute to load while Render wakes it up. After a wake-up you will be asked for your
  master password again (the unlocked key is kept only in memory, by design).
- **Files up to 10 MB each**, about 0.5 GB in total (Neon's free storage limit).
- Render allows 750 hours per month, enough for the app to be awake all month.
- Neon pauses its database after 5 minutes idle and wakes it in about a second; you
  will not notice.

### Optional: keep the app awake

If the one-minute wake-up bothers you, have a free service ping it:

1. Sign up at <https://cron-job.org> (free).
2. Create a job with URL `https://lockly-xxxx.onrender.com/api/health`, every **14 minutes**.

Only ever ping `/api/health`. It does not touch the database, so it keeps Render awake
without eating into Neon's free compute hours.

## Updating Lockly

Push to the `main` branch on GitHub. Render rebuilds and redeploys automatically, and
database migrations run on start. Your data is untouched by redeploys.

## Troubleshooting

| Symptom | Fix |
| ------- | --- |
| Build fails with "Missing required environment variable: DATABASE_URL" | Environment → add `DATABASE_URL` with the Neon string. |
| Deploy log shows `DATA_ENCRYPTION_KEY must decode to 32 bytes` | The value was edited. Use the generated one, or run `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` and paste the output. |
| "Can't reach the Lockly server" in the Android app | The app was asleep: wait a minute and retry, or set up the keep-awake job. |
| Login says registration is closed | Expected after the first account. To allow one more sign-up temporarily, add `ALLOW_REGISTRATION=true` in Environment, sign up, then remove it. |
| Neon project shows as "Paused"/"Idle" | Normal. It wakes on the next request. |

---

## Appendix A — Railway (paid alternative, persistent disk)

Railway is not free anymore (about $5/month), but it offers a persistent volume so the
original SQLite + on-disk file layout works without Postgres. [`railway.json`](railway.json)
is still in the repo.

1. Railway → **New Project → Deploy from GitHub repo → `hamdydraw/Lockly`**.
2. **Settings → Volumes → New Volume**, mount path `/data`.
3. **Variables**:

   | Variable | Value |
   | -------- | ----- |
   | `DATABASE_URL` | `file:/data/prod.db` |
   | `STORAGE_DIR` | `/data/storage` |
   | `BLOB_STORAGE` | `disk` |
   | `JWT_SECRET` | 64+ random chars |
   | `DATA_ENCRYPTION_KEY` | base64 of 32 random bytes |
   | `NODE_ENV` | `production` |

4. **Settings → Networking → Generate Domain**, then create your account.

## Appendix B — For developers: changing the database schema

`server/prisma/schema.prisma` (SQLite) is the source of truth. `server/prisma/postgres/`
is **derived** from it by `server/scripts/prisma.mjs`, which every Prisma npm script runs
through; it picks the schema from the `DATABASE_URL` prefix. After editing the schema:

```bash
# 1. SQLite migration (local dev database)
npm run prisma:migrate --workspace server -- --name my_change

# 2. Postgres migration — generated offline by diffing against the last committed schema
npm run prisma:pg-migration --workspace server -- my_change

# 3. Commit both migration folders plus prisma/postgres/schema.prisma
```

Render applies the Postgres migrations on the next deploy (`prisma migrate deploy`).
