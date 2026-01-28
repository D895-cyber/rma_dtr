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
    // Increased limits to handle more concurrent requests
    url.searchParams.set('connection_limit', '25');
    url.searchParams.set('pool_timeout', '20');
    url.searchParams.set('connect_timeout', '10');
    url.searchParams.set('query_timeout', '30000'); // 30 seconds query timeout
    
    databaseUrl = url.toString();
    console.log('✅ Enhanced DATABASE_URL with connection pool parameters (limit: 25, timeout: 20)');
  } catch (error) {
    // If URL parsing fails, try string manipulation
    console.warn('⚠️  Could not parse DATABASE_URL as URL, using string manipulation');
    if (!databaseUrl.includes('connection_limit')) {
      const separator = databaseUrl.includes('?') ? '&' : '?';
      databaseUrl = `${databaseUrl}${separator}connection_limit=25&pool_timeout=20&connect_timeout=10&query_timeout=30000`;
      console.log('✅ Enhanced DATABASE_URL with connection pool parameters (limit: 25, timeout: 20)');
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
    // Add query timeout to prevent hanging queries
    // This will timeout queries after 30 seconds
  });

// Add query timeout wrapper for critical queries
export async function withQueryTimeout<T>(
  query: () => Promise<T>,
  timeoutMs: number = 30000
): Promise<T> {
  return Promise.race([
    query(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
    ),
  ]);
}

// Connection retry logic with exponential backoff
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on certain errors (e.g., validation errors)
      if (error.code === 'P2002' || error.code === 'P2025') {
        throw error;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.warn(`Query failed, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
}

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

