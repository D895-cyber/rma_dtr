import { Router } from 'express';
import {
  getAllDtrCases,
  getDtrCaseById,
  createDtrCase,
  updateDtrCase,
  assignDtrCase,
  updateDtrStatus,
  closeDtrCase,
  deleteDtrCase,
  getDtrAuditLogs,
} from '../controllers/dtr.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/role.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// View routes - staff, engineer, manager, admin
router.get('/', requirePermission('dtr:view'), getAllDtrCases);
router.get('/:id', requirePermission('dtr:view'), getDtrCaseById);
router.get('/:id/audit-log', requirePermission('dtr:view'), getDtrAuditLogs);

// Create - engineer, manager, admin
router.post('/', requirePermission('dtr:create'), createDtrCase);

// Update - engineer (own cases), manager, admin
router.put('/:id', requirePermission('dtr:update'), updateDtrCase);

// Assign - manager, admin
router.post('/:id/assign', requirePermission('dtr:assign'), assignDtrCase);

// Status update - manager, admin
router.post('/:id/status', requirePermission('dtr:update'), updateDtrStatus);

// Close - manager, admin
router.post('/:id/close', requirePermission('dtr:close'), closeDtrCase);

// Delete - admin only
router.delete('/:id', requirePermission('dtr:delete'), deleteDtrCase);

export default router;






