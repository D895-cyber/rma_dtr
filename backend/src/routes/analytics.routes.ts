import { Router } from 'express';
import {
  getDashboardStats,
  getTrends,
  getSeverityBreakdown,
  getEngineerPerformance,
  getSiteStats,
  getRmaPartAnalytics,
  getTopProjectorsByRMA,
} from '../controllers/analytics.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/role.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// All analytics routes require view permission
router.get('/dashboard', requirePermission('analytics:view'), getDashboardStats);
router.get('/trends', requirePermission('analytics:view'), getTrends);
router.get('/severity-breakdown', requirePermission('analytics:view'), getSeverityBreakdown);
router.get('/engineer-performance', requirePermission('analytics:view'), getEngineerPerformance);
router.get('/site-stats', requirePermission('analytics:view'), getSiteStats);
router.get('/rma-parts', requirePermission('analytics:view'), getRmaPartAnalytics);
router.get('/top-projectors-rma', requirePermission('analytics:view'), getTopProjectorsByRMA);

export default router;






