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
export class EmailTemplateService {

 // Get all email templates
 static async getAllTemplates(filters = {}) {
 try {
 let query = 'SELECT * FROM email_templates WHERE is_active = 1';
 let params = [];

 if (filters.template_type){
 query += ' AND template_type = ?';
 params.push(filters.template_type);
 }

 if (filters.created_by_user) {
 query += ' AND created_by_user = ?';
 params.push(filters.created_by_user);
 }

 if (filters.is_system_template !== undefined) {
 query += ' AND is_system_template = ?';
 params.push(filters.is_system_template);
 }

 query += ' ORDER BY template_type, template_name';

 const [rows] = await pool.execute(query, params);

 return {
 success: true,
 data: rows,
 message: 'Email templates retrieved successfully'
 };
 } catch (error) {
 throw new Error(`Failed to get email templates: ${error.message}`);
 }
 }

 // Get template by ID
 static async getTemplateById(id) {
 try {
 const [rows] = await pool.execute(
 'SELECT * FROM email_templates WHERE id = ? AND is_active = 1',
 [id]
 );

 if (rows.length === 0) {
 return {
 success: false,
 message: 'Email template not found'
 };
 }

 return {
 success: true,
 data: rows[0],
 message: 'Email template retrieved successfully'
 };
 } catch (error) {
 throw new Error(`Failed to get email template: ${error.message}`);
 }
 }

 // Create new template
 static async createTemplate(templateData, createdBy) {
 try {
 const query = `
 INSERT INTO email_templates (
 template_name, template_type, subject_template, body_template,
 variables, template_description, created_by_user
 ) VALUES (?, ?, ?, ?, ?, ?, ?)
 `;

 const [result] = await pool.execute(query, [
 templateData.template_name,
 templateData.template_type,
 templateData.subject_template,
 templateData.body_template,
 JSON.stringify(templateData.variables || {}),
 templateData.template_description,
 createdBy
 ]);

 return {
 success: true,
 data: { id: result.insertId, ...templateData },
 message: 'Email template created successfully'
 };
 } catch (error) {
 throw new Error(`Failed to create email template: ${error.message}`);
 }
 }

 // Update template
 static async updateTemplate(id, templateData, updatedBy) {
 try {
 // Check if template exists and is not system template (unless user is admin)
 const [existing] = await pool.execute(
 'SELECT is_system_template FROM email_templates WHERE id = ? AND is_active = 1',
 [id]
 );

 if (existing.length === 0){
 return {
 success: false,
 message: 'Email template not found'
 };
 }

 const query = `
 UPDATE email_templates
 SET template_name = ?, template_type = ?, subject_template = ?,
 body_template = ?, variables = ?, template_description = ?,
 updated_at = CURRENT_TIMESTAMP
 WHERE id = ?
 `;

 await pool.execute(query, [
 templateData.template_name,
 templateData.template_type,
 templateData.subject_template,
 templateData.body_template,
 JSON.stringify(templateData.variables || {}),
 templateData.template_description,
 id
 ]);

 return {
 success: true,
 data: { id, ...templateData },
 message: 'Email template updated successfully'
 };
 } catch (error) {
 throw new Error(`Failed to update email template: ${error.message}`);
 }
 }

 // Delete template
 static async deleteTemplate(id) {
 try {
 const [result] = await pool.execute(
 'UPDATE email_templates SET is_active = 0 WHERE id = ? AND is_system_template = 0',
 [id]
 );

 if (result.affectedRows === 0) {
 return {
 success: false,
 message: 'Template not found or cannot be deleted (system template)'
 };
 }

 return {
 success: true,
 message: 'Email template deleted successfully'
 };
 } catch (error) {
 throw new Error(`Failed to delete email template: ${error.message}`);
 }
 }

 // Process template with variables
 static processTemplate(template, variables) {
 let processedSubject = template.subject_template;
 let processedBody = template.body_template;

 // Replace variables in subject and body
 Object.keys(variables).forEach(key => {
 const placeholder = `{{${key}}}`;
 const value = variables[key] || '';

 processedSubject = processedSubject.replace(new RegExp(placeholder, 'g'), value);
 processedBody = processedBody.replace(new RegExp(placeholder, 'g'), value);
 });

 return {
 subject: processedSubject,
 body: processedBody
 };
 }

 // Send templated email
 static async sendTemplatedEmail(userName, templateId, variables, recipients, MicrosoftGraphService) {
 try {
 // Get template
 const templateResult = await this.getTemplateById(templateId);
 if (!templateResult.success) {
 throw new Error('Template not found');
 }

 const template = templateResult.data;

 // Process template with variables
 const processed = this.processTemplate(template, variables);

 // Prepare email data
 const emailData = {
 subject: processed.subject,
 body_content: processed.body,
 body_type: 'HTML',
 to_recipients: recipients.map(email => ({
 address: email,
 name: email
 })),
 email_type: 'template'
 };

 // Send email
 const result = await MicrosoftGraphService.sendEmail(userName, emailData);

 return result;
 } catch (error) {
 throw new Error(`Failed to send templated email: ${error.message}`);
 }
 }

 // Get template types
 static getTemplateTypes() {
 return {
 success: true,
 data: [
 { value: 'course_notification', label: 'Course Notification' },
 { value: 'lpo_alert', label: 'LPO Alert' },
 { value: 'general', label: 'General' },
 { value: 'welcome', label: 'Welcome' },
 { value: 'reminder', label: 'Reminder' },
 { value: 'completion', label: 'Course Completion' }
 ],
 message: 'Template types retrieved successfully'
 };
 }
}
