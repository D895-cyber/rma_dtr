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
import { requireRole } from '../middleware/role.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Site routes
router.get('/sites', getAllSites);
router.get('/sites/:id', getSiteById);
router.post('/sites', createSite);
router.put('/sites/:id', updateSite);
router.delete('/sites/:id', deleteSite);

// Audi routes
router.get('/audis', getAllAudis);
router.get('/audis/:id', getAudiById);
router.post('/audis', createAudi);
router.put('/audis/:id', updateAudi);
router.delete('/audis/:id', deleteAudi);

// Projector Model routes (catalog)
router.get('/projector-models', getAllProjectorModels);
router.get('/projector-models/model/:modelNo', getProjectorModelByModelNo);
router.get('/projector-models/:id', getProjectorModelById);
router.post('/projector-models', requireRole('admin', 'manager'), createProjectorModel);
router.put('/projector-models/:id', requireRole('admin', 'manager'), updateProjectorModel);
router.delete('/projector-models/:id', requireRole('admin'), deleteProjectorModel);

// Projector routes (physical units)
router.get('/projectors', getAllProjectors);
router.get('/projectors/:id', getProjectorById);
router.post('/projectors', requireRole('admin', 'manager'), createProjector);
router.put('/projectors/:id', requireRole('admin', 'manager'), updateProjector);
router.delete('/projectors/:id', requireRole('admin'), deleteProjector);

export default router;

