import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
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
export class VisualTemplateService {
 // Upload blank template image
 static async uploadTemplate(templateData, imageFile, userContext) {
 const connection = await pool.getConnection();
 await connection.beginTransaction();
 try {
 // Process uploaded image
 const imageBuffer = await fs.promises.readFile(imageFile.path);
 const metadata = await sharp(imageBuffer).metadata();

 // Create unique filename and store image
 const fileName = `template_${Date.now()}_${imageFile.originalname}`;
 const imagePath = path.join('public', 'uploads', 'templates', fileName);

 // Ensure directory exists
 const uploadsDir = path.dirname(imagePath);
 await fs.promises.mkdir(uploadsDir, { recursive: true });

 // Move file to permanent location
 await fs.promises.rename(imageFile.path, imagePath);
 // Insert template record
 const [result] = await connection.execute(`
 INSERT INTO design_templates (
 template_name, template_type, category_id, template_image_path,
 template_image, image_width, image_height, created_by
 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
 ON DUPLICATE KEY UPDATE
 template_name = VALUES(template_name),
 template_image_path = VALUES(template_image_path),
 template_image = VALUES(template_image),
 image_width = VALUES(image_width),
 image_height = VALUES(image_height),
 updated_at = CURRENT_TIMESTAMP
 `, [
 templateData.template_name,
 templateData.template_type,
 templateData.category_id,
 `/uploads/templates/${fileName}`,
 imageBuffer,
 metadata.width,
 metadata.height,
 userContext.userName
 ]);
 await connection.commit();
 return {
 success: true,
 data: {
 template_id: result.insertId || result.affectedRows,
 template_name: templateData.template_name,
 image_width: metadata.width,
 image_height: metadata.height,
 image_url: `/uploads/templates/${fileName}`
 },
 message: 'Template uploaded successfully'
 };
 } catch (error) {
 await connection.rollback();
 throw error;
 } finally {
 connection.release();
 }
 }
 // Get available fields for drag-and-drop
 static async getAvailableFields() {
 try {
 const [rows] = await pool.execute(`
 SELECT * FROM field_definitions
 WHERE is_active = 1
 ORDER BY category, sort_order, display_label
 `);
 // Group by category
 const fieldsByCategory = {};
 rows.forEach(field => {
 if (!fieldsByCategory[field.category]){
 fieldsByCategory[field.category] = [];
 }
 fieldsByCategory[field.category].push(field);
 });
 return {
 success: true,
 data: {
 all_fields: rows,
 fields_by_category: fieldsByCategory
 },
 message: 'Available fields retrieved successfully'
 };
 } catch (error) {
 throw new Error(`Failed to get available fields: ${error.message}`);
 }
 }
 // Get template for visual designer
 static async getTemplateForDesigner(templateId) {
 try {
 // Get template details
 const [templateRows] = await pool.execute(`
 SELECT
 dt.*,
 cc.name as category_name
 FROM design_templates dt
 LEFT JOIN course_categories cc ON dt.category_id = cc.id
 WHERE dt.id = ? AND dt.is_active = 1
 `, [templateId]);
 if (templateRows.length === 0) {
 return {
 success: false,
 message: 'Template not found'
 };
 }
 const template = templateRows[0];
 // Get positioned fields
 const [fieldRows] = await pool.execute(`
 SELECT
 tf.*,
 fd.display_label,
 fd.description,
 fd.category
 FROM template_fields tf
 LEFT JOIN field_definitions fd ON tf.field_key = fd.field_key
 WHERE tf.template_id = ? AND tf.is_visible = 1
 ORDER BY tf.created_at
 `, [templateId]);
 // Get logo positions
 const [logoRows] = await pool.execute(`
 SELECT * FROM template_logos
 WHERE template_id = ? AND is_visible = 1
 `, [templateId]);
 return {
 success: true,
 data: {
 template: template,
 positioned_fields: fieldRows,
 logo_positions: logoRows
 },
 message: 'Template data retrieved successfully'
 };
 } catch (error) {
 throw new Error(`Failed to get template: ${error.message}`);
 }
 }
 // Save field position from drag-and-drop
 static async saveFieldPosition(templateId, fieldData) {
 try {
 const query = `
 INSERT INTO template_fields (
 template_id, field_key, x_coordinate, y_coordinate, width, height,
 font_family, font_size, font_color, font_weight, alignment, is_visible
 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
 ON DUPLICATE KEY UPDATE
 x_coordinate = VALUES(x_coordinate),
 y_coordinate = VALUES(y_coordinate),
 width = VALUES(width),
 height = VALUES(height),
 font_family = VALUES(font_family),
 font_size = VALUES(font_size),
 font_color = VALUES(font_color),
 font_weight = VALUES(font_weight),
 alignment = VALUES(alignment),
 is_visible = 1,
 updated_at = CURRENT_TIMESTAMP
 `;
 await pool.execute(query, [
 templateId,
 fieldData.field_key,
 fieldData.x_coordinate,
 fieldData.y_coordinate,
 fieldData.width || 200,
 fieldData.height || 30,
 fieldData.font_family || 'Arial',
 fieldData.font_size || 12,
 fieldData.font_color || '#000000',
 fieldData.font_weight || 'normal',
 fieldData.alignment || 'left'
 ]);
 return {
 success: true,
 message: 'Field position saved successfully'
 };
 } catch (error) {
 throw new Error(`Failed to save field position: ${error.message}`);
 }
 }
 // Save logo position
 static async saveLogoPosition(templateId, logoData) {
 try {
 const query = `
 INSERT INTO template_logos (
 template_id, logo_type, x_coordinate, y_coordinate, width, height,
 keep_aspect_ratio, is_visible
 ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
 ON DUPLICATE KEY UPDATE
 x_coordinate = VALUES(x_coordinate),
 y_coordinate = VALUES(y_coordinate),
 width = VALUES(width),
 height = VALUES(height),
 keep_aspect_ratio = VALUES(keep_aspect_ratio),
 is_visible = 1,
 updated_at = CURRENT_TIMESTAMP
 `;
 await pool.execute(query, [
 templateId,
 logoData.logo_type,
 logoData.x_coordinate,
 logoData.y_coordinate,
 logoData.width || 100,
 logoData.height || 50,
 logoData.keep_aspect_ratio !== false
 ]);
 return {
 success: true,
 message: 'Logo position saved successfully'
 };
 } catch (error) {
 throw new Error(`Failed to save logo position: ${error.message}`);
 }
 }
 // Remove field from template
 static async removeField(templateId, fieldKey) {
 try {
 await pool.execute(
 'UPDATE template_fields SET is_visible = 0 WHERE template_id = ? AND field_key = ?',
 [templateId, fieldKey]
 );
 return {
 success: true,
 message: 'Field removed successfully'
 };
 } catch (error) {
 throw new Error(`Failed to remove field: ${error.message}`);
 }
 }
 // Get all templates
 static async getAllTemplates(filters = {}) {
 try {
 let query = `
 SELECT
 dt.*,
 cc.name as category_name,
 COUNT(DISTINCT tf.id) as field_count,
 COUNT(DISTINCT tl.id) as logo_count
 FROM design_templates dt
 LEFT JOIN course_categories cc ON dt.category_id = cc.id
 LEFT JOIN template_fields tf ON dt.id = tf.template_id AND tf.is_visible = 1
 LEFT JOIN template_logos tl ON dt.id = tl.template_id AND tl.is_visible = 1
 WHERE dt.is_active = 1
 `;
 let params = [];
 if (filters.template_type){
 query += ' AND dt.template_type = ?';
 params.push(filters.template_type);
 }
 if (filters.category_id) {
 query += ' AND dt.category_id = ?';
 params.push(filters.category_id);
 }
 query += ' GROUP BY dt.id ORDER BY dt.created_at DESC';
 const [rows] = await pool.execute(query, params);
 return {
 success: true,
 data: rows,
 message: 'Templates retrieved successfully'
 };
 } catch (error) {
 throw new Error(`Failed to get templates: ${error.message}`);
 }
 }
 // Serve template image
 static async getTemplateImage(templateId) {
 try {
 const [rows] = await pool.execute(
 'SELECT template_image, template_name FROM design_templates WHERE id = ? AND is_active = 1',
 [templateId]
 );
 if (rows.length === 0) {
 throw new Error('Template image not found');
 }
 return {
 success: true,
 data: {
 image_data: rows[0].template_image,
 template_name: rows[0].template_name
 }
 };
 } catch (error) {
 throw new Error(`Failed to get template image: ${error.message}`);
 }
 }
}
