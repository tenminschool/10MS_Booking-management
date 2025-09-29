import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import branchRoutes from './routes/branches';
import importRoutes from './routes/import';
import slotRoutes from './routes/slots';
import bookingRoutes from './routes/bookings';
import waitingListRoutes from './routes/waiting-list-enhanced';
import notificationRoutes from './routes/notifications';
import adminNotificationRoutes from './routes/admin-notifications-simple';
import assessmentRoutes from './routes/assessments';
import dashboardRoutes from './routes/dashboard';
import adminDashboardRoutes from './routes/admin-dashboard';
import reportRoutes from './routes/reports';
import systemRoutes from './routes/system';
import healthRoutes from './routes/health';
import { supabase } from './lib/supabase';
import { schedulerService } from './services/scheduler';
import { globalErrorHandler } from './middleware/errorHandler';
import { validateRateLimit } from './middleware/validation';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy for accurate IP addresses
app.set('trust proxy', true);

// Global rate limiting
app.use('/api', validateRateLimit(1000, 15 * 60 * 1000)); // 1000 requests per 15 minutes

// Health check routes
app.use('/health', healthRoutes);

// Basic route
app.get('/', (req, res) => {
  res.json({
    message: '10 Minute School Speaking Test Booking API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      healthDetailed: '/health/detailed',
      healthReady: '/health/ready',
      healthLive: '/health/live',
      auth: '/api/auth',
      users: '/api/users',
      branches: '/api/branches',
      import: '/api/import',
      slots: '/api/slots',
      bookings: '/api/bookings',
      notifications: '/api/notifications',
      assessments: '/api/assessments',
      dashboard: '/api/dashboard',
      reports: '/api/reports',
      system: '/api/system',
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/import', importRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/waiting-list', waitingListRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin/notifications', adminNotificationRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin/dashboard', adminDashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/system', systemRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

// Global error handler
app.use(globalErrorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  schedulerService.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  schedulerService.stop();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth`);
  console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);

  // Start scheduler service
  schedulerService.start();
  console.log(`⏰ Notification scheduler started`);
});

export default app;