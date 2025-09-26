import express, { Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { authenticate, requireRole } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import {
  asyncHandler,
  NotFoundError,
  AuthorizationError,
  BusinessRuleError,
  ValidationError
} from '../middleware/errorHandler';
import { validateBody, validateQuery, validateParams } from '../middleware/validation';
import { z } from 'zod';

// Define types locally since we removed Prisma
type UserRole = 'SUPER_ADMIN' | 'BRANCH_ADMIN' | 'TEACHER' | 'STUDENT';

const router = express.Router();

// Validation schemas
const addToWaitingListSchema = z.object({
  slotId: z.string().min(1, 'Slot ID is required'),
  priority: z.number().min(1).max(10).optional().default(5)
});

const removeFromWaitingListSchema = z.object({
  slotId: z.string().min(1, 'Slot ID is required')
});

const convertToBookingSchema = z.object({
  slotId: z.string().min(1, 'Slot ID is required'),
  studentId: z.string().min(1, 'Student ID is required')
});

const idParamSchema = z.object({
  id: z.string().min(1, 'ID is required')
});

// Add student to waiting list
router.post('/', 
  authenticate, 
  validateBody(addToWaitingListSchema), 
  auditLog('waiting_list'),
  asyncHandler(async (req: Request, res: Response) => {
    const { slotId, priority } = req.body;
    const user = req.user!;

    // Only students can add themselves to waiting list
    if (user.role !== 'STUDENT') {
      throw new AuthorizationError('Only students can add themselves to waiting list');
    }

    // Check if slot exists and is full
    const { data: slot, error: slotError } = await supabase
      .from('slots')
      .select('id, capacity, booked_count, date, start_time, end_time, teacher_id, branch_id')
      .eq('id', slotId)
      .single();

    if (slotError || !slot) {
      throw new NotFoundError('Slot not found');
    }

    // Check if slot is actually full
    if (slot.booked_count < slot.capacity) {
      throw new BusinessRuleError('Slot is not full. You can book directly instead of joining waiting list.');
    }

    // Check if slot is in the future
    const slotDateTime = new Date(`${slot.date}T${slot.start_time}`);
    if (slotDateTime <= new Date()) {
      throw new BusinessRuleError('Cannot join waiting list for past slots');
    }

    // Check if student is already on waiting list for this slot
    const { data: existingEntry } = await supabase
      .from('waiting_list')
      .select('id')
      .eq('student_id', user.userId)
      .eq('slot_id', slotId)
      .single();

    if (existingEntry) {
      throw new BusinessRuleError('You are already on the waiting list for this slot');
    }

    // Add to waiting list
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

    const { data: waitingListEntry, error: insertError } = await supabase
      .from('waiting_list')
      .insert({
        student_id: user.userId,
        slot_id: slotId,
        priority,
        expires_at: expiresAt.toISOString()
      })
      .select(`
        *,
        student:users(name, email),
        slot:slots(
          id,
          date,
          start_time,
          end_time,
          capacity,
          booked_count,
          teacher:users(name),
          branch:branches(name)
        )
      `)
      .single();

    if (insertError) {
      throw new ValidationError(`Failed to add to waiting list: ${insertError.message}`);
    }

    res.status(201).json({
      success: true,
      message: 'Successfully added to waiting list',
      data: waitingListEntry
    });
  })
);

// Get student's waiting list entries
router.get('/my-waiting-list', 
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user!;

    if (user.role !== 'STUDENT') {
      throw new AuthorizationError('Only students can view their waiting list');
    }

    const { data: waitingListEntries, error } = await supabase
      .from('waiting_list')
      .select(`
        *,
        slot:slots(
          id,
          date,
          start_time,
          end_time,
          capacity,
          booked_count,
          teacher:users(name),
          branch:branches(name)
        )
      `)
      .eq('student_id', user.userId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      throw new ValidationError(`Failed to fetch waiting list: ${error.message}`);
    }

    res.json({
      success: true,
      data: waitingListEntries || []
    });
  })
);

// Remove student from waiting list
router.delete('/:slotId', 
  authenticate, 
  validateParams(z.object({ slotId: z.string() })),
  auditLog('waiting_list'),
  asyncHandler(async (req: Request, res: Response) => {
    const { slotId } = req.params;
    const user = req.user!;

    if (user.role !== 'STUDENT') {
      throw new AuthorizationError('Only students can remove themselves from waiting list');
    }

    const { error } = await supabase
      .from('waiting_list')
      .delete()
      .eq('student_id', user.userId)
      .eq('slot_id', slotId);

    if (error) {
      throw new ValidationError(`Failed to remove from waiting list: ${error.message}`);
    }

    res.json({
      success: true,
      message: 'Successfully removed from waiting list'
    });
  })
);

// Get waiting list for a specific slot (Admin only)
router.get('/slot/:slotId', 
  authenticate, 
  requireRole(['SUPER_ADMIN', 'BRANCH_ADMIN']),
  validateParams(z.object({ slotId: z.string() })),
  asyncHandler(async (req: Request, res: Response) => {
    const { slotId } = req.params;
    const user = req.user!;

    // Check if slot exists
    const { data: slot, error: slotError } = await supabase
      .from('slots')
      .select('id, branch_id')
      .eq('id', slotId)
      .single();

    if (slotError || !slot) {
      throw new NotFoundError('Slot not found');
    }

    // Branch admin can only see waiting list for their branch
    if (user.role === 'BRANCH_ADMIN' && slot.branch_id !== user.branchId) {
      throw new AuthorizationError('Access denied');
    }

    const { data: waitingListEntries, error } = await supabase
      .from('waiting_list')
      .select(`
        *,
        student:users(name, email, phone_number)
      `)
      .eq('slot_id', slotId)
      .gt('expires_at', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      throw new ValidationError(`Failed to fetch waiting list: ${error.message}`);
    }

    res.json({
      success: true,
      data: waitingListEntries || []
    });
  })
);

// Convert waiting list entry to booking (Admin only)
router.post('/convert-to-booking', 
  authenticate, 
  requireRole(['SUPER_ADMIN', 'BRANCH_ADMIN']),
  validateBody(convertToBookingSchema),
  auditLog('waiting_list'),
  asyncHandler(async (req: Request, res: Response) => {
    const { slotId, studentId } = req.body;
    const user = req.user!;

    // Check if slot exists and get details
    const { data: slot, error: slotError } = await supabase
      .from('slots')
      .select('id, capacity, booked_count, branch_id')
      .eq('id', slotId)
      .single();

    if (slotError || !slot) {
      throw new NotFoundError('Slot not found');
    }

    // Branch admin can only convert for their branch
    if (user.role === 'BRANCH_ADMIN' && slot.branch_id !== user.branchId) {
      throw new AuthorizationError('Access denied');
    }

    // Check if slot has capacity
    if (slot.booked_count >= slot.capacity) {
      throw new BusinessRuleError('Slot is full');
    }

    // Check if student is on waiting list for this slot
    const { data: waitingListEntry, error: waitingListError } = await supabase
      .from('waiting_list')
      .select('id, priority')
      .eq('student_id', studentId)
      .eq('slot_id', slotId)
      .single();

    if (waitingListError || !waitingListEntry) {
      throw new NotFoundError('Student is not on waiting list for this slot');
    }

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        student_id: studentId,
        slot_id: slotId,
        status: 'CONFIRMED'
      })
      .select(`
        *,
        student:users(name, email),
        slot:slots(
          id,
          date,
          start_time,
          end_time,
          teacher:users(name),
          branch:branches(name)
        )
      `)
      .single();

    if (bookingError) {
      throw new ValidationError(`Failed to create booking: ${bookingError.message}`);
    }

    // Update slot booked count
    const { error: updateError } = await supabase
      .from('slots')
      .update({ booked_count: slot.booked_count + 1 })
      .eq('id', slotId);

    if (updateError) {
      console.error('Failed to update slot booked count:', updateError);
    }

    // Remove from waiting list
    await supabase
      .from('waiting_list')
      .delete()
      .eq('id', waitingListEntry.id);

    res.status(201).json({
      success: true,
      message: 'Successfully converted waiting list entry to booking',
      data: booking
    });
  })
);

// Get waiting list statistics (Admin only)
router.get('/stats', 
  authenticate, 
  requireRole(['SUPER_ADMIN', 'BRANCH_ADMIN']),
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user!;

    let query = supabase
      .from('waiting_list')
      .select(`
        *,
        student:users(name, role),
        slot:slots(
          id,
          date,
          start_time,
          end_time,
          branch:branches(name, id)
        )
      `)
      .gt('expires_at', new Date().toISOString());

    // Branch admin can only see stats for their branch
    if (user.role === 'BRANCH_ADMIN') {
      query = query.eq('slot.branch_id', user.branchId);
    }

    const { data: waitingListEntries, error } = await query;

    if (error) {
      throw new ValidationError(`Failed to fetch waiting list statistics: ${error.message}`);
    }

    // Calculate statistics
    const totalEntries = waitingListEntries?.length || 0;
    const entriesByBranch = waitingListEntries?.reduce((acc, entry) => {
      const branchName = entry.slot?.branch?.name || 'Unknown';
      acc[branchName] = (acc[branchName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const entriesByPriority = waitingListEntries?.reduce((acc, entry) => {
      acc[entry.priority] = (acc[entry.priority] || 0) + 1;
      return acc;
    }, {} as Record<number, number>) || {};

    const upcomingEntries = waitingListEntries?.filter(entry => {
      const slotDate = new Date(`${entry.slot?.date}T${entry.slot?.start_time}`);
      return slotDate > new Date();
    }).length || 0;

    res.json({
      success: true,
      data: {
        totalEntries,
        upcomingEntries,
        entriesByBranch,
        entriesByPriority,
        averagePriority: totalEntries > 0 
          ? waitingListEntries?.reduce((sum, entry) => sum + entry.priority, 0) / totalEntries 
          : 0
      }
    });
  })
);

// Clean up expired waiting list entries (Admin only)
router.post('/cleanup', 
  authenticate, 
  requireRole(['SUPER_ADMIN', 'BRANCH_ADMIN']),
  auditLog('waiting_list'),
  asyncHandler(async (req: Request, res: Response) => {
    const { error } = await supabase
      .from('waiting_list')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) {
      throw new ValidationError(`Failed to cleanup expired entries: ${error.message}`);
    }

    res.json({
      success: true,
      message: 'Successfully cleaned up expired waiting list entries'
    });
  })
);

export default router;
