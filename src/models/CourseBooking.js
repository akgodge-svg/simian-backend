import mysql from 'mysql2/promise';
import { DateUtils } from '../utils/dateUtils.js';
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
export class CourseBooking {
constructor(data = {}) {
this.id = data?.id;
this.course_number = data?.course_number;
this.course_type = data?.course_type;
this.center_id = data?.center_id;
this.category_id = data?.category_id;
this.level_id = data?.level_id;
this.start_date = data?.start_date;
this.end_date = data?.end_date;
this.duration_days = data?.duration_days;
this.max_participants = data?.max_participants;
this.delivery_type = data?.delivery_type; // onsite or offsite only
this.actual_instructor_id = data?.actual_instructor_id;
this.document_instructor_id = data?.document_instructor_id;
this.booking_status = data?.booking_status || 'not_started';
this.created_by_user = data?.created_by_user;
this.created_by_center_id = data?.created_by_center_id;
this.notes = data?.notes;
this.is_active = data?.is_active ?? true;
this.created_at = data?.created_at;
this.updated_at = data?.updated_at;
// Additional computed fields
this.category_name = data?.category_name;
this.level_name = data?.level_name;
this.center_name = data?.center_name;
this.actual_instructor_name = data?.actual_instructor_name;
this.document_instructor_name = data?.document_instructor_name;
this.total_customers = data?.total_customers || 0;
this.estimated_participants = data?.estimated_participants || 0;
this.customers = data?.customers || [];
}
// Generate course booking number
static async generateCourseNumber(courseType) {
const connection = await pool.getConnection();
await connection.beginTransaction();
try {
const currentYear = new Date().getFullYear();
// Get or create sequence for current year and course type
const [existingSequence] = await connection.execute(
'SELECT last_number FROM course_booking_sequence WHERE course_type = ? AND year = ?',
[courseType, currentYear]
);
let nextNumber;
if (existingSequence.length > 0) {
nextNumber = existingSequence[0].last_number + 1;
await connection.execute(
'UPDATE course_booking_sequence SET last_number = ? WHERE course_type = ? AND year = ?',
[nextNumber, courseType, currentYear]
);
} else {
nextNumber = 1;
await connection.execute(
'INSERT INTO course_booking_sequence (course_type, year, last_number) VALUES (?, ?, ?)',
[courseType, currentYear, nextNumber]
);
}
const prefix = courseType === 'uae' ? 'U' : 'OS';
const courseNumber = `${prefix}-${nextNumber.toString().padStart(3, '0')}`;
await connection.commit();
return courseNumber;
} catch (error) {
await connection.rollback();
throw error;
} finally {
connection.release();
}
}
// Get all course bookings with center filtering
static async findAll(centerContext = null) {
let query = `
SELECT
cb.*,
cc.name as category_name,
cc.duration_days as category_duration,
cc.max_participants as category_max_participants,
ccl.level_name,
ccl.level_number,
c.name as center_name,
CONCAT(ai.first_name, ' ', ai.last_name) as actual_instructor_name,
CONCAT(di.first_name, ' ', di.last_name) as document_instructor_name,
COUNT(DISTINCT cbc.customer_id) as total_customers,
SUM(cbc.participants_count) as estimated_participants
FROM course_bookings cb
JOIN course_categories cc ON cb.category_id = cc.id
JOIN course_category_levels ccl ON cb.level_id = ccl.id
JOIN centers c ON cb.center_id = c.id
JOIN instructors ai ON cb.actual_instructor_id = ai.id
JOIN instructors di ON cb.document_instructor_id = di.id
LEFT JOIN course_booking_customers cbc ON cb.id = cbc.booking_id
WHERE cb.is_active = 1
`;
let params = [];
// Apply center filtering
if (centerContext && centerContext.type !== 'main') {
query += ` AND cb.created_by_center_id = ?`;
params.push(centerContext.id);
}
query += ` GROUP BY cb.id ORDER BY cb.created_at DESC`;
const [rows] = await pool.execute(query, params);
return rows.map(row => new CourseBooking(row));
}
// Get single course booking by ID
static async findById(id, centerContext = null) {
let query = `
SELECT
cb.*,
cc.name as category_name,
cc.duration_days as category_duration,
cc.max_participants as category_max_participants,
ccl.level_name,
ccl.level_number,
c.name as center_name,
CONCAT(ai.first_name, ' ', ai.last_name) as actual_instructor_name,
ai.email as actual_instructor_email,
ai.phone as actual_instructor_phone,
CONCAT(di.first_name, ' ', di.last_name) as document_instructor_name,
di.email as document_instructor_email,
di.phone as document_instructor_phone,
COUNT(DISTINCT cbc.customer_id) as total_customers,
SUM(cbc.participants_count) as estimated_participants
FROM course_bookings cb
JOIN course_categories cc ON cb.category_id = cc.id
JOIN course_category_levels ccl ON cb.level_id = ccl.id
JOIN centers c ON cb.center_id = c.id
JOIN instructors ai ON cb.actual_instructor_id = ai.id
JOIN instructors di ON cb.document_instructor_id = di.id
LEFT JOIN course_booking_customers cbc ON cb.id = cbc.booking_id
WHERE cb.id = ? AND cb.is_active = 1
`;
let params = [id];
// Apply center filtering
if (centerContext && centerContext.type !== 'main') {
query += ` AND cb.created_by_center_id = ?`;
params.push(centerContext.id);
}
query += ` GROUP BY cb.id`;
const [rows] = await pool.execute(query, params);
if (rows.length === 0) return null;
const booking = new CourseBooking(rows[0]);
// Get customers
booking.customers = await this.getBookingCustomers(id);
return booking;
}
// Get course booking customers
static async getBookingCustomers(bookingId) {
const query = `
SELECT
cbc.*,
c.name as customer_name,
c.customer_type,
c.email as customer_email,
c.phone as customer_phone,
c.company_name,
c.contact_person,
lpo.lpo_number,
li.quantity_remaining as lpo_remaining_quantity
FROM course_booking_customers cbc
JOIN customers c ON cbc.customer_id = c.id
LEFT JOIN lpo_line_items li ON cbc.lpo_line_item_id = li.id
LEFT JOIN lpo_orders lpo ON li.lpo_order_id = lpo.id
WHERE cbc.booking_id = ?
ORDER BY c.name
`;
const [rows] = await pool.execute(query, [bookingId]);
return rows;
}
// Create new course booking
async save() {
const connection = await pool.getConnection();
await connection.beginTransaction();
try {
// Generate course number
this.course_number = await CourseBooking.generateCourseNumber(this.course_type);
const insertQuery = `
INSERT INTO course_bookings (
course_number, course_type, center_id, category_id, level_id,
start_date, end_date, duration_days, max_participants,
delivery_type, actual_instructor_id, document_instructor_id,
booking_status, created_by_user, created_by_center_id, notes
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;
const [result] = await connection.execute(insertQuery, [
this.course_number,
this.course_type,
this.center_id,
this.category_id,
this.level_id,
this.start_date,
this.end_date,
this.duration_days,
this.max_participants,
this.delivery_type,
this.actual_instructor_id,
this.document_instructor_id,
this.booking_status,
this.created_by_user,
this.created_by_center_id,
this.notes
]);
this.id = result.insertId;
await connection.commit();
return this;
} catch (error) {
await connection.rollback();
throw error;
} finally {
connection.release();
}
}
// Get course CATEGORY details (duration and max_participants)
static async getCourseCategoryDetails(categoryId) {
const query = `
SELECT
cc.id,
cc.name,
cc.description,
cc.duration_days,
cc.max_participants
FROM course_categories cc
WHERE cc.id = ? AND cc.is_active = 1
`;
const [rows] = await pool.execute(query, [categoryId]);
return rows.length > 0 ? rows[0] : null;
}
// Get course category and level details combined
static async getCourseDetails(categoryId, levelId) {
const query = `
SELECT
cc.id as category_id,
cc.name as category_name,
cc.description as category_description,
cc.duration_days,
cc.max_participants,
ccl.id as level_id,
ccl.level_name,
ccl.level_number,
ccl.level_description
FROM course_categories cc
JOIN course_category_levels ccl ON cc.id = ccl.category_id
WHERE cc.id = ? AND ccl.id = ? AND cc.is_active = 1 AND ccl.is_active = 1
`;
const [rows] = await pool.execute(query, [categoryId, levelId]);
return rows.length > 0 ? rows[0] : null;
}
// Add customer to booking
static async addCustomer(bookingId, customerData) {
const connection = await pool.getConnection();
await connection.beginTransaction();
try {
// Check if customer already exists in booking
const [existing] = await connection.execute(
'SELECT id FROM course_booking_customers WHERE booking_id = ? AND customer_id = ?',
[bookingId, customerData.customer_id]
);
if (existing.length > 0) {
throw new Error('Customer already added to this course booking');
}
// Check course capacity
const [capacityCheck] = await connection.execute(
'SELECT cb.max_participants, COALESCE(SUM(cbc.participants_count), 0) as current_participants FROM course_bookings cb LEFT JOIN course_booking_customers cbc ON cb.id = cbc.booking_id WHERE cb.id = ? GROUP BY cb.id',
[bookingId]
);
if (capacityCheck.length === 0) {
throw new Error('Course booking not found');
}
const { max_participants, current_participants } = capacityCheck[0];
const newTotal = current_participants + customerData.participants_count;
if (newTotal > max_participants) {
throw new Error(`Adding ${customerData.participants_count} participants would exceed course capacity of ${max_participants}. Current: ${current_participants}`);
}
// For UAE courses with LPO, reduce LPO quantity
if (customerData.lpo_line_item_id) {
await connection.execute(
'UPDATE lpo_line_items SET quantity_remaining = quantity_remaining - ?, quantity_used = quantity_used + ? WHERE id = ?',
[customerData.participants_count, customerData.participants_count, customerData.lpo_line_item_id]
);
}
// Add customer to booking
const insertQuery = `
INSERT INTO course_booking_customers (
booking_id, customer_id, lpo_line_item_id, participants_count, customer_notes
) VALUES (?, ?, ?, ?, ?)
`;
await connection.execute(insertQuery, [
bookingId,
customerData.customer_id,
customerData.lpo_line_item_id || null,
customerData.participants_count,
customerData.customer_notes || null
]);
await connection.commit();
return true;
} catch (error) {
await connection.rollback();
throw error;
} finally {
connection.release();
}
}
// Update booking status
async updateStatus(newStatus) {
const query = `
UPDATE course_bookings
SET booking_status = ?, updated_at = CURRENT_TIMESTAMP
WHERE id = ?
`;
await pool.execute(query, [newStatus, this.id]);
this.booking_status = newStatus;
return this;
}
// Cancel booking
async cancel() {
const connection = await pool.getConnection();
await connection.beginTransaction();
try {
// Restore LPO quantities for UAE courses
const [lpoCustomers] = await connection.execute(
'SELECT lpo_line_item_id, participants_count FROM course_booking_customers WHERE booking_id = ? AND lpo_line_item_id IS NOT NULL',
[this.id]
);
for (const customer of lpoCustomers) {
await connection.execute(
'UPDATE lpo_line_items SET quantity_remaining = quantity_remaining + ?, quantity_used = quantity_used - ? WHERE id = ?',
[customer.participants_count, customer.participants_count, customer.lpo_line_item_id]
);
}
// Update booking status
await connection.execute(
'UPDATE course_bookings SET booking_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
['cancelled', this.id]
);
this.booking_status = 'cancelled';
await connection.commit();
return this;
} catch (error) {
await connection.rollback();
throw error;
} finally {
connection.release();
}
}
// Search course bookings
static async search(searchTerm, centerContext = null, filters = {}) {
let query = `
SELECT
cb.*,
cc.name as category_name,
ccl.level_name,
c.name as center_name,
CONCAT(ai.first_name, ' ', ai.last_name) as actual_instructor_name,
COUNT(DISTINCT cbc.customer_id) as total_customers,
SUM(cbc.participants_count) as estimated_participants
FROM course_bookings cb
JOIN course_categories cc ON cb.category_id = cc.id
JOIN course_category_levels ccl ON cb.level_id = ccl.id
JOIN centers c ON cb.center_id = c.id
JOIN instructors ai ON cb.actual_instructor_id = ai.id
LEFT JOIN course_booking_customers cbc ON cb.id = cbc.booking_id
WHERE cb.is_active = 1
`;
let params = [];
// Apply search term
if (searchTerm && searchTerm.trim()) {
query += ` AND (
cb.course_number LIKE ? OR
cc.name LIKE ? OR
ccl.level_name LIKE ? OR
CONCAT(ai.first_name, ' ', ai.last_name) LIKE ?
)`;
const searchPattern = `%${searchTerm.trim()}%`;
params.push(searchPattern, searchPattern, searchPattern, searchPattern);
}
// Apply filters
if (filters.course_type) {
query += ` AND cb.course_type = ?`;
params.push(filters.course_type);
}
if (filters.booking_status) {
query += ` AND cb.booking_status = ?`;
params.push(filters.booking_status);
}
if (filters.category_id) {
query += ` AND cb.category_id = ?`;
params.push(filters.category_id);
}
// Apply center filtering
if (centerContext && centerContext.type !== 'main') {
query += ` AND cb.created_by_center_id = ?`;
params.push(centerContext.id);
}
query += ` GROUP BY cb.id ORDER BY cb.created_at DESC`;
// Apply pagination
if (filters.limit) {
query += ` LIMIT ?`;
params.push(parseInt(filters.limit));
if (filters.offset) {
query += ` OFFSET ?`;
params.push(parseInt(filters.offset));
}
}
const [rows] = await pool.execute(query, params);
return rows.map(row => new CourseBooking(row));
}
// Get upcoming courses
static async getUpcomingCourses(centerContext = null, limit = 10) {
let query = `
SELECT
cb.*,
cc.name as category_name,
ccl.level_name,
c.name as center_name,
CONCAT(ai.first_name, ' ', ai.last_name) as actual_instructor_name,
COUNT(DISTINCT cbc.customer_id) as total_customers,
SUM(cbc.participants_count) as estimated_participants
FROM course_bookings cb
JOIN course_categories cc ON cb.category_id = cc.id
JOIN course_category_levels ccl ON cb.level_id = ccl.id
JOIN centers c ON cb.center_id = c.id
JOIN instructors ai ON cb.actual_instructor_id = ai.id
LEFT JOIN course_booking_customers cbc ON cb.id = cbc.booking_id
WHERE cb.is_active = 1
AND cb.start_date >= CURDATE()
AND cb.booking_status IN ('not_started', 'in_progress')
`;
let params = [];
// Apply center filtering
if (centerContext && centerContext.type !== 'main') {
query += ` AND cb.created_by_center_id = ?`;
params.push(centerContext.id);
}
query += ` GROUP BY cb.id ORDER BY cb.start_date ASC LIMIT ?`;
params.push(limit);
const [rows] = await pool.execute(query, params);
return rows.map(row => new CourseBooking(row));
}
// Test database connection
static async testConnection() {
try {
await pool.execute('SELECT 1');
return true;
} catch (error) {
console.error('Course Booking database connection test failed:', error);
return false;
}
}
}