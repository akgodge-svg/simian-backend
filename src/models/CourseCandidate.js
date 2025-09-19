import mysql from 'mysql2/promise';
import { FileStorageService } from '../services/FileStorageService.js';
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
export class CourseCandidate {
constructor(data = {}) {
this.id = data?.id;
this.booking_id = data?.booking_id;
this.first_name = data?.first_name;
this.last_name = data?.last_name;
this.gender = data?.gender;
this.date_of_birth = data?.date_of_birth;
this.company_id = data?.company_id;
this.employee_id = data?.employee_id;
this.photo_path = data?.photo_path;
this.card_type = data?.card_type;
this.previous_card_number = data?.previous_card_number;
this.level_1_card_number = data?.level_1_card_number;
this.candidate_status = data?.candidate_status || 'active';
this.assessment_comments = data?.assessment_comments;
this.is_active = data?.is_active ?? true;
this.created_at = data?.created_at;
this.updated_at = data?.updated_at;
// Additional computed fields
this.full_name = data?.full_name;
this.company_name = data?.company_name;
this.card_info = data?.card_info || {};
this.certificate_info = data?.certificate_info || {};
this.attendance_info = data?.attendance_info || {};
}
// Get all candidates for a course booking
static async findByBookingId(bookingId) {
const query = `
SELECT
cc.*,
CONCAT(cc.first_name, ' ', cc.last_name) as full_name,
c.name as company_name,
c.company_name as company_full_name,
card.application_status as card_application_status,
card.print_status as card_print_status,
card.card_number,
cert.application_status as cert_application_status,
cert.print_status as cert_print_status,
cert.certificate_number
FROM course_candidates cc
LEFT JOIN customers c ON cc.company_id = c.id
LEFT JOIN candidate_cards card ON cc.id = card.candidate_id
LEFT JOIN candidate_certificates cert ON cc.id = cert.candidate_id
WHERE cc.booking_id = ? AND cc.is_active = 1
ORDER BY cc.created_at ASC
`;
const [rows] = await pool.execute(query, [bookingId]);
return rows.map(row => new CourseCandidate(row));
}
// Get single candidate by ID
static async findById(id) {
const query = `
SELECT
cc.*,
CONCAT(cc.first_name, ' ', cc.last_name) as full_name,
c.name as company_name,
c.company_name as company_full_name,
card.application_status as card_application_status,
card.print_status as card_print_status,
card.card_number,
card.card_image_path,
cert.application_status as cert_application_status,
cert.print_status as cert_print_status,
cert.certificate_number,
cert.certificate_image_path
FROM course_candidates cc
LEFT JOIN customers c ON cc.company_id = c.id
LEFT JOIN candidate_cards card ON cc.id = card.candidate_id
LEFT JOIN candidate_certificates cert ON cc.id = cert.candidate_id
WHERE cc.id = ? AND cc.is_active = 1
`;
const [rows] = await pool.execute(query, [id]);
if (rows.length === 0) return null;
return new CourseCandidate(rows[0]);
}
// Create new candidate
async save() {
const connection = await pool.getConnection();
await connection.beginTransaction();
try {
// Check for duplicates
const duplicateCheck = await this.checkForDuplicates();
if (!duplicateCheck.isValid) {
throw new Error(duplicateCheck.message);
}
// Insert candidate
const insertQuery = `
INSERT INTO course_candidates (
booking_id, first_name, last_name, gender, date_of_birth,
company_id, employee_id, photo_path, card_type,
previous_card_number, level_1_card_number, candidate_status
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;
const [result] = await connection.execute(insertQuery, [
this.booking_id,
this.first_name,
this.last_name,
this.gender,
this.date_of_birth,
this.company_id,
this.employee_id,
this.photo_path,
this.card_type,
this.previous_card_number,
this.level_1_card_number,
this.candidate_status
]);
this.id = result.insertId;
// Create card record
await connection.execute(
'INSERT INTO candidate_cards (candidate_id) VALUES (?)',
[this.id]
);
// Create certificate record
await connection.execute(
'INSERT INTO candidate_certificates (candidate_id) VALUES (?)',
[this.id]
);
// Update LPO balance
await this.updateLPOBalance(connection, 'add');
await connection.commit();
return this;
} catch (error) {
await connection.rollback();
throw error;
} finally {
connection.release();
}
}
// Check for duplicates
async checkForDuplicates() {
// Check for duplicate employee ID within company
const [employeeCheck] = await pool.execute(
'SELECT id FROM course_candidates WHERE company_id = ? AND employee_id = ? AND is_active = 1 AND id != ?',
[this.company_id, this.employee_id, this.id || 0]
);
if (employeeCheck.length > 0) {
return {
isValid: false,
message: 'Employee ID already exists for this company'
};
}
// Check for duplicate name + DOB + company
const [nameCheck] = await pool.execute(
'SELECT id FROM course_candidates WHERE first_name = ? AND last_name = ? AND date_of_birth = ? AND company_id = ? AND is_active = 1 AND id != ?',
[this.first_name, this.last_name, this.date_of_birth, this.company_id, this.id || 0]
);
if (nameCheck.length > 0) {
return {
isValid: false,
message: 'Candidate with same name, date of birth, and company already exists'
};
}
// Check for duplicate card numbers if provided
if (this.previous_card_number) {
const [cardCheck] = await pool.execute(
'SELECT id FROM course_candidates WHERE previous_card_number = ? AND is_active = 1 AND id != ?',
[this.previous_card_number, this.id || 0]
);
if (cardCheck.length > 0) {
return {
isValid: false,
message: 'Previous card number already exists in the system'
};
}
}
return { isValid: true };
}
// Update LPO balance
async updateLPOBalance(connection, action) {
const query = action === 'add'
? 'UPDATE course_booking_customers SET participants_count = participants_count + 1 WHERE booking_id = ? AND customer_id = ?'
: 'UPDATE course_booking_customers SET participants_count = participants_count - 1 WHERE booking_id = ? AND customer_id = ?';
await connection.execute(query, [this.booking_id, this.company_id]);
}
// Update candidate status
async updateStatus(newStatus, assessmentComments = null) {
const query = `
UPDATE course_candidates
SET candidate_status = ?, assessment_comments = ?, updated_at = CURRENT_TIMESTAMP
WHERE id = ?
`;
await pool.execute(query, [newStatus, assessmentComments, this.id]);
this.candidate_status = newStatus;
this.assessment_comments = assessmentComments;
return this;
}
// Delete candidate
async delete() {
const connection = await pool.getConnection();
await connection.beginTransaction();
try {
// Update LPO balance
await this.updateLPOBalance(connection, 'remove');
// Delete photo file if exists
if (this.photo_path) {
await FileStorageService.deleteFile(this.photo_path);
}
// Soft delete candidate
await connection.execute(
'UPDATE course_candidates SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
[this.id]
);
await connection.commit();
return true;
} catch (error) {
await connection.rollback();
throw error;
} finally {
connection.release();
}
}
// Get attendance for candidate
async getAttendance(startDate, endDate) {
const query = `
SELECT
attendance_date,
is_present,
marked_by_user,
marked_at,
notes
FROM candidate_attendance
WHERE candidate_id = ?
AND attendance_date BETWEEN ? AND ?
ORDER BY attendance_date ASC
`;
const [rows] = await pool.execute(query, [this.id, startDate, endDate]);
return rows;
}
// Mark attendance
static async markAttendance(candidateId, attendanceDate, isPresent, markedBy) {
const query = `
INSERT INTO candidate_attendance (candidate_id, attendance_date, is_present, marked_by_user)
VALUES (?, ?, ?, ?)
ON DUPLICATE KEY UPDATE
is_present = VALUES(is_present),
marked_by_user = VALUES(marked_by_user),
marked_at = CURRENT_TIMESTAMP
`;
await pool.execute(query, [candidateId, attendanceDate, isPresent, markedBy]);
return true;
}
// Get candidates by status
static async findByStatus(bookingId, status) {
const query = `
SELECT
cc.*,
CONCAT(cc.first_name, ' ', cc.last_name) as full_name,
c.name as company_name
FROM course_candidates cc
LEFT JOIN customers c ON cc.company_id = c.id
WHERE cc.booking_id = ? AND cc.candidate_status = ? AND cc.is_active = 1
ORDER BY cc.first_name, cc.last_name
`;
const [rows] = await pool.execute(query, [bookingId, status]);
return rows.map(row => new CourseCandidate(row));
}
// Get attendance summary for course
static async getAttendanceSummary(bookingId, startDate, endDate) {
const query = `
SELECT
cc.id,
cc.first_name,
cc.last_name,
cc.candidate_status,
COUNT(ca.id) as total_days,
SUM(CASE WHEN ca.is_present = 1 THEN 1 ELSE 0 END) as present_days,
SUM(CASE WHEN ca.is_present = 0 THEN 1 ELSE 0 END) as absent_days,
ROUND((SUM(CASE WHEN ca.is_present = 1 THEN 1 ELSE 0 END) / COUNT(ca.id)) * 100, 2) as attendance_percentage
FROM course_candidates cc
LEFT JOIN candidate_attendance ca ON cc.id = ca.candidate_id
AND ca.attendance_date BETWEEN ? AND ?
WHERE cc.booking_id = ? AND cc.is_active = 1
GROUP BY cc.id
ORDER BY cc.first_name, cc.last_name
`;
const [rows] = await pool.execute(query, [startDate, endDate, bookingId]);
return rows;
}
// Bulk update candidate statuses
static async bulkUpdateStatus(candidateIds, newStatus, assessmentComments = null) {
if (!candidateIds || candidateIds.length === 0) return false;
const placeholders = candidateIds.map(() => '?').join(',');
const query = `
UPDATE course_candidates
SET candidate_status = ?, assessment_comments = ?, updated_at = CURRENT_TIMESTAMP
WHERE id IN (${placeholders})
`;
const params = [newStatus, assessmentComments, ...candidateIds];
await pool.execute(query, params);
return true;
}
// Get candidates for Excel export
static async getCandidatesForExport(bookingId) {
const query = `
SELECT
cc.id,
cc.first_name,
cc.last_name,
cc.date_of_birth,
cc.employee_id,
cc.photo_path,
cc.card_type,
cc.previous_card_number,
cc.level_1_card_number,
c.name as company_name,
card.card_number as final_card_number
FROM course_candidates cc
LEFT JOIN customers c ON cc.company_id = c.id
LEFT JOIN candidate_cards card ON cc.id = card.candidate_id
WHERE cc.booking_id = ? AND cc.is_active = 1
ORDER BY c.name, cc.first_name, cc.last_name
`;
const [rows] = await pool.execute(query, [bookingId]);
return rows;
}
// Test database connection
static async testConnection() {
try {
await pool.execute('SELECT 1');
return true;
} catch (error) {
console.error('Course Candidate database connection test failed:', error);
return false;
}
}
}