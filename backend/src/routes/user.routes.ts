import { Router } from 'express';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getEngineers,
} from '../controllers/user.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

router.get('/', getAllUsers);
router.get('/engineers', getEngineers);
router.get('/:id', getUserById);
router.post('/', requireRole('admin'), createUser);
router.put('/:id', requireRole('admin', 'manager'), updateUser);
router.delete('/:id', requireRole('admin'), deleteUser);

export default router;



