import { InventoryService } from '../services/InventoryService.js';
export class InventoryController {
 // GET /api/inventory
 static async getAllInventoryItems(req, res) {
 try {
 const filters = {
 item_type: req.query.item_type,
 category_id: req.query.category_id,
 low_stock_only: req.query.low_stock_only === 'true'
 };
 const result = await InventoryService.getAllInventoryItems(filters);
 res.status(200).json(result);
 } catch (error) {
 console.error('Error getting inventory items:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // GET /api/inventory/:id
 static async getInventoryItemById(req, res) {
 try {
 const { id } = req.params;

 if (!id || isNaN(id)) {
 return res.status(400).json({
 success: false,
 message: 'Valid inventory item ID is required'
 });
 }
 const result = await InventoryService.getInventoryItemById(id);

 if (!result.success) {
 return res.status(404).json(result);
 }
 res.status(200).json(result);
 } catch (error) {
 console.error('Error getting inventory item by ID:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // POST /api/inventory/:id/add-stock
 static async addStock(req, res) {
 try {
 const { id } = req.params;
 const { quantity, notes } = req.body;

 if (!id || isNaN(id)) {
 return res.status(400).json({
 success: false,
 message: 'Valid inventory item ID is required'
 });
 }
 if (!quantity || quantity <= 0) {
 return res.status(400).json({
 success: false,
 message: 'Valid positive quantity is required'
 });
 }
 const userId = req.userName || 'admin';
 const result = await InventoryService.addStock(id, quantity, userId, notes);

 if (!result.success) {
 return res.status(400).json(result);
 }
 res.status(200).json(result);
 } catch (error) {
 console.error('Error adding stock:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // PUT /api/inventory/:id/update-stock
 static async updateStock(req, res) {
 try {
 const { id } = req.params;
 const { new_stock, notes } = req.body;

 if (!id || isNaN(id)) {
 return res.status(400).json({
 success: false,
 message: 'Valid inventory item ID is required'
 });
 }
 if (new_stock < 0 || isNaN(new_stock)) {
 return res.status(400).json({
 success: false,
 message: 'Valid non-negative stock quantity is required'
 });
 }
 const userId = req.userName || 'admin';
 const result = await InventoryService.updateStock(id, parseInt(new_stock), userId, notes);

 if (!result.success) {
 return res.status(400).json(result);
 }
 res.status(200).json(result);
 } catch (error) {
 console.error('Error updating stock:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // GET /api/inventory/transactions
 static async getTransactions(req, res) {
 try {
 const itemId = req.query.item_id || null;
 const limit = parseInt(req.query.limit) || 50;
 const result = await InventoryService.getTransactions(itemId, limit);
 res.status(200).json(result);
 } catch (error) {
 console.error('Error getting transactions:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // GET /api/inventory/low-stock
 static async getLowStockItems(req, res) {
 try {
 const result = await InventoryService.getLowStockItems();
 res.status(200).json(result);
 } catch (error) {
 console.error('Error getting low stock items:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // GET /api/inventory/dashboard
 static async getInventoryDashboard(req, res) {
 try {
 const result = await InventoryService.getInventoryDashboard();
 res.status(200).json(result);
 } catch (error) {
 console.error('Error getting inventory dashboard:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // POST /api/inventory/initialize
 static async initializeInventoryItems(req, res) {
 try {
 const result = await InventoryService.initializeInventoryItems();
 res.status(200).json(result);
 } catch (error) {
 console.error('Error initializing inventory items:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
 // GET /api/inventory/search
 static async searchInventoryItems(req, res) {
 try {
 const { q: searchTerm } = req.query;

 const filters = {
 item_type: req.query.item_type,
 category_id: req.query.category_id,
 low_stock_only: req.query.low_stock_only === 'true'
 };
 const result = await InventoryService.searchInventoryItems(searchTerm, filters);
 res.status(200).json(result);
 } catch (error) {
 console.error('Error searching inventory items:', error);
 res.status(500).json({
 success: false,
 message: error.message
 });
 }
 }
}
