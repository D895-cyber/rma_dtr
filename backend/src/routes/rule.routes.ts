import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/role.middleware';
import * as ruleController from '../controllers/rule.controller';

const router = Router();

router.get('/', authenticateToken, requirePermission('dtr:assign'), ruleController.getRules);
router.get('/:id', authenticateToken, requirePermission('dtr:assign'), ruleController.getRuleById);
router.post('/', authenticateToken, requirePermission('dtr:assign'), ruleController.createRule);
router.put('/:id', authenticateToken, requirePermission('dtr:assign'), ruleController.updateRule);
router.post('/:id/test', authenticateToken, requirePermission('dtr:assign'), ruleController.testRule);
router.delete('/:id', authenticateToken, requirePermission('dtr:assign'), ruleController.deleteRule);

export default router;

