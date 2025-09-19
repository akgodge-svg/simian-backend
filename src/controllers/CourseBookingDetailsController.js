import { CourseBookingDetailsService } from '../services/CourseBookingDetailsService.js';
import { FileStorageService } from '../services/FileStorageService.js';
import multer from 'multer';
import path from 'path';
// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
storage: storage,
limits: {
fileSize: 25 * 1024 * 1024 // 25MB limit
},
fileFilter: (req, file, cb) => {
// Allow photos and documents
const allowedTypes = ['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx', '.txt'];
const fileExt = path.extname(file.originalname).toLowerCase();
if (allowedTypes.includes(fileExt)) {
cb(null, true);
} else {
cb(new Error('File type not allowed'), false);
}
}
});
export class CourseBookingDetailsController {
// GET /api/course-booking-details/:id
static async getCourseBookingDetails(req, res) {
try {
const { id } = req.params;
if (!id || isNaN(id)) {
return res.status(400).json({
success: false,
message: 'Valid course booking ID is required'
});
}
const userContext = {
centerContext: req.centerContext || { id: 1, type: 'main' },
role: req.userRole || 'instructor',
username: req.userName || 'system',
id: req.userId || 1
};
const result = await CourseBookingDetailsService.getCourseBookingDetails(id, userContext);
if (!result.success) {
return res.status(404).json(result);
}
res.status(200).json(result);
} catch (error) {
console.error('Error getting course booking details:', error);
res.status(500).json({
success: false,
message: error.message
});
}
}
// POST /api/course-booking-details/:id/candidates
static async addCandidate(req, res) {
upload.single('photo')(req, res, async (err) => {
if (err) {
return res.status(400).json({
success: false,
message: err.message
});
}
try {
const { id } = req.params;
const candidateData = req.body;
const photoFile = req.file;
if (!id || isNaN(id)) {
return res.status(400).json({
success: false,
message: 'Valid course booking ID is required'
});
}
if (!candidateData.first_name || !candidateData.last_name) {
return res.status(400).json({
success: false,
message: 'First name and last name are required'
});
}
const userContext = {
centerContext: req.centerContext || { id: 1, type: 'main' },
role: req.userRole || 'instructor',
username: req.userName || 'system',
id: req.userId || 1
};
const result = await CourseBookingDetailsService.addCandidate(
id,
candidateData,
photoFile,
userContext
);
if (!result.success) {
return res.status(400).json(result);
}
res.status(201).json(result);
} catch (error) {
console.error('Error adding candidate:', error);
res.status(500).json({
success: false,
message: error.message
});
}
});
}
// PUT /api/course-booking-details/:id/attendance
static async updateAttendance(req, res) {
try {
const { id } = req.params;
const attendanceData = req.body.attendance;
if (!id || isNaN(id)) {
return res.status(400).json({
success: false,
message: 'Valid course booking ID is required'
});
}
if (!attendanceData || !Array.isArray(attendanceData)) {
return res.status(400).json({
success: false,
message: 'Attendance data is required and must be an array'
});
}
const userContext = {
centerContext: req.centerContext || { id: 1, type: 'main' },
role: req.userRole || 'instructor',
username: req.userName || 'system',
id: req.userId || 1
};
const result = await CourseBookingDetailsService.updateAttendance(id, attendanceData, userContext);
if (!result.success) {
return res.status(400).json(result);
}
res.status(200).json(result);
} catch (error) {
console.error('Error updating attendance:', error);
res.status(500).json({
success: false,
message: error.message
});
}
}
// POST /api/course-booking-details/:id/documents
static async uploadDocument(req, res) {
upload.single('document')(req, res, async (err) => {
if (err) {
return res.status(400).json({
success: false,
message: err.message
});
}
try {
const { id } = req.params;
const { document_type } = req.body;
const file = req.file;
if (!id || isNaN(id)) {
return res.status(400).json({
success: false,
message: 'Valid course booking ID is required'
});
}
if (!document_type || !['paperwork', 'assessment'].includes(document_type)) {
return res.status(400).json({
success: false,
message: 'Valid document type is required (paperwork or assessment)'
});
}
if (!file) {
return res.status(400).json({
success: false,
message: 'Document file is required'
});
}
const userContext = {
centerContext: req.centerContext || { id: 1, type: 'main' },
role: req.userRole || 'instructor',
username: req.userName || 'system',
id: req.userId || 1
};
const result = await CourseBookingDetailsService.uploadCourseDocument(
id,
document_type,
file,
userContext
);
if (!result.success) {
return res.status(400).json(result);
}
res.status(201).json(result);
} catch (error) {
console.error('Error uploading document:', error);
res.status(500).json({
success: false,
message: error.message
});
}
});
}
// PUT /api/course-booking-details/:id/assessments
static async assessCandidates(req, res) {
try {
const { id } = req.params;
const { assessments } = req.body;
if (!id || isNaN(id)) {
return res.status(400).json({
success: false,
message: 'Valid course booking ID is required'
});
}
if (!assessments || !Array.isArray(assessments)) {
return res.status(400).json({
success: false,
message: 'Assessments data is required and must be an array'
});
}
const userContext = {
centerContext: req.centerContext || { id: 1, type: 'main' },
role: req.userRole || 'instructor',
username: req.userName || 'system',
id: req.userId || 1
};
const result = await CourseBookingDetailsService.assessCandidates(id, assessments, userContext);
if (!result.success) {
return res.status(400).json(result);
}
res.status(200).json(result);
} catch (error) {
console.error('Error assessing candidates:', error);
res.status(500).json({
success: false,
message: error.message
});
}
}
// PUT /api/course-booking-details/:id/complete
static async completeCourse(req, res) {
try {
const { id } = req.params;
if (!id || isNaN(id)) {
return res.status(400).json({
success: false,
message: 'Valid course booking ID is required'
});
}
const userContext = {
centerContext: req.centerContext || { id: 1, type: 'main' },
role: req.userRole || 'instructor',
username: req.userName || 'system',
id: req.userId || 1
};
const result = await CourseBookingDetailsService.completeCourse(id, userContext);
if (!result.success) {
return res.status(400).json(result);
}
res.status(200).json(result);
} catch (error) {
console.error('Error completing course:', error);
res.status(500).json({
success: false,
message: error.message
});
}
}
// GET /api/course-booking-details/:id/download/:type
static async downloadCourseData(req, res) {
try {
const { id, type } = req.params;
if (!id || isNaN(id)) {
return res.status(400).json({
success: false,
message: 'Valid course booking ID is required'
});
}
const allowedTypes = ['excel', 'zip', 'combined'];
if (!allowedTypes.includes(type)) {
return res.status(400).json({
success: false,
message: 'Invalid download type. Must be: excel, zip, or combined'
});
}
const userContext = {
centerContext: req.centerContext || { id: 1, type: 'main' },
role: req.userRole || 'admin',
username: req.userName || 'admin',
id: req.userId || 1
};
const result = await CourseBookingDetailsService.downloadCourseData(id, type, userContext);
if (!result.success) {
return res.status(400).json(result);
}
// Set download headers
const filename = result.data.filename;
const mimeType = FileStorageService.getMimeType(filename);
res.setHeader('Content-Type', mimeType);
res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
res.setHeader('Content-Length', result.data.size);
// Stream file
const fileStream = FileStorageService.getFileStream(result.data.path);
fileStream.on('end', async () => {
// Clean up temporary files after download
if (result.data.tempDir) {
await CourseBookingDetailsService.cleanupDownloadFiles(result.data.tempDir);
}
});
fileStream.pipe(res);
} catch (error) {
console.error('Error downloading course data:', error);
res.status(500).json({
success: false,
message: error.message
});
}
}
// DELETE /api/course-booking-details/:bookingId/documents/:documentId
static async deleteDocument(req, res) {
try {
const { bookingId, documentId } = req.params;
if (!bookingId || isNaN(bookingId) || !documentId || isNaN(documentId)) {
return res.status(400).json({
success: false,
message: 'Valid booking ID and document ID are required'
});
}
// Get document info
const [documents] = await pool.execute(
'SELECT * FROM course_documents WHERE id = ? AND booking_id = ? AND is_active = 1',
[documentId, bookingId]
);
if (documents.length === 0) {
return res.status(404).json({
success: false,
message: 'Document not found'
});
}
const document = documents[0];
// Delete file from storage
await FileStorageService.deleteFile(document.file_path);
// Soft delete from database
await pool.execute(
'UPDATE course_documents SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
[documentId]
);
res.status(200).json({
success: true,
message: 'Document deleted successfully'
});
} catch (error) {
console.error('Error deleting document:', error);
res.status(500).json({
success: false,
message: error.message
});
}
}
// GET /api/course-booking-details/:bookingId/documents/:documentId/download
static async downloadDocument(req, res) {
try {
const { bookingId, documentId } = req.params;
if (!bookingId || isNaN(bookingId) || !documentId || isNaN(documentId)) {
return res.status(400).json({
success: false,
message: 'Valid booking ID and document ID are required'
});
}
// Get document info
const [documents] = await pool.execute(
'SELECT * FROM course_documents WHERE id = ? AND booking_id = ? AND is_active = 1',
[documentId, bookingId]
);
if (documents.length === 0) {
return res.status(404).json({
success: false,
message: 'Document not found'
});
}
const document = documents[0];
// Check if file exists
const fileInfo = await FileStorageService.getFileInfo(document.file_path);
if (!fileInfo.exists) {
return res.status(404).json({
success: false,
message: 'File not found on server'
});
}
// Set download headers
res.setHeader('Content-Type', document.mime_type);
res.setHeader('Content-Disposition', `attachment; filename="${document.original_filename}"`);
res.setHeader('Content-Length', document.file_size);
// Stream file
const fileStream = FileStorageService.getFileStream(document.file_path);
fileStream.pipe(res);
} catch (error) {
console.error('Error downloading document:', error);
res.status(500).json({
success: false,
message: error.message
});
}
}
}