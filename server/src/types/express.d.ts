import 'express';

declare global {
  namespace Express {
    interface Request {
      /** Set by requireAuth once the JWT is verified. */
      userId?: string;
      /** Set by requireUnlocked — the decrypted per-user data key for this request. */
      dataKey?: Buffer;
    }
  }
}
