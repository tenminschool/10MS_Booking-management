export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  BRANCH_ADMIN = 'branch_admin',
  TEACHER = 'teacher',
  STUDENT = 'student'
}

export enum BookingStatus {
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  NO_SHOW = 'no_show'
}

export enum NotificationType {
  BOOKING_CONFIRMED = 'booking_confirmed',
  BOOKING_REMINDER = 'booking_reminder',
  BOOKING_CANCELLED = 'booking_cancelled',
  SYSTEM_ALERT = 'system_alert'
}

export interface User {
  id: string
  phoneNumber?: string
  email?: string
  name: string
  role: UserRole
  branchId?: string
  isActive: boolean
  createdAt: string
}

export interface Branch {
  id: string
  name: string
  address: string
  contactNumber: string
  isActive: boolean
  createdAt: string
}

export interface Slot {
  id: string
  branchId: string
  teacherId: string
  date: string
  startTime: string
  endTime: string
  capacity: number
  bookedCount: number
  createdAt: string
  branch?: Branch
  teacher?: User
}

export interface Booking {
  id: string
  studentId: string
  slotId: string
  status: BookingStatus
  attended?: boolean
  cancellationReason?: string
  bookedAt: string
  cancelledAt?: string
  slot?: Slot
  student?: User
}

export interface Assessment {
  id: string
  bookingId: string
  studentId: string
  teacherId: string
  score: number
  remarks: string
  assessedAt: string
  booking?: Booking
  teacher?: User
}

export interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: NotificationType
  isRead: boolean
  createdAt: string
}

export interface SlotFilters {
  branchId?: string
  teacherId?: string
  date?: string
  view: 'daily' | 'weekly' | 'monthly'
}

export interface CreateBookingRequest {
  slotId: string
  studentPhoneNumber: string
}

export interface AssessmentRequest {
  bookingId: string
  score: number
  remarks: string
}

export interface DashboardMetrics {
  totalBookings: number
  attendanceRate: number
  utilizationRate: number
  noShowRate: number
  upcomingBookings: Booking[]
  recentNotifications: Notification[]
}