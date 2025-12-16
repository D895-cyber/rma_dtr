import { Router } from 'express';
import {
  getDashboardStats,
  getTrends,
  getSeverityBreakdown,
  getEngineerPerformance,
  getSiteStats,
} from '../controllers/analytics.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

router.get('/dashboard', getDashboardStats);
router.get('/trends', getTrends);
router.get('/severity-breakdown', getSeverityBreakdown);
router.get('/engineer-performance', requireRole('admin', 'manager'), getEngineerPerformance);
router.get('/site-stats', getSiteStats);

export default router;




