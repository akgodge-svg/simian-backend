import express from 'express';
import { CenterController } from '../controllers/centerController.js';
const router = express.Router();
// Core CRUD routes
router.get('/', CenterController.getAllCenters);
router.get('/dropdown', CenterController.getDropdownData);
router.get('/type/:type', CenterController.getCentersByType);
router.get('/:id', CenterController.getCenterById);
router.post('/', CenterController.createCenter);
router.put('/:id', CenterController.updateCenter);
router.delete('/:id', CenterController.deleteCenter);
// Instructor assignment routes
router.post('/:id/instructors', CenterController.assignInstructor);
router.get('/:id/instructors', CenterController.getCenterInstructors);
router.get('/:id/available-instructors', CenterController.getAvailableInstructors);
router.delete('/:center_id/instructors/:instructor_id', CenterController.removeInstructor);
// Permission routes
router.get('/:id/permissions', CenterController.getCenterPermissions);
router.get('/:id/permissions/:permission', CenterController.checkPermission);
// Dashboard route
router.get('/:id/dashboard', CenterController.getCenterDashboard);
export default router;