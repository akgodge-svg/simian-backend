// models/Instructor.js
import bcrypt from 'bcrypt';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { getDB } from "../config/db.js";


dotenv.config();

export class Instructor {
  constructor(data = {}) {
    this.id = data?.id;
    this.name = data?.name;
    this.email = data?.email;
    this.phone = data?.phone;
    this.primary_center_id = data?.primary_center_id;
    this.username = data?.username;
    this.password_hash = data?.password_hash;
    this.last_login = data?.last_login;
    this.password_changed_at = data?.password_changed_at;
    this.account_status = data?.account_status ?? 'active';
    this.max_concurrent_courses = data?.max_concurrent_courses ?? 2;
    this.is_active = data?.is_active ?? true;

    // Optional computed fields
    this.center_name = data?.center_name;
    this.center_type = data?.center_type;
    this.qualifications_count = data?.qualifications_count || 0;
    this.earnings_set = data?.earnings_set || 0;
    this.documents_uploaded = data?.documents_uploaded || 0;
  }

  // ✅ Always use getDB() to access the shared pool
  static db() {
    return getDB();
  }

  static getDocumentUploadConfig() {
    const storage = multer.diskStorage({
      destination: async (req, file, cb) => {
        const dir = path.join(process.cwd(), 'uploads', 'instructor-documents');
        try {
          await fs.mkdir(dir, { recursive: true });
          cb(null, dir);
        } catch (err) { cb(err); }
      },
      filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        const instructorId = req.params.id || 'new';
        const categoryId = req.body.category_id || 'unknown';
        const docType = req.body.document_type || 'doc';
        cb(null, `instructor-${instructorId}-cat-${categoryId}-${docType}-${unique}${ext}`);
      }
    });

    const fileFilter = (req, file, cb) => {
      const allowed = /jpeg|jpg|png|pdf|doc|docx/;
      const ok = allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype);
      ok ? cb(null, true) : cb(new Error('Only JPG, PNG, PDF, DOC, DOCX allowed'));
    };

    return multer({ storage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter });
  }

  // Example CRUD using shared pool
  static async findAll() {
    const sql = `
      SELECT i.*, c.name AS center_name, c.center_type,
             COUNT(DISTINCT iq.category_id) AS qualifications_count,
             COUNT(DISTINCT ie.category_id) AS earnings_set,
             COUNT(DISTINCT id_doc.id) AS documents_uploaded
      FROM instructors i
      LEFT JOIN centers c ON i.primary_center_id = c.id
      LEFT JOIN instructor_qualifications iq ON i.id = iq.instructor_id AND iq.is_active = 1
      LEFT JOIN instructor_earnings ie ON i.id = ie.instructor_id AND ie.is_active = 1
      LEFT JOIN instructor_documents id_doc ON i.id = id_doc.instructor_id AND id_doc.is_active = 1
      WHERE i.is_active = 1
      GROUP BY i.id
      ORDER BY i.created_at DESC
    `;
    const [rows] = await this.db().execute(sql);
    return rows.map(r => new Instructor(r));
  }

  // ... ✅ replicate the rest of your methods, replacing every `pool` with `this.db()`
   // Get single instructor with complete details
 static async findById(id) {
 const query = `
 SELECT
 i.*,
 c.name as center_name,
 c.center_type,
 c.contact_email as center_email,
 c.manager_name as center_manager,
 COUNT(DISTINCT iq.category_id) as qualifications_count,
 COUNT(DISTINCT ie.category_id) as earnings_set,
 COUNT(DISTINCT id_doc.id) as documents_uploaded
 FROM instructors i
 LEFT JOIN centers c ON i.primary_center_id = c.id
 LEFT JOIN instructor_qualifications iq ON i.id = iq.instructor_id AND iq.is_active = 1
 LEFT JOIN instructor_earnings ie ON i.id = ie.instructor_id AND ie.is_active = 1
 LEFT JOIN instructor_documents id_doc ON i.id = id_doc.instructor_id AND id_doc.is_active = 1
 WHERE i.id = ? AND i.is_active = 1
 GROUP BY i.id
 `;

 const [rows] = await this.db().execute(query, [id]);
 return rows.length > 0 ? new Instructor(rows[0]) : null;
 }
 // Create new instructor
 async save() {
 const connection = await this.db().getConnection();
 await connection.beginTransaction();
 try {
 // Generate username from email if not provided
 if (!this.username){
 this.username = this.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
 }
 // Hash password if provided
 if (this.password_hash && !this.password_hash.startsWith('$2b$')) {
 this.password_hash = await bcrypt.hash(this.password_hash, 10);
 }
 const insertQuery = `
 INSERT INTO instructors (
 name, email, phone, primary_center_id,
 username, password_hash, account_status, max_concurrent_courses
 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
 `;

 const [result] = await connection.execute(insertQuery, [
 this.name,
 this.email,
 this.phone,
 this.primary_center_id,
 this.username,
 this.password_hash,
 this.account_status,
 this.max_concurrent_courses
 ]);
 this.id = result.insertId;
 await connection.commit();
 return this;
 } catch (error) {
 await connection.rollback();
 throw error;
 } finally {
 connection.release();
 }
 }
 // Update instructor
 async update() {
 const connection = await this.db().getConnection();
 await connection.beginTransaction();
 try {
 const updateQuery = `
 UPDATE instructors SET
 name = ?,
 email = ?,
 phone = ?,
 primary_center_id = ?,
 account_status = ?,
 max_concurrent_courses = ?,
 updated_at = CURRENT_TIMESTAMP
 WHERE id = ?
 `;
 await connection.execute(updateQuery, [
 this.name,
 this.email,
 this.phone,
 this.primary_center_id,
 this.account_status,
 this.max_concurrent_courses,
 this.id
 ]);
 await connection.commit();
 return this;
 } catch (error) {
 await connection.rollback();
 throw error;
 } finally {
 connection.release();
 }
 }
 // Soft delete instructor
 async delete() {
 const query = 'UPDATE instructors SET is_active = 0 WHERE id = ?';
 await this.db().execute(query, [this.id]);
 return true;
 }
 // Check if email exists
 static async emailExists(email, excludeId = null) {
 let query = 'SELECT id FROM instructors WHERE email = ? AND is_active = 1';
 let params = [email];

 if (excludeId) {
 query += ' AND id != ?';
 params.push(excludeId);
 }

 const [rows] = await this.db().execute(query, params);
 return rows.length > 0;
 }
 // Check if username exists
 static async usernameExists(username, excludeId = null) {
 let query = 'SELECT id FROM instructors WHERE username = ? AND is_active = 1';
 let params = [username];

 if (excludeId) {
 query += ' AND id != ?';
 params.push(excludeId);
 }

 const [rows] = await this.db().execute(query, params);
 return rows.length > 0;
 }
 // Get dropdown list for React components
 static async getDropdownList() {
 const query = `
 SELECT
 i.id,
 i.name,
 i.email,
 c.name as center_name,
 c.center_type
 FROM instructors i
 LEFT JOIN centers c ON i.primary_center_id = c.id
 WHERE i.is_active = 1
 ORDER BY i.name ASC
 `;

 const [rows] = await this.db().execute(query);
 return rows;
 }
 // Smart matching for course assignments
 static async smartMatch(filters = {}) {
 const {
 category_id,
 level_number,
 center_id,
 course_start_date,
 course_end_date
 } = filters;
 let query = `
 SELECT DISTINCT
 i.id,
 i.name,
 i.email,
 c.name as center_name,
 c.center_type,
 iq.highest_level_qualified,
 ie.earning_rate_per_candidate,
 GROUP_CONCAT(DISTINCT CONCAT(cc.name, ' Level ', iq2.highest_level_qualified) SEPARATOR ', ') as
qualifications,
 COUNT(DISTINCT id_doc.id) as documents_count
 FROM instructors i
 LEFT JOIN centers c ON i.primary_center_id = c.id
 LEFT JOIN instructor_qualifications iq ON i.id = iq.instructor_id AND iq.category_id = ?
 LEFT JOIN instructor_earnings ie ON i.id = ie.instructor_id AND ie.category_id = ?
 LEFT JOIN instructor_qualifications iq2 ON i.id = iq2.instructor_id AND iq2.is_active = 1
 LEFT JOIN course_categories cc ON iq2.category_id = cc.id
 LEFT JOIN instructor_documents id_doc ON i.id = id_doc.instructor_id AND id_doc.category_id = ? AND
id_doc.is_active = 1 AND id_doc.verification_status = 'approved'
 WHERE i.is_active = 1
 AND iq.is_active = 1
 AND iq.verification_status = 'verified'
 AND iq.highest_level_qualified >= ?
 `;
 let params = [category_id, category_id, category_id, level_number];
 // Filter by center access
 if (center_id) {
 query += ` AND (
 c.center_type = 'main'
 OR i.primary_center_id = ?
 OR EXISTS (
 SELECT 1 FROM center_instructors ci
 WHERE ci.instructor_id = i.id
 AND ci.center_id = ?
 AND ci.is_active = 1
 )
 )`;
 params.push(center_id, center_id);
 }
 // Booking restriction: Exclude instructors with active bookings for same/lower levels
 if (course_start_date && course_end_date) {
 query += ` AND i.id NOT IN (
 SELECT ca.instructor_id
 FROM course_assignments ca
 JOIN course_category_levels ccl ON ca.level_id = ccl.id
 WHERE ca.category_id = ?
 AND ccl.level_number <= ?
 AND ca.assignment_status = 'assigned'
 AND (
 (ca.course_start_date <= ? AND ca.course_end_date >= ?) OR
 (ca.course_start_date <= ? AND ca.course_end_date >= ?) OR
 (ca.course_start_date >= ? AND ca.course_end_date <= ?)
 )
 )`;
 params.push(
 category_id,
 level_number,
 course_start_date, course_start_date,
 course_end_date, course_end_date,
 course_start_date, course_end_date
 );
 }
 query += ` GROUP BY i.id ORDER BY i.name ASC`;
 const [rows] = await this.db().execute(query, params);
 return rows;
 }
 // Get instructor's current bookings
 static async getBookingStatus(instructorId) {
 const query = `
 SELECT
 ca.*,
 cc.name as category_name,
 ccl.level_name,
 ccl.level_number
 FROM course_assignments ca
 JOIN course_categories cc ON ca.category_id = cc.id
 JOIN course_category_levels ccl ON ca.level_id = ccl.id
 WHERE ca.instructor_id = ?
 AND ca.assignment_status = 'assigned'
 ORDER BY ca.course_start_date ASC
 `;

 const [rows] = await this.db().execute(query, [instructorId]);
 return rows;
 }
 // Get instructor qualifications
 static async getQualifications(instructorId) {
 const query = `
 SELECT
 iq.*,
 cc.name as category_name,
 ccl.level_name,
 ccl.level_number
 FROM instructor_qualifications iq
 JOIN course_categories cc ON iq.category_id = cc.id
 JOIN course_category_levels ccl ON iq.level_id = ccl.id
 WHERE iq.instructor_id = ? AND iq.is_active = 1
 ORDER BY cc.name, ccl.level_number ASC
 `;

 const [rows] = await this.db().execute(query, [instructorId]);
 return rows;
 }
 // Get instructor earnings
 static async getEarnings(instructorId) {
 const query = `
 SELECT
 ie.*,
 cc.name as category_name
 FROM instructor_earnings ie
 JOIN course_categories cc ON ie.category_id = cc.id
 WHERE ie.instructor_id = ? AND ie.is_active = 1
 ORDER BY cc.name ASC
 `;

 const [rows] = await this.db().execute(query, [instructorId]);
 return rows;
 }
 // Get instructor documents with expiry info
 static async getDocuments(instructorId) {
 const query = `
 SELECT
 id_doc.*,
 cc.name as category_name,
 DATEDIFF(id_doc.expiry_date, CURDATE()) as days_to_expiry,
 CASE
 WHEN DATEDIFF(id_doc.expiry_date, CURDATE()) <= 0 THEN 'expired'
 WHEN DATEDIFF(id_doc.expiry_date, CURDATE()) <= 30 THEN 'expiring_soon'
 ELSE 'valid'
 END as expiry_status
 FROM instructor_documents id_doc
 JOIN course_categories cc ON id_doc.category_id = cc.id
 WHERE id_doc.instructor_id = ? AND id_doc.is_active = 1
 ORDER BY cc.name, id_doc.document_type ASC
 `;

 const [rows] = await this.db().execute(query, [instructorId]);
 return rows;
 }
 // Upload document
 static async uploadDocument(instructorId, documentData, fileInfo) {
 const connection = await this.db().getConnection();
 await connection.beginTransaction();
 try {
 const insertQuery = `
 INSERT INTO instructor_documents (
 instructor_id, category_id, document_type, document_name,
 original_filename, file_path, file_size, mime_type,
 card_certificate_number, issue_date, expiry_date, certifying_body
 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
 `;

 const [result] = await connection.execute(insertQuery, [
 instructorId,
 documentData.category_id,
 documentData.document_type,
 documentData.document_name,
 fileInfo.originalname,
 fileInfo.path,
 fileInfo.size,
 fileInfo.mimetype,
 documentData.card_certificate_number,
 documentData.issue_date,
 documentData.expiry_date,
 documentData.certifying_body || null
 ]);
 // Create expiry notification entries
 await this.createExpiryNotifications(connection, result.insertId, instructorId, documentData);

 await connection.commit();
 return result.insertId;
 } catch (error) {
 await connection.rollback();
 // Delete uploaded file if database operation fails
 if (fileInfo.path) {
 try {
 await fs.unlink(fileInfo.path);
 } catch (unlinkError){
 console.warn('Could not delete uploaded file:', unlinkError.message);
 }
 }
 throw error;
 } finally {
 connection.release();
 }
 }
 // Create expiry notification entries
 static async createExpiryNotifications(connection, documentId, instructorId, documentData) {
 const notificationTypes = ['30_days', '15_days', '7_days', '1_day', 'expired'];

 for (const type of notificationTypes) {
 const insertQuery = `
 INSERT INTO document_expiry_notifications (
 document_id, instructor_id, category_id, document_type,
 expiry_date, notification_type
 ) VALUES (?, ?, ?, ?, ?, ?)
 `;

 await connection.execute(insertQuery, [
 documentId,
 instructorId,
 documentData.category_id,
 documentData.document_type,
 documentData.expiry_date,
 type
 ]);
 }
 }
 // Save multiple qualifications
 static async saveQualifications(instructorId, qualifications) {
 const connection = await this.db().getConnection();
 await connection.beginTransaction();
 try {
 // Delete existing qualifications
 await connection.execute(
 'DELETE FROM instructor_qualifications WHERE instructor_id = ?',
 [instructorId]
 );
 // Insert new qualifications
 for (const qual of qualifications) {
 const insertQuery = `
 INSERT INTO instructor_qualifications (
 instructor_id, category_id, level_id, highest_level_qualified,
 certification_number, issue_date, expiry_date, certifying_body,
 verification_status
 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
 `;
 await connection.execute(insertQuery, [
 instructorId,
 qual.category_id,
 qual.level_id,
 qual.highest_level_qualified,
 qual.certification_number || null,
 qual.issue_date || null,
 qual.expiry_date || null,
 qual.certifying_body || null,
 qual.verification_status || 'pending'
 ]);
 }
 await connection.commit();
 return true;
 } catch (error) {
 await connection.rollback();
 throw error;
 } finally {
 connection.release();
 }
 }
 // Save multiple earnings
 static async saveEarnings(instructorId, earnings) {
 const connection = await this.db().getConnection();
 await connection.beginTransaction();
 try {
 // Delete existing earnings
 await connection.execute(
 'DELETE FROM instructor_earnings WHERE instructor_id = ?',
 [instructorId]
 );
 // Insert new earnings
 for (const earning of earnings) {
 const insertQuery = `
 INSERT INTO instructor_earnings (
 instructor_id, category_id, earning_rate_per_candidate, currency
 ) VALUES (?, ?, ?, ?)
 `;
 await connection.execute(insertQuery, [
 instructorId,
 earning.category_id,
 earning.earning_rate_per_candidate,
 earning.currency || 'AED'
 ]);
 }
 await connection.commit();
 return true;
 } catch (error) {
 await connection.rollback();
 throw error;
 } finally {
 connection.release();
 }
 }
 // Get documents expiring in X days
 static async getExpiringDocuments(days = 30) {
 const query = `
 SELECT
 id_doc.*,
 cc.name as category_name,
 i.name as instructor_name,
 i.email as instructor_email,
 c.name as center_name,
 c.center_type,
 c.contact_email as center_email,
 c.manager_name as center_manager,
 DATEDIFF(id_doc.expiry_date, CURDATE()) as days_to_expiry
 FROM instructor_documents id_doc
 JOIN course_categories cc ON id_doc.category_id = cc.id
 JOIN instructors i ON id_doc.instructor_id = i.id
 JOIN centers c ON i.primary_center_id = c.id
 WHERE id_doc.is_active = 1
 AND id_doc.verification_status = 'approved'
 AND DATEDIFF(id_doc.expiry_date, CURDATE()) <= ?
 AND DATEDIFF(id_doc.expiry_date, CURDATE()) >= 0
 ORDER BY id_doc.expiry_date ASC
 `;

 const [rows] = await this.db().execute(query, [days]);
 return rows;
 }
 // Send expiry notification email
 static async sendExpiryNotification(document, days) {
 try {
 // Configure email transporter
 const transporter = nodemailer.createTransporter({
 host: process.env.SMTP_HOST || 'smtp.gmail.com',
 port: process.env.SMTP_PORT || 587,
 secure: false,
 auth: {
 user: process.env.SMTP_USER,
 pass: process.env.SMTP_PASS
 }
 });
 // Determine recipients
 const recipients = [document.instructor_email];

 if (document.center_type === 'main') {
 if (process.env.ADMIN_EMAIL) {
 recipients.push(process.env.ADMIN_EMAIL);
 }
 } else {
 if (document.center_email) {
 recipients.push(document.center_email);
 }
 }
 // Email content
 const subject = `Document Expiry Alert - ${document.category_name} ${document.document_type}`;
 const html = `
 <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
 <h2 style="color: #d32f2f;">Document Expiry Alert</h2>

 <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0;">
 <h3>Document Details:</h3>
 <p><strong>Instructor:</strong> ${document.instructor_name}</p>
 <p><strong>Category:</strong> ${document.category_name}</p>
 <p><strong>Document Type:</strong> ${document.document_type.toUpperCase()}</p>
 <p><strong>Certificate Number:</strong> ${document.card_certificate_number}</p>
 <p><strong>Expiry Date:</strong> ${document.expiry_date}</p>
 <p><strong>Days Until Expiry:</strong> ${days} days</p>
 <p><strong>Center:</strong> ${document.center_name}</p>
 </div>

 <div style="background-color: #ffebee; padding: 15px; border-radius: 8px;">
 <p style="margin: 0; color: #d32f2f;">
 <strong>Action Required:</strong> Please renew this document before it expires to avoid disruption
to training activities.
 </p>
 </div>

 <hr style="margin: 30px 0;">
 <p style="color: #666; font-size: 12px;">
 This is an automated notification from Training Management System.
 </p>
 </div>
 `;
 await transporter.sendMail({
 from: process.env.SMTP_FROM || 'noreply@trainingcenter.ae',
 to: recipients.join(','),
 subject: subject,
 html: html
 });
 // Update notification tracking
 await this.db().execute(
 'UPDATE document_expiry_notifications SET notification_sent = 1, sent_to_emails = ?, sent_at = CURRENT_TIMESTAMP WHERE document_id = ? AND notification_type = ?',
 [recipients.join(','), document.id, `${days}_days`]
 );
 return true;
 } catch (error) {
 console.error('Email notification failed:', error);
 return false;
 }
 }
}

