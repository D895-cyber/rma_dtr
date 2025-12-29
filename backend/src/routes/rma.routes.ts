import { Router } from 'express';
import {
  getAllRmaCases,
  getRmaCaseById,
  createRmaCase,
  updateRmaCase,
  assignRmaCase,
  updateRmaStatus,
  updateRmaTracking,
  deleteRmaCase,
  getRmaAuditLogs,
  emailRmaClient,
} from '../controllers/rma.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/role.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// View routes - staff, engineer, manager, admin
router.get('/', requirePermission('rma:view'), getAllRmaCases);
router.get('/:id', requirePermission('rma:view'), getRmaCaseById);
router.get('/:id/audit-log', requirePermission('rma:view'), getRmaAuditLogs);

// Create - engineer, manager, admin
router.post('/', requirePermission('rma:create'), createRmaCase);

// Update - engineer (own cases), manager, admin
router.put('/:id', requirePermission('rma:update'), updateRmaCase);

// Assign - manager, admin
router.post('/:id/assign', requirePermission('rma:assign'), assignRmaCase);

// Status update - manager, admin
router.post('/:id/status', requirePermission('rma:update_status'), updateRmaStatus);

// Tracking update - manager, admin
router.post('/:id/tracking', requirePermission('rma:update_tracking'), updateRmaTracking);

// Email client - manager, admin
router.post('/:id/email-client', requirePermission('rma:email_client'), emailRmaClient);

// Delete - admin only
router.delete('/:id', requirePermission('rma:delete'), deleteRmaCase);

export default router;




