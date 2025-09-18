import { 
  User, 
  Branch, 
  Slot, 
  Booking, 
  Assessment, 
  Notification, 
  AuditLog, 
  SystemSetting,
  UserRole,
  BookingStatus,
  NotificationType
} from '@prisma/client';

// Export Prisma types
export {
  User,
  Branch,
  Slot,
  Booking,
  Assessment,
  Notification,
  AuditLog,
  SystemSetting,
  UserRole,
  BookingStatus,
  NotificationType
};

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
  date: string; // ISO date string
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  capacity?: number;
}

export interface CreateBookingRequest {
  studentId: string;
  slotId: string;
}

export interface CreateAssessmentRequest {
  bookingId: string;
  score: number; // 0-9 with 0.5 increments
  remarks?: string;
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
  date?: string;
  startDate?: string;
  endDate?: string;
}

export interface BookingFilters {
  studentId?: string;
  slotId?: string;
  status?: BookingStatus;
  branchId?: string;
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