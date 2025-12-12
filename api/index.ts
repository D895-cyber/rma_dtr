import type { VercelRequest, VercelResponse } from '@vercel/node';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Validate critical environment variables
if (!process.env.DATABASE_URL) {
  console.error('⚠️  CRITICAL: DATABASE_URL environment variable is not set!');
}

// Import routes from compiled backend
import authRoutes from '../backend/dist/routes/auth.routes';
import userRoutes from '../backend/dist/routes/user.routes';
import masterDataRoutes from '../backend/dist/routes/masterData.routes';
import partsRoutes from '../backend/dist/routes/parts.routes';
import dtrRoutes from '../backend/dist/routes/dtr.routes';
import rmaRoutes from '../backend/dist/routes/rma.routes';
import notificationRoutes from '../backend/dist/routes/notification.routes';
import analyticsRoutes from '../backend/dist/routes/analytics.routes';

// Import middleware
import { errorHandler } from '../backend/dist/middleware/error.middleware';

const app = express();

// ============================================
// MIDDLEWARE
// ============================================

// Security - Disable X-Powered-By header for Vercel
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// CORS - Configure based on environment
const allowedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',')
  : ['*'];

app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Rate limiting - Store in memory (works for serverless)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'CRM API is running', 
    timestamp: new Date().toISOString(),
    databaseUrl: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
    nodeEnv: process.env.NODE_ENV || 'not set'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/master-data', masterDataRoutes);
app.use('/api/parts', partsRoutes);
app.use('/api/dtr', dtrRoutes);
app.use('/api/rma', rmaRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Export handler for Vercel serverless functions
export default function handler(req: VercelRequest, res: VercelResponse) {
  // Add CORS headers early
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle OPTIONS requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Ensure all errors return JSON
  try {
    return app(req, res);
  } catch (error: any) {
    console.error('Unhandled error in API handler:', error);
    console.error('Error stack:', error.stack);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
}


