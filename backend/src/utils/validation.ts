import { z } from 'zod';
import { UserRole, BookingStatus, NotificationType } from '@prisma/client';

// User validation schemas
export const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format').optional(),
  phoneNumber: z.string().regex(/^\+8801[3-9]\d{8}$/, 'Invalid Bangladesh phone number format').optional(),
  role: z.nativeEnum(UserRole),
  branchId: z.string().cuid('Invalid branch ID').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
}).refine((data) => {
  // Students must have phone number, staff must have email and password
  if (data.role === UserRole.STUDENT) {
    return !!data.phoneNumber;
  }
  return !!data.email && !!data.password;
}, {
  message: 'Students must have phone number, staff must have email and password',
});

export const updateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email format').optional(),
  phoneNumber: z.string().regex(/^\+8801[3-9]\d{8}$/, 'Invalid Bangladesh phone number format').optional(),
  role: z.nativeEnum(UserRole).optional(),
  branchId: z.string().cuid('Invalid branch ID').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  phoneNumber: z.string().regex(/^\+8801[3-9]\d{8}$/, 'Invalid phone number format').optional(),
  password: z.string().min(1, 'Password is required').optional(),
  otp: z.string().length(6, 'OTP must be 6 digits').optional(),
}).refine((data) => {
  // Either email+password or phoneNumber+otp
  return (data.email && data.password) || (data.phoneNumber && data.otp);
}, {
  message: 'Either email+password or phoneNumber+otp is required',
});

// Branch validation schemas
export const createBranchSchema = z.object({
  name: z.string().min(2, 'Branch name must be at least 2 characters'),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  contactNumber: z.string().regex(/^\+8801[3-9]\d{8}$/, 'Invalid phone number format'),
});

export const updateBranchSchema = createBranchSchema.partial();

// Slot validation schemas
export const createSlotSchema = z.object({
  branchId: z.string().cuid('Invalid branch ID'),
  teacherId: z.string().cuid('Invalid teacher ID'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format'),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format'),
  capacity: z.number().int().min(1, 'Capacity must be at least 1').default(1),
}).refine((data) => {
  // Validate that start time is before end time
  const [startHour, startMin] = data.startTime.split(':').map(Number);
  const [endHour, endMin] = data.endTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  return startMinutes < endMinutes;
}, {
  message: 'Start time must be before end time',
}).refine((data) => {
  // Validate that date is not in the past
  const slotDate = new Date(data.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return slotDate >= today;
}, {
  message: 'Cannot create slots for past dates',
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
  studentId: z.string().cuid('Invalid student ID'),
  slotId: z.string().cuid('Invalid slot ID'),
});

export const updateBookingSchema = z.object({
  status: z.nativeEnum(BookingStatus).optional(),
  attended: z.boolean().optional(),
  cancellationReason: z.string().min(5, 'Cancellation reason must be at least 5 characters').optional(),
});

// Assessment validation schemas
export const createAssessmentSchema = z.object({
  bookingId: z.string().cuid('Invalid booking ID'),
  score: z.number().min(0, 'Score must be at least 0').max(9, 'Score must be at most 9').multipleOf(0.5, 'Score must be in 0.5 increments'),
  remarks: z.string().max(1000, 'Remarks must be less than 1000 characters').optional(),
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
  phoneNumber: z.string().regex(/^\+8801[3-9]\d{8}$/, 'Invalid Bangladesh phone number format'),
});

export const otpVerificationSchema = z.object({
  phoneNumber: z.string().regex(/^\+8801[3-9]\d{8}$/, 'Invalid phone number format'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
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