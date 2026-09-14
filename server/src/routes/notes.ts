import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { requireUnlocked } from '../middleware/unlock.js';
import { audit } from '../services/audit.js';
import { decryptSecret, encryptSecret } from '../services/crypto.js';

/**
 * Sticky notes. Unlike vault items, the board shows every note's text at a
 * glance, so the list endpoint returns decrypted bodies. That is the same
 * trust boundary as GET /items/:id — an unlocked vault — just for all notes
 * at once, which lets the client search inside notes without a round trip.
 */
export const notesRouter = Router();

notesRouter.use(requireAuth, requireUnlocked);

/** Paper colours. Must match NOTE_COLORS in client/src/lib/notes.ts. */
export const NOTE_COLORS = ['amber', 'rose', 'sky', 'mint', 'lilac', 'slate'] as const;

const MAX_BODY = 20_000;

const createSchema = z.object({
  title: z.string().max(200).default(''),
  body: z.string().max(MAX_BODY).default(''),
  color: z.enum(NOTE_COLORS).default('amber'),
  pinned: z.boolean().default(false),
  // Mask the body until revealed, like a password field.
  hidden: z.boolean().default(false),
});

const updateSchema = createSchema.partial();

type NoteRow = {
  id: string;
  title: string;
  color: string;
  pinned: boolean;
  hidden: boolean;
  ciphertext: string;
  iv: string;
  authTag: string;
  createdAt: Date;
  updatedAt: Date;
};

function toNote(row: NoteRow, dataKey: Buffer) {
  return {
    id: row.id,
    title: row.title,
    body: decryptSecret({ iv: row.iv, authTag: row.authTag, ciphertext: row.ciphertext }, dataKey),
    color: row.color,
    pinned: row.pinned,
    hidden: row.hidden,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** GET /notes — every note with its decrypted body, pinned first, newest first. */
notesRouter.get('/', async (req, res) => {
  const rows = await prisma.note.findMany({
    where: { userId: req.userId! },
    orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
  });
  res.json(rows.map((row) => toNote(row, req.dataKey!)));
});

/** POST /notes — create; returns the full note so the board can show it immediately. */
notesRouter.post('/', async (req, res) => {
  const body = createSchema.parse(req.body);
  const sealed = encryptSecret(body.body, req.dataKey!);

  const row = await prisma.note.create({
    data: {
      userId: req.userId!,
      title: body.title,
      color: body.color,
      pinned: body.pinned,
      hidden: body.hidden,
      ciphertext: sealed.ciphertext,
      iv: sealed.iv,
      authTag: sealed.authTag,
    },
  });
  await audit(req, req.userId!, 'note_create', row.id);
  res.status(201).json(toNote(row, req.dataKey!));
});

/** PATCH /notes/:id — partial update (title, body, colour, pin). Returns the full note. */
notesRouter.patch('/:id', async (req, res) => {
  const body = updateSchema.parse(req.body);
  const existing = await prisma.note.findFirst({
    where: { id: req.params.id, userId: req.userId! },
    select: { id: true },
  });
  if (!existing) throw new HttpError(404, 'Note not found');

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.color !== undefined) data.color = body.color;
  if (body.pinned !== undefined) data.pinned = body.pinned;
  if (body.hidden !== undefined) data.hidden = body.hidden;
  if (body.body !== undefined) {
    const sealed = encryptSecret(body.body, req.dataKey!);
    data.ciphertext = sealed.ciphertext;
    data.iv = sealed.iv;
    data.authTag = sealed.authTag;
  }

  const row = await prisma.note.update({ where: { id: existing.id }, data });
  await audit(req, req.userId!, 'note_update', row.id);
  res.json(toNote(row, req.dataKey!));
});

/** DELETE /notes/:id */
notesRouter.delete('/:id', async (req, res) => {
  const existing = await prisma.note.findFirst({
    where: { id: req.params.id, userId: req.userId! },
    select: { id: true },
  });
  if (!existing) throw new HttpError(404, 'Note not found');
  await prisma.note.delete({ where: { id: existing.id } });
  await audit(req, req.userId!, 'note_delete', existing.id);
  res.json({ ok: true });
});
