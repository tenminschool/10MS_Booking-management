/**
 * Mock Dashboard Data for Development/Testing
 * Provides dashboard metrics without requiring database connection
 */

export const mockDashboard = {
  // Mock metrics for different user roles
  getMetrics: (userRole: string, userId: string) => {
    const baseMetrics = {
      totalBookings: 25,
      attendanceRate: 85.5,
      utilizationRate: 72.3,
      noShowRate: 14.5,
      recentNotifications: [
        {
          id: 'mock-notif-1',
          title: 'Booking Confirmed',
          message: 'Your speaking test has been confirmed for tomorrow at 2:00 PM',
          type: 'BOOKING_CONFIRMATION',
          isRead: false,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
        },
        {
          id: 'mock-notif-2',
          title: 'Reminder',
          message: 'You have a speaking test in 24 hours',
          type: 'REMINDER',
          isRead: false,
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
        }
      ]
    };

    switch (userRole) {
      case 'STUDENT':
        return {
          ...baseMetrics,
          totalBookings: 8,
          upcomingBookings: [
            {
              id: 'mock-booking-1',
              status: 'CONFIRMED',
              slot: {
                id: 'mock-slot-1',
                date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
                startTime: '14:00',
                endTime: '14:30',
                branch: { id: 'mock-branch-1', name: 'Dhanmondi Branch' },
                teacher: { id: 'mock-teacher-1', name: 'Sarah Ahmed' }
              }
            },
            {
              id: 'mock-booking-2',
              status: 'CONFIRMED',
              slot: {
                id: 'mock-slot-2',
                date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
                startTime: '10:00',
                endTime: '10:30',
                branch: { id: 'mock-branch-1', name: 'Dhanmondi Branch' },
                teacher: { id: 'mock-teacher-2', name: 'Ahmed Khan' }
              }
            }
          ]
        };

      case 'TEACHER':
        return {
          ...baseMetrics,
          totalBookings: 45,
          todaySessions: 6,
          totalStudentsToday: 6,
          weeklySlots: 28,
          upcomingBookings: [
            {
              id: 'mock-booking-3',
              status: 'CONFIRMED',
              slot: {
                id: 'mock-slot-3',
                date: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
                startTime: '15:00',
                endTime: '15:30',
                branch: { id: 'mock-branch-1', name: 'Dhanmondi Branch' }
              },
              student: { id: 'mock-student-1', name: 'Ahmed Rahman' }
            },
            {
              id: 'mock-booking-4',
              status: 'CONFIRMED',
              slot: {
                id: 'mock-slot-4',
                date: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
                startTime: '16:00',
                endTime: '16:30',
                branch: { id: 'mock-branch-1', name: 'Dhanmondi Branch' }
              },
              student: { id: 'mock-student-2', name: 'Fatima Khan' }
            }
          ]
        };

      case 'BRANCH_ADMIN':
        return {
          ...baseMetrics,
          totalBookings: 156,
          branchName: 'Dhanmondi Branch',
          upcomingBookings: [
            {
              id: 'mock-booking-5',
              status: 'CONFIRMED',
              slot: {
                id: 'mock-slot-5',
                date: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
                startTime: '14:00',
                endTime: '14:30',
                teacher: { id: 'mock-teacher-1', name: 'Sarah Ahmed' }
              },
              student: { id: 'mock-student-3', name: 'Rashid Ali' }
            },
            {
              id: 'mock-booking-6',
              status: 'CONFIRMED',
              slot: {
                id: 'mock-slot-6',
                date: new Date(Date.now() + 90 * 60 * 1000), // 1.5 hours from now
                startTime: '14:30',
                endTime: '15:00',
                teacher: { id: 'mock-teacher-2', name: 'Ahmed Khan' }
              },
              student: { id: 'mock-student-4', name: 'Nadia Islam' }
            }
          ]
        };

      case 'SUPER_ADMIN':
        return {
          ...baseMetrics,
          totalBookings: 1247,
          totalBranches: 5,
          activeBranches: 4,
          totalTeachers: 18,
          totalStudents: 342,
          branchPerformance: [
            {
              id: 'mock-branch-1',
              name: 'Dhanmondi Branch',
              bookings: 156,
              students: 89,
              utilizationRate: 78.5,
              attendanceRate: 87.2
            },
            {
              id: 'mock-branch-2',
              name: 'Gulshan Branch',
              bookings: 134,
              students: 76,
              utilizationRate: 71.3,
              attendanceRate: 84.1
            },
            {
              id: 'mock-branch-3',
              name: 'Uttara Branch',
              bookings: 98,
              students: 54,
              utilizationRate: 65.8,
              attendanceRate: 89.3
            }
          ],
          recentActivity: [
            {
              type: 'booking',
              description: 'Ahmed Rahman booked session with Sarah Ahmed',
              branchName: 'Dhanmondi Branch',
              timestamp: new Date(Date.now() - 15 * 60 * 1000) // 15 minutes ago
            },
            {
              type: 'cancellation',
              description: 'Fatima Khan cancelled booking',
              branchName: 'Gulshan Branch',
              timestamp: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
            },
            {
              type: 'booking',
              description: 'Rashid Ali booked session with Ahmed Khan',
              branchName: 'Uttara Branch',
              timestamp: new Date(Date.now() - 45 * 60 * 1000) // 45 minutes ago
            }
          ],
          systemAlerts: [
            {
              id: 'alert-1',
              type: 'warning',
              message: 'Database connection unstable - using mock data',
              timestamp: new Date()
            }
          ],
          upcomingBookings: [
            {
              id: 'mock-booking-7',
              status: 'CONFIRMED',
              slot: {
                id: 'mock-slot-7',
                date: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
                startTime: '13:30',
                endTime: '14:00',
                branch: { id: 'mock-branch-1', name: 'Dhanmondi Branch' },
                teacher: { id: 'mock-teacher-1', name: 'Sarah Ahmed' }
              },
              student: { id: 'mock-student-5', name: 'Karim Hassan' }
            }
          ]
        };

      default:
        return baseMetrics;
    }
  }
};

export default mockDashboard;