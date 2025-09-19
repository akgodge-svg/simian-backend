import express from 'express';
import { CenterController } from '../controllers/CenterController.js';
const router = express.Router();
// Center management routes
router.get('/', CenterController.getAllCenters);
router.get('/dropdown', CenterController.getDropdownData);
router.get('/main', CenterController.getMainCenter);
router.get('/type/:centerType', CenterController.getCentersByType);
router.get('/:id', CenterController.getCenterById);
router.post('/', CenterController.createCenter);
router.put('/:id', CenterController.updateCenter);
router.delete('/:id', CenterController.deleteCenter);
// Permissions route
router.get('/:id/permissions', CenterController.getCenterPermissions);
export default router;
