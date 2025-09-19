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
export class Inventory {
 constructor(data = {}) {
 this.id = data?.id;
 this.item_type = data?.item_type;
 this.category_id = data?.category_id;
 this.level_id = data?.level_id;
 this.item_name = data?.item_name;
 this.current_stock = data?.current_stock || 0;
 this.minimum_threshold = data?.minimum_threshold || 10;
 this.is_active = data?.is_active ?? true;
 this.created_at = data?.created_at;
 this.updated_at = data?.updated_at;

 // Additional fields from joins
 this.category_name = data?.category_name;
 this.level_name = data?.level_name;
 this.is_low_stock = data?.is_low_stock || false;
 }
 // Get all inventory items
 static async findAll(filters = {}) {
 let query = `
 SELECT
 ii.*,
 cc.name as category_name,
 ccl.level_name,
 CASE WHEN ii.current_stock <= ii.minimum_threshold THEN 1 ELSE 0 END as is_low_stock
 FROM inventory_items ii
 LEFT JOIN course_categories cc ON ii.category_id = cc.id
 LEFT JOIN course_category_levels ccl ON ii.level_id = ccl.id
 WHERE ii.is_active = 1
 `;

 let params = [];

 // Apply filters
 if (filters.item_type){
 query += ` AND ii.item_type = ?`;
 params.push(filters.item_type);
 }

 if (filters.category_id) {
 query += ` AND ii.category_id = ?`;
 params.push(filters.category_id);
 }

 if (filters.low_stock_only) {
 query += ` AND ii.current_stock <= ii.minimum_threshold`;
 }

 query += ` ORDER BY cc.name, ccl.level_number, ii.item_type`;

 const [rows] = await pool.execute(query, params);
 return rows.map(row => new Inventory(row));
 }
 // Get single inventory item by ID
 static async findById(id) {
 const query = `
 SELECT
 ii.*,
 cc.name as category_name,
 ccl.level_name,
 CASE WHEN ii.current_stock <= ii.minimum_threshold THEN 1 ELSE 0 END as is_low_stock
 FROM inventory_items ii
 LEFT JOIN course_categories cc ON ii.category_id = cc.id
 LEFT JOIN course_category_levels ccl ON ii.level_id = ccl.id
 WHERE ii.id = ? AND ii.is_active = 1
 `;

 const [rows] = await pool.execute(query, [id]);
 if (rows.length === 0) return null;

 return new Inventory(rows[0]);
 }
 // Add stock manually
 static async addStock(itemId, quantity, userId, notes = null) {
 const connection = await pool.getConnection();
 await connection.beginTransaction();
 try {
 // Get current stock
 const [itemRows] = await connection.execute(
 'SELECT current_stock FROM inventory_items WHERE id = ? AND is_active = 1',
 [itemId]
 );
 if (itemRows.length === 0) {
 throw new Error('Inventory item not found');
 }
 const currentStock = itemRows[0].current_stock;
 const newStock = currentStock + quantity;
 // Update stock
 await connection.execute(
 'UPDATE inventory_items SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
 [newStock, itemId]
 );
 // Log transaction
 await connection.execute(
 `INSERT INTO inventory_transactions (
 inventory_item_id, transaction_type, quantity,
 previous_stock, new_stock, reference_type,
 notes, created_by_user
 ) VALUES (?, 'add', ?, ?, ?, 'manual', ?, ?)`,
 [itemId, quantity, currentStock, newStock, notes, userId]
 );
 await connection.commit();

 return {
 success: true,
 previous_stock: currentStock,
 new_stock: newStock,
 message: `Successfully added ${quantity} items to stock`
 };
 } catch (error) {
 await connection.rollback();
 throw error;
 } finally {
 connection.release();
 }
 }
 // Update stock directly (for corrections)
 static async updateStock(itemId, newStock, userId, notes = null) {
 const connection = await pool.getConnection();
 await connection.beginTransaction();
 try {
 // Get current stock
 const [itemRows] = await connection.execute(
 'SELECT current_stock FROM inventory_items WHERE id = ? AND is_active = 1',
 [itemId]
 );
 if (itemRows.length === 0) {
 throw new Error('Inventory item not found');
 }
 const currentStock = itemRows[0].current_stock;
 const difference = newStock - currentStock;
 if (difference === 0) {
 return {
 success: true,
 message: 'No change in stock quantity'
 };
 }
 // Update stock
 await connection.execute(
 'UPDATE inventory_items SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
 [newStock, itemId]
 );
 // Log transaction
 const transactionType = difference > 0 ? 'add' : 'deduct';
 await connection.execute(
 `INSERT INTO inventory_transactions (
 inventory_item_id, transaction_type, quantity,
 previous_stock, new_stock, reference_type,
 notes, created_by_user
 ) VALUES (?, ?, ?, ?, ?, 'manual', ?, ?)`,
 [itemId, transactionType, Math.abs(difference), currentStock, newStock, notes, userId]
 );
 await connection.commit();

 return {
 success: true,
 previous_stock: currentStock,
 new_stock: newStock,
 difference: difference,
 message: `Stock updated from ${currentStock} to ${newStock}`
 };
 } catch (error) {
 await connection.rollback();
 throw error;
 } finally {
 connection.release();
 }
 }
 // Get stock transactions
 static async getTransactions(itemId = null, limit = 50) {
 let query = `
 SELECT
 it.*,
 ii.item_name,
 ii.item_type,
 cc.name as category_name,
 ccl.level_name
 FROM inventory_transactions it
 LEFT JOIN inventory_items ii ON it.inventory_item_id = ii.id
 LEFT JOIN course_categories cc ON ii.category_id = cc.id
 LEFT JOIN course_category_levels ccl ON ii.level_id = ccl.id
 WHERE 1=1
 `;

 let params = [];

 if (itemId) {
 query += ` AND it.inventory_item_id = ?`;
 params.push(itemId);
 }

 query += ` ORDER BY it.created_at DESC LIMIT ?`;
 params.push(limit);

 const [rows] = await pool.execute(query, params);
 return rows;
 }
 // Get low stock items
 static async getLowStockItems() {
 const query = `
 SELECT
 ii.*,
 cc.name as category_name,
 ccl.level_name,
 1 as is_low_stock
 FROM inventory_items ii
 LEFT JOIN course_categories cc ON ii.category_id = cc.id
 LEFT JOIN course_category_levels ccl ON ii.level_id = ccl.id
 WHERE ii.is_active = 1
 AND ii.current_stock <= ii.minimum_threshold
 ORDER BY ii.current_stock ASC, cc.name, ccl.level_number
 `;

 const [rows] = await pool.execute(query);
 return rows.map(row => new Inventory(row));
 }
 // Get inventory summary
 static async getSummary() {
 const query = `
 SELECT
 item_type,
 COUNT(*) as total_items,
 SUM(current_stock) as total_stock,
 SUM(CASE WHEN current_stock <= minimum_threshold THEN 1 ELSE 0 END) as low_stock_items
 FROM inventory_items
 WHERE is_active = 1
 GROUP BY item_type
 `;

 const [rows] = await pool.execute(query);
 return rows;
 }
 // Initialize inventory items for new course categories/levels
 static async initializeNewItems() {
 try {
 // Add missing card items
 await pool.execute(`
 INSERT IGNORE INTO inventory_items (item_type, category_id, level_id, item_name, current_stock,
minimum_threshold)
 SELECT
 'card' as item_type,
 cc.id as category_id,
 ccl.id as level_id,
 CONCAT(cc.name, ' - ', ccl.level_name, ' Card') as item_name,
 0 as current_stock,
 10 as minimum_threshold
 FROM course_categories cc
 JOIN course_category_levels ccl ON cc.id = ccl.category_id
 WHERE cc.is_active = 1 AND ccl.is_active = 1
 `);
 // Add missing certificate items
 await pool.execute(`
 INSERT IGNORE INTO inventory_items (item_type, category_id, level_id, item_name, current_stock,
minimum_threshold)
 SELECT
 'certificate' as item_type,
 cc.id as category_id,
 ccl.id as level_id,
 CONCAT(cc.name, ' - ', ccl.level_name, ' Certificate') as item_name,
 0 as current_stock,
 10 as minimum_threshold
 FROM course_categories cc
 JOIN course_category_levels ccl ON cc.id = ccl.category_id
 WHERE cc.is_active = 1 AND ccl.is_active = 1
 `);
 return { success: true, message: 'Inventory items initialized' };
 } catch (error) {
 console.error('Error initializing inventory items:', error);
 throw error;
 }
 }
 // Test database connection
 static async testConnection() {
 try {
 await pool.execute('SELECT 1');
 return true;
 } catch (error) {
 console.error('Inventory database connection test failed:', error);
 return false;
 }
 }
}
