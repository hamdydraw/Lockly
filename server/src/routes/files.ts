import crypto from 'node:crypto';
import { Router } from 'express';
import multer from 'multer';
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

/** POST /files — upload one file (field name "file"); stored encrypted at rest. */
filesRouter.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) throw new HttpError(400, 'No file uploaded (use form field "file")');

  const id = crypto.randomUUID();
  const sealed = seal(req.file.buffer, req.dataKey!);
  await writeBlob(id, Buffer.from(sealed.ciphertext, 'base64'));

  const record = await prisma.storedFile.create({
    data: {
      id,
      userId: req.userId!,
      filename: req.file.originalname,
      mimeType: req.file.mimetype || 'application/octet-stream',
      sizeBytes: req.file.size,
      storagePath: id,
      iv: sealed.iv,
      authTag: sealed.authTag,
    },
    select: { id: true, filename: true, sizeBytes: true },
  });
  await audit(req, req.userId!, 'file_upload', record.id);
  res.status(201).json(record);
});

/** GET /files — list file metadata. */
filesRouter.get('/', async (req, res) => {
  const files = await prisma.storedFile.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      filename: true,
      mimeType: true,
      sizeBytes: true,
      createdAt: true,
    },
  });
  res.json(files);
});

/** GET /files/:id/download — decrypt and stream the original bytes. */
filesRouter.get('/:id/download', async (req, res) => {
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

  await audit(req, req.userId!, 'file_download', file.id);
  res.setHeader('Content-Type', file.mimeType);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${encodeURIComponent(file.filename)}"`,
  );
  res.send(plaintext);
});

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
