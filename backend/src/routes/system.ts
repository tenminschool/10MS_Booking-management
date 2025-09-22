import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import prisma from '../lib/prisma';
import { UserRole } from '@prisma/client';

const router = Router();

// System settings schema
const systemSettingsSchema = z.object({
  bookingRules: z.object({
    maxBookingsPerMonth: z.number().min(1).max(10),
    cancellationHours: z.number().min(1).max(72),
    allowCrossBranchBooking: z.boolean(),
    autoReminderHours: z.number().min(1).max(72)
  }),
  notificationTemplates: z.object({
    bookingConfirmed: z.object({
      sms: z.string().min(1).max(160),
      inApp: z.string().min(1).max(200)
    }),
    bookingReminder: z.object({
      sms: z.string().min(1).max(160),
      inApp: z.string().min(1).max(200)
    }),
    bookingCancelled: z.object({
      sms: z.string().min(1).max(160),
      inApp: z.string().min(1).max(200)
    }),
    teacherCancellation: z.object({
      sms: z.string().min(1).max(160),
      inApp: z.string().min(1).max(200)
    })
  }),
  systemLimits: z.object({
    maxSlotsPerDay: z.number().min(1).max(50),
    maxStudentsPerSlot: z.number().min(1).max(5),
    workingHoursStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    workingHoursEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  }),
  auditSettings: z.object({
    retentionDays: z.number().min(30).max(2555),
    logLevel: z.enum(['basic', 'detailed', 'verbose']),
    enableRealTimeAlerts: z.boolean()
  })
});

// Default system settings
const defaultSettings = {
  bookingRules: {
    maxBookingsPerMonth: 4,
    cancellationHours: 24,
    allowCrossBranchBooking: true,
    autoReminderHours: 24
  },
  notificationTemplates: {
    bookingConfirmed: {
      sms: 'Your speaking test is confirmed for {date} at {time} with {teacher}. Branch: {branch}. Show this message at reception.',
      inApp: 'Your speaking test booking has been confirmed. Please arrive 10 minutes early.'
    },
    bookingReminder: {
      sms: 'Reminder: Your speaking test is tomorrow at {time} with {teacher}. Branch: {branch}. Please arrive on time.',
      inApp: 'Don\'t forget your speaking test tomorrow at {time}. Good luck!'
    },
    bookingCancelled: {
      sms: 'Your speaking test on {date} at {time} has been cancelled. You can book a new slot anytime.',
      inApp: 'Your booking has been cancelled. You can reschedule from the bookings page.'
    },
    teacherCancellation: {
      sms: 'Sorry, your teacher {teacher} cancelled the session on {date}. Please reschedule at your convenience.',
      inApp: 'Your session was cancelled by the teacher. Priority rescheduling is available for you.'
    }
  },
  systemLimits: {
    maxSlotsPerDay: 20,
    maxStudentsPerSlot: 1,
    workingHoursStart: '09:00',
    workingHoursEnd: '18:00'
  },
  auditSettings: {
    retentionDays: 365,
    logLevel: 'detailed' as const,
    enableRealTimeAlerts: true
  }
};

// GET /api/system/settings - Get system settings
router.get('/settings', 
  authenticate, 
  requireRole([UserRole.SUPER_ADMIN]),
  async (req, res) => {
    try {
      // Try to get settings from database
      const systemSetting = await prisma.systemSetting.findUnique({
        where: { key: 'system_config' }
      });

      let settings = defaultSettings;
      
      if (systemSetting?.value) {
        try {
          settings = JSON.parse(systemSetting.value);
        } catch (error) {
          console.error('Error parsing system settings:', error);
          // Fall back to default settings
        }
      }

      res.json({
        settings,
        lastUpdated: systemSetting?.updatedAt || null,
        updatedBy: systemSetting?.updatedBy || null
      });

    } catch (error) {
      console.error('Get system settings error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch system settings'
      });
    }
  }
);

// PUT /api/system/settings - Update system settings
router.put('/settings', 
  authenticate, 
  requireRole([UserRole.SUPER_ADMIN]),
  auditLog('system_settings_update'),
  async (req, res) => {
    try {
      const settings = systemSettingsSchema.parse(req.body);

      // Validate working hours
      const startTime = settings.systemLimits.workingHoursStart;
      const endTime = settings.systemLimits.workingHoursEnd;
      
      if (startTime >= endTime) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Working hours start time must be before end time'
        });
      }

      // Save settings to database
      await prisma.systemSetting.upsert({
        where: { key: 'system_config' },
        update: {
          value: JSON.stringify(settings),
          updatedBy: req.user!.userId
        },
        create: {
          key: 'system_config',
          value: JSON.stringify(settings),
          description: 'System-wide configuration settings',
          updatedBy: req.user!.userId
        }
      });

      res.json({
        message: 'System settings updated successfully',
        settings,
        updatedAt: new Date(),
        updatedBy: req.user!.userId
      });

    } catch (error) {
      console.error('Update system settings error:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid settings data',
          details: error.errors
        });
      }

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to update system settings'
      });
    }
  }
);

// GET /api/system/metrics - Get system-wide metrics
router.get('/metrics', 
  authenticate, 
  requireRole([UserRole.SUPER_ADMIN]),
  async (req, res) => {
    try {
      const [
        totalBranches,
        activeBranches,
        totalUsers,
        activeUsers,
        totalBookings,
        totalSlots,
        totalAssessments,
        systemAlerts
      ] = await Promise.all([
        prisma.branch.count(),
        prisma.branch.count({ where: { isActive: true } }),
        prisma.user.count(),
        prisma.user.count({ where: { isActive: true } }),
        prisma.booking.count(),
        prisma.slot.count(),
        prisma.assessment.count(),
        // Mock system alerts - in real implementation, this would come from monitoring system
        Promise.resolve([])
      ]);

      // Get branch performance data
      const branchPerformance = await prisma.branch.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              users: {
                where: { isActive: true }
              },
              slots: true
            }
          },
          slots: {
            select: {
              capacity: true,
              bookings: {
                where: {
                  status: { in: ['CONFIRMED', 'COMPLETED', 'NO_SHOW'] }
                },
                select: { id: true, attended: true, status: true }
              }
            }
          }
        }
      });

      // Calculate branch metrics
      const branchMetrics = branchPerformance.map(branch => {
        const totalCapacity = branch.slots.reduce((sum, slot) => sum + slot.capacity, 0);
        const totalBookings = branch.slots.reduce((sum, slot) => sum + slot.bookings.length, 0);
        const attendedBookings = branch.slots.reduce((sum, slot) => 
          sum + slot.bookings.filter(booking => booking.attended === true).length, 0
        );
        const completedBookings = branch.slots.reduce((sum, slot) => 
          sum + slot.bookings.filter(booking => booking.status === 'COMPLETED' || booking.status === 'NO_SHOW').length, 0
        );

        return {
          id: branch.id,
          name: branch.name,
          bookings: totalBookings,
          students: branch._count.users,
          utilizationRate: totalCapacity > 0 ? (totalBookings / totalCapacity) * 100 : 0,
          attendanceRate: completedBookings > 0 ? (attendedBookings / completedBookings) * 100 : 0
        };
      });

      // Calculate overall metrics
      const overallUtilization = branchMetrics.length > 0 
        ? branchMetrics.reduce((sum, branch) => sum + branch.utilizationRate, 0) / branchMetrics.length 
        : 0;
      
      const overallAttendance = branchMetrics.length > 0 
        ? branchMetrics.reduce((sum, branch) => sum + branch.attendanceRate, 0) / branchMetrics.length 
        : 0;

      // Get recent activity (mock data for now)
      const recentActivity = await prisma.booking.findMany({
        take: 10,
        orderBy: { bookedAt: 'desc' },
        include: {
          student: { select: { name: true } },
          slot: {
            include: {
              teacher: { select: { name: true } },
              branch: { select: { name: true } }
            }
          }
        }
      });

      const activityData = recentActivity.map(booking => ({
        type: booking.status === 'CANCELLED' ? 'cancellation' : 'booking',
        description: booking.status === 'CANCELLED' 
          ? `${booking.student?.name} cancelled booking`
          : `${booking.student?.name} booked session with ${booking.slot.teacher?.name}`,
        branchName: booking.slot.branch?.name,
        timestamp: booking.bookedAt
      }));

      res.json({
        totalBranches,
        activeBranches,
        totalUsers,
        activeUsers,
        totalBookings,
        totalSlots,
        totalAssessments,
        utilizationRate: overallUtilization,
        attendanceRate: overallAttendance,
        branchPerformance: branchMetrics,
        recentActivity: activityData,
        systemAlerts
      });

    } catch (error) {
      console.error('Get system metrics error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch system metrics'
      });
    }
  }
);

// GET /api/system/audit-logs - Get audit logs
router.get('/audit-logs', 
  authenticate, 
  requireRole([UserRole.SUPER_ADMIN]),
  async (req, res) => {
    try {
      const { page = 1, limit = 50, action, userId, startDate, endDate } = req.query;
      
      const skip = (Number(page) - 1) * Number(limit);
      
      // Build where clause
      const where: any = {};
      
      if (action) {
        where.action = { contains: action as string, mode: 'insensitive' };
      }
      
      if (userId) {
        where.userId = userId as string;
      }
      
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = new Date(startDate as string);
        }
        if (endDate) {
          where.createdAt.lte = new Date(endDate as string);
        }
      }

      const [auditLogs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { timestamp: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        }),
        prisma.auditLog.count({ where })
      ]);

      res.json({
        auditLogs,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });

    } catch (error) {
      console.error('Get audit logs error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch audit logs'
      });
    }
  }
);

// GET /api/system/health - System health check
router.get('/health', 
  authenticate, 
  requireRole([UserRole.SUPER_ADMIN]),
  async (req, res) => {
    try {
      // Check database connection
      await prisma.$queryRaw`SELECT 1`;
      
      // Check system components
      const health = {
        database: 'healthy',
        smsService: 'active', // This would be checked against actual SMS service
        notifications: 'running',
        auditLogs: 'recording',
        timestamp: new Date()
      };

      res.json(health);

    } catch (error) {
      console.error('System health check error:', error);
      res.status(500).json({
        error: 'System Health Check Failed',
        message: 'One or more system components are not responding'
      });
    }
  }
);

export default router;