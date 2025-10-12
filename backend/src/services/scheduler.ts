import cron from 'node-cron';
import { supabase } from '../lib/supabase';
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
      const { data: bookingsNeedingReminders, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          student:users!bookings_studentId_fkey(id, name, phone_number),
          slot:slots(
            date,
            start_time,
            teacher:users!slots_teacherId_fkey(name),
            branch:branches(name)
          )
        `)
        .eq('status', 'CONFIRMED')
        .gte('slot.date', reminderStart.toISOString())
        .lte('slot.date', reminderEnd.toISOString());
      
      if (bookingsError) {
        throw bookingsError;
      }

      console.log(`📋 Found ${bookingsNeedingReminders?.length || 0} bookings needing reminders`);

      // Check if we've already sent reminders for these bookings
      const bookingsToRemind: any[] = [];

      for (const booking of bookingsNeedingReminders || []) {
        // Cast to any to handle Supabase type issues
        const student = booking.student as any;
        const slot = booking.slot as any;
        
        // Check if reminder was already sent (look for reminder notification in last 2 hours)
        const twoHoursAgo = new Date(now.getTime() - (2 * 60 * 60 * 1000));
        const { data: recentReminder } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', student.id)
          .eq('type', 'BOOKING_REMINDER')
          .gte('created_at', twoHoursAgo.toISOString())
          .limit(1)
          .single();

        if (!recentReminder) {
          bookingsToRemind.push({
            id: booking.id,
            student: {
              id: student.id,
              name: student.name,
              phoneNumber: student.phone_number
            },
            slot: {
              date: new Date(slot.date),
              startTime: slot.start_time,
              teacher: {
                name: slot.teacher?.name || 'Unknown'
              },
              branch: {
                name: slot.branch?.name || 'Unknown'
              }
            }
          });
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

      const { count } = await supabase
        .from('notifications')
        .delete({ count: 'exact' })
        .lt('created_at', ninetyDaysAgo.toISOString())
        .eq('is_read', true);

      console.log(`🗑️ Deleted ${count || 0} old notifications`);

      // Update completed bookings for slots that have passed
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      // First get the slot IDs that are in the past
      const { data: pastSlots } = await supabase
        .from('slots')
        .select('id')
        .lt('date', yesterday.toISOString());

      if (pastSlots && pastSlots.length > 0) {
        const pastSlotIds = pastSlots.map(s => s.id);
        
        const { count } = await supabase
          .from('bookings')
          .update({ 
            status: 'NO_SHOW'
          }, { count: 'exact' })
          .eq('status', 'CONFIRMED')
          .in('slot_id', pastSlotIds);

        if (count && count > 0) {
          console.log(`📝 Marked ${count} past bookings as no-show`);
        }
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
      const { data: booking, error } = await supabase
        .from('bookings')
        .select(`
          id,
          student:users!bookings_studentId_fkey(id, name, phone_number),
          slot:slots(
            date,
            start_time,
            teacher:users!slots_teacherId_fkey(name),
            branch:branches(name)
          )
        `)
        .eq('id', bookingId)
        .single();

      if (error || !booking) {
        throw new Error('Booking not found');
      }

      // Cast to any to handle Supabase type issues
      const slot = booking.slot as any;
      const student = booking.student as any;
      
      const bookingDetails = {
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
      const { data: booking, error } = await supabase
        .from('bookings')
        .select(`
          id,
          student:users!bookings_studentId_fkey(id, name, phone_number),
          slot:slots(
            date,
            start_time,
            teacher:users!slots_teacherId_fkey(name),
            branch:branches(name)
          )
        `)
        .eq('id', bookingId)
        .single();

      if (error || !booking) {
        throw new Error('Booking not found');
      }

      // Cast to any to handle Supabase type issues
      const slot = booking.slot as any;
      const student = booking.student as any;
      
      const bookingDetails = {
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