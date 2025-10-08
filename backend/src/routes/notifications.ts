import express from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { authenticate } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import { UserRole } from '../types/auth';

const router = express.Router();

// Define NotificationType locally
const NotificationType = {
  BOOKING_CONFIRMED: 'BOOKING_CONFIRMED',
  BOOKING_REMINDER: 'BOOKING_REMINDER',
  BOOKING_CANCELLED: 'BOOKING_CANCELLED',
  SYSTEM_ALERT: 'SYSTEM_ALERT',
  ANNOUNCEMENT: 'ANNOUNCEMENT',
  REMINDER: 'REMINDER',
  URGENT: 'URGENT',
  MAINTENANCE: 'MAINTENANCE'
} as const;

// Validation schemas
const notificationFiltersSchema = z.object({
  type: z.enum(['BOOKING_CONFIRMED', 'BOOKING_REMINDER', 'BOOKING_CANCELLED', 'SYSTEM_ALERT', 'ANNOUNCEMENT', 'REMINDER', 'URGENT', 'MAINTENANCE']).optional(),
  isRead: z.string().transform(val => val === 'true').optional(),
  limit: z.string().transform(val => parseInt(val)).optional(),
  offset: z.string().transform(val => parseInt(val)).optional()
});

const markReadSchema = z.object({
  notificationIds: z.array(z.string()).optional(),
  markAll: z.boolean().optional()
});

const createNotificationSchema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  type: z.enum(['BOOKING_CONFIRMED', 'BOOKING_REMINDER', 'BOOKING_CANCELLED', 'SYSTEM_ALERT', 'ANNOUNCEMENT', 'REMINDER', 'URGENT', 'MAINTENANCE']),
  targetUserId: z.string().optional(),
  targetRole: z.enum(['STUDENT', 'TEACHER', 'BRANCH_ADMIN', 'SUPER_ADMIN']).optional(),
  targetBranchId: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  expiresAt: z.string().datetime().optional()
});

// Get user's notifications
router.get('/', authenticate, async (req, res) => {
  try {
    const user = req.user!;
    const { type, isRead, limit = 20, offset = 0 } = notificationFiltersSchema.parse(req.query);


    // Build query
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('userId', user.userId)
      .order('createdAt', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (type) {
      query = query.eq('type', type);
    }
    if (isRead !== undefined) {
      query = query.eq('isRead', isRead);
    }

    const { data: notifications, error } = await query;


    if (error) {
      throw new Error(`Failed to fetch notifications: ${error.message}`);
    }

    // Get unread count
    const { count: unreadCount, error: countError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('userId', user.userId)
      .eq('isRead', false);

    if (countError) {
      console.warn('Failed to get unread count:', countError.message);
    }

    res.json({
      notifications: notifications || [],
      unreadCount: unreadCount || 0
    });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      error: 'Failed to fetch notifications',
      message: error.message
    });
  }
});

// Get all notifications (Admin only)
router.get('/admin', 
  authenticate, 
  async (req, res) => {
    try {
      const user = req.user!;
      
      // Check if user has permission to view all notifications
      if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.BRANCH_ADMIN) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'Only administrators can view all notifications'
        });
      }

      const { page = 1, limit = 20, search, type, status, priority } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      // Build query
      let query = supabase
        .from('notifications')
        .select(`
          *,
          user:users!notifications_userId_fkey(id, name, email, phoneNumber, role)
        `, { count: 'exact' })
        .order('createdAt', { ascending: false })
        .range(offset, offset + Number(limit) - 1);

      // Apply filters
      if (search) {
        query = query.or(`title.ilike.%${search}%,message.ilike.%${search}%`);
      }
      if (type) {
        query = query.eq('type', type);
      }
      if (status === 'read') {
        query = query.eq('isRead', true);
      } else if (status === 'unread') {
        query = query.eq('isRead', false);
      }
      if (priority) {
        query = query.eq('priority', priority);
      }

      // For branch admins, only show notifications for their branch users
      if (user.role === UserRole.BRANCH_ADMIN) {
        query = query.eq('user.branchId', user.branchId);
      }

      const { data: notifications, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch notifications: ${error.message}`);
      }

      res.json({
        data: notifications || [],
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: count || 0,
          pages: Math.ceil((count || 0) / Number(limit))
        }
      });
    } catch (error: any) {
      console.error('Error fetching admin notifications:', error);
      res.status(500).json({
        error: 'Failed to fetch notifications',
        message: error.message
      });
    }
  }
);

// Mark notifications as read
router.patch('/mark-read', authenticate, async (req, res) => {
  try {
    const user = req.user!;
    const { notificationIds, markAll } = markReadSchema.parse(req.body);

    let query = supabase
      .from('notifications')
      .update({ isRead: true, readAt: new Date().toISOString() })
      .eq('userId', user.userId);

    if (markAll) {
      query = query.eq('isRead', false);
    } else if (notificationIds && notificationIds.length > 0) {
      query = query.in('id', notificationIds);
    } else {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Either notificationIds or markAll must be provided'
      });
    }

    const { data, error } = await query.select();

    if (error) {
      throw new Error(`Failed to mark notifications as read: ${error.message}`);
    }

    res.json({
      message: 'Notifications marked as read',
      updatedCount: data?.length || 0
    });
  } catch (error: any) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({
      error: 'Failed to mark notifications as read',
      message: error.message
    });
  }
});

// Delete notification
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('userId', user.userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
      return res.status(404).json({
          error: 'Notification not found',
          message: 'The requested notification does not exist'
        });
      }
      throw new Error(`Failed to delete notification: ${error.message}`);
    }

    res.json({
      message: 'Notification deleted successfully',
      notification: data
    });
  } catch (error: any) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      error: 'Failed to delete notification',
      message: error.message
    });
  }
});

// Create notification (Admin only)
router.post('/', 
  authenticate, 
  auditLog('CREATE_NOTIFICATION'),
  async (req, res) => {
    try {
    const user = req.user!;
      const notificationData = createNotificationSchema.parse(req.body);

      // Check if user has permission to create notifications
      if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.BRANCH_ADMIN) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'Only administrators can create notifications'
        });
      }

      // Determine target users based on criteria
      let targetUserIds: string[] = [];

      if (notificationData.targetUserId) {
        targetUserIds = [notificationData.targetUserId];
      } else if (notificationData.targetRole) {
        let roleQuery = supabase
          .from('users')
          .select('id')
          .eq('role', notificationData.targetRole)
          .eq('isActive', true);

        if (notificationData.targetBranchId) {
          roleQuery = roleQuery.eq('branchId', notificationData.targetBranchId);
        } else if (user.role === UserRole.BRANCH_ADMIN) {
          roleQuery = roleQuery.eq('branchId', user.branchId);
        }

        const { data: users, error: usersError } = await roleQuery;
        if (usersError) {
          throw new Error(`Failed to fetch target users: ${usersError.message}`);
        }
        targetUserIds = users?.map(u => u.id) || [];
      } else {
        // Send to all users in the system or branch
        let allUsersQuery = supabase
          .from('users')
          .select('id')
          .eq('isActive', true);

        if (user.role === UserRole.BRANCH_ADMIN) {
          allUsersQuery = allUsersQuery.eq('branchId', user.branchId);
        }

        const { data: users, error: usersError } = await allUsersQuery;
        if (usersError) {
          throw new Error(`Failed to fetch target users: ${usersError.message}`);
        }
        targetUserIds = users?.map(u => u.id) || [];
      }

      if (targetUserIds.length === 0) {
        return res.status(400).json({
          error: 'No target users found',
          message: 'No users match the specified criteria'
        });
      }

      // Create notifications for all target users
      const notifications = targetUserIds.map(userId => ({
        userId,
        title: notificationData.title,
        message: notificationData.message,
        type: notificationData.type,
        priority: notificationData.priority,
        expiresAt: notificationData.expiresAt,
        isRead: false,
        createdAt: new Date().toISOString()
      }));

      const { data: createdNotifications, error: createError } = await supabase
        .from('notifications')
        .insert(notifications)
        .select();

      if (createError) {
        throw new Error(`Failed to create notifications: ${createError.message}`);
      }

      res.status(201).json({
        message: 'Notifications created successfully',
        notifications: createdNotifications,
        targetCount: targetUserIds.length
      });
    } catch (error: any) {
      console.error('Error creating notification:', error);
      res.status(500).json({
        error: 'Failed to create notification',
        message: error.message
      });
    }
  }
);

// Get notification by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const { data: notification, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', id)
      .eq('userId', user.userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
      return res.status(404).json({
          error: 'Notification not found',
          message: 'The requested notification does not exist'
        });
      }
      throw new Error(`Failed to fetch notification: ${error.message}`);
    }

    res.json(notification);
  } catch (error: any) {
    console.error('Error fetching notification:', error);
    res.status(500).json({
      error: 'Failed to fetch notification',
      message: error.message
    });
  }
});

// Update notification (Admin only)
router.put('/:id', 
  authenticate, 
  auditLog('UPDATE_NOTIFICATION'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user!;
      const updateData = createNotificationSchema.partial().parse(req.body);

      // Check if user has permission to update notifications
      if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.BRANCH_ADMIN) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'Only administrators can update notifications'
        });
      }

      const { data: notification, error } = await supabase
        .from('notifications')
        .update({
          ...updateData,
          updatedAt: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({
            error: 'Notification not found',
            message: 'The requested notification does not exist'
          });
        }
        throw new Error(`Failed to update notification: ${error.message}`);
      }

      res.json({
        message: 'Notification updated successfully',
        notification
      });
    } catch (error: any) {
      console.error('Error updating notification:', error);
      res.status(500).json({
        error: 'Failed to update notification',
        message: error.message
      });
    }
  }
);

export default router;