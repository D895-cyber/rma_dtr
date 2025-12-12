import { PrismaClient } from '@prisma/client';

// Singleton pattern for Prisma Client
// Important for serverless functions to avoid connection pool exhaustion
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

// In serverless environments, reuse the same instance
if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
} else {
  // In production/serverless, still cache to avoid multiple instances
  if (!global.__prisma) {
    global.__prisma = prisma;
  }
}

export default prisma;

