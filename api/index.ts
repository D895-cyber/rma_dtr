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
import syncRoutes from '../backend/dist/routes/sync.routes';
import attachmentRoutes from '../backend/dist/routes/attachment.routes';
import notificationPreferenceRoutes from '../backend/dist/routes/notificationPreference.routes';
import templateRoutes from '../backend/dist/routes/template.routes';
import searchRoutes from '../backend/dist/routes/search.routes';
import ruleRoutes from '../backend/dist/routes/rule.routes';

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
// Allow all origins in production if FRONTEND_URL is not set, otherwise use specific origins
const allowedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : ['*'];

app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps, Postman, or same-origin requests)
    if (!origin) {
      return callback(null, true);
    }
    
    // If '*' is in allowed origins, allow all
    if (allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Default: allow the request (more permissive for development/debugging)
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
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

// Body parsing - Increased limit for file uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
app.use('/api/notification-preferences', notificationPreferenceRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/searches', searchRoutes);
app.use('/api/rules', ruleRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/sync', syncRoutes);

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
  // Handle OPTIONS requests early
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
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


