import ExcelJS from 'exceljs';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { FileStorageService } from './FileStorageService.js';
import { CourseCandidate } from '../models/CourseCandidate.js';
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
export class ExcelZipService {
// Generate Excel file with candidate details and embedded photos
static async generateCandidateExcel(bookingId, courseNumber, tempDir) {
try {
// Get candidates data
const candidates = await CourseCandidate.getCandidatesForExport(bookingId);
// Create workbook
const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet('Course Candidates');
// Set up columns
worksheet.columns = [
{ header: 'Photo', key: 'photo', width: 20 },
{ header: 'First Name', key: 'first_name', width: 20 },
{ header: 'Last Name', key: 'last_name', width: 20 },
{ header: 'Date of Birth', key: 'date_of_birth', width: 15 },
{ header: 'Company Name', key: 'company_name', width: 25 },
{ header: 'Employee ID', key: 'employee_id', width: 15 },
{ header: 'Card Number', key: 'card_number', width: 20 }
];
// Style the header
const headerRow = worksheet.getRow(1);
headerRow.height = 25;
headerRow.eachCell((cell) => {
cell.font = { bold: true, color: { argb: 'FFFFFF' } };
cell.fill = {
type: 'pattern',
pattern: 'solid',
fgColor: { argb: '366092' }
};
cell.border = {
top: { style: 'thin' },
left: { style: 'thin' },
bottom: { style: 'thin' },
right: { style: 'thin' }
};
cell.alignment = { vertical: 'middle', horizontal: 'center' };
});
// Add candidate data
for (let i = 0; i < candidates.length; i++) {
const candidate = candidates[i];
const row = worksheet.getRow(i + 2);
row.height = 100; // Height for photo
// Add photo if exists
if (candidate.photo_path) {
try {
const photoPath = path.join(process.cwd(), candidate.photo_path);
const photoBuffer = await fs.promises.readFile(photoPath);
const imageId = workbook.addImage({
buffer: photoBuffer,
extension: 'jpeg',
});
worksheet.addImage(imageId, {
tl: { col: 0, row: i + 1 },
br: { col: 1, row: i + 2 }
});
} catch (error) {
console.error(`Error adding photo for candidate ${candidate.id}:`, error);
}
}
// Determine card number logic
let cardNumber = '';
if (candidate.card_type === 'new' && (!candidate.previous_card_number && !candidate.level_1_card_number)) {
cardNumber = ''; // Blank for new basic
} else if (candidate.card_type === 'renewal' && candidate.previous_card_number) {
cardNumber = candidate.previous_card_number;
} else if (candidate.final_card_number) {
cardNumber = candidate.final_card_number;
}
// Set cell values
row.getCell(2).value = candidate.first_name;
row.getCell(3).value = candidate.last_name;
row.getCell(4).value = new Date(candidate.date_of_birth);
row.getCell(5).value = candidate.company_name || '';
row.getCell(6).value = candidate.employee_id;
row.getCell(7).value = cardNumber;
// Format date cell
row.getCell(4).numFmt = 'dd/mm/yyyy';
// Apply borders and alignment
row.eachCell((cell, colNumber) => {
cell.border = {
top: { style: 'thin' },
left: { style: 'thin' },
bottom: { style: 'thin' },
right: { style: 'thin' }
};
if (colNumber > 1) { // Skip photo column for alignment
cell.alignment = { vertical: 'middle', horizontal: 'center' };
}
});
}
// Auto-fit columns (except photo column)
worksheet.columns.forEach((column, index) => {
if (index === 0) return; // Skip photo column
let maxLength = column.header.length;
worksheet.eachRow((row, rowNumber) => {
if (rowNumber === 1) return; // Skip header
const cell = row.getCell(index + 1);
const cellValue = cell.value ? cell.value.toString() : '';
maxLength = Math.max(maxLength, cellValue.length);
});
column.width = Math.min(maxLength + 2, 30); // Max width of 30
});
// Save Excel file
const excelFilename = `${courseNumber}_Candidates_Details.xlsx`;
const excelPath = path.join(tempDir, excelFilename);
await workbook.xlsx.writeFile(excelPath);
return {
success: true,
filename: excelFilename,
path: excelPath,
size: (await fs.promises.stat(excelPath)).size
};
} catch (error) {
console.error('Error generating Excel file:', error);
throw new Error(`Failed to generate Excel file: ${error.message}`);
}
}
// Create ZIP file with course documents
static async createCourseDocumentsZip(bookingId, courseNumber, tempDir) {
try {
// Get course documents
const [paperworkDocs] = await pool.execute(
'SELECT * FROM course_documents WHERE booking_id = ? AND document_type = ? AND is_active = 1',
[bookingId, 'paperwork']
);
const [assessmentDocs] = await pool.execute(
'SELECT * FROM course_documents WHERE booking_id = ? AND document_type = ? AND is_active = 1',
[bookingId, 'assessment']
);
if (paperworkDocs.length === 0 && assessmentDocs.length === 0) {
return {
success: false,
message: 'No documents found to zip'
};
}
const zipFilename = `${courseNumber}_Course_Documents.zip`;
const zipPath = path.join(tempDir, zipFilename);
// Create zip stream
const output = fs.createWriteStream(zipPath);
const archive = archiver('zip', { zlib: { level: 9 } });
return new Promise((resolve, reject) => {
output.on('close', async () => {
const stats = await fs.promises.stat(zipPath);
resolve({
success: true,
filename: zipFilename,
path: zipPath,
size: stats.size
});
});
archive.on('error', (err) => {
reject(new Error(`ZIP creation failed: ${err.message}`));
});
archive.pipe(output);
// Add paperwork documents
if (paperworkDocs.length > 0) {
for (const doc of paperworkDocs) {
const filePath = path.join(process.cwd(), doc.file_path);
if (fs.existsSync(filePath)) {
archive.file(filePath, {
name: `Course-Paperwork/${doc.original_filename}`
});
}
}
}
// Add assessment documents
if (assessmentDocs.length > 0) {
for (const doc of assessmentDocs) {
const filePath = path.join(process.cwd(), doc.file_path);
if (fs.existsSync(filePath)) {
archive.file(filePath, {
name: `Course-Assessments/${doc.original_filename}`
});
}
}
}
archive.finalize();
});
} catch (error) {
console.error('Error creating ZIP file:', error);
throw new Error(`Failed to create ZIP file: ${error.message}`);
}
}
// Create combined package (Excel + ZIP in another ZIP)
static async createCombinedPackage(bookingId, courseNumber, adminId) {
try {
// Create temporary directory
const tempDir = await FileStorageService.createTempDownloadDir(adminId);
// Generate Excel file
const excelResult = await this.generateCandidateExcel(bookingId, courseNumber, tempDir);
// Create documents ZIP
const zipResult = await this.createCourseDocumentsZip(bookingId, courseNumber, tempDir);
// Create combined ZIP
const combinedZipFilename = `${courseNumber}_Complete_Package.zip`;
const combinedZipPath = path.join(tempDir, combinedZipFilename);
const output = fs.createWriteStream(combinedZipPath);
const archive = archiver('zip', { zlib: { level: 9 } });
return new Promise((resolve, reject) => {
output.on('close', async () => {
const stats = await fs.promises.stat(combinedZipPath);
resolve({
success: true,
filename: combinedZipFilename,
path: combinedZipPath,
tempDir: tempDir,
size: stats.size,
contents: {
excel: excelResult,
documentsZip: zipResult
}
});
});
archive.on('error', (err) => {
reject(new Error(`Combined ZIP creation failed: ${err.message}`));
});
archive.pipe(output);
// Add Excel file
if (excelResult.success) {
archive.file(excelResult.path, { name: excelResult.filename });
}
// Add documents ZIP
if (zipResult.success) {
archive.file(zipResult.path, { name: zipResult.filename });
}
archive.finalize();
});
} catch (error) {
console.error('Error creating combined package:', error);
throw new Error(`Failed to create combined package: ${error.message}`);
}
}
// Log download activity
static async logDownloadActivity(bookingId, downloadedBy, downloadType, fileSize, status = 'success', error = null) {
try {
await pool.execute(
'INSERT INTO download_logs (booking_id, downloaded_by_user, download_type, file_size, download_status, error_message) VALUES (?, ?, ?, ?, ?, ?)',
[bookingId, downloadedBy, downloadType, fileSize, status, error]
);
} catch (err) {
console.error('Error logging download activity:', err);
}
}
// Get download statistics
static async getDownloadStats(bookingId) {
try {
const [stats] = await pool.execute(
'SELECT download_type, COUNT(*) as count, MAX(created_at) as last_download FROM download_logs WHERE booking_id = ? GROUP BY download_type',
[bookingId]
);
return stats;
} catch (error) {
console.error('Error getting download stats:', error);
return [];
}
}
}