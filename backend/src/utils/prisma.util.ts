import { PrismaClient } from '@prisma/client';

// Singleton pattern for Prisma Client
// Important for serverless functions to avoid connection pool exhaustion
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Get DATABASE_URL and ensure it's properly formatted
let databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('⚠️  DATABASE_URL environment variable is not set!');
} else {
  // Parse and rebuild URL to ensure proper connection pool parameters
  try {
    const url = new URL(databaseUrl);
    
    // Remove existing connection pool parameters to avoid conflicts
    url.searchParams.delete('connection_limit');
    url.searchParams.delete('pool_timeout');
    url.searchParams.delete('connect_timeout');
    
    // Add optimized connection pool parameters
    // Reduced limits to prevent exhaustion with Neon
    url.searchParams.set('connection_limit', '10');
    url.searchParams.set('pool_timeout', '10');
    url.searchParams.set('connect_timeout', '5');
    
    databaseUrl = url.toString();
    console.log('✅ Enhanced DATABASE_URL with connection pool parameters (limit: 50, timeout: 20)');
  } catch (error) {
    // If URL parsing fails, try string manipulation
    console.warn('⚠️  Could not parse DATABASE_URL as URL, using string manipulation');
    if (!databaseUrl.includes('connection_limit')) {
      const separator = databaseUrl.includes('?') ? '&' : '?';
      databaseUrl = `${databaseUrl}${separator}connection_limit=50&pool_timeout=20&connect_timeout=10`;
      console.log('✅ Enhanced DATABASE_URL with connection pool parameters (limit: 10, timeout: 10)');
    }
  }
}

export const prisma =
  global.__prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'], // Reduced logging to avoid overhead
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

// Cache Prisma Client in global scope to reuse across serverless function invocations
if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
} else {
  // In production/serverless, still cache to avoid multiple instances
  global.__prisma = prisma;
}

// Graceful shutdown - disconnect Prisma on process termination
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export default prisma;

