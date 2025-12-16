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
import { requireRole } from '../middleware/role.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

router.get('/', getAllDtrCases);
router.get('/:id', getDtrCaseById);
router.post('/', createDtrCase);
router.put('/:id', updateDtrCase);
router.post('/:id/assign', assignDtrCase);
router.post('/:id/status', updateDtrStatus);
router.post('/:id/close', closeDtrCase);
router.delete('/:id', requireRole('admin'), deleteDtrCase);
router.get('/:id/audit-log', getDtrAuditLogs);

export default router;




