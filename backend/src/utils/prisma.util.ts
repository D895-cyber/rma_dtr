import { PrismaClient } from '@prisma/client';

// Singleton pattern for Prisma Client
// Important for serverless functions to avoid connection pool exhaustion
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Gracefully disconnect on process termination
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;

