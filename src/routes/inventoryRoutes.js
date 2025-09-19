import express from 'express';
import { InventoryController } from '../controllers/InventoryController.js';
const router = express.Router();
// Core inventory routes
router.get('/', InventoryController.getAllInventoryItems);
router.get('/search', InventoryController.searchInventoryItems);
router.get('/dashboard', InventoryController.getInventoryDashboard);
router.get('/low-stock', InventoryController.getLowStockItems);
router.get('/transactions', InventoryController.getTransactions);
router.get('/:id', InventoryController.getInventoryItemById);
// Stock management routes
router.post('/:id/add-stock', InventoryController.addStock);
router.put('/:id/update-stock', InventoryController.updateStock);
// System routes
router.post('/initialize', InventoryController.initializeInventoryItems);
export default router;
