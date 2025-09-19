// src/services/db.setup.js
import { getDB } from "../config/db.js";

import bcrypt from "bcryptjs";
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();


export const createTables = async () => {
  const db = getDB();

    try{
// migrations/courseBookingDetails.js

  await db.execute(`
    USE training_management;
  `);

  // =====================================================
  // COURSE BOOKING DETAILS SYSTEM - DATABASE SCHEMA
  // =====================================================

  // Update existing course_bookings table to add instructor lockout
  await db.execute(`
    ALTER TABLE course_bookings
      ADD COLUMN instructor_locked BOOLEAN DEFAULT 0 AFTER booking_status,
      ADD COLUMN completed_at TIMESTAMP NULL AFTER instructor_locked,
      ADD COLUMN admin_notes TEXT NULL AFTER completed_at;
  `);

  // Create course_candidates table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS course_candidates (
      id INT PRIMARY KEY AUTO_INCREMENT,
      booking_id INT NOT NULL,
      first_name VARCHAR(50) NOT NULL,
      last_name VARCHAR(50) NOT NULL,
      gender ENUM('male', 'female', 'other') NOT NULL,
      date_of_birth DATE NOT NULL,
      company_id INT NOT NULL,
      employee_id VARCHAR(50) NOT NULL,
      photo_path VARCHAR(255) NULL,
      card_type ENUM('new', 'renewal') NOT NULL,
      previous_card_number VARCHAR(50) NULL,
      level_1_card_number VARCHAR(50) NULL,
      candidate_status ENUM('active', 'inactive', 'passed', 'failed') DEFAULT 'active',
      assessment_comments TEXT NULL,
      is_active BOOLEAN DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES course_bookings(id) ON DELETE CASCADE,
      FOREIGN KEY (company_id) REFERENCES customers(id),
      UNIQUE KEY unique_employee_per_company (company_id, employee_id),
      INDEX idx_booking_id (booking_id),
      INDEX idx_candidate_status (candidate_status),
      INDEX idx_company_id (company_id),
      INDEX idx_is_active (is_active)
    );
  `);

  // Create candidate_attendance table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS candidate_attendance (
      id INT PRIMARY KEY AUTO_INCREMENT,
      candidate_id INT NOT NULL,
      attendance_date DATE NOT NULL,
      is_present BOOLEAN DEFAULT 1,
      marked_by_user VARCHAR(100) NOT NULL,
      marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      notes TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES course_candidates(id) ON DELETE CASCADE,
      UNIQUE KEY unique_attendance_per_day (candidate_id, attendance_date),
      INDEX idx_candidate_id (candidate_id),
      INDEX idx_attendance_date (attendance_date),
      INDEX idx_is_present (is_present)
    );
  `);

  // Create course_documents table (paperwork)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS course_documents (
      id INT PRIMARY KEY AUTO_INCREMENT,
      booking_id INT NOT NULL,
      document_type ENUM('paperwork', 'assessment') NOT NULL,
      original_filename VARCHAR(255) NOT NULL,
      stored_filename VARCHAR(255) NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      file_size INT NOT NULL,
      mime_type VARCHAR(100) NOT NULL,
      uploaded_by_user VARCHAR(100) NOT NULL,
      is_active BOOLEAN DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES course_bookings(id) ON DELETE CASCADE,
      INDEX idx_booking_id (booking_id),
      INDEX idx_document_type (document_type),
      INDEX idx_is_active (is_active)
    );
  `);

  // Create candidate_cards table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS candidate_cards (
      id INT PRIMARY KEY AUTO_INCREMENT,
      candidate_id INT NOT NULL,
      application_status ENUM('not_applied', 'applied', 'approved', 'rejected') DEFAULT 'not_applied',
      print_status ENUM('not_printed', 'printed') DEFAULT 'not_printed',
      card_image_path VARCHAR(255) NULL,
      card_number VARCHAR(50) NULL,
      status_updated_by VARCHAR(100) NULL,
      status_updated_at TIMESTAMP NULL,
      is_active BOOLEAN DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES course_candidates(id) ON DELETE CASCADE,
      INDEX idx_candidate_id (candidate_id),
      INDEX idx_application_status (application_status),
      INDEX idx_print_status (print_status)
    );
  `);

  // Create candidate_certificates table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS candidate_certificates (
      id INT PRIMARY KEY AUTO_INCREMENT,
      candidate_id INT NOT NULL,
      application_status ENUM('not_applied', 'applied', 'approved', 'rejected') DEFAULT 'not_applied',
      print_status ENUM('not_printed', 'printed') DEFAULT 'not_printed',
      certificate_image_path VARCHAR(255) NULL,
      certificate_number VARCHAR(50) NULL,
      status_updated_by VARCHAR(100) NULL,
      status_updated_at TIMESTAMP NULL,
      is_active BOOLEAN DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES course_candidates(id) ON DELETE CASCADE,
      INDEX idx_candidate_id (candidate_id),
      INDEX idx_application_status (application_status),
      INDEX idx_print_status (print_status)
    );
  `);

  // Create admin_po_records table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS admin_po_records (
      id INT PRIMARY KEY AUTO_INCREMENT,
      booking_id INT NOT NULL,
      branch_name VARCHAR(100) NOT NULL,
      company_id INT NOT NULL,
      nocn_number VARCHAR(100) NOT NULL,
      created_by_user VARCHAR(100) NOT NULL,
      is_active BOOLEAN DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES course_bookings(id) ON DELETE CASCADE,
      FOREIGN KEY (company_id) REFERENCES customers(id),
      INDEX idx_booking_id (booking_id),
      INDEX idx_company_id (company_id),
      INDEX idx_nocn_number (nocn_number)
    );
  `);

  // Create admin_cwa_records table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS admin_cwa_records (
      id INT PRIMARY KEY AUTO_INCREMENT,
      po_record_id INT NOT NULL,
      cwa_number VARCHAR(100) NOT NULL,
      created_by_user VARCHAR(100) NOT NULL,
      is_active BOOLEAN DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (po_record_id) REFERENCES admin_po_records(id) ON DELETE CASCADE,
      INDEX idx_po_record_id (po_record_id),
      INDEX idx_cwa_number (cwa_number)
    );
  `);

  // Create course_completion_certificates table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS course_completion_certificates (
      id INT PRIMARY KEY AUTO_INCREMENT,
      booking_id INT NOT NULL,
      certificate_id VARCHAR(50) NOT NULL UNIQUE,
      generated_by_user VARCHAR(100) NOT NULL,
      generation_count INT DEFAULT 1,
      last_generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      certificate_data JSON NULL,
      is_active BOOLEAN DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES course_bookings(id) ON DELETE CASCADE,
      INDEX idx_booking_id (booking_id),
      INDEX idx_certificate_id (certificate_id)
    );
  `);

  // Create client_invoices table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS client_invoices (
      id INT PRIMARY KEY AUTO_INCREMENT,
      booking_id INT NOT NULL,
      company_id INT NOT NULL,
      invoice_number VARCHAR(100) NOT NULL,
      invoice_date DATE NOT NULL,
      payment_status ENUM('paid', 'not_paid', 'awaiting_payment') DEFAULT 'not_paid',
      payment_date DATE NULL,
      created_by_user VARCHAR(100) NOT NULL,
      is_active BOOLEAN DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES course_bookings(id) ON DELETE CASCADE,
      FOREIGN KEY (company_id) REFERENCES customers(id),
      INDEX idx_booking_id (booking_id),
      INDEX idx_company_id (company_id),
      INDEX idx_payment_status (payment_status),
      INDEX idx_invoice_number (invoice_number)
    );
  `);

  // Create transmittal_records table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS transmittal_records (
      id INT PRIMARY KEY AUTO_INCREMENT,
      invoice_id INT NOT NULL,
      transmittal_number VARCHAR(50) NOT NULL UNIQUE,
      delivery_type ENUM('self_pickup', 'by_vendor') NOT NULL,
      pickup_person_name VARCHAR(100) NULL,
      pickup_date DATE NULL,
      pickup_employee_id VARCHAR(50) NULL,
      vendor_status VARCHAR(100) NULL,
      transmittal_copy_path VARCHAR(255) NULL,
      selected_candidates JSON NOT NULL,
      created_by_user VARCHAR(100) NOT NULL,
      is_active BOOLEAN DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES client_invoices(id) ON DELETE CASCADE,
      INDEX idx_invoice_id (invoice_id),
      INDEX idx_transmittal_number (transmittal_number),
      INDEX idx_delivery_type (delivery_type)
    );
  `);

  // Create download_logs table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS download_logs (
      id INT PRIMARY KEY AUTO_INCREMENT,
      booking_id INT NOT NULL,
      downloaded_by_user VARCHAR(100) NOT NULL,
      download_type ENUM('excel', 'zip', 'combined') NOT NULL,
      file_size INT NULL,
      download_status ENUM('success', 'failed') DEFAULT 'success',
      error_message TEXT NULL,
      ip_address VARCHAR(45) NULL,
      user_agent TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES course_bookings(id) ON DELETE CASCADE,
      INDEX idx_booking_id (booking_id),
      INDEX idx_downloaded_by_user (downloaded_by_user),
      INDEX idx_download_type (download_type),
      INDEX idx_created_at (created_at)
    );
  `);

  // Create indexes for better performance
  await db.execute(`
    ALTER TABLE course_booking_customers ADD INDEX IF NOT EXISTS idx_booking_customer_combined (booking_id, customer_id);
  `).catch(() => { /* ignore if index exists or ALTER with IF NOT EXISTS unsupported */ });

  await db.execute(`
    ALTER TABLE course_bookings ADD INDEX IF NOT EXISTS idx_booking_status_center (booking_status, created_by_center_id);
  `).catch(() => { /* ignore if index exists or ALTER with IF NOT EXISTS unsupported */ });

  await db.execute(`
    ALTER TABLE course_bookings ADD INDEX IF NOT EXISTS idx_course_type_status (course_type, booking_status);
  `).catch(() => { /* ignore if index exists or ALTER with IF NOT EXISTS unsupported */ });

  // Create triggers to maintain LPO balance & statuses
  // NOTE: if your connector does not support DELIMITER blocks, run these trigger statements directly in the MySQL shell.
  await db.execute(`
    DELIMITER $$
    CREATE TRIGGER IF NOT EXISTS update_candidate_status_on_attendance
    AFTER UPDATE ON candidate_attendance
    FOR EACH ROW
    BEGIN
      IF NEW.is_present = 0 AND OLD.is_present = 1 THEN
        -- Mark candidate as inactive if marked absent
        UPDATE course_candidates
        SET candidate_status = 'inactive'
        WHERE id = NEW.candidate_id AND candidate_status = 'active';
      ELSEIF NEW.is_present = 1 AND OLD.is_present = 0 THEN
        -- Mark candidate as active if marked present again
        UPDATE course_candidates
        SET candidate_status = 'active'
        WHERE id = NEW.candidate_id AND candidate_status = 'inactive';
      END IF;
    END$$

    CREATE TRIGGER IF NOT EXISTS auto_apply_po_status
    AFTER INSERT ON admin_po_records
    FOR EACH ROW
    BEGIN
      -- Auto-change candidate status to 'applied' when PO is added
      UPDATE course_candidates cc
      JOIN course_booking_customers cbc ON cc.company_id = cbc.customer_id
      SET cc.candidate_status = 'applied'
      WHERE cbc.booking_id = NEW.booking_id
        AND cc.company_id = NEW.company_id
        AND cc.candidate_status = 'passed';
    END$$

    CREATE TRIGGER IF NOT EXISTS auto_approve_cwa_status
    AFTER INSERT ON admin_cwa_records
    FOR EACH ROW
    BEGIN
      -- Auto-change candidate status to 'approved' when CWA is added
      UPDATE course_candidates cc
      JOIN course_booking_customers cbc ON cc.company_id = cbc.customer_id
      JOIN admin_po_records apr ON apr.company_id = cbc.customer_id
      SET cc.candidate_status = 'approved'
      WHERE apr.id = NEW.po_record_id
        AND cc.candidate_status = 'applied';
    END$$
    DELIMITER ;
  `)
    


//   create and update course booking code and documents

  await db.execute(`
    USE training_management;
  `);

  // Add duration_days and max_participants to course_categories
  await db.execute(`
    ALTER TABLE course_categories
      ADD COLUMN duration_days INT DEFAULT 5 AFTER description,
      ADD COLUMN max_participants INT DEFAULT 12 AFTER duration_days;
  `);

  // Remove fields from course_category_levels if they exist
  await db.execute(`
    ALTER TABLE course_category_levels
      DROP COLUMN IF EXISTS duration_days,
      DROP COLUMN IF EXISTS max_participants;
  `);

  // Update existing categories with proper values
  await db.execute(`
    UPDATE course_categories
    SET duration_days = 5, max_participants = 12
    WHERE name LIKE '%CISRS%';
  `);

  await db.execute(`
    UPDATE course_categories
    SET duration_days = 3, max_participants = 15
    WHERE name LIKE '%PASMA%';
  `);

  await db.execute(`
    UPDATE course_categories
    SET duration_days = 2, max_participants = 10
    WHERE name LIKE '%Ladder%';
  `);

  // Create course booking sequence table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS course_booking_sequence (
      id INT PRIMARY KEY AUTO_INCREMENT,
      course_type ENUM('uae', 'overseas') NOT NULL,
      year INT NOT NULL,
      last_number INT DEFAULT 0,
      UNIQUE KEY unique_sequence (course_type, year)
    );
  `);

  // Initialize sequences for current year (kept 2024 as provided)
  await db.execute(`
    INSERT IGNORE INTO course_booking_sequence (course_type, year, last_number) VALUES
      ('uae', 2024, 0),
      ('overseas', 2024, 0);
  `);

  // Create course bookings table (no venue_details field)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS course_bookings (
      id INT PRIMARY KEY AUTO_INCREMENT,
      course_number VARCHAR(20) NOT NULL UNIQUE,
      course_type ENUM('uae', 'overseas') NOT NULL,
      center_id INT NOT NULL,
      category_id INT NOT NULL,
      level_id INT NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      duration_days INT NOT NULL,
      max_participants INT NOT NULL,
      delivery_type ENUM('onsite', 'offsite') NOT NULL,
      actual_instructor_id INT NOT NULL,
      document_instructor_id INT NOT NULL,
      booking_status ENUM('not_started', 'in_progress', 'completed', 'cancelled') DEFAULT 'not_started',
      created_by_user VARCHAR(100) NULL,
      created_by_center_id INT NOT NULL,
      notes TEXT NULL,
      is_active BOOLEAN DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (center_id) REFERENCES centers(id),
      FOREIGN KEY (category_id) REFERENCES course_categories(id),
      FOREIGN KEY (level_id) REFERENCES course_category_levels(id),
      FOREIGN KEY (actual_instructor_id) REFERENCES instructors(id),
      FOREIGN KEY (document_instructor_id) REFERENCES instructors(id),
      FOREIGN KEY (created_by_center_id) REFERENCES centers(id),
      INDEX idx_course_number (course_number),
      INDEX idx_course_type (course_type),
      INDEX idx_center_id (center_id),
      INDEX idx_booking_status (booking_status),
      INDEX idx_start_date (start_date),
      INDEX idx_is_active (is_active)
    );
  `);

  // Create course booking customers table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS course_booking_customers (
      id INT PRIMARY KEY AUTO_INCREMENT,
      booking_id INT NOT NULL,
      customer_id INT NOT NULL,
      lpo_line_item_id INT NULL,
      participants_count INT NOT NULL DEFAULT 0,
      customer_notes TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES course_bookings(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (lpo_line_item_id) REFERENCES lpo_line_items(id) ON DELETE SET NULL,
      UNIQUE KEY unique_booking_customer (booking_id, customer_id),
      INDEX idx_booking_id (booking_id),
      INDEX idx_customer_id (customer_id),
      INDEX idx_lpo_line_item_id (lpo_line_item_id)
    );
  `);

  // Create course booking notifications table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS course_booking_notifications (
      id INT PRIMARY KEY AUTO_INCREMENT,
      booking_id INT NOT NULL,
      notification_type ENUM('booking_created', 'booking_updated', 'booking_cancelled') NOT NULL,
      sent_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      recipients_list TEXT NOT NULL,
      email_status ENUM('sent', 'failed', 'pending') DEFAULT 'pending',
      error_message TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES course_bookings(id) ON DELETE CASCADE,
      INDEX idx_booking_id (booking_id),
      INDEX idx_notification_type (notification_type),
      INDEX idx_email_status (email_status)
    );
  `);



//   center code here  
  try {
    await db.execute(`
    DROP TABLE IF EXISTS centers;
    CREATE TABLE centers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    center_type ENUM('main', 'overseas') NOT NULL,
    can_create_uae_courses BOOLEAN DEFAULT 0,
    can_create_overseas_courses BOOLEAN DEFAULT 1,
    manager_name VARCHAR(255),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    timezone VARCHAR(50) DEFAULT 'UTC',
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_center_type (center_type),
    INDEX idx_is_active (is_active),
    INDEX idx_country (country)
    );
    `);

    await db.execute(`DROP TABLE IF EXISTS center_instructors;
CREATE TABLE center_instructors (
id INT PRIMARY KEY AUTO_INCREMENT,
center_id INT NOT NULL,
instructor_id INT NOT NULL,
assigned_by INT NULL,
assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
is_primary_assignment BOOLEAN DEFAULT 0,
assignment_status ENUM('active', 'inactive', 'temporary') DEFAULT 'active',
assignment_notes TEXT NULL,
is_active BOOLEAN DEFAULT 1,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE CASCADE,
FOREIGN KEY (instructor_id) REFERENCES instructors(id) ON DELETE CASCADE,
UNIQUE KEY unique_center_instructor (center_id, instructor_id),
INDEX idx_center_id (center_id),
INDEX idx_instructor_id (instructor_id),
INDEX idx_assignment_status (assignment_status)
);`);
    await db.execute(`CREATE TABLE center_permissions (
id INT PRIMARY KEY AUTO_INCREMENT,
center_id INT NOT NULL,
permission_name VARCHAR(100) NOT NULL,
permission_value BOOLEAN DEFAULT 1,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE CASCADE,
UNIQUE KEY unique_center_permission (center_id, permission_name),
INDEX idx_center_id (center_id),
INDEX idx_permission_name (permission_name)
);`);

    await db.execute(`CREATE TABLE center_statistics (
id INT PRIMARY KEY AUTO_INCREMENT,
center_id INT NOT NULL,
total_instructors INT DEFAULT 0,
total_courses INT DEFAULT 0,
total_customers INT DEFAULT 0,
active_bookings INT DEFAULT 0,
last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE CASCADE,
UNIQUE KEY unique_center_stats (center_id),
INDEX idx_center_id (center_id)
);`);

    await db.execute(`INSERT INTO centers (name, address, city, country, center_type, can_create_uae_courses, can_create_overseas_courses, manager_name, contact_email) VALUES
('Dubai Main Training Center', 'Sheikh Zayed Road, Dubai', 'Dubai', 'UAE', 'main', 1, 1, 'Ahmed Al Rashid', 'admin@trainingcenter.ae'),
('Nigeria Training Center', 'Lagos Business District', 'Lagos', 'Nigeria', 'overseas', 0, 1, 'John Okafor', 'nigeria@trainingcenter.com'),
('Kenya Training Center', 'Nairobi Central', 'Nairobi', 'Kenya', 'overseas', 0, 1, 'Mary Wanjiku', 'kenya@trainingcenter.com'),
('Bangladesh Training Center', 'Dhaka Commercial Area', 'Dhaka', 'Bangladesh', 'overseas', 0, 1, 'Rahman Ahmed', 'bangladesh@trainingcenter.com');`);

    await db.execute(`INSERT INTO center_permissions (center_id, permission_name, permission_value)
SELECT
c.id,
p.permission_name,
CASE
WHEN c.center_type = 'main' THEN 1
WHEN p.permission_name IN ('create_overseas_courses', 'manage_own_instructors', 'manage_own_customers') THEN 1
ELSE 0
END as permission_value
FROM centers c
CROSS JOIN (
SELECT 'create_uae_courses' as permission_name
UNION SELECT 'create_overseas_courses'
UNION SELECT 'access_lpo_system'
UNION SELECT 'manage_all_instructors'
UNION SELECT 'manage_own_instructors'
UNION SELECT 'manage_all_customers'
UNION SELECT 'manage_own_customers'
UNION SELECT 'view_global_reports'
UNION SELECT 'manage_center_settings'
) p;`);

    await db.execute(`INSERT INTO center_statistics (center_id, total_instructors, total_courses, total_customers, active_bookings)
SELECT id, 0, 0, 0, 0 FROM centers;`);


//   LPO update 

await db.execute(`
    USE training_management
  `);
  
  await db.execute(`
    DROP TABLE IF EXISTS lpo_sequence
  `);
  
  await db.execute(`
    ALTER TABLE lpo_orders
    MODIFY COLUMN lpo_number VARCHAR(100) NOT NULL,
    ADD COLUMN lpo_file_path VARCHAR(500) NULL AFTER notes,
    ADD COLUMN lpo_file_name VARCHAR(255) NULL AFTER lpo_file_path,
    ADD COLUMN lpo_file_size INT NULL AFTER lpo_file_name,
    ADD COLUMN lpo_file_type VARCHAR(100) NULL AFTER lpo_file_size,
    ADD COLUMN lpo_uploaded_at TIMESTAMP NULL AFTER lpo_file_type
  `);
  
  await db.execute(`
    CREATE TABLE IF NOT EXISTS lpo_notifications (
      id INT PRIMARY KEY AUTO_INCREMENT,
      lpo_id INT NOT NULL,
      notification_type ENUM('created', 'expiry_15_days') NOT NULL,
      sent_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      recipients_list TEXT NOT NULL,
      email_status ENUM('sent', 'failed', 'pending') DEFAULT 'pending',
      attachment_sent BOOLEAN DEFAULT 0,
      error_message TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lpo_id) REFERENCES lpo_orders(id) ON DELETE CASCADE,
      INDEX idx_lpo_id (lpo_id),
      INDEX idx_notification_type (notification_type),
      INDEX idx_email_status (email_status)
    )
  `);

    // -- Create inventory_items table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS inventory_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        item_type ENUM('card', 'certificate') NOT NULL,
        category_id INT NOT NULL,
        level_id INT NOT NULL,
        item_name VARCHAR(255) NOT NULL,
        current_stock INT DEFAULT 0,
        minimum_threshold INT DEFAULT 10,
        is_active BOOLEAN DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES course_categories(id),
        FOREIGN KEY (level_id) REFERENCES course_category_levels(id),
        UNIQUE KEY unique_inventory_item (item_type, category_id, level_id),
        INDEX idx_item_type (item_type),
        INDEX idx_category_level (category_id, level_id),
        INDEX idx_current_stock (current_stock),
        INDEX idx_is_active (is_active)
      );
    `);

    // -- Create inventory_transactions table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS inventory_transactions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        inventory_item_id INT NOT NULL,
        transaction_type ENUM('add', 'deduct') NOT NULL,
        quantity INT NOT NULL,
        previous_stock INT NOT NULL,
        new_stock INT NOT NULL,
        reference_type ENUM('manual', 'card_printed', 'certificate_printed') NOT NULL,
        reference_id INT NULL COMMENT 'candidate_id for printed items, NULL for manual',
        notes TEXT NULL,
        created_by_user VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE CASCADE,
        INDEX idx_inventory_item_id (inventory_item_id),
        INDEX idx_transaction_type (transaction_type),
        INDEX idx_reference_type (reference_type),
        INDEX idx_created_at (created_at)
      );
    `);

    // -- Trigger for card printing
    await db.execute(`
      CREATE TRIGGER auto_deduct_card_inventory
      AFTER UPDATE ON candidate_cards
      FOR EACH ROW
      BEGIN
        DECLARE v_category_id INT;
        DECLARE v_level_id INT;
        DECLARE v_inventory_item_id INT;
        DECLARE v_current_stock INT;

        -- Only trigger when print_status changes from 'not_printed' to 'printed'
        IF OLD.print_status = 'not_printed' AND NEW.print_status = 'printed' THEN
          -- Get category and level for this candidate
          SELECT
            cb.category_id,
            cb.level_id
          INTO v_category_id, v_level_id
          FROM candidate_cards cc
          JOIN course_candidates cand ON cc.candidate_id = cand.id
          JOIN course_bookings cb ON cand.booking_id = cb.id
          WHERE cc.id = NEW.id;

          -- Find matching inventory item
          SELECT id, current_stock
          INTO v_inventory_item_id, v_current_stock
          FROM inventory_items
          WHERE item_type = 'card'
            AND category_id = v_category_id
            AND level_id = v_level_id
            AND is_active = 1;

          -- If inventory item exists, deduct stock
          IF v_inventory_item_id IS NOT NULL THEN
            -- Update stock (only if current stock > 0)
            IF v_current_stock > 0 THEN
              UPDATE inventory_items
              SET current_stock = current_stock - 1,
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = v_inventory_item_id;

              -- Log transaction
              INSERT INTO inventory_transactions (
                inventory_item_id, transaction_type, quantity,
                previous_stock, new_stock, reference_type, reference_id,
                notes, created_by_user
              ) VALUES (
                v_inventory_item_id, 'deduct', 1,
                v_current_stock, v_current_stock - 1, 'card_printed', NEW.candidate_id,
                CONCAT('Auto-deducted for card printing - Candidate ID: ', NEW.candidate_id),
                'system'
              );
            END IF;
          END IF;
        END IF;
      END;
    `);

    // -- Trigger for certificate printing
    await db.execute(`
      CREATE TRIGGER auto_deduct_certificate_inventory
      AFTER UPDATE ON candidate_certificates
      FOR EACH ROW
      BEGIN
        DECLARE v_category_id INT;
        DECLARE v_level_id INT;
        DECLARE v_inventory_item_id INT;
        DECLARE v_current_stock INT;

        -- Only trigger when print_status changes from 'not_printed' to 'printed'
        IF OLD.print_status = 'not_printed' AND NEW.print_status = 'printed' THEN
          -- Get category and level for this candidate
          SELECT
            cb.category_id,
            cb.level_id
          INTO v_category_id, v_level_id
          FROM candidate_certificates cert
          JOIN course_candidates cand ON cert.candidate_id = cand.id
          JOIN course_bookings cb ON cand.booking_id = cb.id
          WHERE cert.id = NEW.id;

          -- Find matching inventory item
          SELECT id, current_stock
          INTO v_inventory_item_id, v_current_stock
          FROM inventory_items
          WHERE item_type = 'certificate'
            AND category_id = v_category_id
            AND level_id = v_level_id
            AND is_active = 1;

          -- If inventory item exists, deduct stock
          IF v_inventory_item_id IS NOT NULL THEN
            -- Update stock (only if current stock > 0)
            IF v_current_stock > 0 THEN
              UPDATE inventory_items
              SET current_stock = current_stock - 1,
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = v_inventory_item_id;

              -- Log transaction
              INSERT INTO inventory_transactions (
                inventory_item_id, transaction_type, quantity,
                previous_stock, new_stock, reference_type, reference_id,
                notes, created_by_user
              ) VALUES (
                v_inventory_item_id, 'deduct', 1,
                v_current_stock, v_current_stock - 1, 'certificate_printed', NEW.candidate_id,
                CONCAT('Auto-deducted for certificate printing - Candidate ID: ', NEW.candidate_id),
                'system'
              );
            END IF;
          END IF;
        END IF;
      END;
    `);

    // -- Insert initial inventory items (example data)
    await db.execute(`
      INSERT IGNORE INTO inventory_items (item_type, category_id, level_id, item_name, current_stock, minimum_threshold)
      SELECT
        'card' as item_type,
        cc.id as category_id,
        ccl.id as level_id,
        CONCAT(cc.name, ' - ', ccl.level_name, ' Card') as item_name,
        0 as current_stock,
        10 as minimum_threshold
      FROM course_categories cc
      JOIN course_category_levels ccl ON cc.id = ccl.category_id
      WHERE cc.is_active = 1 AND ccl.is_active = 1;
    `);

    await db.execute(`
      INSERT IGNORE INTO inventory_items (item_type, category_id, level_id, item_name, current_stock, minimum_threshold)
      SELECT
        'certificate' as item_type,
        cc.id as category_id,
        ccl.id as level_id,
        CONCAT(cc.name, ' - ', ccl.level_name, ' Certificate') as item_name,
        0 as current_stock,
        10 as minimum_threshold
      FROM course_categories cc
      JOIN course_category_levels ccl ON cc.id = ccl.category_id
      WHERE cc.is_active = 1 AND ccl.is_active = 1;
    `);

    // -- =====================================================
    // -- INTEGRATED CHAT SYSTEM WITH PUSHER SETTINGS
    // -- =====================================================

    // -- Create pusher_settings table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS pusher_settings (
        id INT PRIMARY KEY AUTO_INCREMENT,
        app_id VARCHAR(100) NOT NULL,
        app_key VARCHAR(100) NOT NULL,
        app_secret VARCHAR(255) NOT NULL,
        cluster VARCHAR(50) NOT NULL DEFAULT 'us2',
        use_tls BOOLEAN DEFAULT 1,
        is_active BOOLEAN DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_is_active (is_active)
      );
    `);

    // -- Create chat_channels table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS chat_channels (
        id INT PRIMARY KEY AUTO_INCREMENT,
        channel_name VARCHAR(255) NOT NULL UNIQUE,
        channel_type ENUM('global', 'center', 'course', 'direct') NOT NULL,
        channel_title VARCHAR(255) NOT NULL,
        description TEXT NULL,
        center_id INT NULL COMMENT 'For center-specific channels',
        course_booking_id INT NULL COMMENT 'For course-specific channels',
        created_by_user VARCHAR(100) NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE SET NULL,
        FOREIGN KEY (course_booking_id) REFERENCES course_bookings(id) ON DELETE SET NULL,
        INDEX idx_channel_type (channel_type),
        INDEX idx_center_id (center_id),
        INDEX idx_course_booking_id (course_booking_id),
        INDEX idx_is_active (is_active)
      );
    `);

    // -- Create chat_participants table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS chat_participants (
        id INT PRIMARY KEY AUTO_INCREMENT,
        channel_id INT NOT NULL,
        user_name VARCHAR(100) NOT NULL,
        user_role ENUM('admin', 'instructor', 'center_admin', 'staff') NOT NULL,
        center_id INT NULL COMMENT 'User center context',
        display_name VARCHAR(255) NOT NULL,
        avatar_url VARCHAR(500) NULL,
        is_online BOOLEAN DEFAULT 0,
        last_seen TIMESTAMP NULL,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT 1,
        FOREIGN KEY (channel_id) REFERENCES chat_channels(id) ON DELETE CASCADE,
        FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE SET NULL,
        UNIQUE KEY unique_user_channel (channel_id, user_name),
        INDEX idx_channel_id (channel_id),
        INDEX idx_user_name (user_name),
        INDEX idx_user_role (user_role),
        INDEX idx_is_online (is_online),
        INDEX idx_is_active (is_active)
      );
    `);

    // -- Create chat_messages table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INT PRIMARY KEY AUTO_INCREMENT,
        channel_id INT NOT NULL,
        sender_user_name VARCHAR(100) NOT NULL,
        sender_display_name VARCHAR(255) NOT NULL,
        sender_role VARCHAR(50) NOT NULL,
        message_type ENUM('text', 'file', 'image', 'system') DEFAULT 'text',
        message_content TEXT NOT NULL,
        file_url VARCHAR(500) NULL,
        file_name VARCHAR(255) NULL,
        file_size INT NULL,
        reply_to_message_id INT NULL COMMENT 'For reply functionality',
        is_edited BOOLEAN DEFAULT 0,
        edited_at TIMESTAMP NULL,
        is_deleted BOOLEAN DEFAULT 0,
        deleted_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (channel_id) REFERENCES chat_channels(id) ON DELETE CASCADE,
        FOREIGN KEY (reply_to_message_id) REFERENCES chat_messages(id) ON DELETE SET NULL,
        INDEX idx_channel_id (channel_id),
        INDEX idx_sender_user_name (sender_user_name),
        INDEX idx_message_type (message_type),
        INDEX idx_created_at (created_at),
        INDEX idx_is_deleted (is_deleted)
      );
    `);

    // -- Create chat_message_reads table (for read receipts)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS chat_message_reads (
        id INT PRIMARY KEY AUTO_INCREMENT,
        message_id INT NOT NULL,
        channel_id INT NOT NULL,
        reader_user_name VARCHAR(100) NOT NULL,
        read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE,
        FOREIGN KEY (channel_id) REFERENCES chat_channels(id) ON DELETE CASCADE,
        UNIQUE KEY unique_message_reader (message_id, reader_user_name),
        INDEX idx_message_id (message_id),
        INDEX idx_channel_id (channel_id),
        INDEX idx_reader_user_name (reader_user_name)
      );
    `);

    // -- Insert default channels
    await db.execute(`
      INSERT IGNORE INTO chat_channels (channel_name, channel_type, channel_title, description, created_by_user)
      VALUES
        ('global-general', 'global', 'General Discussion', 'Global chat for all users across the system', 'system'),
        ('global-announcements', 'global', 'Announcements', 'System-wide announcements and important updates', 'system'),
        ('global-support', 'global', 'Technical Support', 'Technical support and help desk', 'system');
    `);

    // -- Insert default Pusher settings (placeholder - replace with your actual keys)
    await db.execute(`
      INSERT IGNORE INTO pusher_settings (app_id, app_key, app_secret, cluster, is_active)
      VALUES
        ('your-app-id', 'your-app-key', 'your-app-secret', 'us2', 1);
    `);

    // -- =====================================================
    // -- MICROSOFT 365 EMAIL INTEGRATION SYSTEM
    // -- =====================================================

    // -- Create m365_app_settings table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS m365_app_settings (
        id INT PRIMARY KEY AUTO_INCREMENT,
        client_id VARCHAR(255) NOT NULL,
        client_secret TEXT NOT NULL COMMENT 'Encrypted client secret',
        tenant_id VARCHAR(255) NOT NULL,
        redirect_uri VARCHAR(500) NOT NULL,
        scopes TEXT NOT NULL DEFAULT 'https://graph.microsoft.com/Mail.ReadWrite
        https://graph.microsoft.com/User.Read',
        is_active BOOLEAN DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_is_active (is_active)
      );
    `);

    // -- Create user_m365_tokens table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS user_m365_tokens (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_name VARCHAR(100) NOT NULL,
        access_token TEXT NOT NULL COMMENT 'Encrypted access token',
        refresh_token TEXT NOT NULL COMMENT 'Encrypted refresh token',
        token_expires_at TIMESTAMP NOT NULL,
        scope TEXT NOT NULL,
        email_address VARCHAR(255) NOT NULL,
        display_name VARCHAR(255),
        is_active BOOLEAN DEFAULT 1,
        last_sync_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_email (user_name, email_address),
        INDEX idx_user_name (user_name),
        INDEX idx_email_address (email_address),
        INDEX idx_token_expires_at (token_expires_at),
        INDEX idx_is_active (is_active)
      );
    `);

    // -- Create email_cache table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS email_cache (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_name VARCHAR(100) NOT NULL,
        email_id VARCHAR(255) NOT NULL,
        folder_name VARCHAR(100) NOT NULL,
        subject VARCHAR(500),
        sender_email VARCHAR(255),
        sender_name VARCHAR(255),
        recipients TEXT COMMENT 'JSON array of recipients',
        body_preview TEXT,
        body_content LONGTEXT,
        has_attachments BOOLEAN DEFAULT 0,
        attachment_count INT DEFAULT 0,
        is_read BOOLEAN DEFAULT 0,
        importance ENUM('low', 'normal', 'high') DEFAULT 'normal',
        received_at TIMESTAMP,
        cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT 1,
        UNIQUE KEY unique_user_email (user_name, email_id),
        INDEX idx_user_name (user_name),
        INDEX idx_folder_name (folder_name),
        INDEX idx_received_at (received_at),
        INDEX idx_is_read (is_read),
        INDEX idx_cached_at (cached_at),
        INDEX idx_is_active (is_active)
      );
    `);

    // -- Create sent_emails_log table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS sent_emails_log (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_name VARCHAR(100) NOT NULL,
        recipient_emails TEXT NOT NULL COMMENT 'JSON array of recipients',
        cc_emails TEXT NULL COMMENT 'JSON array of CC recipients',
        bcc_emails TEXT NULL COMMENT 'JSON array of BCC recipients',
        subject VARCHAR(500) NOT NULL,
        body_content LONGTEXT,
        body_preview TEXT,
        has_attachments BOOLEAN DEFAULT 0,
        attachment_info JSON NULL COMMENT 'Attachment details',
        email_type ENUM('manual', 'notification', 'template', 'reply', 'forward') DEFAULT 'manual',
        reference_type VARCHAR(100) NULL COMMENT 'course_booking, lpo_order, etc.',
        reference_id INT NULL,
        message_id VARCHAR(255) NULL COMMENT 'Microsoft Graph message ID',
        conversation_id VARCHAR(255) NULL,
        sent_status ENUM('sent', 'failed', 'pending') DEFAULT 'pending',
        error_message TEXT NULL,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_name (user_name),
        INDEX idx_sent_status (sent_status),
        INDEX idx_email_type (email_type),
        INDEX idx_reference_type_id (reference_type, reference_id),
        INDEX idx_sent_at (sent_at)
      );
    `);

    // -- Create email_templates table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id INT PRIMARY KEY AUTO_INCREMENT,
        template_name VARCHAR(255) NOT NULL,
        template_type ENUM('course_notification', 'lpo_alert', 'general', 'welcome', 'reminder', 'completion') NOT NULL,
        subject_template VARCHAR(500) NOT NULL,
        body_template LONGTEXT NOT NULL,
        variables JSON NULL COMMENT 'Available template variables',
        template_description TEXT NULL,
        created_by_user VARCHAR(100) NOT NULL,
        is_system_template BOOLEAN DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_template_type (template_type),
        INDEX idx_created_by_user (created_by_user),
        INDEX idx_is_system_template (is_system_template),
        INDEX idx_is_active (is_active)
      );
    `);

    // -- Create email_attachments_cache table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS email_attachments_cache (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_name VARCHAR(100) NOT NULL,
        email_id VARCHAR(255) NOT NULL,
        attachment_id VARCHAR(255) NOT NULL,
        attachment_name VARCHAR(500) NOT NULL,
        content_type VARCHAR(255),
        size_bytes INT,
        is_inline BOOLEAN DEFAULT 0,
        cached_file_path VARCHAR(1000) NULL,
        cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_attachment (user_name, email_id, attachment_id),
        INDEX idx_user_name (user_name),
        INDEX idx_email_id (email_id),
        INDEX idx_cached_at (cached_at)
      );
    `);

    // -- Insert default email templates
    await db.execute(`
      INSERT IGNORE INTO email_templates (template_name, template_type, subject_template, body_template, variables, template_description, created_by_user, is_system_template) VALUES
      ('Course Welcome', 'course_notification', 'Welcome to {{course_name}}',
      '<h2>Welcome to {{course_name}}</h2>
      <p>Dear {{candidate_name}},</p>
      <p>You have been enrolled in the course: <strong>{{course_name}}</strong></p>
      <p><strong>Course Details:</strong></p>
      <ul>
      <li>Start Date: {{start_date}}</li>
      <li>Duration: {{duration}} days</li>
      <li>Location: {{location}}</li>
      <li>Instructor: {{instructor_name}}</li>
      </ul>
      <p>Please make sure to attend all sessions as 100% attendance is mandatory.</p>
      <p>Best regards,<br>Training Management Team</p>',
      '{"course_name": "Course name", "candidate_name": "Candidate name", "start_date": "Course start date", "duration": "Course duration", "location": "Course location", "instructor_name": "Instructor name"}',
      'Welcome email for course enrollment', 'system', 1),
      ('LPO Expiry Alert', 'lpo_alert', 'LPO Expiry Alert - {{lpo_number}}',
      '<h2>LPO Expiry Alert</h2>
      <p>Dear {{customer_name}},</p>
      <p>This is to inform you that your LPO <strong>{{lpo_number}}</strong> is expiring soon.</p>
      <p><strong>LPO Details:</strong></p>
      <ul>
      <li>LPO Number: {{lpo_number}}</li>
      <li>Expiry Date: {{expiry_date}}</li>
      <li>Remaining Balance: {{remaining_balance}} participants</li>
      </ul>
      <p>Please use your remaining balance before the expiry date or contact us for extension.</p>
      <p>Best regards,<br>Training Management Team</p>',
      '{"customer_name": "Customer name", "lpo_number": "LPO number", "expiry_date": "LPO expiry date", "remaining_balance": "Remaining LPO balance"}',
      'Alert email for LPO expiry', 'system', 1),
      ('Course Completion Certificate', 'completion', 'Course Completion - {{course_name}}',
      '<h2>Course Completion Certificate</h2>
      <p>Dear {{candidate_name}},</p>
      <p>Congratulations! You have successfully completed the course: <strong>{{course_name}}</strong></p>
      <p><strong>Course Details:</strong></p>
      <ul>
      <li>Course: {{course_name}}</li>
      <li>Completion Date: {{completion_date}}</li>
      <li>Result: {{result}}</li>
      <li>Certificate Number: {{certificate_number}}</li>
      </ul>
      <p>Your certificate and card details will be processed and sent to you shortly.</p>
      <p>Best regards,<br>Training Management Team</p>',
      '{"candidate_name": "Candidate name", "course_name": "Course name", "completion_date": "Course completion date", "result": "Pass/Fail", "certificate_number": "Certificate number"}',
      'Course completion notification with certificate details', 'system', 1);
    `);

    // -- Insert default M365 app settings (placeholder - replace with actual values)
    await db.execute(`
      INSERT IGNORE INTO m365_app_settings (client_id, client_secret, tenant_id, redirect_uri) VALUES
      ('your-client-id', 'encrypted-client-secret', 'your-tenant-id',
      'https://yourdomain.com/api/m365/auth/callback');
    `);

      await db.execute(`
      ALTER TABLE transmittal_records
        ADD COLUMN delivery_status ENUM('pending', 'in_transit', 'delivered', 'completed') DEFAULT 'pending' AFTER vendor_status,
        ADD COLUMN delivery_notes TEXT NULL AFTER delivery_status,
        ADD COLUMN actual_delivery_date DATE NULL AFTER pickup_date,
        ADD COLUMN delivered_by_person VARCHAR(255) NULL AFTER pickup_person_name,
        ADD COLUMN recipient_signature_path VARCHAR(500) NULL AFTER transmittal_copy_path,
        ADD COLUMN delivery_confirmation_date TIMESTAMP NULL AFTER recipient_signature_path,
        ADD INDEX idx_delivery_status (delivery_status),
        ADD INDEX idx_actual_delivery_date (actual_delivery_date);
    `);

    // Create transmittal_status_history table for audit trail
    await db.execute(`
      CREATE TABLE IF NOT EXISTS transmittal_status_history (
        id INT PRIMARY KEY AUTO_INCREMENT,
        transmittal_id INT NOT NULL,
        old_status VARCHAR(100) NULL,
        new_status VARCHAR(100) NOT NULL,
        status_type ENUM('delivery_status', 'vendor_status') NOT NULL,
        changed_by_user VARCHAR(100) NOT NULL,
        change_notes TEXT NULL,
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (transmittal_id) REFERENCES transmittal_records(id) ON DELETE CASCADE,
        INDEX idx_transmittal_id (transmittal_id),
        INDEX idx_changed_at (changed_at),
        INDEX idx_status_type (status_type)
      );
    `);

    // Drop trigger if exists (to avoid duplicate creation errors)
    await db.execute(`DROP TRIGGER IF EXISTS track_transmittal_status_changes;`);

    // Create trigger to track status changes
    await db.execute(`
      CREATE TRIGGER track_transmittal_status_changes
      AFTER UPDATE ON transmittal_records
      FOR EACH ROW
      BEGIN
        -- Track delivery status changes
        IF OLD.delivery_status <> NEW.delivery_status THEN
          INSERT INTO transmittal_status_history (
            transmittal_id, old_status, new_status, status_type,
            changed_by_user, change_notes
          ) VALUES (
            NEW.id, OLD.delivery_status, NEW.delivery_status, 'delivery_status',
            'system', CONCAT('Status changed from ', OLD.delivery_status, ' to ', NEW.delivery_status)
          );
        END IF;

        -- Track vendor status changes
        IF OLD.vendor_status <> NEW.vendor_status THEN
          INSERT INTO transmittal_status_history (
            transmittal_id, old_status, new_status, status_type,
            changed_by_user, change_notes
          ) VALUES (
            NEW.id, OLD.vendor_status, NEW.vendor_status, 'vendor_status',
            'system', CONCAT('Vendor status changed from ', OLD.vendor_status, ' to ', NEW.vendor_status)
          );
        END IF;
      END;
    `);

    // Update existing transmittals to have default status
    await db.execute(`
      UPDATE transmittal_records 
      SET delivery_status = 'pending' 
      WHERE delivery_status IS NULL;
    `);

    // =====================================================
// VISUAL CARD & CERTIFICATE DESIGNER DATABASE
// =====================================================

// Main templates table

await db.execute(`
CREATE TABLE IF NOT EXISTS design_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  template_name VARCHAR(255) NOT NULL,
  template_type ENUM('card', 'certificate') NOT NULL,
  category_id INT NOT NULL,
  template_image_path VARCHAR(500) NOT NULL,
  template_image LONGBLOB NOT NULL,
  image_width INT NOT NULL,
  image_height INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES course_categories(id),
  UNIQUE KEY uq_template_category_type (category_id, template_type),
  INDEX idx_template_type (template_type),
  INDEX idx_category_id (category_id),
  INDEX idx_is_active (is_active)
);
`);

// Field definitions for drag-and-drop
await db.execute(`
CREATE TABLE IF NOT EXISTS field_definitions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  field_key VARCHAR(100) NOT NULL UNIQUE,
  display_label VARCHAR(255) NOT NULL,
  data_source VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_is_active (is_active),
  INDEX idx_sort_order (sort_order)
);
`);


//   console.log("Table is created or already exists");
// }.catch( (err) => {
//   console.error("Error creating tables:", err.message);
//   process.exit(1);
// })
// }
// }

// Positioned fields on templates
await db.execute(`
CREATE TABLE IF NOT EXISTS template_fields (
  id INT AUTO_INCREMENT PRIMARY KEY,
  template_id INT NOT NULL,
  field_key VARCHAR(100) NOT NULL,
  x_coordinate INT NOT NULL,
  y_coordinate INT NOT NULL,
  width INT DEFAULT 200,
  height INT DEFAULT 30,
  font_family VARCHAR(100) DEFAULT 'Arial',
  font_size INT DEFAULT 12,
  font_color VARCHAR(7) DEFAULT '#000000',
  font_weight ENUM('normal', 'bold') DEFAULT 'normal',
  alignment ENUM('left', 'center', 'right') DEFAULT 'left',
  is_visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES design_templates(id) ON DELETE CASCADE,
  UNIQUE KEY uq_template_field (template_id, field_key),
  INDEX idx_template_id (template_id),
  INDEX idx_field_key (field_key)
);
`);

// Logo positioning on templates
await db.execute(`
CREATE TABLE IF NOT EXISTS template_logos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  template_id INT NOT NULL,
  logo_type ENUM('simian', 'customer') NOT NULL,
  x_coordinate INT NOT NULL,
  y_coordinate INT NOT NULL,
  width INT DEFAULT 100,
  height INT DEFAULT 50,
  keep_aspect_ratio BOOLEAN DEFAULT TRUE,
  is_visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES design_templates(id) ON DELETE CASCADE,
  UNIQUE KEY uq_template_logo_type (template_id, logo_type),
  INDEX idx_template_id (template_id),
  INDEX idx_logo_type (logo_type)
);
`);

// Insert predefined field definitions
await db.execute(`
INSERT IGNORE INTO field_definitions 
(field_key, display_label, data_source, category, description, sort_order) VALUES
('first_name', 'First Name', 'course_candidates.first_name', 'candidate', 'Candidate first name', 1),
('last_name', 'Last Name', 'course_candidates.last_name', 'candidate', 'Candidate last name', 2),
('full_name', 'Full Name', 'CONCAT(course_candidates.first_name, " ", course_candidates.last_name)', 'candidate', 'Candidate full name', 3),
('dob', 'Date of Birth', 'course_candidates.dob', 'candidate', 'Candidate date of birth', 4),
('gender', 'Gender', 'course_candidates.gender', 'candidate', 'Candidate gender', 5),
('nationality', 'Nationality', 'course_candidates.nationality', 'candidate', 'Candidate nationality', 6),
('employee_id', 'Employee ID', 'course_candidates.employee_id', 'candidate', 'Company employee ID', 7),
('card_number', 'Card Number', 'candidate_cards.card_number', 'numbers', 'Existing card number from upload', 10),
('certificate_number', 'Certificate Number', 'candidate_certificates.certificate_number', 'numbers', 'Existing certificate number from upload', 11),
('course_name', 'Course Name', 'course_categories.name', 'course', 'Full course name', 20),
('course_number', 'Course Number', 'course_bookings.course_number', 'course', 'Course booking number', 21),
('start_date', 'Start Date', 'course_bookings.start_date', 'course', 'Course start date', 22),
('end_date', 'End Date', 'course_bookings.end_date', 'course', 'Course end date', 23),
('completion_date', 'Completion Date', 'course_bookings.completion_date', 'course', 'Course completion date', 24),
('issue_date', 'Issue Date', 'CURRENT_DATE()', 'system', 'Current date when printed', 30),
('expiry_date', 'Expiry Date', 'DATE_ADD(CURRENT_DATE(), INTERVAL 5 YEAR)', 'system', '5 years from issue date', 31),
('company_name', 'Company Name', 'customers.name', 'company', 'Company name', 40),
('company_address', 'Company Address', 'customers.address', 'company', 'Company address', 41),
('simian_logo', 'Simian Logo', 'static/simian-logo.png', 'logo', 'Simian company logo', 50),
('customer_logo', 'Customer Logo', 'customers.logo_path', 'logo', 'Customer company logo', 51);
`);


    console.log("Tables created or already exist");
  }catch (err) {
    console.error("Error creating tables:", err.message);
    process.exit(1);
  }


}

