import express from 'express';
import { TransmittalsController } from '../controllers/TransmittalsController.js';
const router = express.Router();
// Core transmittals routes
router.get('/', TransmittalsController.getAllTransmittals);
router.get('/search', TransmittalsController.searchTransmittals);
router.get('/dashboard', TransmittalsController.getDashboardStats);
router.get('/export', TransmittalsController.exportTransmittals);
router.get('/pending', TransmittalsController.getPendingTransmittals);
router.get('/by-course/:courseNumber', TransmittalsController.getByCourseName);
router.get('/by-company/:companyId', TransmittalsController.getByCompany);
router.get('/:id', TransmittalsController.getTransmittalById);
// Update routes
router.put('/:id/status', TransmittalsController.updateTransmittalStatus);
router.post('/bulk-update', TransmittalsController.bulkUpdateStatus);
export default router;
