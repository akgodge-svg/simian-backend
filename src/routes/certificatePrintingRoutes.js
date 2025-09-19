import express from 'express';
import { CertificatePrintingController } from '../controllers/CertificatePrintingController.js';
const router = express.Router();
// Printing workflow
router.get('/completed-courses', CertificatePrintingController.getCompletedCourses);
router.get('/candidates/:courseId', CertificatePrintingController.getPassedCandidates);
router.post('/generate', CertificatePrintingController.generatePrintables);
export default router;