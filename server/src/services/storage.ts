import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma } from '../db/prisma.js';
import { HttpError } from '../middleware/error.js';

/**
 * Encrypted file-blob storage. Two interchangeable backends behind one interface,
 * so routes/files.ts never cares where bytes live:
 *
 *   disk  — server/storage/ (or STORAGE_DIR). Needs a persistent disk; the default
 *           for local SQLite dev and self-hosted servers.
 *   db    — the `Blob` table. For hosts with no persistent disk (Render free + Neon):
 *           bytes survive redeploys because they live next to the metadata.
 *
 * Selected by BLOB_STORAGE; defaults to `db` whenever the database itself is not a
 * local SQLite file, which is exactly the hosted case.
 */
type Backend = 'disk' | 'db';

function pickBackend(): Backend {
  const explicit = process.env.BLOB_STORAGE?.trim().toLowerCase();
  if (explicit === 'disk' || explicit === 'db') return explicit;
  return (process.env.DATABASE_URL ?? '').startsWith('file:') ? 'disk' : 'db';
}

export const blobBackend: Backend = pickBackend();

// ---- disk backend ----

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_DIR = process.env.STORAGE_DIR
  ? path.resolve(process.env.STORAGE_DIR)
  : path.resolve(__dirname, '..', '..', 'storage');

async function ensureDir(): Promise<void> {
  await fs.mkdir(STORAGE_DIR, { recursive: true });
}

/** Absolute path for a stored blob id (also guards against path traversal). */
function blobPath(id: string): string {
  const safe = path.basename(id); // strip any directory components
  return path.join(STORAGE_DIR, safe);
}

// ---- public API ----

/** Persist encrypted bytes under `id`. Returns the backend-specific location. */
export async function writeBlob(id: string, bytes: Buffer): Promise<string> {
  if (blobBackend === 'db') {
    await prisma.blob.upsert({
      where: { id },
      create: { id, data: bytes },
      update: { data: bytes },
    });
    return id;
  }
  await ensureDir();
  const p = blobPath(id);
  await fs.writeFile(p, bytes);
  return p;
}

export async function readBlob(id: string): Promise<Buffer> {
  if (blobBackend === 'db') {
    const row = await prisma.blob.findUnique({ where: { id }, select: { data: true } });
    if (!row) throw new HttpError(404, 'File data not found');
    return Buffer.from(row.data);
  }
  return fs.readFile(blobPath(id));
}

/** Idempotent: deleting a missing blob is not an error. */
export async function deleteBlob(id: string): Promise<void> {
  if (blobBackend === 'db') {
    await prisma.blob.deleteMany({ where: { id } });
    return;
  }
  await fs.rm(blobPath(id), { force: true });
}
