import { LPOService } from '../services/LPOService.js';
import { FileUploadUtils } from '../utils/fileUpload.js';
import path from 'path';
import fs from 'fs/promises';
export class LPOController {
// GET /api/lpo
static async getAllLPOs(req, res) {
try {
const centerContext = req.centerContext || { id: 1, type: 'main' };
const filters = {
lpo_type: req.query.lpo_type,
order_status: req.query.order_status,
customer_type: req.query.customer_type,
limit: req.query.limit,
offset: req.query.offset
};
const result = await LPOService.getAllLPOs(centerContext, filters);
if (!result.success) {
return res.status(403).json(result);
}
res.status(200).json(result);
} catch (error) {
console.error('Error getting LPOs:', error);
res.status(500).json({
success: false,
message: error.message
});
}
}
// GET /api/lpo/:id
static async getLPOById(req, res) {
try {
const { id } = req.params;
if (!id || isNaN(id)) {
return res.status(400).json({
success: false,
message: 'Valid LPO ID is required'
});
}
const centerContext = req.centerContext || { id: 1, type: 'main' };
const result = await LPOService.getLPOById(id, centerContext);
if (!result.success) {
return res.status(result.message.includes('only available') ? 403 : 404).json(result);
}
res.status(200).json(result);
} catch (error) {
console.error('Error getting LPO by ID:', error);
res.status(500).json({
success: false,
message: error.message
});
}
}
// POST /api/lpo (with file upload)
static async createLPO(req, res) {
try {
// Parse JSON data from multipart form
let lpoData, lineItems;
try {
lpoData = req.body.lpo ? JSON.parse(req.body.lpo) : req.body;
lineItems = req.body.line_items ? JSON.parse(req.body.line_items) : [];
} catch (parseError) {
return res.status(400).json({
success: false,
message: 'Invalid JSON data in request body'
});
}
if (!lpoData || !lineItems) {
return res.status(400).json({
success: false,
message: 'LPO data and line items are required'
});
}
const centerContext = req.centerContext || { id: 1, type: 'main' };
const fileInfo = req.file; // From multer middleware
const result = await LPOService.createLPO(lpoData, lineItems, fileInfo, centerContext);
if (!result.success) {
return res.status(result.message.includes('only available') ? 403 : 400).json(result);
}
res.status(201).json(result);
} catch (error) {
console.error('Error creating LPO:', error);
res.status(500).json({
success: false,
message: error.message
});
}
}
// PUT /api/lpo/:id (with optional file upload)
static async updateLPO(req, res) {
try {
const { id } = req.params;
if (!id || isNaN(id)) {
return res.status(400).json({
success: false,
message: 'Valid LPO ID is required'
});
}
// Parse JSON data from multipart form
let lpoData;
try {
lpoData = req.body.lpo ? JSON.parse(req.body.lpo) : req.body;
} catch (parseError) {
return res.status(400).json({
success: false,
message: 'Invalid JSON data in request body'
});
}
if (!lpoData) {
return res.status(400).json({
success: false,
message: 'LPO data is required'
});
}
const centerContext = req.centerContext || { id: 1, type: 'main' };
const fileInfo = req.file; // From multer middleware (optional)
const result = await LPOService.updateLPO(id, lpoData, fileInfo, centerContext);
if (!result.success) {
return res.status(result.message.includes('only available') ? 403 : 400).json(result);
}
res.status(200).json(result);
} catch (error) {
console.error('Error updating LPO:', error);
res.status(500).json({
success: false,
message: error.message
});
}
}
// DELETE /api/lpo/:id (Hard delete)
static async deleteLPO(req, res) {
try {
const { id } = req.params;
if (!id || isNaN(id)) {
return res.status(400).json({
success: false,
message: 'Valid LPO ID is required'
});
}
const centerContext = req.centerContext || { id: 1, type: 'main' };
const result = await LPOService.deleteLPO(id, centerContext);
if (!result.success) {
return res.status(result.message.includes('only available') ? 403 : 400).json(result);
}
res.status(200).json(result);
} catch (error) {
console.error('Error deleting LPO:', error);
res.status(500).json({
success: false,
message: error.message
});
}
}
// PUT /api/lpo/:id/cancel (Cancel LPO)
static async cancelLPO(req, res) {
try {
const { id } = req.params;
if (!id || isNaN(id)) {
return res.status(400).json({
success: false,
message: 'Valid LPO ID is required'
});
}
const centerContext = req.centerContext || { id: 1, type: 'main' };
const result = await LPOService.cancelLPO(id, centerContext);
if (!result.success) {
return res.status(result.message.includes('only available') ? 403 : 400).json(result);
}
res.status(200).json(result);
} catch (error) {
console.error('Error cancelling LPO:', error);
res.status(500).json({
success: false,
message: error.message
});
}
}
// GET /api/lpo/:id/download (Download LPO file)
static async downloadLPOFile(req, res) {
try {
const { id } = req.params;
if (!id || isNaN(id)) {
return res.status(400).json({
success: false,
message: 'Valid LPO ID is required'
});
}
const centerContext = req.centerContext || { id: 1, type: 'main' };
const result = await LPOService.downloadLPOFile(id, centerContext);
if (!result.success) {
return res.status(result.message.includes('only available') ? 403 : 404).json(result);
}
const { file_path, file_name, file_type } = result.data;
// Set appropriate headers
res.setHeader('Content-Disposition', `attachment; filename="${file_name}"`);
res.setHeader('Content-Type', file_type || 'application/octet-stream');
// Stream the file
const fileStream = fs.createReadStream(file_path);
fileStream.pipe(res);
fileStream.on('error', (error) => {
console.error('File streaming error:', error);
if (!res.headersSent) {
res.status(500).json({
success: false,
message: 'Error downloading file'
});
}
});
} catch (error) {
console.error('Error downloading LPO file:', error);
if (!res.headersSent) {
res.status(500).json({
success: false,
message: error.message
});
}
}
}
// GET /api/lpo/search
static async searchLPOs(req, res) {
try {
const { q: searchTerm } = req.query;
if (!searchTerm || searchTerm.trim().length === 0) {
return res.status(400).json({
success: false,
message: 'Search term is required'
});
}
const centerContext = req.centerContext || { id: 1, type: 'main' };
const filters = {
lpo_type: req.query.lpo_type,
order_status: req.query.order_status,
customer_type: req.query.customer_type,
limit: req.query.limit || 50,
offset: req.query.offset || 0
};
const result = await LPOService.searchLPOs(searchTerm, centerContext, filters);
if (!result.success) {
return res.status(403).json(result);
}
res.status(200).json(result);
} catch (error) {
console.error('Error searching LPOs:', error);
res.status(500).json({
success: false,
message: error.message
});
}
}
// GET /api/lpo/available-line-items
static async getAvailableLineItems(req, res) {
try {
const { customer_id, category_id, level_id } = req.query;
if (!customer_id || !category_id || !level_id) {
return res.status(400).json({
success: false,
message: 'Customer ID, Category ID, and Level ID are required'
});
}
const centerContext = req.centerContext || { id: 1, type: 'main' };
const result = await LPOService.getAvailableLineItems(
customer_id,
category_id,
level_id,
centerContext
);
if (!result.success) {
return res.status(403).json(result);
}
res.status(200).json(result);
} catch (error) {
console.error('Error getting available line items:', error);
res.status(500).json({
success: false,
message: error.message
});
}
}
// POST /api/lpo/use-quantity
static async useQuantity(req, res) {
try {
const { line_item_id, quantity_to_use, booking_reference } = req.body;
if (!line_item_id || !quantity_to_use) {
return res.status(400).json({
success: false,
message: 'Line item ID and quantity to use are required'
});
}
const centerContext = req.centerContext || { id: 1, type: 'main' };
const result = await LPOService.useQuantity(
line_item_id,
quantity_to_use,
booking_reference,
centerContext
);
if (!result.success) {
return res.status(result.message.includes('only available') ? 403 : 400).json(result);
}
res.status(200).json(result);
} catch (error) {
console.error('Error using LPO quantity:', error);
res.status(500).json({
success: false,
message: error.message
});
}
}
// POST /api/lpo/process-completion
static async processCourseCompletion(req, res) {
try {
const { line_item_id, completion_data } = req.body;
if (!line_item_id || !completion_data) {
return res.status(400).json({
success: false,
message: 'Line item ID and completion data are required'
});
}
const centerContext = req.centerContext || { id: 1, type: 'main' };
const result = await LPOService.processCourseCompletion(
line_item_id,
completion_data,
centerContext
);
if (!result.success) {
return res.status(result.message.includes('only available') ? 403 : 400).json(result);
}
res.status(200).json(result);
} catch (error) {
console.error('Error processing course completion:', error);
res.status(500).json({
success: false,
message: error.message
});
}
}
// GET /api/lpo/check-expiring
static async checkExpiringLPOs(req, res) {
try {
const result = await LPOService.checkExpiringLPOs();
res.status(200).json(result);
} catch (error) {
console.error('Error checking expiring LPOs:', error);
res.status(500).json({
success: false,
message: error.message
});
}
}
// GET /api/lpo/pricing/:category_id/:level_id
static async getCoursePricing(req, res) {
try {
const { category_id, level_id } = req.params;
if (!category_id || !level_id) {
return res.status(400).json({
success: false,
message: 'Category ID and Level ID are required'
});
}
const result = await LPOService.getCoursePricing(category_id, level_id);
if (!result.success) {
return res.status(404).json(result);
}
res.status(200).json(result);
} catch (error) {
console.error('Error getting course pricing:', error);
res.status(500).json({
success: false,
message: error.message
});
}
}
}