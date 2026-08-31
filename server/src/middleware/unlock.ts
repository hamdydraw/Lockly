import type { NextFunction, Request, Response } from 'express';
import { unlockStore } from '../services/unlockStore.js';
import { HttpError } from './error.js';

/**
 * Requires the vault to be unlocked (master password entered this session).
 * Attaches the decrypted data key to req.dataKey for downstream handlers.
 * Must run after requireAuth.
 */
export function requireUnlocked(req: Request, _res: Response, next: NextFunction): void {
  if (!req.userId) throw new HttpError(401, 'Not authenticated');
  const dataKey = unlockStore.get(req.userId, Date.now());
  if (!dataKey) throw new HttpError(423, 'Vault is locked — enter your master password');
  req.dataKey = dataKey;
  next();
}
