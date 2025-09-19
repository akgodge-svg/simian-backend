import { Center } from '../models/center.js';
export class CenterService {
// Get all centers with statistics
static async getAllCenters() {
try {
const centers = await Center.findAll();
return {
success: true,
data: centers,
message: 'Centers retrieved successfully',
count: centers.length
};
} catch (error) {
throw new Error(`Failed to get centers: ${error.message}`);
}
}
// Get single center with complete details
static async getCenterById(id) {
try {
const center = await Center.findById(id);
if (!center) {
return {
success: false,
message: 'Center not found'
};
}
// Get assigned instructors
const instructors = await Center.getCenterInstructors(id);
// Get dashboard data
const dashboard = await Center.getDashboardData(id);
return {
success: true,
data: {
...center,
instructors,
dashboard
},
message: 'Center retrieved successfully'
};
} catch (error) {
throw new Error(`Failed to get center: ${error.message}`);
}
}
// Create center
static async createCenter(centerData) {
try {
// Validate center data
const validation = this.validateCenterData(centerData);
if (!validation.isValid) {
return {
success: false,
message: validation.message
};
}
// Check if name exists
const nameExists = await Center.nameExists(centerData.name);
if (nameExists) {
return {
success: false,
message: 'Center name already exists'
};
}
// Create center
const center = new Center(centerData);
await center.save();
// Get complete center data
const result = await this.getCenterById(center.id);
return {
success: true,
data: result.data,
message: 'Center created successfully'
};
} catch (error) {
throw new Error(`Failed to create center: ${error.message}`);
}
}
// Update center
static async updateCenter(id, centerData) {
try {
const center = await Center.findById(id);
if (!center) {
return {
success: false,
message: 'Center not found'
};
}
// Validate data
const validation = this.validateCenterData(centerData);
if (!validation.isValid) {
return {
success: false,
message: validation.message
};
}
// Check name uniqueness (exclude current center)
const nameExists = await Center.nameExists(centerData.name, id);
if (nameExists) {
return {
success: false,
message: 'Center name already exists'
};
}
// Update center
Object.assign(center, centerData);
await center.update();
// Get updated data
const result = await this.getCenterById(id);
return {
success: true,
data: result.data,
message: 'Center updated successfully'
};
} catch (error) {
throw new Error(`Failed to update center: ${error.message}`);
}
}
// Delete center
static async deleteCenter(id) {
try {
const center = await Center.findById(id);
if (!center) {
return {
success: false,
message: 'Center not found'
};
}
await center.delete();
return {
success: true,
message: 'Center deleted successfully'
};
} catch (error) {
throw new Error(`Failed to delete center: ${error.message}`);
}
}
// Assign instructor to center
static async assignInstructor(centerId, instructorId, options = {}) {
try {
const { assignedBy = null, isPrimary = false } = options;
await Center.assignInstructor(centerId, instructorId, assignedBy, isPrimary);
return {
success: true,
message: `Instructor ${isPrimary ? 'assigned as primary' : 'assigned'} to center successfully`
};
} catch (error) {
throw new Error(`Failed to assign instructor: ${error.message}`);
}
}
// Remove instructor from center
static async removeInstructor(centerId, instructorId) {
try {
await Center.removeInstructor(centerId, instructorId);
return {
success: true,
message: 'Instructor removed from center successfully'
};
} catch (error) {
throw new Error(`Failed to remove instructor: ${error.message}`);
}
}
// Get center instructors
static async getCenterInstructors(centerId) {
try {
const instructors = await Center.getCenterInstructors(centerId);
return {
success: true,
data: instructors,
message: 'Center instructors retrieved successfully',
count: instructors.length
};
} catch (error) {
throw new Error(`Failed to get center instructors: ${error.message}`);
}
}
// Get available instructors for assignment
static async getAvailableInstructors(centerId) {
try {
const instructors = await Center.getAvailableInstructors(centerId);
return {
success: true,
data: instructors,
message: 'Available instructors retrieved successfully',
count: instructors.length
};
} catch (error) {
throw new Error(`Failed to get available instructors: ${error.message}`);
}
}
// Get center permissions
static async getCenterPermissions(centerId) {
try {
const permissions = await Center.getPermissions(centerId);
return {
success: true,
data: permissions,
message: 'Center permissions retrieved successfully'
};
} catch (error) {
throw new Error(`Failed to get center permissions: ${error.message}`);
}
}
// Check center permission
static async checkPermission(centerId, permission) {
try {
const hasPermission = await Center.hasPermission(centerId, permission);
return {
success: true,
data: {
permission,
has_permission: hasPermission
},
message: 'Permission checked successfully'
};
} catch (error) {
throw new Error(`Failed to check permission: ${error.message}`);
}
}
// Get center dashboard
static async getCenterDashboard(centerId) {
try {
const dashboard = await Center.getDashboardData(centerId);
if (!dashboard) {
return {
success: false,
message: 'Center not found'
};
}
return {
success: true,
data: dashboard,
message: 'Center dashboard retrieved successfully'
};
} catch (error) {
throw new Error(`Failed to get center dashboard: ${error.message}`);
}
}
// Get dropdown data
static async getDropdownData() {
try {
const centers = await Center.getDropdownList();
return {
success: true,
data: centers,
message: 'Center dropdown data retrieved successfully'
};
} catch (error) {
throw new Error(`Failed to get dropdown data: ${error.message}`);
}
}
// Get centers by type
static async getCentersByType(centerType) {
try {
if (!['main', 'overseas'].includes(centerType)) {
return {
success: false,
message: 'Invalid center type. Must be "main" or "overseas"'
};
}
const centers = await Center.findByType(centerType);
return {
success: true,
data: centers,
message: `${centerType} centers retrieved successfully`,
count: centers.length
};
} catch (error) {
throw new Error(`Failed to get centers by type: ${error.message}`);
}
}
// Validate center data
static validateCenterData(data) {
if (!data.name || data.name.trim().length === 0) {
return { isValid: false, message: 'Center name is required' };
}
if (!data.center_type || !['main', 'overseas'].includes(data.center_type)) {
return { isValid: false, message: 'Valid center type is required (main or overseas)' };
}
if (!data.city || data.city.trim().length === 0) {
return { isValid: false, message: 'City is required' };
}
if (!data.country || data.country.trim().length === 0) {
return { isValid: false, message: 'Country is required' };
}
if (data.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contact_email)) {
return { isValid: false, message: 'Valid contact email is required' };
}
return { isValid: true };
}
}