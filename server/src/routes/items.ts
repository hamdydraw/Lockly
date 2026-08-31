import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { requireUnlocked } from '../middleware/unlock.js';
import { audit } from '../services/audit.js';
import { decryptSecret, encryptSecret } from '../services/crypto.js';

export const itemsRouter = Router();

// Every item route needs a logged-in AND unlocked vault.
itemsRouter.use(requireAuth, requireUnlocked);

const ITEM_TYPES = ['LOGIN', 'SECURE_NOTE', 'CARD', 'OTHER'] as const;

// `secret` is a free-form map of sensitive fields (password, cardNumber, cvv, note body…)
// that gets encrypted as a single JSON blob with the user's data key.
const secretSchema = z.record(z.string(), z.string());

const createSchema = z.object({
  type: z.enum(ITEM_TYPES).default('LOGIN'),
  title: z.string().min(1).max(200),
  folder: z.string().max(100).optional().nullable(),
  username: z.string().max(200).optional().nullable(),
  url: z.string().max(500).optional().nullable(),
  secret: secretSchema.default({}),
});

const updateSchema = createSchema.partial();

/** Non-secret fields returned in list views. */
function toMeta(item: {
  id: string;
  type: string;
  title: string;
  folder: string | null;
  username: string | null;
  url: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return item;
}

/** GET /items — list metadata only (secrets stay encrypted). Supports ?q= and ?folder=. */
itemsRouter.get('/', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q : undefined;
  const folder = typeof req.query.folder === 'string' ? req.query.folder : undefined;

  const items = await prisma.vaultItem.findMany({
    where: {
      userId: req.userId!,
      ...(folder ? { folder } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q } },
              { username: { contains: q } },
              { url: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      type: true,
      title: true,
      folder: true,
      username: true,
      url: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  res.json(items.map(toMeta));
});

/** GET /items/:id — returns metadata + decrypted secret. */
itemsRouter.get('/:id', async (req, res) => {
  const item = await prisma.vaultItem.findFirst({
    where: { id: req.params.id, userId: req.userId! },
  });
  if (!item) throw new HttpError(404, 'Item not found');

  const secret = JSON.parse(
    decryptSecret(
      { iv: item.iv, authTag: item.authTag, ciphertext: item.ciphertext },
      req.dataKey!,
    ),
  );
  await audit(req, req.userId!, 'item_view', item.id);
  res.json({
    id: item.id,
    type: item.type,
    title: item.title,
    folder: item.folder,
    username: item.username,
    url: item.url,
    secret,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  });
});

/** POST /items — create an encrypted item. */
itemsRouter.post('/', async (req, res) => {
  const body = createSchema.parse(req.body);
  const sealed = encryptSecret(JSON.stringify(body.secret), req.dataKey!);

  const item = await prisma.vaultItem.create({
    data: {
      userId: req.userId!,
      type: body.type,
      title: body.title,
      folder: body.folder ?? null,
      username: body.username ?? null,
      url: body.url ?? null,
      ciphertext: sealed.ciphertext,
      iv: sealed.iv,
      authTag: sealed.authTag,
    },
    select: { id: true },
  });
  await audit(req, req.userId!, 'item_create', item.id);
  res.status(201).json({ id: item.id });
});

/** PUT /items/:id — update metadata and/or re-encrypt the secret. */
itemsRouter.put('/:id', async (req, res) => {
  const body = updateSchema.parse(req.body);
  const existing = await prisma.vaultItem.findFirst({
    where: { id: req.params.id, userId: req.userId! },
    select: { id: true },
  });
  if (!existing) throw new HttpError(404, 'Item not found');

  const data: Record<string, unknown> = {};
  if (body.type !== undefined) data.type = body.type;
  if (body.title !== undefined) data.title = body.title;
  if (body.folder !== undefined) data.folder = body.folder;
  if (body.username !== undefined) data.username = body.username;
  if (body.url !== undefined) data.url = body.url;
  if (body.secret !== undefined) {
    const sealed = encryptSecret(JSON.stringify(body.secret), req.dataKey!);
    data.ciphertext = sealed.ciphertext;
    data.iv = sealed.iv;
    data.authTag = sealed.authTag;
  }

  await prisma.vaultItem.update({ where: { id: existing.id }, data });
  await audit(req, req.userId!, 'item_update', existing.id);
  res.json({ ok: true });
});

/** DELETE /items/:id */
itemsRouter.delete('/:id', async (req, res) => {
  const existing = await prisma.vaultItem.findFirst({
    where: { id: req.params.id, userId: req.userId! },
    select: { id: true },
  });
  if (!existing) throw new HttpError(404, 'Item not found');
  await prisma.vaultItem.delete({ where: { id: existing.id } });
  await audit(req, req.userId!, 'item_delete', existing.id);
  res.json({ ok: true });
});
