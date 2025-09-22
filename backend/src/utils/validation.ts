import { z } from 'zod';
import { UserRole, BookingStatus, NotificationType } from '@prisma/client';

// Custom validation helpers
const phoneRegex = /^\+8801[3-9]\d{8}$/;
const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const cuidRegex = /^[a-z0-9]{25}$/;

// User validation schemas
export const createUserSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s.'-]+$/, 'Name can only contain letters, spaces, dots, apostrophes, and hyphens'),
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters')
    .optional(),
  phoneNumber: z.string()
    .regex(phoneRegex, 'Invalid Bangladesh phone number format (+8801XXXXXXXXX)')
    .optional(),
  role: z.nativeEnum(UserRole, { 
    errorMap: () => ({ message: 'Invalid user role' }) 
  }),
  branchId: z.string()
    .regex(cuidRegex, 'Invalid branch ID format')
    .optional(),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number')
    .optional(),
}).refine((data) => {
  // Students must have phone number, staff must have email and password
  if (data.role === UserRole.STUDENT) {
    return !!data.phoneNumber;
  }
  return !!data.email && !!data.password;
}, {
  message: 'Students must have phone number, staff must have email and password',
  path: ['role'],
}).refine((data) => {
  // Branch admins and teachers must have a branch
  if (data.role === UserRole.BRANCH_ADMIN || data.role === UserRole.TEACHER) {
    return !!data.branchId;
  }
  return true;
}, {
  message: 'Branch administrators and teachers must be assigned to a branch',
  path: ['branchId'],
});

export const updateUserSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s.'-]+$/, 'Name can only contain letters, spaces, dots, apostrophes, and hyphens')
    .optional(),
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters')
    .optional(),
  phoneNumber: z.string()
    .regex(phoneRegex, 'Invalid Bangladesh phone number format (+8801XXXXXXXXX)')
    .optional(),
  role: z.nativeEnum(UserRole, { 
    errorMap: () => ({ message: 'Invalid user role' }) 
  }).optional(),
  branchId: z.string()
    .regex(cuidRegex, 'Invalid branch ID format')
    .optional(),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number')
    .optional(),
  isActive: z.boolean().optional(),
});

export const loginSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters')
    .optional(),
  phoneNumber: z.string()
    .regex(phoneRegex, 'Invalid phone number format (+8801XXXXXXXXX)')
    .optional(),
  password: z.string()
    .min(1, 'Password is required')
    .max(128, 'Password must be less than 128 characters')
    .optional(),
  otp: z.string()
    .length(6, 'OTP must be exactly 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain only numbers')
    .optional(),
}).refine((data) => {
  // Either email+password or phoneNumber+otp
  return (data.email && data.password) || (data.phoneNumber && data.otp);
}, {
  message: 'Either email+password or phoneNumber+otp is required',
  path: ['email', 'phoneNumber'],
});

// Branch validation schemas
export const createBranchSchema = z.object({
  name: z.string()
    .min(2, 'Branch name must be at least 2 characters')
    .max(100, 'Branch name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-.,()]+$/, 'Branch name contains invalid characters'),
  address: z.string()
    .min(5, 'Address must be at least 5 characters')
    .max(500, 'Address must be less than 500 characters'),
  contactNumber: z.string()
    .regex(phoneRegex, 'Invalid phone number format (+8801XXXXXXXXX)'),
});

export const updateBranchSchema = createBranchSchema.partial();

// Slot validation schemas
export const createSlotSchema = z.object({
  branchId: z.string()
    .regex(cuidRegex, 'Invalid branch ID format'),
  teacherId: z.string()
    .regex(cuidRegex, 'Invalid teacher ID format'),
  date: z.string()
    .regex(dateRegex, 'Date must be in YYYY-MM-DD format')
    .refine((date) => {
      const slotDate = new Date(date);
      return !isNaN(slotDate.getTime());
    }, 'Invalid date'),
  startTime: z.string()
    .regex(timeRegex, 'Start time must be in HH:MM format (24-hour)'),
  endTime: z.string()
    .regex(timeRegex, 'End time must be in HH:MM format (24-hour)'),
  capacity: z.number()
    .int('Capacity must be a whole number')
    .min(1, 'Capacity must be at least 1')
    .max(10, 'Capacity cannot exceed 10 students per slot')
    .default(1),
}).refine((data) => {
  // Validate that start time is before end time
  const [startHour, startMin] = data.startTime.split(':').map(Number);
  const [endHour, endMin] = data.endTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  return startMinutes < endMinutes;
}, {
  message: 'Start time must be before end time',
  path: ['endTime'],
}).refine((data) => {
  // Validate minimum slot duration (15 minutes)
  const [startHour, startMin] = data.startTime.split(':').map(Number);
  const [endHour, endMin] = data.endTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  return (endMinutes - startMinutes) >= 15;
}, {
  message: 'Slot duration must be at least 15 minutes',
  path: ['endTime'],
}).refine((data) => {
  // Validate maximum slot duration (2 hours)
  const [startHour, startMin] = data.startTime.split(':').map(Number);
  const [endHour, endMin] = data.endTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  return (endMinutes - startMinutes) <= 120;
}, {
  message: 'Slot duration cannot exceed 2 hours',
  path: ['endTime'],
}).refine((data) => {
  // Validate that date is not in the past
  const slotDate = new Date(data.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return slotDate >= today;
}, {
  message: 'Cannot create slots for past dates',
  path: ['date'],
}).refine((data) => {
  // Validate that date is not too far in the future (6 months)
  const slotDate = new Date(data.date);
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 6);
  return slotDate <= maxDate;
}, {
  message: 'Cannot create slots more than 6 months in advance',
  path: ['date'],
});

export const updateSlotSchema = z.object({
  branchId: z.string().cuid('Invalid branch ID').optional(),
  teacherId: z.string().cuid('Invalid teacher ID').optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format').optional(),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format').optional(),
  capacity: z.number().int().min(1, 'Capacity must be at least 1').optional(),
});

// Booking validation schemas
export const createBookingSchema = z.object({
  studentId: z.string()
    .regex(cuidRegex, 'Invalid student ID format')
    .optional(), // Optional for admin bookings
  slotId: z.string()
    .regex(cuidRegex, 'Invalid slot ID format'),
  studentPhoneNumber: z.string()
    .regex(phoneRegex, 'Invalid phone number format (+8801XXXXXXXXX)')
    .optional(), // For admin bookings
}).refine((data) => {
  // Either studentId or studentPhoneNumber must be provided
  return data.studentId || data.studentPhoneNumber;
}, {
  message: 'Either student ID or phone number must be provided',
  path: ['studentId'],
});

export const updateBookingSchema = z.object({
  status: z.nativeEnum(BookingStatus, {
    errorMap: () => ({ message: 'Invalid booking status' })
  }).optional(),
  attended: z.boolean().optional(),
  cancellationReason: z.string()
    .min(5, 'Cancellation reason must be at least 5 characters')
    .max(500, 'Cancellation reason must be less than 500 characters')
    .optional(),
});

export const rescheduleBookingSchema = z.object({
  newSlotId: z.string()
    .regex(cuidRegex, 'Invalid slot ID format'),
});

export const cancelBookingSchema = z.object({
  cancellationReason: z.string()
    .min(5, 'Cancellation reason must be at least 5 characters')
    .max(500, 'Cancellation reason must be less than 500 characters')
    .optional(),
  adminOverride: z.boolean()
    .default(false)
    .optional(),
});

// Assessment validation schemas
export const createAssessmentSchema = z.object({
  bookingId: z.string()
    .regex(cuidRegex, 'Invalid booking ID format'),
  score: z.number()
    .min(0, 'Score must be at least 0')
    .max(9, 'Score must be at most 9')
    .multipleOf(0.5, 'Score must be in 0.5 increments (e.g., 6.0, 6.5, 7.0)')
    .refine((score) => {
      // Ensure score is a valid IELTS score
      const validScores = [];
      for (let i = 0; i <= 9; i += 0.5) {
        validScores.push(Number(i.toFixed(1)));
      }
      return validScores.includes(Number(score.toFixed(1)));
    }, 'Invalid IELTS score format'),
  remarks: z.string()
    .max(2000, 'Remarks must be less than 2000 characters')
    .optional()
    .transform((val) => val?.trim()),
});

export const updateAssessmentSchema = createAssessmentSchema.partial().omit({ bookingId: true });

// Notification validation schemas
export const createNotificationSchema = z.object({
  userId: z.string().cuid('Invalid user ID'),
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  message: z.string().min(1, 'Message is required').max(500, 'Message must be less than 500 characters'),
  type: z.nativeEnum(NotificationType),
});

// System setting validation schemas
export const updateSystemSettingSchema = z.object({
  key: z.string().min(1, 'Key is required'),
  value: z.string().min(1, 'Value is required'),
  description: z.string().max(200, 'Description must be less than 200 characters').optional(),
});

// Query parameter validation schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const slotFiltersSchema = z.object({
  branchId: z.string().cuid().optional(),
  teacherId: z.string().cuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const bookingFiltersSchema = z.object({
  studentId: z.string().cuid().optional(),
  slotId: z.string().cuid().optional(),
  status: z.nativeEnum(BookingStatus).optional(),
  branchId: z.string().cuid().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// OTP validation
export const otpRequestSchema = z.object({
  phoneNumber: z.string()
    .regex(phoneRegex, 'Invalid Bangladesh phone number format (+8801XXXXXXXXX)'),
});

export const otpVerificationSchema = z.object({
  phoneNumber: z.string()
    .regex(phoneRegex, 'Invalid phone number format (+8801XXXXXXXXX)'),
  otp: z.string()
    .length(6, 'OTP must be exactly 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain only numbers'),
});

// Import validation schemas
export const bulkImportSchema = z.object({
  branchId: z.string().cuid('Invalid branch ID').optional(),
});

export const userFiltersSchema = z.object({
  branchId: z.string().cuid().optional(),
  role: z.nativeEnum(UserRole).optional(),
  search: z.string().optional(),
  isActive: z.boolean().optional(),
});

// Parameter validation schemas
export const idParamSchema = z.object({
  id: z.string()
    .regex(cuidRegex, 'Invalid ID format'),
});

export const phoneParamSchema = z.object({
  phoneNumber: z.string()
    .regex(phoneRegex, 'Invalid phone number format (+8801XXXXXXXXX)'),
});

// Enhanced query schemas with better validation
export const enhancedPaginationSchema = z.object({
  page: z.coerce.number()
    .int('Page must be a whole number')
    .min(1, 'Page must be at least 1')
    .max(1000, 'Page cannot exceed 1000')
    .default(1),
  limit: z.coerce.number()
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(10),
  sortBy: z.string()
    .max(50, 'Sort field name too long')
    .regex(/^[a-zA-Z_][a-zA-Z0-9_.]*$/, 'Invalid sort field format')
    .optional(),
  sortOrder: z.enum(['asc', 'desc'], {
    errorMap: () => ({ message: 'Sort order must be "asc" or "desc"' })
  }).default('desc'),
});

export const enhancedSlotFiltersSchema = z.object({
  branchId: z.string()
    .regex(cuidRegex, 'Invalid branch ID format')
    .optional(),
  teacherId: z.string()
    .regex(cuidRegex, 'Invalid teacher ID format')
    .optional(),
  date: z.string()
    .regex(dateRegex, 'Date must be in YYYY-MM-DD format')
    .refine((date) => {
      const d = new Date(date);
      return !isNaN(d.getTime());
    }, 'Invalid date')
    .optional(),
  startDate: z.string()
    .regex(dateRegex, 'Start date must be in YYYY-MM-DD format')
    .refine((date) => {
      const d = new Date(date);
      return !isNaN(d.getTime());
    }, 'Invalid start date')
    .optional(),
  endDate: z.string()
    .regex(dateRegex, 'End date must be in YYYY-MM-DD format')
    .refine((date) => {
      const d = new Date(date);
      return !isNaN(d.getTime());
    }, 'Invalid end date')
    .optional(),
}).refine((data) => {
  // Validate date range
  if (data.startDate && data.endDate) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    return start <= end;
  }
  return true;
}, {
  message: 'Start date must be before or equal to end date',
  path: ['endDate'],
}).refine((data) => {
  // Validate date range is not too large (max 1 year)
  if (data.startDate && data.endDate) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 365;
  }
  return true;
}, {
  message: 'Date range cannot exceed 1 year',
  path: ['endDate'],
});

export const enhancedBookingFiltersSchema = z.object({
  branchId: z.string()
    .regex(cuidRegex, 'Invalid branch ID format')
    .optional(),
  teacherId: z.string()
    .regex(cuidRegex, 'Invalid teacher ID format')
    .optional(),
  date: z.string()
    .regex(dateRegex, 'Date must be in YYYY-MM-DD format')
    .refine((date) => {
      const d = new Date(date);
      return !isNaN(d.getTime());
    }, 'Invalid date')
    .optional(),
  startDate: z.string()
    .regex(dateRegex, 'Start date must be in YYYY-MM-DD format')
    .refine((date) => {
      const d = new Date(date);
      return !isNaN(d.getTime());
    }, 'Invalid start date')
    .optional(),
  endDate: z.string()
    .regex(dateRegex, 'End date must be in YYYY-MM-DD format')
    .refine((date) => {
      const d = new Date(date);
      return !isNaN(d.getTime());
    }, 'Invalid end date')
    .optional(),
  studentId: z.string()
    .regex(cuidRegex, 'Invalid student ID format')
    .optional(),
  slotId: z.string()
    .regex(cuidRegex, 'Invalid slot ID format')
    .optional(),
  status: z.nativeEnum(BookingStatus, {
    errorMap: () => ({ message: 'Invalid booking status' })
  }).optional(),
  attended: z.string()
    .transform((val) => {
      if (val === 'true') return true;
      if (val === 'false') return false;
      return undefined;
    })
    .optional(),
}).refine((data) => {
  // Validate date range
  if (data.startDate && data.endDate) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    return start <= end;
  }
  return true;
}, {
  message: 'Start date must be before or equal to end date',
  path: ['endDate'],
}).refine((data) => {
  // Validate date range is not too large (max 1 year)
  if (data.startDate && data.endDate) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 365;
  }
  return true;
}, {
  message: 'Date range cannot exceed 1 year',
  path: ['endDate'],
});

export const enhancedUserFiltersSchema = z.object({
  branchId: z.string()
    .regex(cuidRegex, 'Invalid branch ID format')
    .optional(),
  role: z.nativeEnum(UserRole, {
    errorMap: () => ({ message: 'Invalid user role' })
  }).optional(),
  search: z.string()
    .max(100, 'Search term too long')
    .regex(/^[a-zA-Z0-9\s@.+_-]*$/, 'Search contains invalid characters')
    .optional(),
  isActive: z.string()
    .transform((val) => {
      if (val === 'true') return true;
      if (val === 'false') return false;
      return undefined;
    })
    .optional(),
});

// Validation helper function
export const validateRequest = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }
  return result.data;
};