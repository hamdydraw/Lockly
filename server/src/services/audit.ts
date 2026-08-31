import type { Request } from 'express';
import { prisma } from '../db/prisma.js';

/** Records a security-relevant action. Best-effort — never throws into the request path. */
export async function audit(
  req: Request,
  userId: string,
  action: string,
  itemId?: string,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        itemId: itemId ?? null,
        ip: req.ip ?? null,
        userAgent: req.headers['user-agent'] ?? null,
      },
    });
  } catch (err) {
    console.error('[audit] failed to record', action, err);
  }
}
