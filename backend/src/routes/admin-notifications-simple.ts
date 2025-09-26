import express, { Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { authenticate, requireRole } from '../middleware/auth';
import { asyncHandler, ValidationError } from '../middleware/errorHandler';

const router = express.Router();

// Simple notification creation for testing
router.post('/create', 
  authenticate, 
  requireRole(['SUPER_ADMIN', 'BRANCH_ADMIN']),
  asyncHandler(async (req: Request, res: Response) => {
    const { title, message, type = 'ANNOUNCEMENT', userIds = [] } = req.body;
    const user = req.user!;

    if (!title || !message) {
      throw new ValidationError('Title and message are required');
    }

    // Create notifications for specified users
    const notifications = [];
    for (const userId of userIds) {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title,
          message,
          type,
          status: 'SENT',
          is_read: false,
          tags: [],
          sent_at: new Date().toISOString(),
          created_by: user.userId
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating notification:', error);
      } else {
        notifications.push(data);
      }
    }

    res.json({
      message: 'Notifications created successfully',
      notifications,
      totalCreated: notifications.length
    });
  })
);

// Get notifications for current user
router.get('/my-notifications', 
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user!;
    const { limit = 20, offset = 0 } = req.query;

    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.userId)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) {
      throw new ValidationError(`Failed to fetch notifications: ${error.message}`);
    }

    res.json({
      notifications: notifications || [],
      total: notifications?.length || 0
    });
  })
);

// Mark notification as read
router.put('/:id/read', 
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = req.user!;

    const { data, error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.userId)
      .select()
      .single();

    if (error) {
      throw new ValidationError(`Failed to mark notification as read: ${error.message}`);
    }

    res.json({
      message: 'Notification marked as read',
      notification: data
    });
  })
);

export default router;
