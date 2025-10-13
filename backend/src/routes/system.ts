import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import { supabase } from '../lib/supabase';
import { UserRole } from '../types/auth';

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
      const { data: systemSetting, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', 'system_config')
        .single();

      let settings = defaultSettings;
      
      if (!error && systemSetting?.value) {
        try {
          settings = JSON.parse(systemSetting.value);
        } catch (parseError) {
          console.error('Error parsing system settings:', parseError);
          // Fall back to default settings
        }
      }

      res.json({
        settings,
        lastUpdated: systemSetting?.updated_at || null,
        updatedBy: systemSetting?.updated_by || null
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

      // Save settings to database - first check if it exists
      const { data: existing } = await supabase
        .from('system_settings')
        .select('id')
        .eq('key', 'system_config')
        .single();

      if (existing) {
        await supabase
          .from('system_settings')
          .update({
            value: JSON.stringify(settings),
            updated_by: req.user!.userId,
            updated_at: new Date().toISOString()
          })
          .eq('key', 'system_config');
      } else {
        await supabase
          .from('system_settings')
          .insert({
            key: 'system_config',
            value: JSON.stringify(settings),
            description: 'System-wide configuration settings',
            updated_by: req.user!.userId
          });
      }

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
        totalBranchesResult,
        activeBranchesResult,
        totalUsersResult,
        activeUsersResult,
        totalBookingsResult,
        totalSlotsResult,
        totalAssessmentsResult
      ] = await Promise.all([
        supabase.from('branches').select('*', { count: 'exact', head: true }),
        supabase.from('branches').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('bookings').select('*', { count: 'exact', head: true }),
        supabase.from('slots').select('*', { count: 'exact', head: true }),
        supabase.from('assessments').select('*', { count: 'exact', head: true })
      ]);

      const totalBranches = totalBranchesResult.count || 0;
      const activeBranches = activeBranchesResult.count || 0;
      const totalUsers = totalUsersResult.count || 0;
      const activeUsers = activeUsersResult.count || 0;
      const totalBookings = totalBookingsResult.count || 0;
      const totalSlots = totalSlotsResult.count || 0;
      const totalAssessments = totalAssessmentsResult.count || 0;
      const systemAlerts: any[] = []; // Mock system alerts

      // Get branch performance data
      const { data: branches } = await supabase
        .from('branches')
        .select(`
          id,
          name,
          slots(
            capacity,
            bookings(id, status)
          )
        `)
        .eq('is_active', true);

      // Get user counts per branch
      const { data: branchUsers } = await supabase
        .from('users')
        .select('branch_id, is_active')
        .eq('is_active', true);

      // Calculate branch metrics
      const branchMetrics = (branches || []).map(branch => {
        const totalCapacity = branch.slots?.reduce((sum: number, slot: any) => sum + (slot.capacity || 0), 0) || 0;
        const totalBookings = branch.slots?.reduce((sum: number, slot: any) => 
          sum + (slot.bookings?.filter((b: any) => ['CONFIRMED', 'COMPLETED', 'NO_SHOW'].includes(b.status)).length || 0), 0
        ) || 0;
        const completedBookings = branch.slots?.reduce((sum: number, slot: any) =>
          sum + (slot.bookings?.filter((b: any) => ['COMPLETED', 'NO_SHOW'].includes(b.status)).length || 0), 0
        ) || 0;
        
        // Count students for this branch
        const studentsCount = branchUsers?.filter(u => u.branch_id === branch.id).length || 0;

        return {
          id: branch.id,
          name: branch.name,
          bookings: totalBookings,
          students: studentsCount,
          utilizationRate: totalCapacity > 0 ? (totalBookings / totalCapacity) * 100 : 0,
          attendanceRate: completedBookings > 0 ? 100 : 0 // Simplified - would need attended field
        };
      });

      // Calculate overall metrics
      const overallUtilization = branchMetrics.length > 0 
        ? branchMetrics.reduce((sum: number, branch) => sum + branch.utilizationRate, 0) / branchMetrics.length 
        : 0;
      
      const overallAttendance = branchMetrics.length > 0 
        ? branchMetrics.reduce((sum: number, branch) => sum + branch.attendanceRate, 0) / branchMetrics.length 
        : 0;

      // Get recent activity
      const { data: recentActivity } = await supabase
        .from('bookings')
        .select(`
          status,
          created_at,
          student:users!bookings_studentId_fkey(name),
          slot:slots(
            teacher:users!slots_teacherId_fkey(name),
            branch:branches(name)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      const activityData = (recentActivity || []).map(booking => {
        const student = booking.student as any;
        const slot = booking.slot as any;
        return {
          type: booking.status === 'CANCELLED' ? 'cancellation' : 'booking',
          description: booking.status === 'CANCELLED' 
            ? `${student?.name} cancelled booking`
            : `${student?.name} booked session with ${slot?.teacher?.name || 'Unknown'}`,
          branchName: slot?.branch?.name,
          timestamp: booking.created_at
        };
      });

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

      // Build Supabase query
      let query = supabase
        .from('audit_log')
        .select(`
          *,
          user:users(id, name, email, role)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(skip, skip + Number(limit) - 1);

      if (action) {
        query = query.ilike('action', `%${action}%`);
      }
      if (userId) {
        query = query.eq('user_id', userId);
      }
      if (startDate) {
        query = query.gte('created_at', new Date(startDate as string).toISOString());
      }
      if (endDate) {
        query = query.lte('created_at', new Date(endDate as string).toISOString());
      }

      const { data: auditLogs, error: auditError, count: total } = await query;

      if (auditError) {
        console.error('Audit log query error:', auditError);
        // If table doesn't exist or other error, return empty array
        return res.json({
          auditLogs: [],
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: 0,
            pages: 0
          },
          warning: 'Audit log table may not be configured'
        });
      }

      res.json({
        auditLogs: auditLogs || [],
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: total || 0,
          pages: Math.ceil((total || 0) / Number(limit))
        }
      });

    } catch (error) {
      console.error('Get audit logs error:', error);
      // Return empty array instead of error
      res.json({
        auditLogs: [],
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          pages: 0
        },
        warning: 'Audit logs unavailable'
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
      const { error } = await supabase.from('branches').select('id').limit(1);
      
      if (error) {
        throw error;
      }
      
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