import express from 'express';
import { authenticate } from '../middleware/auth';
import { supabase } from '../lib/supabase';

const router = express.Router();

// GET /api/slots - Get available slots (role-based)
router.get('/', authenticate, async (req, res) => {
  try {
    // Query slots from Supabase database with related data
    const { data: slots, error } = await supabase
      .from('slots')
      .select(`
        *,
        branch:branches(id, name),
        teacher:users!slots_teacherId_fkey(id, name),
        bookings:bookings(id, status)
      `)
      .eq('isBlocked', false)
      .gte('date', new Date().toISOString().split('T')[0]) // Only future dates
      .order('date', { ascending: true })
      .order('startTime', { ascending: true });

    if (error) {
      console.error('Error fetching slots:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch slots'
      });
    }

    // Calculate availability for each slot
    const slotsWithAvailability = slots?.map(slot => {
      const bookedCount = slot.bookings?.filter((booking: any) => 
        booking.status === 'CONFIRMED' || booking.status === 'COMPLETED'
      ).length || 0;
      
      const availableSpots = slot.capacity - bookedCount;
      
      return {
        ...slot,
        availableSpots,
        isAvailable: availableSpots > 0,
        bookings: slot.bookings || []
      };
    }) || [];

    res.json(slotsWithAvailability);
  } catch (error) {
    console.error('Error fetching slots:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch slots'
    });
  }
});

export default router;