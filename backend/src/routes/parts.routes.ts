import { Router } from 'express';
import {
  getAllParts,
  getPartsByProjectorModel,
  getPartById,
  createPart,
  updatePart,
  deletePart,
  getPartCategories,
} from '../controllers/parts.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/role.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// View routes - staff, engineer, manager, admin
router.get('/', requirePermission('parts:view'), getAllParts);
router.get('/categories', requirePermission('parts:view'), getPartCategories);
router.get('/projector/:modelNo', requirePermission('parts:view'), getPartsByProjectorModel);
router.get('/:id', requirePermission('parts:view'), getPartById);

// Create part - manager, admin
router.post('/', requirePermission('parts:create'), createPart);

// Update part - manager, admin
router.put('/:id', requirePermission('parts:update'), updatePart);

// Delete part - admin only
router.delete('/:id', requirePermission('parts:delete'), deletePart);

export default router;

