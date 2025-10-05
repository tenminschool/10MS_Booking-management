import express from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { supabase } from '../lib/supabase';
import { UserRole } from '../types/database';
import { z } from 'zod';

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
        serviceType:service_types(id, name, code, description, category, duration_minutes),
        room:rooms(id, room_number, room_name, room_type, capacity),
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

// GET /api/slots/admin - Get all slots for admin management (including blocked and past dates)
router.get('/admin', authenticate, async (req, res) => {
  try {
    const { branchId, teacherId, date, view } = req.query;
    
    // Build base query
    let query = supabase
      .from('slots')
      .select(`
        *,
        branch:branches(id, name),
        teacher:users!slots_teacherId_fkey(id, name),
        bookings:bookings(id, status)
      `);

    // Apply filters
    if (branchId) {
      query = query.eq('branchId', branchId);
    }
    if (teacherId) {
      query = query.eq('teacherId', teacherId);
    }
    if (date) {
      query = query.eq('date', date);
    }

    // Order by date and time
    query = query.order('date', { ascending: true })
                 .order('startTime', { ascending: true });

    const { data: slots, error } = await query;

    if (error) {
      console.error('Error fetching admin slots:', error);
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
    console.error('Error fetching admin slots:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch slots'
    });
  }
});

// Validation schemas
const createSlotSchema = z.object({
  branchId: z.string().min(1, 'Branch ID is required'),
  teacherId: z.string().min(1, 'Teacher ID is required'),
  serviceTypeId: z.string().min(1, 'Service Type ID is required'),
  roomId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format'),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format'),
  capacity: z.number().int().min(1, 'Capacity must be at least 1').max(100, 'Capacity cannot exceed 100'),
  price: z.number().min(0, 'Price must be non-negative').optional()
});

const updateSlotSchema = createSlotSchema.partial();

// POST /api/slots - Create new slot (Admin only)
router.post('/',
  authenticate,
  requireRole([UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN]),
  validateBody(createSlotSchema),
  async (req, res) => {
    try {
      const slotData = req.body;

      // Validate time slot
      const start = new Date(`2000-01-01T${slotData.startTime}:00`);
      const end = new Date(`2000-01-01T${slotData.endTime}:00`);
      
      if (start >= end) {
        return res.status(400).json({
          error: 'Invalid time slot',
          message: 'End time must be after start time'
        });
      }

      // Check if service type exists
      const { data: serviceType, error: serviceTypeError } = await supabase
        .from('service_types')
        .select('id, default_capacity, duration_minutes')
        .eq('id', slotData.serviceTypeId)
        .single();

      if (serviceTypeError || !serviceType) {
        return res.status(400).json({
          error: 'Invalid service type',
          message: 'Service type not found'
        });
      }

      // Check if room exists (if provided)
      if (slotData.roomId) {
        const { data: room, error: roomError } = await supabase
          .from('rooms')
          .select('id, branch_id, capacity')
          .eq('id', slotData.roomId)
          .single();

        if (roomError || !room) {
          return res.status(400).json({
            error: 'Invalid room',
            message: 'Room not found'
          });
        }

        // Check if room belongs to the same branch
        if (room.branch_id !== slotData.branchId) {
          return res.status(400).json({
            error: 'Invalid room',
            message: 'Room does not belong to the selected branch'
          });
        }

        // Use room capacity if no capacity specified
        if (!slotData.capacity) {
          slotData.capacity = room.capacity;
        }
      }

      // Use service type default capacity if no capacity specified
      if (!slotData.capacity) {
        slotData.capacity = serviceType.default_capacity;
      }

      // Create slot
      const { data: slot, error } = await supabase
        .from('slots')
        .insert([{
          branchId: slotData.branchId,
          teacherId: slotData.teacherId,
          serviceTypeId: slotData.serviceTypeId,
          roomId: slotData.roomId || null,
          date: slotData.date,
          startTime: slotData.startTime,
          endTime: slotData.endTime,
          capacity: slotData.capacity,
          price: slotData.price || null
        }])
        .select(`
          *,
          branch:branches(id, name),
          teacher:users!slots_teacherId_fkey(id, name),
          serviceType:service_types(id, name, code, description, category, duration_minutes),
          room:rooms(id, room_number, room_name, room_type, capacity)
        `)
        .single();

      if (error) {
        throw new Error(`Failed to create slot: ${error.message}`);
      }

      res.status(201).json(slot);
    } catch (error: any) {
      console.error('Error creating slot:', error);
      res.status(500).json({
        error: 'Failed to create slot',
        message: error.message
      });
    }
  }
);

// PUT /api/slots/:id - Update slot (Admin only)
router.put('/:id',
  authenticate,
  requireRole([UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN]),
  validateBody(updateSlotSchema),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Check if slot exists
      const { data: existingSlot, error: checkError } = await supabase
        .from('slots')
        .select('id')
        .eq('id', id)
        .single();

      if (checkError || !existingSlot) {
        return res.status(404).json({
          error: 'Slot not found',
          message: `Slot with ID ${id} does not exist`
        });
      }

      // Validate time slot if times are being updated
      if (updateData.startTime && updateData.endTime) {
        const start = new Date(`2000-01-01T${updateData.startTime}:00`);
        const end = new Date(`2000-01-01T${updateData.endTime}:00`);
        
        if (start >= end) {
          return res.status(400).json({
            error: 'Invalid time slot',
            message: 'End time must be after start time'
          });
        }
      }

      // Update slot
      const { data: slot, error } = await supabase
        .from('slots')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          branch:branches(id, name),
          teacher:users!slots_teacherId_fkey(id, name),
          serviceType:service_types(id, name, code, description, category, duration_minutes),
          room:rooms(id, room_number, room_name, room_type, capacity)
        `)
        .single();

      if (error) {
        throw new Error(`Failed to update slot: ${error.message}`);
      }

      res.json(slot);
    } catch (error: any) {
      console.error('Error updating slot:', error);
      res.status(500).json({
        error: 'Failed to update slot',
        message: error.message
      });
    }
  }
);

// DELETE /api/slots/:id - Delete slot (Admin only)
router.delete('/:id',
  authenticate,
  requireRole([UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN]),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check if slot exists
      const { data: existingSlot, error: checkError } = await supabase
        .from('slots')
        .select('id')
        .eq('id', id)
        .single();

      if (checkError || !existingSlot) {
        return res.status(404).json({
          error: 'Slot not found',
          message: `Slot with ID ${id} does not exist`
        });
      }

      // Check if slot has bookings
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id')
        .eq('slotId', id)
        .limit(1);

      if (bookingsError) {
        throw new Error(`Failed to check bookings: ${bookingsError.message}`);
      }

      if (bookings && bookings.length > 0) {
        return res.status(400).json({
          error: 'Cannot delete slot',
          message: 'Slot has existing bookings. Please cancel bookings first.'
        });
      }

      // Delete slot
      const { error } = await supabase
        .from('slots')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to delete slot: ${error.message}`);
      }

      res.status(204).send();
    } catch (error: any) {
      console.error('Error deleting slot:', error);
      res.status(500).json({
        error: 'Failed to delete slot',
        message: error.message
      });
    }
  }
);

export default router;