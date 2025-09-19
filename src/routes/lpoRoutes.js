import express from 'express';
import { LPOController } from '../controllers/LPOController.js';
import { FileUploadUtils } from '../utils/fileUpload.js';
const router = express.Router();
// Configure multer for file uploads
const upload = FileUploadUtils.getLPOUploadConfig();
// Core CRUD routes
router.get('/', LPOController.getAllLPOs);
router.get('/search', LPOController.searchLPOs);
router.get('/available-line-items', LPOController.getAvailableLineItems);
router.get('/pricing/:category_id/:level_id', LPOController.getCoursePricing);
router.get('/check-expiring', LPOController.checkExpiringLPOs);
router.get('/:id', LPOController.getLPOById);
router.get('/:id/download', LPOController.downloadLPOFile);
// Routes with file upload
router.post('/', upload.single('lpo_file'), LPOController.createLPO);
router.put('/:id', upload.single('lpo_file'), LPOController.updateLPO);
// Other routes
router.delete('/:id', LPOController.deleteLPO);
router.put('/:id/cancel', LPOController.cancelLPO);
// LPO usage routes
router.post('/use-quantity', LPOController.useQuantity);
router.post('/process-completion', LPOController.processCourseCompletion);
export default router;