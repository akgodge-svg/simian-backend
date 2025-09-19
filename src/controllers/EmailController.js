import { MicrosoftGraphService } from '../services/MicrosoftGraphService.js';
import { EmailTemplateService } from '../services/EmailTemplateService.js';
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
 // Allow most file types for email attachments
 const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx', '.txt', '.xlsx', '.pptx', '.zip'];
 const fileExt = path.extname(file.originalname).toLowerCase();

 if (allowedTypes.includes(fileExt)) {
 cb(null, true);
 } else {
 cb(new Error('File type not allowed for email attachments'), false);
 }
 }
});
export class EmailController {
 // GET /api/m365/auth/url
 static async getAuthUrl(req, res) {
 try {
 const userName = req.userName || 'system';
 const result = await MicrosoftGraphService.getAuthUrl(userName);
 res.status(200).json(result);
 } catch (error) {
 console.error('Error getting auth URL:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // POST /api/m365/auth/callback
 static async handleAuthCallback(req, res) {
 try {
 const { code, state } = req.body;
 if (!code || !state) {
 return res.status(400).json({
 success: false,
 message: 'Authorization code and state are required'
 });
 }
 // Get redirect URI from active settings
 const settings = await MicrosoftGraphService.getAppSettings();
 const result = await MicrosoftGraphService.handleAuthCallback(code, state, settings.redirect_uri);
 res.status(200).json(result);
 } catch (error) {
 console.error('Error handling auth callback:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // GET /api/m365/connection-status
 static async getConnectionStatus(req, res) {
 try {
 const userName = req.userName || 'system';
 const result = await MicrosoftGraphService.getUserConnectionStatus(userName);
 res.status(200).json(result);
 } catch (error) {
 console.error('Error getting connection status:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // DELETE /api/m365/auth/disconnect
 static async disconnectAccount(req, res) {
 try {
 const userName = req.userName || 'system';
 const result = await MicrosoftGraphService.disconnectUser(userName);
 res.status(200).json(result);
 } catch (error) {
 console.error('Error disconnecting account:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // GET /api/m365/emails
 static async getUserEmails(req, res) {
 try {
 const userName = req.userName || 'system';
 const folder = req.query.folder || 'inbox';
 const top = parseInt(req.query.top) || 50;
 const skip = parseInt(req.query.skip) || 0;
 const result = await MicrosoftGraphService.getUserEmails(userName, folder, top, skip);
 res.status(200).json(result);
 } catch (error) {
 console.error('Error getting user emails:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // GET /api/m365/emails/:id
 static async getEmailById(req, res) {
 try {
 const { id } = req.params;
 const userName = req.userName || 'system';
 if (!id) {
 return res.status(400).json({
 success: false,
 message: 'Email ID is required'
 });
 }
 const result = await MicrosoftGraphService.getEmailById(userName, id);
 if (!result.success) {
 return res.status(404).json(result);
 }
 res.status(200).json(result);
 } catch (error) {
 console.error('Error getting email by ID:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // POST /api/m365/emails
 static async sendEmail(req, res) {
 upload.array('attachments')(req, res, async (err) => {
 if (err) {
 return res.status(400).json({
 success: false,
 message: err.message
 });
 }
 try {
 const userName = req.userName || 'system';
 const {
 subject,
 body_content,
 body_type,
 to_recipients,
 cc_recipients,
 bcc_recipients,
 email_type
 } = req.body;
 if (!subject || !body_content || !to_recipients) {
 return res.status(400).json({
 success: false,
 message: 'Subject, body content, and recipients are required'
 });
 }
 // Parse recipients
 const toRecipients = Array.isArray(to_recipients)
 ? to_recipients
 : JSON.parse(to_recipients || '[]');
 const ccRecipients = cc_recipients
 ? (Array.isArray(cc_recipients) ? cc_recipients : JSON.parse(cc_recipients))
 : [];
 const bccRecipients = bcc_recipients
 ? (Array.isArray(bcc_recipients) ? bcc_recipients : JSON.parse(bcc_recipients))
 : [];
 // Process attachments
 const attachments = [];
 if (req.files && req.files.length > 0){
 for (const file of req.files){
 attachments.push({
 name: file.originalname,
 content_type: file.mimetype,
 content_base64: file.buffer.toString('base64')
 });
 }
 }
 const emailData = {
 subject,
 body_content,
 body_type: body_type || 'HTML',
 to_recipients: toRecipients,
 cc_recipients: ccRecipients,
 bcc_recipients: bccRecipients,
 attachments,
 email_type: email_type || 'manual'
 };
 const result = await MicrosoftGraphService.sendEmail(userName, emailData);
 res.status(200).json(result);
 } catch (error) {
 console.error('Error sending email:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 });
 }
 // PUT /api/m365/emails/:id/read
 static async markEmailAsRead(req, res) {
 try {
 const { id } = req.params;
 const { is_read } = req.body;
 const userName = req.userName || 'system';
 if (!id) {
 return res.status(400).json({
 success: false,
 message: 'Email ID is required'
 });
 }
 const result = await MicrosoftGraphService.markEmailAsRead(userName, id, is_read !== false);
 res.status(200).json(result);
 } catch (error) {
 console.error('Error marking email as read:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // DELETE /api/m365/emails/:id
 static async deleteEmail(req, res) {
 try {
 const { id } = req.params;
 const userName = req.userName || 'system';
 if (!id) {
 return res.status(400).json({
 success: false,
 message: 'Email ID is required'
 });
 }
 const result = await MicrosoftGraphService.deleteEmail(userName, id);
 res.status(200).json(result);
 } catch (error) {
 console.error('Error deleting email:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // GET /api/m365/templates
 static async getEmailTemplates(req, res) {
 try {
 const filters = {
 template_type: req.query.template_type,
 created_by_user: req.query.created_by_user,
 is_system_template: req.query.is_system_template
 };
 const result = await EmailTemplateService.getAllTemplates(filters);
 res.status(200).json(result);
 } catch (error) {
 console.error('Error getting email templates:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // GET /api/m365/templates/:id
 static async getEmailTemplateById(req, res) {
 try {
 const { id } = req.params;
 if (!id || isNaN(id)) {
 return res.status(400).json({
 success: false,
 message: 'Valid template ID is required'
 });
 }
 const result = await EmailTemplateService.getTemplateById(id);
 if (!result.success) {
 return res.status(404).json(result);
 }
 res.status(200).json(result);
 } catch (error) {
 console.error('Error getting email template:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // POST /api/m365/templates
 static async createEmailTemplate(req, res) {
 try {
 const templateData = req.body;
 const createdBy = req.userName || 'system';
 if (!templateData.template_name || !templateData.template_type ||
 !templateData.subject_template || !templateData.body_template) {
 return res.status(400).json({
 success: false,
 message: 'Template name, type, subject template, and body template are required'
 });
 }
 const result = await EmailTemplateService.createTemplate(templateData, createdBy);
 res.status(201).json(result);
 } catch (error) {
 console.error('Error creating email template:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // PUT /api/m365/templates/:id
 static async updateEmailTemplate(req, res) {
 try {
 const { id } = req.params;
 const templateData = req.body;
 const updatedBy = req.userName || 'system';
 if (!id || isNaN(id)) {
 return res.status(400).json({
 success: false,
 message: 'Valid template ID is required'
 });
 }
 const result = await EmailTemplateService.updateTemplate(id, templateData, updatedBy);
 if (!result.success) {
 return res.status(404).json(result);
 }
 res.status(200).json(result);
 } catch (error) {
 console.error('Error updating email template:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // DELETE /api/m365/templates/:id
 static async deleteEmailTemplate(req, res) {
 try {
 const { id } = req.params;
 if (!id || isNaN(id)) {
 return res.status(400).json({
 success: false,
 message: 'Valid template ID is required'
 });
 }
 const result = await EmailTemplateService.deleteTemplate(id);
 if (!result.success) {
 return res.status(404).json(result);
 }
 res.status(200).json(result);
 } catch (error) {
 console.error('Error deleting email template:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // POST /api/m365/templates/:id/send
 static async sendTemplatedEmail(req, res) {
 try {
 const { id } = req.params;
 const { recipients, variables } = req.body;
 const userName = req.userName || 'system';
 if (!id || isNaN(id)) {
 return res.status(400).json({
 success: false,
 message: 'Valid template ID is required'
 });
 }
 if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
 return res.status(400).json({
 success: false,
 message: 'Recipients array is required'
 });
 }
 const result = await EmailTemplateService.sendTemplatedEmail(
 userName,
 parseInt(id),
 variables || {},
 recipients,
 MicrosoftGraphService
 );
 res.status(200).json(result);
 } catch (error) {
 console.error('Error sending templated email:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // GET /api/m365/template-types
 static async getTemplateTypes(req, res) {
 try {
 const result = EmailTemplateService.getTemplateTypes();
 res.status(200).json(result);
 } catch (error) {
 console.error('Error getting template types:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
}