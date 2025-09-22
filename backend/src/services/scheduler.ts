import cron from 'node-cron';
import prisma from '../lib/prisma';
import { notificationService } from './notification';

interface BookingReminderData {
  id: string;
  student: {
    id: string;
    name: string;
    phoneNumber: string | null;
  };
  slot: {
    date: Date;
    startTime: string;
    teacher: {
      name: string;
    };
    branch: {
      name: string;
    };
  };
}

class SchedulerService {
  private reminderJob: cron.ScheduledTask | null = null;
  private cleanupJob: cron.ScheduledTask | null = null;

  constructor() {
    this.initializeJobs();
  }

  private initializeJobs(): void {
    // Schedule reminder job to run every hour
    this.reminderJob = cron.schedule('0 * * * *', async () => {
      await this.sendBookingReminders();
    }, {
      scheduled: false,
      timezone: 'Asia/Dhaka' // Bangladesh timezone
    });

    // Schedule cleanup job to run daily at 2 AM
    this.cleanupJob = cron.schedule('0 2 * * *', async () => {
      await this.performDailyCleanup();
    }, {
      scheduled: false,
      timezone: 'Asia/Dhaka'
    });

    console.log('📅 Scheduler service initialized');
  }

  // Start all scheduled jobs
  start(): void {
    if (this.reminderJob) {
      this.reminderJob.start();
      console.log('⏰ Booking reminder job started');
    }

    if (this.cleanupJob) {
      this.cleanupJob.start();
      console.log('🧹 Daily cleanup job started');
    }
  }

  // Stop all scheduled jobs
  stop(): void {
    if (this.reminderJob) {
      this.reminderJob.stop();
      console.log('⏰ Booking reminder job stopped');
    }

    if (this.cleanupJob) {
      this.cleanupJob.stop();
      console.log('🧹 Daily cleanup job stopped');
    }
  }

  // Send 24-hour booking reminders
  private async sendBookingReminders(): Promise<void> {
    try {
      console.log('🔍 Checking for bookings that need 24-hour reminders...');

      // Calculate the time window for 24-hour reminders
      // We want bookings that are between 23-25 hours from now
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Create time window: 23 hours from now to 25 hours from now
      const reminderStart = new Date(now.getTime() + (23 * 60 * 60 * 1000));
      const reminderEnd = new Date(now.getTime() + (25 * 60 * 60 * 1000));

      // Get bookings that need reminders
      const bookingsNeedingReminders = await prisma.booking.findMany({
        where: {
          status: 'CONFIRMED',
          slot: {
            date: {
              gte: reminderStart,
              lte: reminderEnd
            }
          }
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              phoneNumber: true
            }
          },
          slot: {
            include: {
              teacher: {
                select: { name: true }
              },
              branch: {
                select: { name: true }
              }
            }
          }
        }
      });

      console.log(`📋 Found ${bookingsNeedingReminders.length} bookings needing reminders`);

      // Check if we've already sent reminders for these bookings
      const bookingsToRemind: BookingReminderData[] = [];

      for (const booking of bookingsNeedingReminders) {
        // Check if reminder was already sent (look for reminder notification in last 2 hours)
        const recentReminder = await prisma.notification.findFirst({
          where: {
            userId: booking.student.id,
            type: 'BOOKING_REMINDER',
            createdAt: {
              gte: new Date(now.getTime() - (2 * 60 * 60 * 1000)) // Last 2 hours
            }
          }
        });

        if (!recentReminder) {
          bookingsToRemind.push(booking as BookingReminderData);
        }
      }

      console.log(`📤 Sending reminders for ${bookingsToRemind.length} bookings`);

      // Send reminders
      for (const booking of bookingsToRemind) {
        try {
          const bookingDetails = {
            id: booking.id,
            date: booking.slot.date.toISOString().split('T')[0],
            time: booking.slot.startTime,
            teacher: booking.slot.teacher.name,
            branch: booking.slot.branch.name,
            student: booking.student
          };

          await notificationService.sendBookingReminder(bookingDetails);
          
          // Small delay to avoid overwhelming SMS service
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Failed to send reminder for booking ${booking.id}:`, error);
        }
      }

      if (bookingsToRemind.length > 0) {
        console.log(`✅ Successfully sent ${bookingsToRemind.length} booking reminders`);
      }

    } catch (error) {
      console.error('Error in booking reminder job:', error);
    }
  }

  // Perform daily cleanup tasks
  private async performDailyCleanup(): Promise<void> {
    try {
      console.log('🧹 Starting daily cleanup tasks...');

      // Clean up old SMS delivery logs
      notificationService.cleanupSMSDeliveryLogs();

      // Clean up old notifications (keep last 90 days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const deletedNotifications = await prisma.notification.deleteMany({
        where: {
          createdAt: {
            lt: ninetyDaysAgo
          },
          isRead: true // Only delete read notifications
        }
      });

      console.log(`🗑️ Deleted ${deletedNotifications.count} old notifications`);

      // Update completed bookings for slots that have passed
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const updatedBookings = await prisma.booking.updateMany({
        where: {
          status: 'CONFIRMED',
          attended: null,
          slot: {
            date: {
              lt: yesterday
            }
          }
        },
        data: {
          status: 'NO_SHOW',
          attended: false
        }
      });

      if (updatedBookings.count > 0) {
        console.log(`📝 Marked ${updatedBookings.count} past bookings as no-show`);
      }

      console.log('✅ Daily cleanup completed successfully');

    } catch (error) {
      console.error('Error in daily cleanup job:', error);
    }
  }

  // Manual trigger for testing
  async triggerBookingReminders(): Promise<{ sent: number; errors: number }> {
    console.log('🔧 Manually triggering booking reminders...');
    
    try {
      await this.sendBookingReminders();
      return { sent: 1, errors: 0 };
    } catch (error) {
      console.error('Manual reminder trigger failed:', error);
      return { sent: 0, errors: 1 };
    }
  }

  // Manual trigger for cleanup
  async triggerDailyCleanup(): Promise<{ success: boolean; error?: string }> {
    console.log('🔧 Manually triggering daily cleanup...');
    
    try {
      await this.performDailyCleanup();
      return { success: true };
    } catch (error) {
      console.error('Manual cleanup trigger failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Get scheduler status
  getStatus(): {
    reminderJobRunning: boolean;
    cleanupJobRunning: boolean;
  } {
    return {
      reminderJobRunning: this.reminderJob !== null,
      cleanupJobRunning: this.cleanupJob !== null
    };
  }

  // Send immediate booking confirmation (called from booking creation)
  async sendBookingConfirmation(bookingId: string): Promise<void> {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              phoneNumber: true
            }
          },
          slot: {
            include: {
              teacher: {
                select: { name: true }
              },
              branch: {
                select: { name: true }
              }
            }
          }
        }
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      const bookingDetails = {
        id: booking.id,
        date: booking.slot.date.toISOString().split('T')[0],
        time: booking.slot.startTime,
        teacher: booking.slot.teacher.name,
        branch: booking.slot.branch.name,
        student: booking.student
      };

      await notificationService.sendBookingConfirmation(bookingDetails);
      console.log(`📧 Booking confirmation sent for booking ${bookingId}`);

    } catch (error) {
      console.error(`Failed to send booking confirmation for ${bookingId}:`, error);
      throw error;
    }
  }

  // Send immediate booking cancellation (called from booking cancellation)
  async sendBookingCancellation(bookingId: string, reason?: string): Promise<void> {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              phoneNumber: true
            }
          },
          slot: {
            include: {
              teacher: {
                select: { name: true }
              },
              branch: {
                select: { name: true }
              }
            }
          }
        }
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      const bookingDetails = {
        id: booking.id,
        date: booking.slot.date.toISOString().split('T')[0],
        time: booking.slot.startTime,
        teacher: booking.slot.teacher.name,
        branch: booking.slot.branch.name,
        student: booking.student
      };

      await notificationService.sendBookingCancellation(bookingDetails, reason);
      console.log(`❌ Booking cancellation sent for booking ${bookingId}`);

    } catch (error) {
      console.error(`Failed to send booking cancellation for ${bookingId}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const schedulerService = new SchedulerService();
export default schedulerService;