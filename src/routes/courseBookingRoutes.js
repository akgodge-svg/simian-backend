import express from 'express';
import { CourseBookingController } from '../controllers/CourseBookingController.js';
const router = express.Router();
// Core CRUD routes
router.get('/', CourseBookingController.getAllCourseBookings);
router.get('/search', CourseBookingController.searchCourseBookings);
router.get('/upcoming', CourseBookingController.getUpcomingCourses);
router.get('/available-instructors', CourseBookingController.getAvailableInstructors);
router.get('/available-lpo-customers', CourseBookingController.getAvailableLPOCustomers);
router.get('/overseas-customers', CourseBookingController.getOverseasCustomers);
router.get('/category-details/:category_id', CourseBookingController.getCourseCategoryDetails);
router.get('/:id', CourseBookingController.getCourseBookingById);
router.post('/', CourseBookingController.createCourseBooking);
router.put('/:id/status', CourseBookingController.updateCourseBookingStatus);
router.put('/:id/cancel', CourseBookingController.cancelCourseBooking);
// Utility routes
router.post('/calculate-end-date', CourseBookingController.calculateEndDate);
export default router;