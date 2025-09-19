import { EncryptionService } from '../services/EncryptionService.js';
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
export class M365SettingsController {
 // GET /api/m365/settings
 static async getSettings(req, res) {
 try {
 const [rows] = await pool.execute(
 'SELECT id, client_id, tenant_id, redirect_uri, scopes, is_active, created_at, updated_at FROM
m365_app_settings ORDER BY created_at DESC'
 );
 res.status(200).json({
 success: true,
 data: rows,
 message: 'M365 settings retrieved successfully'
 });
 } catch (error) {
 console.error('Error getting M365 settings:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // GET /api/m365/settings/active
 static async getActiveSettings(req, res) {
 try {
 const [rows] = await pool.execute(
 'SELECT id, client_id, tenant_id, redirect_uri, scopes, is_active, created_at, updated_at FROM
m365_app_settings WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1'
 );
 if (rows.length === 0) {
 return res.status(404).json({
 success: false,
 message: 'No active M365 settings found'
 });
 }
 res.status(200).json({
 success: true,
 data: rows[0],
 message: 'Active M365 settings retrieved successfully'
 });
 } catch (error) {
 console.error('Error getting active M365 settings:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // POST /api/m365/settings
 static async createSettings(req, res) {
 try {
 const { client_id, client_secret, tenant_id, redirect_uri, scopes } = req.body;
 if (!client_id || !client_secret || !tenant_id || !redirect_uri){
 return res.status(400).json({
 success: false,
 message: 'Client ID, Client Secret, Tenant ID, and Redirect URI are required'
 });
 }
 // Encrypt client secret
 const encryptedSecret = EncryptionService.encryptForStorage(client_secret);
 const connection = await pool.getConnection();
 await connection.beginTransaction();
 try {
 // Deactivate all existing settings
 await connection.execute('UPDATE m365_app_settings SET is_active = 0');
 // Insert new settings
 const [result] = await connection.execute(`
 INSERT INTO m365_app_settings (client_id, client_secret, tenant_id, redirect_uri, scopes, is_active)
 VALUES (?, ?, ?, ?, ?, 1)
 `, [
 client_id,
 encryptedSecret,
 tenant_id,
 redirect_uri,
 scopes || 'https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/User.Read'
 ]);
 await connection.commit();
 res.status(201).json({
 success: true,
 data: {
 id: result.insertId,
 client_id,
 tenant_id,
 redirect_uri,
 scopes,
 is_active: true
 },
 message: 'M365 settings created successfully'
 });
 } catch (error) {
 await connection.rollback();
 throw error;
 } finally {
 connection.release();
 }
 } catch (error) {
 console.error('Error creating M365 settings:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // PUT /api/m365/settings/:id
 static async updateSettings(req, res) {
 try {
 const { id } = req.params;
 const { client_id, client_secret, tenant_id, redirect_uri, scopes } = req.body;
 if (!id || isNaN(id)) {
 return res.status(400).json({
 success: false,
 message: 'Valid settings ID is required'
 });
 }
 const connection = await pool.getConnection();
 await connection.beginTransaction();
 try {
 // Check if settings exist
 const [existing] = await connection.execute(
 'SELECT id FROM m365_app_settings WHERE id = ?',
 [id]
 );
 if (existing.length === 0) {
 return res.status(404).json({
 success: false,
 message: 'M365 settings not found'
 });
 }
 // Prepare update query
 let updateQuery = 'UPDATE m365_app_settings SET ';
 let updateParams = [];
 let updates = [];
 if (client_id) {
 updates.push('client_id = ?');
 updateParams.push(client_id);
 }
 if (client_secret){
 updates.push('client_secret = ?');
 updateParams.push(EncryptionService.encryptForStorage(client_secret));
 }
 if (tenant_id) {
 updates.push('tenant_id = ?');
 updateParams.push(tenant_id);
 }
 if (redirect_uri) {
 updates.push('redirect_uri = ?');
 updateParams.push(redirect_uri);
 }
 if (scopes) {
 updates.push('scopes = ?');
 updateParams.push(scopes);
 }
 if (updates.length === 0) {
 return res.status(400).json({
 success: false,
 message: 'No fields to update'
 });
 }
 updates.push('updated_at = CURRENT_TIMESTAMP');
 updateQuery += updates.join(', ') + ' WHERE id = ?';
 updateParams.push(id);
 // Deactivate all other settings
 await connection.execute('UPDATE m365_app_settings SET is_active = 0 WHERE id != ?', [id]);
 // Update and activate this setting
 await connection.execute(updateQuery, updateParams);
 await connection.execute('UPDATE m365_app_settings SET is_active = 1 WHERE id = ?', [id]);
 await connection.commit();
 res.status(200).json({
 success: true,
 message: 'M365 settings updated successfully'
 });
 } catch (error) {
 await connection.rollback();
 throw error;
 } finally {
 connection.release();
 }
 } catch (error) {
 console.error('Error updating M365 settings:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // DELETE /api/m365/settings/:id
 static async deleteSettings(req, res) {
 try {
 const { id } = req.params;
 if (!id || isNaN(id)) {
 return res.status(400).json({
 success: false,
 message: 'Valid settings ID is required'
 });
 }
 const [result] = await pool.execute(
 'DELETE FROM m365_app_settings WHERE id = ?',
 [id]
 );
 if (result.affectedRows === 0) {
 return res.status(404).json({
 success: false,
 message: 'M365 settings not found'
 });
 }
 res.status(200).json({
 success: true,
 message: 'M365 settings deleted successfully'
 });
 } catch (error) {
 console.error('Error deleting M365 settings:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
}
