import express from 'express';
import { supabase } from '../lib/supabase';
import { authenticate, requireRole } from '../middleware/auth';
import { UserRole } from '../types/auth';

const router = express.Router();

// Get admin dashboard data
router.get('/', 
  authenticate, 
  requireRole(['SUPER_ADMIN', 'BRANCH_ADMIN']),
  async (req, res) => {
    try {
      const user = req.user!;
      const isSuperAdmin = user.role === UserRole.SUPER_ADMIN;

      // Get basic stats
      const [
        { count: totalUsers },
        { count: activeUsers },
        { count: totalBranches },
        { count: activeBranches },
        { count: totalBookings },
        { count: confirmedBookings },
        { count: totalSlots },
        { count: totalNotifications }
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('isActive', true),
        supabase.from('branches').select('*', { count: 'exact', head: true }),
        supabase.from('branches').select('*', { count: 'exact', head: true }).eq('isActive', true),
        supabase.from('bookings').select('*', { count: 'exact', head: true }),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'CONFIRMED'),
        supabase.from('slots').select('*', { count: 'exact', head: true }),
        supabase.from('notifications').select('*', { count: 'exact', head: true })
      ]);

      // Get role-based stats
      const [
        { count: students },
        { count: teachers },
        { count: branchAdmins },
        { count: superAdmins }
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', UserRole.STUDENT).eq('isActive', true),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', UserRole.TEACHER).eq('isActive', true),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', UserRole.BRANCH_ADMIN).eq('isActive', true),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', UserRole.SUPER_ADMIN).eq('isActive', true)
      ]);

      // Get recent activity
      const { data: recentBookings } = await supabase
        .from('bookings')
        .select(`
          *,
          student:users!bookings_studentId_fkey(id, name),
          slot:slots(
            *,
            branch:branches(id, name),
            teacher:users!slots_teacherId_fkey(id, name)
          )
        `)
        .order('createdAt', { ascending: false })
        .limit(10);

      // Get recent users
      const { data: recentUsers } = await supabase
        .from('users')
        .select(`
          *,
          branch:branches(id, name)
        `)
        .order('createdAt', { ascending: false })
        .limit(10);

      // Get branch performance (Super Admin only)
      let branchPerformance = [];
      if (isSuperAdmin) {
        const { data: branches } = await supabase
          .from('branches')
          .select(`
            *,
            users:users(count),
            slots:slots(count),
            bookings:bookings(count)
          `)
          .eq('isActive', true)
          .limit(10);

        branchPerformance = branches || [];
      }

      // Get system health
      const systemHealth = {
        database: 'connected',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
      };

      res.json({
        stats: {
          users: {
            total: totalUsers || 0,
            active: activeUsers || 0,
            students: students || 0,
            teachers: teachers || 0,
            branchAdmins: branchAdmins || 0,
            superAdmins: superAdmins || 0
          },
          branches: {
            total: totalBranches || 0,
            active: activeBranches || 0
          },
          bookings: {
            total: totalBookings || 0,
            confirmed: confirmedBookings || 0
          },
          slots: {
            total: totalSlots || 0
          },
          notifications: {
            total: totalNotifications || 0
          }
        },
        recentActivity: {
          bookings: recentBookings || [],
          users: recentUsers || []
        },
        branchPerformance: isSuperAdmin ? branchPerformance : [],
        systemHealth,
        userRole: user.role,
        isSuperAdmin
      });
    } catch (error: any) {
      console.error('Error fetching admin dashboard data:', error);
      res.status(500).json({
        error: 'Failed to fetch admin dashboard data',
        message: error.message
      });
    }
  }
);

export default router;
