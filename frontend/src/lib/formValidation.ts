import { z } from 'zod';

// Custom validation helpers
const phoneRegex = /^\+8801[3-9]\d{8}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

// Common validation schemas for frontend forms
export const loginFormSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(255, 'Email must be less than 255 characters'),
  password: z.string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password must be less than 128 characters'),
});

export const studentLoginFormSchema = z.object({
  phoneNumber: z.string()
    .min(1, 'Phone number is required')
    .regex(phoneRegex, 'Please enter a valid Bangladesh phone number (+8801XXXXXXXXX)'),
  otp: z.string()
    .min(1, 'OTP is required')
    .length(6, 'OTP must be exactly 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain only numbers'),
});

export const otpRequestFormSchema = z.object({
  phoneNumber: z.string()
    .min(1, 'Phone number is required')
    .regex(phoneRegex, 'Please enter a valid Bangladesh phone number (+8801XXXXXXXXX)'),
});

export const createUserFormSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s.'-]+$/, 'Name can only contain letters, spaces, dots, apostrophes, and hyphens'),
  email: z.string()
    .email('Please enter a valid email address')
    .max(255, 'Email must be less than 255 characters')
    .optional()
    .or(z.literal('')),
  phoneNumber: z.string()
    .regex(phoneRegex, 'Please enter a valid Bangladesh phone number (+8801XXXXXXXXX)')
    .optional()
    .or(z.literal('')),
  role: z.enum(['SUPER_ADMIN', 'BRANCH_ADMIN', 'TEACHER', 'STUDENT'], {
    errorMap: () => ({ message: 'Please select a valid role' })
  }),
  branchId: z.string()
    .min(1, 'Branch is required')
    .optional()
    .or(z.literal('')),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number')
    .optional()
    .or(z.literal('')),
}).refine((data) => {
  // Students must have phone number, staff must have email and password
  if (data.role === 'STUDENT') {
    return !!data.phoneNumber;
  }
  return !!data.email && !!data.password;
}, {
  message: 'Students must have phone number, staff must have email and password',
  path: ['phoneNumber'],
}).refine((data) => {
  // Branch admins and teachers must have a branch
  if (['BRANCH_ADMIN', 'TEACHER'].includes(data.role)) {
    return !!data.branchId;
  }
  return true;
}, {
  message: 'Branch administrators and teachers must be assigned to a branch',
  path: ['branchId'],
});

export const updateUserFormSchema = createUserFormSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const createBranchFormSchema = z.object({
  name: z.string()
    .min(1, 'Branch name is required')
    .min(2, 'Branch name must be at least 2 characters')
    .max(100, 'Branch name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-.,()]+$/, 'Branch name contains invalid characters'),
  address: z.string()
    .min(1, 'Address is required')
    .min(5, 'Address must be at least 5 characters')
    .max(500, 'Address must be less than 500 characters'),
  contactNumber: z.string()
    .min(1, 'Contact number is required')
    .regex(phoneRegex, 'Please enter a valid Bangladesh phone number (+8801XXXXXXXXX)'),
});

export const updateBranchFormSchema = createBranchFormSchema.partial();

export const createSlotFormSchema = z.object({
  branchId: z.string()
    .min(1, 'Branch is required'),
  teacherId: z.string()
    .min(1, 'Teacher is required'),
  date: z.string()
    .min(1, 'Date is required')
    .regex(dateRegex, 'Please enter a valid date (YYYY-MM-DD)')
    .refine((date) => {
      const slotDate = new Date(date);
      return !isNaN(slotDate.getTime());
    }, 'Please enter a valid date')
    .refine((date) => {
      const slotDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return slotDate >= today;
    }, 'Cannot create slots for past dates')
    .refine((date) => {
      const slotDate = new Date(date);
      const maxDate = new Date();
      maxDate.setMonth(maxDate.getMonth() + 6);
      return slotDate <= maxDate;
    }, 'Cannot create slots more than 6 months in advance'),
  startTime: z.string()
    .min(1, 'Start time is required')
    .regex(timeRegex, 'Please enter a valid time (HH:MM)'),
  endTime: z.string()
    .min(1, 'End time is required')
    .regex(timeRegex, 'Please enter a valid time (HH:MM)'),
  capacity: z.coerce.number()
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
});

export const updateSlotFormSchema = createSlotFormSchema.partial();

export const createBookingFormSchema = z.object({
  slotId: z.string()
    .min(1, 'Please select a slot'),
  studentPhoneNumber: z.string()
    .regex(phoneRegex, 'Please enter a valid Bangladesh phone number (+8801XXXXXXXXX)')
    .optional(),
});

export const rescheduleBookingFormSchema = z.object({
  newSlotId: z.string()
    .min(1, 'Please select a new slot'),
});

export const cancelBookingFormSchema = z.object({
  cancellationReason: z.string()
    .min(5, 'Cancellation reason must be at least 5 characters')
    .max(500, 'Cancellation reason must be less than 500 characters')
    .optional(),
});

export const createAssessmentFormSchema = z.object({
  bookingId: z.string()
    .min(1, 'Booking ID is required'),
  score: z.coerce.number()
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
    }, 'Please enter a valid IELTS score (0.0 to 9.0 in 0.5 increments)'),
  remarks: z.string()
    .max(2000, 'Remarks must be less than 2000 characters')
    .optional(),
});

export const updateAssessmentFormSchema = createAssessmentFormSchema.omit({ bookingId: true });

export const bulkImportFormSchema = z.object({
  file: z.instanceof(File, { message: 'Please select a file' })
    .refine((file) => {
      const allowedTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      return allowedTypes.includes(file.type);
    }, 'Please select a CSV or Excel file')
    .refine((file) => {
      const maxSize = 5 * 1024 * 1024; // 5MB
      return file.size <= maxSize;
    }, 'File size must be less than 5MB'),
  branchId: z.string()
    .min(1, 'Branch is required'),
});

// Filter form schemas
export const slotFiltersFormSchema = z.object({
  branchId: z.string().optional(),
  teacherId: z.string().optional(),
  date: z.string()
    .regex(dateRegex, 'Please enter a valid date (YYYY-MM-DD)')
    .optional()
    .or(z.literal('')),
  startDate: z.string()
    .regex(dateRegex, 'Please enter a valid start date (YYYY-MM-DD)')
    .optional()
    .or(z.literal('')),
  endDate: z.string()
    .regex(dateRegex, 'Please enter a valid end date (YYYY-MM-DD)')
    .optional()
    .or(z.literal('')),
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
});

export const bookingFiltersFormSchema = slotFiltersFormSchema.extend({
  studentId: z.string().optional(),
  status: z.enum(['CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW']).optional(),
  attended: z.enum(['true', 'false']).optional(),
});

export const userFiltersFormSchema = z.object({
  branchId: z.string().optional(),
  role: z.enum(['SUPER_ADMIN', 'BRANCH_ADMIN', 'TEACHER', 'STUDENT']).optional(),
  search: z.string()
    .max(100, 'Search term too long')
    .regex(/^[a-zA-Z0-9\s@.+_-]*$/, 'Search contains invalid characters')
    .optional()
    .or(z.literal('')),
  isActive: z.enum(['true', 'false']).optional(),
});

// System settings form schema
export const systemSettingsFormSchema = z.object({
  cancellationHours: z.coerce.number()
    .int('Must be a whole number')
    .min(1, 'Must be at least 1 hour')
    .max(168, 'Cannot exceed 1 week (168 hours)'),
  maxBookingsPerMonth: z.coerce.number()
    .int('Must be a whole number')
    .min(1, 'Must be at least 1')
    .max(10, 'Cannot exceed 10 bookings per month'),
  slotCapacityLimit: z.coerce.number()
    .int('Must be a whole number')
    .min(1, 'Must be at least 1')
    .max(20, 'Cannot exceed 20 students per slot'),
  reminderHours: z.coerce.number()
    .int('Must be a whole number')
    .min(1, 'Must be at least 1 hour')
    .max(72, 'Cannot exceed 3 days (72 hours)'),
  enableSmsNotifications: z.boolean(),
  enableEmailNotifications: z.boolean(),
  enableInAppNotifications: z.boolean(),
});

// Type exports for form data
export type LoginFormData = z.infer<typeof loginFormSchema>;
export type StudentLoginFormData = z.infer<typeof studentLoginFormSchema>;
export type OtpRequestFormData = z.infer<typeof otpRequestFormSchema>;
export type CreateUserFormData = z.infer<typeof createUserFormSchema>;
export type UpdateUserFormData = z.infer<typeof updateUserFormSchema>;
export type CreateBranchFormData = z.infer<typeof createBranchFormSchema>;
export type UpdateBranchFormData = z.infer<typeof updateBranchFormSchema>;
export type CreateSlotFormData = z.infer<typeof createSlotFormSchema>;
export type UpdateSlotFormData = z.infer<typeof updateSlotFormSchema>;
export type CreateBookingFormData = z.infer<typeof createBookingFormSchema>;
export type RescheduleBookingFormData = z.infer<typeof rescheduleBookingFormSchema>;
export type CancelBookingFormData = z.infer<typeof cancelBookingFormSchema>;
export type CreateAssessmentFormData = z.infer<typeof createAssessmentFormSchema>;
export type UpdateAssessmentFormData = z.infer<typeof updateAssessmentFormSchema>;
export type BulkImportFormData = z.infer<typeof bulkImportFormSchema>;
export type SlotFiltersFormData = z.infer<typeof slotFiltersFormSchema>;
export type BookingFiltersFormData = z.infer<typeof bookingFiltersFormSchema>;
export type UserFiltersFormData = z.infer<typeof userFiltersFormSchema>;
export type SystemSettingsFormData = z.infer<typeof systemSettingsFormSchema>;