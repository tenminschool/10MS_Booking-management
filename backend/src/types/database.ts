// Import Supabase types
import type { 
  User, 
  Branch, 
  Slot, 
  Booking, 
  Assessment, 
  Notification, 
  WaitingList 
} from '../lib/supabase';

// Re-export Supabase types
export {
  User,
  Branch,
  Slot,
  Booking,
  Assessment,
  Notification,
  WaitingList
};

// Define enums for type safety
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  BRANCH_ADMIN = 'BRANCH_ADMIN',
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT'
}

export enum BookingStatus {
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW'
}

export enum NotificationType {
  BOOKING_CONFIRMED = 'BOOKING_CONFIRMED',
  BOOKING_REMINDER = 'BOOKING_REMINDER',
  BOOKING_CANCELLED = 'BOOKING_CANCELLED',
  SYSTEM_ALERT = 'SYSTEM_ALERT',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  REMINDER = 'REMINDER',
  URGENT = 'URGENT',
  MAINTENANCE = 'MAINTENANCE'
}

export interface AuditLog {
  id: string;
  userId: string;
  entityType: string;
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  description?: string;
  updatedAt: string;
}

// Service Types Enums
export enum ServiceCategory {
  PAID = 'paid',
  FREE = 'free'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FREE = 'free'
}

export enum RoomType {
  GENERAL = 'general',
  COMPUTER_LAB = 'computer_lab',
  COUNSELLING = 'counselling',
  EXAM_HALL = 'exam_hall'
}

// Service Types Interfaces
export interface ServiceType {
  id: string;
  name: string;
  code: string;
  description?: string;
  category: ServiceCategory;
  defaultCapacity: number;
  durationMinutes: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServicePricing {
  id: string;
  serviceTypeId: string;
  branchId?: string;
  price: number;
  currency: string;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
}

export interface Room {
  id: string;
  branchId: string;
  roomNumber: string;
  roomName: string;
  roomType: RoomType;
  capacity: number;
  equipment: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Extended types with relations
export interface UserWithBranch extends User {
  branch?: Branch | null;
}

export interface SlotWithRelations extends Slot {
  branch: Branch;
  teacher: User;
  bookings: Booking[];
  _count?: {
    bookings: number;
  };
}

export interface BookingWithRelations extends Booking {
  student: User;
  slot: SlotWithRelations;
  assessments?: Assessment[];
}

export interface AssessmentWithRelations extends Assessment {
  booking: BookingWithRelations;
  student: User;
  teacher: User;
}

export interface NotificationWithUser extends Notification {
  user: User;
}

export interface AuditLogWithUser extends AuditLog {
  user: User;
}

// API Request/Response types
export interface CreateUserRequest {
  name: string;
  email?: string;
  phoneNumber?: string;
  role: UserRole;
  branchId?: string;
  password?: string;
}

export interface CreateSlotRequest {
  branchId: string;
  teacherId: string;
  serviceTypeId: string; // NEW: Required service type
  roomId?: string; // NEW: Optional room assignment
  date: string; // ISO date string
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  capacity?: number;
  price?: number; // NEW: Slot-specific pricing override
}

export interface CreateBookingRequest {
  studentId: string;
  slotId: string;
  serviceTypeId: string; // NEW: Required service type
  paymentStatus?: PaymentStatus; // NEW: Payment status
  amountPaid?: number; // NEW: Amount paid
}

export interface CreateAssessmentRequest {
  bookingId: string;
  score: number; // 0-9 with 0.5 increments
  remarks?: string;
}

// NEW: Service Types Request Interfaces
export interface CreateServiceTypeRequest {
  name: string;
  code: string;
  description?: string;
  category: ServiceCategory;
  defaultCapacity: number;
  durationMinutes: number;
}

export interface UpdateServiceTypeRequest {
  name?: string;
  code?: string;
  description?: string;
  category?: ServiceCategory;
  defaultCapacity?: number;
  durationMinutes?: number;
  isActive?: boolean;
}

export interface CreateServicePricingRequest {
  serviceTypeId: string;
  branchId?: string;
  price: number;
  currency?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface CreateRoomRequest {
  branchId: string;
  roomNumber: string;
  roomName: string;
  roomType?: RoomType;
  capacity: number;
  equipment?: string[];
}

export interface UpdateRoomRequest {
  roomNumber?: string;
  roomName?: string;
  roomType?: RoomType;
  capacity?: number;
  equipment?: string[];
  isActive?: boolean;
}

export interface CreateNotificationRequest {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
}

export interface CreateAuditLogRequest {
  userId: string;
  entityType: string;
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
}

export interface UpdateSystemSettingRequest {
  key: string;
  value: string;
  description?: string;
}

// Filter types
export interface SlotFilters {
  branchId?: string;
  teacherId?: string;
  serviceTypeId?: string; // NEW: Filter by service type
  serviceCategory?: ServiceCategory; // NEW: Filter by paid/free
  roomId?: string; // NEW: Filter by room
  date?: string;
  startDate?: string;
  endDate?: string;
}

export interface BookingFilters {
  studentId?: string;
  slotId?: string;
  status?: BookingStatus;
  branchId?: string;
  serviceTypeId?: string; // NEW: Filter by service type
  serviceCategory?: ServiceCategory; // NEW: Filter by paid/free
  paymentStatus?: PaymentStatus; // NEW: Filter by payment status
  startDate?: string;
  endDate?: string;
}

export interface AuditLogFilters {
  userId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
}

// Dashboard metrics types
export interface DashboardMetrics {
  totalBookings: number;
  totalStudents: number;
  totalTeachers: number;
  attendanceRate: number;
  utilizationRate: number;
  noShowRate: number;
  branchBreakdown?: BranchMetrics[];
}

export interface BranchMetrics {
  branchId: string;
  branchName: string;
  totalBookings: number;
  attendanceRate: number;
  utilizationRate: number;
  noShowRate: number;
}

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}