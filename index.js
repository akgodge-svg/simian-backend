
// index.js (or server.js)

// src/index.js
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

// Routes (default imports — route files should `export default router`)
import inventoryRoutes from "./src/routes/inventoryRoutes.js";
import pusherSettingsRoutes from "./src/routes/pusherSettingsRoutes.js";
import chatRoutes from "./src/routes/chatRoutes.js";
//import m365Routes from "./src/routes/m365Routes.js";
import transmittalsRoutes from "./src/routes/transmittalsRoutes.js";
import visualTemplateRoutes from "./src/routes/visualTemplateRoutes.js";
import certificatePrintingRoutes from "./src/routes/certificatePrintingRoutes.js";

// Models / Services (kept as named imports to match your earlier usage)
import { PusherSettings } from "./src/models/PusherSettings.js";
import { Chat } from "./src/models/Chat.js";
import { ChatService } from "./src/services/ChatService.js";

// DB helpers (named imports as in your code)
import { connectToDatabase } from "./src/config/db.js";
//import { createTables } from "./src/services/db.js";

// -------------------- Middleware --------------------
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173", // React frontend

    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/uploads", express.static("uploads"));

// -------------------- Routes --------------------
// Visual & printing before general routes if required
app.use("/api/visual-templates", visualTemplateRoutes);
app.use("/api/certificate-printing", certificatePrintingRoutes);

// Main API routes
app.use("/api/inventory", inventoryRoutes);
app.use("/api/pusher-settings", pusherSettingsRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/transmittals", transmittalsRoutes);
app.use("/api/m365", m365Routes);

// Warn if important env missing
if (!process.env.ENCRYPTION_KEY) {
  console.warn(
    "⚠️ ENCRYPTION_KEY not set in environment variables. Using default key."
  );
}

// Simple health-check route that also reports DB connectivity for Pusher & Chat
app.get("/api/health", async (req, res) => {
  try {
    const pusherSettingsDbTest =
      (PusherSettings?.testConnection && (await PusherSettings.testConnection())) ??
      false;
    const chatDbTest =
      (Chat?.testConnection && (await Chat.testConnection())) ?? false;

    res.json({
      status: "ok",
      environment: process.env.NODE_ENV || "development",
      database: {
        pusherSettings: pusherSettingsDbTest ? "Connected" : "Disconnected",
        chat: chatDbTest ? "Connected" : "Disconnected",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Health check failed:", err);
    res
      .status(500)
      .json({ status: "error", message: "Health check failed", error: err.message });
  }
});

// -------------------- Start Server --------------------
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {

    // ✅ Ensure database connection and table creation
    await connectToDatabase();
   
    

    // 1) connect to DB
    await connectToDatabase();

    // 2) create/ensure tables
    await createTables();

    // 3) initialize Pusher / Chat service (if used)
    try {
      if (ChatService?.initializePusher) {
        await ChatService.initializePusher();
        console.log("ChatService / Pusher initialized");
      }
    } catch (err) {
      // log but do not crash the whole server on init failure (optional)
      console.warn("Failed to initialize ChatService / Pusher:", err.message);
    }

    // 4) start the http server

    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Error starting server:", error.message || error);
    process.exit(1);
  }
};

startServer();
