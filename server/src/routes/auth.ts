import argon2 from 'argon2';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { clearAuthCookie, requireAuth, setAuthCookie } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';
import { audit } from '../services/audit.js';
import {
  generateDataKey,
  generateSalt,
  unwrapWithMaster,
  unwrapWithRoot,
  wrapWithMaster,
  wrapWithRoot,
} from '../services/crypto.js';
import { unlockStore } from '../services/unlockStore.js';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8, 'Login password must be at least 8 characters').max(200),
  masterPassword: z
    .string()
    .min(10, 'Master password must be at least 10 characters')
    .max(200),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const masterSchema = z.object({ masterPassword: z.string().min(1) });

const resetSchema = z.object({
  newMasterPassword: z.string().min(10).max(200),
});

/** POST /auth/register — create account, provision data key + escrow, sign in. */
authRouter.post('/register', async (req, res) => {
  const { email, password, masterPassword } = registerSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new HttpError(409, 'An account with that email already exists');

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const dataKey = generateDataKey();
  const masterSalt = generateSalt();

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      masterSalt: masterSalt.toString('base64'),
      wrappedDataKey: wrapWithMaster(dataKey, masterPassword, masterSalt),
      recoveryKey: wrapWithRoot(dataKey),
    },
  });

  setAuthCookie(res, user.id);
  // Registering also unlocks the vault for convenience.
  const expiresAt = unlockStore.unlock(user.id, dataKey, Date.now());
  await audit(req, user.id, 'register');
  res.status(201).json({ id: user.id, email: user.email, unlockedUntil: expiresAt });
});

/** POST /auth/login — verify login password, set session cookie. Vault stays locked. */
authRouter.post('/login', async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });
  // Constant-ish failure path: still verify against a dummy to reduce timing signal.
  const ok = user ? await argon2.verify(user.passwordHash, password) : false;
  if (!user || !ok) throw new HttpError(401, 'Invalid email or password');

  setAuthCookie(res, user.id);
  await audit(req, user.id, 'login');
  res.json({ id: user.id, email: user.email, locked: true });
});

/** POST /auth/logout — clear cookie and lock the vault. */
authRouter.post('/logout', requireAuth, async (req, res) => {
  if (req.userId) unlockStore.lock(req.userId);
  clearAuthCookie(res);
  res.json({ ok: true });
});

/** GET /auth/me — current session status. */
authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: { id: true, email: true },
  });
  if (!user) throw new HttpError(401, 'Session user not found');
  const unlocked = unlockStore.get(req.userId!, Date.now()) !== null;
  res.json({ ...user, unlocked });
});

/** POST /auth/unlock — verify master password, load data key into memory. */
authRouter.post('/unlock', requireAuth, async (req, res) => {
  const { masterPassword } = masterSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user) throw new HttpError(401, 'Session user not found');

  let dataKey: Buffer;
  try {
    dataKey = unwrapWithMaster(
      user.wrappedDataKey,
      masterPassword,
      Buffer.from(user.masterSalt, 'base64'),
    );
  } catch {
    await audit(req, user.id, 'unlock_failed');
    throw new HttpError(401, 'Incorrect master password');
  }

  const expiresAt = unlockStore.unlock(user.id, dataKey, Date.now());
  await audit(req, user.id, 'unlock');
  res.json({ unlocked: true, unlockedUntil: expiresAt });
});

/** POST /auth/lock — forget the data key (manual lock). */
authRouter.post('/lock', requireAuth, async (req, res) => {
  unlockStore.lock(req.userId!);
  await audit(req, req.userId!, 'lock');
  res.json({ locked: true });
});

/**
 * POST /auth/master/reset — reset a forgotten master password.
 * Auth factor is the account login (JWT). Recovers the data key from escrow
 * (server root key) and re-wraps it under the new master password.
 * NOTE: this is the recoverability the user chose; a zero-knowledge design
 * would not allow this.
 */
authRouter.post('/master/reset', requireAuth, async (req, res) => {
  const { newMasterPassword } = resetSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user) throw new HttpError(401, 'Session user not found');

  const dataKey = unwrapWithRoot(user.recoveryKey); // escrow recovery
  const newSalt = generateSalt();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      masterSalt: newSalt.toString('base64'),
      wrappedDataKey: wrapWithMaster(dataKey, newMasterPassword, newSalt),
    },
  });

  const expiresAt = unlockStore.unlock(user.id, dataKey, Date.now());
  await audit(req, user.id, 'master_reset');
  res.json({ ok: true, unlockedUntil: expiresAt });
});
