import { getDB } from "../config/db.js";

export const createCourseTables = async () => {
  const db = getDB();

  try {
    // Create centers table first (referenced by other tables)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS centers (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        city VARCHAR(100) NOT NULL,
        country VARCHAR(100) NOT NULL,
        center_type ENUM('main', 'overseas') NOT NULL,
        can_create_uae_courses BOOLEAN DEFAULT 0,
        can_create_overseas_courses BOOLEAN DEFAULT 1,
        manager_name VARCHAR(255) NOT NULL,
        contact_phone VARCHAR(20),
        contact_email VARCHAR(255),
        is_active BOOLEAN DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_center_type (center_type),
        INDEX idx_is_active (is_active),
        INDEX idx_country (country)
      )
    `);

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

    // Create instructors table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS instructors (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(20),
        primary_center_id INT NOT NULL,
        username VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        last_login TIMESTAMP NULL,
        password_changed_at TIMESTAMP NULL,
        account_status ENUM('active', 'inactive', 'locked') DEFAULT 'active',
        max_concurrent_courses INT DEFAULT 2,
        is_active BOOLEAN DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (primary_center_id) REFERENCES centers(id),
        INDEX idx_email (email),
        INDEX idx_username (username),
        INDEX idx_primary_center (primary_center_id),
        INDEX idx_is_active (is_active)
      )
    `);

    // Create instructor_qualifications table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS instructor_qualifications (
        id INT PRIMARY KEY AUTO_INCREMENT,
        instructor_id INT NOT NULL,
        category_id INT NOT NULL,
        level_id INT NOT NULL,
        highest_level_qualified INT NOT NULL,
        certification_number VARCHAR(100),
        issue_date DATE,
        expiry_date DATE,
        certifying_body VARCHAR(255),
        verification_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
        verified_by INT NULL,
        verified_at TIMESTAMP NULL,
        is_active BOOLEAN DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (instructor_id) REFERENCES instructors(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES course_categories(id),
        FOREIGN KEY (level_id) REFERENCES course_category_levels(id),
        UNIQUE KEY unique_instructor_category (instructor_id, category_id),
        INDEX idx_instructor_id (instructor_id),
        INDEX idx_category_id (category_id),
        INDEX idx_verification_status (verification_status)
      )
    `);

    // Create instructor_earnings table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS instructor_earnings (
        id INT PRIMARY KEY AUTO_INCREMENT,
        instructor_id INT NOT NULL,
        category_id INT NOT NULL,
        earning_rate_per_candidate DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'AED',
        is_active BOOLEAN DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (instructor_id) REFERENCES instructors(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES course_categories(id),
        UNIQUE KEY unique_instructor_category_earnings (instructor_id, category_id),
        INDEX idx_instructor_id (instructor_id),
        INDEX idx_category_id (category_id)
      )
    `);

    // Create course_assignments table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS course_assignments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        instructor_id INT NOT NULL,
        course_id INT NOT NULL DEFAULT 0,
        category_id INT NOT NULL,
        level_id INT NOT NULL,
        assignment_status ENUM('assigned', 'completed', 'cancelled') DEFAULT 'assigned',
        course_start_date DATE NOT NULL,
        course_end_date DATE NOT NULL,
        assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_date TIMESTAMP NULL,
        FOREIGN KEY (instructor_id) REFERENCES instructors(id),
        FOREIGN KEY (category_id) REFERENCES course_categories(id),
        FOREIGN KEY (level_id) REFERENCES course_category_levels(id),
        INDEX idx_instructor_id (instructor_id),
        INDEX idx_category_level (category_id, level_id),
        INDEX idx_assignment_status (assignment_status),
        INDEX idx_course_dates (course_start_date, course_end_date)
      )
    `);

    // Create instructor_earnings_history table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS instructor_earnings_history (
        id INT PRIMARY KEY AUTO_INCREMENT,
        instructor_id INT NOT NULL,
        course_id INT NOT NULL DEFAULT 0,
        category_id INT NOT NULL,
        total_candidates INT NOT NULL,
        passed_candidates INT NOT NULL,
        earning_rate DECIMAL(10,2) NOT NULL,
        total_earnings DECIMAL(10,2) NOT NULL,
        payment_status ENUM('pending', 'paid', 'cancelled') DEFAULT 'pending',
        course_completion_date DATE,
        payment_date DATE NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (instructor_id) REFERENCES instructors(id),
        FOREIGN KEY (category_id) REFERENCES course_categories(id),
        INDEX idx_instructor_id (instructor_id),
        INDEX idx_payment_status (payment_status)
      )
    `);

    // Create instructor_documents table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS instructor_documents (
        id INT PRIMARY KEY AUTO_INCREMENT,
        instructor_id INT NOT NULL,
        category_id INT NOT NULL,
        document_type ENUM('card', 'certificate') NOT NULL,
        document_name VARCHAR(255) NOT NULL,
        original_filename VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size INT NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        card_certificate_number VARCHAR(100) NOT NULL,
        issue_date DATE NOT NULL,
        expiry_date DATE NOT NULL,
        certifying_body VARCHAR(255),
        upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        verification_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        verification_notes TEXT NULL,
        verified_by INT NULL,
        verified_at TIMESTAMP NULL,
        is_active BOOLEAN DEFAULT 1,
        FOREIGN KEY (instructor_id) REFERENCES instructors(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES course_categories(id),
        UNIQUE KEY unique_instructor_category_type (instructor_id, category_id, document_type),
        INDEX idx_instructor_id (instructor_id),
        INDEX idx_category_id (category_id),
        INDEX idx_expiry_date (expiry_date),
        INDEX idx_verification_status (verification_status),
        INDEX idx_document_type (document_type)
      )
    `);

    // Create document_expiry_notifications table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS document_expiry_notifications (
        id INT PRIMARY KEY AUTO_INCREMENT,
        document_id INT NOT NULL,
        instructor_id INT NOT NULL,
        category_id INT NOT NULL,
        document_type ENUM('card', 'certificate') NOT NULL,
        expiry_date DATE NOT NULL,
        notification_type ENUM('30_days', '15_days', '7_days', '1_day', 'expired') NOT NULL,
        notification_sent BOOLEAN DEFAULT 0,
        sent_to_emails TEXT,
        sent_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (document_id) REFERENCES instructor_documents(id) ON DELETE CASCADE,
        FOREIGN KEY (instructor_id) REFERENCES instructors(id),
        FOREIGN KEY (category_id) REFERENCES course_categories(id),
        INDEX idx_expiry_date (expiry_date),
        INDEX idx_notification_sent (notification_sent),
        INDEX idx_notification_type (notification_type)
      )
    `);

    // Create center_instructors table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS center_instructors (
        id INT PRIMARY KEY AUTO_INCREMENT,
        center_id INT NOT NULL,
        instructor_id INT NOT NULL,
        assigned_date DATE DEFAULT (CURRENT_DATE),
        is_primary_assignment BOOLEAN DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE CASCADE,
        UNIQUE KEY unique_center_instructor (center_id, instructor_id),
        INDEX idx_center_id (center_id),
        INDEX idx_instructor_id (instructor_id),
        INDEX idx_is_active (is_active)
      )
    `);

    // Insert default Main Center (Dubai)
    await db.execute(`
      INSERT INTO centers (
        name, address, city, country, center_type,
        can_create_uae_courses, can_create_overseas_courses,
        manager_name, contact_phone, contact_email
      ) VALUES (
        'Dubai Main Training Center',
        'Sheikh Zayed Road, Business Bay, Dubai, UAE',
        'Dubai',
        'United Arab Emirates',
        'main',
        1,
        1,
        'Main Center Manager',
        '+971-4-123-4567',
        'admin@trainingcenter.ae'
      )
    `);

    console.log("✅ All tables created successfully");
  } catch (error) {
    console.error("Error creating tables:", error);
  }
};