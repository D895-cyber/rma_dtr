import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { syncToGoogleSheet, getSyncStatus } from '../controllers/sync.controller';

const router = Router();

router.get('/google-sheet/status', authenticateToken, getSyncStatus);
router.post('/google-sheet', authenticateToken, requireRole('admin', 'manager'), syncToGoogleSheet);

export default router;
