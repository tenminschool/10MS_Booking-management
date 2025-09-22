import express from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = express.Router();

// GET /api/dashboard/metrics - Get dashboard metrics based on user role
router.get('/metrics', authenticate, async (req, res) => {
  try {
    const user = req.user!;
    let metrics: any = {};

    if (user.role === UserRole.STUDENT) {
      // Student metrics
      const [totalBookings, upcomingBookings, recentNotifications, attendanceData] = await Promise.all([
        prisma.booking.count({
          where: { studentId: user.userId }
        }),
        prisma.booking.findMany({
          where: {
            studentId: user.userId,
            status: 'CONFIRMED',
            slot: {
              date: { gte: new Date() }
            }
          },
          include: {
            slot: {
              include: {
                branch: { select: { id: true, name: true } },
                teacher: { select: { id: true, name: true } }
              }
            }
          },
          orderBy: {
            slot: { date: 'asc' }
          },
          take: 5
        }),
        prisma.notification.findMany({
          where: { userId: user.userId },
          orderBy: { createdAt: 'desc' },
          take: 5
        }),
        prisma.booking.findMany({
          where: {
            studentId: user.userId,
            status: { in: ['COMPLETED', 'NO_SHOW'] }
          },
          select: { attended: true }
        })
      ]);

      const attendedCount = attendanceData.filter(b => b.attended === true).length;
      const totalCompleted = attendanceData.length;
      const attendanceRate = totalCompleted > 0 ? (attendedCount / totalCompleted) * 100 : 0;

      metrics = {
        totalBookings,
        attendanceRate,
        utilizationRate: 0, // Not applicable for students
        noShowRate: totalCompleted > 0 ? ((totalCompleted - attendedCount) / totalCompleted) * 100 : 0,
        upcomingBookings,
        recentNotifications
      };

    } else if (user.role === UserRole.TEACHER) {
      // Teacher metrics
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const [totalSessions, todaySessions, upcomingBookings, recentNotifications, weeklySlots] = await Promise.all([
        prisma.booking.count({
          where: {
            slot: { teacherId: user.userId }
          }
        }),
        prisma.slot.findMany({
          where: {
            teacherId: user.userId,
            date: {
              gte: today,
              lt: tomorrow
            }
          },
          include: {
            branch: { select: { id: true, name: true } },
            bookings: {
              where: { status: { in: ['CONFIRMED', 'COMPLETED'] } },
              select: { id: true, status: true }
            }
          }
        }),
        prisma.booking.findMany({
          where: {
            slot: {
              teacherId: user.userId,
              date: { gte: new Date() }
            },
            status: 'CONFIRMED'
          },
          include: {
            slot: {
              include: {
                branch: { select: { id: true, name: true } }
              }
            },
            student: { select: { id: true, name: true } }
          },
          orderBy: {
            slot: { date: 'asc' }
          },
          take: 5
        }),
        prisma.notification.findMany({
          where: { userId: user.userId },
          orderBy: { createdAt: 'desc' },
          take: 5
        }),
        prisma.slot.count({
          where: {
            teacherId: user.userId,
            date: {
              gte: today,
              lte: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
            }
          }
        })
      ]);

      const totalStudentsToday = todaySessions.reduce((sum, slot) => sum + slot.bookings.length, 0);

      metrics = {
        totalBookings: totalSessions,
        attendanceRate: 0, // Calculate from completed sessions
        utilizationRate: 0, // Calculate from slot capacity vs bookings
        noShowRate: 0,
        upcomingBookings,
        recentNotifications,
        todaySessions: todaySessions.length,
        totalStudentsToday,
        weeklySlots
      };

    } else if (user.role === UserRole.BRANCH_ADMIN) {
      // Branch admin metrics
      const [totalBookings, upcomingBookings, recentNotifications, branchStats] = await Promise.all([
        prisma.booking.count({
          where: {
            slot: { branchId: user.branchId }
          }
        }),
        prisma.booking.findMany({
          where: {
            slot: {
              branchId: user.branchId,
              date: { gte: new Date() }
            },
            status: 'CONFIRMED'
          },
          include: {
            slot: {
              include: {
                teacher: { select: { id: true, name: true } }
              }
            },
            student: { select: { id: true, name: true } }
          },
          orderBy: {
            slot: { date: 'asc' }
          },
          take: 10
        }),
        prisma.notification.findMany({
          where: { userId: user.userId },
          orderBy: { createdAt: 'desc' },
          take: 5
        }),
        prisma.branch.findUnique({
          where: { id: user.branchId! },
          select: { name: true }
        })
      ]);

      metrics = {
        totalBookings,
        attendanceRate: 0,
        utilizationRate: 0,
        noShowRate: 0,
        upcomingBookings,
        recentNotifications,
        branchName: branchStats?.name
      };

    } else {
      // Super admin metrics - system-wide
      const [
        totalBookings, 
        upcomingBookings, 
        recentNotifications, 
        systemStats,
        branchPerformance,
        recentActivity,
        attendanceData,
        utilizationData
      ] = await Promise.all([
        prisma.booking.count(),
        prisma.booking.findMany({
          where: {
            slot: { date: { gte: new Date() } },
            status: 'CONFIRMED'
          },
          include: {
            slot: {
              include: {
                branch: { select: { id: true, name: true } },
                teacher: { select: { id: true, name: true } }
              }
            },
            student: { select: { id: true, name: true } }
          },
          orderBy: {
            slot: { date: 'asc' }
          },
          take: 10
        }),
        prisma.notification.findMany({
          where: { userId: user.userId },
          orderBy: { createdAt: 'desc' },
          take: 5
        }),
        Promise.all([
          prisma.branch.count(),
          prisma.branch.count({ where: { isActive: true } }),
          prisma.user.count({ where: { role: UserRole.TEACHER, isActive: true } }),
          prisma.user.count({ where: { role: UserRole.STUDENT, isActive: true } })
        ]),
        // Branch performance data
        prisma.branch.findMany({
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            _count: {
              select: {
                users: {
                  where: { isActive: true }
                },
                slots: true
              }
            },
            slots: {
              select: {
                capacity: true,
                bookings: {
                  where: {
                    status: { in: ['CONFIRMED', 'COMPLETED', 'NO_SHOW'] }
                  },
                  select: { id: true, attended: true, status: true }
                }
              }
            }
          }
        }),
        // Recent activity
        prisma.booking.findMany({
          take: 10,
          orderBy: { bookedAt: 'desc' },
          include: {
            student: { select: { name: true } },
            slot: {
              include: {
                teacher: { select: { name: true } },
                branch: { select: { name: true } }
              }
            }
          }
        }),
        // Attendance data for overall calculation
        prisma.booking.findMany({
          where: {
            status: { in: ['COMPLETED', 'NO_SHOW'] }
          },
          select: { attended: true }
        }),
        // Utilization data
        prisma.slot.findMany({
          select: {
            capacity: true,
            bookings: {
              where: {
                status: { in: ['CONFIRMED', 'COMPLETED', 'NO_SHOW'] }
              },
              select: { id: true }
            }
          }
        })
      ]);

      const [totalBranches, activeBranches, totalTeachers, totalStudents] = systemStats;

      // Calculate overall attendance rate
      const attendedCount = attendanceData.filter(b => b.attended === true).length;
      const totalCompleted = attendanceData.length;
      const overallAttendanceRate = totalCompleted > 0 ? (attendedCount / totalCompleted) * 100 : 0;

      // Calculate overall utilization rate
      const totalCapacity = utilizationData.reduce((sum, slot) => sum + slot.capacity, 0);
      const totalBooked = utilizationData.reduce((sum, slot) => sum + slot.bookings.length, 0);
      const overallUtilizationRate = totalCapacity > 0 ? (totalBooked / totalCapacity) * 100 : 0;

      // Process branch performance
      const branchMetrics = branchPerformance.map(branch => {
        const branchCapacity = branch.slots.reduce((sum, slot) => sum + slot.capacity, 0);
        const branchBookings = branch.slots.reduce((sum, slot) => sum + slot.bookings.length, 0);
        const branchAttended = branch.slots.reduce((sum, slot) => 
          sum + slot.bookings.filter(booking => booking.attended === true).length, 0
        );
        const branchCompleted = branch.slots.reduce((sum, slot) => 
          sum + slot.bookings.filter(booking => booking.status === 'COMPLETED' || booking.status === 'NO_SHOW').length, 0
        );

        return {
          id: branch.id,
          name: branch.name,
          bookings: branchBookings,
          students: branch._count.users,
          utilizationRate: branchCapacity > 0 ? (branchBookings / branchCapacity) * 100 : 0,
          attendanceRate: branchCompleted > 0 ? (branchAttended / branchCompleted) * 100 : 0
        };
      });

      // Process recent activity
      const activityData = recentActivity.map(booking => ({
        type: booking.status === 'CANCELLED' ? 'cancellation' : 'booking',
        description: booking.status === 'CANCELLED' 
          ? `${booking.student?.name} cancelled booking`
          : `${booking.student?.name} booked session with ${booking.slot.teacher?.name}`,
        branchName: booking.slot.branch?.name,
        timestamp: booking.bookedAt
      }));

      metrics = {
        totalBookings,
        attendanceRate: overallAttendanceRate,
        utilizationRate: overallUtilizationRate,
        noShowRate: totalCompleted > 0 ? ((totalCompleted - attendedCount) / totalCompleted) * 100 : 0,
        upcomingBookings,
        recentNotifications,
        totalBranches,
        activeBranches,
        totalTeachers,
        totalStudents,
        branchPerformance: branchMetrics,
        recentActivity: activityData,
        systemAlerts: [] // Mock system alerts - would come from monitoring system
      };
    }

    res.json(metrics);

  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch dashboard metrics'
    });
  }
});

export default router;