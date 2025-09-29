import express from 'express';
import { authenticate } from '../middleware/auth';
import { supabase } from '../lib/supabase';

const router = express.Router();

// GET /api/assessments/my - Get user's assessments (role-based)
router.get('/my', authenticate, async (req, res) => {
  try {
    const user = req.user!;
    
    // Query assessments from Supabase database
    let query = supabase
      .from('assessments')
      .select(`
        *,
        booking:bookings(
          *,
          slot:slots(
            *,
            branch:branches(id, name),
            teacher:users!slots_teacherId_fkey(id, name)
          ),
          student:users!bookings_studentId_fkey(id, name, phoneNumber)
        ),
        teacher:users!assessments_teacherId_fkey(id, name)
      `)
      .order('assessedAt', { ascending: false });

    // Apply role-based filtering
    if (user.role === 'STUDENT') {
      query = query.eq('studentId', user.userId);
    } else if (user.role === 'TEACHER') {
      query = query.eq('teacherId', user.userId);
    } else if (user.role === 'BRANCH_ADMIN') {
      // For branch admin, filter by branch through booking->slot relationship
      // This requires a more complex query, for now return all
    }
    // Super admin can see all assessments (no additional filter)

    const { data: assessments, error } = await query;

    if (error) {
      console.error('Error fetching assessments:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch assessments'
      });
    }

    res.json(assessments || []);
  } catch (error) {
    console.error('Error fetching assessments:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch assessments'
    });
  }
});

export default router;