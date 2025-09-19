import mysql from 'mysql2/promise';
import { FileStorageService } from './FileStorageService.js';
import ExcelJS from 'exceljs';
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
export class TransmittalsService {
 // Get all transmittals with advanced filtering
 static async getAllTransmittals(filters = {}, pagination = {}) {
 try {
 let query = `
 SELECT
 tr.*,
 ci.invoice_number,
 ci.invoice_date,
 ci.payment_status,
 cb.course_number,
 cb.start_date as course_start_date,
 cb.end_date as course_end_date,
 cc.name as course_name,
 cust.name as company_name,
 cust.company_name as company_full_name,
 center.name as center_name,
 COUNT(JSON_EXTRACT(tr.selected_candidates, '$[*]')) as candidate_count
 FROM transmittal_records tr
 LEFT JOIN client_invoices ci ON tr.invoice_id = ci.id
 LEFT JOIN course_bookings cb ON ci.booking_id = cb.id
 LEFT JOIN course_categories cc ON cb.category_id = cc.id
 LEFT JOIN customers cust ON ci.company_id = cust.id
 LEFT JOIN centers center ON cb.created_by_center_id = center.id
 WHERE tr.is_active = 1
 `;

 let params = [];

 // Apply filters
 if (filters.transmittal_number) {
 query += ` AND tr.transmittal_number LIKE ?`;
 params.push(`%${filters.transmittal_number}%`);
 }

 if (filters.course_number) {
 query += ` AND cb.course_number LIKE ?`;
 params.push(`%${filters.course_number}%`);
 }

 if (filters.company_id) {
 query += ` AND cust.id = ?`;
 params.push(filters.company_id);
 }

 if (filters.delivery_status) {
 query += ` AND tr.delivery_status = ?`;
 params.push(filters.delivery_status);
 }

 if (filters.delivery_type) {
 query += ` AND tr.delivery_type = ?`;
 params.push(filters.delivery_type);
 }

 if (filters.payment_status) {
 query += ` AND ci.payment_status = ?`;
 params.push(filters.payment_status);
 }

 if (filters.center_id){
 query += ` AND cb.created_by_center_id = ?`;
 params.push(filters.center_id);
 }

 if (filters.created_by_user) {
 query += ` AND tr.created_by_user = ?`;
 params.push(filters.created_by_user);
 }

 if (filters.date_from) {
 query += ` AND DATE(tr.created_at) >= ?`;
 params.push(filters.date_from);
 }

 if (filters.date_to) {
 query += ` AND DATE(tr.created_at) <= ?`;
 params.push(filters.date_to);
 }

 if (filters.delivery_date_from) {
 query += ` AND tr.pickup_date >= ?`;
 params.push(filters.delivery_date_from);
 }

 if (filters.delivery_date_to){
 query += ` AND tr.pickup_date <= ?`;
 params.push(filters.delivery_date_to);
 }

 // Group by for JSON_EXTRACT count
 query += ` GROUP BY tr.id`;

 // Apply sorting
 const sortBy = filters.sort_by || 'created_at';
 const sortOrder = filters.sort_order || 'DESC';
 const allowedSortFields = [
 'created_at', 'transmittal_number', 'course_number', 'company_name',
 'delivery_status', 'pickup_date', 'invoice_date', 'payment_status'
 ];

 if (allowedSortFields.includes(sortBy)) {
 query += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;
 } else {
 query += ` ORDER BY tr.created_at DESC`;
 }

 // Apply pagination
 const limit = parseInt(pagination.limit) || 50;
 const offset = parseInt(pagination.offset) || 0;

 query += ` LIMIT ? OFFSET ?`;
 params.push(limit, offset);

 const [rows] = await pool.execute(query, params);

 // Get total count
 let countQuery = query.replace(
 /SELECT .*? FROM/,
 'SELECT COUNT(DISTINCT tr.id) as total FROM'
 ).replace(/ORDER BY.*/, '').replace(/LIMIT.*/, '').replace(/GROUP BY.*/, '');

 const [countResult] = await pool.execute(countQuery, params.slice(0, -2)); // Remove limit and offset
params
 const totalCount = countResult[0]?.total || 0;

 return {
 success: true,
 data: {
 transmittals: rows,
 pagination: {
 total: totalCount,
 limit,
 offset,
 has_more: offset + rows.length < totalCount
 }
 },
 message: 'Transmittals retrieved successfully'
 };

 } catch (error) {
 throw new Error(`Failed to get transmittals: ${error.message}`);
 }
 }
 // Get single transmittal by ID
 static async getTransmittalById(id) {
 try {
 const query = `
 SELECT
 tr.*,
 ci.invoice_number,
 ci.invoice_date,
 ci.payment_status,
 ci.payment_date,
 cb.course_number,
 cb.start_date as course_start_date,
 cb.end_date as course_end_date,
 cc.name as course_name,
 ccl.level_name,
 cust.name as company_name,
 cust.company_name as company_full_name,
 cust.email as company_email,
 cust.phone as company_phone,
 center.name as center_name,
 center.address as center_address
 FROM transmittal_records tr
 LEFT JOIN client_invoices ci ON tr.invoice_id = ci.id
 LEFT JOIN course_bookings cb ON ci.booking_id = cb.id
 LEFT JOIN course_categories cc ON cb.category_id = cc.id
 LEFT JOIN course_category_levels ccl ON cb.level_id = ccl.id
 LEFT JOIN customers cust ON ci.company_id = cust.id
 LEFT JOIN centers center ON cb.created_by_center_id = center.id
 WHERE tr.id = ? AND tr.is_active = 1
 `;

 const [rows] = await pool.execute(query, [id]);

 if (rows.length === 0) {
 return {
 success: false,
 message: 'Transmittal not found'
 };
 }

 const transmittal = rows[0];

 // Parse selected candidates
 if (transmittal.selected_candidates) {
 try {
 transmittal.candidates = JSON.parse(transmittal.selected_candidates);
 } catch (error){
 transmittal.candidates = [];
 }
 } else {
 transmittal.candidates = [];
 }

 // Get status history
 const [historyRows] = await pool.execute(`
 SELECT * FROM transmittal_status_history
 WHERE transmittal_id = ?
 ORDER BY changed_at DESC
 `, [id]);

 transmittal.status_history = historyRows;

 return {
 success: true,
 data: transmittal,
 message: 'Transmittal retrieved successfully'
 };

 } catch (error) {
 throw new Error(`Failed to get transmittal: ${error.message}`);
 }
 }
 // Update transmittal status
 static async updateTransmittalStatus(id, statusData, userContext) {
 const connection = await pool.getConnection();
 await connection.beginTransaction();
 try {
 // Get current transmittal
 const [currentRows] = await connection.execute(
 'SELECT * FROM transmittal_records WHERE id = ? AND is_active = 1',
 [id]
 );

 if (currentRows.length === 0) {
 throw new Error('Transmittal not found');
 }

 const current = currentRows[0];

 // Prepare update fields
 const updateFields = [];
 const updateParams = [];

 if (statusData.delivery_status){
 updateFields.push('delivery_status = ?');
 updateParams.push(statusData.delivery_status);
 }

 if (statusData.vendor_status) {
 updateFields.push('vendor_status = ?');
 updateParams.push(statusData.vendor_status);
 }

 if (statusData.pickup_person_name) {
 updateFields.push('pickup_person_name = ?');
 updateParams.push(statusData.pickup_person_name);
 }

 if (statusData.pickup_employee_id) {
 updateFields.push('pickup_employee_id = ?');
 updateParams.push(statusData.pickup_employee_id);
 }

 if (statusData.pickup_date){
 updateFields.push('pickup_date = ?');
 updateParams.push(statusData.pickup_date);
 }

 if (statusData.actual_delivery_date){
 updateFields.push('actual_delivery_date = ?');
 updateParams.push(statusData.actual_delivery_date);
 }

 if (statusData.delivered_by_person) {
 updateFields.push('delivered_by_person = ?');
 updateParams.push(statusData.delivered_by_person);
 }

 if (statusData.delivery_notes) {
 updateFields.push('delivery_notes = ?');
 updateParams.push(statusData.delivery_notes);
 }

 if (statusData.delivery_status === 'completed' && !statusData.delivery_confirmation_date){
 updateFields.push('delivery_confirmation_date = CURRENT_TIMESTAMP');
 }

 if (updateFields.length === 0) {
 throw new Error('No fields to update');
 }

 // Update transmittal
 updateFields.push('updated_at = CURRENT_TIMESTAMP');
 updateParams.push(id);

 const updateQuery = `
 UPDATE transmittal_records
 SET ${updateFields.join(', ')}
 WHERE id = ?
 `;

 await connection.execute(updateQuery, updateParams);

 // Log status changes manually (since trigger might not capture user info)
 if (statusData.delivery_status && statusData.delivery_status !== current.delivery_status) {
 await connection.execute(`
 INSERT INTO transmittal_status_history (
 transmittal_id, old_status, new_status, status_type,
 changed_by_user, change_notes
 ) VALUES (?, ?, ?, 'delivery_status', ?, ?)
 `, [
 id,
 current.delivery_status,
 statusData.delivery_status,
 userContext.userName,
 statusData.status_change_notes || `Status changed by ${userContext.userName}`
 ]);
 }

 await connection.commit();

 return {
 success: true,
 message: 'Transmittal status updated successfully'
 };

 } catch (error) {
 await connection.rollback();
 throw error;
 } finally {
 connection.release();
 }
 }
 // Get dashboard statistics
 static async getDashboardStats(userContext = {}) {
 try {
 let whereClause = 'WHERE tr.is_active = 1';
 let params = [];

 // Apply center filter for non-admin users
 if (userContext.centerContext && userContext.userRole !== 'admin') {
 whereClause += ' AND cb.created_by_center_id = ?';
 params.push(userContext.centerContext.id);
 }

 // Get overall statistics
 const [statsRows] = await pool.execute(`
 SELECT
 COUNT(*) as total_transmittals,
 SUM(CASE WHEN tr.delivery_status = 'pending' THEN 1 ELSE 0 END) as pending_deliveries,
 SUM(CASE WHEN tr.delivery_status = 'in_transit' THEN 1 ELSE 0 END) as in_transit_deliveries,
 SUM(CASE WHEN tr.delivery_status = 'delivered' THEN 1 ELSE 0 END) as delivered_transmittals,
 SUM(CASE WHEN tr.delivery_status = 'completed' THEN 1 ELSE 0 END) as completed_transmittals,
 SUM(CASE WHEN tr.delivery_type = 'self_pickup' THEN 1 ELSE 0 END) as self_pickup_count,
 SUM(CASE WHEN tr.delivery_type = 'by_vendor' THEN 1 ELSE 0 END) as vendor_delivery_count
 FROM transmittal_records tr
 LEFT JOIN client_invoices ci ON tr.invoice_id = ci.id
 LEFT JOIN course_bookings cb ON ci.booking_id = cb.id
 ${whereClause}
 `, params);

 // Get recent transmittals
 const [recentRows] = await pool.execute(`
 SELECT
 tr.id,
 tr.transmittal_number,
 tr.delivery_status,
 tr.delivery_type,
 tr.created_at,
 cb.course_number,
 cc.name as course_name,
 cust.name as company_name
 FROM transmittal_records tr
 LEFT JOIN client_invoices ci ON tr.invoice_id = ci.id
 LEFT JOIN course_bookings cb ON ci.booking_id = cb.id
 LEFT JOIN course_categories cc ON cb.category_id = cc.id
 LEFT JOIN customers cust ON ci.company_id = cust.id
 ${whereClause}
 ORDER BY tr.created_at DESC
 LIMIT 10
 `, params);

 // Get company-wise statistics
 const [companyRows] = await pool.execute(`
 SELECT
 cust.name as company_name,
 COUNT(*) as transmittal_count,
 SUM(CASE WHEN tr.delivery_status = 'completed' THEN 1 ELSE 0 END) as completed_count
 FROM transmittal_records tr
 LEFT JOIN client_invoices ci ON tr.invoice_id = ci.id
 LEFT JOIN course_bookings cb ON ci.booking_id = cb.id
 LEFT JOIN customers cust ON ci.company_id = cust.id
 ${whereClause}
 GROUP BY cust.id, cust.name
 ORDER BY transmittal_count DESC
 LIMIT 10
 `, params);

 // Get pending deliveries (overdue)
 const [overdueRows] = await pool.execute(`
 SELECT
 tr.id,
 tr.transmittal_number,
 tr.pickup_date,
 cb.course_number,
 cust.name as company_name,
 DATEDIFF(CURRENT_DATE, tr.pickup_date) as days_overdue
 FROM transmittal_records tr
 LEFT JOIN client_invoices ci ON tr.invoice_id = ci.id
 LEFT JOIN course_bookings cb ON ci.booking_id = cb.id
 LEFT JOIN customers cust ON ci.company_id = cust.id
 ${whereClause}
 AND tr.delivery_status = 'pending'
 AND tr.pickup_date < CURRENT_DATE
 ORDER BY tr.pickup_date ASC
 LIMIT 10
 `, params);

 return {
 success: true,
 data: {
 statistics: statsRows[0],
 recent_transmittals: recentRows,
 company_statistics: companyRows,
 overdue_deliveries: overdueRows
 },
 message: 'Dashboard statistics retrieved successfully'
 };

 } catch (error) {
 throw new Error(`Failed to get dashboard stats: ${error.message}`);
 }
 }
 // Export transmittals to Excel
 static async exportToExcel(filters = {}, userContext = {}) {
 try {
 // Get transmittals data
 const result = await this.getAllTransmittals(filters, { limit: 10000 });
 const transmittals = result.data.transmittals;

 // Create workbook
 const workbook = new ExcelJS.Workbook();
 const worksheet = workbook.addWorksheet('Transmittals');

 // Define columns
 worksheet.columns = [
 { header: 'Transmittal Number', key: 'transmittal_number', width: 20 },
 { header: 'Course Number', key: 'course_number', width: 15 },
 { header: 'Course Name', key: 'course_name', width: 25 },
 { header: 'Company', key: 'company_name', width: 25 },
 { header: 'Delivery Type', key: 'delivery_type', width: 15 },
 { header: 'Delivery Status', key: 'delivery_status', width: 15 },
 { header: 'Payment Status', key: 'payment_status', width: 15 },
 { header: 'Candidate Count', key: 'candidate_count', width: 15 },
 { header: 'Pickup Date', key: 'pickup_date', width: 15 },
 { header: 'Actual Delivery', key: 'actual_delivery_date', width: 15 },
 { header: 'Created Date', key: 'created_at', width: 15 },
 { header: 'Created By', key: 'created_by_user', width: 15 }
 ];

 // Style header row
 const headerRow = worksheet.getRow(1);
 headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
 headerRow.fill = {
 type: 'pattern',
 pattern: 'solid',
 fgColor: { argb: '366092' }
 };

 // Add data rows
 transmittals.forEach(transmittal => {
 worksheet.addRow({
 transmittal_number: transmittal.transmittal_number,
 course_number: transmittal.course_number,
 course_name: transmittal.course_name,
 company_name: transmittal.company_name,
 delivery_type: transmittal.delivery_type,
 delivery_status: transmittal.delivery_status,
 payment_status: transmittal.payment_status,
 candidate_count: transmittal.candidate_count,
 pickup_date: transmittal.pickup_date,
 actual_delivery_date: transmittal.actual_delivery_date,
 created_at: new Date(transmittal.created_at),
 created_by_user: transmittal.created_by_user
 });
 });

 // Auto-fit columns
 worksheet.columns.forEach(column => {
 column.width = Math.max(column.width, 12);
 });

 // Generate buffer
 const buffer = await workbook.xlsx.writeBuffer();

 return {
 success: true,
 data: {
 buffer,
 filename: `transmittals_export_${new Date().toISOString().split('T')[0]}.xlsx`,
 contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
 },
 message: 'Excel export generated successfully'
 };

 } catch (error) {
 throw new Error(`Failed to export to Excel: ${error.message}`);
 }
 }
 // Search transmittals
 static async searchTransmittals(searchTerm, filters = {}) {
 try {
 if (!searchTerm || searchTerm.trim() === '') {
 return this.getAllTransmittals(filters);
 }

 // Add search term to filters
 const searchFilters = {
 ...filters,
 search_term: searchTerm.trim()
 };

 let query = `
 SELECT
 tr.*,
 ci.invoice_number,
 ci.payment_status,
 cb.course_number,
 cc.name as course_name,
 cust.name as company_name
 FROM transmittal_records tr
 LEFT JOIN client_invoices ci ON tr.invoice_id = ci.id
 LEFT JOIN course_bookings cb ON ci.booking_id = cb.id
 LEFT JOIN course_categories cc ON cb.category_id = cc.id
 LEFT JOIN customers cust ON ci.company_id = cust.id
 WHERE tr.is_active = 1
 AND (
 tr.transmittal_number LIKE ? OR
 cb.course_number LIKE ? OR
 cc.name LIKE ? OR
 cust.name LIKE ? OR
 tr.pickup_person_name LIKE ? OR
 tr.delivered_by_person LIKE ?
 )
 `;

 const searchPattern = `%${searchTerm}%`;
 let params = [searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern];

 // Apply additional filters
 Object.keys(filters).forEach(key => {
 if (filters[key] && key !== 'search_term') {
 if (key === 'company_id') {
 query += ` AND cust.id = ?`;
 params.push(filters[key]);
 } else if (key === 'delivery_status'){
 query += ` AND tr.delivery_status = ?`;
 params.push(filters[key]);
 }
 // Add more filter conditions as needed
 }
 });

 query += ` ORDER BY tr.created_at DESC LIMIT 100`;

 const [rows] = await pool.execute(query, params);

 return {
 success: true,
 data: {
 transmittals: rows,
 search_term: searchTerm,
 total_results: rows.length
 },
 message: 'Search results retrieved successfully'
 };

 } catch (error) {
 throw new Error(`Search failed: ${error.message}`);
 }
 }
 // Bulk update transmittals
 static async bulkUpdateStatus(transmittalIds, statusData, userContext) {
 const connection = await pool.getConnection();
 await connection.beginTransaction();
 try {
 if (!transmittalIds || transmittalIds.length === 0) {
 throw new Error('No transmittals selected for bulk update');
 }
 const placeholders = transmittalIds.map(() => '?').join(',');

 // Prepare update fields
 const updateFields = [];
 const updateParams = [];

 if (statusData.delivery_status){
 updateFields.push('delivery_status = ?');
 updateParams.push(statusData.delivery_status);
 }

 if (statusData.vendor_status) {
 updateFields.push('vendor_status = ?');
 updateParams.push(statusData.vendor_status);
 }

 if (statusData.delivery_notes) {
 updateFields.push('delivery_notes = ?');
 updateParams.push(statusData.delivery_notes);
 }

 if (updateFields.length === 0) {
 throw new Error('No fields to update');
 }

 // Add updated_at and IDs
 updateFields.push('updated_at = CURRENT_TIMESTAMP');
 updateParams.push(...transmittalIds);

 const updateQuery = `
 UPDATE transmittal_records
 SET ${updateFields.join(', ')}
 WHERE id IN (${placeholders}) AND is_active = 1
 `;

 const [result] = await connection.execute(updateQuery, updateParams);

 // Log bulk status changes
 if (statusData.delivery_status){
 const historyPromises = transmittalIds.map(id =>
 connection.execute(`
 INSERT INTO transmittal_status_history (
 transmittal_id, old_status, new_status, status_type,
 changed_by_user, change_notes
 ) VALUES (?, ?, ?, 'delivery_status', ?, ?)
 `, [
 id,
 'bulk_update',
 statusData.delivery_status,
 userContext.userName,
 `Bulk update by ${userContext.userName}: ${statusData.bulk_update_notes || 'Bulk status change'}`
 ])
 );

 await Promise.all(historyPromises);
 }

 await connection.commit();

 return {
 success: true,
 data: {
 updated_count: result.affectedRows,
 transmittal_ids: transmittalIds
 },
 message: `Successfully updated ${result.affectedRows} transmittals`
 };

 } catch (error) {
 await connection.rollback();
 throw error;
 } finally {
 connection.release();
 }
 }
}