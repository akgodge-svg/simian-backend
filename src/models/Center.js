// models/Center.js
import { getDB } from "../config/db.js";

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
    this.is_active = data?.is_active ?? true;
    this.instructor_count = data?.instructor_count || 0;
  }

  // Get all active centers with instructor counts
  static async findAll() {
    const db = getDB();
    const query = `
      SELECT c.*, COUNT(ci.instructor_id) as instructor_count
      FROM centers c
      LEFT JOIN center_instructors ci ON c.id = ci.center_id AND ci.is_active = 1
      WHERE c.is_active = 1
      GROUP BY c.id
      ORDER BY CASE WHEN c.center_type = 'main' THEN 0 ELSE 1 END, c.name ASC
    `;
    const [rows] = await db.execute(query);
    return rows.map(row => new Center(row));
  }

  // Get single center by ID
  static async findById(id) {
    const db = getDB();
    const query = `
      SELECT c.*, COUNT(ci.instructor_id) as instructor_count
      FROM centers c
      LEFT JOIN center_instructors ci ON c.id = ci.center_id AND ci.is_active = 1
      WHERE c.id = ? AND c.is_active = 1
      GROUP BY c.id
    `;
    const [rows] = await db.execute(query, [id]);
    return rows.length > 0 ? new Center(rows[0]) : null;
  }

  // Create new center
  async save() {
    const db = getDB();
    const connection = await db.getConnection();
    await connection.beginTransaction();
    try {
      const insertQuery = `
        INSERT INTO centers (
          name, address, city, country, center_type,
          can_create_uae_courses, can_create_overseas_courses,
          manager_name, contact_phone, contact_email
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      ]);
      this.id = result.insertId;
      await connection.commit();
      return this;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Update existing center
  async update() {
    const db = getDB();
    const connection = await db.getConnection();
    await connection.beginTransaction();
    try {
      const updateQuery = `
        UPDATE centers SET
          name = ?, address = ?, city = ?, country = ?,
          center_type = ?, can_create_uae_courses = ?,
          can_create_overseas_courses = ?, manager_name = ?,
          contact_phone = ?, contact_email = ?, updated_at = CURRENT_TIMESTAMP
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
        this.id,
      ]);
      await connection.commit();
      return this;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Soft delete center
  async delete() {
    const db = getDB();
    await db.execute(`UPDATE centers SET is_active = 0 WHERE id = ?`, [this.id]);
    return true;
  }

  // Check if center name exists
  static async nameExists(name, excludeId = null) {
    const db = getDB();
    let query = `SELECT id FROM centers WHERE name = ? AND is_active = 1`;
    const params = [name];
    if (excludeId) {
      query += ` AND id != ?`;
      params.push(excludeId);
    }
    const [rows] = await db.execute(query, params);
    return rows.length > 0;
  }

  // Get centers for dropdown
  static async getDropdownList() {
    const db = getDB();
    const query = `
      SELECT id, name, center_type, city, country,
             can_create_uae_courses, can_create_overseas_courses
      FROM centers
      WHERE is_active = 1
      ORDER BY CASE WHEN center_type = 'main' THEN 0 ELSE 1 END, name ASC
    `;
    const [rows] = await db.execute(query);
    return rows;
  }

  // Get centers by type
  static async findByType(centerType) {
    const db = getDB();
    const query = `
      SELECT c.*, COUNT(ci.instructor_id) as instructor_count
      FROM centers c
      LEFT JOIN center_instructors ci ON c.id = ci.center_id AND ci.is_active = 1
      WHERE c.center_type = ? AND c.is_active = 1
      GROUP BY c.id
      ORDER BY c.name ASC
    `;
    const [rows] = await db.execute(query, [centerType]);
    return rows.map(row => new Center(row));
  }

  // Get center permissions
  static async getCenterPermissions(centerId) {
    const db = getDB();
    const query = `
      SELECT id, name, center_type,
             can_create_uae_courses, can_create_overseas_courses
      FROM centers
      WHERE id = ? AND is_active = 1
    `;
    const [rows] = await db.execute(query, [centerId]);
    return rows.length > 0 ? rows[0] : null;
  }

  // Get main center
  static async getMainCenter() {
    const db = getDB();
    const query = `
      SELECT * FROM centers
      WHERE center_type = 'main' AND is_active = 1
      LIMIT 1
    `;
    const [rows] = await db.execute(query);
    return rows.length > 0 ? new Center(rows[0]) : null;
  }
}
