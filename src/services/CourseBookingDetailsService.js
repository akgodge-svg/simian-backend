import { CourseBooking } from '../models/CourseBooking.js';
import { CourseCandidate } from '../models/CourseCandidate.js';
import { FileStorageService } from './FileStorageService.js';
import { ExcelZipService } from './ExcelZipService.js';
import { DateUtils } from '../utils/dateUtils.js';
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
export class CourseBookingDetailsService {
// Get course booking details with all related data
static async getCourseBookingDetails(bookingId, userContext) {
try {
// Get course booking
const booking = await CourseBooking.findById(bookingId, userContext.centerContext);
if (!booking) {
return {
success: false,
message: 'Course booking not found or access denied'
};
}
// Get candidates
const candidates = await CourseCandidate.findByBookingId(bookingId);
// Get LPO balance information
const lpoBalance = await this.getLPOBalanceInfo(bookingId);
// Get attendance dates
const attendanceDates = this.generateAttendanceDates(booking.start_date, booking.duration_days);
// Get course documents
const documents = await this.getCourseDocuments(bookingId);
// Check access permissions
const accessPermissions = this.getAccessPermissions(booking, userContext);
return {
success: true,
data: {
booking,
candidates,
lpoBalance,
attendanceDates,
documents,
accessPermissions
},
message: 'Course booking details retrieved successfully'
};
} catch (error) {
throw new Error(`Failed to get course booking details: ${error.message}`);
}
}
// Get LPO balance information for companies
static async getLPOBalanceInfo(bookingId) {
const query = `
SELECT
cbc.customer_id,
c.name as company_name,
cbc.participants_count as allocated,
COUNT(cc.id) as used,
(cbc.participants_count - COUNT(cc.id)) as remaining,
ROUND((COUNT(cc.id) / cbc.participants_count) * 100, 1) as usage_percentage
FROM course_booking_customers cbc
LEFT JOIN customers c ON cbc.customer_id = c.id
LEFT JOIN course_candidates cc ON cc.company_id = cbc.customer_id AND cc.booking_id = cbc.booking_id AND cc.is_active = 1
WHERE cbc.booking_id = ?
GROUP BY cbc.customer_id, cbc.participants_count, c.name
ORDER BY c.name
`;
const [rows] = await pool.execute(query, [bookingId]);
return rows;
}
// Generate attendance dates excluding weekends
static generateAttendanceDates(startDate, duration) {
const dates = [];
const current = new Date(startDate);
let addedDays = 0;
while (addedDays < duration) {
const dayOfWeek = current.getDay();
// Skip weekends (0 = Sunday, 6 = Saturday)
if (dayOfWeek !== 0 && dayOfWeek !== 6) {
dates.push(new Date(current).toISOString().split('T')[0]);
addedDays++;
}
current.setDate(current.getDate() + 1);
}
return dates;
}
// Get course documents
static async getCourseDocuments(bookingId) {
const query = `
SELECT
id,
document_type,
original_filename,
file_path,
file_size,
mime_type,
uploaded_by_user,
created_at
FROM course_documents
WHERE booking_id = ? AND is_active = 1
ORDER BY document_type, created_at ASC
`;
const [rows] = await pool.execute(query, [bookingId]);
return {
paperwork: rows.filter(doc => doc.document_type === 'paperwork'),
assessments: rows.filter(doc => doc.document_type === 'assessment')
};
}
// Get access permissions based on user role and course status
static getAccessPermissions(booking, userContext) {
const isAdmin = userContext.role === 'admin';
const isInstructor = userContext.role === 'instructor';
const isCompleted = booking.booking_status === 'completed';
const isInstructorLocked = booking.instructor_locked;
return {
canAddCandidates: isInstructor && !isCompleted && !isInstructorLocked,
canMarkAttendance: isInstructor && !isCompleted && !isInstructorLocked,
canUploadDocuments: isInstructor && !isCompleted && !isInstructorLocked,
canAssessCandidates: isInstructor && !isCompleted && !isInstructorLocked,
canManageCardsAndCertificates: isInstructor && !isCompleted && !isInstructorLocked,
canCompleteCourse: isInstructor && !isCompleted && !isInstructorLocked,
canAccessAdminFunctions: isAdmin && isCompleted,
canDownloadData: isAdmin && isCompleted,
canViewPO: isAdmin && isCompleted,
canViewCWA: isAdmin && isCompleted,
canViewCourseCompletion: isAdmin && isCompleted,
canViewTransmittal: isAdmin && isCompleted,
isReadOnly: (!isInstructor && !isAdmin) || (isInstructor && isInstructorLocked)
};
}
// Add candidate to course
static async addCandidate(bookingId, candidateData, photoFile, userContext) {
try {
// Get course booking to validate capacity
const booking = await CourseBooking.findById(bookingId);
if (!booking) {
return {
success: false,
message: 'Course booking not found'
};
}
// Check current candidate count
const currentCandidates = await CourseCandidate.findByBookingId(bookingId);
if (currentCandidates.length >= booking.max_participants) {
return {
success: false,
message: `Course is at full capacity (${booking.max_participants} candidates)`
};
}
// Check company LPO balance
const lpoBalance = await this.getLPOBalanceInfo(bookingId);
const companyBalance = lpoBalance.find(balance => balance.customer_id == candidateData.company_id);
if (!companyBalance || companyBalance.remaining <= 0) {
return {
success: false,
message: 'No remaining LPO balance for this company'
};
}
// Store candidate photo
let photoPath = null;
if (photoFile) {
const photoResult = await FileStorageService.storeCandidatePhoto(
booking.course_number,
photoFile.buffer,
photoFile.originalname
);
if (photoResult.success) {
photoPath = photoResult.path;
}
}
// Create candidate
const candidate = new CourseCandidate({
...candidateData,
booking_id: bookingId,
photo_path: photoPath
});
await candidate.save();
// Generate attendance records for all course dates
const attendanceDates = this.generateAttendanceDates(booking.start_date, booking.duration_days);
for (const date of attendanceDates) {
await CourseCandidate.markAttendance(candidate.id, date, true, userContext.username);
}
return {
success: true,
data: candidate,
message: 'Candidate added successfully'
};
} catch (error) {
throw new Error(`Failed to add candidate: ${error.message}`);
}
}
// Update attendance
static async updateAttendance(bookingId, attendanceData, userContext) {
try {
const updates = [];
for (const update of attendanceData) {
await CourseCandidate.markAttendance(
update.candidate_id,
update.date,
update.is_present,
userContext.username
);
updates.push(update);
}
return {
success: true,
data: updates,
message: 'Attendance updated successfully'
};
} catch (error) {
throw new Error(`Failed to update attendance: ${error.message}`);
}
}
// Upload course document
static async uploadCourseDocument(bookingId, documentType, file, userContext) {
try {
const booking = await CourseBooking.findById(bookingId);
if (!booking) {
return {
success: false,
message: 'Course booking not found'
};
}
// Validate file type
const allowedTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.txt'];
if (!FileStorageService.validateFileType(file.originalname, allowedTypes)) {
return {
success: false,
message: 'File type not allowed'
};
}
// Store document
const documentResult = await FileStorageService.storeCourseDocument(
booking.course_number,
documentType,
file.buffer,
file.originalname,
file.mimetype
);
if (!documentResult.success) {
return {
success: false,
message: 'Failed to store document'
};
}
// Save to database
const insertQuery = `
INSERT INTO course_documents (
booking_id, document_type, original_filename, stored_filename,
file_path, file_size, mime_type, uploaded_by_user
) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`;
await pool.execute(insertQuery, [
bookingId,
documentType,
file.originalname,
documentResult.filename,
documentResult.path,
documentResult.size,
documentResult.mimeType,
userContext.username
]);
return {
success: true,
data: {
filename: file.originalname,
path: documentResult.path,
size: documentResult.size
},
message: 'Document uploaded successfully'
};
} catch (error) {
throw new Error(`Failed to upload document: ${error.message}`);
}
}
// Assess candidates (pass/fail)
static async assessCandidates(bookingId, assessments, userContext) {
try {
const updates = [];
for (const assessment of assessments) {
await CourseCandidate.findById(assessment.candidate_id).then(candidate => {
if (candidate) {
return candidate.updateStatus(assessment.status, assessment.comments);
}
});
updates.push(assessment);
}
return {
success: true,
data: updates,
message: 'Candidate assessments updated successfully'
};
} catch (error) {
throw new Error(`Failed to update assessments: ${error.message}`);
}
}
// Complete course (instructor lockout)
static async completeCourse(bookingId, userContext) {
try {
// Validate prerequisites
const validation = await this.validateCourseCompletion(bookingId);
if (!validation.isValid) {
return {
success: false,
message: validation.message
};
}
// Update course status and lock instructor
await pool.execute(
'UPDATE course_bookings SET booking_status = ?, instructor_locked = 1, completed_at = CURRENT_TIMESTAMP WHERE id = ?',
['completed', bookingId]
);
return {
success: true,
message: 'Course completed successfully. Admin can now proceed with post-completion workflow.'
};
} catch (error) {
throw new Error(`Failed to complete course: ${error.message}`);
}
}
// Validate course completion prerequisites
static async validateCourseCompletion(bookingId) {
// Check if all candidates have 100% attendance
const attendanceSummary = await CourseCandidate.getAttendanceSummary(
bookingId,
// These dates should come from the actual course booking
'2024-01-01', '2024-12-31'
);
for (const summary of attendanceSummary) {
if (summary.attendance_percentage < 100 && summary.candidate_status === 'active') {
return {
isValid: false,
message: `Candidate ${summary.first_name} ${summary.last_name} does not have 100% attendance`
};
}
}
// Check if paperwork and assessments are uploaded
const [documents] = await pool.execute(
'SELECT document_type, COUNT(*) as count FROM course_documents WHERE booking_id = ? AND is_active = 1 GROUP BY document_type',
[bookingId]
);
const paperworkCount = documents.find(d => d.document_type === 'paperwork')?.count || 0;
const assessmentCount = documents.find(d => d.document_type === 'assessment')?.count || 0;
if (paperworkCount === 0) {
return {
isValid: false,
message: 'Course paperwork must be uploaded before completion'
};
}
if (assessmentCount === 0) {
return {
isValid: false,
message: 'Course assessments must be uploaded before completion'
};
}
// Check if all candidates have been assessed (passed or failed)
const [unassessed] = await pool.execute(
'SELECT COUNT(*) as count FROM course_candidates WHERE booking_id = ? AND candidate_status = "active" AND is_active = 1',
[bookingId]
);
if (unassessed[0].count > 0) {
return {
isValid: false,
message: 'All candidates must be assessed (passed or failed) before course completion'
};
}
return { isValid: true };
}
// Admin download functionality
static async downloadCourseData(bookingId, downloadType, userContext) {
try {
const booking = await CourseBooking.findById(bookingId);
if (!booking) {
return {
success: false,
message: 'Course booking not found'
};
}
// Check admin permissions
if (userContext.role !== 'admin') {
return {
success: false,
message: 'Access denied. Admin privileges required.'
};
}
if (booking.booking_status !== 'completed') {
return {
success: false,
message: 'Course must be completed before downloading data'
};
}
let result;
switch (downloadType) {
case 'excel':
result = await this.generateExcelDownload(bookingId, booking.course_number, userContext.id);
break;
case 'zip':
result = await this.generateZipDownload(bookingId, booking.course_number, userContext.id);
break;
case 'combined':
default:
result = await this.generateCombinedDownload(bookingId, booking.course_number, userContext.id);
break;
}
// Log download activity
await ExcelZipService.logDownloadActivity(
bookingId,
userContext.username,
downloadType,
result.size,
'success'
);
return {
success: true,
data: result,
message: 'Download package generated successfully'
};
} catch (error) {
// Log failed download
await ExcelZipService.logDownloadActivity(
bookingId,
userContext.username,
downloadType,
0,
'failed',
error.message
);
throw new Error(`Failed to generate download: ${error.message}`);
}
}
// Generate Excel download only
static async generateExcelDownload(bookingId, courseNumber, adminId) {
const tempDir = await FileStorageService.createTempDownloadDir(adminId);
return await ExcelZipService.generateCandidateExcel(bookingId, courseNumber, tempDir);
}
// Generate ZIP download only
static async generateZipDownload(bookingId, courseNumber, adminId) {
const tempDir = await FileStorageService.createTempDownloadDir(adminId);
return await ExcelZipService.createCourseDocumentsZip(bookingId, courseNumber, tempDir);
}
// Generate combined download
static async generateCombinedDownload(bookingId, courseNumber, adminId) {
return await ExcelZipService.createCombinedPackage(bookingId, courseNumber, adminId);
}
// Clean up download files after serving
static async cleanupDownloadFiles(tempDir) {
return await FileStorageService.cleanupTempFiles(tempDir);
}
}