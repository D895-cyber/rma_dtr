import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import * as attachmentController from '../controllers/attachment.controller';

const router = Router();

router.post('/upload', authenticateToken, attachmentController.uploadAttachment);
router.get('/', authenticateToken, attachmentController.getAttachments);
router.get('/:id/download', authenticateToken, attachmentController.downloadAttachment);
router.delete('/:id', authenticateToken, attachmentController.deleteAttachment);

export default router;


