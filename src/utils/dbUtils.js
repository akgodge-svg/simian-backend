// src/services/db.setup.js
import { getDB } from "../config/db.js";

export const createTables = async () => {
  const db = getDB();
  try {
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
  } catch (err) {
    console.error("Error creating tables:", err.message);
    process.exit(1);
  }
};
