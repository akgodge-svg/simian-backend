import { Center } from '../models/center.js';
export class CenterPermissionMiddleware {
// Middleware to check center permissions
static checkPermission(requiredPermission) {
return async (req, res, next) => {
try {
// Get center ID from request (could be from params, body, or user session)
const centerId = req.params.center_id || req.body.center_id || req.user?.center_id;
if (!centerId) {
return res.status(400).json({
success: false,
message: 'Center context is required'
});
}
// Check if center has the required permission
const hasPermission = await Center.hasPermission(centerId, requiredPermission);
if (!hasPermission) {
return res.status(403).json({
success: false,
message: `Access denied. Center does not have permission: ${requiredPermission}`
});
}
// Add center permissions to request for future use
req.centerPermissions = await Center.getPermissions(centerId);
req.centerId = centerId;
next();
} catch (error) {
console.error('Permission check failed:', error);
res.status(500).json({
success: false,
message: 'Permission check failed'
});
}
};
}
// Middleware to check if center can create UAE courses
static canCreateUAECourses() {
return this.checkPermission('create_uae_courses');
}
// Middleware to check if center can create overseas courses
static canCreateOverseasCourses() {
return this.checkPermission('create_overseas_courses');
}
// Middleware to check if center can access LPO system
static canAccessLPOSystem() {
return this.checkPermission('access_lpo_system');
}
// Middleware to check if center can manage all instructors
static canManageAllInstructors() {
return this.checkPermission('manage_all_instructors');
}
// Middleware to check if center can manage all customers
static canManageAllCustomers() {
return this.checkPermission('manage_all_customers');
}
// Middleware to filter data based on center permissions
static filterDataByCenter() {
return async (req, res, next) => {
try {
const centerId = req.params.center_id || req.body.center_id || req.user?.center_id;
if (!centerId) {
return res.status(400).json({
success: false,
message: 'Center context is required'
});
}
// Get center type and permissions
const center = await Center.findById(centerId);
if (!center) {
return res.status(404).json({
success: false,
message: 'Center not found'
});
}
// Add filtering context to request
req.centerContext = {
id: center.id,
type: center.center_type,
canSeeAllData: center.center_type === 'main',
permissions: await Center.getPermissions(centerId)
};
next();
} catch (error) {
console.error('Data filtering failed:', error);
res.status(500).json({
success: false,
message: 'Data filtering failed'
});
}
};
}
}