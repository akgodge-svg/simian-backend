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
    //-- Create inventory_transactions table
await db.execute(`CREATE TABLE IF NOT EXISTS inventory_transactions (
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
);`);
//-- Create triggers for auto-deduction when print status changes
//
    
//-- Trigger for card printing
await db.execute(`
   DELIMITER $$
-- Trigger for card printing
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
END$$
-- Trigger for certificate printing
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
END$$
DELIMITER ;
-- Insert initial inventory items (example data)
INSERT IGNORE INTO inventory_items (item_type, category_id, level_id, item_name, current_stock,
minimum_threshold)
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
INSERT IGNORE INTO inventory_items (item_type, category_id, level_id, item_name, current_stock,
minimum_threshold)
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

  console.log("Table is created or already exists");
}.catch( (err) => {
  console.error("Error creating tables:", err.message);
  process.exit(1);
})
}
}

