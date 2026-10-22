import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined;
}

/**
 * Singleton PrismaClient instance to prevent exhausting database connections
 * in development (hot-reloading) and production serverless environments.
 */
export const prisma: PrismaClient =
  globalThis.__prismaClient ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['warn', 'error']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prismaClient = prisma;
}

export * from '@prisma/client';
