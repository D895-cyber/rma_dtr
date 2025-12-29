import { Router } from 'express';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getEngineers,
  resetUserPassword,
} from '../controllers/user.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/role.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// View users - manager, admin
router.get('/', requirePermission('users:view'), getAllUsers);
router.get('/engineers', requirePermission('users:view'), getEngineers);
router.get('/:id', requirePermission('users:view'), getUserById);

// Create user - admin only
router.post('/', requirePermission('users:create'), createUser);

// Update user - admin only (managers can view but not update)
router.put('/:id', requirePermission('users:update'), updateUser);

// Delete user - admin only
router.delete('/:id', requirePermission('users:delete'), deleteUser);

// Reset password - admin only
router.post('/:id/reset-password', requirePermission('users:resetPassword'), resetUserPassword);

export default router;






