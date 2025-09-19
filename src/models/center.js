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



export class Center {
constructor(data = {}) {
this.id = data?.id;
this.name = data?.name;
this.address = data?.address;
this.city = data?.city;
this.country = data?.country;
this.center_type = data?.center_type;
this.can_create_uae_courses = data?.can_create_uae_courses ?? false;
this.can_create_overseas_courses = data?.can_create_overseas_courses ?? true;
this.manager_name = data?.manager_name;
this.contact_phone = data?.contact_phone;
this.contact_email = data?.contact_email;
this.timezone = data?.timezone ?? 'UTC';
this.is_active = data?.is_active ?? true;
this.created_at = data?.created_at;
this.updated_at = data?.updated_at;
// Additional computed fields
this.total_instructors = data?.total_instructors || 0;
this.total_courses = data?.total_courses || 0;
this.total_customers = data?.total_customers || 0;
this.active_bookings = data?.active_bookings || 0;
this.permissions = data?.permissions || {};
}
// Get all centers with statistics
static async findAll() {
const query = `
SELECT
c.*,
cs.total_instructors,
cs.total_courses,
cs.total_customers,
cs.active_bookings
FROM centers c
LEFT JOIN center_statistics cs ON c.id = cs.center_id
WHERE c.is_active = 1
ORDER BY
CASE WHEN c.center_type = 'main' THEN 0 ELSE 1 END,
c.name ASC
`;
const [rows] = await pool.execute(query);
return rows.map(row => new Center(row));
}
// Get single center with complete details
static async findById(id) {
const query = `
SELECT
c.*,
cs.total_instructors,
cs.total_courses,
cs.total_customers,
cs.active_bookings
FROM centers c
LEFT JOIN center_statistics cs ON c.id = cs.center_id
WHERE c.id = ? AND c.is_active = 1
`;
const [rows] = await pool.execute(query, [id]);
if (rows.length === 0) return null;
const center = new Center(rows[0]);
// Get permissions
center.permissions = await this.getPermissions(id);
return center;
}
// Create new center
async save() {
const connection = await pool.getConnection();
await connection.beginTransaction();
try {
// Set permissions based on center type
if (this.center_type === 'main') {
this.can_create_uae_courses = true;
this.can_create_overseas_courses = true;
} else {
this.can_create_uae_courses = false;
this.can_create_overseas_courses = true;
}
const insertQuery = `
INSERT INTO centers (
name, address, city, country, center_type,
can_create_uae_courses, can_create_overseas_courses,
manager_name, contact_phone, contact_email, timezone
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;
const [result] = await connection.execute(insertQuery, [
this.name,
this.address,
this.city,
this.country,
this.center_type,
this.can_create_uae_courses,
this.can_create_overseas_courses,
this.manager_name,
this.contact_phone,
this.contact_email,
this.timezone
]);
this.id = result.insertId;
// Create default permissions
await this.createDefaultPermissions(connection);
// Initialize statistics
await this.initializeStatistics(connection);
await connection.commit();
return this;
} catch (error) {
await connection.rollback();
throw error;
} finally {
connection.release();
}
}
// Create default permissions based on center type
async createDefaultPermissions(connection) {
const permissions = [
'create_uae_courses',
'create_overseas_courses',
'access_lpo_system',
'manage_all_instructors',
'manage_own_instructors',
'manage_all_customers',
'manage_own_customers',
'view_global_reports',
'manage_center_settings'
];
for (const permission of permissions) {
let permissionValue;
if (this.center_type === 'main') {
permissionValue = true; // Main center has all permissions
} else {
// Overseas centers have limited permissions
permissionValue = ['create_overseas_courses', 'manage_own_instructors', 'manage_own_customers', 'manage_center_settings'].includes(permission);
}
await connection.execute(
'INSERT INTO center_permissions (center_id, permission_name, permission_value) VALUES (?, ?, ?)',
[this.id, permission, permissionValue]
);
}
}
// Initialize statistics
async initializeStatistics(connection) {
await connection.execute(
'INSERT INTO center_statistics (center_id) VALUES (?)',
[this.id]
);
}
// Update center
async update() {
const connection = await pool.getConnection();
await connection.beginTransaction();
try {
// Update permissions based on center type if changed
if (this.center_type === 'main') {
this.can_create_uae_courses = true;
this.can_create_overseas_courses = true;
} else {
this.can_create_uae_courses = false;
this.can_create_overseas_courses = true;
}
const updateQuery = `
UPDATE centers SET
name = ?,
address = ?,
city = ?,
country = ?,
center_type = ?,
can_create_uae_courses = ?,
can_create_overseas_courses = ?,
manager_name = ?,
contact_phone = ?,
contact_email = ?,
timezone = ?,
updated_at = CURRENT_TIMESTAMP
WHERE id = ?
`;
await connection.execute(updateQuery, [
this.name,
this.address,
this.city,
this.country,
this.center_type,
this.can_create_uae_courses,
this.can_create_overseas_courses,
this.manager_name,
this.contact_phone,
this.contact_email,
this.timezone,
this.id
]);
// Update permissions if center type changed
await this.updatePermissions(connection);
await connection.commit();
return this;
} catch (error) {
await connection.rollback();
throw error;
} finally {
connection.release();
}
}
// Update permissions based on center type
async updatePermissions(connection) {
const permissions = {
'create_uae_courses': this.center_type === 'main',
'create_overseas_courses': true,
'access_lpo_system': this.center_type === 'main',
'manage_all_instructors': this.center_type === 'main',
'manage_own_instructors': true,
'manage_all_customers': this.center_type === 'main',
'manage_own_customers': true,
'view_global_reports': this.center_type === 'main',
'manage_center_settings': true
};
for (const [permission, value] of Object.entries(permissions)) {
await connection.execute(
'UPDATE center_permissions SET permission_value = ? WHERE center_id = ? AND permission_name = ?',
[value, this.id, permission]
);
}
}
// Soft delete center
async delete() {
const connection = await pool.getConnection();
await connection.beginTransaction();
try {
// Check if center has active instructors or courses
const [instructorCount] = await connection.execute(
'SELECT COUNT(*) as count FROM center_instructors WHERE center_id = ? AND is_active = 1',
[this.id]
);
if (instructorCount[0].count > 0) {
throw new Error('Cannot delete center with active instructor assignments');
}
// Soft delete
await connection.execute(
'UPDATE centers SET is_active = 0 WHERE id = ?',
[this.id]
);
await connection.commit();
return true;
} catch (error) {
await connection.rollback();
throw error;
} finally {
connection.release();
}
}
// Get center permissions
static async getPermissions(centerId) {
const query = `
SELECT permission_name, permission_value
FROM center_permissions
WHERE center_id = ?
`;
const [rows] = await pool.execute(query, [centerId]);
const permissions = {};
rows.forEach(row => {
permissions[row.permission_name] = row.permission_value;
});
return permissions;
}
// Check if center has specific permission
static async hasPermission(centerId, permission) {
const query = `
SELECT permission_value
FROM center_permissions
WHERE center_id = ? AND permission_name = ?
`;
const [rows] = await pool.execute(query, [centerId, permission]);
return rows.length > 0 ? rows[0].permission_value : false;
}
// Get dropdown list for React components
static async getDropdownList() {
const query = `
SELECT
id,
name,
center_type,
city,
country
FROM centers
WHERE is_active = 1
ORDER BY
CASE WHEN center_type = 'main' THEN 0 ELSE 1 END,
name ASC
`;
const [rows] = await pool.execute(query);
return rows;
}
// Assign instructor to center
static async assignInstructor(centerId, instructorId, assignedBy = null, isPrimary = false) {
const connection = await pool.getConnection();
await connection.beginTransaction();
try {
// Check if assignment already exists
const [existing] = await connection.execute(
'SELECT id FROM center_instructors WHERE center_id = ? AND instructor_id = ?',
[centerId, instructorId]
);
if (existing.length > 0) {
// Update existing assignment
await connection.execute(
'UPDATE center_instructors SET assignment_status = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE center_id = ? AND instructor_id = ?',
['active', centerId, instructorId]
);
} else {
// Create new assignment
await connection.execute(
'INSERT INTO center_instructors (center_id, instructor_id, assigned_by, is_primary_assignment) VALUES (?, ?, ?, ?)',
[centerId, instructorId, assignedBy, isPrimary]
);
}
// Update primary center assignment if specified
if (isPrimary) {
await connection.execute(
'UPDATE instructors SET primary_center_id = ? WHERE id = ?',
[centerId, instructorId]
);
// Remove primary flag from other assignments for this instructor
await connection.execute(
'UPDATE center_instructors SET is_primary_assignment = 0 WHERE instructor_id = ? AND center_id != ?',
[instructorId, centerId]
);
}
// Update center statistics
await this.updateCenterStatistics(connection, centerId);
await connection.commit();
return true;
} catch (error) {
await connection.rollback();
throw error;
} finally {
connection.release();
}
}
// Remove instructor from center
static async removeInstructor(centerId, instructorId) {
const connection = await pool.getConnection();
await connection.beginTransaction();
try {
// Check if instructor has active courses at this center
const [activeCourses] = await connection.execute(
'SELECT COUNT(*) as count FROM course_assignments WHERE instructor_id = ? AND assignment_status = "assigned"',
[instructorId]
);
if (activeCourses[0].count > 0) {
throw new Error('Cannot remove instructor with active course assignments');
}
// Remove assignment
await connection.execute(
'UPDATE center_instructors SET is_active = 0, assignment_status = "inactive" WHERE center_id = ? AND instructor_id = ?',
[centerId, instructorId]
);
// Update center statistics
await this.updateCenterStatistics(connection, centerId);
await connection.commit();
return true;
} catch (error) {
await connection.rollback();
throw error;
} finally {
connection.release();
}
}
// Get center instructors
static async getCenterInstructors(centerId) {
const query = `
SELECT
ci.*,
i.name as instructor_name,
i.email as instructor_email,
i.phone as instructor_phone,
COUNT(DISTINCT iq.category_id) as qualifications_count,
GROUP_CONCAT(DISTINCT cc.name ORDER BY cc.name SEPARATOR ', ') as categories
FROM center_instructors ci
JOIN instructors i ON ci.instructor_id = i.id
LEFT JOIN instructor_qualifications iq ON i.id = iq.instructor_id AND iq.is_active = 1
LEFT JOIN course_categories cc ON iq.category_id = cc.id
WHERE ci.center_id = ? AND ci.is_active = 1 AND i.is_active = 1
GROUP BY ci.id, i.id
ORDER BY ci.is_primary_assignment DESC, i.name ASC
`;
const [rows] = await pool.execute(query, [centerId]);
return rows;
}
// Get available instructors for center assignment
static async getAvailableInstructors(centerId) {
const query = `
SELECT
i.id,
i.name,
i.email,
i.phone,
c.name as primary_center_name,
COUNT(DISTINCT iq.category_id) as qualifications_count,
GROUP_CONCAT(DISTINCT cc.name ORDER BY cc.name SEPARATOR ', ') as categories,
CASE WHEN ci.id IS NOT NULL THEN 1 ELSE 0 END as already_assigned
FROM instructors i
LEFT JOIN centers c ON i.primary_center_id = c.id
LEFT JOIN center_instructors ci ON i.id = ci.instructor_id AND ci.center_id = ? AND ci.is_active = 1
LEFT JOIN instructor_qualifications iq ON i.id = iq.instructor_id AND iq.is_active = 1
LEFT JOIN course_categories cc ON iq.category_id = cc.id
WHERE i.is_active = 1
GROUP BY i.id
ORDER BY already_assigned ASC, i.name ASC
`;
const [rows] = await pool.execute(query, [centerId]);
return rows;
}
// Update center statistics
static async updateCenterStatistics(connection, centerId) {
const [instructorCount] = await connection.execute(
'SELECT COUNT(*) as count FROM center_instructors WHERE center_id = ? AND is_active = 1',
[centerId]
);
await connection.execute(
'UPDATE center_statistics SET total_instructors = ?, last_updated = CURRENT_TIMESTAMP WHERE center_id = ?',
[instructorCount[0].count, centerId]
);
}
// Get center dashboard data
static async getDashboardData(centerId) {
const query = `
SELECT
c.*,
cs.*,
(SELECT COUNT(*) FROM center_instructors ci WHERE ci.center_id = c.id AND ci.is_active = 1) as active_instructors,
(SELECT COUNT(*) FROM instructor_documents id
JOIN instructors i ON id.instructor_id = i.id
WHERE i.primary_center_id = c.id AND id.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) AND id.is_active = 1) as expiring_documents
FROM centers c
LEFT JOIN center_statistics cs ON c.id = cs.center_id
WHERE c.id = ? AND c.is_active = 1
`;
const [rows] = await pool.execute(query, [centerId]);
return rows.length > 0 ? rows[0] : null;
}
// Get centers by type
static async findByType(centerType) {
const query = `
SELECT
c.*,
cs.total_instructors,
cs.total_courses,
cs.total_customers,
cs.active_bookings
FROM centers c
LEFT JOIN center_statistics cs ON c.id = cs.center_id
WHERE c.center_type = ? AND c.is_active = 1
ORDER BY c.name ASC
`;
const [rows] = await pool.execute(query, [centerType]);
return rows.map(row => new Center(row));
}
// Check if center name exists
static async nameExists(name, excludeId = null) {
let query = 'SELECT id FROM centers WHERE name = ? AND is_active = 1';
let params = [name];
if (excludeId) {
query += ' AND id != ?';
params.push(excludeId);
}
const [rows] = await pool.execute(query, params);
return rows.length > 0;
}
// Test database connection
static async testConnection() {
try {
await pool.execute('SELECT 1');
return true;
} catch (error) {
console.error('Database connection test failed:', error);
return false;
}
}
}