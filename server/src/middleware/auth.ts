import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../env.js';
import { HttpError } from './error.js';

const COOKIE_NAME = 'token';

export function signToken(userId: string): string {
  const options: jwt.SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  };
  return jwt.sign({ sub: userId }, env.JWT_SECRET, options);
}

/** Sets the auth JWT as an httpOnly cookie (not readable by page JS → XSS-resistant). */
export function setAuthCookie(res: Response, userId: string): void {
  res.cookie(COOKIE_NAME, signToken(userId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 7, // cookie lifetime; JWT itself expires sooner
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME);
}

/**
 * True when the caller wants the JWT in the response body instead of a cookie.
 * The Android build is a WebView on its own origin, so a SameSite=lax cookie is
 * never sent back; it opts in with this header and uses `Authorization: Bearer`.
 * Browsers keep the httpOnly cookie (unreadable by page JS) by not opting in.
 */
export function wantsBodyToken(req: Request): boolean {
  return req.headers['x-auth-mode'] === 'token';
}

/** Verifies the JWT from the cookie (or Bearer header) and sets req.userId. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const bearer = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : undefined;
  const token = req.cookies?.[COOKIE_NAME] ?? bearer;
  if (!token) throw new HttpError(401, 'Not authenticated');

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string };
    req.userId = payload.sub;
    next();
  } catch {
    throw new HttpError(401, 'Invalid or expired session');
  }
}
