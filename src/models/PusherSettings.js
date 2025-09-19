import mysql from 'mysql2/promise';
import crypto from 'crypto';
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
export class PusherSettings {
 constructor(data = {}) {
 this.id = data?.id;
 this.app_id = data?.app_id;
 this.app_key = data?.app_key;
 this.app_secret = data?.app_secret;
 this.cluster = data?.cluster || 'us2';
 this.use_tls = data?.use_tls ?? true;
 this.is_active = data?.is_active ?? true;
 this.created_at = data?.created_at;
 this.updated_at = data?.updated_at;
 }
 // Get active Pusher settings
 static async getActiveSettings() {
 const query = 'SELECT * FROM pusher_settings WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1';
 const [rows] = await pool.execute(query);

 if (rows.length === 0) {
 return null;
 }

 return new PusherSettings(rows[0]);
 }
 // Get all Pusher settings
 static async findAll() {
 const query = 'SELECT * FROM pusher_settings ORDER BY created_at DESC';
 const [rows] = await pool.execute(query);
 return rows.map(row => new PusherSettings(row));
 }
 // Get Pusher settings by ID
 static async findById(id) {
 const query = 'SELECT * FROM pusher_settings WHERE id = ?';
 const [rows] = await pool.execute(query, [id]);

 if (rows.length === 0) {
 return null;
 }

 return new PusherSettings(rows[0]);
 }
 // Create new Pusher settings
 async save() {
 const connection = await pool.getConnection();
 await connection.beginTransaction();
 try {
 // Deactivate all existing settings
 await connection.execute('UPDATE pusher_settings SET is_active = 0');
 // Insert new settings
 const insertQuery = `
 INSERT INTO pusher_settings (app_id, app_key, app_secret, cluster, use_tls, is_active)
 VALUES (?, ?, ?, ?, ?, 1)
 `;

 const [result] = await connection.execute(insertQuery, [
 this.app_id,
 this.app_key,
 this.app_secret,
 this.cluster,
 this.use_tls
 ]);
 this.id = result.insertId;
 this.is_active = true;
 await connection.commit();
 return this;
 } catch (error) {
 await connection.rollback();
 throw error;
 } finally {
 connection.release();
 }
 }
 // Update existing Pusher settings
 async update() {
 const connection = await pool.getConnection();
 await connection.beginTransaction();
 try {
 // Deactivate all other settings
 await connection.execute('UPDATE pusher_settings SET is_active = 0 WHERE id != ?', [this.id]);
 // Update this setting
 const updateQuery = `
 UPDATE pusher_settings
 SET app_id = ?, app_key = ?, app_secret = ?, cluster = ?, use_tls = ?, is_active = 1, updated_at =
CURRENT_TIMESTAMP
 WHERE id = ?
 `;

 await connection.execute(updateQuery, [
 this.app_id,
 this.app_key,
 this.app_secret,
 this.cluster,
 this.use_tls,
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
 // Delete Pusher settings
 static async delete(id) {
 const query = 'DELETE FROM pusher_settings WHERE id = ?';
 const [result] = await pool.execute(query, [id]);
 return result.affectedRows > 0;
 }
 // Test Pusher connection
 static async testConnection(settings) {
 try {
 const Pusher = (await import('pusher')).default;

 const pusher = new Pusher({
 appId: settings.app_id,
 key: settings.app_key,
 secret: settings.app_secret,
 cluster: settings.cluster,
 useTLS: settings.use_tls
 });
 // Test by triggering a test event
 await pusher.trigger('test-channel', 'test-event', { message: 'Connection test' });
 return { success: true, message: 'Pusher connection successful' };
 } catch (error) {
 return { success: false, message: `Pusher connection failed: ${error.message}` };
 }
 }
 // Get masked settings for frontend (hide secret)
 getMaskedSettings() {
 return {
 id: this.id,
 app_id: this.app_id,
 app_key: this.app_key,
 app_secret: this.app_secret ? '***********' : null,
 cluster: this.cluster,
 use_tls: this.use_tls,
 is_active: this.is_active,
 created_at: this.created_at,
 updated_at: this.updated_at
 };
 }
 // Test database connection
 static async testConnection() {
 try {
 await pool.execute('SELECT 1');
 return true;
 } catch (error) {
 console.error('PusherSettings database connection test failed:', error);
 return false;
 }
 }
}