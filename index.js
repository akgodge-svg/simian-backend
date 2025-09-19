import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

// center code 
import inventoryRoutes from './routes/inventoryRoutes.js';
import { CourseCategory } from './models/CourseCategory.js';
import { Center } from './models/Center.js';
import courseSettingsRoutes from './routes/courseSettingsRoutes.js';
import centerRoutes from './routes/centerRoutes.js';
import instructorRoutes from './routes/instructorRoutes.js';

// LPO update 
import { CourseCategory } from './models/CourseCategory.js';
import { Center } from './models/Center.js';
import { Customer } from './models/Customer.js';
import { LPO } from './models/LPO.js';
import { LPOExpiryNotificationJob } from './jobs/lpoExpiryNotification.js';
import courseSettingsRoutes from './routes/courseSettingsRoutes.js';
import centerRoutes from './routes/centerRoutes.js';
import instructorRoutes from './routes/instructorRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import lpoRoutes from './routes/lpoRoutes.js';

import courseBookingRoutes from './routes/courseBookingRoutes.js';
import courseBookingDetailsRoutes from './routes/courseBookingDetailsRoutes.js';

import { CourseBooking } from './models/CourseBooking.js';


import courseBookingRoutes from './routes/courseBookingRoutes.js';

dotenv.config();
const app = express();

// -------------------- Middleware --------------------
app.use(cors({
  origin: "http://localhost:5173",  // React frontend
  credentials: true
}));

 app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/uploads", express.static("uploads"));


app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
  });

 

// -------------------- Routes --------------------
// Add to API Routes section
// inventoryRoutes
app.use('/api/inventory', inventoryRoutes);

// lpo update and center code and logic 
app.use('/api/course-settings', courseSettingsRoutes);
app.use('/api/centers', centerRoutes);
app.use('/api/instructors', instructorRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/lpo', lpoRoutes);
app.use('/api/course-bookings', courseBookingRoutes);
app.use('/api/course-bookings', courseBookingRoutes);
app.use('/api/course-booking-details', courseBookingDetailsRoutes);


app.use((error, req, res, next) => {
  console.error('Global Error:', error);
  res.status(500).json({
  success: false,
  message: 'Internal server error',
  error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
  });

  app.use('*', (req, res) => {
    res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    availableRoutes: [
    'GET /api/health',
    'GET /api/course-settings/categories',
    'GET /api/centers',
    'POST /api/centers/:id/instructors',
    'GET /api/centers/:id/dashboard',
    'GET /api/instructors',
    'GET /api/instructors/smart-match'
    ]
    });
    });

    app.get('/api/health', async (req, res) => {
      try {
        // Test all database connections
        const courseDbTest = await CourseCategory.testConnection();
const centerDbTest = await Center.testConnection();
const customerDbTest = await Customer.testConnection();
const lpoDbTest = await LPO.testConnection();
const courseBookingDbTest = await CourseBooking.testConnection();
res.json({
success: true,
message: 'Complete Training Management API with Course Booking System is running',
timestamp: new Date().toISOString(),
database: {
courses: courseDbTest ? 'Connected' : 'Disconnected',
centers: centerDbTest ? 'Connected' : 'Disconnected',
customers: customerDbTest ? 'Connected' : 'Disconnected',
lpo: lpoDbTest ? 'Connected' : 'Disconnected',
courseBookings: courseBookingDbTest ? 'Connected' : 'Disconnected'
},
modules: {
courseSettings: 'Active',
centerSettings: 'Enhanced with instructor assignments',
instructors: 'Active with document management',
customers: 'Active with center-based isolation',
lpo: 'Active - Main Branch only with file upload & email notifications',
courseBookings: 'Active - UAE (U-001) and Overseas (OS-001) with LPO integration'
},
courseBookingFeatures: {
courseNumbers: 'U-001 (UAE), OS-001 (Overseas) auto-generated',
dateCalculation: 'Auto end date calculation excluding weekends',
deliveryType: 'Onsite/Offsite selection only (no venue details)',
instructorAvailability: 'Real-time availability checking',
lpoIntegration: 'UAE courses with LPO quantity management',
courseCapacity: 'Max participants from course CATEGORY settings',
durationSource: 'Duration from course CATEGORY (not levels)',
emailNotifications: 'Booking creation alerts to all parties',
statusManagement: 'not_started → in_progress → completed lifecycle'
},
endpoints: {
courseBookings: '/api/course-bookings',
createBooking: 'POST /api/course-bookings',
availableInstructors: 'GET /api/course-bookings/available-instructors',
availableLPOCustomers: 'GET /api/course-bookings/available-lpo-customers',
overseasCustomers: 'GET /api/course-bookings/overseas-customers',
upcomingCourses: 'GET /api/course-bookings/upcoming',
categoryDetails: 'GET /api/course-bookings/category-details/:category_id',
calculateEndDate: 'POST /api/course-bookings/calculate-end-date'
}
});

      } catch (error) {
        res.status(500).json({
          success: false,
          message: 'Health check failed',
          error: error.message
        });
      }
    });
    


  // Root endpoint
  app.get('/', (req, res) => {
  res.json({
  success: true,
  message: 'Training Management System API',
  version: '1.0.0',
  availableModules: {
  courseSettings: '/api/course-settings',
  centerSettings: '/api/centers (Enhanced)',
  instructors: '/api/instructors'
  },
  centerFeatures: {
  instructorAssignment: '/api/centers/:id/instructors',
  permissions: '/api/centers/:id/permissions',
  dashboard: '/api/centers/:id/dashboard',
  dataFiltering: 'Center-based data isolation implemented'
  }
  });
  });


// -------------------- Start Server --------------------
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {

    const courseDbConnected = await CourseCategory.testConnection();
const centerDbConnected = await Center.testConnection();
const customerDbConnected = await Customer.testConnection();
const lpoDbConnected = await LPO.testConnection();
if (!courseDbConnected || !centerDbConnected || !customerDbConnected || !lpoDbConnected) {
console.error('❌ Cannot start server - database connection failed');
process.exit(1);
}
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


// const startServer = async () => {
//   try {
//   console.log('🔄 Testing database connections...');
//   const courseDbConnected = await CourseCategory.testConnection();
//   const centerDbConnected = await Center.testConnection();
//   if (!courseDbConnected || !centerDbConnected) {
//   console.error('❌ Cannot start server - database connection failed');
//   process.exit(1);
//   }
//   app.listen(PORT, () => {
//   console.log('\n🚀 Enhanced Training Management System API Started!');
//   console.log(`📡 Server: http://localhost:${PORT}`);
//   console.log(`🏥 Health: http://localhost:${PORT}/api/health`);
//   console.log('\n📋 Available Modules:');
//   console.log(` Course Settings: http://localhost:${PORT}/api/course-settings/categories`);
//   console.log(` Enhanced Centers: http://localhost:${PORT}/api/centers`);
//   console.log(` Instructor Management: http://localhost:${PORT}/api/instructors`);
//   console.log('\n🔧 Enhanced Center Features:');
//   console.log(` Instructor Assignment: POST /api/centers/:id/instructors`);
//   console.log(` Center Dashboard: GET /api/centers/:id/dashboard`);
//   console.log(` Permission Check: GET /api/centers/:id/permissions`);
//   console.log(` Available Instructors: GET /api/centers/:id/available-instructors`);
//   console.log('\n✅ Center-based data isolation and permissions ready!');
//   });
//   } catch (error) {
//   console.error('❌ Failed to start server:', error.message);
//   process.exit(1);
//   }
//   };

//   startServer();