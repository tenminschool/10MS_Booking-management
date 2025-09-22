import axios from 'axios'
import { parseApiError, logError } from '@/lib/errorHandling'
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

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

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

// Enhanced error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Parse and log the error
    const apiError = parseApiError(error)
    logError(apiError, { 
      url: error.config?.url,
      method: error.config?.method,
      data: error.config?.data 
    })

    // Handle authentication errors
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
    api.post('/api/auth/student/login', { phoneNumber, otp }),

  loginStaff: (email: string, password: string) =>
    api.post('/api/auth/staff/login', { email, password }),

  sendOTP: (phoneNumber: string) =>
    api.post('/api/auth/student/send-otp', { phoneNumber }),

  getCurrentUser: () =>
    api.get<User>('/api/auth/me'),

  logout: () =>
    api.post('/api/auth/logout'),
}

// Branches API
export const branchesAPI = {
  getAll: () =>
    api.get<Branch[]>('/api/branches'),

  getById: (id: string) =>
    api.get<Branch>(`/api/branches/${id}`),

  create: (data: any) =>
    api.post<Branch>('/api/branches', data),

  update: (id: string, data: any) =>
    api.put<Branch>(`/api/branches/${id}`, data),

  delete: (id: string) =>
    api.delete(`/api/branches/${id}`),
}

// Slots API
export const slotsAPI = {
  getAvailable: (filters: SlotFilters) =>
    api.get<Slot[]>('/api/slots', { params: filters }),

  getById: (id: string) =>
    api.get<Slot>(`/api/slots/${id}`),

  create: (data: any) =>
    api.post<Slot>('/api/slots', data),

  update: (id: string, data: any) =>
    api.put<Slot>(`/api/slots/${id}`, data),

  delete: (id: string) =>
    api.delete(`/api/slots/${id}`),

  bulkCreate: (data: { slots: any[] }) =>
    api.post('/api/slots/bulk', data),
}

// Bookings API
export const bookingsAPI = {
  create: (data: CreateBookingRequest) =>
    api.post<Booking>('/api/bookings', data),

  getMyBookings: () =>
    api.get<Booking[]>('/api/bookings/my'),

  cancel: (id: string, reason?: string) =>
    api.put(`/api/bookings/${id}/cancel`, { reason }),

  reschedule: (id: string, newSlotId: string) =>
    api.put(`/api/bookings/${id}/reschedule`, { newSlotId }),

  getById: (id: string) =>
    api.get<Booking>(`/api/bookings/${id}`),

  markAttendance: (id: string, attended: boolean) =>
    api.put(`/api/bookings/${id}/attendance`, { attended }),
}

// Assessments API
export const assessmentsAPI = {
  getMyAssessments: () =>
    api.get<Assessment[]>('/api/assessments/my'),

  getById: (id: string) =>
    api.get<Assessment>(`/api/assessments/${id}`),

  create: (data: AssessmentRequest) =>
    api.post<Assessment>('/api/assessments', data),

  getRubrics: () =>
    api.get<IELTSRubrics>('/api/assessments/rubrics'),
}

// Notifications API
export const notificationsAPI = {
  getMy: () =>
    api.get<Notification[]>('/api/notifications/my'),

  markAsRead: (id: string) =>
    api.put(`/api/notifications/${id}/read`),

  markAllAsRead: () =>
    api.put('/api/notifications/mark-all-read'),
}

// Dashboard API
export const dashboardAPI = {
  getMetrics: () =>
    api.get<DashboardMetrics>('/api/dashboard/metrics'),
}

// Users API (Admin)
export const usersAPI = {
  getAll: (params?: any) =>
    api.get<{ users: User[]; pagination: any }>('/api/users', { params }),

  getByBranch: (branchId: string, params?: any) =>
    api.get<{ users: User[]; pagination: any }>(`/api/users/branch/${branchId}`, { params }),

  getById: (id: string) =>
    api.get<{ user: User }>(`/api/users/${id}`),

  create: (data: any) =>
    api.post<{ user: User }>('/api/users', data),

  update: (id: string, data: any) =>
    api.put<{ user: User }>(`/api/users/${id}`, data),

  delete: (id: string) =>
    api.delete(`/api/users/${id}`),
}

// Slots API (Admin)
export const slotsAdminAPI = {
  create: (data: any) =>
    api.post<{ slot: Slot }>('/api/slots', data),

  update: (id: string, data: any) =>
    api.put<{ slot: Slot }>(`/api/slots/${id}`, data),

  delete: (id: string) =>
    api.delete(`/api/slots/${id}`),

  bulkCreate: (data: { slots: any[] }) =>
    api.post('/api/slots/bulk', data),
}

// Import API
export const importAPI = {
  importStudents: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/api/import/students', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  downloadTemplate: () =>
    api.get('/api/import/template', { responseType: 'blob' }),
}

// Reports API
export const reportsAPI = {
  getReports: (params: any) =>
    api.get('/api/reports', { params }),

  exportReports: (params: any) =>
    api.get('/api/reports/export', { params, responseType: 'blob' }),

  getDashboardMetrics: (params?: any) =>
    api.get('/api/reports/dashboard', { params }),

  getAttendanceReport: (params: any) =>
    api.get('/api/reports/attendance', { params }),

  getUtilizationReport: (params: any) =>
    api.get('/api/reports/utilization', { params }),

  getAnalytics: (params?: any) =>
    api.get('/api/reports/analytics', { params }),

  getRealTimeMetrics: (params?: any) =>
    api.get('/api/reports/real-time', { params }),

  getNoShowAnalysis: (params?: any) =>
    api.get('/api/reports/no-show-analysis', { params }),
}

// System API (Super Admin)
export const systemAPI = {
  getSettings: () =>
    api.get('/api/system/settings'),

  updateSettings: (data: any) =>
    api.put('/api/system/settings', data),

  getAuditLogs: (params?: any) =>
    api.get('/api/system/audit-logs', { params }),

  getSystemMetrics: () =>
    api.get('/api/system/metrics'),
}

export default api