import { PrismaClient } from '@prisma/client';
import { env } from '../env.js';

/**
 * Hosted Postgres (Neon) suspends idle compute and takes a few seconds to wake,
 * longer than Prisma's 5 s default connect timeout. Add a generous one unless the
 * URL already sets it. SQLite URLs are passed through untouched.
 */
function withConnectTimeout(url: string): string {
  if (!/^postgres(ql)?:\/\//i.test(url) || /[?&]connect_timeout=/.test(url)) return url;
  return `${url}${url.includes('?') ? '&' : '?'}connect_timeout=15`;
}

// Single shared Prisma client instance.
export const prisma = new PrismaClient({ datasourceUrl: withConnectTimeout(env.DATABASE_URL) });
