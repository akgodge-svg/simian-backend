import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

export class FileUploadUtils {
// Configure multer for LPO document uploads
static getLPOUploadConfig() {
const storage = multer.diskStorage({
destination: async (req, file, cb) => {
const now = new Date();
const year = now.getFullYear();
const month = (now.getMonth() + 1).toString().padStart(2, '0');
const uploadDir = path.join(process.cwd(), 'uploads', 'lpo-documents', year.toString(), month);
try {
await fs.mkdir(uploadDir, { recursive: true });
cb(null, uploadDir);
} catch (error) {
console.error('Error creating upload directory:', error);
cb(error);
}
},
filename: (req, file, cb) => {
const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
const extension = path.extname(file.originalname);
const lpoNumber = req.body.lpo_number ? req.body.lpo_number.replace(/[^a-zA-Z0-9]/g, '-') : 'lpo';
cb(null, `${lpoNumber}-${uniqueSuffix}${extension}`);
}
});
const fileFilter = (req, file, cb) => {
// Allowed file types
const allowedTypes = /pdf|doc|docx|jpg|jpeg|png|txt|rtf/;
const allowedMimeTypes = [
'application/pdf',
'application/msword',
'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
'image/jpeg',
'image/jpg',
'image/png',
'text/plain',
'application/rtf'
];
const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
const mimetype = allowedMimeTypes.includes(file.mimetype);
if (mimetype && extname) {
return cb(null, true);
} else {
cb(new Error('Only PDF, Word documents, images, and text files are allowed'));
}
};
return multer({
storage: storage,
limits: {
fileSize: 25 * 1024 * 1024 // 25MB limit
},
fileFilter: fileFilter
});
}
// Delete file from filesystem
static async deleteFile(filePath) {
try {
if (filePath && await this.fileExists(filePath)) {
await fs.unlink(filePath);
console.log('File deleted successfully:', filePath);
return true;
}
} catch (error) {
console.error('Error deleting file:', error);
return false;
}
return false;
}
// Check if file exists
static async fileExists(filePath) {
try {
await fs.access(filePath);
return true;
} catch {
return false;
}
}
// Get file info
static async getFileInfo(filePath) {
try {
const stats = await fs.stat(filePath);
return {
exists: true,
size: stats.size,
modified: stats.mtime
};
} catch {
return {
exists: false,
size: 0,
modified: null
};
}
}
}