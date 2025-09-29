// UserRole constants
export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  BRANCH_ADMIN: 'BRANCH_ADMIN',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT'
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

export interface JWTPayload {
  userId: string;
  role: UserRole;
  branchId?: string;
  email?: string;
  phoneNumber?: string;
  name?: string;
}

export interface AuthRequest {
  user?: JWTPayload;
}

export interface LoginRequest {
  email?: string;
  phoneNumber?: string;
  password?: string;
  otp?: string;
}

export interface LoginResponse {
  user: {
    id: string;
    name: string;
    email?: string;
    phoneNumber?: string;
    role: UserRole;
    branchId?: string;
  };
  token: string;
  expiresIn: string;
}

export interface OTPRequest {
  phoneNumber: string;
}

export interface OTPVerificationRequest {
  phoneNumber: string;
  otp: string;
}

// Permission types
export type Permission = 
  | 'read:own_profile'
  | 'update:own_profile'
  | 'read:own_bookings'
  | 'create:booking'
  | 'update:own_booking'
  | 'delete:own_booking'
  | 'read:own_assessments'
  | 'read:own_notifications'
  | 'update:notification'
  | 'read:teacher_slots'
  | 'read:teacher_bookings'
  | 'create:assessment'
  | 'update:assessment'
  | 'update:attendance'
  | 'read:branch_users'
  | 'create:branch_user'
  | 'update:branch_user'
  | 'delete:branch_user'
  | 'read:branch_slots'
  | 'create:slot'
  | 'update:slot'
  | 'delete:slot'
  | 'read:branch_bookings'
  | 'read:branch_reports'
  | 'export:branch_data'
  | 'read:all_branches'
  | 'create:branch'
  | 'update:branch'
  | 'delete:branch'
  | 'read:all_users'
  | 'create:any_user'
  | 'update:any_user'
  | 'delete:any_user'
  | 'read:system_reports'
  | 'read:audit_logs'
  | 'read:system_settings'
  | 'update:system_settings';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  STUDENT: [
    'read:own_profile',
    'update:own_profile',
    'read:own_bookings',
    'create:booking',
    'update:own_booking',
    'delete:own_booking',
    'read:own_assessments',
    'read:own_notifications',
    'update:notification'
  ],
  TEACHER: [
    'read:own_profile',
    'update:own_profile',
    'read:teacher_slots',
    'read:teacher_bookings',
    'create:assessment',
    'update:assessment',
    'update:attendance',
    'read:own_notifications',
    'update:notification'
  ],
  BRANCH_ADMIN: [
    'read:own_profile',
    'update:own_profile',
    'read:branch_users',
    'create:branch_user',
    'update:branch_user',
    'delete:branch_user',
    'read:branch_slots',
    'create:slot',
    'update:slot',
    'delete:slot',
    'read:branch_bookings',
    'read:branch_reports',
    'export:branch_data',
    'read:own_notifications',
    'update:notification'
  ],
  SUPER_ADMIN: [
    'read:own_profile',
    'update:own_profile',
    'read:all_branches',
    'create:branch',
    'update:branch',
    'delete:branch',
    'read:all_users',
    'create:any_user',
    'update:any_user',
    'delete:any_user',
    'read:system_reports',
    'read:audit_logs',
    'read:system_settings',
    'update:system_settings',
    'read:own_notifications',
    'update:notification'
  ]
};