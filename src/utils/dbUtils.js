import { getDB } from "../config/db.js";
import bcrypt from "bcryptjs";
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();



export const createTables = async () => {
  const db = getDB();
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


//   /Center.js
    await db.execute(``);
    await db.execute(``);
    await db.execute(``);

    await db.execute(``);

    await db.execute(``);
    await db.execute(``);
    await db.execute(``);

    await db.execute(``);
    await db.execute(``);
    await db.execute(``);

    await db.execute(``);

    await db.execute(``);
    await db.execute(``);
    await db.execute(``);

    await db.execute(``);
    await db.execute(``);
    await db.execute(``);

    await db.execute(``);

    await db.execute(``);
    await db.execute(``);
    await db.execute(``);

    await db.execute(``);

    await db.execute(``);
    await db.execute(``);

    await db.execute(``);

    await db.execute(``);
    await db.execute(``);
    await db.execute(``);

    await db.execute(``);
    await db.execute(``);
    await db.execute(``);

    await db.execute(``);

    await db.execute(``);
    await db.execute(``);
    await db.execute(``);

    await db.execute(``);
    await db.execute(``);
    await db.execute(``);

    await db.execute(``);

    await db.execute(``);
    await db.execute(``);
    await db.execute(``);

    await db.execute(``);
    await db.execute(``);
    await db.execute(``);

    await db.execute(``);

    await db.execute(``);
    await db.execute(``);
    await db.execute(``);

    await db.execute(``);

    console.log("Table is created or already exists");
  } catch (err) {
    console.error("Error creating tables:", err.message);
    process.exit(1);
  }
};
