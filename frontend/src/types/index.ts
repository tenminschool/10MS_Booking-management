export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  BRANCH_ADMIN: 'BRANCH_ADMIN',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT'
} as const

export type UserRole = typeof UserRole[keyof typeof UserRole]

export const BookingStatus = {
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
  NO_SHOW: 'NO_SHOW'
} as const

export type BookingStatus = typeof BookingStatus[keyof typeof BookingStatus]

export const NotificationType = {
  BOOKING_CONFIRMED: 'booking_confirmed',
  BOOKING_REMINDER: 'booking_reminder',
  BOOKING_CANCELLED: 'booking_cancelled',
  SYSTEM_ALERT: 'system_alert'
} as const

export type NotificationType = typeof NotificationType[keyof typeof NotificationType]

// Service Types Enums
export const ServiceCategory = {
  PAID: 'paid',
  FREE: 'free'
} as const

export type ServiceCategory = typeof ServiceCategory[keyof typeof ServiceCategory]

export const PaymentStatus = {
  PENDING: 'pending',
  PAID: 'paid',
  FREE: 'free'
} as const

export type PaymentStatus = typeof PaymentStatus[keyof typeof PaymentStatus]

export const RoomType = {
  GENERAL: 'general',
  COMPUTER_LAB: 'computer_lab',
  COUNSELLING: 'counselling',
  EXAM_HALL: 'exam_hall'
} as const

export type RoomType = typeof RoomType[keyof typeof RoomType]

export interface User {
  id: string
  phoneNumber?: string
  email?: string
  name: string
  role: UserRole
  branchId?: string
  branch?: Branch
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
  serviceTypeId?: string // NEW: Service type
  roomId?: string // NEW: Room assignment
  date: string
  startTime: string
  endTime: string
  capacity: number
  bookedCount: number
  price?: number // NEW: Slot-specific pricing
  isBooked?: boolean
  createdAt: string
  branch?: Branch
  teacher?: User
  serviceType?: ServiceType // NEW: Service type details
  room?: Room // NEW: Room details
}

export interface Booking {
  id: string
  studentId: string
  slotId: string
  serviceTypeId?: string // NEW: Service type
  status: BookingStatus
  paymentStatus?: PaymentStatus // NEW: Payment status
  amountPaid?: number // NEW: Amount paid
  attended?: boolean
  cancellationReason?: string
  notes?: string
  bookedAt: string
  cancelledAt?: string
  createdAt: string
  slot?: Slot
  student?: User
  serviceType?: ServiceType // NEW: Service type details
}

export interface Assessment {
  id: string
  bookingId: string
  studentId: string
  teacherId: string
  fluencyScore: number
  coherenceScore: number
  lexicalResourceScore: number
  grammaticalRangeScore: number
  pronunciationScore: number
  overallScore: number
  remarks: string
  status: 'draft' | 'pending' | 'completed'
  assessedAt: string
  createdAt: string
  booking?: Booking
  student?: User
  teacher?: User
}

export interface Notification {
  id: string
  userId?: string
  title: string
  message: string
  type: NotificationType | string
  status?: 'SENT' | 'SCHEDULED' | 'FAILED' | 'DRAFT'
  isRead?: boolean
  isUrgent?: boolean
  targetUsers?: string[]
  scheduledAt?: string
  tags?: string[]
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
  serviceTypeId?: string
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

export interface IELTSBand {
  score: number
  description: string
}

export interface IELTSCriterion {
  name: string
  description: string
  bands: IELTSBand[]
}

export interface IELTSBandDescriptor {
  score: number
  level: string
  description: string
}

export interface IELTSScoringGuidelines {
  title: string
  description: string
  bandDescriptors: IELTSBandDescriptor[]
}

export interface IELTSRubrics {
  criteria: IELTSCriterion[]
  scoringGuidelines: IELTSBandDescriptor[]
  assessmentTips: string[]
}

// NEW: Service Types Interfaces
export interface ServiceType {
  id: string
  name: string
  code: string
  description?: string
  category: ServiceCategory
  defaultCapacity: number
  durationMinutes: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ServicePricing {
  id: string
  serviceTypeId: string
  branchId?: string
  price: number
  currency: string
  isActive: boolean
  effectiveFrom: string
  effectiveTo?: string
}

export interface Room {
  id: string
  branchId: string
  roomNumber: string
  roomName: string
  roomType: RoomType
  capacity: number
  equipment: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
  branch?: Branch
}