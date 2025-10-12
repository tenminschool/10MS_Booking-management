import { supabase } from '../lib/supabase';
import { notificationService } from './notification';

export interface WaitingListEntry {
  id: string;
  studentId: string;
  slotId: string;
  priority: number; // Using priority from DB schema
  createdAt: Date;
  expiresAt: Date;
  student: {
    id: string;
    name: string;
    phoneNumber: string | null;
  };
  slot: {
    id: string;
    date: Date;
    startTime: string;
    endTime: string;
    branch: {
      id: string;
      name: string;
    };
    teacher: {
      id: string;
      name: string;
    };
  };
}

export class WaitingListService {
  private static readonly WAITING_LIST_EXPIRY_HOURS = 24; // 24 hours

  /**
   * Add a student to the waiting list for a slot
   */
  static async addToWaitingList(studentId: string, slotId: string): Promise<WaitingListEntry> {
    // Check if slot exists and get current capacity
    const { data: slot, error: slotError } = await supabase
      .from('slots')
      .select(`
        *,
        branch:branches(id, name),
        teacher:users!slots_teacherId_fkey(id, name),
        bookings:bookings(id, status)
      `)
      .eq('id', slotId)
      .single();

    if (slotError || !slot) {
      throw new Error('Slot not found');
    }

    // Check if slot is in the past
    const slotDateTime = new Date(`${slot.date.split('T')[0]}T${slot.start_time}`);
    if (slotDateTime < new Date()) {
      throw new Error('Cannot add to waiting list for past slots');
    }

    // Check if student is already on waiting list for this slot
    const { data: existingEntry } = await supabase
      .from('waiting_list')
      .select('*')
      .eq('student_id', studentId)
      .eq('slot_id', slotId)
      .single();

    if (existingEntry) {
      throw new Error('Student is already on the waiting list for this slot');
    }

    // Check if student already has a confirmed booking for this slot
    const { data: existingBooking } = await supabase
      .from('bookings')
      .select('*')
      .eq('student_id', studentId)
      .eq('slot_id', slotId)
      .in('status', ['CONFIRMED', 'COMPLETED'])
      .single();

    if (existingBooking) {
      throw new Error('Student already has a confirmed booking for this slot');
    }

    // Get count of waiting list entries for priority calculation
    const { count: waitingCount } = await supabase
      .from('waiting_list')
      .select('*', { count: 'exact', head: true })
      .eq('slot_id', slotId);

    const nextPriority = (waitingCount || 0) + 1;

    // Calculate expiry time
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.WAITING_LIST_EXPIRY_HOURS);

    // Create waiting list entry
    const { data: waitingListEntry, error: createError } = await supabase
      .from('waiting_list')
      .insert({
        student_id: studentId,
        slot_id: slotId,
        priority: nextPriority,
        expires_at: expiresAt.toISOString()
      })
      .select(`
        *,
        student:users!waiting_list_student_id_fkey(id, name, phone_number),
        slot:slots(
          *,
          branch:branches(id, name),
          teacher:users!slots_teacherId_fkey(id, name)
        )
      `)
      .single();

    if (createError || !waitingListEntry) {
      throw new Error('Failed to add to waiting list');
    }

    // Send notification to student
    await notificationService.sendNotification(
      studentId,
      'SYSTEM_ALERT',
      {
        message: `You've been added to the waiting list for ${waitingListEntry.slot.branch.name} on ${new Date(waitingListEntry.slot.date).toLocaleDateString()} at ${waitingListEntry.slot.start_time}. Position: ${nextPriority}`,
        slotId,
        position: nextPriority.toString(),
        expiresAt: expiresAt.toISOString()
      }
    );

    // Map to return type
    return {
      id: waitingListEntry.id,
      studentId: waitingListEntry.student_id,
      slotId: waitingListEntry.slot_id,
      priority: waitingListEntry.priority,
      createdAt: new Date(waitingListEntry.created_at),
      expiresAt: new Date(waitingListEntry.expires_at),
      student: {
        id: waitingListEntry.student.id,
        name: waitingListEntry.student.name,
        phoneNumber: waitingListEntry.student.phone_number
      },
      slot: {
        id: waitingListEntry.slot.id,
        date: new Date(waitingListEntry.slot.date),
        startTime: waitingListEntry.slot.start_time,
        endTime: waitingListEntry.slot.end_time,
        branch: waitingListEntry.slot.branch,
        teacher: waitingListEntry.slot.teacher
      }
    };
  }

  /**
   * Get waiting list for a specific slot
   */
  static async getWaitingListForSlot(slotId: string): Promise<WaitingListEntry[]> {
    const { data: entries, error } = await supabase
      .from('waiting_list')
      .select(`
        *,
        student:users!waiting_list_student_id_fkey(id, name, phone_number),
        slot:slots(
          *,
          branch:branches(id, name),
          teacher:users!slots_teacherId_fkey(id, name)
        )
      `)
      .eq('slot_id', slotId)
      .gte('expires_at', new Date().toISOString()) // Only active entries
      .order('priority', { ascending: true });

    if (error) {
      throw error;
    }

    return (entries || []).map(entry => ({
      id: entry.id,
      studentId: entry.student_id,
      slotId: entry.slot_id,
      priority: entry.priority,
      createdAt: new Date(entry.created_at),
      expiresAt: new Date(entry.expires_at),
      student: {
        id: entry.student.id,
        name: entry.student.name,
        phoneNumber: entry.student.phone_number
      },
      slot: {
        id: entry.slot.id,
        date: new Date(entry.slot.date),
        startTime: entry.slot.start_time,
        endTime: entry.slot.end_time,
        branch: entry.slot.branch,
        teacher: entry.slot.teacher
      }
    }));
  }

  /**
   * Get waiting list entries for a student
   */
  static async getWaitingListForStudent(studentId: string): Promise<WaitingListEntry[]> {
    const { data: entries, error } = await supabase
      .from('waiting_list')
      .select(`
        *,
        student:users!waiting_list_student_id_fkey(id, name, phone_number),
        slot:slots(
          *,
          branch:branches(id, name),
          teacher:users!slots_teacherId_fkey(id, name)
        )
      `)
      .eq('student_id', studentId)
      .gte('expires_at', new Date().toISOString()) // Only active entries
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (entries || []).map(entry => ({
      id: entry.id,
      studentId: entry.student_id,
      slotId: entry.slot_id,
      priority: entry.priority,
      createdAt: new Date(entry.created_at),
      expiresAt: new Date(entry.expires_at),
      student: {
        id: entry.student.id,
        name: entry.student.name,
        phoneNumber: entry.student.phone_number
      },
      slot: {
        id: entry.slot.id,
        date: new Date(entry.slot.date),
        startTime: entry.slot.start_time,
        endTime: entry.slot.end_time,
        branch: entry.slot.branch,
        teacher: entry.slot.teacher
      }
    }));
  }

  /**
   * Remove a student from the waiting list
   */
  static async removeFromWaitingList(studentId: string, slotId: string): Promise<void> {
    const { data: entry, error: findError } = await supabase
      .from('waiting_list')
      .select('*')
      .eq('student_id', studentId)
      .eq('slot_id', slotId)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (findError || !entry) {
      throw new Error('Student is not on the waiting list for this slot');
    }

    // Delete the entry
    const { error: deleteError } = await supabase
      .from('waiting_list')
      .delete()
      .eq('id', entry.id);

    if (deleteError) {
      throw deleteError;
    }

    // Reorder remaining entries
    await this.reorderWaitingList(slotId);
  }

  /**
   * Convert the next waiting list entry to a booking when a slot becomes available
   */
  static async convertNextToBooking(slotId: string): Promise<WaitingListEntry | null> {
    const { data: nextEntry, error: findError } = await supabase
      .from('waiting_list')
      .select(`
        *,
        student:users!waiting_list_student_id_fkey(id, name, phone_number),
        slot:slots(
          *,
          branch:branches(id, name),
          teacher:users!slots_teacherId_fkey(id, name)
        )
      `)
      .eq('slot_id', slotId)
      .gte('expires_at', new Date().toISOString())
      .order('priority', { ascending: true })
      .limit(1)
      .single();

    if (findError || !nextEntry) {
      return null;
    }

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        student_id: nextEntry.student_id,
        slot_id: nextEntry.slot_id,
        status: 'CONFIRMED'
      })
      .select('id')
      .single();

    if (bookingError || !booking) {
      throw new Error('Failed to create booking from waiting list');
    }

    // Remove from waiting list
    const { error: deleteError } = await supabase
      .from('waiting_list')
      .delete()
      .eq('id', nextEntry.id);

    if (deleteError) {
      console.error('Failed to remove from waiting list:', deleteError);
    }

    // Reorder remaining entries
    await this.reorderWaitingList(slotId);

    // Send notification to student
    await notificationService.sendNotification(
      nextEntry.student_id,
      'BOOKING_CONFIRMED',
      {
        message: `Your waiting list position has been converted to a confirmed booking for ${nextEntry.slot.branch.name} on ${new Date(nextEntry.slot.date).toLocaleDateString()} at ${nextEntry.slot.start_time}`,
        bookingId: booking.id,
        slotId: nextEntry.slot_id
      }
    );

    return {
      id: nextEntry.id,
      studentId: nextEntry.student_id,
      slotId: nextEntry.slot_id,
      priority: nextEntry.priority,
      createdAt: new Date(nextEntry.created_at),
      expiresAt: new Date(nextEntry.expires_at),
      student: {
        id: nextEntry.student.id,
        name: nextEntry.student.name,
        phoneNumber: nextEntry.student.phone_number
      },
      slot: {
        id: nextEntry.slot.id,
        date: new Date(nextEntry.slot.date),
        startTime: nextEntry.slot.start_time,
        endTime: nextEntry.slot.end_time,
        branch: nextEntry.slot.branch,
        teacher: nextEntry.slot.teacher
      }
    };
  }

  /**
   * Reorder waiting list entries after removal
   */
  private static async reorderWaitingList(slotId: string): Promise<void> {
    const { data: entries, error } = await supabase
      .from('waiting_list')
      .select('*')
      .eq('slot_id', slotId)
      .gte('expires_at', new Date().toISOString())
      .order('priority', { ascending: true });

    if (error || !entries) {
      return;
    }

    // Update priorities
    for (let i = 0; i < entries.length; i++) {
      if (entries[i].priority !== i + 1) {
        await supabase
          .from('waiting_list')
          .update({ priority: i + 1 })
          .eq('id', entries[i].id);
      }
    }
  }

  /**
   * Clean up expired waiting list entries
   */
  static async cleanupExpiredEntries(): Promise<number> {
    // Get expired entries
    const { data: expiredEntries, error: findError } = await supabase
      .from('waiting_list')
      .select('*')
      .lt('expires_at', new Date().toISOString());

    if (findError || !expiredEntries) {
      return 0;
    }

    if (expiredEntries.length === 0) {
      return 0;
    }

    // Delete expired entries
    const { error: deleteError } = await supabase
      .from('waiting_list')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (deleteError) {
      console.error('Failed to delete expired entries:', deleteError);
      return 0;
    }

    // Send notifications to students about expired entries
    for (const entry of expiredEntries) {
      await notificationService.sendNotification(
        entry.student_id,
        'SYSTEM_ALERT',
        {
          message: 'Your waiting list entry has expired. You can try booking again if slots are still available.',
          slotId: entry.slot_id
        }
      );
    }

    return expiredEntries.length;
  }

  /**
   * Check if a slot has available capacity
   */
  static async hasAvailableCapacity(slotId: string): Promise<boolean> {
    const { data: slot, error } = await supabase
      .from('slots')
      .select(`
        *,
        bookings:bookings(id, status)
      `)
      .eq('id', slotId)
      .single();

    if (error || !slot) {
      return false;
    }

    const confirmedBookings = (slot.bookings || []).filter(
      (b: any) => ['CONFIRMED', 'COMPLETED'].includes(b.status)
    ).length;

    return confirmedBookings < slot.capacity;
  }
}

// Export static methods as service functions
export const waitingListService = {
  addToWaitingList: WaitingListService.addToWaitingList,
  getWaitingListForSlot: WaitingListService.getWaitingListForSlot,
  getWaitingListForStudent: WaitingListService.getWaitingListForStudent,
  removeFromWaitingList: WaitingListService.removeFromWaitingList,
  convertNextToBooking: WaitingListService.convertNextToBooking,
  cleanupExpiredEntries: WaitingListService.cleanupExpiredEntries,
  hasAvailableCapacity: WaitingListService.hasAvailableCapacity
};
