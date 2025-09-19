import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

let pool;

export const connectToDatabase = async () => {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT,
      waitForConnections: true,
      connectionLimit: 10,   // adjust based on load
      queueLimit: 0,
      acquireTimeout: 60000,
    });

    // Test a connection immediately
    const connection = await pool.getConnection();
    console.log("✅ Database connection successful!");
    connection.release();
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    process.exit(1);
  }
};

// Get pool instance
export const getDB = () => {
  if (!pool) throw new Error("Database not connected! Call connectToDatabase() first.");
  return pool;
};
