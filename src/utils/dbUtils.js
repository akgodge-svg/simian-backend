import { getDB } from "../config/db.js";
import bcrypt from "bcryptjs";

export const createTables = async () => {
  const db = getDB();
  try{
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
} catch (err) {
  console.error("Error creating tables:", err.message);
  process.exit(1);
}
}