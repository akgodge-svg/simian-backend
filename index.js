// src/index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

// Routes & services / models (adjust paths as needed)
import inventoryRoutes from "./routes/inventoryRoutes.js";
import pusherSettingsRoutes from "./routes/pusherSettingsRoutes.js"; // <-- ensure this file exists
import chatRoutes from "./routes/chatRoutes.js";

import { PusherSettings } from "./models/PusherSettings.js";
import { Chat } from "./models/Chat.js";
import { ChatService } from "./services/ChatService.js";

// DB helpers (make sure your config exports connectToDatabase)
import { connectToDatabase } from "./config/db.js";
import { createTables } from "./services/db.setup.js";

import m365Routes from './routes/m365Routes.js';

import transmittalsRoutes from './routes/transmittalsRoutes.js';

import visualTemplateRoutes from './routes/visualTemplateRoutes.js';
import certificatePrintingRoutes from './routes/certificatePrintingRoutes.js';

dotenv.config();
const app = express();

// -------------------- Middleware --------------------
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173", // React frontend
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/uploads", express.static("uploads"));
// Add these routes to your existing API routes
app.use('/api/visual-templates', visualTemplateRoutes);
app.use('/api/certificate-printing', certificatePrintingRoutes);

// -------------------- Routes --------------------
app.use("/api/inventory", inventoryRoutes);
app.use("/api/pusher-settings", pusherSettingsRoutes);
app.use("/api/chat", chatRoutes);
// Add to API Routes section
app.use('/api/transmittals', transmittalsRoutes);

// Add to API Routes section
app.use('/api/m365', m365Routes);
// Add to environment variables check
if (!process.env.ENCRYPTION_KEY) {
 console.warn('⚠️ ENCRYPTION_KEY not set in environment variables. Using default key.');
}

// Simple health-check route that also reports DB connectivity for Pusher & Chat
app.get("/api/health", async (req, res) => {
  try {
    const pusherSettingsDbTest = await (PusherSettings.testConnection?.() ?? Promise.resolve(false));
    const chatDbTest = await (Chat.testConnection?.() ?? Promise.resolve(false));

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
    res.status(500).json({ status: "error", message: "Health check failed", error: err.message });
  }
});

// -------------------- Start Server --------------------
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // 1) connect to DB
    await connectToDatabase();

    // 2) create/ensure tables
    await createTables();

    // 3) initialize Pusher / Chat service (if used)
    try {
      await ChatService.initializePusher?.();
      console.log("ChatService / Pusher initialized");
    } catch (err) {
      // log but do not crash the whole server on init failure (optional)
      console.warn("Failed to initialize ChatService / Pusher:", err.message);
    }

    // 4) start the http server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Error starting server:", error.message || error);
    process.exit(1);
  }
};

startServer();
