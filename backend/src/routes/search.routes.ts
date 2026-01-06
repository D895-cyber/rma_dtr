import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import * as searchController from '../controllers/search.controller';

const router = Router();

router.get('/', authenticateToken, searchController.getSavedSearches);
router.get('/:id', authenticateToken, searchController.getSavedSearchById);
router.post('/', authenticateToken, searchController.createSavedSearch);
router.put('/:id', authenticateToken, searchController.updateSavedSearch);
router.post('/:id/use', authenticateToken, searchController.useSavedSearch);
router.delete('/:id', authenticateToken, searchController.deleteSavedSearch);

export default router;

