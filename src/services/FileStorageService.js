import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import crypto from 'crypto';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const readFile = promisify(fs.readFile);
export class FileStorageService {
static get UPLOAD_PATHS() {
return {
CANDIDATE_PHOTOS: 'uploads/candidate-photos',
COURSE_PAPERWORK: 'uploads/course-paperwork',
COURSE_ASSESSMENTS: 'uploads/course-assessments',
CANDIDATE_CARDS: 'uploads/candidate-cards',
CANDIDATE_CERTIFICATES: 'uploads/candidate-certificates',
TRANSMITTAL_COPIES: 'uploads/transmittal-copies',
TEMP_DOWNLOADS: 'temp/downloads'
};
}
// Initialize storage directories
static async initializeDirectories() {
const basePath = path.join(process.cwd());
for (const uploadPath of Object.values(this.UPLOAD_PATHS)) {
const fullPath = path.join(basePath, uploadPath);
try {
await mkdir(fullPath, { recursive: true });
} catch (error) {
if (error.code !== 'EEXIST') {
console.error(`Error creating directory ${fullPath}:`, error);
throw error;
}
}
}
}
// Generate unique filename
static generateUniqueFilename(originalName) {
const timestamp = Date.now();
const random = crypto.randomBytes(6).toString('hex');
const extension = path.extname(originalName);
const baseName = path.basename(originalName, extension);
const safeName = baseName.replace(/[^a-zA-Z0-9]/g, '_');
return `${safeName}_${timestamp}_${random}${extension}`;
}
// Store candidate photo
static async storeCandidatePhoto(courseNumber, fileBuffer, originalName) {
try {
const uploadDir = path.join(process.cwd(), this.UPLOAD_PATHS.CANDIDATE_PHOTOS, courseNumber);
await mkdir(uploadDir, { recursive: true });
const filename = this.generateUniqueFilename(originalName);
const filePath = path.join(uploadDir, filename);
// Process image: resize and compress
const processedImage = await sharp(fileBuffer)
.resize(400, 400, {
fit: 'cover',
position: 'center'
})
.jpeg({
quality: 85,
progressive: true
})
.toBuffer();
await writeFile(filePath, processedImage);
return {
success: true,
filename,
path: path.join(this.UPLOAD_PATHS.CANDIDATE_PHOTOS, courseNumber, filename),
size: processedImage.length
};
} catch (error) {
console.error('Error storing candidate photo:', error);
throw new Error(`Failed to store candidate photo: ${error.message}`);
}
}
// Store course document
static async storeCourseDocument(courseNumber, documentType, fileBuffer, originalName, mimeType) {
try {
const uploadPath = documentType === 'paperwork'
? this.UPLOAD_PATHS.COURSE_PAPERWORK
: this.UPLOAD_PATHS.COURSE_ASSESSMENTS;
const uploadDir = path.join(process.cwd(), uploadPath, courseNumber);
await mkdir(uploadDir, { recursive: true });
const filename = this.generateUniqueFilename(originalName);
const filePath = path.join(uploadDir, filename);
await writeFile(filePath, fileBuffer);
return {
success: true,
filename,
path: path.join(uploadPath, courseNumber, filename),
size: fileBuffer.length,
mimeType
};
} catch (error) {
console.error('Error storing course document:', error);
throw new Error(`Failed to store course document: ${error.message}`);
}
}
// Store card/certificate image
static async storeCardCertificateImage(courseNumber, type, fileBuffer, originalName) {
try {
const uploadPath = type === 'card'
? this.UPLOAD_PATHS.CANDIDATE_CARDS
: this.UPLOAD_PATHS.CANDIDATE_CERTIFICATES;
const uploadDir = path.join(process.cwd(), uploadPath, courseNumber);
await mkdir(uploadDir, { recursive: true });
const filename = this.generateUniqueFilename(originalName);
const filePath = path.join(uploadDir, filename);
// Process image for cards/certificates
const processedImage = await sharp(fileBuffer)
.resize(800, 600, {
fit: 'inside',
withoutEnlargement: true
})
.jpeg({
quality: 90,
progressive: true
})
.toBuffer();
await writeFile(filePath, processedImage);
return {
success: true,
filename,
path: path.join(uploadPath, courseNumber, filename),
size: processedImage.length
};
} catch (error) {
console.error('Error storing card/certificate image:', error);
throw new Error(`Failed to store ${type} image: ${error.message}`);
}
}
// Delete file
static async deleteFile(filePath) {
try {
const fullPath = path.join(process.cwd(), filePath);
await unlink(fullPath);
return { success: true };
} catch (error) {
console.error('Error deleting file:', error);
return { success: false, error: error.message };
}
}
// Get file info
static async getFileInfo(filePath) {
try {
const fullPath = path.join(process.cwd(), filePath);
const stats = await fs.promises.stat(fullPath);
return {
exists: true,
size: stats.size,
modified: stats.mtime,
isFile: stats.isFile()
};
} catch (error) {
return { exists: false };
}
}
// Create temporary directory for downloads
static async createTempDownloadDir(adminId) {
const tempDir = path.join(process.cwd(), this.UPLOAD_PATHS.TEMP_DOWNLOADS, adminId.toString());
await mkdir(tempDir, { recursive: true });
return tempDir;
}
// Clean up temporary files
static async cleanupTempFiles(tempDir) {
try {
await fs.promises.rmdir(tempDir, { recursive: true });
return { success: true };
} catch (error) {
console.error('Error cleaning up temp files:', error);
return { success: false, error: error.message };
}
}
// Get file stream for download
static getFileStream(filePath) {
const fullPath = path.join(process.cwd(), filePath);
return fs.createReadStream(fullPath);
}
// Validate file type
static validateFileType(filename, allowedTypes) {
const extension = path.extname(filename).toLowerCase();
return allowedTypes.includes(extension);
}
// Get MIME type from extension
static getMimeType(filename) {
const extension = path.extname(filename).toLowerCase();
const mimeTypes = {
'.pdf': 'application/pdf',
'.doc': 'application/msword',
'.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
'.jpg': 'image/jpeg',
'.jpeg': 'image/jpeg',
'.png': 'image/png',
'.txt': 'text/plain',
'.zip': 'application/zip',
'.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};
return mimeTypes[extension] || 'application/octet-stream';
}
}