import { getDB } from "../config/db.js";

export class CourseCategoryLevel {
  constructor(data = {}) {
    this.id = data?.id;
    this.category_id = data?.category_id;
    this.level_number = data?.level_number;
    this.level_name = data?.level_name;
    this.requires_prerequisite = data?.requires_prerequisite ?? false;
    this.prerequisite_level_number = data?.prerequisite_level_number;
  }

  // Get all levels for a category
  static async findByCategory(categoryId) {
    const pool = getDB();
    const query = `
      SELECT * FROM course_category_levels
      WHERE category_id = ?
      ORDER BY level_number ASC
    `;
    const [rows] = await pool.execute(query, [categoryId]);
    return rows.map(row => new CourseCategoryLevel(row));
  }

  // Create/Update levels for a category (replaces all existing levels)
  static async saveLevelsForCategory(categoryId, levels) {
    const pool = getDB();
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      // Delete existing levels for this category
      await connection.execute(
        "DELETE FROM course_category_levels WHERE category_id = ?",
        [categoryId]
      );

      // Insert new levels
      for (let i = 0; i < levels.length; i++) {
        const level = levels[i];
        const levelNumber = i + 1;

        const insertQuery = `
          INSERT INTO course_category_levels (
            category_id, level_number, level_name,
            requires_prerequisite, prerequisite_level_number
          ) VALUES (?, ?, ?, ?, ?)
        `;
        await connection.execute(insertQuery, [
          categoryId,
          levelNumber,
          level.level_name || `Level ${levelNumber}`,
          levelNumber > 1, // Level 1 = false, Level 2+ = true
          levelNumber > 1 ? levelNumber - 1 : null,
        ]);
      }

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Get levels for dropdown (simplified for React)
  static async getDropdownList(categoryId) {
    const pool = getDB();
    const query = `
      SELECT id, level_number, level_name, requires_prerequisite, prerequisite_level_number
      FROM course_category_levels
      WHERE category_id = ?
      ORDER BY level_number ASC
    `;
    const [rows] = await pool.execute(query, [categoryId]);
    return rows;
  }

  // Delete single level
  static async deleteLevel(levelId) {
    const pool = getDB();
    const query = "DELETE FROM course_category_levels WHERE id = ?";
    await pool.execute(query, [levelId]);
    return true;
  }

  // Update single level name
  async updateName() {
    const pool = getDB();
    const query = "UPDATE course_category_levels SET level_name = ? WHERE id = ?";
    await pool.execute(query, [this.level_name, this.id]);
    return this;
  }
}
