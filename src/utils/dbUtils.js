import { getDB } from "../config/db.js";
import bcrypt from "bcryptjs";

export const createTables = async () => {
  const db = getDB();
  try{



    
  console.log("Table is created or already exists");
} catch (err) {
  console.error("Error creating tables:", err.message);
  process.exit(1);
}
}