import mysql from 'mysql2/promise';
import { VisualTemplateService } from './VisualTemplateService.js';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';
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
export class CertificatePrintingService {
 // Get completed courses for printing
 static async getCompletedCoursesForPrinting() {
 try {
 const query = `
 SELECT
 cb.*,
 cc.name as course_name,
 center.name as center_name,
 COUNT(DISTINCT cand.id) as total_candidates,
 COUNT(DISTINCT CASE WHEN cand.candidate_status = 'passed' THEN cand.id END) as
passed_candidates
 FROM course_bookings cb
 LEFT JOIN course_categories cc ON cb.category_id = cc.id
 LEFT JOIN centers center ON cb.created_by_center_id = center.id
 LEFT JOIN course_candidates cand ON cb.id = cand.booking_id AND cand.is_active = 1
 WHERE cb.booking_status = 'completed' AND cb.is_active = 1
 GROUP BY cb.id
 HAVING passed_candidates > 0
 ORDER BY cb.end_date DESC
 `;
 const [rows] = await pool.execute(query);
 return {
 success: true,
 data: rows,
 message: 'Completed courses retrieved successfully'
 };
 } catch (error) {
 throw new Error(`Failed to get completed courses: ${error.message}`);
 }
 }
 // Get passed candidates with existing numbers
 static async getPassedCandidatesForPrinting(courseBookingId) {
 try {
 const query = `
 SELECT
 cand.*,
 CONCAT(cand.first_name, ' ', COALESCE(cand.last_name, '')) as full_name,
 cust.name as company_name,
 cust.address as company_address,
 cust.logo_path as company_logo_path,
 card.card_number,
 card.print_status as card_print_status,
 cert.certificate_number,
 cert.print_status as cert_print_status,
 cb.category_id,
 cb.course_number,
 cb.start_date,
 cb.end_date,
 cc.name as course_name
 FROM course_candidates cand
 LEFT JOIN customers cust ON cand.company_id = cust.id
 LEFT JOIN candidate_cards card ON cand.id = card.candidate_id
 LEFT JOIN candidate_certificates cert ON cand.id = cert.candidate_id
 LEFT JOIN course_bookings cb ON cand.booking_id = cb.id
 LEFT JOIN course_categories cc ON cb.category_id = cc.id
 WHERE cand.booking_id = ?
 AND cand.candidate_status = 'passed'
 AND cand.is_active = 1
 ORDER BY cust.name, cand.first_name, cand.last_name
 `;
 const [rows] = await pool.execute(query, [courseBookingId]);
 // Group by company
 const companiesMap = new Map();
 rows.forEach(candidate => {
 const companyId = candidate.company_id;
 if (!companiesMap.has(companyId)) {
 companiesMap.set(companyId, {
 company_id: companyId,
 company_name: candidate.company_name,
 candidates: []
 });
 }
 companiesMap.get(companyId).candidates.push(candidate);
 });
 return {
 success: true,
 data: {
 all_candidates: rows,
 companies: Array.from(companiesMap.values()),
 total_candidates: rows.length
 },
 message: 'Passed candidates retrieved successfully'
 };
 } catch (error) {
 throw new Error(`Failed to get passed candidates: ${error.message}`);
 }
 }
 // Generate certificates/cards using visual template
 static async generatePrintables(printRequest, userContext) {
 const connection = await pool.getConnection();
 await connection.beginTransaction();
 try {
 const { course_booking_id, candidate_ids, print_type } =printRequest;
 // Get course details
 const [courseRows] = await connection.execute(
 'SELECT category_id FROM course_bookings WHERE id = ?',
 [course_booking_id]
 );
 if (courseRows.length === 0) {
 throw new Error('Course booking not found');
 }
 const categoryId = courseRows[0].category_id;
 // Get template for this category and type
 const [templateRows] = await connection.execute(`
 SELECT * FROM design_templates
 WHERE category_id = ? AND template_type = ? AND is_active = 1
 `, [categoryId, print_type]);
 if (templateRows.length === 0) {
 throw new Error(`No ${print_type} template found for this course category`);
 }
 const template = templateRows[0];
 // Get template configuration
 const templateData = await VisualTemplateService.getTemplateForDesigner(template.id);
 if (!templateData.success) {
 throw new Error('Failed to load template configuration');
 }
 const generatedFiles = [];
 let successCount = 0;
 let failedCount = 0;
 // Process each candidate
 for (const candidateId of candidate_ids) {
 try {
 const candidateData = await this.getCandidateData(candidateId, connection);
 if (!candidateData){
 failedCount++;
 continue;
 }
 // Generate PDF using template
 const pdfBuffer = await this.generatePDFFromTemplate(
 template,
 templateData.data,
 candidateData
 );
 // Save PDF file
 const fileName = `${print_type}_${candidateId}_${Date.now()}.pdf`;
 const tempDir = path.join(process.cwd(), 'temp', 'prints', userContext.userName);
 await fs.promises.mkdir(tempDir, { recursive: true });
 const filePath = path.join(tempDir, fileName);
 await fs.promises.writeFile(filePath, pdfBuffer);
 // Update print status (triggers inventory deduction)
 await this.updatePrintStatus(candidateId, print_type, userContext.userName, connection);
 generatedFiles.push({
 candidate_id: candidateId,
 candidate_name: candidateData.full_name,
 file_path: filePath,
 file_name: fileName
 });
 successCount++;
 } catch (error){
 console.error(`Error processing candidate ${candidateId}:`, error);
 failedCount++;
 }
 }
 await connection.commit();
 return {
 success: true,
 data: {
 generated_files: generatedFiles,
 success_count: successCount,
 failed_count: failedCount
 },
 message: `Generated ${successCount} ${print_type}s successfully`
 };
 } catch (error) {
 await connection.rollback();
 throw error;
 } finally {
 connection.release();
 }
 }
 // Get candidate data for template population
 static async getCandidateData(candidateId, connection) {
 const [rows] = await connection.execute(`
 SELECT
 cand.*,
 CONCAT(cand.first_name, ' ', COALESCE(cand.last_name, '')) as full_name,
 cust.name as company_name,
 cust.address as company_address,
 cust.logo_path as company_logo_path,
 card.card_number,
 cert.certificate_number,
 cb.course_number,
 cb.start_date,
 cb.end_date,
 cc.name as course_name
 FROM course_candidates cand
 LEFT JOIN customers cust ON cand.company_id = cust.id
 LEFT JOIN candidate_cards card ON cand.id = card.candidate_id
 LEFT JOIN candidate_certificates cert ON cand.id = cert.candidate_id
 LEFT JOIN course_bookings cb ON cand.booking_id = cb.id
 LEFT JOIN course_categories cc ON cb.category_id = cc.id
 WHERE cand.id = ?
 `, [candidateId]);
 return rows[0] || null;
 }
 // Generate PDF from visual template
 static async generatePDFFromTemplate(template, templateConfig, candidateData) {
 try {
 // Create new PDF document
 const pdfDoc = await PDFDocument.create();
 pdfDoc.registerFontkit(fontkit);
 // Add page with template size
 const page = pdfDoc.addPage([template.image_width, template.image_height]);
 // Embed template image as background
 const templateImageBytes = template.template_image;
 let templateImage;

 // Detect image type and embed
 try {
 templateImage = await pdfDoc.embedJpg(templateImageBytes);
 } catch {
 try {
 templateImage = await pdfDoc.embedPng(templateImageBytes);
 } catch {
 throw new Error('Unsupported template image format');
 }
 }
 // Draw template image as background
 page.drawImage(templateImage, {
 x: 0,
 y: 0,
 width: template.image_width,
 height: template.image_height
 });
 // Load fonts
 const font = await pdfDoc.embedFont('Helvetica');
 const boldFont = await pdfDoc.embedFont('Helvetica-Bold');
 // Draw positioned fields
 for (const field of templateConfig.positioned_fields) {
 const fieldValue = this.getFieldValue(field.field_key, candidateData);
 if (fieldValue) {
 const useFont = field.font_weight === 'bold' ? boldFont : font;

 // Convert coordinates (template uses top-left origin, PDF uses bottom-left)
 const pdfY = template.image_height - field.y_coordinate - field.height;

 page.drawText(String(fieldValue), {
 x: field.x_coordinate,
 y: pdfY,
 size: field.font_size,
 font: useFont,
 color: this.hexToRgb(field.font_color)
 });
 }
 }
 // Draw logos
 for (const logo of templateConfig.logo_positions) {
 await this.drawLogo(pdfDoc, page, logo, candidateData, template);
 }
 // Generate PDF bytes
 return await pdfDoc.save();
 } catch (error) {
 throw new Error(`PDF generation failed: ${error.message}`);
 }
 }
 // Get field value from candidate data
 static getFieldValue(fieldKey, candidateData) {
 const fieldMap = {
 first_name: candidateData.first_name,
 last_name: candidateData.last_name,
 full_name: candidateData.full_name,
 dob: candidateData.dob ? this.formatDate(candidateData.dob) : '',
 gender: candidateData.gender,
 nationality: candidateData.nationality,
 employee_id: candidateData.employee_id,
 card_number: candidateData.card_number,
 certificate_number: candidateData.certificate_number,
 course_name: candidateData.course_name,
 course_number: candidateData.course_number,
 start_date: candidateData.start_date ? this.formatDate(candidateData.start_date) : '',
 end_date: candidateData.end_date ? this.formatDate(candidateData.end_date) : '',
 completion_date: candidateData.end_date ? this.formatDate(candidateData.end_date) : '',
 issue_date: this.formatDate(new Date()),
 expiry_date: this.formatDate(this.calculateExpiryDate(new Date(), 5)),
 company_name: candidateData.company_name,
 company_address: candidateData.company_address
 };
 return fieldMap[fieldKey] || '';
 }
 // Draw logo on PDF
 static async drawLogo(pdfDoc, page, logoConfig, candidateData, template) {
 try {
 let logoPath;

 if (logoConfig.logo_type === 'simian'){
 logoPath = path.join(process.cwd(), 'public', 'assets', 'simian-logo.png');
 } else if (logoConfig.logo_type === 'customer' && candidateData.company_logo_path) {
 logoPath = path.join(process.cwd(), 'public', 'uploads', candidateData.company_logo_path);
 }
 if (!logoPath || !fs.existsSync(logoPath)) {
 return; // Skip if logo not found
 }
 const logoBytes = await fs.promises.readFile(logoPath);
 let logo;
 // Embed logo based on file extension
 const ext = path.extname(logoPath).toLowerCase();
 if (ext === '.png') {
 logo = await pdfDoc.embedPng(logoBytes);
 } else if (ext === '.jpg' || ext === '.jpeg'){
 logo = await pdfDoc.embedJpg(logoBytes);
 } else {
 return; // Skip unsupported formats
 }
 // Convert coordinates (template uses top-left origin, PDF uses bottom-left)
 const pdfY = template.image_height - logoConfig.y_coordinate - logoConfig.height;
 page.drawImage(logo, {
 x: logoConfig.x_coordinate,
 y: pdfY,
 width: logoConfig.width,
 height: logoConfig.height
 });
 } catch (error) {
 console.warn('Failed to draw logo:', error.message);
 }
 }
 // Update print status (triggers inventory deduction)
 static async updatePrintStatus(candidateId, printType, userName, connection) {
 if (printType === 'card') {
 await connection.execute(`
 UPDATE candidate_cards
 SET print_status = 'printed', status_updated_by = ?, status_updated_at = CURRENT_TIMESTAMP
 WHERE candidate_id = ?
 `, [userName, candidateId]);
 } else if (printType === 'certificate') {
 await connection.execute(`
 UPDATE candidate_certificates
 SET print_status = 'printed', status_updated_by = ?, status_updated_at = CURRENT_TIMESTAMP
 WHERE candidate_id = ?
 `, [userName, candidateId]);
 }
 }
 // Helper functions
 static formatDate(date) {
 if (!date) return '';
 return new Date(date).toLocaleDateString('en-GB');
 }
 static calculateExpiryDate(issueDate, years) {
 const expiry = new Date(issueDate);
 expiry.setFullYear(expiry.getFullYear() + years);
 return expiry;
 }
 static hexToRgb(hex) {
 const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
 if (result){
 const r = parseInt(result[1], 16) / 255;
 const g = parseInt(result[2], 16) / 255;
 const b = parseInt(result[3], 16) / 255;
 return rgb(r, g, b);
 }
 return rgb(0, 0, 0); // Default black
 }
}
