import axios from 'axios'
import type {
  User,
  Branch,
  Slot,
  Booking,
  Assessment,
  Notification,
  SlotFilters,
  CreateBookingRequest,
  AssessmentRequest,
  DashboardMetrics,
  IELTSRubrics
} from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  loginStudent: (phoneNumber: string, otp: string) =>
    api.post('/auth/student/login', { phoneNumber, otp }),

  loginStaff: (email: string, password: string) =>
    api.post('/auth/staff/login', { email, password }),

  sendOTP: (phoneNumber: string) =>
    api.post('/auth/student/send-otp', { phoneNumber }),

  getCurrentUser: () =>
    api.get<User>('/auth/me'),

  logout: () =>
    api.post('/auth/logout'),
}

// Branches API
export const branchesAPI = {
  getAll: () =>
    api.get<Branch[]>('/branches'),

  getById: (id: string) =>
    api.get<Branch>(`/branches/${id}`),
}

// Slots API
export const slotsAPI = {
  getAvailable: (filters: SlotFilters) =>
    api.get<Slot[]>('/slots', { params: filters }),

  getById: (id: string) =>
    api.get<Slot>(`/slots/${id}`),
}

// Bookings API
export const bookingsAPI = {
  create: (data: CreateBookingRequest) =>
    api.post<Booking>('/bookings', data),

  getMyBookings: () =>
    api.get<Booking[]>('/bookings/my'),

  cancel: (id: string, reason?: string) =>
    api.put(`/bookings/${id}/cancel`, { reason }),

  reschedule: (id: string, newSlotId: string) =>
    api.put(`/bookings/${id}/reschedule`, { newSlotId }),

  getById: (id: string) =>
    api.get<Booking>(`/bookings/${id}`),

  markAttendance: (id: string, attended: boolean) =>
    api.put(`/bookings/${id}/attendance`, { attended }),
}

// Assessments API
export const assessmentsAPI = {
  getMyAssessments: () =>
    api.get<Assessment[]>('/assessments/my'),

  getById: (id: string) =>
    api.get<Assessment>(`/assessments/${id}`),

  create: (data: AssessmentRequest) =>
    api.post<Assessment>('/assessments', data),

  getRubrics: () =>
    api.get<IELTSRubrics>('/assessments/rubrics'),
}

// Notifications API
export const notificationsAPI = {
  getMy: () =>
    api.get<Notification[]>('/notifications/my'),

  markAsRead: (id: string) =>
    api.put(`/notifications/${id}/read`),

  markAllAsRead: () =>
    api.put('/notifications/mark-all-read'),
}

// Dashboard API
export const dashboardAPI = {
  getMetrics: () =>
    api.get<DashboardMetrics>('/dashboard/metrics'),
}

export default api