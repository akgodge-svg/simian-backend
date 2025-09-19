// src/models/CourseCategory.js
import { getDB } from "../config/db.js";



export class CourseCategory {
  constructor(data = {}) {
    this.id = data?.id;
    this.name = data?.name;
    this.total_levels = data?.total_levels;
    this.category_duration_days = data?.category_duration_days;
    this.category_candidate_limit = data?.category_candidate_limit;
    this.enable_lpo_integration = data?.enable_lpo_integration ?? true;
    this.enable_inventory_tracking = data?.enable_inventory_tracking ?? true;
    this.inventory_card_required = data?.inventory_card_required ?? true;
    this.inventory_certificate_required = data?.inventory_certificate_required ?? true;
    this.is_active = data?.is_active ?? true;
    this.actual_level_count = data?.actual_level_count || 0;
  }

  // Get all active categories with level counts
  static async findAll() {
    const query = `
      SELECT
        cc.*,
        COUNT(ccl.id) as actual_level_count
      FROM course_categories cc
      LEFT JOIN course_category_levels ccl ON cc.id = ccl.category_id
      WHERE cc.is_active = 1
      GROUP BY cc.id
      ORDER BY cc.created_at DESC
    `;
    const [rows] = await pool.execute(query);
    return rows.map(row => new CourseCategory(row));
  }

  // Get single category by ID
  static async findById(id) {
    const query = `
      SELECT
        cc.*,
        COUNT(ccl.id) as actual_level_count
      FROM course_categories cc
      LEFT JOIN course_category_levels ccl ON cc.id = ccl.category_id
      WHERE cc.id = ? AND cc.is_active = 1
      GROUP BY cc.id
    `;
    const [rows] = await pool.execute(query, [id]);
    return rows.length > 0 ? new CourseCategory(rows[0]) : null;
  }

  // Create new category
  async save() {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const categoryQuery = `
        INSERT INTO course_categories (
          name, total_levels, category_duration_days,
          category_candidate_limit, enable_lpo_integration,
          enable_inventory_tracking, inventory_card_required,
          inventory_certificate_required
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const [result] = await connection.execute(categoryQuery, [
        this.name,
        this.total_levels,
        this.category_duration_days,
        this.category_candidate_limit,
        this.enable_lpo_integration,
        this.enable_inventory_tracking,
        this.inventory_card_required,
        this.inventory_certificate_required,
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

  // Update existing category
  async update() {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const updateQuery = `
        UPDATE course_categories SET
          name = ?,
          total_levels = ?,
          category_duration_days = ?,
          category_candidate_limit = ?,
          enable_lpo_integration = ?,
          enable_inventory_tracking = ?,
          inventory_card_required = ?,
          inventory_certificate_required = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      await connection.execute(updateQuery, [
        this.name,
        this.total_levels,
        this.category_duration_days,
        this.category_candidate_limit,
        this.enable_lpo_integration,
        this.enable_inventory_tracking,
        this.inventory_card_required,
        this.inventory_certificate_required,
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

  // Soft delete
  async delete() {
    const query = "UPDATE course_categories SET is_active = 0 WHERE id = ?";
    await pool.execute(query, [this.id]);
    return true;
  }

  // Check if category name exists
  static async nameExists(name, excludeId = null) {
    let query = "SELECT id FROM course_categories WHERE name = ? AND is_active = 1";
    let params = [name];
    if (excludeId) {
      query += " AND id != ?";
      params.push(excludeId);
    }
    const [rows] = await pool.execute(query, params);
    return rows.length > 0;
  }

  // Dropdown list for React
  static async getDropdownList() {
    const query = `
      SELECT id, name, total_levels, category_duration_days, category_candidate_limit
      FROM course_categories
      WHERE is_active = 1
      ORDER BY name ASC
    `;
    const [rows] = await pool.execute(query);
    return rows;
  }

  // DB test
  static async testConnection() {
    try {
      const connection = await pool.getConnection();
      console.log("✅ Database connected successfully");
      connection.release();
      return true;
    } catch (error) {
      console.error("❌ Database connection failed:", error.message);
      return false;
    }
  }
}
