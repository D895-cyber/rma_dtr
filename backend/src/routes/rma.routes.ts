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
} from '../controllers/rma.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

router.get('/', getAllRmaCases);
router.get('/:id', getRmaCaseById);
router.post('/', createRmaCase);
router.put('/:id', updateRmaCase);
router.post('/:id/assign', assignRmaCase);
router.post('/:id/status', updateRmaStatus);
router.post('/:id/tracking', updateRmaTracking);
router.delete('/:id', requireRole('admin'), deleteRmaCase);
router.get('/:id/audit-log', getRmaAuditLogs);

export default router;



