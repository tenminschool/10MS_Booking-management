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
  IELTSRubrics,
  ServiceType,
  Room,
  ServiceCategory,
  RoomType
} from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Utility function to convert axios IPromise to Promise
const toPromise = <T>(axiosPromise: any): Promise<T> => {
  return Promise.resolve(axiosPromise) as Promise<T>
}

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
    toPromise(api.post('/api/auth/student/verify-otp', { phoneNumber, otp })),

  loginStaff: (email: string, password: string) =>
    toPromise(api.post('/api/auth/staff/login', { email, password })),

  sendOTP: (phoneNumber: string) =>
    toPromise(api.post('/api/auth/student/request-otp', { phoneNumber })),

  getCurrentUser: () =>
    toPromise(api.get<User>('/api/auth/me')),

  logout: () =>
    toPromise(api.post('/api/auth/logout')),
}

// Branches API
export const branchesAPI = {
  getAll: () =>
    toPromise(api.get<{ branches: Branch[]; pagination: any }>('/api/branches')),

  getById: (id: string) =>
    toPromise(api.get<Branch>(`/api/branches/${id}`)),

  create: (data: any) =>
    toPromise(api.post<Branch>('/api/branches', data)),

  update: (id: string, data: any) =>
    toPromise(api.put<Branch>(`/api/branches/${id}`, data)),

  delete: (id: string) =>
    toPromise(api.delete(`/api/branches/${id}`)),
}

// Slots API
export const slotsAPI = {
  getAvailable: (filters?: SlotFilters) =>
    toPromise(api.get<Slot[]>('/api/slots', { params: filters })),

  getAll: (params?: any) => {
    console.log('slotsAPI.getAll() called with params:', params)
    return toPromise(api.get<Slot[]>('/api/slots/admin', { params })
      .then(response => {
        console.log('slotsAPI.getAll() response:', response)
        return response
      })
      .catch(error => {
        console.error('slotsAPI.getAll() error:', error)
        throw error
      }))
  },

  getById: (id: string) =>
    toPromise(api.get<Slot>(`/api/slots/${id}`)),

  create: (data: any) =>
    toPromise(api.post<Slot>('/api/slots', data)),

  update: (id: string, data: any) =>
    toPromise(api.put<Slot>(`/api/slots/${id}`, data)),

  delete: (id: string) =>
    toPromise(api.delete(`/api/slots/${id}`)),

  bulkCreate: (data: { slots: any[] }) =>
    toPromise(api.post('/api/slots/bulk', data)),
}

// Bookings API
export const bookingsAPI = {
  create: (data: CreateBookingRequest) =>
    toPromise(api.post<Booking>('/api/bookings', data)),

  getAll: (params?: any) =>
    toPromise(api.get<{ bookings: Booking[]; pagination: any }>('/api/bookings', { params })),

  getMyBookings: () =>
    toPromise(api.get<Booking[]>('/api/bookings/my')),

  getTeacherBookings: () =>
    toPromise(api.get<Booking[]>('/api/bookings/teacher')),

  update: (id: string, data: any) =>
    toPromise(api.put<Booking>(`/api/bookings/${id}`, data)),

  cancel: (id: string, reason?: string) =>
    toPromise(api.put(`/api/bookings/${id}/cancel`, { reason })),

  reschedule: (id: string, newSlotId: string) =>
    toPromise(api.put(`/api/bookings/${id}/reschedule`, { newSlotId })),

  getById: (id: string) =>
    toPromise(api.get<Booking>(`/api/bookings/${id}`)),

  markAttendance: (id: string, attended: boolean) =>
    toPromise(api.put(`/api/bookings/${id}/attendance`, { attended })),
}

// Assessments API
export const assessmentsAPI = {
  getAll: (params?: any) =>
    toPromise(api.get<{ assessments: Assessment[]; pagination: any }>('/api/assessments', { params })),

  getMyAssessments: () =>
    toPromise(api.get<Assessment[]>('/api/assessments/my')),

  getById: (id: string) =>
    toPromise(api.get<Assessment>(`/api/assessments/${id}`)),

  create: (data: AssessmentRequest) =>
    toPromise(api.post<Assessment>('/api/assessments', data)),

  update: (id: string, data: any) =>
    toPromise(api.put<Assessment>(`/api/assessments/${id}`, data)),

  delete: (id: string) =>
    toPromise(api.delete(`/api/assessments/${id}`)),

  getRubrics: () =>
    toPromise(api.get<IELTSRubrics>('/api/assessments/rubrics')),
}

// Notifications API
export const notificationsAPI = {
  getMy: () =>
    toPromise(api.get<Notification[]>('/api/notifications')),

  getAll: (params?: any) =>
    toPromise(api.get<{ data: Notification[]; pagination: any }>('/api/notifications/admin', { params })),

  create: (data: any) =>
    toPromise(api.post<Notification>('/api/notifications', data)),

  update: (id: string, data: any) =>
    toPromise(api.put<Notification>(`/api/notifications/${id}`, data)),

  delete: (id: string) =>
    toPromise(api.delete(`/api/notifications/${id}`)),

  markAsRead: (id: string) =>
    toPromise(api.put(`/api/notifications/${id}/read`)),

  markAllAsRead: () =>
    toPromise(api.put('/api/notifications/mark-all-read')),
}

// Dashboard API
export const dashboardAPI = {
  getMetrics: () =>
    toPromise(api.get<DashboardMetrics>('/api/dashboard')),
}

// Users API (Admin)
export const usersAPI = {
  getAll: (params?: any) =>
    toPromise(api.get<{ users: User[]; pagination: any }>('/api/users', { params })),

  getByBranch: (branchId: string, params?: any) =>
    toPromise(api.get<{ users: User[]; pagination: any }>(`/api/users/branch/${branchId}`, { params })),

  getById: (id: string) =>
    toPromise(api.get<{ user: User }>(`/api/users/${id}`)),

  create: (data: any) =>
    toPromise(api.post<{ user: User }>('/api/users', data)),

  update: (id: string, data: any) =>
    toPromise(api.put<{ user: User }>(`/api/users/${id}`, data)),

  delete: (id: string) =>
    toPromise(api.delete(`/api/users/${id}`)),
}

// Slots API (Admin)
export const slotsAdminAPI = {
  create: (data: any) =>
    toPromise(api.post<{ slot: Slot }>('/api/slots', data)),

  update: (id: string, data: any) =>
    toPromise(api.put<{ slot: Slot }>(`/api/slots/${id}`, data)),

  delete: (id: string) =>
    toPromise(api.delete(`/api/slots/${id}`)),

  bulkCreate: (data: { slots: any[] }) =>
    toPromise(api.post('/api/slots/bulk', data)),
}

// Import API
export const importAPI = {
  importStudents: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return toPromise(api.post('/api/import/students', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }))
  },

  downloadTemplate: () =>
    toPromise(api.get('/api/import/template', { responseType: 'blob' })),
}

// Reports API
export const reportsAPI = {
  getReports: (params: any) =>
    toPromise(api.get('/api/reports', { params })),

  exportReports: (params: any) =>
    toPromise(api.get('/api/reports/export', { params, responseType: 'blob' })),

  getDashboardMetrics: (params?: any) =>
    toPromise(api.get('/api/reports/dashboard', { params })),

  getAttendanceReport: (params: any) =>
    toPromise(api.get('/api/reports/attendance', { params })),

  getUtilizationReport: (params: any) =>
    toPromise(api.get('/api/reports/utilization', { params })),

  getAnalytics: (params?: any) =>
    toPromise(api.get('/api/reports/analytics', { params })),

  getRealTimeMetrics: (params?: any) =>
    toPromise(api.get('/api/reports/real-time', { params })),

  getNoShowAnalysis: (params?: any) =>
    toPromise(api.get('/api/reports/no-show-analysis', { params })),
}

// System API (Super Admin)
export const systemAPI = {
  getSettings: () =>
    toPromise(api.get('/api/system/settings')),

  updateSettings: (data: any) =>
    toPromise(api.put('/api/system/settings', data)),

  getAuditLogs: (params?: any) =>
    toPromise(api.get('/api/system/audit-logs', { params })),

  getSystemMetrics: () =>
    toPromise(api.get('/api/system/metrics')),
}

// Service Types API
export const serviceTypesAPI = {
  getAll: (params?: { category?: ServiceCategory; isActive?: boolean }) =>
    toPromise(api.get<ServiceType[]>('/api/service-types', { params })),

  getPaid: () =>
    toPromise(api.get<ServiceType[]>('/api/service-types/paid')),

  getFree: () =>
    toPromise(api.get<ServiceType[]>('/api/service-types/free')),

  getById: (id: string) =>
    toPromise(api.get<ServiceType>(`/api/service-types/${id}`)),

  create: (data: {
    name: string;
    code: string;
    description?: string;
    category: ServiceCategory;
    defaultCapacity: number;
    durationMinutes: number;
  }) =>
    toPromise(api.post<ServiceType>('/api/service-types', data)),

  update: (id: string, data: {
    name?: string;
    code?: string;
    description?: string;
    category?: ServiceCategory;
    defaultCapacity?: number;
    durationMinutes?: number;
    isActive?: boolean;
  }) =>
    toPromise(api.put<ServiceType>(`/api/service-types/${id}`, data)),

  delete: (id: string) =>
    toPromise(api.delete(`/api/service-types/${id}`)),
}

// Rooms API
export const roomsAPI = {
  getAll: (params?: { branchId?: string; roomType?: RoomType; isActive?: boolean }) =>
    toPromise(api.get<Room[]>('/api/rooms', { params })),

  getByBranch: (branchId: string, params?: { roomType?: RoomType; isActive?: boolean }) =>
    toPromise(api.get<Room[]>(`/api/rooms/branch/${branchId}`, { params })),

  getById: (id: string) =>
    toPromise(api.get<Room>(`/api/rooms/${id}`)),

  create: (data: {
    branchId: string;
    roomNumber: string;
    roomName: string;
    roomType?: RoomType;
    capacity: number;
    equipment?: string[];
  }) =>
    toPromise(api.post<Room>('/api/rooms', data)),

  update: (id: string, data: {
    roomNumber?: string;
    roomName?: string;
    roomType?: RoomType;
    capacity?: number;
    equipment?: string[];
    isActive?: boolean;
  }) =>
    toPromise(api.put<Room>(`/api/rooms/${id}`, data)),

  delete: (id: string) =>
    toPromise(api.delete(`/api/rooms/${id}`)),
}

export default api