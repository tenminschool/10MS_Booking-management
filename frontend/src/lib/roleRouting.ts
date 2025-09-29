import { UserRole } from '@/types'

/**
 * Get the appropriate dashboard route based on user role
 * ALL users go to their dedicated dashboard page with different functionalities
 */
export const getRoleBasedDashboardRoute = (role: UserRole): string => {
  // All users go to /dashboard, but the dashboard will render different content based on role
  return '/dashboard'
}

/**
 * Get the role-specific welcome message
 */
export const getRoleWelcomeMessage = (role: UserRole, name: string): string => {
  switch (role) {
    case UserRole.SUPER_ADMIN:
      return `Welcome, ${name}! You have full system access.`
    case UserRole.BRANCH_ADMIN:
      return `Welcome, ${name}! Manage your branch operations.`
    case UserRole.TEACHER:
      return `Welcome, ${name}! Ready to teach today?`
    case UserRole.STUDENT:
      return `Welcome, ${name}! Book your speaking test.`
    default:
      return `Welcome, ${name}!`
  }
}

/**
 * Get role-specific dashboard title
 */
export const getRoleDashboardTitle = (role: UserRole): string => {
  switch (role) {
    case UserRole.SUPER_ADMIN:
      return 'System Administration'
    case UserRole.BRANCH_ADMIN:
      return 'Branch Management'
    case UserRole.TEACHER:
      return 'Teaching Dashboard'
    case UserRole.STUDENT:
      return 'Student Dashboard'
    default:
      return 'Dashboard'
  }
}
