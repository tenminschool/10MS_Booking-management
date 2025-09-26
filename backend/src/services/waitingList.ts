import prisma from '../lib/prisma';
import { notificationService } from './notification';

export interface WaitingListEntry {
  id: string;
  studentId: string;
  slotId: string;
  position: number;
  createdAt: Date;
  expiresAt: Date;
  status: 'ACTIVE' | 'CONVERTED' | 'EXPIRED' | 'CANCELLED';
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
    const slot = await prisma.slot.findUnique({
      where: { id: slotId },
      include: {
        branch: { select: { id: true, name: true } },
        teacher: { select: { id: true, name: true } },
        bookings: {
          where: { status: { in: ['CONFIRMED', 'COMPLETED'] } }
        },
        waitingList: {
          where: { status: 'ACTIVE' },
          orderBy: { position: 'asc' }
        }
      }
    });

    if (!slot) {
      throw new Error('Slot not found');
    }

    // Check if slot is in the past
    const slotDateTime = new Date(`${slot.date.toISOString().split('T')[0]}T${slot.startTime}`);
    if (slotDateTime < new Date()) {
      throw new Error('Cannot add to waiting list for past slots');
    }

    // Check if student is already on waiting list for this slot
    const existingEntry = await prisma.waitingList.findFirst({
      where: {
        studentId,
        slotId,
        status: 'ACTIVE'
      }
    });

    if (existingEntry) {
      throw new Error('Student is already on the waiting list for this slot');
    }

    // Check if student already has a confirmed booking for this slot
    const existingBooking = await prisma.booking.findFirst({
      where: {
        studentId,
        slotId,
        status: { in: ['CONFIRMED', 'COMPLETED'] }
      }
    });

    if (existingBooking) {
      throw new Error('Student already has a confirmed booking for this slot');
    }

    // Calculate position in waiting list
    const nextPosition = slot.waitingList.length + 1;

    // Calculate expiry time
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.WAITING_LIST_EXPIRY_HOURS);

    // Create waiting list entry
    const waitingListEntry = await prisma.waitingList.create({
      data: {
        studentId,
        slotId,
        position: nextPosition,
        expiresAt
      },
      include: {
        student: {
          select: { id: true, name: true, phoneNumber: true }
        },
        slot: {
          include: {
            branch: { select: { id: true, name: true } },
            teacher: { select: { id: true, name: true } }
          }
        }
      }
    });

    // Send notification to student
    await notificationService.sendNotification(
      studentId,
      'SYSTEM_ALERT',
      {
        message: `You've been added to the waiting list for ${slot.branch.name} on ${slot.date.toLocaleDateString()} at ${slot.startTime}. Position: ${nextPosition}`,
        slotId,
        position: nextPosition.toString(),
        expiresAt: expiresAt.toISOString()
      }
    );

    return waitingListEntry;
  }

  /**
   * Get waiting list for a specific slot
   */
  static async getWaitingListForSlot(slotId: string): Promise<WaitingListEntry[]> {
    return await prisma.waitingList.findMany({
      where: {
        slotId,
        status: 'ACTIVE'
      },
      include: {
        student: {
          select: { id: true, name: true, phoneNumber: true }
        },
        slot: {
          include: {
            branch: { select: { id: true, name: true } },
            teacher: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { position: 'asc' }
    });
  }

  /**
   * Get waiting list entries for a student
   */
  static async getWaitingListForStudent(studentId: string): Promise<WaitingListEntry[]> {
    return await prisma.waitingList.findMany({
      where: {
        studentId,
        status: 'ACTIVE'
      },
      include: {
        student: {
          select: { id: true, name: true, phoneNumber: true }
        },
        slot: {
          include: {
            branch: { select: { id: true, name: true } },
            teacher: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Remove a student from the waiting list
   */
  static async removeFromWaitingList(studentId: string, slotId: string): Promise<void> {
    const entry = await prisma.waitingList.findFirst({
      where: {
        studentId,
        slotId,
        status: 'ACTIVE'
      }
    });

    if (!entry) {
      throw new Error('Student is not on the waiting list for this slot');
    }

    // Update the entry status
    await prisma.waitingList.update({
      where: { id: entry.id },
      data: { status: 'CANCELLED' }
    });

    // Reorder remaining entries
    await this.reorderWaitingList(slotId);
  }

  /**
   * Convert the next waiting list entry to a booking when a slot becomes available
   */
  static async convertNextToBooking(slotId: string): Promise<WaitingListEntry | null> {
    const nextEntry = await prisma.waitingList.findFirst({
      where: {
        slotId,
        status: 'ACTIVE'
      },
      include: {
        student: {
          select: { id: true, name: true, phoneNumber: true }
        },
        slot: {
          include: {
            branch: { select: { id: true, name: true } },
            teacher: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { position: 'asc' }
    });

    if (!nextEntry) {
      return null;
    }

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        studentId: nextEntry.studentId,
        slotId: nextEntry.slotId,
        status: 'CONFIRMED'
      }
    });

    // Update waiting list entry status
    await prisma.waitingList.update({
      where: { id: nextEntry.id },
      data: { status: 'CONVERTED' }
    });

    // Reorder remaining entries
    await this.reorderWaitingList(slotId);

    // Send notification to student
    await notificationService.sendNotification(
      nextEntry.studentId,
      'BOOKING_CONFIRMED',
      {
        message: `Your waiting list position has been converted to a confirmed booking for ${nextEntry.slot.branch.name} on ${nextEntry.slot.date.toLocaleDateString()} at ${nextEntry.slot.startTime}`,
        bookingId: booking.id,
        slotId: nextEntry.slotId
      }
    );

    return nextEntry;
  }

  /**
   * Reorder waiting list entries after removal
   */
  private static async reorderWaitingList(slotId: string): Promise<void> {
    const entries = await prisma.waitingList.findMany({
      where: {
        slotId,
        status: 'ACTIVE'
      },
      orderBy: { position: 'asc' }
    });

    // Update positions
    for (let i = 0; i < entries.length; i++) {
      if (entries[i].position !== i + 1) {
        await prisma.waitingList.update({
          where: { id: entries[i].id },
          data: { position: i + 1 }
        });
      }
    }
  }

  /**
   * Clean up expired waiting list entries
   */
  static async cleanupExpiredEntries(): Promise<number> {
    const expiredEntries = await prisma.waitingList.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { lt: new Date() }
      }
    });

    if (expiredEntries.length === 0) {
      return 0;
    }

    // Update all expired entries
    await prisma.waitingList.updateMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { lt: new Date() }
      },
      data: { status: 'EXPIRED' }
    });

    // Send notifications to students about expired entries
    for (const entry of expiredEntries) {
      await notificationService.sendNotification(
        entry.studentId,
        'SYSTEM_ALERT',
        {
          message: 'Your waiting list entry has expired. You can try booking again if slots are still available.',
          slotId: entry.slotId
        }
      );
    }

    return expiredEntries.length;
  }

  /**
   * Check if a slot has available capacity
   */
  static async hasAvailableCapacity(slotId: string): Promise<boolean> {
    const slot = await prisma.slot.findUnique({
      where: { id: slotId },
      include: {
        bookings: {
          where: { status: { in: ['CONFIRMED', 'COMPLETED'] } }
        }
      }
    });

    if (!slot) {
      return false;
    }

    return slot.bookings.length < slot.capacity;
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
