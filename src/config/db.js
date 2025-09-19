import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

// use let so we can assign after creating the pool
let pool = null;

/**
 * Create and test the connection pool.
 * Call this once at application startup (e.g. in server.js).
 */
export const connectToDatabase = async () => {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT,
      waitForConnections: true,
      connectionLimit: 10, // adjust as needed
      queueLimit: 0,
      acquireTimeout: 60000,
       multipleStatements: true,
    });

    // quick test of a connection
    const conn = await pool.getConnection();
    console.log("✅ Database connection successful!");
    conn.release();
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
    process.exit(1);
  }
};

/**
 * Retrieve the active pool after connectToDatabase has run.
 */
export const getDB = () => {
  if (!pool) {
    throw new Error("Database not connected! Call connectToDatabase() first.");
  }
  return pool;
};
