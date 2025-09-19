import { LPO } from '../models/LPO.js';
import { FileUploadUtils } from '../utils/fileUpload.js';
export class LPOService {
// Get all LPOs (Main branch only)
static async getAllLPOs(centerContext = null, filters = {}) {
try {
// Only main branch can access LPOs
if (centerContext && centerContext.type !== 'main') {
return {
success: false,
message: 'LPO system is only available for Main Branch centers'
};
}
const lpos = await LPO.findAll(centerContext);
return {
success: true,
data: lpos,
message: 'LPOs retrieved successfully',
count: lpos.length
};
} catch (error) {
throw new Error(`Failed to get LPOs: ${error.message}`);
}
}
// Get single LPO with line items
static async getLPOById(id, centerContext = null) {
try {
// Only main branch can access LPOs
if (centerContext && centerContext.type !== 'main') {
return {
success: false,
message: 'LPO system is only available for Main Branch centers'
};
}
const lpo = await LPO.findById(id, centerContext);
if (!lpo) {
return {
success: false,
message: 'LPO not found'
};
}
return {
success: true,
data: lpo,
message: 'LPO retrieved successfully'
};
} catch (error) {
throw new Error(`Failed to get LPO: ${error.message}`);
}
}
// Create LPO with file upload
static async createLPO(lpoData, lineItems, fileInfo, centerContext) {
try {
// Only main branch can create LPOs
if (centerContext.type !== 'main') {
return {
success: false,
message: 'LPO system is only available for Main Branch centers'
};
}
// Validate LPO data
const validation = this.validateLPOData(lpoData, lineItems);
if (!validation.isValid) {
return {
success: false,
message: validation.message
};
}
// Check if LPO number already exists
const lpoNumberExists = await LPO.lpoNumberExists(lpoData.lpo_number);
if (lpoNumberExists) {
return {
success: false,
message: 'LPO number already exists. Please use a unique LPO number.'
};
}
// Validate uploaded file if provided
if (fileInfo) {
const fileValidation = this.validateUploadedFile(fileInfo);
if (!fileValidation.isValid) {
return {
success: false,
message: fileValidation.message
};
}
}
// Set center context
lpoData.created_by_center_id = centerContext.id;
// Set file information if uploaded
if (fileInfo) {
lpoData.lpo_file_path = fileInfo.path;
lpoData.lpo_file_name = fileInfo.originalname;
lpoData.lpo_file_size = fileInfo.size;
lpoData.lpo_file_type = fileInfo.mimetype;
lpoData.lpo_uploaded_at = new Date();
}
// Create LPO
const lpo = new LPO(lpoData);
await lpo.save();
// Add line items
let totalAmount = 0;
for (const lineItem of lineItems) {
// Get pricing if not provided
if (!lineItem.unit_price) {
const pricing = await LPO.getCoursePricing(lineItem.category_id, lineItem.level_id);
if (!pricing) {
return {
success: false,
message: `Pricing not found for category ${lineItem.category_id} level ${lineItem.level_id}`
};
}
lineItem.unit_price = pricing.unit_price;
lineItem.currency = pricing.currency;
}
await LPO.addLineItem(lpo.id, lineItem);
totalAmount += lineItem.quantity_ordered * lineItem.unit_price;
}
// Update total amount and confirm LPO
lpo.total_amount = totalAmount;
lpo.order_status = 'confirmed';
await lpo.update();
// Send creation notification email
await lpo.sendCreationNotification();
// Get complete LPO data
const result = await this.getLPOById(lpo.id, centerContext);
return {
success: true,
data: result.data,
message: 'LPO created successfully and notification email sent'
};
} catch (error) {
// Clean up uploaded file if LPO creation failed
if (fileInfo && fileInfo.path) {
await FileUploadUtils.deleteFile(fileInfo.path);
}
throw new Error(`Failed to create LPO: ${error.message}`);
}
}
// Update LPO with optional file replacement
static async updateLPO(id, lpoData, fileInfo, centerContext) {
try {
// Only main branch can update LPOs
if (centerContext.type !== 'main') {
return {
success: false,
message: 'LPO system is only available for Main Branch centers'
};
}
const lpo = await LPO.findById(id, centerContext);
if (!lpo) {
return {
success: false,
message: 'LPO not found'
};
}
// Check if LPO can be updated
if (lpo.order_status === 'fully_used' || lpo.order_status === 'cancelled') {
return {
success: false,
message: 'Cannot update LPO with status: ' + lpo.order_status
};
}
// Check if LPO number is being changed and if it already exists
if (lpoData.lpo_number !== lpo.lpo_number) {
const lpoNumberExists = await LPO.lpoNumberExists(lpoData.lpo_number, id);
if (lpoNumberExists) {
return {
success: false,
message: 'LPO number already exists. Please use a unique LPO number.'
};
}
}
// Handle file replacement
if (fileInfo) {
const fileValidation = this.validateUploadedFile(fileInfo);
if (!fileValidation.isValid) {
return {
success: false,
message: fileValidation.message
};
}
// Delete old file if exists
if (lpo.lpo_file_path) {
await FileUploadUtils.deleteFile(lpo.lpo_file_path);
}
// Set new file information
lpoData.lpo_file_path = fileInfo.path;
lpoData.lpo_file_name = fileInfo.originalname;
lpoData.lpo_file_size = fileInfo.size;
lpoData.lpo_file_type = fileInfo.mimetype;
lpoData.lpo_uploaded_at = new Date();
}
// Update LPO
Object.assign(lpo, lpoData);
await lpo.update();
// Get updated data
const result = await this.getLPOById(id, centerContext);
return {
success: true,
data: result.data,
message: 'LPO updated successfully'
};
} catch (error) {
// Clean up uploaded file if update failed
if (fileInfo && fileInfo.path) {
await FileUploadUtils.deleteFile(fileInfo.path);
}
throw new Error(`Failed to update LPO: ${error.message}`);
}
}
// Hard delete LPO
static async deleteLPO(id, centerContext) {
try {
// Only main branch can delete LPOs
if (centerContext.type !== 'main') {
return {
success: false,
message: 'LPO system is only available for Main Branch centers'
};
}
const lpo = await LPO.findById(id, centerContext);
if (!lpo) {
return {
success: false,
message: 'LPO not found'
};
}
await lpo.hardDelete();
return {
success: true,
message: 'LPO deleted permanently along with associated files'
};
} catch (error) {
throw new Error(`Failed to delete LPO: ${error.message}`);
}
}
// Cancel LPO (soft delete)
static async cancelLPO(id, centerContext) {
try {
// Only main branch can cancel LPOs
if (centerContext.type !== 'main') {
return {
success: false,
message: 'LPO system is only available for Main Branch centers'
};
}
const lpo = await LPO.findById(id, centerContext);
if (!lpo) {
return {
success: false,
message: 'LPO not found'
};
}
// Check if LPO can be cancelled
if (lpo.order_status === 'cancelled') {
return {
success: false,
message: 'LPO is already cancelled'
};
}
await lpo.cancel();
return {
success: true,
message: 'LPO cancelled successfully'
};
} catch (error) {
throw new Error(`Failed to cancel LPO: ${error.message}`);
}
}
// Download LPO file
static async downloadLPOFile(id, centerContext) {
try {
// Only main branch can download LPO files
if (centerContext.type !== 'main') {
return {
success: false,
message: 'LPO system is only available for Main Branch centers'
};
}
const lpo = await LPO.findById(id, centerContext);
if (!lpo) {
return {
success: false,
message: 'LPO not found'
};
}
if (!lpo.lpo_file_path) {
return {
success: false,
message: 'No file attached to this LPO'
};
}
// Check if file exists
const fileInfo = await FileUploadUtils.getFileInfo(lpo.lpo_file_path);
if (!fileInfo.exists) {
return {
success: false,
message: 'LPO file not found on server'
};
}
return {
success: true,
data: {
file_path: lpo.lpo_file_path,
file_name: lpo.lpo_file_name,
file_size: lpo.lpo_file_size,
file_type: lpo.lpo_file_type
},
message: 'File ready for download'
};
} catch (error) {
throw new Error(`Failed to get LPO file: ${error.message}`);
}
}
// Search LPOs
static async searchLPOs(searchTerm, centerContext = null, filters = {}) {
try {
// Only main branch can search LPOs
if (centerContext && centerContext.type !== 'main') {
return {
success: false,
message: 'LPO system is only available for Main Branch centers'
};
}
const lpos = await LPO.search(searchTerm, centerContext, filters);
return {
success: true,
data: lpos,
message: 'LPO search completed successfully',
count: lpos.length,
search_term: searchTerm,
filters_applied: filters
};
} catch (error) {
throw new Error(`LPO search failed: ${error.message}`);
}
}
// Get available LPO line items for course booking
static async getAvailableLineItems(customerId, categoryId, levelId, centerContext) {
try {
// Only main branch can access LPO line items
if (centerContext.type !== 'main') {
return {
success: false,
message: 'LPO system is only available for Main Branch centers'
};
}
const lineItems = await LPO.getAvailableLineItems(customerId, categoryId, levelId);
return {
success: true,
data: lineItems,
message: 'Available LPO line items retrieved successfully',
count: lineItems.length
};
} catch (error) {
throw new Error(`Failed to get available line items: ${error.message}`);
}
}
// Use LPO quantity (during course booking)
static async useQuantity(lineItemId, quantityToUse, bookingReference, centerContext) {
try {
// Only main branch can use LPO quantities
if (centerContext.type !== 'main') {
return {
success: false,
message: 'LPO system is only available for Main Branch centers'
};
}
await LPO.useQuantity(lineItemId, quantityToUse);
// Record usage
await LPO.recordUsage(lineItemId, {
quantity_booked: quantityToUse,
booking_reference: bookingReference
});
// Get LPO ID and update status
const [lineItem] = await pool.execute(
'SELECT lpo_order_id FROM lpo_line_items WHERE id = ?',
[lineItemId]
);
if (lineItem.length > 0) {
await LPO.updateLPOStatus(lineItem[0].lpo_order_id);
}
return {
success: true,
message: 'LPO quantity used successfully'
};
} catch (error) {
throw new Error(`Failed to use LPO quantity: ${error.message}`);
}
}
// Process course completion (credit back no-shows)
static async processCourseCompletion(lineItemId, completionData, centerContext) {
try {
// Only main branch can process completions
if (centerContext.type !== 'main') {
return {
success: false,
message: 'LPO system is only available for Main Branch centers'
};
}
const {
quantity_booked,
quantity_attended,
quantity_passed
} = completionData;
// Calculate quantities
const quantity_no_show = quantity_booked - quantity_attended;
const quantity_failed = quantity_attended - quantity_passed;
// Credit back no-shows only (not failed candidates)
if (quantity_no_show > 0) {
await LPO.creditBackQuantity(lineItemId, quantity_no_show);
}
// Update usage history
await LPO.recordUsage(lineItemId, {
quantity_booked,
quantity_attended,
quantity_passed,
quantity_failed,
quantity_no_show,
quantity_credited_back: quantity_no_show,
completion_date: new Date()
});
// Get LPO ID and update status
const [lineItem] = await pool.execute(
'SELECT lpo_order_id FROM lpo_line_items WHERE id = ?',
[lineItemId]
);
if (lineItem.length > 0) {
await LPO.updateLPOStatus(lineItem[0].lpo_order_id);
}
return {
success: true,
message: `Course completion processed. ${quantity_no_show} no-shows credited back to LPO.`,
data: {
quantity_credited_back: quantity_no_show,
quantity_failed_no_credit: quantity_failed
}
};
} catch (error) {
throw new Error(`Failed to process course completion: ${error.message}`);
}
}
// Check expiring LPOs and send notifications
static async checkExpiringLPOs() {
try {
const expiringLPOs = await LPO.getExpiringLPOs();
let notificationsSent = 0;
for (const lpo of expiringLPOs) {
const success = await lpo.sendExpiryNotification(15);
if (success) {
notificationsSent++;
}
}
return {
success: true,
message: `Expiry check completed. ${notificationsSent} notifications sent.`,
lpos_checked: expiringLPOs.length,
notifications_sent: notificationsSent
};
} catch (error) {
throw new Error(`Failed to check expiring LPOs: ${error.message}`);
}
}
// Get course pricing
static async getCoursePricing(categoryId, levelId) {
try {
const pricing = await LPO.getCoursePricing(categoryId, levelId);
if (!pricing) {
return {
success: false,
message: 'Pricing not found for the selected course'
};
}
return {
success: true,
data: pricing,
message: 'Course pricing retrieved successfully'
};
} catch (error) {
throw new Error(`Failed to get course pricing: ${error.message}`);
}
}
// Validate LPO data
static validateLPOData(lpoData, lineItems) {
if (!lpoData.lpo_number || lpoData.lpo_number.trim().length === 0) {
return { isValid: false, message: 'LPO number is required' };
}
if (!lpoData.customer_id) {
return { isValid: false, message: 'Customer is required' };
}
if (!lpoData.lpo_type || !['corporate', 'individual'].includes(lpoData.lpo_type)) {
return { isValid: false, message: 'Valid LPO type is required (corporate or individual)' };
}
if (!lpoData.order_date) {
return { isValid: false, message: 'Order date is required' };
}
if (!lpoData.valid_until) {
return { isValid: false, message: 'Valid until date is required' };
}
if (new Date(lpoData.valid_until) <= new Date(lpoData.order_date)) {
return { isValid: false, message: 'Valid until date must be after order date' };
}
if (!lineItems || lineItems.length === 0) {
return { isValid: false, message: 'At least one line item is required' };
}
// Validate individual LPO restrictions
if (lpoData.lpo_type === 'individual') {
if (lineItems.length > 1) {
return { isValid: false, message: 'Individual LPO can have only one line item' };
}
}
// Validate line items
for (const lineItem of lineItems) {
if (!lineItem.category_id || !lineItem.level_id) {
return { isValid: false, message: 'Category and level are required for all line items' };
}
if (!lineItem.quantity_ordered || lineItem.quantity_ordered <= 0) {
return { isValid: false, message: 'Valid quantity is required for all line items' };
}
}
return { isValid: true };
}
// Validate uploaded file
static validateUploadedFile(fileInfo) {
if (!fileInfo) {
return { isValid: false, message: 'No file uploaded' };
}
// Check file size (25MB limit)
if (fileInfo.size > 25 * 1024 * 1024) {
return { isValid: false, message: 'File size must be less than 25MB' };
}
// Check file type
const allowedMimeTypes = [
'application/pdf',
'application/msword',
'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
'image/jpeg',
'image/jpg',
'image/png',
'text/plain',
'application/rtf'
];
if (!allowedMimeTypes.includes(fileInfo.mimetype)) {
return { isValid: false, message: 'Only PDF, Word documents, images, and text files are allowed' };
}
return { isValid: true };
}
}