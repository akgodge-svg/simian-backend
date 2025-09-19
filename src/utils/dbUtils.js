import { getDB } from "../config/db.js";

export const createCourseTables = async () => {
  const db = getDB();

  try {
    // Create course_categories table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS course_categories (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        total_levels INT(2) NOT NULL DEFAULT 1 CHECK (total_levels BETWEEN 1 AND 10),
        category_duration_days INT NOT NULL CHECK (category_duration_days BETWEEN 1 AND 30),
        category_candidate_limit INT NOT NULL CHECK (category_candidate_limit > 0),
        enable_lpo_integration BOOLEAN DEFAULT 1,
        enable_inventory_tracking BOOLEAN DEFAULT 1,
        inventory_card_required BOOLEAN DEFAULT 1,
        inventory_certificate_required BOOLEAN DEFAULT 1,
        is_active BOOLEAN DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_is_active (is_active),
        INDEX idx_name (name)
      )
    `);

    // Create course_category_levels table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS course_category_levels (
        id INT PRIMARY KEY AUTO_INCREMENT,
        category_id INT NOT NULL,
        level_number INT NOT NULL,
        level_name VARCHAR(100) NOT NULL,
        requires_prerequisite BOOLEAN NOT NULL DEFAULT 0,
        prerequisite_level_number INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES course_categories(id) ON DELETE CASCADE,
        UNIQUE KEY unique_category_level (category_id, level_number),
        INDEX idx_category_id (category_id),
        INDEX idx_level_number (level_number)
      )
    `);

    console.log("✅ Course tables created successfully");
  } catch (error) {
    console.error("❌ Error creating course tables:", error);
  }
};
