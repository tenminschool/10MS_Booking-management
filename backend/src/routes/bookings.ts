import express from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { auditLog, captureOldValues } from '../middleware/audit';
import { schedulerService } from '../services/scheduler';
import { UserRole, BookingStatus } from '@prisma/client';

const router = express.Router();

// Validation schemas
const createBookingSchema = z.object({
  slotId: z.string().min(1, 'Slot ID is required'),
  studentPhoneNumber: z.string().optional() // For admin bookings
});

const updateBookingSchema = z.object({
  status: z.enum(['CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW']).optional(),
  attended: z.boolean().optional(),
  cancellationReason: z.string().optional()
});

const rescheduleBookingSchema = z.object({
  newSlotId: z.string().min(1, 'New slot ID is required')
});

const bookingFiltersSchema = z.object({
  studentId: z.string().optional(),
  slotId: z.string().optional(),
  branchId: z.string().optional(),
  teacherId: z.string().optional(),
  status: z.enum(['CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  attended: z.string().transform(val => val === 'true').optional()
});

// Helper function to check if cancellation is within 24 hours
function isCancellationWithin24Hours(slotDate: Date, slotStartTime: string): boolean {
  const slotDateTime = new Date(`${slotDate.toISOString().split('T')[0]}T${slotStartTime}:00`);
  const now = new Date();
  const timeDifference = slotDateTime.getTime() - now.getTime();
  const hoursUntilSlot = timeDifference / (1000 * 60 * 60);
  
  return hoursUntilSlot < 24;
}

// Helper function to check for duplicate bookings in the same month
async function checkMonthlyDuplicateBooking(studentId: string, slotDate: Date, excludeBookingId?: string): Promise<boolean> {
  const startOfMonth = new Date(slotDate.getFullYear(), slotDate.getMonth(), 1);
  const endOfMonth = new Date(slotDate.getFullYear(), slotDate.getMonth() + 1, 0);

  const whereClause: any = {
    studentId,
    status: { in: ['CONFIRMED', 'COMPLETED'] },
    slot: {
      date: {
        gte: startOfMonth,
        lte: endOfMonth
      }
    }
  };

  if (excludeBookingId) {
    whereClause.id = { not: excludeBookingId };
  }

  const existingBooking = await prisma.booking.findFirst({
    where: whereClause,
    include: {
      slot: {
        include: {
          branch: { select: { name: true } }
        }
      }
    }
  });

  return !!existingBooking;
}

// Helper function to get available slots across branches
async function getAvailableSlots(filters: any = {}) {
  const whereClause: any = {};

  if (filters.branchId) {
    whereClause.branchId = filters.branchId;
  }

  if (filters.teacherId) {
    whereClause.teacherId = filters.teacherId;
  }

  if (filters.startDate && filters.endDate) {
    whereClause.date = {
      gte: new Date(filters.startDate),
      lte: new Date(filters.endDate)
    };
  } else if (filters.startDate) {
    whereClause.date = { gte: new Date(filters.startDate) };
  } else if (filters.endDate) {
    whereClause.date = { lte: new Date(filters.endDate) };
  }

  const slots = await prisma.slot.findMany({
    where: whereClause,
    include: {
      branch: {
        select: { id: true, name: true }
      },
      teacher: {
        select: { id: true, name: true }
      },
      bookings: {
        where: { status: { in: ['CONFIRMED', 'COMPLETED'] } },
        select: { id: true, status: true }
      }
    },
    orderBy: [
      { date: 'asc' },
      { startTime: 'asc' }
    ]
  });

  return slots.map(slot => {
    const bookedCount = slot.bookings.length;
    const availableSpots = slot.capacity - bookedCount;
    const isAvailable = availableSpots > 0;

    return {
      id: slot.id,
      branchId: slot.branchId,
      branch: slot.branch,
      teacherId: slot.teacherId,
      teacher: slot.teacher,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      capacity: slot.capacity,
      bookedCount,
      availableSpots,
      isAvailable
    };
  }).filter(slot => slot.isAvailable);
}

// GET /api/bookings - Get bookings with filtering
router.get('/', authenticate, async (req, res) => {
  try {
    const filters = bookingFiltersSchema.parse(req.query);
    const user = req.user!;

    // Build where clause based on user role and filters
    const whereClause: any = {};

    // Role-based filtering
    if (user.role === 'STUDENT') {
      whereClause.studentId = user.userId;
    } else if (user.role === 'TEACHER') {
      whereClause.slot = {
        teacherId: user.userId
      };
    } else if (user.role === 'BRANCH_ADMIN') {
      whereClause.slot = {
        branchId: user.branchId
      };
    }
    // SUPER_ADMIN can see all bookings

    // Apply additional filters
    if (filters.studentId && ['SUPER_ADMIN', 'BRANCH_ADMIN', 'TEACHER'].includes(user.role)) {
      whereClause.studentId = filters.studentId;
    }

    if (filters.slotId) {
      whereClause.slotId = filters.slotId;
    }

    if (filters.status) {
      whereClause.status = filters.status;
    }

    if (filters.attended !== undefined) {
      whereClause.attended = filters.attended;
    }

    if (filters.branchId && ['SUPER_ADMIN'].includes(user.role)) {
      whereClause.slot = {
        ...whereClause.slot,
        branchId: filters.branchId
      };
    }

    if (filters.teacherId && ['SUPER_ADMIN', 'BRANCH_ADMIN'].includes(user.role)) {
      whereClause.slot = {
        ...whereClause.slot,
        teacherId: filters.teacherId
      };
    }

    // Date filtering
    if (filters.startDate || filters.endDate) {
      const dateFilter: any = {};
      if (filters.startDate) dateFilter.gte = new Date(filters.startDate);
      if (filters.endDate) dateFilter.lte = new Date(filters.endDate);
      
      whereClause.slot = {
        ...whereClause.slot,
        date: dateFilter
      };
    }

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: {
        student: {
          select: { id: true, name: true, phoneNumber: true }
        },
        slot: {
          include: {
            branch: {
              select: { id: true, name: true }
            },
            teacher: {
              select: { id: true, name: true }
            }
          }
        },
        assessments: {
          select: { id: true, score: true, remarks: true, assessedAt: true }
        }
      },
      orderBy: [
        { slot: { date: 'desc' } },
        { slot: { startTime: 'desc' } }
      ]
    });

    res.json({
      bookings,
      total: bookings.length,
      filters
    });

  } catch (error) {
    console.error('Error fetching bookings:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid query parameters',
        details: error.errors
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch bookings'
    });
  }
});

// GET /api/bookings/:id - Get single booking
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const whereClause: any = { id };

    // Role-based access control
    if (user.role === 'STUDENT') {
      whereClause.studentId = user.userId;
    } else if (user.role === 'TEACHER') {
      whereClause.slot = {
        teacherId: user.userId
      };
    } else if (user.role === 'BRANCH_ADMIN') {
      whereClause.slot = {
        branchId: user.branchId
      };
    }
    // SUPER_ADMIN can access all bookings

    const booking = await prisma.booking.findFirst({
      where: whereClause,
      include: {
        student: {
          select: { id: true, name: true, phoneNumber: true }
        },
        slot: {
          include: {
            branch: {
              select: { id: true, name: true, address: true }
            },
            teacher: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        assessments: {
          include: {
            teacher: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    if (!booking) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Booking not found or access denied'
      });
    }

    res.json(booking);

  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch booking'
    });
  }
});

// POST /api/bookings - Create new booking
router.post('/', authenticate, auditLog('booking'), async (req, res) => {
  try {
    const data = createBookingSchema.parse(req.body);
    const user = req.user!;

    // Determine student ID
    let studentId: string;
    
    if (user.role === 'STUDENT') {
      studentId = user.userId;
    } else if (data.studentPhoneNumber && ['SUPER_ADMIN', 'BRANCH_ADMIN', 'TEACHER'].includes(user.role)) {
      // Admin/Teacher booking for a student
      const student = await prisma.user.findFirst({
        where: {
          phoneNumber: data.studentPhoneNumber,
          role: 'STUDENT',
          isActive: true
        }
      });

      if (!student) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Student not found with provided phone number'
        });
      }

      studentId = student.id;
    } else {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Student phone number is required for admin bookings'
      });
    }

    // Get slot details with branch and teacher info
    const slot = await prisma.slot.findUnique({
      where: { id: data.slotId },
      include: {
        branch: { select: { id: true, name: true } },
        teacher: { select: { id: true, name: true } },
        bookings: {
          where: { status: { in: ['CONFIRMED', 'COMPLETED'] } }
        }
      }
    });

    if (!slot) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Slot not found'
      });
    }

    // Check if slot is in the past
    const slotDateTime = new Date(`${slot.date.toISOString().split('T')[0]}T${slot.startTime}:00`);
    if (slotDateTime < new Date()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Cannot book slots in the past'
      });
    }

    // Check slot capacity
    const bookedCount = slot.bookings.length;
    if (bookedCount >= slot.capacity) {
      return res.status(409).json({
        error: 'Capacity Error',
        message: 'Slot is fully booked',
        capacity: slot.capacity,
        booked: bookedCount
      });
    }

    // Check for duplicate booking in the same slot
    const existingSlotBooking = await prisma.booking.findFirst({
      where: {
        studentId,
        slotId: data.slotId,
        status: { in: ['CONFIRMED', 'COMPLETED'] }
      }
    });

    if (existingSlotBooking) {
      return res.status(409).json({
        error: 'Duplicate Error',
        message: 'Student already has a booking for this slot'
      });
    }

    // Check for monthly duplicate booking across all branches
    const hasMonthlyBooking = await checkMonthlyDuplicateBooking(studentId, slot.date);
    if (hasMonthlyBooking) {
      return res.status(409).json({
        error: 'Monthly Limit Error',
        message: 'Student already has a booking this month across all branches'
      });
    }

    // Create the booking
    const booking = await prisma.booking.create({
      data: {
        studentId,
        slotId: data.slotId,
        status: 'CONFIRMED'
      },
      include: {
        student: {
          select: { id: true, name: true, phoneNumber: true }
        },
        slot: {
          include: {
            branch: {
              select: { id: true, name: true }
            },
            teacher: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    // Send booking confirmation notification
    try {
      await schedulerService.sendBookingConfirmation(booking.id);
    } catch (notificationError) {
      console.error('Failed to send booking confirmation:', notificationError);
      // Don't fail the booking creation if notification fails
    }

    res.status(201).json({
      message: 'Booking created successfully',
      booking
    });

  } catch (error) {
    console.error('Error creating booking:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid booking data',
        details: error.errors
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create booking'
    });
  }
});

// PUT /api/bookings/:id/cancel - Cancel booking
router.put('/:id/cancel', authenticate, captureOldValues('booking'), auditLog('booking'), async (req, res) => {
  try {
    const { id } = req.params;
    const { cancellationReason } = req.body;
    const user = req.user!;

    // Get existing booking
    const booking = await prisma.booking.findFirst({
      where: { id },
      include: {
        slot: {
          include: {
            branch: { select: { name: true } },
            teacher: { select: { name: true } }
          }
        },
        student: {
          select: { id: true, name: true, phoneNumber: true }
        }
      }
    });

    if (!booking) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Booking not found'
      });
    }

    // Role-based access control
    if (user.role === 'STUDENT' && booking.studentId !== user.userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Students can only cancel their own bookings'
      });
    } else if (user.role === 'TEACHER' && booking.slot.teacherId !== user.userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Teachers can only cancel bookings for their own slots'
      });
    } else if (user.role === 'BRANCH_ADMIN' && booking.slot.branchId !== user.branchId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Branch administrators can only cancel bookings within their branch'
      });
    }

    // Check if booking is already cancelled or completed
    if (booking.status === 'CANCELLED') {
      return res.status(400).json({
        error: 'Invalid Status',
        message: 'Booking is already cancelled'
      });
    }

    if (booking.status === 'COMPLETED') {
      return res.status(400).json({
        error: 'Invalid Status',
        message: 'Cannot cancel completed booking'
      });
    }

    // Check 24-hour cancellation rule for students
    const isWithin24Hours = isCancellationWithin24Hours(booking.slot.date, booking.slot.startTime);
    
    if (user.role === 'STUDENT' && isWithin24Hours) {
      return res.status(400).json({
        error: 'Cancellation Policy Violation',
        message: 'Bookings cannot be cancelled within 24 hours of the scheduled time',
        slotDateTime: `${booking.slot.date.toISOString().split('T')[0]} ${booking.slot.startTime}`
      });
    }

    // Update booking status
    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason: cancellationReason || (isWithin24Hours ? 'Late cancellation' : 'Student cancellation')
      },
      include: {
        student: {
          select: { id: true, name: true, phoneNumber: true }
        },
        slot: {
          include: {
            branch: {
              select: { id: true, name: true }
            },
            teacher: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    // Send booking cancellation notification
    try {
      await schedulerService.sendBookingCancellation(
        updatedBooking.id, 
        cancellationReason || (isWithin24Hours ? 'Late cancellation' : 'Student cancellation')
      );
    } catch (notificationError) {
      console.error('Failed to send booking cancellation notification:', notificationError);
      // Don't fail the cancellation if notification fails
    }

    res.json({
      message: 'Booking cancelled successfully',
      booking: updatedBooking,
      slotFreed: !isWithin24Hours // Slot is only freed if not within 24 hours
    });

  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to cancel booking'
    });
  }
});

// PUT /api/bookings/:id/reschedule - Reschedule booking
router.put('/:id/reschedule', authenticate, captureOldValues('booking'), auditLog('booking'), async (req, res) => {
  try {
    const { id } = req.params;
    const data = rescheduleBookingSchema.parse(req.body);
    const user = req.user!;

    // Get existing booking
    const existingBooking = await prisma.booking.findFirst({
      where: { id },
      include: {
        slot: {
          include: {
            branch: { select: { name: true } },
            teacher: { select: { name: true } }
          }
        },
        student: {
          select: { id: true, name: true, phoneNumber: true }
        }
      }
    });

    if (!existingBooking) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Booking not found'
      });
    }

    // Role-based access control
    if (user.role === 'STUDENT' && existingBooking.studentId !== user.userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Students can only reschedule their own bookings'
      });
    } else if (user.role === 'TEACHER' && existingBooking.slot.teacherId !== user.userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Teachers can only reschedule bookings for their own slots'
      });
    } else if (user.role === 'BRANCH_ADMIN' && existingBooking.slot.branchId !== user.branchId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Branch administrators can only reschedule bookings within their branch'
      });
    }

    // Check if booking can be rescheduled
    if (existingBooking.status === 'CANCELLED') {
      return res.status(400).json({
        error: 'Invalid Status',
        message: 'Cannot reschedule cancelled booking'
      });
    }

    if (existingBooking.status === 'COMPLETED') {
      return res.status(400).json({
        error: 'Invalid Status',
        message: 'Cannot reschedule completed booking'
      });
    }

    // Check 24-hour rescheduling rule for students
    const isWithin24Hours = isCancellationWithin24Hours(existingBooking.slot.date, existingBooking.slot.startTime);
    
    if (user.role === 'STUDENT' && isWithin24Hours) {
      return res.status(400).json({
        error: 'Rescheduling Policy Violation',
        message: 'Bookings cannot be rescheduled within 24 hours of the scheduled time'
      });
    }

    // Get new slot details (cross-branch support)
    const newSlot = await prisma.slot.findUnique({
      where: { id: data.newSlotId },
      include: {
        branch: { select: { id: true, name: true } },
        teacher: { select: { id: true, name: true } },
        bookings: {
          where: { status: { in: ['CONFIRMED', 'COMPLETED'] } }
        }
      }
    });

    if (!newSlot) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'New slot not found'
      });
    }

    // Check if new slot is in the past
    const newSlotDateTime = new Date(`${newSlot.date.toISOString().split('T')[0]}T${newSlot.startTime}:00`);
    if (newSlotDateTime < new Date()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Cannot reschedule to a slot in the past'
      });
    }

    // Check new slot capacity
    const newSlotBookedCount = newSlot.bookings.length;
    if (newSlotBookedCount >= newSlot.capacity) {
      return res.status(409).json({
        error: 'Capacity Error',
        message: 'New slot is fully booked',
        capacity: newSlot.capacity,
        booked: newSlotBookedCount
      });
    }

    // Check for duplicate booking in the new slot
    const existingNewSlotBooking = await prisma.booking.findFirst({
      where: {
        studentId: existingBooking.studentId,
        slotId: data.newSlotId,
        status: { in: ['CONFIRMED', 'COMPLETED'] }
      }
    });

    if (existingNewSlotBooking) {
      return res.status(409).json({
        error: 'Duplicate Error',
        message: 'Student already has a booking for the new slot'
      });
    }

    // Check monthly duplicate booking (excluding current booking)
    const hasMonthlyBooking = await checkMonthlyDuplicateBooking(
      existingBooking.studentId, 
      newSlot.date, 
      existingBooking.id
    );
    
    if (hasMonthlyBooking) {
      return res.status(409).json({
        error: 'Monthly Limit Error',
        message: 'Student already has another booking this month'
      });
    }

    // Update the booking
    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        slotId: data.newSlotId
      },
      include: {
        student: {
          select: { id: true, name: true, phoneNumber: true }
        },
        slot: {
          include: {
            branch: {
              select: { id: true, name: true }
            },
            teacher: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    res.json({
      message: 'Booking rescheduled successfully',
      booking: updatedBooking,
      previousSlot: {
        id: existingBooking.slot.id,
        date: existingBooking.slot.date,
        startTime: existingBooking.slot.startTime,
        branch: existingBooking.slot.branch.name,
        teacher: existingBooking.slot.teacher.name
      }
    });

  } catch (error) {
    console.error('Error rescheduling booking:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid reschedule data',
        details: error.errors
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to reschedule booking'
    });
  }
});

// PUT /api/bookings/:id/attendance - Mark attendance
router.put('/:id/attendance', authenticate, captureOldValues('booking'), auditLog('booking'), async (req, res) => {
  try {
    const { id } = req.params;
    const data = updateBookingSchema.parse(req.body);
    const user = req.user!;

    // Only teachers and admins can mark attendance
    if (!['TEACHER', 'BRANCH_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only teachers and administrators can mark attendance'
      });
    }

    // Get existing booking
    const booking = await prisma.booking.findFirst({
      where: { id },
      include: {
        slot: {
          include: {
            branch: { select: { name: true } },
            teacher: { select: { name: true } }
          }
        },
        student: {
          select: { id: true, name: true, phoneNumber: true }
        }
      }
    });

    if (!booking) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Booking not found'
      });
    }

    // Role-based access control
    if (user.role === 'TEACHER' && booking.slot.teacherId !== user.userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Teachers can only mark attendance for their own slots'
      });
    } else if (user.role === 'BRANCH_ADMIN' && booking.slot.branchId !== user.branchId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Branch administrators can only mark attendance within their branch'
      });
    }

    // Check if booking is confirmed
    if (booking.status !== 'CONFIRMED') {
      return res.status(400).json({
        error: 'Invalid Status',
        message: 'Can only mark attendance for confirmed bookings'
      });
    }

    // Determine new status based on attendance
    let newStatus: BookingStatus = booking.status;
    if (data.attended !== undefined) {
      newStatus = data.attended ? 'COMPLETED' : 'NO_SHOW';
    } else if (data.status) {
      newStatus = data.status;
    }

    // Update booking
    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        attended: data.attended,
        status: newStatus
      },
      include: {
        student: {
          select: { id: true, name: true, phoneNumber: true }
        },
        slot: {
          include: {
            branch: {
              select: { id: true, name: true }
            },
            teacher: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    res.json({
      message: 'Attendance marked successfully',
      booking: updatedBooking
    });

  } catch (error) {
    console.error('Error marking attendance:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid attendance data',
        details: error.errors
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to mark attendance'
    });
  }
});

// GET /api/bookings/available-slots - Get available slots for booking (cross-branch)
router.get('/available-slots', authenticate, async (req, res) => {
  try {
    const filters = bookingFiltersSchema.parse(req.query);
    const user = req.user!;

    // Students and teachers can view all available slots across branches
    // Admins can filter by branch if needed
    const availableSlots = await getAvailableSlots({
      branchId: filters.branchId,
      teacherId: filters.teacherId,
      startDate: filters.startDate,
      endDate: filters.endDate
    });

    res.json({
      slots: availableSlots,
      total: availableSlots.length,
      filters
    });

  } catch (error) {
    console.error('Error fetching available slots:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid query parameters',
        details: error.errors
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch available slots'
    });
  }
});

// GET /api/bookings/student/:studentId/monthly-check - Check if student has monthly booking
router.get('/student/:studentId/monthly-check', authenticate, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { date } = req.query;
    const user = req.user!;

    // Role-based access control
    if (user.role === 'STUDENT' && studentId !== user.userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Students can only check their own monthly bookings'
      });
    }

    const checkDate = date ? new Date(date as string) : new Date();
    const hasMonthlyBooking = await checkMonthlyDuplicateBooking(studentId, checkDate);

    if (hasMonthlyBooking) {
      // Get the existing booking details
      const startOfMonth = new Date(checkDate.getFullYear(), checkDate.getMonth(), 1);
      const endOfMonth = new Date(checkDate.getFullYear(), checkDate.getMonth() + 1, 0);

      const existingBooking = await prisma.booking.findFirst({
        where: {
          studentId,
          status: { in: ['CONFIRMED', 'COMPLETED'] },
          slot: {
            date: {
              gte: startOfMonth,
              lte: endOfMonth
            }
          }
        },
        include: {
          slot: {
            include: {
              branch: { select: { name: true } },
              teacher: { select: { name: true } }
            }
          }
        }
      });

      res.json({
        hasMonthlyBooking: true,
        existingBooking: existingBooking ? {
          id: existingBooking.id,
          date: existingBooking.slot.date,
          startTime: existingBooking.slot.startTime,
          endTime: existingBooking.slot.endTime,
          branch: existingBooking.slot.branch.name,
          teacher: existingBooking.slot.teacher.name,
          status: existingBooking.status
        } : null
      });
    } else {
      res.json({
        hasMonthlyBooking: false,
        existingBooking: null
      });
    }

  } catch (error) {
    console.error('Error checking monthly booking:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to check monthly booking'
    });
  }
});

export default router;