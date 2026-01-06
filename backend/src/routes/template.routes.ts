import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/role.middleware';
import * as templateController from '../controllers/template.controller';

const router = Router();

router.get('/', authenticateToken, templateController.getTemplates);
router.get('/:id', authenticateToken, templateController.getTemplateById);
router.post('/', authenticateToken, requirePermission('dtr:create'), templateController.createTemplate);
router.put('/:id', authenticateToken, requirePermission('dtr:create'), templateController.updateTemplate);
router.post('/:id/use', authenticateToken, templateController.useTemplate);
router.delete('/:id', authenticateToken, requirePermission('dtr:create'), templateController.deleteTemplate);

export default router;

