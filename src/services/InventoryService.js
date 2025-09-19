import { Inventory } from '../models/Inventory.js';
export class InventoryService {
 // Get all inventory items with filters
 static async getAllInventoryItems(filters = {}) {
 try {
 const items = await Inventory.findAll(filters);

 return {
 success: true,
 data: items,
 message: 'Inventory items retrieved successfully',
 count: items.length
 };
 } catch (error) {
 throw new Error(`Failed to get inventory items: ${error.message}`);
 }
 }
 // Get single inventory item
 static async getInventoryItemById(id) {
 try {
 const item = await Inventory.findById(id);

 if (!item) {
 return {
 success: false,
 message: 'Inventory item not found'
 };
 }
 return {
 success: true,
 data: item,
 message: 'Inventory item retrieved successfully'
 };
 } catch (error) {
 throw new Error(`Failed to get inventory item: ${error.message}`);
 }
 }
 // Add stock to inventory item
 static async addStock(itemId, quantity, userId, notes = null) {
 try {
 if (!itemId || !quantity || quantity <= 0) {
 return {
 success: false,
 message: 'Valid item ID and positive quantity are required'
 };
 }
 const result = await Inventory.addStock(itemId, quantity, userId, notes);
 return {
 success: true,
 data: result,
 message: result.message
 };
 } catch (error) {
 throw new Error(`Failed to add stock: ${error.message}`);
 }
 }
 // Update stock quantity directly
 static async updateStock(itemId, newStock, userId, notes = null) {
 try {
 if (!itemId || newStock < 0) {
 return {
 success: false,
 message: 'Valid item ID and non-negative stock quantity are required'
 };
 }
 const result = await Inventory.updateStock(itemId, newStock, userId, notes);
 return {
 success: true,
 data: result,
 message: result.message
 };
 } catch (error) {
 throw new Error(`Failed to update stock: ${error.message}`);
 }
 }
 // Get stock transactions
 static async getTransactions(itemId = null, limit = 50) {
 try {
 const transactions = await Inventory.getTransactions(itemId, limit);

 return {
 success: true,
 data: transactions,
 message: 'Transactions retrieved successfully',
 count: transactions.length
 };
 } catch (error) {
 throw new Error(`Failed to get transactions: ${error.message}`);
 }
 }
 // Get low stock items
 static async getLowStockItems() {
 try {
 const lowStockItems = await Inventory.getLowStockItems();

 return {
 success: true,
 data: lowStockItems,
 message: 'Low stock items retrieved successfully',
 count: lowStockItems.length
 };
 } catch (error) {
 throw new Error(`Failed to get low stock items: ${error.message}`);
 }
 }
 // Get inventory summary/dashboard
 static async getInventoryDashboard() {
 try {
 const summary = await Inventory.getSummary();
 const lowStockItems = await Inventory.getLowStockItems();
 const recentTransactions = await Inventory.getTransactions(null, 20);
 return {
 success: true,
 data: {
 summary,
 lowStockItems,
 recentTransactions: recentTransactions.slice(0, 10) // Top 10 recent
 },
 message: 'Inventory dashboard data retrieved successfully'
 };
 } catch (error) {
 throw new Error(`Failed to get inventory dashboard: ${error.message}`);
 }
 }
 // Initialize inventory items
 static async initializeInventoryItems() {
 try {
 const result = await Inventory.initializeNewItems();
 return {
 success: true,
 data: result,
 message: 'Inventory items initialized successfully'
 };
 } catch (error) {
 throw new Error(`Failed to initialize inventory items: ${error.message}`);
 }
 }
 // Search inventory items
 static async searchInventoryItems(searchTerm, filters = {}) {
 try {
 // Add search functionality to existing findAll method
 if (searchTerm && searchTerm.trim()) {
 filters.search = searchTerm.trim();
 }
 const items = await Inventory.findAll(filters);

 // Filter by search term if provided
 const filteredItems = searchTerm
 ? items.filter(item =>
 item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
 item.category_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
 item.level_name?.toLowerCase().includes(searchTerm.toLowerCase())
 )
 : items;

 return {
 success: true,
 data: filteredItems,
 message: 'Inventory search completed successfully',
 count: filteredItems.length,
 search_term: searchTerm
 };
 } catch (error) {
 throw new Error(`Inventory search failed: ${error.message}`);
 }
 }
}