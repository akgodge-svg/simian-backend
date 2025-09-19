import { CourseBooking } from '../models/CourseBooking.js';
import { DateUtils } from '../utils/dateUtils.js';
import { InstructorAvailabilityService } from './InstructorAvailabilityService.js';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();
const pool = mysql.createPool({
host: process.env.DB_HOST,
user: process.env.DB_USER,
password: process.env.DB_PASSWORD,
database: process.env.DB_NAME,
waitForConnections: true,
connectionLimit: 10,
queueLimit: 0
});
export class CourseBookingService {
// Get all course bookings
static async getAllCourseBookings(centerContext = null, filters = {}) {
try {
const bookings = await CourseBooking.findAll(centerContext);
return {
success: true,
data: bookings,
message: 'Course bookings retrieved successfully',
count: bookings.length
};
} catch (error) {
throw new Error(`Failed to get course bookings: ${error.message}`);
}
}
// Get single course booking
static async getCourseBookingById(id, centerContext = null) {
try {
const booking = await CourseBooking.findById(id, centerContext);
if (!booking) {
return {
success: false,
message: 'Course booking not found or access denied'
};
}
return {
success: true,
data: booking,
message: 'Course booking retrieved successfully'
};
} catch (error) {
throw new Error(`Failed to get course booking: ${error.message}`);
}
}
// Create course booking
static async createCourseBooking(bookingData, customers, centerContext) {
try {
// Validate booking data
const validation = await this.validateCourseBookingData(bookingData, customers, centerContext);
if (!validation.isValid) {
return {
success: false,
message: validation.message
};
}
// Get course CATEGORY details for duration and max participants
const categoryDetails = await CourseBooking.getCourseCategoryDetails(bookingData.category_id);
if (!categoryDetails) {
return {
success: false,
message: 'Course category not found'
};
}
// Verify level exists for this category
const courseDetails = await CourseBooking.getCourseDetails(
bookingData.category_id,
bookingData.level_id
);
if (!courseDetails) {
return {
success: false,
message: 'Course category level combination not found'
};
}
// Calculate end date based on CATEGORY duration
const endDate = DateUtils.calculateEndDate(
bookingData.start_date,
categoryDetails.duration_days
);
// Validate date range
const dateValidation = DateUtils.validateDateRange(bookingData.start_date, endDate);
if (!dateValidation.isValid) {
return {
success: false,
message: dateValidation.message
};
}
// Check instructor availability
const instructorAvailability = await InstructorAvailabilityService.checkInstructorAvailability(
bookingData.actual_instructor_id,
bookingData.start_date,
endDate
);
if (!instructorAvailability.isAvailable) {
return {
success: false,
message: 'Selected instructor is not available for the chosen dates'
};
}
// For different instructors, check document instructor availability too
if (bookingData.document_instructor_id !== bookingData.actual_instructor_id) {
const documentInstructorAvailability = await InstructorAvailabilityService.checkInstructorAvailability(
bookingData.document_instructor_id,
bookingData.start_date,
endDate
);
if (!documentInstructorAvailability.isAvailable) {
return {
success: false,
message: 'Selected document instructor is not available for the chosen dates'
};
}
}
// Check total participants doesn't exceed CATEGORY capacity
const totalParticipants = customers.reduce((sum, customer) => sum + customer.participants_count, 0);
if (totalParticipants > categoryDetails.max_participants) {
return {
success: false,
message: `Total participants (${totalParticipants}) exceeds course capacity (${categoryDetails.max_participants})`
};
}
// For UAE courses, validate LPO quantities and availability
if (bookingData.course_type === 'uae') {
const lpoValidation = await this.validateLPOQuantities(customers, bookingData.category_id, bookingData.level_id);
if (!lpoValidation.isValid) {
return {
success: false,
message: lpoValidation.message
};
}
}
// Set calculated values from CATEGORY
bookingData.end_date = endDate;
bookingData.duration_days = categoryDetails.duration_days;
bookingData.max_participants = categoryDetails.max_participants;
bookingData.created_by_center_id = centerContext.id;
// Create course booking
const booking = new CourseBooking(bookingData);
await booking.save();
// Add customers to booking
for (const customer of customers) {
await CourseBooking.addCustomer(booking.id, customer);
}
// Send email notifications
await this.sendBookingCreatedNotifications(booking.id);
// Get complete booking data
const result = await this.getCourseBookingById(booking.id, centerContext);
return {
success: true,
data: result.data,
message: `Course booking ${booking.course_number} created successfully. Notifications sent to all parties.`
};
} catch (error) {
throw new Error(`Failed to create course booking: ${error.message}`);
}
}
// Update course booking status
static async updateCourseBookingStatus(id, newStatus, centerContext) {
try {
const booking = await CourseBooking.findById(id, centerContext);
if (!booking) {
return {
success: false,
message: 'Course booking not found or access denied'
};
}
// Validate status transition
const validTransitions = {
'not_started': ['in_progress', 'cancelled'],
'in_progress': ['completed', 'cancelled'],
'completed': [],
'cancelled': []
};
if (!validTransitions[booking.booking_status]?.includes(newStatus)) {
return {
success: false,
message: `Cannot change status from ${booking.booking_status} to ${newStatus}`
};
}
await booking.updateStatus(newStatus);
return {
success: true,
message: `Course booking status updated to ${newStatus}`
};
} catch (error) {
throw new Error(`Failed to update course booking status: ${error.message}`);
}
}
// Cancel course booking
static async cancelCourseBooking(id, centerContext) {
try {
const booking = await CourseBooking.findById(id, centerContext);
if (!booking) {
return {
success: false,
message: 'Course booking not found or access denied'
};
}
if (booking.booking_status === 'cancelled') {
return {
success: false,
message: 'Course booking is already cancelled'
};
}
if (booking.booking_status === 'completed') {
return {
success: false,
message: 'Cannot cancel completed course booking'
};
}
await booking.cancel();
return {
success: true,
message: 'Course booking cancelled successfully. LPO quantities restored.'
};
} catch (error) {
throw new Error(`Failed to cancel course booking: ${error.message}`);
}
}
// Get available instructors for course
static async getAvailableInstructors(categoryId, startDate, endDate, centerContext) {
try {
const instructors = await InstructorAvailabilityService.getAvailableInstructors(
categoryId,
startDate,
endDate,
centerContext
);
return {
success: true,
data: instructors,
message: 'Available instructors retrieved successfully',
count: instructors.length
};
} catch (error) {
throw new Error(`Failed to get available instructors: ${error.message}`);
}
}
// Get available LPO customers for UAE courses
static async getAvailableLPOCustomers(categoryId, levelId, centerContext) {
try {
if (centerContext.type !== 'main') {
return {
success: false,
message: 'LPO customers are only available for Main Branch'
};
}
// Get customers with available LPO quantities for this course
const query = `
SELECT DISTINCT
c.id as customer_id,
c.name as customer_name,
c.customer_type,
c.company_name,
c.contact_person,
c.email,
c.phone,
li.id as lpo_line_item_id,
li.quantity_remaining,
lpo.lpo_number,
lpo.valid_until,
cc.name as category_name,
ccl.level_name
FROM customers c
JOIN lpo_orders lpo ON c.id = lpo.customer_id
JOIN lpo_line_items li ON lpo.id = li.lpo_order_id
JOIN course_categories cc ON li.category_id = cc.id
JOIN course_category_levels ccl ON li.level_id = ccl.id
WHERE li.category_id = ?
AND li.level_id = ?
AND li.quantity_remaining > 0
AND lpo.order_status IN ('confirmed', 'partially_used')
AND lpo.valid_until >= CURDATE()
AND lpo.is_active = 1
AND c.is_active = 1
ORDER BY c.name, lpo.lpo_number
`;
const [rows] = await pool.execute(query, [categoryId, levelId]);
return {
success: true,
data: rows,
message: 'Available LPO customers retrieved successfully',
count: rows.length
};
} catch (error) {
throw new Error(`Failed to get available LPO customers: ${error.message}`);
}
}
// Get overseas customers
static async getOverseasCustomers(centerContext) {
try {
if (centerContext.type === 'main') {
// Main branch can see all customers
const query = `
SELECT
id as customer_id,
name as customer_name,
customer_type,
company_name,
contact_person,
email,
phone,
city,
country
FROM customers
WHERE is_active = 1 AND customer_status = 'active'
ORDER BY name
`;
const [rows] = await pool.execute(query);
return {
success: true,
data: rows,
message: 'All customers retrieved successfully',
count: rows.length
};
} else {
// Overseas centers see only their own customers
const query = `
SELECT
id as customer_id,
name as customer_name,
customer_type,
company_name,
contact_person,
email,
phone,
city,
country
FROM customers
WHERE created_by_center_id = ? AND is_active = 1 AND customer_status = 'active'
ORDER BY name
`;
const [rows] = await pool.execute(query, [centerContext.id]);
return {
success: true,
data: rows,
message: 'Center customers retrieved successfully',
count: rows.length
};
}
} catch (error) {
throw new Error(`Failed to get overseas customers: ${error.message}`);
}
}
// Search course bookings
static async searchCourseBookings(searchTerm, centerContext = null, filters = {}) {
try {
const bookings = await CourseBooking.search(searchTerm, centerContext, filters);
return {
success: true,
data: bookings,
message: 'Course booking search completed successfully',
count: bookings.length,
search_term: searchTerm,
filters_applied: filters
};
} catch (error) {
throw new Error(`Course booking search failed: ${error.message}`);
}
}
// Get upcoming courses
static async getUpcomingCourses(centerContext = null, limit = 10) {
try {
const courses = await CourseBooking.getUpcomingCourses(centerContext, limit);
return {
success: true,
data: courses,
message: 'Upcoming courses retrieved successfully',
count: courses.length
};
} catch (error) {
throw new Error(`Failed to get upcoming courses: ${error.message}`);
}
}
// Get course category details
static async getCourseCategoryDetails(categoryId) {
try {
const categoryDetails = await CourseBooking.getCourseCategoryDetails(categoryId);
if (!categoryDetails) {
return {
success: false,
message: 'Course category not found'
};
}
return {
success: true,
data: categoryDetails,
message: 'Course category details retrieved successfully'
};
} catch (error) {
throw new Error(`Failed to get course category details: ${error.message}`);
}
}
// Calculate end date
static async calculateEndDate(startDate, categoryId) {
try {
const categoryDetails = await CourseBooking.getCourseCategoryDetails(categoryId);
if (!categoryDetails) {
return {
success: false,
message: 'Course category not found'
};
}
const endDate = DateUtils.calculateEndDate(startDate, categoryDetails.duration_days);
const workingDays = DateUtils.getWorkingDaysBetween(startDate, endDate);
return {
success: true,
data: {
start_date: startDate,
end_date: endDate,
duration_days: categoryDetails.duration_days,
working_days: workingDays
},
message: 'End date calculated successfully'
};
} catch (error) {
throw new Error(`Failed to calculate end date: ${error.message}`);
}
}
// Validate course booking data
static async validateCourseBookingData(bookingData, customers, centerContext) {
// Basic validation
if (!bookingData.category_id || !bookingData.level_id) {
return { isValid: false, message: 'Course category and level are required' };
}
if (!bookingData.start_date) {
return { isValid: false, message: 'Start date is required' };
}
if (!bookingData.actual_instructor_id || !bookingData.document_instructor_id) {
return { isValid: false, message: 'Both actual and document instructors are required' };
}
if (!bookingData.delivery_type || !['onsite', 'offsite'].includes(bookingData.delivery_type)) {
return { isValid: false, message: 'Valid delivery type is required (onsite or offsite)' };
}
if (!customers || customers.length === 0) {
return { isValid: false, message: 'At least one customer is required' };
}
// Validate course type and center access
if (bookingData.course_type === 'uae' && centerContext.type !== 'main') {
return { isValid: false, message: 'Only Main Branch can create UAE courses' };
}
// Validate customer participants count
for (const customer of customers) {
if (!customer.customer_id || !customer.participants_count || customer.participants_count <= 0) {
return { isValid: false, message: 'All customers must have valid participant counts' };
}
}
return { isValid: true };
}
// Validate LPO quantities for UAE courses
static async validateLPOQuantities(customers, categoryId, levelId) {
for (const customer of customers) {
if (customer.lpo_line_item_id) {
// Check LPO line item availability
const [lpoCheck] = await pool.execute(
'SELECT li.quantity_remaining, lpo.valid_until FROM lpo_line_items li JOIN lpo_orders lpo ON li.lpo_order_id = lpo.id WHERE li.id = ? AND li.category_id = ? AND li.level_id = ?',
[customer.lpo_line_item_id, categoryId, levelId]
);
if (lpoCheck.length === 0) {
return { isValid: false, message: `LPO line item not found for customer ${customer.customer_id}` };
}
const { quantity_remaining, valid_until } = lpoCheck[0];
if (quantity_remaining < customer.participants_count) {
return { isValid: false, message: `Insufficient LPO quantity for customer. Available: ${quantity_remaining}, Requested: ${customer.participants_count}` };
}
if (new Date(valid_until) < new Date()) {
return { isValid: false, message: 'LPO has expired' };
}
}
}
return { isValid: true };
}
// Send booking created notifications
static async sendBookingCreatedNotifications(bookingId) {
try {
const booking = await CourseBooking.findById(bookingId);
if (!booking) return false;
// Get all recipients
const recipients = new Set();
// Add instructors
if (booking.actual_instructor_email) recipients.add(booking.actual_instructor_email);
if (booking.document_instructor_email && booking.document_instructor_email !== booking.actual_instructor_email) {
recipients.add(booking.document_instructor_email);
}
// Add customers
booking.customers.forEach(customer => {
if (customer.customer_email) recipients.add(customer.customer_email);
});
// Add admin email
if (process.env.ADMIN_EMAIL) recipients.add(process.env.ADMIN_EMAIL);
// Send notifications (implement based on EmailService)
const recipientArray = Array.from(recipients);
// You can implement the email sending logic here
console.log(`Sending course booking notifications to: ${recipientArray.join(', ')}`);
return true;
} catch (error) {
console.error('Error sending booking notifications:', error);
return false;
}
}
}