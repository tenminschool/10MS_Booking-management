import express from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { supabase } from '../lib/supabase';
import { UserRole } from '../types/auth';

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

// GET /api/assessments - Get all assessments (Admin only)
router.get('/', 
  authenticate, 
  requireRole([UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN]),
  async (req, res) => {
    try {
      const user = req.user!;
      const { page = 1, limit = 20, search, status, teacherId, studentId } = req.query;
      
      const offset = (Number(page) - 1) * Number(limit);
      
      // Build query
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
        `, { count: 'exact' })
        .order('assessedAt', { ascending: false })
        .range(offset, offset + Number(limit) - 1);

      // Apply filters
      if (search) {
        query = query.or(`booking.student.name.ilike.%${search}%,booking.slot.teacher.name.ilike.%${search}%`);
      }
      
      if (status) {
        if (status === 'draft') {
          query = query.eq('isDraft', true);
        } else if (status === 'completed') {
          query = query.eq('isDraft', false);
        }
      }
      
      if (teacherId) {
        query = query.eq('teacherId', teacherId);
      }
      
      if (studentId) {
        query = query.eq('studentId', studentId);
      }

      // Branch admin can only see assessments from their branch
      if (user.role === UserRole.BRANCH_ADMIN && user.branchId) {
        query = query.eq('booking.slot.branchId', user.branchId);
      }

      const { data: assessments, error, count } = await query;

      if (error) {
        console.error('Error fetching assessments:', error);
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to fetch assessments'
        });
      }

      res.json({
        assessments: assessments || [],
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: count || 0,
          pages: Math.ceil((count || 0) / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching assessments:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch assessments'
      });
    }
  }
);

export default router;