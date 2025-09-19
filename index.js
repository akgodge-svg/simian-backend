// src/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

// Routes
import inventoryRoutes from './src/routes/inventoryRoutes.js';
import courseSettingsRoutes from './src/routes/courseSettingsRoutes.js';
import centerRoutes from './src/routes/centerRoutes.js';
import instructorRoutes from './src/routes/instructorRoutes.js';
//import customerRoutes from './src/routes/customerRoutes.js';
import lpoRoutes from './src/routes/lpoRoutes.js';
import courseBookingRoutes from './src/routes/courseBookingRoutes.js';
import courseBookingDetailsRoutes from './src/routes/courseBookingDetailsRoutes.js';

// Optional/visual/chat modules (import only if present in your project)
import visualTemplateRoutes from './src/routes/visualTemplateRoutes.js';
import certificatePrintingRoutes from './src/routes/certificatePrintingRoutes.js';
import pusherSettingsRoutes from './src/routes/pusherSettingsRoutes.js';
import chatRoutes from './src/routes/chatRoutes.js';
import transmittalsRoutes from './src/routes/transmittalsRoutes.js';
import m365Routes from './src/routes/m365Routes.js';

// Database helpers
import { connectToDatabase, createTables } from './src/config/db.js';

// Models for health checks (guarded usage below)
import { CourseCategory } from './src/models/CourseCategory.js';
import { Center } from './src/models/Center.js';
import { Customer } from './src/models/Customer.js';
import { LPO } from './src/models/LPO.js';
import { CourseBooking } from './src/models/CourseBooking.js';
import { PusherSettings } from './src/models/PusherSettings.js';
import { Chat } from './src/models/Chat.js';

// Optional services (guarded)
import ChatService from './src/services/ChatService.js';

dotenv.config();

const app = express();

// CORS - use first available origin env var
const CLIENT_ORIGIN = process.env.CLIENT_URL || process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/uploads', express.static('uploads'));

// Simple request logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// -------------------- Routes --------------------
app.use('/api/inventory', inventoryRoutes);
app.use('/api/course-settings', courseSettingsRoutes);
app.use('/api/centers', centerRoutes);
app.use('/api/instructors', instructorRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/lpo', lpoRoutes);

app.use('/api/course-bookings', courseBookingRoutes);
app.use('/api/course-booking-details', courseBookingDetailsRoutes);

// Visual & printing (register if routes exist)
app.use('/api/visual-templates', visualTemplateRoutes);
app.use('/api/certificate-printing', certificatePrintingRoutes);

// Chat / pusher / other integrations
app.use('/api/pusher-settings', pusherSettingsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/transmittals', transmittalsRoutes);
app.use('/api/m365', m365Routes);

// -------------------- Error & 404 handlers --------------------
app.use((error, req, res, next) => {
  console.error('Global Error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined,
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// -------------------- Health & Root --------------------
app.get('/api/health', async (req, res) => {
  try {
    // run testConnection only if the model exposes it
    const tryTest = async (model) => {
      try {
        return (model && typeof model.testConnection === 'function') ? await model.testConnection() : false;
      } catch (e) {
        console.warn('Health check model failed:', e.message);
        return false;
      }
    };

    const results = {
      courses: await tryTest(CourseCategory),
      centers: await tryTest(Center),
      customers: await tryTest(Customer),
      lpo: await tryTest(LPO),
      courseBookings: await tryTest(CourseBooking),
      pusherSettings: await tryTest(PusherSettings),
      chat: await tryTest(Chat),
    };

    res.json({
      success: true,
      message: 'Training Management API running',
      timestamp: new Date().toISOString(),
      database: Object.fromEntries(Object.entries(results).map(([k, v]) => [k, v ? 'Connected' : 'Disconnected'])),
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ success: false, message: 'Health check failed', error: error.message });
  }
});

app.get('/', (_, res) => {
  res.json({
    success: true,
    message: 'Training Management System API',
    version: '1.0.0',
  });
});

// -------------------- Start Server --------------------
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // 1) Ensure database connection
    await connectToDatabase();

    // 2) create/ensure tables (if function is available)
    if (typeof createTables === 'function') {
      await createTables();
    }

    // 3) initialize Chat/Pusher if service exists
    try {
      if (ChatService && typeof ChatService.initializePusher === 'function') {
        await ChatService.initializePusher();
        console.log('ChatService / Pusher initialized');
      }
    } catch (err) {
      console.warn('Failed to initialize ChatService / Pusher:', err.message || err);
    }

    // 4) start the http server
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error starting server:', error.message || error);
    process.exit(1);
  }
};

startServer();
