import { Router } from 'express';
import {
  getAllAliases,
  getAliasById,
  createOrUpdateAlias,
  deleteAlias,
  testNormalization,
  bulkNormalize,
} from '../controllers/partNameAlias.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/role.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// View routes - staff, engineer, manager, admin
router.get('/', requirePermission('master:view'), getAllAliases);
router.get('/test', requirePermission('master:view'), testNormalization);
router.get('/:id', requirePermission('master:view'), getAliasById);

// Create/Update - manager, admin
router.post('/', requirePermission('master:update'), createOrUpdateAlias);
router.post('/bulk-normalize', requirePermission('master:update'), bulkNormalize);

// Delete - admin only
router.delete('/:id', requirePermission('master:delete'), deleteAlias);

export default router;
