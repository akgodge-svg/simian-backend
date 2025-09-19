import { CourseBookingService } from '../services/CourseBookingService.js';
import { DateUtils } from '../utils/dateUtils.js';
export class CourseBookingController {
// GET /api/course-bookings
static async getAllCourseBookings(req, res) {
try {
const centerContext = req.centerContext || { id: 1, type: 'main' };
const filters = {
course_type: req.query.course_type,
booking_status: req.query.booking_status,
category_id: req.query.category_id,
limit: req.query.limit,
offset: req.query.offset
};
const result = await CourseBookingService.getAllCourseBookings(centerContext, filters);
res.status(200).json(result);
} catch (error) {
console.error('Error getting course bookings:', error);
res.status(500).json({
success: false,
message: error.message
});
}
}
// GET /api/course-bookings/:id
static async getCourseBookingById(req, res) {
try {
const { id } = req.params;
if (!id || isNaN(id)) {
return res.status(400).json({
success: false,
message: 'Valid course booking ID is required'
});
}
const centerContext = req.centerContext || { id: 1, type: 'main' };
const result = await CourseBookingService.getCourseBookingById(id, centerContext);
if (!result.success) {
return res.status(404).json(result);
}
res.status(200).json(result);
} catch (error) {
console.error('Error getting course booking by ID:', error);
res.status(500).json({
success: false,
message: error.message
});
}
}
// POST /api/course-bookings
static async createCourseBooking(req, res) {
try {
const { booking, customers } = req.body;
if (!booking || !customers) {
return res.status(400).json({
success: false,
message: 'Booking data and customers are required'
});
}
const centerContext = req.centerContext || { id: 1, type: 'main' };
const result = await CourseBookingService.createCourseBooking(booking, customers, centerContext);
if (!result.success) {
return res.status(400).json(result);
}
res.status(201).json(result);
} catch (error) {
console.error('Error creating course booking:', error);
res.status(500).json({
success: false,
message: error.message
});
}
}
// PUT /api/course-bookings/:id/status
static async updateCourseBookingStatus(req, res) {
try {
const { id } = req.params;
const { status } = req.body;
if (!id || isNaN(id)) {
return res.status(400).json({
success: false,
message: 'Valid course booking ID is required'
});
}
if (!status) {
return res.status(400).json({
success: false,
message: 'Status is required'
});
}
const centerContext = req.centerContext || { id: 1, type: 'main' };
const result = await CourseBookingService.updateCourseBookingStatus(id, status, centerContext);
if (!result.success) {
return res.status(400).json(result);
}
res.status(200).json(result);
} catch (error) {
console.error('Error updating course booking status:', error);
res.status(500).json({
success: false,
message: error.message
});
}
}
// PUT /api/course-bookings/:id/cancel
static async cancelCourseBooking(req, res) {
try {
const { id } = req.params;
if (!id || isNaN(id)) {
return res.status(400).json({
success: false,
message: 'Valid course booking ID is required'
});
}
const centerContext = req.centerContext || { id: 1, type: 'main' };
const result = await CourseBookingService.cancelCourseBooking(id, centerContext);
if (!result.success) {
return res.status(400).json(result);
}
res.status(200).json(result);
} catch (error) {
console.error('Error cancelling course booking:', error);
res.status(500).json({
success: false,
message: error.message
});
}
}
// GET /api/course-bookings/available-instructors
static async getAvailableInstructors(req, res) {
try {
const { category_id, start_date, category_duration } = req.query;
if (!category_id || !start_date || !category_duration) {
return res.status(400).json({
success: false,
message: 'Category ID, start date, and category duration are required'
});
}
// Calculate end date based on category duration
const endDate = DateUtils.calculateEndDate(start_date, parseInt(category_duration));
const centerContext = req.centerContext || { id: 1, type: 'main' };
const result = await CourseBookingService.getAvailableInstructors(
category_id,
start_date,
endDate,
centerContext
);
res.status(200).json(result);
} catch (error) {
console.error('Error getting available instructors:', error);
res.status(500).json({
success: false,
message: error.message
});
}
}
// GET /api/course-bookings/available-lpo-customers
static async getAvailableLPOCustomers(req, res) {
try {
const { category_id, level_id } = req.query;
if (!category_id || !level_id) {
return res.status(400).json({
success: false,
message: 'Category ID and Level ID are required'
});
}
const centerContext = req.centerContext || { id: 1, type: 'main' };
const result = await CourseBookingService.getAvailableLPOCustomers(
category_id,
level_id,
centerContext
);
if (!result.success) {
return res.status(403).json(result);
}
res.status(200).json(result);
} catch (error) {
console.error('Error getting available LPO customers:', error);
res.status(500).json({
success: false,
message: error.message
});
}
}
// GET /api/course-bookings/overseas-customers
static async getOverseasCustomers(req, res) {
try {
const centerContext = req.centerContext || { id: 1, type: 'main' };
const result = await CourseBookingService.getOverseasCustomers(centerContext);
res.status(200).json(result);
} catch (error) {
console.error('Error getting overseas customers:', error);
res.status(500).json({
success: false,
message: error.message
});
}
}
// GET /api/course-bookings/search
static async searchCourseBookings(req, res) {
try {
const { q: searchTerm } = req.query;
if (!searchTerm || searchTerm.trim().length === 0) {
return res.status(400).json({
success: false,
message: 'Search term is required'
});
}
const centerContext = req.centerContext || { id: 1, type: 'main' };
const filters = {
course_type: req.query.course_type,
booking_status: req.query.booking_status,
category_id: req.query.category_id,
limit: req.query.limit || 50,
offset: req.query.offset || 0
};
const result = await CourseBookingService.searchCourseBookings(searchTerm, centerContext, filters);
res.status(200).json(result);
} catch (error) {
console.error('Error searching course bookings:', error);
res.status(500).json({
success: false,
message: error.message
});
}
}
// GET /api/course-bookings/upcoming
static async getUpcomingCourses(req, res) {
try {
const centerContext = req.centerContext || { id: 1, type: 'main' };
const limit = parseInt(req.query.limit) || 10;
const result = await CourseBookingService.getUpcomingCourses(centerContext, limit);
res.status(200).json(result);
} catch (error) {
console.error('Error getting upcoming courses:', error);
res.status(500).json({
success: false,
message: error.message
});
}
}
// GET /api/course-bookings/category-details/:category_id
static async getCourseCategoryDetails(req, res) {
try {
const { category_id } = req.params;
if (!category_id || isNaN(category_id)) {
return res.status(400).json({
success: false,
message: 'Valid Category ID is required'
});
}
const result = await CourseBookingService.getCourseCategoryDetails(category_id);
if (!result.success) {
return res.status(404).json(result);
}
res.status(200).json(result);
} catch (error) {
console.error('Error getting course category details:', error);
res.status(500).json({
success: false,
message: error.message
});
}
}
// POST /api/course-bookings/calculate-end-date
static async calculateEndDate(req, res) {
try {
const { start_date, category_id } = req.body;
if (!start_date || !category_id) {
return res.status(400).json({
success: false,
message: 'Start date and category ID are required'
});
}
const result = await CourseBookingService.calculateEndDate(start_date, category_id);
if (!result.success) {
return res.status(400).json(result);
}
res.status(200).json(result);
} catch (error) {
console.error('Error calculating end date:', error);
res.status(500).json({
success: false,
message: error.message
});
}
}
}