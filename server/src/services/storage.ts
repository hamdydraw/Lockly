import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * File blob storage abstraction. Encrypted bytes are written to server/storage/.
 * Swap this module for S3/R2 later without touching the routes.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_DIR = path.resolve(__dirname, '..', '..', 'storage');

async function ensureDir(): Promise<void> {
  await fs.mkdir(STORAGE_DIR, { recursive: true });
}

/** Absolute path for a stored blob id (also guards against path traversal). */
function blobPath(id: string): string {
  const safe = path.basename(id); // strip any directory components
  return path.join(STORAGE_DIR, safe);
}

export async function writeBlob(id: string, bytes: Buffer): Promise<string> {
  await ensureDir();
  const p = blobPath(id);
  await fs.writeFile(p, bytes);
  return p;
}

export async function readBlob(id: string): Promise<Buffer> {
  return fs.readFile(blobPath(id));
}

export async function deleteBlob(id: string): Promise<void> {
  await fs.rm(blobPath(id), { force: true });
}
