import express from 'express';
import { authenticate } from '../middleware/auth';
import { supabase } from '../lib/supabase';

const router = express.Router();

// GET /api/bookings - Get user's bookings (role-based)
router.get('/', authenticate, async (req, res) => {
  try {
    const user = req.user!;
    
    // Query bookings from Supabase database
    let query = supabase
      .from('bookings')
      .select(`
        *,
        slot:slots(
          *,
          branch:branches(id, name),
          teacher:users!slots_teacherId_fkey(id, name)
        ),
        student:users!bookings_studentId_fkey(id, name, phoneNumber)
      `)
      .order('createdAt', { ascending: false });

    // Apply role-based filtering
    if (user.role === 'STUDENT') {
      query = query.eq('studentId', user.userId);
    } else if (user.role === 'TEACHER') {
      // Teachers can see bookings for their slots
      query = query.eq('slot.teacherId', user.userId);
    } else if (user.role === 'BRANCH_ADMIN') {
      // Branch admins can see bookings for their branch
      query = query.eq('slot.branchId', user.branchId);
    }
    // Super admin can see all bookings (no additional filter)

    const { data: bookings, error } = await query;

    if (error) {
      console.error('Error fetching bookings:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch bookings'
      });
    }

    res.json(bookings || []);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch bookings'
    });
  }
});

export default router;
