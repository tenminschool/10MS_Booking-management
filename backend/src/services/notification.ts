import { smsService } from './sms';
import { supabase, NotificationType } from '../lib/supabase';

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
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('phone_number, name')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        throw new Error('User not found');
      }
      
      // Map snake_case to camelCase for compatibility
      const userData = {
        phoneNumber: user.phone_number,
        name: user.name
      };

      const template = this.templates[type];

      // Send SMS notification
      if (!options.inAppOnly && userData.phoneNumber) {
        try {
          const smsMessage = options.customMessage || this.formatTemplate(template.sms, data);
          const smsResult = await smsService.sendSMS(userData.phoneNumber, smsMessage);
          
          results.smsResult = smsResult;

          // Log SMS delivery status
          if (smsResult.messageId) {
            this.smsDeliveryLog.set(smsResult.messageId, {
              messageId: smsResult.messageId,
              phoneNumber: userData.phoneNumber,
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

          const { data: notification, error: notifError } = await supabase
            .from('notifications')
            .insert({
              user_id: userId,
              title,
              message,
              type,
              is_read: false,
              status: 'SENT'
            })
            .select()
            .single();

          if (notifError) {
            throw notifError;
          }

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
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
          id,
          student:users!bookings_studentId_fkey(id, name, phone_number),
          slot:slots(
            date,
            start_time,
            branch:branches(name),
            teacher:users!slots_teacherId_fkey(name)
          )
        `)
        .eq('slot_id', slotId)
        .eq('status', 'CONFIRMED');

      if (error) {
        throw error;
      }

      for (const booking of bookings || []) {
        const slot = booking.slot as any;
        const student = booking.student as any;
        const bookingDetails: BookingDetails = {
          id: booking.id,
          date: slot.date,
          time: slot.start_time,
          teacher: slot.teacher?.name || 'Unknown',
          branch: slot.branch?.name || 'Unknown',
          student: {
            id: student.id,
            name: student.name,
            phoneNumber: student.phone_number
          }
        };

        await this.sendBookingCancellation(bookingDetails, reason);
      }

      console.log(`🏫 Teacher cancellation notifications sent to ${bookings?.length || 0} students`);
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
    // Build query for total and unread counts
    let totalQuery = supabase.from('notifications').select('*', { count: 'exact', head: true });
    let unreadQuery = supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('is_read', false);
    let typeQuery = supabase.from('notifications').select('type');

    if (userId) {
      totalQuery = totalQuery.eq('user_id', userId);
      unreadQuery = unreadQuery.eq('user_id', userId);
      typeQuery = typeQuery.eq('user_id', userId);
    }

    const [totalResult, unreadResult, typeResult] = await Promise.all([
      totalQuery,
      unreadQuery,
      typeQuery
    ]);

    const totalNotifications = totalResult.count || 0;
    const unreadNotifications = unreadResult.count || 0;
    
    // Group notifications by type
    const typeStats: Record<string, number> = {};
    if (typeResult.data) {
      for (const item of typeResult.data) {
        typeStats[item.type] = (typeStats[item.type] || 0) + 1;
      }
    }

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
      notificationsByType: typeStats as Record<NotificationType, number>,
      smsDeliveryStats
    };
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;