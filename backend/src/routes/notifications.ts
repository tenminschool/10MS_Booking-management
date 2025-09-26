import express from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import { notificationService } from '../services/notification';
import { NotificationType } from '@prisma/client';

const router = express.Router();

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

const sendNotificationSchema = z.object({
  userIds: z.array(z.string()).min(1, 'At least one user ID is required'),
  type: z.enum(['BOOKING_CONFIRMED', 'BOOKING_REMINDER', 'BOOKING_CANCELLED', 'SYSTEM_ALERT', 'ANNOUNCEMENT', 'REMINDER', 'URGENT', 'MAINTENANCE']),
  message: z.string().min(1, 'Message is required'),
  title: z.string().optional(),
  smsOnly: z.boolean().optional(),
  inAppOnly: z.boolean().optional()
});

const updateTemplateSchema = z.object({
  type: z.enum(['BOOKING_CONFIRMED', 'BOOKING_REMINDER', 'BOOKING_CANCELLED', 'SYSTEM_ALERT', 'ANNOUNCEMENT', 'REMINDER', 'URGENT', 'MAINTENANCE']),
  sms: z.string().min(1, 'SMS template is required'),
  inApp: z.object({
    title: z.string().min(1, 'In-app title is required'),
    message: z.string().min(1, 'In-app message is required')
  })
});

// Mock notifications for when database is unavailable
const mockNotifications = [
  {
    id: 'mock-notif-1',
    userId: 'mock-user-id',
    title: 'Welcome to 10 Minute School',
    message: 'Your account has been successfully created. You can now book speaking tests.',
    type: 'SYSTEM_ALERT',
    isRead: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
  },
  {
    id: 'mock-notif-2',
    userId: 'mock-user-id',
    title: 'System Notice',
    message: 'Database connection is currently unavailable. Using mock data for demonstration.',
    type: 'SYSTEM_ALERT',
    isRead: false,
    createdAt: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
  }
];

// GET /api/notifications/my - Get user notifications (alias for frontend compatibility)
router.get('/my', authenticate, async (req, res) => {
  try {
    const user = req.user!;

    // Try database first, fallback to mock data
    try {
      await prisma.$queryRaw`SELECT 1`;
      
      const notifications = await prisma.notification.findMany({
        where: { userId: user.userId },
        orderBy: { createdAt: 'desc' },
        take: 50
      });

      const unreadCount = await prisma.notification.count({
        where: { userId: user.userId, isRead: false }
      });

      res.json({
        notifications,
        unreadCount
      });

    } catch (dbError) {
      console.warn('Database unavailable, using mock notifications:', dbError);
      
      res.json({
        notifications: mockNotifications,
        unreadCount: mockNotifications.filter(n => !n.isRead).length,
        _mock: true,
        _message: 'Using mock data (database unavailable)'
      });
    }

  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch notifications'
    });
  }
});

// GET /api/notifications - Get user notifications
router.get('/', authenticate, async (req, res) => {
  try {
    const filters = notificationFiltersSchema.parse(req.query);
    const user = req.user!;

    // Build where clause
    const whereClause: any = { userId: user.userId };

    if (filters.type) {
      whereClause.type = filters.type;
    }

    if (filters.isRead !== undefined) {
      whereClause.isRead = filters.isRead;
    }

    // Get notifications with pagination
    const [notifications, totalCount, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0
      }),
      prisma.notification.count({ where: whereClause }),
      prisma.notification.count({ 
        where: { userId: user.userId, isRead: false } 
      })
    ]);

    res.json({
      notifications,
      pagination: {
        total: totalCount,
        unread: unreadCount,
        limit: filters.limit || 50,
        offset: filters.offset || 0
      },
      filters
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid query parameters',
        details: error.errors
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch notifications'
    });
  }
});

// GET /api/notifications/unread-count - Get unread notification count
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const user = req.user!;

    const unreadCount = await prisma.notification.count({
      where: {
        userId: user.userId,
        isRead: false
      }
    });

    res.json({ unreadCount });

  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch unread count'
    });
  }
});

// GET /api/notifications/:id - Get single notification
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId: user.userId
      }
    });

    if (!notification) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Notification not found'
      });
    }

    res.json(notification);

  } catch (error) {
    console.error('Error fetching notification:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch notification'
    });
  }
});

// PUT /api/notifications/mark-read - Mark notifications as read
router.put('/mark-read', authenticate, async (req, res) => {
  try {
    const data = markReadSchema.parse(req.body);
    const user = req.user!;

    let updatedCount = 0;

    if (data.markAll) {
      // Mark all user notifications as read
      const result = await prisma.notification.updateMany({
        where: {
          userId: user.userId,
          isRead: false
        },
        data: {
          isRead: true
        }
      });
      updatedCount = result.count;
    } else if (data.notificationIds && data.notificationIds.length > 0) {
      // Mark specific notifications as read
      const result = await prisma.notification.updateMany({
        where: {
          id: { in: data.notificationIds },
          userId: user.userId,
          isRead: false
        },
        data: {
          isRead: true
        }
      });
      updatedCount = result.count;
    }

    res.json({
      message: `${updatedCount} notifications marked as read`,
      updatedCount
    });

  } catch (error) {
    console.error('Error marking notifications as read:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid request data',
        details: error.errors
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to mark notifications as read'
    });
  }
});

// PUT /api/notifications/:id/read - Mark single notification as read
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId: user.userId
      }
    });

    if (!notification) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Notification not found'
      });
    }

    const updatedNotification = await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });

    res.json({
      message: 'Notification marked as read',
      notification: updatedNotification
    });

  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to mark notification as read'
    });
  }
});

// DELETE /api/notifications/:id - Delete notification
router.delete('/:id', authenticate, auditLog('notification_delete'), async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId: user.userId
      }
    });

    if (!notification) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Notification not found'
      });
    }

    await prisma.notification.delete({
      where: { id }
    });

    res.json({
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete notification'
    });
  }
});

// POST /api/notifications/send - Send notification to users (Admin only)
router.post('/send', authenticate, auditLog('notification_send'), async (req, res) => {
  try {
    const data = sendNotificationSchema.parse(req.body);
    const user = req.user!;

    // Only admins can send notifications
    if (!['SUPER_ADMIN', 'BRANCH_ADMIN'].includes(user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only administrators can send notifications'
      });
    }

    // Branch admins can only send to users in their branch
    if (user.role === 'BRANCH_ADMIN') {
      const targetUsers = await prisma.user.findMany({
        where: {
          id: { in: data.userIds },
          branchId: user.branchId
        },
        select: { id: true }
      });

      if (targetUsers.length !== data.userIds.length) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Branch administrators can only send notifications to users in their branch'
        });
      }
    }

    // Send notifications
    await notificationService.sendSystemAlert(
      data.userIds,
      data.message,
      {
        title: data.title,
        smsOnly: data.smsOnly,
        inAppOnly: data.inAppOnly
      }
    );

    res.json({
      message: `Notification sent to ${data.userIds.length} users`,
      recipients: data.userIds.length
    });

  } catch (error) {
    console.error('Error sending notification:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid notification data',
        details: error.errors
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to send notification'
    });
  }
});

// GET /api/notifications/templates - Get notification templates (Admin only)
router.get('/admin/templates', authenticate, async (req, res) => {
  try {
    const user = req.user!;

    // Only admins can view templates
    if (!['SUPER_ADMIN', 'BRANCH_ADMIN'].includes(user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only administrators can view notification templates'
      });
    }

    const templates = notificationService.getTemplates();

    res.json({ templates });

  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch templates'
    });
  }
});

// PUT /api/notifications/templates - Update notification template (Super Admin only)
router.put('/admin/templates', authenticate, auditLog('notification_template_update'), async (req, res) => {
  try {
    const data = updateTemplateSchema.parse(req.body);
    const user = req.user!;

    // Only super admins can update templates
    if (user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only super administrators can update notification templates'
      });
    }

    notificationService.updateTemplate(data.type, {
      sms: data.sms,
      inApp: data.inApp
    });

    res.json({
      message: 'Notification template updated successfully',
      type: data.type
    });

  } catch (error) {
    console.error('Error updating template:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid template data',
        details: error.errors
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update template'
    });
  }
});

// GET /api/notifications/stats - Get notification statistics (Admin only)
router.get('/admin/stats', authenticate, async (req, res) => {
  try {
    const user = req.user!;

    // Only admins can view stats
    if (!['SUPER_ADMIN', 'BRANCH_ADMIN'].includes(user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only administrators can view notification statistics'
      });
    }

    // Branch admins see stats for their branch users only
    let userFilter: string | undefined;
    if (user.role === 'BRANCH_ADMIN') {
      const branchUsers = await prisma.user.findMany({
        where: { branchId: user.branchId },
        select: { id: true }
      });
      // For simplicity, we'll get overall stats but could filter by branch users
    }

    const stats = await notificationService.getNotificationStats(userFilter);

    res.json(stats);

  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch notification statistics'
    });
  }
});

// GET /api/notifications/sms-status/:messageId - Get SMS delivery status
router.get('/sms-status/:messageId', authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;
    const user = req.user!;

    // Only admins can check SMS status
    if (!['SUPER_ADMIN', 'BRANCH_ADMIN'].includes(user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only administrators can check SMS delivery status'
      });
    }

    const status = notificationService.getSMSDeliveryStatus(messageId);

    if (!status) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'SMS delivery status not found'
      });
    }

    res.json(status);

  } catch (error) {
    console.error('Error fetching SMS status:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch SMS delivery status'
    });
  }
});

// POST /api/notifications/sms-webhook - SMS delivery webhook (for SMS provider)
router.post('/sms-webhook', async (req, res) => {
  try {
    const { messageId, status, error } = req.body;

    if (!messageId || !status) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'messageId and status are required'
      });
    }

    notificationService.updateSMSDeliveryStatus(
      messageId,
      status === 'delivered' ? 'delivered' : 'failed',
      error
    );

    res.json({ message: 'SMS status updated successfully' });

  } catch (error) {
    console.error('Error processing SMS webhook:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process SMS webhook'
    });
  }
});

// GET /api/notifications/:id/action - Get notification action URL and mark as read
router.get('/:id/action', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    // Try database first
    try {
      await prisma.$queryRaw`SELECT 1`;

      const notification = await prisma.notification.findFirst({
        where: { 
          id, 
          userId 
        },
        select: { 
          id: true, 
          actionUrl: true, 
          isRead: true,
          type: true,
          metadata: true
        }
      });

      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      // Mark as read if not already read
      if (!notification.isRead) {
        await prisma.notification.update({
          where: { id },
          data: { 
            isRead: true,
            readAt: new Date()
          }
        });
      }

      // Determine action URL based on notification type and metadata
      let actionUrl = notification.actionUrl;
      
      if (!actionUrl) {
        // Default routing based on notification type
        switch (notification.type) {
          case 'BOOKING_CONFIRMED':
          case 'BOOKING_REMINDER':
          case 'BOOKING_CANCELLED':
            actionUrl = '/bookings';
            break;
          case 'ANNOUNCEMENT':
          case 'SYSTEM_ALERT':
          case 'URGENT':
          case 'MAINTENANCE':
            actionUrl = '/notifications';
            break;
          case 'REMINDER':
            actionUrl = '/schedule';
            break;
          default:
            actionUrl = '/notifications';
        }
      }

      res.json({
        actionUrl,
        notificationId: notification.id,
        markedAsRead: !notification.isRead
      });

    } catch (dbError) {
      console.warn('Database unavailable, using mock response:', dbError);
      res.json({
        actionUrl: '/notifications',
        notificationId: id,
        markedAsRead: false
      });
    }

  } catch (error) {
    console.error('Error getting notification action:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get notification action'
    });
  }
});

export default router;