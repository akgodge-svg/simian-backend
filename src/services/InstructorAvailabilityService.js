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
export class InstructorAvailabilityService {
// Get available instructors for course category and date range
static async getAvailableInstructors(categoryId, startDate, endDate, centerContext) {
try {
let query = `
SELECT DISTINCT
i.id,
i.first_name,
i.last_name,
i.email,
i.phone,
i.primary_center_id,
c.name as primary_center_name,
GROUP_CONCAT(DISTINCT cc.name ORDER BY cc.name) as qualified_categories
FROM instructors i
LEFT JOIN centers c ON i.primary_center_id = c.id
LEFT JOIN instructor_qualifications iq ON i.id = iq.instructor_id
LEFT JOIN course_categories cc ON iq.category_id = cc.id
WHERE i.is_active = 1
AND i.status = 'active'
AND iq.category_id = ?
AND i.id NOT IN (
SELECT DISTINCT actual_instructor_id
FROM course_bookings
WHERE is_active = 1
AND booking_status IN ('not_started', 'in_progress')
AND (
(start_date <= ? AND end_date >= ?) OR
(start_date <= ? AND end_date >= ?) OR
(start_date >= ? AND start_date <= ?)
)
UNION
SELECT DISTINCT document_instructor_id
FROM course_bookings
WHERE is_active = 1
AND booking_status IN ('not_started', 'in_progress')
AND document_instructor_id != actual_instructor_id
AND (
(start_date <= ? AND end_date >= ?) OR
(start_date <= ? AND end_date >= ?) OR
(start_date >= ? AND start_date <= ?)
)
)
`;
let params = [
categoryId,
startDate, startDate,
endDate, endDate,
startDate, endDate,
startDate, startDate,
endDate, endDate,
startDate, endDate
];
// Apply center-based filtering
if (centerContext && centerContext.type !== 'main') {
// Overseas centers see only their own instructors
query += ` AND i.primary_center_id = ?`;
params.push(centerContext.id);
}
query += ` GROUP BY i.id ORDER BY i.first_name, i.last_name`;
const [rows] = await pool.execute(query, params);
return rows.map(row => ({
...row,
full_name: `${row.first_name} ${row.last_name}`,
is_available: true
}));
} catch (error) {
console.error('Error getting available instructors:', error);
throw error;
}
}
// Check if specific instructor is available
static async checkInstructorAvailability(instructorId, startDate, endDate, excludeBookingId = null) {
try {
let query = `
SELECT COUNT(*) as conflict_count
FROM course_bookings
WHERE is_active = 1
AND booking_status IN ('not_started', 'in_progress')
AND (actual_instructor_id = ? OR document_instructor_id = ?)
AND (
(start_date <= ? AND end_date >= ?) OR
(start_date <= ? AND end_date >= ?) OR
(start_date >= ? AND start_date <= ?)
)
`;
let params = [
instructorId, instructorId,
startDate, startDate,
endDate, endDate,
startDate, endDate
];
if (excludeBookingId) {
query += ` AND id != ?`;
params.push(excludeBookingId);
}
const [rows] = await pool.execute(query, params);
return {
isAvailable: rows[0].conflict_count === 0,
conflictCount: rows[0].conflict_count
};
} catch (error) {
console.error('Error checking instructor availability:', error);
throw error;
}
}
}