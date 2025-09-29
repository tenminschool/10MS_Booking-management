import express from 'express';
import { authenticate } from '../middleware/auth';
import { supabase } from '../lib/supabase';

const router = express.Router();

// GET /api/bookings - Get user's bookings (role-based)
router.get('/', authenticate, async (req, res) => {
  try {
    const user = req.user!;
    console.log('User object:', user);
    
    // Query bookings from Supabase database
    let query = supabase
      .from('bookings')
      .select('*')
      .order('bookedAt', { ascending: false });

    // Apply role-based filtering
    if (user.role === 'STUDENT') {
      query = query.eq('studentId', user.userId);
    } else if (user.role === 'TEACHER') {
      // Teachers can see bookings for their slots - simplified for now
      // query = query.eq('slot.teacherId', user.userId);
    } else if (user.role === 'BRANCH_ADMIN') {
      // Branch admins can see bookings for their branch - simplified for now
      // query = query.eq('slot.branchId', user.branchId);
    }
    // Super admin can see all bookings (no additional filter)

    console.log('Executing query...');
    const { data: bookings, error } = await query;
    console.log('Query result:', { bookings: bookings?.length, error });

    if (error) {
      console.error('Error fetching bookings:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch bookings',
        details: error.message
      });
    }

    res.json(bookings || []);
  } catch (error: any) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch bookings',
      details: error.message
    });
  }
});

// POST /api/bookings - Create a new booking
router.post('/', authenticate, async (req, res) => {
  try {
    const user = req.user!;
    const { slotId, studentPhoneNumber } = req.body;

    if (!slotId) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'slotId is required'
      });
    }

    // Only students can create bookings
    if (user.role !== 'STUDENT') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only students can create bookings'
      });
    }

    // Check if slot exists and is available
    const { data: slot, error: slotError } = await supabase
      .from('slots')
      .select('*, branch:branches(*), teacher:users!slots_teacherId_fkey(*)')
      .eq('id', slotId)
      .single();

    if (slotError || !slot) {
      return res.status(404).json({
        error: 'Slot not found',
        message: 'The requested slot does not exist'
      });
    }

    // Check if slot is available
    const { data: existingBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id')
      .eq('slotId', slotId)
      .eq('status', 'CONFIRMED');

    if (bookingsError) {
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to check slot availability'
      });
    }

    const bookedCount = existingBookings?.length || 0;
    if (bookedCount >= slot.capacity) {
      return res.status(400).json({
        error: 'Slot full',
        message: 'This slot is already fully booked'
      });
    }

    // Check if user already has a booking for this slot
    const { data: existingUserBooking, error: userBookingError } = await supabase
      .from('bookings')
      .select('id')
      .eq('studentId', user.userId)
      .eq('slotId', slotId)
      .eq('status', 'CONFIRMED');

    if (userBookingError) {
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to check existing bookings'
      });
    }

    if (existingUserBooking && existingUserBooking.length > 0) {
      return res.status(400).json({
        error: 'Already booked',
        message: 'You have already booked this slot'
      });
    }

    // Create the booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        studentId: user.userId,
        slotId: slotId,
        status: 'CONFIRMED',
        bookedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .select(`
        *,
        slot:slots(
          *,
          branch:branches(id, name),
          teacher:users!slots_teacherId_fkey(id, name)
        )
      `)
      .single();

    if (bookingError) {
      console.error('Booking creation error:', bookingError);
      return res.status(500).json({
        error: 'Booking failed',
        message: 'Failed to create booking'
      });
    }

    res.status(201).json(booking);

  } catch (error) {
    console.error('Booking creation error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create booking'
    });
  }
});

export default router;
