import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import * as notificationPreferenceController from '../controllers/notificationPreference.controller';

const router = Router();

router.get('/', authenticateToken, notificationPreferenceController.getNotificationPreferences);
router.put('/', authenticateToken, notificationPreferenceController.updateNotificationPreferences);

export default router;

