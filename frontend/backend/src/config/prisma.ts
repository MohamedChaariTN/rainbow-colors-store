import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load .env before the client is constructed, regardless of which module
// imports this file first.
dotenv.config();

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

/**
 * Neon and Render PostgreSQL endpoints require TLS. Prisma's default
 * "prefer" mode usually negotiates it, but being explicit avoids a silent
 * plaintext fallback when the connection string has no query parameters.
 * Only PostgreSQL URLs are touched, and only when sslmode is not already set.
 */
function normalizeDatabaseUrl(raw: string | undefined): string | undefined {
  if (!raw || !/^postgres(?:ql)?:\/\//i.test(raw)) return raw;
  if (!/neon\.tech|render\.com/i.test(raw) || /[?&]sslmode=/i.test(raw)) return raw;
  return raw + (raw.includes('?') ? '&' : '?') + 'sslmode=require';
}

const databaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);

export const prisma = globalForPrisma.prisma || new PrismaClient({
  ...(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : {}),
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
