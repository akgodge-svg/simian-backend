import { Center } from '../models/Center.js';
export class CenterService {

 // Get all centers
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
 // Get single center by ID
 static async getCenterById(id) {
 try {
 const center = await Center.findById(id);

 if (!center) {
 return {
 success: false,
 message: 'Center not found'
 };
 }
 return {
 success: true,
 data: center,
 message: 'Center retrieved successfully'
 };
 } catch (error) {
 throw new Error(`Failed to get center: ${error.message}`);
 }
 }
 // Create new center
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
 // Check if center name exists
 const nameExists = await Center.nameExists(centerData.name);
 if (nameExists) {
 return {
 success: false,
 message: 'Center name already exists'
 };
 }
 // Set permissions based on center type
 if (centerData.center_type === 'main') {
 centerData.can_create_uae_courses = true;
 centerData.can_create_overseas_courses = true;
 } else if (centerData.center_type === 'overseas') {
 centerData.can_create_uae_courses = false;
 centerData.can_create_overseas_courses = true;
 }
 // Create center
 const center = new Center(centerData);
 await center.save();
 return {
 success: true,
 data: center,
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
 // Validate center data
 const validation = this.validateCenterData(centerData);
 if (!validation.isValid) {
 return {
 success: false,
 message: validation.message
 };
 }
 // Check if name exists (exclude current center)
 const nameExists = await Center.nameExists(centerData.name, id);
 if (nameExists) {
 return {
 success: false,
 message: 'Center name already exists'
 };
 }
 // Set permissions based on center type
 if (centerData.center_type === 'main') {
 centerData.can_create_uae_courses = true;
 centerData.can_create_overseas_courses = true;
 } else if (centerData.center_type === 'overseas') {
 centerData.can_create_uae_courses = false;
 centerData.can_create_overseas_courses = true;
 }
 // Update center
 Object.assign(center, centerData);
 await center.update();
 return {
 success: true,
 data: center,
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
 // Prevent deletion of main center if it's the only one
 if (center.center_type === 'main') {
 const mainCenters = await Center.findByType('main');
 if (mainCenters.length === 1) {
 return {
 success: false,
 message: 'Cannot delete the only main center'
 };
 }
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
 throw new Error(`Failed to get ${centerType} centers: ${error.message}`);
 }
 }
 // Get center permissions
 static async getCenterPermissions(id) {
 try {
 const permissions = await Center.getCenterPermissions(id);

 if (!permissions) {
 return {
 success: false,
 message: 'Center not found'
 };
 }
 return {
 success: true,
 data: {
 center_id: permissions.id,
 center_name: permissions.name,
 center_type: permissions.center_type,
 permissions: {
 can_create_uae_courses: permissions.can_create_uae_courses,
 can_create_overseas_courses: permissions.can_create_overseas_courses,
 has_lpo_access: permissions.center_type === 'main',
 has_full_instructor_access: permissions.center_type === 'main'
 }
 },
 message: 'Center permissions retrieved successfully'
 };
 } catch (error) {
 throw new Error(`Failed to get center permissions: ${error.message}`);
 }
 }
 // Get main center
 static async getMainCenter() {
 try {
 const mainCenter = await Center.getMainCenter();

 if (!mainCenter) {
 return {
 success: false,
 message: 'Main center not found'
 };
 }
 return {
 success: true,
 data: mainCenter,
 message: 'Main center retrieved successfully'
 };
 } catch (error) {
 throw new Error(`Failed to get main center: ${error.message}`);
 }
 }
 // Validate center data
 static validateCenterData(data) {
 // Required field validation
 if (!data.name || data.name.trim().length === 0) {
 return { isValid: false, message: 'Center name is required' };
 }
 if (data.name.trim().length < 3) {
 return { isValid: false, message: 'Center name must be at least 3 characters' };
 }
 if (!data.address || data.address.trim().length === 0) {
 return { isValid: false, message: 'Address is required' };
 }
 if (!data.city || data.city.trim().length === 0) {
 return { isValid: false, message: 'City is required' };
 }
 if (!data.country || data.country.trim().length === 0) {
 return { isValid: false, message: 'Country is required' };
 }
 if (!data.center_type || !['main', 'overseas'].includes(data.center_type)) {
 return { isValid: false, message: 'Center type must be "main" or "overseas"' };
 }
 if (!data.manager_name || data.manager_name.trim().length === 0) {
 return { isValid: false, message: 'Manager name is required' };
 }
 // Email validation (if provided)
 if (data.contact_email) {
 const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
 if (!emailRegex.test(data.contact_email)) {
 return { isValid: false, message: 'Invalid email format' };
 }
 }
 return { isValid: true };
 }
}