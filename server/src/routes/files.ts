import crypto from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { requireUnlocked } from '../middleware/unlock.js';
import { audit } from '../services/audit.js';
import { open, seal } from '../services/crypto.js';
import { deleteBlob, readBlob, writeBlob } from '../services/storage.js';

export const filesRouter = Router();

// In-memory upload → encrypt → persist. 10 MB cap: the Prisma engine round-trips bytes as
// base64 JSON, so a single upload transiently costs ~6× its size in RAM on a 512 MB host.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

filesRouter.use(requireAuth, requireUnlocked);

// Folder names are plain labels (one level). Empty/whitespace means "no folder".
const folderSchema = z
  .string()
  .trim()
  .max(100)
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional();

const FILE_META_SELECT = {
  id: true,
  filename: true,
  folder: true,
  mimeType: true,
  sizeBytes: true,
  createdAt: true,
} as const;

/** POST /files — upload one file (field name "file"); stored encrypted at rest. */
filesRouter.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) throw new HttpError(400, 'No file uploaded (use form field "file")');

  // multer parses text fields alongside the file; folder is optional.
  const folder = folderSchema.parse(typeof req.body?.folder === 'string' ? req.body.folder : undefined) ?? null;

  const id = crypto.randomUUID();
  const sealed = seal(req.file.buffer, req.dataKey!);
  await writeBlob(id, Buffer.from(sealed.ciphertext, 'base64'));

  const record = await prisma.storedFile.create({
    data: {
      id,
      userId: req.userId!,
      filename: req.file.originalname,
      folder,
      mimeType: req.file.mimetype || 'application/octet-stream',
      sizeBytes: req.file.size,
      storagePath: id,
      iv: sealed.iv,
      authTag: sealed.authTag,
    },
    select: FILE_META_SELECT,
  });
  await audit(req, req.userId!, 'file_upload', record.id);
  res.status(201).json(record);
});

/** GET /files — list file metadata. */
filesRouter.get('/', async (req, res) => {
  const files = await prisma.storedFile.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: 'desc' },
    select: FILE_META_SELECT,
  });
  res.json(files);
});

/** PATCH /files/:id — move a file to a folder (null/empty clears it). */
filesRouter.patch('/:id', async (req, res) => {
  const body = z.object({ folder: folderSchema }).parse(req.body);
  const file = await prisma.storedFile.findFirst({
    where: { id: req.params.id, userId: req.userId! },
    select: { id: true },
  });
  if (!file) throw new HttpError(404, 'File not found');

  const updated = await prisma.storedFile.update({
    where: { id: file.id },
    data: { folder: body.folder ?? null },
    select: FILE_META_SELECT,
  });
  await audit(req, req.userId!, 'file_move', file.id);
  res.json(updated);
});

/**
 * Decrypts a file the caller owns and sends the original bytes. `disposition`
 * distinguishes a download (saved to disk) from a preview (rendered in-app);
 * both are audited under their own action so the log tells them apart.
 */
async function sendPlaintext(
  req: Request,
  res: Response,
  disposition: 'attachment' | 'inline',
) {
  const file = await prisma.storedFile.findFirst({
    where: { id: req.params.id, userId: req.userId! },
  });
  if (!file) throw new HttpError(404, 'File not found');

  const ciphertext = await readBlob(file.storagePath);
  const plaintext = open(
    {
      iv: file.iv,
      authTag: file.authTag,
      ciphertext: ciphertext.toString('base64'),
    },
    req.dataKey!,
  );

  await audit(req, req.userId!, disposition === 'inline' ? 'file_preview' : 'file_download', file.id);
  res.setHeader('Content-Type', file.mimeType);
  // The client renders previews itself from the response body; declaring the
  // MIME type as authoritative keeps browsers from sniffing it into something else.
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader(
    'Content-Disposition',
    `${disposition}; filename="${encodeURIComponent(file.filename)}"`,
  );
  res.send(plaintext);
}

/** GET /files/:id/download — decrypt and stream the original bytes as an attachment. */
filesRouter.get('/:id/download', (req, res) => sendPlaintext(req, res, 'attachment'));

/** GET /files/:id/content — decrypt and stream the original bytes for in-app preview. */
filesRouter.get('/:id/content', (req, res) => sendPlaintext(req, res, 'inline'));

/** DELETE /files/:id */
filesRouter.delete('/:id', async (req, res) => {
  const file = await prisma.storedFile.findFirst({
    where: { id: req.params.id, userId: req.userId! },
    select: { id: true, storagePath: true },
  });
  if (!file) throw new HttpError(404, 'File not found');

  await deleteBlob(file.storagePath);
  await prisma.storedFile.delete({ where: { id: file.id } });
  await audit(req, req.userId!, 'file_delete', file.id);
  res.json({ ok: true });
});
