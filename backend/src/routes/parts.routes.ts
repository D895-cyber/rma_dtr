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
import { requireRole } from '../middleware/role.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get all parts
router.get('/', getAllParts);

// Get part categories
router.get('/categories', getPartCategories);

// Get parts by projector model number
router.get('/projector/:modelNo', getPartsByProjectorModel);

// Get single part
router.get('/:id', getPartById);

// Create part (admin/manager only)
router.post('/', requireRole('admin', 'manager'), createPart);

// Update part (admin/manager only)
router.put('/:id', requireRole('admin', 'manager'), updatePart);

// Delete part (admin only)
router.delete('/:id', requireRole('admin'), deletePart);

export default router;

