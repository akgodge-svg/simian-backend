import mysql from 'mysql2/promise';
import { EmailService } from '../services/EmailService.js';
import { FileUploadUtils } from '../utils/fileUpload.js';
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
export class LPO {
constructor(data = {}) {
this.id = data?.id;
this.lpo_number = data?.lpo_number; // Now manual entry
this.customer_id = data?.customer_id;
this.lpo_type = data?.lpo_type;
this.order_date = data?.order_date;
this.valid_until = data?.valid_until;
this.total_amount = data?.total_amount || 0;
this.currency = data?.currency || 'AED';
this.order_status = data?.order_status || 'draft';
this.created_by_center_id = data?.created_by_center_id;
this.created_by_user = data?.created_by_user;
this.notes = data?.notes;
// File upload fields
this.lpo_file_path = data?.lpo_file_path;
this.lpo_file_name = data?.lpo_file_name;
this.lpo_file_size = data?.lpo_file_size;
this.lpo_file_type = data?.lpo_file_type;
this.lpo_uploaded_at = data?.lpo_uploaded_at;
this.is_active = data?.is_active ?? true;
this.created_at = data?.created_at;
this.updated_at = data?.updated_at;
// Additional computed fields
this.customer_name = data?.customer_name;
this.customer_type = data?.customer_type;
this.customer_email = data?.customer_email;
this.customer_phone = data?.customer_phone;
this.customer_company_name = data?.customer_company_name;
this.customer_contact_person = data?.customer_contact_person;
this.center_name = data?.center_name;
this.center_email = data?.center_email;
this.line_items = data?.line_items || [];
this.total_items = data?.total_items || 0;
this.remaining_quantity = data?.remaining_quantity || 0;
}
// Get all LPOs with center filtering
static async findAll(centerContext = null) {
let query = `
SELECT
l.*,
c.name as customer_name,
c.customer_type,
c.email as customer_email,
c.phone as customer_phone,
c.company_name as customer_company_name,
c.contact_person as customer_contact_person,
ct.name as center_name,
ct.contact_email as center_email,
COUNT(li.id) as total_items,
SUM(li.quantity_remaining) as remaining_quantity
FROM lpo_orders l
JOIN customers c ON l.customer_id = c.id
JOIN centers ct ON l.created_by_center_id = ct.id
LEFT JOIN lpo_line_items li ON l.id = li.lpo_order_id
WHERE l.is_active = 1
`;
let params = [];
// Apply center filtering - only main branch can see LPOs
if (centerContext && centerContext.type !== 'main') {
return []; // Overseas centers cannot see any LPOs
}
query += ` GROUP BY l.id ORDER BY l.created_at DESC`;
const [rows] = await pool.execute(query, params);
return rows.map(row => new LPO(row));
}
// Get single LPO by ID with line items
static async findById(id, centerContext = null) {
// Only main branch can access LPOs
if (centerContext && centerContext.type !== 'main') {
return null;
}
const query = `
SELECT
l.*,
c.name as customer_name,
c.customer_type,
c.email as customer_email,
c.phone as customer_phone,
c.company_name as customer_company_name,
c.contact_person as customer_contact_person,
ct.name as center_name,
ct.contact_email as center_email
FROM lpo_orders l
JOIN customers c ON l.customer_id = c.id
JOIN centers ct ON l.created_by_center_id = ct.id
WHERE l.id = ? AND l.is_active = 1
`;
const [rows] = await pool.execute(query, [id]);
if (rows.length === 0) return null;
const lpo = new LPO(rows[0]);
// Get line items
lpo.line_items = await this.getLineItems(id);
return lpo;
}
// Check if LPO number exists
static async lpoNumberExists(lpoNumber, excludeId = null) {
let query = 'SELECT id FROM lpo_orders WHERE lpo_number = ? AND is_active = 1';
let params = [lpoNumber];
if (excludeId) {
query += ' AND id != ?';
params.push(excludeId);
}
const [rows] = await pool.execute(query, params);
return rows.length > 0;
}
// Get LPO line items
static async getLineItems(lpoId) {
const query = `
SELECT
li.*,
cc.name as category_name,
ccl.level_name,
ccl.level_number
FROM lpo_line_items li
JOIN course_categories cc ON li.category_id = cc.id
JOIN course_category_levels ccl ON li.level_id = ccl.id
WHERE li.lpo_order_id = ?
ORDER BY cc.name, ccl.level_number
`;
const [rows] = await pool.execute(query, [lpoId]);
return rows;
}
// Create new LPO
async save() {
const connection = await pool.getConnection();
await connection.beginTransaction();
try {
const insertQuery = `
INSERT INTO lpo_orders (
lpo_number, customer_id, lpo_type, order_date, valid_until,
total_amount, currency, order_status, created_by_center_id,
created_by_user, notes, lpo_file_path, lpo_file_name,
lpo_file_size, lpo_file_type, lpo_uploaded_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;
const [result] = await connection.execute(insertQuery, [
this.lpo_number,
this.customer_id,
this.lpo_type,
this.order_date,
this.valid_until,
this.total_amount,
this.currency,
this.order_status,
this.created_by_center_id,
this.created_by_user,
this.notes,
this.lpo_file_path,
this.lpo_file_name,
this.lpo_file_size,
this.lpo_file_type,
this.lpo_uploaded_at
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
// Update LPO
async update() {
const connection = await pool.getConnection();
await connection.beginTransaction();
try {
const updateQuery = `
UPDATE lpo_orders SET
lpo_number = ?,
order_date = ?,
valid_until = ?,
total_amount = ?,
currency = ?,
order_status = ?,
notes = ?,
lpo_file_path = ?,
lpo_file_name = ?,
lpo_file_size = ?,
lpo_file_type = ?,
lpo_uploaded_at = ?,
updated_at = CURRENT_TIMESTAMP
WHERE id = ?
`;
await connection.execute(updateQuery, [
this.lpo_number,
this.order_date,
this.valid_until,
this.total_amount,
this.currency,
this.order_status,
this.notes,
this.lpo_file_path,
this.lpo_file_name,
this.lpo_file_size,
this.lpo_file_type,
this.lpo_uploaded_at,
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
// Hard delete LPO (with file cleanup)
async hardDelete() {
const connection = await pool.getConnection();
await connection.beginTransaction();
try {
// Check if LPO has been used
const [usage] = await connection.execute(
'SELECT COUNT(*) as usage_count FROM lpo_usage_history WHERE lpo_line_item_id IN (SELECT id FROM lpo_line_items WHERE lpo_order_id = ?)',
[this.id]
);
if (usage[0].usage_count > 0) {
throw new Error('Cannot delete LPO that has been used in course bookings');
}
// Delete line items first
await connection.execute(
'DELETE FROM lpo_line_items WHERE lpo_order_id = ?',
[this.id]
);
// Delete notifications
await connection.execute(
'DELETE FROM lpo_notifications WHERE lpo_id = ?',
[this.id]
);
// Delete LPO
await connection.execute(
'DELETE FROM lpo_orders WHERE id = ?',
[this.id]
);
// Delete file from filesystem
if (this.lpo_file_path) {
await FileUploadUtils.deleteFile(this.lpo_file_path);
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
// Cancel LPO (soft delete)
async cancel() {
const query = `
UPDATE lpo_orders
SET order_status = 'cancelled', updated_at = CURRENT_TIMESTAMP
WHERE id = ?
`;
await pool.execute(query, [this.id]);
this.order_status = 'cancelled';
return this;
}
// Send LPO creation notification
async sendCreationNotification() {
try {
// Get complete LPO data with line items
const lpoWithItems = await LPO.findById(this.id);
if (!lpoWithItems) return false;
// Prepare recipients
const recipients = [];
// Add customer email
if (lpoWithItems.customer_email) {
recipients.push(lpoWithItems.customer_email);
}
// Add center contact email
if (lpoWithItems.center_email) {
recipients.push(lpoWithItems.center_email);
}
// Add admin email if configured
if (process.env.ADMIN_EMAIL) {
recipients.push(process.env.ADMIN_EMAIL);
}
if (recipients.length === 0) {
console.warn('No recipients found for LPO creation notification');
return false;
}
// Send email
const emailResult = await EmailService.sendLPOCreatedNotification(lpoWithItems, recipients);
// Record notification in database
await this.recordNotification('created', recipients, emailResult);
return emailResult.success;
} catch (error) {
console.error('Error sending creation notification:', error);
return false;
}
}
// Record notification in database
async recordNotification(type, recipients, emailResult) {
const insertQuery = `
INSERT INTO lpo_notifications (
lpo_id, notification_type, recipients_list, email_status,
attachment_sent, error_message
) VALUES (?, ?, ?, ?, ?, ?)
`;
await pool.execute(insertQuery, [
this.id,
type,
recipients.join(','),
emailResult.success ? 'sent' : 'failed',
emailResult.attachmentSent || false,
emailResult.error || null
]);
}
// Get expiring LPOs (15 days before expiry)
static async getExpiringLPOs() {
const query = `
SELECT
l.*,
c.name as customer_name,
c.customer_type,
c.email as customer_email,
c.phone as customer_phone,
c.company_name as customer_company_name,
c.contact_person as customer_contact_person,
ct.name as center_name,
ct.contact_email as center_email,
DATEDIFF(l.valid_until, CURDATE()) as days_to_expiry
FROM lpo_orders l
JOIN customers c ON l.customer_id = c.id
JOIN centers ct ON l.created_by_center_id = ct.id
WHERE l.is_active = 1
AND l.order_status IN ('confirmed', 'partially_used')
AND DATEDIFF(l.valid_until, CURDATE()) = 15
AND NOT EXISTS (
SELECT 1 FROM lpo_notifications ln
WHERE ln.lpo_id = l.id
AND ln.notification_type = 'expiry_15_days'
AND ln.email_status = 'sent'
AND DATE(ln.sent_date) = CURDATE()
)
ORDER BY l.valid_until ASC
`;
const [rows] = await pool.execute(query);
return rows.map(row => new LPO(row));
}
// Send expiry notification
async sendExpiryNotification(daysUntilExpiry) {
try {
// Get complete LPO data with line items
const lpoWithItems = await LPO.findById(this.id);
if (!lpoWithItems) return false;
// Prepare recipients
const recipients = [];
// Add customer email
if (lpoWithItems.customer_email) {
recipients.push(lpoWithItems.customer_email);
}
// Add center contact email
if (lpoWithItems.center_email) {
recipients.push(lpoWithItems.center_email);
}
// Add admin email if configured
if (process.env.ADMIN_EMAIL) {
recipients.push(process.env.ADMIN_EMAIL);
}
if (recipients.length === 0) {
console.warn('No recipients found for LPO expiry notification');
return false;
}
// Send email
const emailResult = await EmailService.sendLPOExpiryNotification(lpoWithItems, recipients, daysUntilExpiry);
// Record notification in database
await this.recordNotification('expiry_15_days', recipients, emailResult);
return emailResult.success;
} catch (error) {
console.error('Error sending expiry notification:', error);
return false;
}
}
// Add line item to LPO
static async addLineItem(lpoId, lineItemData) {
const connection = await pool.getConnection();
await connection.beginTransaction();
try {
const insertQuery = `
INSERT INTO lpo_line_items (
lpo_order_id, category_id, level_id, quantity_ordered,
quantity_remaining, unit_price, line_total, currency
) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`;
const lineTotal = lineItemData.quantity_ordered * lineItemData.unit_price;
await connection.execute(insertQuery, [
lpoId,
lineItemData.category_id,
lineItemData.level_id,
lineItemData.quantity_ordered,
lineItemData.quantity_ordered, // Initially remaining = ordered
lineItemData.unit_price,
lineTotal,
lineItemData.currency
]);
// Update LPO total amount
await connection.execute(
'UPDATE lpo_orders SET total_amount = total_amount + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
[lineTotal, lpoId]
);
await connection.commit();
return true;
} catch (error) {
await connection.rollback();
throw error;
} finally {
connection.release();
}
}
// Remove line item from LPO
static async removeLineItem(lineItemId) {
const connection = await pool.getConnection();
await connection.beginTransaction();
try {
// Get line item details
const [lineItem] = await connection.execute(
'SELECT lpo_order_id, line_total FROM lpo_line_items WHERE id = ?',
[lineItemId]
);
if (lineItem.length === 0) {
throw new Error('Line item not found');
}
const { lpo_order_id, line_total } = lineItem[0];
// Delete line item
await connection.execute(
'DELETE FROM lpo_line_items WHERE id = ?',
[lineItemId]
);
// Update LPO total amount
await connection.execute(
'UPDATE lpo_orders SET total_amount = total_amount - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
[line_total, lpo_order_id]
);
await connection.commit();
return true;
} catch (error) {
await connection.rollback();
throw error;
} finally {
connection.release();
}
}
// Use LPO quantity (for course booking)
static async useQuantity(lineItemId, quantityToUse) {
const connection = await pool.getConnection();
await connection.beginTransaction();
try {
// Check available quantity
const [lineItem] = await connection.execute(
'SELECT quantity_remaining FROM lpo_line_items WHERE id = ?',
[lineItemId]
);
if (lineItem.length === 0) {
throw new Error('LPO line item not found');
}
const { quantity_remaining } = lineItem[0];
if (quantity_remaining < quantityToUse) {
throw new Error('Insufficient quantity remaining in LPO');
}
// Update quantities
await connection.execute(
'UPDATE lpo_line_items SET quantity_remaining = quantity_remaining - ?, quantity_used = quantity_used + ? WHERE id = ?',
[quantityToUse, quantityToUse, lineItemId]
);
await connection.commit();
return true;
} catch (error) {
await connection.rollback();
throw error;
} finally {
connection.release();
}
}
// Credit back quantity (after course completion)
static async creditBackQuantity(lineItemId, quantityToCreditBack) {
const connection = await pool.getConnection();
await connection.beginTransaction();
try {
// Update quantities
await connection.execute(
'UPDATE lpo_line_items SET quantity_remaining = quantity_remaining + ?, quantity_used = quantity_used - ? WHERE id = ?',
[quantityToCreditBack, quantityToCreditBack, lineItemId]
);
await connection.commit();
return true;
} catch (error) {
await connection.rollback();
throw error;
} finally {
connection.release();
}
}
// Record usage history
static async recordUsage(lineItemId, usageData) {
const insertQuery = `
INSERT INTO lpo_usage_history (
lpo_line_item_id, course_booking_id, quantity_booked,
quantity_attended, quantity_passed, quantity_failed,
quantity_no_show, quantity_credited_back, completion_date,
booking_reference, notes
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;
await pool.execute(insertQuery, [
lineItemId,
usageData.course_booking_id || 0,
usageData.quantity_booked,
usageData.quantity_attended || 0,
usageData.quantity_passed || 0,
usageData.quantity_failed || 0,
usageData.quantity_no_show || 0,
usageData.quantity_credited_back || 0,
usageData.completion_date || null,
usageData.booking_reference || null,
usageData.notes || null
]);
}
// Get available LPO line items for course booking
static async getAvailableLineItems(customerId, categoryId, levelId) {
const query = `
SELECT
li.*,
l.lpo_number,
l.valid_until,
cc.name as category_name,
ccl.level_name,
ccl.level_number
FROM lpo_line_items li
JOIN lpo_orders l ON li.lpo_order_id = l.id
JOIN course_categories cc ON li.category_id = cc.id
JOIN course_category_levels ccl ON li.level_id = ccl.id
WHERE l.customer_id = ?
AND li.category_id = ?
AND li.level_id = ?
AND li.quantity_remaining > 0
AND l.order_status IN ('confirmed', 'partially_used')
AND l.valid_until >= CURDATE()
AND l.is_active = 1
ORDER BY l.order_date ASC
`;
const [rows] = await pool.execute(query, [customerId, categoryId, levelId]);
return rows;
}
// Get course pricing
static async getCoursePricing(categoryId, levelId) {
const query = `
SELECT unit_price, currency
FROM course_pricing
WHERE category_id = ? AND level_id = ? AND is_active = 1
`;
const [rows] = await pool.execute(query, [categoryId, levelId]);
return rows.length > 0 ? rows[0] : null;
}
// Search LPOs
static async search(searchTerm, centerContext = null, filters = {}) {
// Only main branch can search LPOs
if (centerContext && centerContext.type !== 'main') {
return [];
}
let query = `
SELECT
l.*,
c.name as customer_name,
c.customer_type,
c.email as customer_email,
c.company_name as customer_company_name,
c.contact_person as customer_contact_person,
ct.name as center_name,
COUNT(li.id) as total_items,
SUM(li.quantity_remaining) as remaining_quantity
FROM lpo_orders l
JOIN customers c ON l.customer_id = c.id
JOIN centers ct ON l.created_by_center_id = ct.id
LEFT JOIN lpo_line_items li ON l.id = li.lpo_order_id
WHERE l.is_active = 1
`;
let params = [];
// Apply search term
if (searchTerm && searchTerm.trim()) {
query += ` AND (
l.lpo_number LIKE ? OR
c.name LIKE ? OR
c.company_name LIKE ? OR
c.contact_person LIKE ?
)`;
const searchPattern = `%${searchTerm.trim()}%`;
params.push(searchPattern, searchPattern, searchPattern, searchPattern);
}
// Apply filters
if (filters.lpo_type) {
query += ` AND l.lpo_type = ?`;
params.push(filters.lpo_type);
}
if (filters.order_status) {
query += ` AND l.order_status = ?`;
params.push(filters.order_status);
}
if (filters.customer_type) {
query += ` AND c.customer_type = ?`;
params.push(filters.customer_type);
}
query += ` GROUP BY l.id ORDER BY l.created_at DESC`;
// Apply pagination
if (filters.limit) {
query += ` LIMIT ?`;
params.push(parseInt(filters.limit));
if (filters.offset) {
query += ` OFFSET ?`;
params.push(parseInt(filters.offset));
}
}
const [rows] = await pool.execute(query, params);
return rows.map(row => new LPO(row));
}
// Update LPO status based on usage
static async updateLPOStatus(lpoId) {
const connection = await pool.getConnection();
await connection.beginTransaction();
try {
// Get line items summary
const [summary] = await connection.execute(
'SELECT SUM(quantity_ordered) as total_ordered, SUM(quantity_remaining) as total_remaining FROM lpo_line_items WHERE lpo_order_id = ?',
[lpoId]
);
const { total_ordered, total_remaining } = summary[0];
let newStatus;
if (total_remaining === 0) {
newStatus = 'fully_used';
} else if (total_remaining < total_ordered) {
newStatus = 'partially_used';
} else {
newStatus = 'confirmed';
}
await connection.execute(
'UPDATE lpo_orders SET order_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
[newStatus, lpoId]
);
await connection.commit();
return newStatus;
} catch (error) {
await connection.rollback();
throw error;
} finally {
connection.release();
}
}
// Test database connection
static async testConnection() {
try {
await pool.execute('SELECT 1');
return true;
} catch (error) {
console.error('LPO database connection test failed:', error);
return false;
}
}
}