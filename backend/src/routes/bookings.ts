import express from 'express';
import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { auditLog, captureOldValues } from '../middleware/audit';
import { schedulerService } from '../services/scheduler';
import { notificationService } from '../services/notification';
import { BookingStatus } from '@prisma/client';
import {
  asyncHandler,
  businessRules,
  NotFoundError,
  AuthorizationError,
  BusinessRuleError,
  ValidationError
} from '../middleware/errorHandler';
import {
  validateBody,
  validateQuery,
  validateParams
} from '../middleware/validation';
import { z } from 'zod';
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

// Mock bookings data for when database is unavailable
const mockBookings = [
  {
    id: 'mock-booking-1',
    studentId: 'mock-student-1-id',
    slotId: 'mock-slot-1',
    status: 'CONFIRMED',
    bookedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    attended: null,
    slot: {
      id: 'mock-slot-1',
      date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      startTime: '14:00',
      endTime: '14:30',
      capacity: 1,
      branch: { id: 'mock-branch-1', name: 'Dhanmondi Branch' },
      teacher: { id: 'mock-teacher-1', name: 'Sarah Ahmed' }
    },
    student: { id: 'mock-student-1-id', name: 'Ahmed Rahman' }
  },
  {
    id: 'mock-booking-2',
    studentId: 'mock-student-1-id',
    slotId: 'mock-slot-2',
    status: 'COMPLETED',
    bookedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    attended: true,
    slot: {
      id: 'mock-slot-2',
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      startTime: '10:00',
      endTime: '10:30',
      capacity: 1,
      branch: { id: 'mock-branch-1', name: 'Dhanmondi Branch' },
      teacher: { id: 'mock-teacher-2', name: 'Ahmed Khan' }
    },
    student: { id: 'mock-student-1-id', name: 'Ahmed Rahman' }
  }
];

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

// GET /api/bookings/my - Get current user's bookings
router.get('/my', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;

  // Try database first, fallback to mock data
  try {
    await prisma.$queryRaw`SELECT 1`;

    const bookings = await prisma.booking.findMany({
      where: { studentId: user.userId },
      include: {
        slot: {
          include: {
            branch: { select: { id: true, name: true } },
            teacher: { select: { id: true, name: true } }
          }
        },
        student: { select: { id: true, name: true } }
      },
      orderBy: { bookedAt: 'desc' }
    });

    res.json(bookings);

  } catch (dbError) {
    console.warn('Database unavailable, using mock bookings:', dbError);
    
    // Filter mock bookings by user role
    const userBookings = user.role === 'STUDENT' 
      ? mockBookings.filter(booking => booking.studentId === user.userId)
      : mockBookings; // Admin users see all bookings

    res.json({
      bookings: userBookings,
      _mock: true,
      _message: 'Using mock data (database unavailable)'
    });
  }
}));

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

  // Check if slot is blocked
  await businessRules.validateSlotNotBlocked(data.slotId);

  // Check for duplicate booking in the same slot
  const existingSlotBooking = await prisma.booking.findFirst({
    where: {
      studentId,
      slotId: data.slotId,
      status: { in: ['CONFIRMED', 'COMPLETED'] }
    }
  });

  businessRules.validateNoDuplicateBooking(!!existingSlotBooking, 'this slot');

  // Check cross-branch booking rules
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { branchId: true }
  });

  if (student?.branchId) {
    await businessRules.validateCrossBranchBooking(student.branchId, slot.branchId);
  }

  // Check for monthly duplicate booking across all branches
  const hasMonthlyBooking = await checkMonthlyDuplicateBooking(studentId, slot.date);
  await businessRules.validateMonthlyLimit(hasMonthlyBooking, studentId);

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

// PUT /api/bookings/:id/cancel - Cancel booking with advanced handling
router.put('/:id/cancel', authenticate, validateParams(idParamSchema), validateBody(cancelBookingSchema), captureOldValues('booking'), auditLog('booking'), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { cancellationReason, adminOverride } = req.body;
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

  const isWithin24Hours = isCancellationWithin24Hours(booking.slot.date, booking.slot.startTime);

  // Check 24-hour cancellation rule for students (unless admin override)
  if (user.role === 'STUDENT' && !adminOverride) {
    businessRules.validateCancellationTime(booking.slot.date, booking.slot.startTime);
  }

  // Administrative override handling
  let overrideApplied = false;
  if (adminOverride && ['SUPER_ADMIN', 'BRANCH_ADMIN'].includes(user.role)) {
    overrideApplied = true;
    console.log(`🔧 Administrative override applied by ${user.role} for booking ${id}`);
  }

  // Determine cancellation type and slot blocking
  let slotBlocked = false;
  let cancellationType = 'Standard cancellation';

  if (isWithin24Hours && !overrideApplied) {
    slotBlocked = true;
    cancellationType = 'Late cancellation - slot blocked';
  } else if (overrideApplied) {
    cancellationType = 'Administrative override';
  }

  // Update booking status
  const updatedBooking = await prisma.booking.update({
    where: { id },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancellationReason: cancellationReason || cancellationType
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

  // Create blocked slot entry if within 24 hours
  if (slotBlocked) {
    await prisma.systemSetting.upsert({
      where: { key: `blocked_slot_${booking.slotId}` },
      update: {
        value: JSON.stringify({
          reason: 'Late cancellation',
          blockedAt: new Date(),
          blockedBy: user.userId,
          originalBookingId: booking.id
        }),
        updatedBy: user.userId
      },
      create: {
        key: `blocked_slot_${booking.slotId}`,
        value: JSON.stringify({
          reason: 'Late cancellation',
          blockedAt: new Date(),
          blockedBy: user.userId,
          originalBookingId: booking.id
        }),
        description: `Slot blocked due to late cancellation`,
        updatedBy: user.userId
      }
    });
  }

  // Send booking cancellation notification
  try {
    await schedulerService.sendBookingCancellation(
      updatedBooking.id,
      cancellationReason || cancellationType
    );
  } catch (notificationError) {
    console.error('Failed to send booking cancellation notification:', notificationError);
    // Don't fail the cancellation if notification fails
  }

  res.json({
    message: 'Booking cancelled successfully',
    booking: updatedBooking,
    slotFreed: !slotBlocked,
    slotBlocked,
    cancellationType,
    adminOverride: overrideApplied
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

// POST /api/bookings/teacher-cancel/:slotId - Teacher cancellation workflow
router.post('/teacher-cancel/:slotId', authenticate, validateParams(idParamSchema), validateBody(z.object({
  cancellationReason: z.string().min(1, 'Cancellation reason is required'),
  notifyStudents: z.boolean().default(true),
  offerPriorityRescheduling: z.boolean().default(true)
})), auditLog('teacher_cancellation'), asyncHandler(async (req: Request, res: Response) => {
  const { slotId } = req.params;
  const { cancellationReason, notifyStudents, offerPriorityRescheduling } = req.body;
  const user = req.user!;

  // Only teachers and admins can cancel slots
  if (!['TEACHER', 'BRANCH_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    throw new AuthorizationError('Only teachers and administrators can cancel slots');
  }

  // Get slot with all bookings
  const slot = await prisma.slot.findFirst({
    where: { id: slotId },
    include: {
      branch: { select: { id: true, name: true } },
      teacher: { select: { id: true, name: true } },
      bookings: {
        where: { status: 'CONFIRMED' },
        include: {
          student: {
            select: { id: true, name: true, phoneNumber: true }
          }
        }
      }
    }
  });

  if (!slot) {
    throw new NotFoundError('Slot not found');
  }

  // Role-based access control
  if (user.role === 'TEACHER' && slot.teacherId !== user.userId) {
    throw new AuthorizationError('Teachers can only cancel their own slots');
  } else if (user.role === 'BRANCH_ADMIN' && slot.branchId !== user.branchId) {
    throw new AuthorizationError('Branch administrators can only cancel slots within their branch');
  }

  const affectedBookings = slot.bookings;

  if (affectedBookings.length === 0) {
    return res.json({
      message: 'Slot cancelled successfully (no bookings affected)',
      affectedStudents: 0
    });
  }

  // Cancel all confirmed bookings for this slot
  const cancelledBookings = await prisma.booking.updateMany({
    where: {
      slotId,
      status: 'CONFIRMED'
    },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancellationReason: `Teacher cancellation: ${cancellationReason}`
    }
  });

  // Create priority rescheduling entries for affected students
  if (offerPriorityRescheduling) {
    for (const booking of affectedBookings) {
      await prisma.systemSetting.upsert({
        where: { key: `priority_reschedule_${booking.student.id}` },
        update: {
          value: JSON.stringify({
            originalSlotId: slotId,
            originalBookingId: booking.id,
            reason: 'Teacher cancellation',
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            branchId: slot.branchId
          }),
          updatedBy: user.userId
        },
        create: {
          key: `priority_reschedule_${booking.student.id}`,
          value: JSON.stringify({
            originalSlotId: slotId,
            originalBookingId: booking.id,
            reason: 'Teacher cancellation',
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            branchId: slot.branchId
          }),
          description: `Priority rescheduling for student affected by teacher cancellation`,
          updatedBy: user.userId
        }
      });
    }
  }

  // Send notifications to all affected students
  if (notifyStudents) {
    try {
      await notificationService.sendTeacherCancellationNotifications(slotId, cancellationReason);
    } catch (notificationError) {
      console.error('Failed to send teacher cancellation notifications:', notificationError);
      // Don't fail the cancellation if notifications fail
    }
  }

  res.json({
    message: 'Teacher cancellation processed successfully',
    affectedStudents: affectedBookings.length,
    cancelledBookings: cancelledBookings.count,
    priorityReschedulingOffered: offerPriorityRescheduling,
    notificationsSent: notifyStudents,
    affectedStudentIds: affectedBookings.map(b => b.student.id)
  });
}));

// GET /api/bookings/priority-slots/:studentId - Get priority rescheduling slots
router.get('/priority-slots/:studentId', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { studentId } = req.params;
  const user = req.user!;

  // Role-based access control
  if (user.role === 'STUDENT' && studentId !== user.userId) {
    throw new AuthorizationError('Students can only check their own priority slots');
  }

  // Check if student has priority rescheduling
  const prioritySetting = await prisma.systemSetting.findUnique({
    where: { key: `priority_reschedule_${studentId}` }
  });

  if (!prioritySetting) {
    return res.json({
      hasPriorityRescheduling: false,
      prioritySlots: []
    });
  }

  const priorityData = JSON.parse(prioritySetting.value);

  // Check if priority rescheduling has expired
  if (new Date() > new Date(priorityData.expiresAt)) {
    // Clean up expired priority rescheduling
    await prisma.systemSetting.delete({
      where: { key: `priority_reschedule_${studentId}` }
    });

    return res.json({
      hasPriorityRescheduling: false,
      prioritySlots: [],
      expired: true
    });
  }

  // Get available slots with priority access (cross-branch if allowed)
  const systemSettings = await prisma.systemSetting.findUnique({
    where: { key: 'system_config' }
  });

  let allowCrossBranch = true;
  if (systemSettings?.value) {
    try {
      const settings = JSON.parse(systemSettings.value);
      allowCrossBranch = settings.bookingRules?.allowCrossBranchBooking ?? true;
    } catch (error) {
      console.error('Error parsing system settings:', error);
    }
  }

  // Build slot filter
  const slotFilter: any = {
    date: { gte: new Date() } // Only future slots
  };

  if (!allowCrossBranch) {
    slotFilter.branchId = priorityData.branchId;
  }

  const availableSlots = await getAvailableSlots({
    branchId: allowCrossBranch ? undefined : priorityData.branchId,
    startDate: new Date().toISOString()
  });

  res.json({
    hasPriorityRescheduling: true,
    priorityData: {
      reason: priorityData.reason,
      expiresAt: priorityData.expiresAt,
      originalSlotId: priorityData.originalSlotId
    },
    prioritySlots: availableSlots.slice(0, 20), // Limit to 20 priority slots
    crossBranchAllowed: allowCrossBranch
  });
}));

// POST /api/bookings/priority-reschedule - Use priority rescheduling
router.post('/priority-reschedule', authenticate, validateBody(z.object({
  studentId: z.string(),
  newSlotId: z.string()
})), auditLog('priority_reschedule'), asyncHandler(async (req: Request, res: Response) => {
  const { studentId, newSlotId } = req.body;
  const user = req.user!;

  // Role-based access control
  if (user.role === 'STUDENT' && studentId !== user.userId) {
    throw new AuthorizationError('Students can only use their own priority rescheduling');
  }

  // Check priority rescheduling eligibility
  const prioritySetting = await prisma.systemSetting.findUnique({
    where: { key: `priority_reschedule_${studentId}` }
  });

  if (!prioritySetting) {
    throw new NotFoundError('No priority rescheduling available for this student');
  }

  const priorityData = JSON.parse(prioritySetting.value);

  // Check if expired
  if (new Date() > new Date(priorityData.expiresAt)) {
    await prisma.systemSetting.delete({
      where: { key: `priority_reschedule_${studentId}` }
    });
    throw new BusinessRuleError('Priority rescheduling has expired', 'PRIORITY_EXPIRED');
  }

  // Validate new slot
  const newSlot = await prisma.slot.findUnique({
    where: { id: newSlotId },
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

  // Business rule validations
  businessRules.validateSlotNotInPast(newSlot.date, newSlot.startTime);
  businessRules.validateSlotCapacity(newSlot.bookings.length, newSlot.capacity);

  // Check for duplicate booking in new slot
  const existingBooking = await prisma.booking.findFirst({
    where: {
      studentId,
      slotId: newSlotId,
      status: { in: ['CONFIRMED', 'COMPLETED'] }
    }
  });

  businessRules.validateNoDuplicateBooking(!!existingBooking, 'the new slot');

  // Create new booking
  const newBooking = await prisma.booking.create({
    data: {
      studentId,
      slotId: newSlotId,
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

  // Clean up priority rescheduling
  await prisma.systemSetting.delete({
    where: { key: `priority_reschedule_${studentId}` }
  });

  // Send confirmation notification
  try {
    await schedulerService.sendBookingConfirmation(newBooking.id);
  } catch (notificationError) {
    console.error('Failed to send priority reschedule confirmation:', notificationError);
  }

  res.json({
    message: 'Priority rescheduling completed successfully',
    booking: newBooking,
    priorityUsed: true
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

// POST /api/bookings/admin-override - Administrative override for business rules
router.post('/admin-override', authenticate, validateBody(z.object({
  action: z.enum(['force_booking', 'unblock_slot', 'bypass_monthly_limit', 'emergency_reschedule']),
  targetId: z.string(), // booking ID, slot ID, or student ID depending on action
  reason: z.string().min(1, 'Override reason is required'),
  additionalData: z.record(z.any()).optional()
})), auditLog('admin_override'), asyncHandler(async (req: Request, res: Response) => {
  const { action, targetId, reason, additionalData } = req.body;
  const user = req.user!;

  // Only super admins and branch admins can use overrides
  if (!['SUPER_ADMIN', 'BRANCH_ADMIN'].includes(user.role)) {
    throw new AuthorizationError('Administrative override requires admin privileges');
  }

  let result: any = {};

  switch (action) {
    case 'force_booking':
      // Force a booking even if it violates business rules
      const { slotId, studentId } = additionalData || {};
      if (!slotId || !studentId) {
        throw new ValidationError('slotId and studentId required for force booking');
      }

      // Get slot and validate admin access
      const slot = await prisma.slot.findUnique({
        where: { id: slotId },
        include: { branch: true, bookings: { where: { status: { in: ['CONFIRMED', 'COMPLETED'] } } } }
      });

      if (!slot) {
        throw new NotFoundError('Slot not found');
      }

      if (user.role === 'BRANCH_ADMIN' && slot.branchId !== user.branchId) {
        throw new AuthorizationError('Branch admin can only override within their branch');
      }

      // Create booking with override
      const forcedBooking = await prisma.booking.create({
        data: {
          studentId,
          slotId,
          status: 'CONFIRMED'
        },
        include: {
          student: { select: { id: true, name: true, phoneNumber: true } },
          slot: {
            include: {
              branch: { select: { id: true, name: true } },
              teacher: { select: { id: true, name: true } }
            }
          }
        }
      });

      result = { booking: forcedBooking, message: 'Booking forced successfully' };
      break;

    case 'unblock_slot':
      // Unblock a slot that was blocked due to late cancellation
      const blockKey = `blocked_slot_${targetId}`;
      const blockedSlot = await prisma.systemSetting.findUnique({
        where: { key: blockKey }
      });

      if (!blockedSlot) {
        throw new NotFoundError('Blocked slot not found');
      }

      await prisma.systemSetting.delete({
        where: { key: blockKey }
      });

      result = { message: 'Slot unblocked successfully', slotId: targetId };
      break;

    case 'bypass_monthly_limit':
      // Allow student to book even if they have monthly booking
      const bypassKey = `monthly_bypass_${targetId}`;
      await prisma.systemSetting.upsert({
        where: { key: bypassKey },
        update: {
          value: JSON.stringify({
            reason,
            grantedBy: user.userId,
            grantedAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
          }),
          updatedBy: user.userId
        },
        create: {
          key: bypassKey,
          value: JSON.stringify({
            reason,
            grantedBy: user.userId,
            grantedAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
          }),
          description: 'Monthly booking limit bypass',
          updatedBy: user.userId
        }
      });

      result = { message: 'Monthly limit bypass granted', studentId: targetId };
      break;

    case 'emergency_reschedule':
      // Emergency reschedule without normal restrictions
      const { newSlotId } = additionalData || {};
      if (!newSlotId) {
        throw new ValidationError('newSlotId required for emergency reschedule');
      }

      const originalBooking = await prisma.booking.findUnique({
        where: { id: targetId },
        include: { slot: { include: { branch: true } } }
      });

      if (!originalBooking) {
        throw new NotFoundError('Original booking not found');
      }

      if (user.role === 'BRANCH_ADMIN' && originalBooking.slot.branchId !== user.branchId) {
        throw new AuthorizationError('Branch admin can only reschedule within their branch');
      }

      const emergencyBooking = await prisma.booking.update({
        where: { id: targetId },
        data: { slotId: newSlotId },
        include: {
          student: { select: { id: true, name: true, phoneNumber: true } },
          slot: {
            include: {
              branch: { select: { id: true, name: true } },
              teacher: { select: { id: true, name: true } }
            }
          }
        }
      });

      result = { booking: emergencyBooking, message: 'Emergency reschedule completed' };
      break;

    default:
      throw new ValidationError('Invalid override action');
  }

  // Log the override action
  console.log(`🔧 Administrative override: ${action} by ${user.role} (${user.userId}) - Reason: ${reason}`);

  res.json({
    success: true,
    action,
    reason,
    overrideBy: user.userId,
    timestamp: new Date(),
    ...result
  });
}));

// GET /api/bookings/cross-branch-conflicts - Check for cross-branch booking conflicts
router.get('/cross-branch-conflicts', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { studentId, date } = req.query;
  const user = req.user!;

  // Only admins can check cross-branch conflicts
  if (!['SUPER_ADMIN', 'BRANCH_ADMIN'].includes(user.role)) {
    throw new AuthorizationError('Cross-branch conflict checking requires admin privileges');
  }

  const checkDate = date ? new Date(date as string) : new Date();

  // Get system settings for cross-branch rules
  const systemSettings = await prisma.systemSetting.findUnique({
    where: { key: 'system_config' }
  });

  let settings = {
    bookingRules: {
      allowCrossBranchBooking: true,
      maxBookingsPerMonth: 4,
      cancellationHours: 24
    }
  };

  if (systemSettings?.value) {
    try {
      settings = JSON.parse(systemSettings.value);
    } catch (error) {
      console.error('Error parsing system settings:', error);
    }
  }

  // Check for conflicts if studentId provided
  let conflicts: any[] = [];

  if (studentId) {
    // Check monthly bookings across branches
    const startOfMonth = new Date(checkDate.getFullYear(), checkDate.getMonth(), 1);
    const endOfMonth = new Date(checkDate.getFullYear(), checkDate.getMonth() + 1, 0);

    const monthlyBookings = await prisma.booking.findMany({
      where: {
        studentId: studentId as string,
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
            branch: { select: { id: true, name: true } },
            teacher: { select: { name: true } }
          }
        }
      }
    });

    if (monthlyBookings.length >= settings.bookingRules.maxBookingsPerMonth) {
      conflicts.push({
        type: 'MONTHLY_LIMIT_EXCEEDED',
        message: `Student has ${monthlyBookings.length} bookings this month (limit: ${settings.bookingRules.maxBookingsPerMonth})`,
        bookings: monthlyBookings.map(b => ({
          id: b.id,
          date: b.slot.date,
          branch: b.slot.branch.name,
          teacher: b.slot.teacher.name,
          status: b.status
        }))
      });
    }

    // Check for same-day bookings across branches
    const sameDayBookings = await prisma.booking.findMany({
      where: {
        studentId: studentId as string,
        status: { in: ['CONFIRMED', 'COMPLETED'] },
        slot: {
          date: checkDate
        }
      },
      include: {
        slot: {
          include: {
            branch: { select: { id: true, name: true } },
            teacher: { select: { name: true } }
          }
        }
      }
    });

    if (sameDayBookings.length > 0) {
      conflicts.push({
        type: 'SAME_DAY_BOOKING',
        message: `Student already has booking(s) on ${checkDate.toDateString()}`,
        bookings: sameDayBookings.map(b => ({
          id: b.id,
          time: b.slot.startTime,
          branch: b.slot.branch.name,
          teacher: b.slot.teacher.name,
          status: b.status
        }))
      });
    }
  }

  // Get system-wide conflict statistics
  const conflictStats = await prisma.booking.groupBy({
    by: ['studentId'],
    where: {
      status: { in: ['CONFIRMED', 'COMPLETED'] },
      slot: {
        date: {
          gte: new Date(checkDate.getFullYear(), checkDate.getMonth(), 1),
          lte: new Date(checkDate.getFullYear(), checkDate.getMonth() + 1, 0)
        }
      }
    },
    _count: { studentId: true },
    having: {
      studentId: {
        _count: {
          gt: settings.bookingRules.maxBookingsPerMonth
        }
      }
    }
  });

  res.json({
    settings: settings.bookingRules,
    conflicts,
    systemStats: {
      studentsExceedingLimit: conflictStats.length,
      crossBranchBookingEnabled: settings.bookingRules.allowCrossBranchBooking
    },
    checkDate,
    studentId: studentId || null
  });
}));

// GET /api/bookings/blocked-slots - Get all blocked slots
router.get('/blocked-slots', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;

  // Only admins can view blocked slots
  if (!['SUPER_ADMIN', 'BRANCH_ADMIN'].includes(user.role)) {
    throw new AuthorizationError('Viewing blocked slots requires admin privileges');
  }

  // Get all blocked slot settings
  const blockedSlotSettings = await prisma.systemSetting.findMany({
    where: {
      key: { startsWith: 'blocked_slot_' }
    }
  });

  const blockedSlots = await Promise.all(
    blockedSlotSettings.map(async (setting) => {
      const slotId = setting.key.replace('blocked_slot_', '');
      const blockData = JSON.parse(setting.value);

      // Get slot details
      const slot = await prisma.slot.findUnique({
        where: { id: slotId },
        include: {
          branch: { select: { id: true, name: true } },
          teacher: { select: { name: true } }
        }
      });

      // Get blocker user details
      const blockedBy = await prisma.user.findUnique({
        where: { id: blockData.blockedBy },
        select: { name: true, role: true }
      });

      return {
        slotId,
        slot: slot ? {
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          branch: slot.branch.name,
          teacher: slot.teacher.name
        } : null,
        blockData: {
          ...blockData,
          blockedByUser: blockedBy
        }
      };
    })
  );

  // Filter by branch for branch admins
  const filteredSlots = user.role === 'BRANCH_ADMIN'
    ? blockedSlots.filter(bs => bs.slot?.branch === user.branchId)
    : blockedSlots;

  res.json({
    blockedSlots: filteredSlots,
    total: filteredSlots.length
  });
}));

export default router;