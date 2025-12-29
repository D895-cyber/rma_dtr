import { Router } from 'express';
import {
  // Site controllers
  getAllSites,
  getSiteById,
  createSite,
  updateSite,
  deleteSite,
  // Audi controllers
  getAllAudis,
  getAudiById,
  createAudi,
  updateAudi,
  deleteAudi,
  // Projector controllers
  getAllProjectors,
  getProjectorById,
  createProjector,
  updateProjector,
  deleteProjector,
  transferProjector,
} from '../controllers/masterData.controller';
import {
  // Projector Model controllers
  getAllProjectorModels,
  getProjectorModelById,
  getProjectorModelByModelNo,
  createProjectorModel,
  updateProjectorModel,
  deleteProjectorModel,
} from '../controllers/projectorModel.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/role.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Site routes
router.get('/sites', requirePermission('master:view'), getAllSites);
router.get('/sites/:id', requirePermission('master:view'), getSiteById);
router.post('/sites', requirePermission('master:create'), createSite);
router.put('/sites/:id', requirePermission('master:update'), updateSite);
router.delete('/sites/:id', requirePermission('master:delete'), deleteSite);

// Audi routes
router.get('/audis', requirePermission('master:view'), getAllAudis);
router.get('/audis/:id', requirePermission('master:view'), getAudiById);
router.post('/audis', requirePermission('master:create'), createAudi);
router.put('/audis/:id', requirePermission('master:update'), updateAudi);
router.delete('/audis/:id', requirePermission('master:delete'), deleteAudi);

// Projector Model routes (catalog)
router.get('/projector-models', requirePermission('models:view'), getAllProjectorModels);
router.get('/projector-models/model/:modelNo', requirePermission('models:view'), getProjectorModelByModelNo);
router.get('/projector-models/:id', requirePermission('models:view'), getProjectorModelById);
router.post('/projector-models', requirePermission('models:create'), createProjectorModel);
router.put('/projector-models/:id', requirePermission('models:update'), updateProjectorModel);
router.delete('/projector-models/:id', requirePermission('models:delete'), deleteProjectorModel);

// Projector routes (physical units)
router.get('/projectors', requirePermission('master:view'), getAllProjectors);
router.get('/projectors/:id', requirePermission('master:view'), getProjectorById);
router.post('/projectors', requirePermission('master:create'), createProjector);
router.put('/projectors/:id', requirePermission('master:update'), updateProjector);
router.delete('/projectors/:id', requirePermission('master:delete'), deleteProjector);
router.post('/projectors/:id/transfer', requirePermission('master:update'), transferProjector);

export default router;

