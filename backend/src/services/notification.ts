// TODO: Migrate from Prisma to Supabase - this file contains legacy Prisma code
// import prisma from '../lib/prisma';
import { smsService } from './sms';
// import { NotificationType } from '../lib/supabase';

interface NotificationTemplate {
  sms: string;
  inApp: {
    title: string;
    message: string;
  };
}

interface BookingDetails {
  id: string;
  date: string;
  time: string;
  teacher: string;
  branch: string;
  student: {
    id: string;
    name: string;
    phoneNumber: string | null;
  };
}

interface SMSDeliveryStatus {
  messageId: string;
  phoneNumber: string;
  status: 'sent' | 'delivered' | 'failed';
  error?: string;
  sentAt: Date;
}

class NotificationService {
  private templates: Record<NotificationType, NotificationTemplate> = {
    BOOKING_CONFIRMED: {
      sms: 'Booking confirmed! Date: {date}, Time: {time}, Teacher: {teacher}, Branch: {branch}. 10 Minute School',
      inApp: {
        title: 'Booking Confirmed',
        message: 'Your speaking test has been confirmed for {date} at {time} with {teacher} at {branch}.'
      }
    },
    BOOKING_REMINDER: {
      sms: 'Reminder: Your speaking test is tomorrow at {time} with {teacher} at {branch}. 10 Minute School',
      inApp: {
        title: 'Booking Reminder',
        message: 'Don\'t forget! Your speaking test is tomorrow at {time} with {teacher} at {branch}.'
      }
    },
    BOOKING_CANCELLED: {
      sms: 'Your booking for {date} at {time} has been cancelled. You can book a new slot anytime. 10 Minute School',
      inApp: {
        title: 'Booking Cancelled',
        message: 'Your booking for {date} at {time} with {teacher} has been cancelled.'
      }
    },
    SYSTEM_ALERT: {
      sms: '{message} - 10 Minute School',
      inApp: {
        title: 'System Alert',
        message: '{message}'
      }
    },
    ANNOUNCEMENT: {
      sms: 'Announcement: {message}. 10 Minute School',
      inApp: {
        title: 'Announcement',
        message: '{message}'
      }
    },
    REMINDER: {
      sms: 'Reminder: {message}. 10 Minute School',
      inApp: {
        title: 'Reminder',
        message: '{message}'
      }
    },
    URGENT: {
      sms: 'URGENT: {message}. 10 Minute School',
      inApp: {
        title: 'Urgent Notice',
        message: '{message}'
      }
    },
    MAINTENANCE: {
      sms: 'Maintenance Notice: {message}. 10 Minute School',
      inApp: {
        title: 'Maintenance Notice',
        message: '{message}'
      }
    }
  };

  private smsDeliveryLog: Map<string, SMSDeliveryStatus> = new Map();

  // Replace template placeholders with actual values
  private formatTemplate(template: string, data: Record<string, string>): string {
    let formatted = template;
    for (const [key, value] of Object.entries(data)) {
      formatted = formatted.replace(new RegExp(`{${key}}`, 'g'), value);
    }
    return formatted;
  }

  // Send both SMS and in-app notification
  async sendNotification(
    userId: string,
    type: NotificationType,
    data: Record<string, string>,
    options: {
      smsOnly?: boolean;
      inAppOnly?: boolean;
      customMessage?: string;
      customTitle?: string;
    } = {}
  ): Promise<{
    smsResult?: { success: boolean; messageId?: string; error?: string };
    inAppResult?: { success: boolean; notificationId?: string; error?: string };
  }> {
    const results: any = {};

    try {
      // Get user details
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { phoneNumber: true, name: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const template = this.templates[type];

      // Send SMS notification
      if (!options.inAppOnly && user.phoneNumber) {
        try {
          const smsMessage = options.customMessage || this.formatTemplate(template.sms, data);
          const smsResult = await smsService.sendSMS(user.phoneNumber, smsMessage);
          
          results.smsResult = smsResult;

          // Log SMS delivery status
          if (smsResult.messageId) {
            this.smsDeliveryLog.set(smsResult.messageId, {
              messageId: smsResult.messageId,
              phoneNumber: user.phoneNumber,
              status: smsResult.success ? 'sent' : 'failed',
              error: smsResult.error,
              sentAt: new Date()
            });
          }
        } catch (error) {
          console.error('SMS notification failed:', error);
          results.smsResult = {
            success: false,
            error: error instanceof Error ? error.message : 'SMS sending failed'
          };
        }
      }

      // Send in-app notification
      if (!options.smsOnly) {
        try {
          const title = options.customTitle || this.formatTemplate(template.inApp.title, data);
          const message = options.customMessage || this.formatTemplate(template.inApp.message, data);

          const notification = await prisma.notification.create({
            data: {
              userId,
              title,
              message,
              type,
              isRead: false
            }
          });

          results.inAppResult = {
            success: true,
            notificationId: notification.id
          };
        } catch (error) {
          console.error('In-app notification failed:', error);
          results.inAppResult = {
            success: false,
            error: error instanceof Error ? error.message : 'In-app notification failed'
          };
        }
      }

      return results;
    } catch (error) {
      console.error('Notification service error:', error);
      throw error;
    }
  }

  // Send booking confirmation notifications
  async sendBookingConfirmation(bookingDetails: BookingDetails): Promise<void> {
    const data = {
      date: bookingDetails.date,
      time: bookingDetails.time,
      teacher: bookingDetails.teacher,
      branch: bookingDetails.branch,
      studentName: bookingDetails.student.name
    };

    await this.sendNotification(
      bookingDetails.student.id,
      'BOOKING_CONFIRMED',
      data
    );

    console.log(`📧 Booking confirmation sent to ${bookingDetails.student.name} (${bookingDetails.student.phoneNumber || 'no phone'})`);
  }

  // Send booking reminder notifications
  async sendBookingReminder(bookingDetails: BookingDetails): Promise<void> {
    const data = {
      date: bookingDetails.date,
      time: bookingDetails.time,
      teacher: bookingDetails.teacher,
      branch: bookingDetails.branch,
      studentName: bookingDetails.student.name
    };

    await this.sendNotification(
      bookingDetails.student.id,
      'BOOKING_REMINDER',
      data
    );

    console.log(`⏰ Booking reminder sent to ${bookingDetails.student.name} (${bookingDetails.student.phoneNumber || 'no phone'})`);
  }

  // Send booking cancellation notifications
  async sendBookingCancellation(bookingDetails: BookingDetails, reason?: string): Promise<void> {
    const data = {
      date: bookingDetails.date,
      time: bookingDetails.time,
      teacher: bookingDetails.teacher,
      branch: bookingDetails.branch,
      studentName: bookingDetails.student.name,
      reason: reason || 'No reason provided'
    };

    await this.sendNotification(
      bookingDetails.student.id,
      'BOOKING_CANCELLED',
      data
    );

    console.log(`❌ Booking cancellation sent to ${bookingDetails.student.name} (${bookingDetails.student.phoneNumber || 'no phone'})`);
  }

  // Send system alert to multiple users
  async sendSystemAlert(
    userIds: string[],
    message: string,
    options: {
      smsOnly?: boolean;
      inAppOnly?: boolean;
      title?: string;
    } = {}
  ): Promise<void> {
    const data = { message };

    for (const userId of userIds) {
      try {
        await this.sendNotification(
          userId,
          'SYSTEM_ALERT',
          data,
          {
            customMessage: message,
            customTitle: options.title || 'System Alert',
            smsOnly: options.smsOnly,
            inAppOnly: options.inAppOnly
          }
        );
      } catch (error) {
        console.error(`Failed to send system alert to user ${userId}:`, error);
      }
    }

    console.log(`📢 System alert sent to ${userIds.length} users`);
  }

  // Send teacher cancellation notifications to all affected students
  async sendTeacherCancellationNotifications(slotId: string, reason?: string): Promise<void> {
    try {
      // Get all confirmed bookings for this slot
      const bookings = await prisma.booking.findMany({
        where: {
          slotId,
          status: 'CONFIRMED'
        },
        include: {
          student: {
            select: { id: true, name: true, phoneNumber: true }
          },
          slot: {
            include: {
              branch: { select: { name: true } },
              teacher: { select: { name: true } }
            }
          }
        }
      });

      for (const booking of bookings) {
        const bookingDetails: BookingDetails = {
          id: booking.id,
          date: booking.slot.date.toISOString().split('T')[0],
          time: booking.slot.startTime,
          teacher: booking.slot.teacher.name,
          branch: booking.slot.branch.name,
          student: booking.student
        };

        await this.sendBookingCancellation(bookingDetails, reason);
      }

      console.log(`🏫 Teacher cancellation notifications sent to ${bookings.length} students`);
    } catch (error) {
      console.error('Failed to send teacher cancellation notifications:', error);
      throw error;
    }
  }

  // Get SMS delivery status
  getSMSDeliveryStatus(messageId: string): SMSDeliveryStatus | null {
    return this.smsDeliveryLog.get(messageId) || null;
  }

  // Get all SMS delivery statuses for a phone number
  getSMSDeliveryHistory(phoneNumber: string): SMSDeliveryStatus[] {
    return Array.from(this.smsDeliveryLog.values())
      .filter(status => status.phoneNumber === phoneNumber)
      .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
  }

  // Update SMS delivery status (for webhook integration)
  updateSMSDeliveryStatus(messageId: string, status: 'delivered' | 'failed', error?: string): void {
    const existing = this.smsDeliveryLog.get(messageId);
    if (existing) {
      existing.status = status;
      if (error) {
        existing.error = error;
      }
      this.smsDeliveryLog.set(messageId, existing);
    }
  }

  // Clean up old SMS delivery logs (keep last 30 days)
  cleanupSMSDeliveryLogs(): void {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let cleanedCount = 0;
    for (const [messageId, status] of this.smsDeliveryLog.entries()) {
      if (status.sentAt < thirtyDaysAgo) {
        this.smsDeliveryLog.delete(messageId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} old SMS delivery logs`);
    }
  }

  // Get notification templates (for admin configuration)
  getTemplates(): Record<NotificationType, NotificationTemplate> {
    return { ...this.templates };
  }

  // Update notification template (for admin configuration)
  updateTemplate(type: NotificationType, template: NotificationTemplate): void {
    this.templates[type] = template;
    console.log(`📝 Updated notification template for ${type}`);
  }

  // Get notification statistics
  async getNotificationStats(userId?: string): Promise<{
    totalNotifications: number;
    unreadNotifications: number;
    notificationsByType: Record<NotificationType, number>;
    smsDeliveryStats: {
      totalSent: number;
      delivered: number;
      failed: number;
    };
  }> {
    const whereClause = userId ? { userId } : {};

    const [totalNotifications, unreadNotifications, notificationsByType] = await Promise.all([
      prisma.notification.count({ where: whereClause }),
      prisma.notification.count({ where: { ...whereClause, isRead: false } }),
      prisma.notification.groupBy({
        by: ['type'],
        where: whereClause,
        _count: { type: true }
      })
    ]);

    const typeStats = notificationsByType.reduce((acc, item) => {
      acc[item.type] = item._count.type;
      return acc;
    }, {} as Record<NotificationType, number>);

    // SMS delivery statistics
    const smsStatuses = Array.from(this.smsDeliveryLog.values());
    const smsDeliveryStats = {
      totalSent: smsStatuses.length,
      delivered: smsStatuses.filter(s => s.status === 'delivered').length,
      failed: smsStatuses.filter(s => s.status === 'failed').length
    };

    return {
      totalNotifications,
      unreadNotifications,
      notificationsByType: typeStats,
      smsDeliveryStats
    };
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;