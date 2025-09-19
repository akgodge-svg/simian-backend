// index.js (or server.js)
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

// ✅ Route imports
import inventoryRoutes from "./src/routes/inventoryRoutes.js";
import courseSettingsRoutes from "./src/routes/courseSettingsRoutes.js";
import centerRoutes from "./src/routes/centerRoutes.js";
import instructorRoutes from "./src/routes/instructorRoutes.js";

// ✅ Database helpers – adjust the path to match your project
import { connectToDatabase } from "./src/config/db.js";

dotenv.config();

const app = express();

// -------------------- Middleware --------------------
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/uploads", express.static("uploads"));

// -------------------- Routes --------------------
app.use("/api/inventory", inventoryRoutes);
app.use("/api/course-settings", courseSettingsRoutes);
app.use("/api/centers", centerRoutes);
app.use("/api/instructors", instructorRoutes);

// -------------------- Start Server --------------------
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // ✅ Ensure database connection and table creation
    await connectToDatabase();
   
    
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Error starting server:", error);
    process.exit(1);
  }
};

startServer();
