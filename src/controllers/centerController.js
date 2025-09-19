import { CenterService } from '../services/centerService.js';
export class CenterController {
// GET /api/centers
static async getAllCenters(req, res) {
try {
const result = await CenterService.getAllCenters();
res.status(200).json(result);
} catch (error) {
console.error('Error getting centers:', error);
res.status(500).json({
success: false,
message: error.message
});
}
}
// GET /api/centers/:id
static async getCenterById(req, res) {
try {
const { id } = req.params;
if (!id || isNaN(id)) {
return res.status(400).json({
success: false,
message: 'Valid center ID is required'
});
}
const result = await CenterService.getCenterById(id);
if (!result.success) {
return res.status(404).json(result);
}
res.status(200).json(result);
} catch (error) {
console.error('Error getting center by ID:', error);
res.status(500).json({
success: false,
message: error.message
});
}
}
// POST /api/centers
static async createCenter(req, res) {
try {
const centerData = req.body;
if (!centerData) {
return res.status(400).json({
success: false,
message: 'Center data is required'
});
}
const result = await CenterService.createCenter(centerData);
if (!result.success) {
return res.status(400).json(result);
}
res.status(201).json(result);
} catch (error) {
console.error('Error creating center:', error);
res.status(500).json({
success: false,
message: error.message
});
}
}
// PUT /api/centers/:id
static async updateCenter(req, res) {
try {
const { id } = req.params;
const centerData = req.body;
if (!id || isNaN(id)) {
return res.status(400).json({
success: false,
message: 'Valid center ID is required'
});
}
if (!centerData) {
return res.status(400).json({
success: false,
message: 'Center data is required'
});
}
const result = await CenterService.updateCenter(id, centerData);
if (!result.success) {
return res.status(400).json(result);
}
res.status(200).json(result);
} catch (error) {
console.error('Error updating center:', error);
res.status(500).json({
success: false,
message: error.message
});
}
}
// DELETE /api/centers/:id
static async deleteCenter(req, res) {
try {
const { id } = req.params;
if (!id || isNaN(id)) {
return res.status(400).json({
success: false,
message: 'Valid center ID is required'
});
}
const result = await CenterService.deleteCenter(id);
if (!result.success) {
return res.status(400).json(result);
}
res.status(200).json(result);
} catch (error) {
console.error('Error deleting center:', error);
res.status(500).json({
success: false,
message: error.message
});
}
}
// POST /api/centers/:id/instructors
static async assignInstructor(req, res) {
try {
const { id } = req.params;
const { instructor_id, assigned_by, is_primary } = req.body;
if (!id || isNaN(id)) {
return res.status(400).json({
success: false,
message: 'Valid center ID is required'
});
}
if (!instructor_id || isNaN(instructor_id)) {
return res.status(400).json({
success: false,
message: 'Valid instructor ID is required'
});
}
const result = await CenterService.assignInstructor(id, instructor_id, {
assignedBy: assigned_by,
isPrimary: is_primary || false
});
if (!result.success) {
return res.status(400).json(result);
}
res.status(201).json(result);
} catch (error) {
console.error('Error assigning instructor:', error);
res.status(500).json({
success: false,
message: error.message
});
}
}
// DELETE /api/centers/:center_id/instructors/:instructor_id
static async removeInstructor(req, res) {
try {
const { center_id, instructor_id } = req.params;
if (!center_id || isNaN(center_id) || !instructor_id || isNaN(instructor_id)) {
return res.status(400).json({
success: false,
message: 'Valid center ID and instructor ID are required'
});
}
const result = await CenterService.removeInstructor(center_id, instructor_id);
if (!result.success) {
return res.status(400).json(result);
}
res.status(200).json(result);
} catch (error) {
console.error('Error removing instructor:', error);
res.status(500).json({
success: false,
message: error.message
});
}
}
// GET /api/centers/:id/instructors
static async getCenterInstructors(req, res) {
try {
const { id } = req.params;
if (!id || isNaN(id)) {
return res.status(400).json({
success: false,
message: 'Valid center ID is required'
});
}
const result = await CenterService.getCenterInstructors(id);
res.status(200).json(result);
} catch (error) {
console.error('Error getting center instructors:', error);
res.status(500).json({
success: false,
message: error.message
});
}
}
// GET /api/centers/:id/available-instructors
static async getAvailableInstructors(req, res) {
try {
const { id } = req.params;
if (!id || isNaN(id)) {
return res.status(400).json({
success: false,
message: 'Valid center ID is required'
});
}
const result = await CenterService.getAvailableInstructors(id);
res.status(200).json(result);
} catch (error) {
console.error('Error getting available instructors:', error);
res.status(500).json({
success: false,
message: error.message
});
}
}
// GET /api/centers/:id/permissions
static async getCenterPermissions(req, res) {
try {
const { id } = req.params;
if (!id || isNaN(id)) {
return res.status(400).json({
success: false,
message: 'Valid center ID is required'
});
}
const result = await CenterService.getCenterPermissions(id);
res.status(200).json(result);
} catch (error) {
console.error('Error getting center permissions:', error);
res.status(500).json({
success: false,
message: error.message
});
}
}
// GET /api/centers/:id/permissions/:permission
static async checkPermission(req, res) {
try {
const { id, permission } = req.params;
if (!id || isNaN(id)) {
return res.status(400).json({
success: false,
message: 'Valid center ID is required'
});
}
if (!permission) {
return res.status(400).json({
success: false,
message: 'Permission name is required'
});
}
const result = await CenterService.checkPermission(id, permission);
res.status(200).json(result);
} catch (error) {
console.error('Error checking permission:', error);
res.status(500).json({
success: false,
message: error.message
});
}
}
// GET /api/centers/:id/dashboard
static async getCenterDashboard(req, res) {
try {
const { id } = req.params;
if (!id || isNaN(id)) {
return res.status(400).json({
success: false,
message: 'Valid center ID is required'
});
}
const result = await CenterService.getCenterDashboard(id);
if (!result.success) {
return res.status(404).json(result);
}
res.status(200).json(result);
} catch (error) {
console.error('Error getting center dashboard:', error);
res.status(500).json({
success: false,
message: error.message
});
}
}
// GET /api/centers/dropdown
static async getDropdownData(req, res) {
try {
const result = await CenterService.getDropdownData();
res.status(200).json(result);
} catch (error) {
console.error('Error getting dropdown data:', error);
res.status(500).json({
success: false,
message: error.message
});
}
}
// GET /api/centers/type/:type
static async getCentersByType(req, res) {
try {
const { type } = req.params;
const result = await CenterService.getCentersByType(type);
if (!result.success) {
return res.status(400).json(result);
}
res.status(200).json(result);
} catch (error) {
console.error('Error getting centers by type:', error);
res.status(500).json({
success: false,
message: error.message
});
}
}
}