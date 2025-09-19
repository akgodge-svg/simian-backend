import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

let db = null;

export const connectToDatabase = async () => {
  try {
    db = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT,
    });

    console.log('Database connection successful!');
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
};

// Export connection object for use elsewhere
export const getDB = () => {
  if (!db) throw new Error('Database not connected!');
  return db;
};