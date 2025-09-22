import express from 'express';
import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { auditLog, captureOldValues } from '../middleware/audit';
import { schedulerService } from '../services/scheduler';
import { BookingStatus } from '@prisma/client';
import { 
  asyncHandler, 
  businessRules, 
  NotFoundError, 
  AuthorizationError,
  BusinessRuleError 
} from '../middleware/errorHandler';
import { 
  validateBody, 
  validateQuery, 
  validateParams
} from '../middleware/validation';
import { 
  createBookingSchema, 
  rescheduleBookingSchema, 
  cancelBookingSchema,
  updateBookingSchema,
  enhancedBookingFiltersSchema,
  bookingFiltersSchema,
  idParamSchema
} from '../utils/validation';

const router = express.Router();

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
      gte: new Date(filters.startDate as string),
      lte: new Date(filters.endDate as string)
    };
  } else if (filters.startDate) {
    whereClause.date = { gte: new Date(filters.startDate as string) };
  } else if (filters.endDate) {
    whereClause.date = { lte: new Date(filters.endDate as string) };
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
router.get('/', authenticate, validateQuery(enhancedBookingFiltersSchema), asyncHandler(async (req: Request, res: Response) => {
  const filters = req.query;
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
      if (filters.startDate) dateFilter.gte = new Date(filters.startDate as string);
      if (filters.endDate) dateFilter.lte = new Date(filters.endDate as string);
      
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
}));

// GET /api/bookings/:id - Get single booking
router.get('/:id', authenticate, validateParams(idParamSchema), asyncHandler(async (req: Request, res: Response) => {
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
    throw new NotFoundError('Booking not found or access denied');
  }

  res.json(booking);
}));

// POST /api/bookings - Create new booking
router.post('/', authenticate, validateBody(createBookingSchema), auditLog('booking'), asyncHandler(async (req: Request, res: Response) => {
  const data = req.body;
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
        throw new NotFoundError('Student not found with provided phone number');
      }

      studentId = student.id;
    } else {
      throw new BusinessRuleError('Student phone number is required for admin bookings', 'MISSING_STUDENT_INFO');
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
      throw new NotFoundError('Slot not found');
    }

    // Business rule validations
    businessRules.validateSlotNotInPast(slot.date, slot.startTime);
    businessRules.validateSlotCapacity(slot.bookings.length, slot.capacity);

    // Check for duplicate booking in the same slot
    const existingSlotBooking = await prisma.booking.findFirst({
      where: {
        studentId,
        slotId: data.slotId,
        status: { in: ['CONFIRMED', 'COMPLETED'] }
      }
    });

    businessRules.validateNoDuplicateBooking(!!existingSlotBooking, 'this slot');

    // Check for monthly duplicate booking across all branches
    const hasMonthlyBooking = await checkMonthlyDuplicateBooking(studentId, slot.date);
    businessRules.validateMonthlyLimit(hasMonthlyBooking);

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
}));

// PUT /api/bookings/:id/cancel - Cancel booking
router.put('/:id/cancel', authenticate, validateParams(idParamSchema), validateBody(cancelBookingSchema), captureOldValues('booking'), auditLog('booking'), asyncHandler(async (req: Request, res: Response) => {
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
      throw new NotFoundError('Booking not found');
    }

    // Role-based access control
    if (user.role === 'STUDENT' && booking.studentId !== user.userId) {
      throw new AuthorizationError('Students can only cancel their own bookings');
    } else if (user.role === 'TEACHER' && booking.slot.teacherId !== user.userId) {
      throw new AuthorizationError('Teachers can only cancel bookings for their own slots');
    } else if (user.role === 'BRANCH_ADMIN' && booking.slot.branchId !== user.branchId) {
      throw new AuthorizationError('Branch administrators can only cancel bookings within their branch');
    }

    // Validate booking status
    businessRules.validateBookingStatus(booking.status, ['CONFIRMED'], 'cancel');

    // Check 24-hour cancellation rule for students
    if (user.role === 'STUDENT') {
      businessRules.validateCancellationTime(booking.slot.date, booking.slot.startTime);
    }
    
    const isWithin24Hours = isCancellationWithin24Hours(booking.slot.date, booking.slot.startTime);

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
}));

// PUT /api/bookings/:id/reschedule - Reschedule booking
router.put('/:id/reschedule', authenticate, validateParams(idParamSchema), validateBody(rescheduleBookingSchema), captureOldValues('booking'), auditLog('booking'), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
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
      throw new NotFoundError('Booking not found');
    }

    // Role-based access control
    if (user.role === 'STUDENT' && existingBooking.studentId !== user.userId) {
      throw new AuthorizationError('Students can only reschedule their own bookings');
    } else if (user.role === 'TEACHER' && existingBooking.slot.teacherId !== user.userId) {
      throw new AuthorizationError('Teachers can only reschedule bookings for their own slots');
    } else if (user.role === 'BRANCH_ADMIN' && existingBooking.slot.branchId !== user.branchId) {
      throw new AuthorizationError('Branch administrators can only reschedule bookings within their branch');
    }

    // Validate booking status
    businessRules.validateBookingStatus(existingBooking.status, ['CONFIRMED'], 'reschedule');

    // Check 24-hour rescheduling rule for students
    if (user.role === 'STUDENT') {
      businessRules.validateCancellationTime(existingBooking.slot.date, existingBooking.slot.startTime);
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
      throw new NotFoundError('New slot not found');
    }

    // Business rule validations for new slot
    businessRules.validateSlotNotInPast(newSlot.date, newSlot.startTime);
    businessRules.validateSlotCapacity(newSlot.bookings.length, newSlot.capacity);

    // Check for duplicate booking in the new slot
    const existingNewSlotBooking = await prisma.booking.findFirst({
      where: {
        studentId: existingBooking.studentId,
        slotId: data.newSlotId,
        status: { in: ['CONFIRMED', 'COMPLETED'] }
      }
    });

    businessRules.validateNoDuplicateBooking(!!existingNewSlotBooking, 'the new slot');

    // Check monthly duplicate booking (excluding current booking)
    const hasMonthlyBooking = await checkMonthlyDuplicateBooking(
      existingBooking.studentId, 
      newSlot.date, 
      existingBooking.id
    );
    
    businessRules.validateMonthlyLimit(hasMonthlyBooking);

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
}));

// PUT /api/bookings/:id/attendance - Mark attendance
router.put('/:id/attendance', authenticate, validateParams(idParamSchema), validateBody(updateBookingSchema), captureOldValues('booking'), auditLog('booking'), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const user = req.user!;

    // Only teachers and admins can mark attendance
    if (!['TEACHER', 'BRANCH_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      throw new AuthorizationError('Only teachers and administrators can mark attendance');
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
      throw new NotFoundError('Booking not found');
    }

    // Role-based access control
    if (user.role === 'TEACHER' && booking.slot.teacherId !== user.userId) {
      throw new AuthorizationError('Teachers can only mark attendance for their own slots');
    } else if (user.role === 'BRANCH_ADMIN' && booking.slot.branchId !== user.branchId) {
      throw new AuthorizationError('Branch administrators can only mark attendance within their branch');
    }

    // Validate booking status
    businessRules.validateBookingStatus(booking.status, ['CONFIRMED'], 'mark attendance for');

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
}));

// GET /api/bookings/available-slots - Get available slots for booking (cross-branch)
router.get('/available-slots', authenticate, validateQuery(bookingFiltersSchema), asyncHandler(async (req: Request, res: Response) => {
  const filters = req.query;

    // Students and teachers can view all available slots across branches
    // Admins can filter by branch if needed
    const availableSlots = await getAvailableSlots({
      branchId: filters.branchId as string,
      teacherId: filters.teacherId as string,
      startDate: filters.startDate as string,
      endDate: filters.endDate as string
    });

    res.json({
      slots: availableSlots,
      total: availableSlots.length,
      filters
    });
}));

// GET /api/bookings/student/:studentId/monthly-check - Check if student has monthly booking
router.get('/student/:studentId/monthly-check', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { studentId } = req.params;
  const { date } = req.query;
  const user = req.user!;

    // Role-based access control
    if (user.role === 'STUDENT' && studentId !== user.userId) {
      throw new AuthorizationError('Students can only check their own monthly bookings');
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
}));

export default router;