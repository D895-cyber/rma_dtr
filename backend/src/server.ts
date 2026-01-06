import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import path from 'path';

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import masterDataRoutes from './routes/masterData.routes';
import partsRoutes from './routes/parts.routes';
import dtrRoutes from './routes/dtr.routes';
import rmaRoutes from './routes/rma.routes';
import notificationRoutes from './routes/notification.routes';
import analyticsRoutes from './routes/analytics.routes';
import notificationPreferenceRoutes from './routes/notificationPreference.routes';
import templateRoutes from './routes/template.routes';
import searchRoutes from './routes/search.routes';
import ruleRoutes from './routes/rule.routes';
import attachmentRoutes from './routes/attachment.routes';

// Import middleware
import { errorHandler } from './middleware/error.middleware';
import { requestIdMiddleware } from './middleware/requestId.middleware';
import { authLimiter } from './middleware/rateLimit.middleware';
import { healthCheck } from './controllers/health.controller';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// MIDDLEWARE
// ============================================

// Request ID tracking (must be early in middleware chain)
app.use(requestIdMiddleware);

// Security
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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

// Health check (enhanced with database check)
app.get('/health', healthCheck);

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

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handler (must be last)
app.use(errorHandler);

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`\n🚀 CRM API Server is running!`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`\n✅ Ready to accept requests!\n`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  console.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

