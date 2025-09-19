import { VisualTemplateService } from '../services/VisualTemplateService.js';
import multer from 'multer';
import path from 'path';
// Configure multer for image uploads
const upload = multer({
 dest: 'temp/templates/',
 limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
 fileFilter: (req, file, cb) => {
 const allowedTypes = ['.jpg', '.jpeg', '.png', '.webp'];
 const fileExt = path.extname(file.originalname).toLowerCase();

 if (allowedTypes.includes(fileExt)) {
 cb(null, true);
 } else {
 cb(new Error('Only JPG, PNG, and WebP images are allowed'), false);
 }
 }
});
export class VisualTemplateController {
 // POST /api/visual-templates/upload
 static async uploadTemplate(req, res) {
 upload.single('template_image')(req, res, async (err) => {
 if (err) {
 return res.status(400).json({
 success: false,
 message: err.message
 });
 }
 try {
 const { template_name, template_type, category_id } = req.body;
 const imageFile = req.file;
 if (!template_name || !template_type || !category_id || !imageFile) {
 return res.status(400).json({
 success: false,
 message: 'Template name, type, category ID, and image file are required'
 });
 }
 const userContext = {
 userName: req.userName || 'system'
 };
 const templateData = {
 template_name,
 template_type,
 category_id: parseInt(category_id)
 };
 const result = await VisualTemplateService.uploadTemplate(templateData, imageFile, userContext);
 res.status(201).json(result);
 } catch (error) {
 console.error('Error uploading template:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 });
 }
 // GET /api/visual-templates/fields
 static async getAvailableFields(req, res) {
 try {
 const result = await VisualTemplateService.getAvailableFields();
 res.status(200).json(result);
 } catch (error) {
 console.error('Error getting available fields:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // GET /api/visual-templates
 static async getAllTemplates(req, res) {
 try {
 const filters = {
 template_type: req.query.template_type,
 category_id: req.query.category_id
 };
 const result = await VisualTemplateService.getAllTemplates(filters);
 res.status(200).json(result);
 } catch (error) {
 console.error('Error getting templates:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // GET /api/visual-templates/:id/designer
 static async getTemplateForDesigner(req, res) {
 try {
 const { id } = req.params;
 if (!id || isNaN(id)) {
 return res.status(400).json({
 success: false,
 message: 'Valid template ID is required'
 });
 }
 const result = await VisualTemplateService.getTemplateForDesigner(id);
 res.status(200).json(result);
 } catch (error) {
 console.error('Error getting template for designer:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // POST /api/visual-templates/:id/fields
 static async saveFieldPosition(req, res) {
 try {
 const { id } = req.params;
 const fieldData = req.body;
 if (!id || isNaN(id)) {
 return res.status(400).json({
 success: false,
 message: 'Valid template ID is required'
 });
 }
 if (!fieldData.field_key || fieldData.x_coordinate === undefined || fieldData.y_coordinate === undefined) {
 return res.status(400).json({
 success: false,
 message: 'Field key, x_coordinate, and y_coordinate are required'
 });
 }
 const result = await VisualTemplateService.saveFieldPosition(id, fieldData);
 res.status(200).json(result);
 } catch (error) {
 console.error('Error saving field position:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // POST /api/visual-templates/:id/logos
 static async saveLogoPosition(req, res) {
 try {
 const { id } = req.params;
 const logoData = req.body;
 if (!id || isNaN(id)) {
 return res.status(400).json({
 success: false,
 message: 'Valid template ID is required'
 });
 }
 if (!logoData.logo_type || logoData.x_coordinate === undefined || logoData.y_coordinate === undefined) {
 return res.status(400).json({
 success: false,
 message: 'Logo type, x_coordinate, and y_coordinate are required'
 });
 }
 const result = await VisualTemplateService.saveLogoPosition(id, logoData);
 res.status(200).json(result);
 } catch (error) {
 console.error('Error saving logo position:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // DELETE /api/visual-templates/:id/fields/:fieldKey
 static async removeField(req, res) {
 try {
 const { id, fieldKey } = req.params;
 if (!id || isNaN(id) || !fieldKey) {
 return res.status(400).json({
 success: false,
 message: 'Valid template ID and field key are required'
 });
 }
 const result = await VisualTemplateService.removeField(id, fieldKey);
 res.status(200).json(result);
 } catch (error) {
 console.error('Error removing field:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // GET /api/visual-templates/:id/image
 static async serveTemplateImage(req, res) {
 try {
 const { id } = req.params;
 if (!id || isNaN(id)) {
 return res.status(400).json({
 success: false,
 message: 'Valid template ID is required'
 });
 }
 const result = await VisualTemplateService.getTemplateImage(id);

 if (!result.success) {
 return res.status(404).json({
 success: false,
 message: 'Template image not found'
 });
 }
 // Set appropriate headers
 res.setHeader('Content-Type', 'image/jpeg'); // Default to JPEG
 res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day cache
 res.send(result.data.image_data);
 } catch (error) {
 console.error('Error serving template image:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
}
