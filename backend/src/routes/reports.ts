import express from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { authenticate, requireRole } from '../middleware/auth';
import { UserRole } from '../types/auth';
import { format as formatDate, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth } from 'date-fns';

const router = express.Router();

// Validation schemas
const reportFiltersSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format'),
  branchId: z.string().optional(),
  teacherId: z.string().optional(),
  reportType: z.enum(['overview', 'attendance', 'utilization', 'assessments']).default('overview')
});

// Helper function to get date range
const getDateRange = (startDate: string, endDate: string) => {
  return {
    startDate: startOfDay(new Date(startDate)),
    endDate: endOfDay(new Date(endDate))
  };
};

// Helper function to check branch access
const checkBranchAccess = (user: any, requestedBranchId?: string) => {
  if (user.role === UserRole.SUPER_ADMIN) {
    return requestedBranchId; // Super admin can access any branch
  } else if (user.role === UserRole.BRANCH_ADMIN) {
    return user.branchId; // Branch admin can only access their branch
  }
  return null;
};

// GET /api/reports - Get comprehensive reports
router.get('/', authenticate, requireRole([UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN]), async (req, res) => {
  try {
    const filters = reportFiltersSchema.parse(req.query);
    const user = req.user!;

    // Check branch access
    const branchId = checkBranchAccess(user, filters.branchId);
    const { startDate, endDate } = getDateRange(filters.startDate, filters.endDate);

    // Build Supabase queries for overview metrics
    let bookingsQuery = supabase
      .from('bookings')
      .select(`
        *,
        slot:slots(date, branch_id, teacher_id)
      `)
      .gte('slot.date', startDate.toISOString())
      .lte('slot.date', endDate.toISOString());

    if (branchId) {
      bookingsQuery = bookingsQuery.eq('slot.branch_id', branchId);
    }

    if (filters.teacherId) {
      bookingsQuery = bookingsQuery.eq('slot.teacher_id', filters.teacherId);
    }

    const { data: bookings, error: bookingsError } = await bookingsQuery;

    if (bookingsError) {
      throw bookingsError;
    }

    // Calculate metrics from the data
    const totalBookings = bookings?.length || 0;
    const completedBookings = bookings?.filter(b => ['COMPLETED', 'NO_SHOW'].includes(b.status)).length || 0;
    const confirmedBookings = bookings?.filter(b => b.status === 'CONFIRMED').length || 0;
    const cancelledBookings = bookings?.filter(b => b.status === 'CANCELLED').length || 0;

    // Get slots count
    let slotsQuery = supabase
      .from('slots')
      .select('*', { count: 'exact', head: true })
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString());

    if (branchId) {
      slotsQuery = slotsQuery.eq('branch_id', branchId);
    }

    if (filters.teacherId) {
      slotsQuery = slotsQuery.eq('teacher_id', filters.teacherId);
    }

    const { count: totalSlots } = await slotsQuery;

    const reportData = {
      overview: {
        totalBookings,
        completedBookings,
        confirmedBookings,
        cancelledBookings,
        totalSlots: totalSlots || 0,
        utilizationRate: totalSlots ? (totalBookings / totalSlots) * 100 : 0,
        attendanceRate: completedBookings ? ((completedBookings - bookings?.filter(b => b.status === 'NO_SHOW').length || 0) / completedBookings) * 100 : 0
      },
      period: {
        startDate: filters.startDate,
        endDate: filters.endDate
      }
    };

    res.json(reportData);

  } catch (error) {
    console.error('Reports error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid report filters',
        details: error.errors
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate report'
    });
  }
});

// GET /api/reports/export - Export reports
router.get('/export', authenticate, requireRole([UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN]), async (req, res) => {
  try {
    const filters = reportFiltersSchema.parse(req.query);
    const user = req.user!;

    // Check branch access
    const branchId = checkBranchAccess(user, filters.branchId);
    const { startDate, endDate } = getDateRange(filters.startDate, filters.endDate);

    // Get bookings with related data for export
    let query = supabase
      .from('bookings')
      .select(`
        *,
        student:users!bookings_studentId_fkey(name, email, phone_number),
        slot:slots(
          date,
          start_time,
          end_time,
          teacher:users!slots_teacherId_fkey(name),
          branch:branches(name)
        )
      `)
      .gte('slot.date', startDate.toISOString())
      .lte('slot.date', endDate.toISOString())
      .order('slot.date', { ascending: false });

    if (branchId) {
      query = query.eq('slot.branch_id', branchId);
    }

    const { data: bookings, error } = await query;

    if (error) {
      throw error;
    }

    // Format data for export
    const exportData = (bookings || []).map(booking => ({
      bookingId: booking.id,
      studentName: booking.student?.name,
      studentEmail: booking.student?.email,
      studentPhone: booking.student?.phone_number,
      date: booking.slot?.date,
      time: `${booking.slot?.start_time} - ${booking.slot?.end_time}`,
      teacher: booking.slot?.teacher?.name,
      branch: booking.slot?.branch?.name,
      status: booking.status,
      createdAt: booking.created_at
    }));

    // Return as JSON (can be extended to support CSV, Excel, etc.)
    res.json({
      data: exportData,
      count: exportData.length,
      filters: {
        startDate: filters.startDate,
        endDate: filters.endDate,
        branchId,
        teacherId: filters.teacherId
      }
    });

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to export report'
    });
  }
});

// GET /api/reports/analytics - Get analytics data
router.get('/analytics', authenticate, requireRole([UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN]), async (req, res) => {
  try {
    const user = req.user!;
    const branchId = checkBranchAccess(user, req.query.branchId as string);

    // Get bookings for last 30 days
    const thirtyDaysAgo = subDays(new Date(), 30);

    let query = supabase
      .from('bookings')
      .select(`
        *,
        slot:slots(date, branch_id)
      `)
      .gte('slot.date', thirtyDaysAgo.toISOString());

    if (branchId) {
      query = query.eq('slot.branch_id', branchId);
    }

    const { data: bookings } = await query;

    // Group bookings by date for trend analysis
    const bookingsByDate: Record<string, number> = {};
    (bookings || []).forEach(booking => {
      const date = booking.slot?.date.split('T')[0];
      if (date) {
        bookingsByDate[date] = (bookingsByDate[date] || 0) + 1;
      }
    });

    // Calculate status distribution
    const statusDistribution: Record<string, number> = {};
    (bookings || []).forEach(booking => {
      statusDistribution[booking.status] = (statusDistribution[booking.status] || 0) + 1;
    });

    res.json({
      analytics: {
        totalBookings: bookings?.length || 0,
        bookingsTrend: bookingsByDate,
        statusDistribution,
        period: '30_days'
      }
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch analytics'
    });
  }
});

// GET /api/reports/real-time - Get real-time metrics
router.get('/real-time', authenticate, async (req, res) => {
  try {
    const user = req.user!;
    const today = new Date().toISOString().split('T')[0];

    // Build query based on user role
    let bookingsQuery = supabase
      .from('bookings')
      .select(`
        *,
        slot:slots(date, branch_id, teacher_id)
      `)
      .eq('slot.date', today);

    if (user.role === UserRole.BRANCH_ADMIN && user.branchId) {
      bookingsQuery = bookingsQuery.eq('slot.branch_id', user.branchId);
    } else if (user.role === UserRole.TEACHER) {
      bookingsQuery = bookingsQuery.eq('slot.teacher_id', user.userId);
    }

    const { data: todayBookings } = await bookingsQuery;

    // Get slots for today
    let slotsQuery = supabase
      .from('slots')
      .select('*', { count: 'exact' })
      .eq('date', today);

    if (user.role === UserRole.BRANCH_ADMIN && user.branchId) {
      slotsQuery = slotsQuery.eq('branch_id', user.branchId);
    } else if (user.role === UserRole.TEACHER) {
      slotsQuery = slotsQuery.eq('teacher_id', user.userId);
    }

    const { count: todaySlots } = await slotsQuery;

    const confirmedBookings = todayBookings?.filter(b => b.status === 'CONFIRMED').length || 0;
    const completedBookings = todayBookings?.filter(b => b.status === 'COMPLETED').length || 0;

    res.json({
      realTime: {
        date: today,
        totalSlots: todaySlots || 0,
        totalBookings: todayBookings?.length || 0,
        confirmedBookings,
        completedBookings,
        availableSlots: (todaySlots || 0) - (todayBookings?.length || 0)
      }
    });

  } catch (error) {
    console.error('Real-time metrics error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch real-time metrics'
    });
  }
});

// GET /api/reports/no-show-analysis - Get no-show analysis
router.get('/no-show-analysis', authenticate, requireRole([UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN]), async (req, res) => {
  try {
    const user = req.user!;
    const branchId = checkBranchAccess(user, req.query.branchId as string);

    // Get no-show bookings from last 90 days
    const ninetyDaysAgo = subDays(new Date(), 90);

    let query = supabase
      .from('bookings')
      .select(`
        *,
        student:users!bookings_studentId_fkey(id, name),
        slot:slots(date, branch_id, branch:branches(name))
      `)
      .eq('status', 'NO_SHOW')
      .gte('slot.date', ninetyDaysAgo.toISOString());

    if (branchId) {
      query = query.eq('slot.branch_id', branchId);
    }

    const { data: noShowBookings } = await query;

    // Group by student to find frequent no-shows
    const studentNoShows: Record<string, { name: string; count: number }> = {};
    (noShowBookings || []).forEach(booking => {
      const studentId = booking.student?.id;
      if (studentId) {
        if (!studentNoShows[studentId]) {
          studentNoShows[studentId] = {
            name: booking.student?.name || 'Unknown',
            count: 0
          };
        }
        studentNoShows[studentId].count++;
      }
    });

    // Group by branch
    const branchNoShows: Record<string, number> = {};
    (noShowBookings || []).forEach(booking => {
      const branchName = booking.slot?.branch?.name || 'Unknown';
      branchNoShows[branchName] = (branchNoShows[branchName] || 0) + 1;
    });

    res.json({
      noShowAnalysis: {
        totalNoShows: noShowBookings?.length || 0,
        period: '90_days',
        byStudent: Object.entries(studentNoShows)
          .map(([id, data]) => ({ studentId: id, ...data }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10), // Top 10 students with most no-shows
        byBranch: branchNoShows
      }
    });

  } catch (error) {
    console.error('No-show analysis error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to analyze no-shows'
    });
  }
});

export default router;
