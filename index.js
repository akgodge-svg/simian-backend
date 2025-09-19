import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import inventoryRoutes from './routes/inventoryRoutes.js';
import courseSettingsRoutes from './routes/courseSettings.routes.js';
import centerRoutes from './routes/centerRoutes.js';

dotenv.config();
const app = express();

// -------------------- Middleware --------------------
app.use(cors({
  origin: "http://localhost:5173",  // React frontend
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/uploads", express.static("uploads"));

// -------------------- Routes --------------------
// Add to API Routes section
app.use('/api/inventory', inventoryRoutes);
app.use('/api/course-settings', courseSettingsRoutes);
app.use('/api/centers', centerRoutes);


// -------------------- Start Server --------------------
const PORT = process.env.PORT || 5000;
const startServer = async () => {
  try {
    await connectToDatabase();
    await createTables();
    //await createAllUserChats();


    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Error starting server:", error.message);
    process.exit(1);
  }
};

startServer();