import express from 'express';
import { CourseBookingDetailsController } from '../controllers/CourseBookingDetailsController.js';
const router = express.Router();
// Core course booking details routes
router.get('/:id', CourseBookingDetailsController.getCourseBookingDetails);
router.post('/:id/candidates', CourseBookingDetailsController.addCandidate);
router.put('/:id/attendance', CourseBookingDetailsController.updateAttendance);
router.post('/:id/documents', CourseBookingDetailsController.uploadDocument);
router.put('/:id/assessments', CourseBookingDetailsController.assessCandidates);
router.put('/:id/complete', CourseBookingDetailsController.completeCourse);
// Admin-only download routes
router.get('/:id/download/:type', CourseBookingDetailsController.downloadCourseData);
// Document management routes
router.delete('/:bookingId/documents/:documentId', CourseBookingDetailsController.deleteDocument);
router.get('/:bookingId/documents/:documentId/download', CourseBookingDetailsController.downloadDocument);
export default router;