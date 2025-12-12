import { PrismaClient } from '@prisma/client';

// Singleton pattern for Prisma Client
// Important for serverless functions to avoid connection pool exhaustion
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Get DATABASE_URL and ensure it's properly formatted
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('⚠️  DATABASE_URL environment variable is not set!');
}

export const prisma =
  global.__prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// Cache Prisma Client in global scope to reuse across serverless function invocations
if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
} else {
  // In production/serverless, still cache to avoid multiple instances
  global.__prisma = prisma;
}

export default prisma;

