import express from 'express';
import { supabase } from '../lib/supabase';
import { authenticate } from '../middleware/auth';
import { UserRole } from '../types/auth';

const router = express.Router();

// GET /api/dashboard - Get user's dashboard data
router.get('/', authenticate, async (req, res) => {
  try {
    const user = req.user!;
    
    // Get user-specific dashboard data based on role
    if (user.role === UserRole.STUDENT) {
      // Student dashboard data
      const [
        { data: bookings },
        { data: upcomingBookings },
        { data: completedBookings },
        { data: assessments }
      ] = await Promise.all([
        supabase
          .from('bookings')
          .select(`
            *,
            slot:slots(
              *,
              branch:branches(id, name),
              teacher:users!slots_teacherId_fkey(id, name)
            )
          `)
          .eq('studentId', user.userId)
          .order('bookedAt', { ascending: false }),
        
        supabase
          .from('bookings')
          .select(`
            *,
            slot:slots(
              *,
              branch:branches(id, name),
              teacher:users!slots_teacherId_fkey(id, name)
            )
          `)
          .eq('studentId', user.userId)
          .eq('status', 'CONFIRMED')
          .gte('slot.date', new Date().toISOString().split('T')[0])
          .order('slot.date', { ascending: true }),
        
        supabase
          .from('bookings')
          .select(`
            *,
            slot:slots(
              *,
              branch:branches(id, name),
              teacher:users!slots_teacherId_fkey(id, name)
            )
          `)
          .eq('studentId', user.userId)
          .eq('status', 'COMPLETED')
          .order('bookedAt', { ascending: false })
          .limit(5),
        
        supabase
          .from('assessments')
          .select('*')
          .eq('studentId', user.userId)
          .order('createdAt', { ascending: false })
          .limit(5)
      ]);

      res.json({
        user: {
          id: user.userId,
          name: user.name,
          email: user.email,
          role: user.role
        },
        stats: {
          totalBookings: bookings?.length || 0,
          upcomingBookings: upcomingBookings?.length || 0,
          completedBookings: completedBookings?.length || 0,
          totalAssessments: assessments?.length || 0
        },
        recentBookings: bookings?.slice(0, 5) || [],
        upcomingBookings: upcomingBookings || [],
        completedBookings: completedBookings || [],
        recentAssessments: assessments || []
      });

    } else if (user.role === UserRole.TEACHER) {
      // Teacher dashboard data
      const [
        { data: slots },
        { data: upcomingSlots },
        { data: bookings },
        { data: assessments }
      ] = await Promise.all([
        supabase
          .from('slots')
          .select(`
            *,
            branch:branches(id, name),
            bookings:bookings(
              *,
              student:users!bookings_studentId_fkey(id, name)
            )
          `)
          .eq('teacherId', user.userId)
          .order('date', { ascending: false }),
        
        supabase
          .from('slots')
          .select(`
            *,
            branch:branches(id, name),
            bookings:bookings(
              *,
              student:users!bookings_studentId_fkey(id, name)
            )
          `)
          .eq('teacherId', user.userId)
          .gte('date', new Date().toISOString().split('T')[0])
          .order('date', { ascending: true }),
        
        supabase
          .from('bookings')
          .select(`
            *,
            student:users!bookings_studentId_fkey(id, name),
            slot:slots(
              *,
              branch:branches(id, name)
            )
          `)
          .eq('slot.teacherId', user.userId)
          .order('bookedAt', { ascending: false })
          .limit(10),
        
        supabase
          .from('assessments')
          .select('*')
          .eq('teacherId', user.userId)
          .order('createdAt', { ascending: false })
          .limit(5)
      ]);

      res.json({
        user: {
          id: user.userId,
          name: user.name,
          email: user.email,
          role: user.role
        },
        stats: {
          totalSlots: slots?.length || 0,
          upcomingSlots: upcomingSlots?.length || 0,
          totalBookings: bookings?.length || 0,
          totalAssessments: assessments?.length || 0
        },
        recentSlots: slots?.slice(0, 5) || [],
        upcomingSlots: upcomingSlots || [],
        recentBookings: bookings || [],
        recentAssessments: assessments || []
      });

    } else {
      // For admins, redirect to admin dashboard
      return res.status(302).json({
        redirect: '/admin/dashboard',
        message: 'Admins should use the admin dashboard'
      });
    }

  } catch (error: any) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard data',
      message: error.message
    });
  }
});

export default router;
