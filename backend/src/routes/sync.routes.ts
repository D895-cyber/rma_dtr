import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import {
  syncToGoogleSheet,
  getSyncStatus,
  readGoogleSheetTwoRowHeaders,
} from '../controllers/sync.controller';

const router = Router();

router.get('/google-sheet/status', authenticateToken, getSyncStatus);
router.get(
  '/google-sheet/read',
  authenticateToken,
  requireRole('admin', 'manager'),
  readGoogleSheetTwoRowHeaders
);
router.post('/google-sheet', authenticateToken, requireRole('admin', 'manager'), syncToGoogleSheet);

export default router;
