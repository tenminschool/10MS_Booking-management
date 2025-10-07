// TODO: Migrate from Prisma to Supabase - this file contains legacy Prisma code
import express from 'express';
import { z } from 'zod';
// import prisma from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';
// import { UserRole } from '../lib/supabase';
import { format as formatDate, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth } from 'date-fns';

const router = express.Router();

// Validation schemas
const reportFiltersSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format'),
  branchId: z.string().optional(),
  teacherId: z.string().optional(),
  reportType: z.enum(['overview', 'attendance', 'utilization', 'assessments']).default('overview')
});

// Helper function to get date range
const getDateRange = (startDate: string, endDate: string) => {
  return {
    startDate: startOfDay(new Date(startDate)),
    endDate: endOfDay(new Date(endDate))
  };
};

// Helper function to check branch access
const checkBranchAccess = (user: any, requestedBranchId?: string) => {
  if (user.role === UserRole.SUPER_ADMIN) {
    return requestedBranchId; // Super admin can access any branch
  } else if (user.role === UserRole.BRANCH_ADMIN) {
    return user.branchId; // Branch admin can only access their branch
  }
  return null;
};

// GET /api/reports - Get comprehensive reports
router.get('/', authenticate, requireRole([UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN]), async (req, res) => {
  try {
    const filters = reportFiltersSchema.parse(req.query);
    const user = req.user!;

    // Check branch access
    const branchId = checkBranchAccess(user, filters.branchId);
    const { startDate, endDate } = getDateRange(filters.startDate, filters.endDate);

    // Build base where clause
    const baseWhere: any = {
      slot: {
        date: {
          gte: startDate,
          lte: endDate
        }
      }
    };

    if (branchId) {
      baseWhere.slot.branchId = branchId;
    }

    if (filters.teacherId) {
      baseWhere.slot.teacherId = filters.teacherId;
    }

    let reportData: any = {};

    if (filters.reportType === 'overview') {
      // Overview metrics
      const [
        totalBookings,
        completedBookings,
        attendedBookings,
        totalSlots,
        bookedSlots,
        branchPerformance
      ] = await Promise.all([
        // Total bookings
        prisma.booking.count({
          where: baseWhere
        }),

        // Completed bookings
        prisma.booking.count({
          where: {
            ...baseWhere,
            status: { in: ['COMPLETED', 'NO_SHOW'] }
          }
        }),

        // Attended bookings
        prisma.booking.count({
          where: {
            ...baseWhere,
            status: 'COMPLETED',
            attended: true
          }
        }),

        // Total slots in period
        prisma.slot.count({
          where: {
            date: {
              gte: startDate,
              lte: endDate
            },
            ...(branchId && { branchId }),
            ...(filters.teacherId && { teacherId: filters.teacherId })
          }
        }),

        // Booked slots (slots with at least one booking)
        prisma.slot.count({
          where: {
            date: {
              gte: startDate,
              lte: endDate
            },
            ...(branchId && { branchId }),
            ...(filters.teacherId && { teacherId: filters.teacherId }),
            bookings: {
              some: {
                status: { in: ['CONFIRMED', 'COMPLETED', 'NO_SHOW'] }
              }
            }
          }
        }),

        // Branch performance (for super admin)
        user.role === UserRole.SUPER_ADMIN ? prisma.branch.findMany({
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            _count: {
              select: {
                slots: {
                  where: {
                    date: {
                      gte: startDate,
                      lte: endDate
                    }
                  }
                }
              }
            },
            slots: {
              where: {
                date: {
                  gte: startDate,
                  lte: endDate
                }
              },
              select: {
                capacity: true,
                bookings: {
                  where: {
                    status: { in: ['CONFIRMED', 'COMPLETED', 'NO_SHOW'] }
                  },
                  select: { id: true }
                }
              }
            }
          }
        }) : []
      ]);

      // Calculate metrics
      const attendanceRate = completedBookings > 0 ? (attendedBookings / completedBookings) * 100 : 0;
      const utilizationRate = totalSlots > 0 ? (bookedSlots / totalSlots) * 100 : 0;
      const noShowRate = completedBookings > 0 ? ((completedBookings - attendedBookings) / completedBookings) * 100 : 0;

      // Process branch performance
      const branchPerformanceData = branchPerformance.map((branch: any) => {
        const totalCapacity = branch.slots.reduce((sum: number, slot: any) => sum + slot.capacity, 0);
        const totalBookings = branch.slots.reduce((sum: number, slot: any) => sum + slot.bookings.length, 0);
        const branchUtilization = totalCapacity > 0 ? (totalBookings / totalCapacity) * 100 : 0;

        return {
          name: branch.name,
          bookings: totalBookings,
          slots: branch._count.slots,
          utilizationRate: branchUtilization
        };
      });

      reportData = {
        totalBookings,
        attendanceRate,
        utilizationRate,
        noShowRate,
        availableSlots: totalSlots - bookedSlots,
        branchPerformance: branchPerformanceData
      };

    } else if (filters.reportType === 'attendance') {
      // Attendance details
      const attendanceDetails = await prisma.booking.findMany({
        where: {
          ...baseWhere,
          status: { in: ['COMPLETED', 'NO_SHOW'] }
        },
        include: {
          student: {
            select: { id: true, name: true }
          },
          slot: {
            include: {
              teacher: {
                select: { id: true, name: true }
              },
              branch: {
                select: { id: true, name: true }
              }
            }
          }
        },
        orderBy: {
          slot: { date: 'desc' }
        }
      });

      reportData = {
        attendanceDetails: attendanceDetails.map(booking => ({
          studentName: booking.student?.name,
          teacherName: booking.slot.teacher?.name,
          branchName: booking.slot.branch?.name,
          date: booking.slot.date,
          slotTime: `${booking.slot.startTime} - ${booking.slot.endTime}`,
          attended: booking.attended,
          status: booking.status
        }))
      };

    } else if (filters.reportType === 'utilization') {
      // Utilization details
      const utilizationDetails = await prisma.slot.findMany({
        where: {
          date: {
            gte: startDate,
            lte: endDate
          },
          ...(branchId && { branchId }),
          ...(filters.teacherId && { teacherId: filters.teacherId })
        },
        include: {
          teacher: {
            select: { id: true, name: true }
          },
          branch: {
            select: { id: true, name: true }
          },
          bookings: {
            where: {
              status: { in: ['CONFIRMED', 'COMPLETED', 'NO_SHOW'] }
            },
            select: { id: true }
          }
        },
        orderBy: {
          date: 'desc'
        }
      });

      reportData = {
        utilizationDetails: utilizationDetails.map(slot => ({
          teacherName: slot.teacher?.name,
          branchName: slot.branch?.name,
          date: slot.date,
          timeSlot: `${slot.startTime} - ${slot.endTime}`,
          capacity: slot.capacity,
          bookedCount: slot.bookings.length,
          utilizationRate: slot.capacity > 0 ? (slot.bookings.length / slot.capacity) * 100 : 0
        }))
      };

    } else if (filters.reportType === 'assessments') {
      // Assessment analytics
      const [assessments, assessmentSummary] = await Promise.all([
        prisma.assessment.findMany({
          where: {
            assessedAt: {
              gte: startDate,
              lte: endDate
            },
            ...(branchId && {
              booking: {
                slot: { branchId }
              }
            }),
            ...(filters.teacherId && { teacherId: filters.teacherId })
          },
          include: {
            student: {
              select: { id: true, name: true }
            },
            teacher: {
              select: { id: true, name: true }
            },
            booking: {
              include: {
                slot: {
                  include: {
                    branch: {
                      select: { id: true, name: true }
                    }
                  }
                }
              }
            }
          },
          orderBy: {
            assessedAt: 'desc'
          }
        }),

        prisma.assessment.aggregate({
          where: {
            assessedAt: {
              gte: startDate,
              lte: endDate
            },
            ...(branchId && {
              booking: {
                slot: { branchId }
              }
            }),
            ...(filters.teacherId && { teacherId: filters.teacherId })
          },
          _avg: { score: true },
          _max: { score: true },
          _min: { score: true },
          _count: true
        })
      ]);

      reportData = {
        assessmentSummary: {
          totalAssessments: assessmentSummary._count,
          averageScore: assessmentSummary._avg.score ? Number(assessmentSummary._avg.score.toFixed(1)) : 0,
          highestScore: assessmentSummary._max.score || 0,
          lowestScore: assessmentSummary._min.score || 0,
          improvementRate: 0 // TODO: Calculate based on historical data
        },
        recentAssessments: assessments.slice(0, 20).map(assessment => ({
          studentName: assessment.student?.name,
          teacherName: assessment.teacher?.name,
          branchName: assessment.booking?.slot?.branch?.name,
          score: assessment.score,
          remarks: assessment.remarks,
          assessedAt: assessment.assessedAt
        }))
      };
    }

    res.json(reportData);

  } catch (error) {
    console.error('Error fetching reports:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid query parameters',
        details: error.errors
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch reports'
    });
  }
});

// GET /api/reports/export - Export reports
router.get('/export', authenticate, requireRole([UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN]), async (req, res) => {
  try {
    const filters = reportFiltersSchema.parse(req.query);
    const { format = 'csv' } = req.query;
    const user = req.user!;

    // Check branch access
    const branchId = checkBranchAccess(user, filters.branchId);
    const { startDate, endDate } = getDateRange(filters.startDate, filters.endDate);

    // Build where clause
    const baseWhere: any = {
      slot: {
        date: {
          gte: startDate,
          lte: endDate
        }
      }
    };

    if (branchId) {
      baseWhere.slot.branchId = branchId;
    }

    if (filters.teacherId) {
      baseWhere.slot.teacherId = filters.teacherId;
    }

    // Fetch data based on report type
    let exportData: any[] = [];
    let filename = '';

    if (filters.reportType === 'attendance') {
      const bookings = await prisma.booking.findMany({
        where: {
          ...baseWhere,
          status: { in: ['COMPLETED', 'NO_SHOW'] }
        },
        include: {
          student: { select: { name: true, phoneNumber: true } },
          slot: {
            include: {
              teacher: { select: { name: true } },
              branch: { select: { name: true } }
            }
          }
        },
        orderBy: { slot: { date: 'desc' } }
      });

      exportData = bookings.map(booking => ({
        Date: formatDate(new Date(booking.slot.date), 'yyyy-MM-dd'),
        Time: `${booking.slot.startTime} - ${booking.slot.endTime}`,
        Student: booking.student?.name || 'N/A',
        Phone: booking.student?.phoneNumber || 'N/A',
        Teacher: booking.slot.teacher?.name || 'N/A',
        Branch: booking.slot.branch?.name || 'N/A',
        Status: booking.status,
        Attended: booking.attended ? 'Yes' : 'No'
      }));

      filename = `attendance_report_${formatDate(new Date(), 'yyyy-MM-dd')}`;

    } else if (filters.reportType === 'utilization') {
      const slots = await prisma.slot.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
          ...(branchId && { branchId }),
          ...(filters.teacherId && { teacherId: filters.teacherId })
        },
        include: {
          teacher: { select: { name: true } },
          branch: { select: { name: true } },
          bookings: {
            where: { status: { in: ['CONFIRMED', 'COMPLETED', 'NO_SHOW'] } },
            select: { id: true }
          }
        },
        orderBy: { date: 'desc' }
      });

      exportData = slots.map(slot => ({
        Date: formatDate(new Date(slot.date), 'yyyy-MM-dd'),
        Time: `${slot.startTime} - ${slot.endTime}`,
        Teacher: slot.teacher?.name || 'N/A',
        Branch: slot.branch?.name || 'N/A',
        Capacity: slot.capacity,
        Booked: slot.bookings.length,
        Available: slot.capacity - slot.bookings.length,
        'Utilization %': slot.capacity > 0 ? Math.round((slot.bookings.length / slot.capacity) * 100) : 0
      }));

      filename = `utilization_report_${formatDate(new Date(), 'yyyy-MM-dd')}`;

    } else if (filters.reportType === 'assessments') {
      const assessments = await prisma.assessment.findMany({
        where: {
          assessedAt: { gte: startDate, lte: endDate },
          ...(branchId && { booking: { slot: { branchId } } }),
          ...(filters.teacherId && { teacherId: filters.teacherId })
        },
        include: {
          student: { select: { name: true, phoneNumber: true } },
          teacher: { select: { name: true } },
          booking: {
            include: {
              slot: {
                include: {
                  branch: { select: { name: true } }
                }
              }
            }
          }
        },
        orderBy: { assessedAt: 'desc' }
      });

      exportData = assessments.map(assessment => ({
        Date: formatDate(new Date(assessment.assessedAt), 'yyyy-MM-dd'),
        Student: assessment.student?.name || 'N/A',
        Phone: assessment.student?.phoneNumber || 'N/A',
        Teacher: assessment.teacher?.name || 'N/A',
        Branch: assessment.booking?.slot?.branch?.name || 'N/A',
        Score: assessment.score,
        Remarks: assessment.remarks || ''
      }));

      filename = `assessments_report_${formatDate(new Date(), 'yyyy-MM-dd')}`;
    }

    // Generate CSV
    if (format === 'csv') {
      if (exportData.length === 0) {
        return res.status(404).json({
          error: 'No Data',
          message: 'No data available for the selected criteria'
        });
      }

      const headers = Object.keys(exportData[0]);
      const csvContent = [
        headers.join(','),
        ...exportData.map(row =>
          headers.map(header => {
            const value = row[header];
            // Escape commas and quotes in CSV
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.send(csvContent);

    } else {
      // For now, only CSV is supported
      res.status(400).json({
        error: 'Unsupported Format',
        message: 'Only CSV export is currently supported'
      });
    }

  } catch (error) {
    console.error('Error exporting reports:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid query parameters',
        details: error.errors
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to export reports'
    });
  }
});

// GET /api/reports/analytics - Get advanced analytics and trends
router.get('/analytics', authenticate, requireRole([UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN]), async (req, res) => {
  try {
    const user = req.user!;
    const branchId = checkBranchAccess(user, req.query.branchId as string);

    // Get date ranges for comparison
    const now = new Date();
    const currentMonth = {
      start: startOfMonth(now),
      end: endOfMonth(now)
    };
    const lastMonth = {
      start: startOfMonth(subDays(now, 30)),
      end: endOfMonth(subDays(now, 30))
    };

    // Build base where clause
    const buildWhere = (dateRange: { start: Date; end: Date }) => ({
      slot: {
        date: {
          gte: dateRange.start,
          lte: dateRange.end
        },
        ...(branchId && { branchId })
      }
    });

    const [
      currentMonthBookings,
      lastMonthBookings,
      currentMonthAttendance,
      lastMonthAttendance,
      peakHoursData,
      teacherPerformance,
      studentEngagement,
      noShowPatterns,
      bookingTrends
    ] = await Promise.all([
      // Current month bookings
      prisma.booking.count({
        where: buildWhere(currentMonth)
      }),

      // Last month bookings
      prisma.booking.count({
        where: buildWhere(lastMonth)
      }),

      // Current month attendance
      prisma.booking.count({
        where: {
          ...buildWhere(currentMonth),
          status: 'COMPLETED',
          attended: true
        }
      }),

      // Last month attendance
      prisma.booking.count({
        where: {
          ...buildWhere(lastMonth),
          status: 'COMPLETED',
          attended: true
        }
      }),

      // Peak hours analysis
      prisma.slot.groupBy({
        by: ['startTime'],
        where: {
          date: {
            gte: subDays(now, 30),
            lte: now
          },
          ...(branchId && { branchId })
        },
        _count: {
          id: true
        },
        _sum: {
          capacity: true
        }
      }),

      // Teacher performance metrics
      prisma.user.findMany({
        where: {
          role: UserRole.TEACHER,
          isActive: true,
          ...(branchId && { branchId })
        },
        select: {
          id: true,
          name: true
        }
      }),

      // Student engagement patterns
      prisma.user.findMany({
        where: {
          role: UserRole.STUDENT,
          isActive: true,
          ...(branchId && { branchId })
        },
        select: {
          id: true,
          name: true,
          bookings: {
            where: {
              slot: {
                date: {
                  gte: subDays(now, 30),
                  lte: now
                }
              }
            },
            select: {
              status: true,
              attended: true,
              bookedAt: true
            }
          }
        }
      }),

      // No-show patterns by day of week
      prisma.booking.findMany({
        where: {
          ...buildWhere({ start: subDays(now, 30), end: now }),
          status: 'NO_SHOW'
        },
        include: {
          slot: {
            select: { date: true }
          }
        }
      }),

      // Daily booking trends (last 30 days)
      prisma.booking.groupBy({
        by: ['bookedAt'],
        where: {
          bookedAt: {
            gte: subDays(now, 30),
            lte: now
          },
          ...(branchId && {
            slot: { branchId }
          })
        },
        _count: true
      })
    ]);

    // Calculate growth rates
    const bookingGrowth = lastMonthBookings > 0
      ? ((currentMonthBookings - lastMonthBookings) / lastMonthBookings) * 100
      : 0;

    const attendanceGrowth = lastMonthAttendance > 0
      ? ((currentMonthAttendance - lastMonthAttendance) / lastMonthAttendance) * 100
      : 0;

    // Process peak hours
    const peakHours = peakHoursData.map(hour => ({
      time: hour.startTime,
      bookings: hour._count?.id || 0,
      capacity: hour._sum?.capacity || 0,
      utilizationRate: (hour._sum?.capacity || 0) > 0 ? ((hour._count?.id || 0) / (hour._sum?.capacity || 1)) * 100 : 0
    })).sort((a, b) => b.utilizationRate - a.utilizationRate);

    // Process teacher performance - simplified for now
    const teacherStats = teacherPerformance.map(teacher => ({
      id: teacher.id,
      name: teacher.name,
      utilizationRate: 75, // Mock data - would calculate from actual slots
      attendanceRate: 85, // Mock data - would calculate from actual bookings
      totalSessions: 10, // Mock data
      totalBookings: 12 // Mock data
    })).sort((a, b) => b.utilizationRate - a.utilizationRate);

    // Process student engagement
    const studentStats = studentEngagement.map(student => {
      const bookings = student.bookings;
      const attendedCount = bookings.filter(b => b.attended === true).length;
      const completedCount = bookings.filter(b => b.status === 'COMPLETED' || b.status === 'NO_SHOW').length;

      return {
        id: student.id,
        name: student.name,
        totalBookings: bookings.length,
        attendanceRate: completedCount > 0 ? (attendedCount / completedCount) * 100 : 0,
        lastBooking: bookings.length > 0 ? Math.max(...bookings.map(b => new Date(b.bookedAt).getTime())) : null
      };
    }).filter(student => student.totalBookings > 0)
      .sort((a, b) => b.totalBookings - a.totalBookings);

    // Process no-show patterns by day of week
    const noShowByDay = Array.from({ length: 7 }, (_, i) => ({
      day: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][i],
      count: 0
    }));

    noShowPatterns.forEach(booking => {
      const dayOfWeek = new Date(booking.slot.date).getDay();
      noShowByDay[dayOfWeek].count++;
    });

    // Process booking trends (group by date)
    const trendsByDate = bookingTrends.reduce((acc: any, booking) => {
      const date = formatDate(new Date(booking.bookedAt), 'yyyy-MM-dd');
      acc[date] = (acc[date] || 0) + booking._count;
      return acc;
    }, {});

    const bookingTrendData = Object.entries(trendsByDate).map(([date, count]) => ({
      date,
      bookings: count
    })).sort((a, b) => a.date.localeCompare(b.date));

    const analytics = {
      growth: {
        bookingGrowth: Math.round(bookingGrowth * 100) / 100,
        attendanceGrowth: Math.round(attendanceGrowth * 100) / 100
      },
      peakHours: peakHours.slice(0, 5), // Top 5 peak hours
      teacherPerformance: teacherStats.slice(0, 10), // Top 10 teachers
      studentEngagement: {
        topStudents: studentStats.slice(0, 10), // Top 10 most active students
        averageBookingsPerStudent: studentStats.length > 0
          ? Math.round((studentStats.reduce((sum, s) => sum + s.totalBookings, 0) / studentStats.length) * 100) / 100
          : 0
      },
      noShowPatterns: noShowByDay,
      bookingTrends: bookingTrendData,
      insights: {
        mostPopularTime: peakHours[0]?.time || null,
        bestPerformingTeacher: teacherStats[0]?.name || null,
        worstNoShowDay: noShowByDay.reduce((max, day) => day.count > max.count ? day : max, noShowByDay[0])?.day || null
      }
    };

    res.json(analytics);

  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch analytics data'
    });
  }
});

// GET /api/reports/real-time - Get real-time dashboard metrics
router.get('/real-time', authenticate, async (req, res) => {
  try {
    const user = req.user!;
    const branchId = checkBranchAccess(user, req.query.branchId as string);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const [
      todayBookings,
      todayAttendance,
      activeSlots,
      pendingBookings,
      recentActivity,
      systemAlerts
    ] = await Promise.all([
      // Today's bookings
      prisma.booking.count({
        where: {
          slot: {
            date: {
              gte: today,
              lt: tomorrow
            },
            ...(branchId && { branchId })
          }
        }
      }),

      // Today's attendance
      prisma.booking.count({
        where: {
          slot: {
            date: {
              gte: today,
              lt: tomorrow
            },
            ...(branchId && { branchId })
          },
          status: 'COMPLETED',
          attended: true
        }
      }),

      // Active slots today
      prisma.slot.count({
        where: {
          date: {
            gte: today,
            lt: tomorrow
          },
          ...(branchId && { branchId })
        }
      }),

      // Pending bookings (confirmed but not yet completed)
      prisma.booking.count({
        where: {
          status: 'CONFIRMED',
          slot: {
            date: { gte: new Date() },
            ...(branchId && { branchId })
          }
        }
      }),

      // Recent activity (last 24 hours)
      prisma.booking.findMany({
        where: {
          bookedAt: {
            gte: subDays(new Date(), 1)
          },
          ...(branchId && {
            slot: { branchId }
          })
        },
        include: {
          student: { select: { name: true } },
          slot: {
            include: {
              teacher: { select: { name: true } },
              branch: { select: { name: true } }
            }
          }
        },
        orderBy: { bookedAt: 'desc' },
        take: 10
      }),

      // System alerts (mock for now - would come from monitoring)
      Promise.resolve([
        ...(Math.random() > 0.7 ? [{
          type: 'warning',
          message: 'High booking volume detected',
          timestamp: new Date()
        }] : []),
        ...(Math.random() > 0.8 ? [{
          type: 'info',
          message: 'System maintenance scheduled',
          timestamp: new Date()
        }] : [])
      ])
    ]);

    const realTimeData = {
      todayMetrics: {
        bookings: todayBookings,
        attendance: todayAttendance,
        activeSlots,
        pendingBookings
      },
      recentActivity: recentActivity.map(booking => ({
        type: booking.status === 'CANCELLED' ? 'cancellation' : 'booking',
        description: `${booking.student?.name} ${booking.status === 'CANCELLED' ? 'cancelled' : 'booked'} session with ${booking.slot.teacher?.name}`,
        branchName: booking.slot.branch?.name,
        timestamp: booking.bookedAt
      })),
      systemAlerts,
      lastUpdated: new Date()
    };

    res.json(realTimeData);

  } catch (error) {
    console.error('Error fetching real-time data:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch real-time data'
    });
  }
});

// GET /api/reports/no-show-analysis - Detailed no-show pattern analysis
router.get('/no-show-analysis', authenticate, requireRole([UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN]), async (req, res) => {
  try {
    const user = req.user!;
    const branchId = checkBranchAccess(user, req.query.branchId as string);

    const { days = '30' } = req.query;
    const daysBack = parseInt(days as string);
    const startDate = subDays(new Date(), daysBack);

    const [
      noShowsByStudent,
      noShowsByTeacher,
      noShowsByTimeSlot,
      noShowsByBranch,
      repeatOffenders
    ] = await Promise.all([
      // No-shows by student
      prisma.booking.groupBy({
        by: ['studentId'],
        where: {
          status: 'NO_SHOW',
          slot: {
            date: { gte: startDate },
            ...(branchId && { branchId })
          }
        },
        _count: true,
        orderBy: { _count: { studentId: 'desc' } }
      }),

      // No-shows by teacher - simplified query
      prisma.booking.findMany({
        where: {
          status: 'NO_SHOW',
          slot: {
            date: { gte: startDate },
            ...(branchId && { branchId })
          }
        },
        include: {
          slot: {
            select: { teacherId: true }
          }
        }
      }),

      // No-shows by time slot
      prisma.booking.findMany({
        where: {
          status: 'NO_SHOW',
          slot: {
            date: { gte: startDate },
            ...(branchId && { branchId })
          }
        },
        include: {
          slot: { select: { startTime: true, endTime: true } }
        }
      }),

      // No-shows by branch (for super admin) - simplified
      user.role === UserRole.SUPER_ADMIN ? prisma.booking.findMany({
        where: {
          status: 'NO_SHOW',
          slot: {
            date: { gte: startDate }
          }
        },
        include: {
          slot: {
            select: { branchId: true }
          }
        }
      }) : [],

      // Repeat offenders (students with multiple no-shows)
      prisma.user.findMany({
        where: {
          role: UserRole.STUDENT,
          bookings: {
            some: {
              status: 'NO_SHOW',
              slot: {
                date: { gte: startDate },
                ...(branchId && { branchId })
              }
            }
          }
        },
        select: {
          id: true,
          name: true,
          phoneNumber: true,
          bookings: {
            where: {
              status: 'NO_SHOW',
              slot: {
                date: { gte: startDate },
                ...(branchId && { branchId })
              }
            },
            select: { id: true }
          }
        }
      })
    ]);

    // Process time slot patterns
    const timeSlotPatterns = noShowsByTimeSlot.reduce((acc: any, booking) => {
      const timeKey = `${booking.slot.startTime}-${booking.slot.endTime}`;
      acc[timeKey] = (acc[timeKey] || 0) + 1;
      return acc;
    }, {});

    const analysis = {
      summary: {
        totalNoShows: noShowsByStudent.reduce((sum, item) => sum + item._count, 0),
        uniqueStudents: noShowsByStudent.length,
        averageNoShowsPerStudent: noShowsByStudent.length > 0
          ? Math.round((noShowsByStudent.reduce((sum, item) => sum + item._count, 0) / noShowsByStudent.length) * 100) / 100
          : 0
      },
      patterns: {
        byTimeSlot: Object.entries(timeSlotPatterns)
          .map(([time, count]) => ({ time, count }))
          .sort((a: any, b: any) => b.count - a.count),
        byDayOfWeek: [], // Would need additional processing
        repeatOffenders: repeatOffenders
          .filter(student => student.bookings.length >= 2)
          .map(student => ({
            name: student.name,
            phoneNumber: student.phoneNumber,
            noShowCount: student.bookings.length
          }))
          .sort((a, b) => b.noShowCount - a.noShowCount)
      },
      recommendations: [
        ...(repeatOffenders.filter(s => s.bookings.length >= 3).length > 0 ?
          ['Consider implementing penalties for repeat no-show offenders'] : []),
        ...(Object.values(timeSlotPatterns).some((count: any) => count > 5) ?
          ['Review popular time slots with high no-show rates'] : []),
        'Send additional reminders for high-risk time slots',
        'Implement booking confirmation system 2 hours before session'
      ]
    };

    res.json(analysis);

  } catch (error) {
    console.error('Error fetching no-show analysis:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch no-show analysis'
    });
  }
});

export default router;