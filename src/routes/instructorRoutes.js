import express from 'express';
import { InstructorController } from '../controllers/InstructorController.js';
const router = express.Router();
// Core CRUD routes
router.get('/', InstructorController.getAllInstructors);
router.get('/dropdown', InstructorController.getDropdownData);
router.get('/smart-match', InstructorController.smartMatch);
router.get('/check-expiry', InstructorController.checkDocumentExpiry);
router.get('/:id', InstructorController.getInstructorById);
router.post('/', InstructorController.createInstructor);
router.put('/:id', InstructorController.updateInstructor);
router.delete('/:id', InstructorController.deleteInstructor);
// Document management routes
router.post('/:id/documents', InstructorController.uploadDocument);
router.get('/:id/documents', InstructorController.getInstructorDocuments);
// Additional functionality routes
router.get('/:id/booking-status', InstructorController.getBookingStatus);
export default router;