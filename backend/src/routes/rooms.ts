import express from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { supabase } from '../lib/supabase';
import { UserRole, RoomType, CreateRoomRequest, UpdateRoomRequest } from '../types/database';
import { z } from 'zod';

const router = express.Router();

// Validation schemas
const createRoomSchema = z.object({
  branchId: z.string().min(1, 'Branch ID is required'),
  roomNumber: z.string().min(1, 'Room number is required').max(20, 'Room number must be less than 20 characters'),
  roomName: z.string().min(2, 'Room name must be at least 2 characters').max(100, 'Room name must be less than 100 characters'),
  roomType: z.enum(['general', 'computer_lab', 'counselling', 'exam_hall']).optional(),
  capacity: z.number().int().min(1, 'Capacity must be at least 1').max(100, 'Capacity cannot exceed 100'),
  equipment: z.array(z.string()).optional()
});

const updateRoomSchema = createRoomSchema.partial().extend({
  isActive: z.boolean().optional()
});

// GET /api/rooms - Get all rooms
router.get('/', authenticate, async (req, res) => {
  try {
    const { branchId, roomType, isActive } = req.query;

    let query = supabase
      .from('rooms')
      .select(`
        *,
        branch:branches(id, name)
      `)
      .order('branch_id', { ascending: true })
      .order('room_number', { ascending: true });

    // Apply filters
    if (branchId) {
      query = query.eq('branch_id', branchId);
    }
    if (roomType) {
      query = query.eq('room_type', roomType);
    }
    if (isActive !== undefined) {
      query = query.eq('is_active', isActive === 'true');
    }

    const { data: rooms, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch rooms: ${error.message}`);
    }

    res.json(rooms || []);
  } catch (error: any) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({
      error: 'Failed to fetch rooms',
      message: error.message
    });
  }
});

// GET /api/rooms/branch/:branchId - Get rooms by branch
router.get('/branch/:branchId', authenticate, async (req, res) => {
  try {
    const { branchId } = req.params;
    const { roomType, isActive } = req.query;

    let query = supabase
      .from('rooms')
      .select(`
        *,
        branch:branches(id, name)
      `)
      .eq('branch_id', branchId)
      .order('room_number', { ascending: true });

    // Apply filters
    if (roomType) {
      query = query.eq('room_type', roomType);
    }
    if (isActive !== undefined) {
      query = query.eq('is_active', isActive === 'true');
    }

    const { data: rooms, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch rooms for branch: ${error.message}`);
    }

    res.json(rooms || []);
  } catch (error: any) {
    console.error('Error fetching rooms by branch:', error);
    res.status(500).json({
      error: 'Failed to fetch rooms for branch',
      message: error.message
    });
  }
});

// GET /api/rooms/:id - Get room by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: room, error } = await supabase
      .from('rooms')
      .select(`
        *,
        branch:branches(id, name)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Room not found',
          message: `Room with ID ${id} does not exist`
        });
      }
      throw new Error(`Failed to fetch room: ${error.message}`);
    }

    res.json(room);
  } catch (error: any) {
    console.error('Error fetching room:', error);
    res.status(500).json({
      error: 'Failed to fetch room',
      message: error.message
    });
  }
});

// POST /api/rooms - Create new room (Admin only)
router.post('/',
  authenticate,
  requireRole([UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN]),
  validateBody(createRoomSchema),
  async (req, res) => {
    try {
      const roomData: CreateRoomRequest = req.body;

      // Check if branch exists
      const { data: branch, error: branchError } = await supabase
        .from('branches')
        .select('id')
        .eq('id', roomData.branchId)
        .single();

      if (branchError) {
        if (branchError.code === 'PGRST116') {
          return res.status(400).json({
            error: 'Branch not found',
            message: `Branch with ID ${roomData.branchId} does not exist`
          });
        }
        throw new Error(`Failed to check branch: ${branchError.message}`);
      }

      // Check if room number already exists in the branch
      const { data: existingRoom, error: roomCheckError } = await supabase
        .from('rooms')
        .select('id')
        .eq('branch_id', roomData.branchId)
        .eq('room_number', roomData.roomNumber)
        .single();

      if (roomCheckError && roomCheckError.code !== 'PGRST116') {
        throw new Error(`Failed to check room number: ${roomCheckError.message}`);
      }

      if (existingRoom) {
        return res.status(400).json({
          error: 'Room number already exists',
          message: `Room number '${roomData.roomNumber}' already exists in this branch`
        });
      }

      // Create room
      const { data: room, error } = await supabase
        .from('rooms')
        .insert([{
          branch_id: roomData.branchId,
          room_number: roomData.roomNumber,
          room_name: roomData.roomName,
          room_type: roomData.roomType || 'general',
          capacity: roomData.capacity,
          equipment: roomData.equipment || []
        }])
        .select(`
          *,
          branch:branches(id, name)
        `)
        .single();

      if (error) {
        throw new Error(`Failed to create room: ${error.message}`);
      }

      res.status(201).json(room);
    } catch (error: any) {
      console.error('Error creating room:', error);
      res.status(500).json({
        error: 'Failed to create room',
        message: error.message
      });
    }
  }
);

// PUT /api/rooms/:id - Update room (Admin only)
router.put('/:id',
  authenticate,
  requireRole([UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN]),
  validateBody(updateRoomSchema),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updateData: UpdateRoomRequest = req.body;

      // Check if room exists
      const { data: existingRoom, error: checkError } = await supabase
        .from('rooms')
        .select('id, branch_id')
        .eq('id', id)
        .single();

      if (checkError) {
        if (checkError.code === 'PGRST116') {
          return res.status(404).json({
            error: 'Room not found',
            message: `Room with ID ${id} does not exist`
          });
        }
        throw new Error(`Failed to check room: ${checkError.message}`);
      }

      // If updating room number, check if new number already exists in the branch
      if (updateData.roomNumber) {
        const { data: roomExists, error: roomCheckError } = await supabase
          .from('rooms')
          .select('id')
          .eq('branch_id', existingRoom.branch_id)
          .eq('room_number', updateData.roomNumber)
          .neq('id', id)
          .single();

        if (roomCheckError && roomCheckError.code !== 'PGRST116') {
          throw new Error(`Failed to check room number: ${roomCheckError.message}`);
        }

        if (roomExists) {
          return res.status(400).json({
            error: 'Room number already exists',
            message: `Room number '${updateData.roomNumber}' already exists in this branch`
          });
        }
      }

      // Prepare update data
      const updateFields: any = {};
      if (updateData.roomNumber !== undefined) updateFields.room_number = updateData.roomNumber;
      if (updateData.roomName !== undefined) updateFields.room_name = updateData.roomName;
      if (updateData.roomType !== undefined) updateFields.room_type = updateData.roomType;
      if (updateData.capacity !== undefined) updateFields.capacity = updateData.capacity;
      if (updateData.equipment !== undefined) updateFields.equipment = updateData.equipment;
      if (updateData.isActive !== undefined) updateFields.is_active = updateData.isActive;
      updateFields.updated_at = new Date().toISOString();

      // Update room
      const { data: room, error } = await supabase
        .from('rooms')
        .update(updateFields)
        .eq('id', id)
        .select(`
          *,
          branch:branches(id, name)
        `)
        .single();

      if (error) {
        throw new Error(`Failed to update room: ${error.message}`);
      }

      res.json(room);
    } catch (error: any) {
      console.error('Error updating room:', error);
      res.status(500).json({
        error: 'Failed to update room',
        message: error.message
      });
    }
  }
);

// DELETE /api/rooms/:id - Delete room (Admin only)
router.delete('/:id',
  authenticate,
  requireRole([UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN]),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check if room exists
      const { data: existingRoom, error: checkError } = await supabase
        .from('rooms')
        .select('id')
        .eq('id', id)
        .single();

      if (checkError) {
        if (checkError.code === 'PGRST116') {
          return res.status(404).json({
            error: 'Room not found',
            message: `Room with ID ${id} does not exist`
          });
        }
        throw new Error(`Failed to check room: ${checkError.message}`);
      }

      // Check if room is being used in slots
      const { data: slotsUsingRoom, error: slotsError } = await supabase
        .from('slots')
        .select('id')
        .eq('room_id', id)
        .limit(1);

      if (slotsError) {
        throw new Error(`Failed to check slots usage: ${slotsError.message}`);
      }

      if (slotsUsingRoom && slotsUsingRoom.length > 0) {
        return res.status(400).json({
          error: 'Cannot delete room',
          message: 'Room is being used in existing slots. Please deactivate instead of deleting.'
        });
      }

      // Delete room
      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to delete room: ${error.message}`);
      }

      res.status(204).send();
    } catch (error: any) {
      console.error('Error deleting room:', error);
      res.status(500).json({
        error: 'Failed to delete room',
        message: error.message
      });
    }
  }
);

export default router;
