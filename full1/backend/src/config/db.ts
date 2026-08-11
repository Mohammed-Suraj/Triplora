import { PrismaClient } from '@prisma/client';
import { env } from './env';

// Reuse a single PrismaClient instance across hot-reloads in dev
// to avoid exhausting the database connection pool.
declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

export const prisma =
  global.__prisma__ ??
  new PrismaClient({
    log: env.isProduction ? ['error', 'warn'] : ['warn', 'error'],
  });

if (!env.isProduction) {
  global.__prisma__ = prisma;
}

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  // eslint-disable-next-line no-console
  console.log('[database] PostgreSQL connected via Prisma');
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
