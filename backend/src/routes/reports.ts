import express from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth } from 'date-fns';

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
        Date: format(new Date(booking.slot.date), 'yyyy-MM-dd'),
        Time: `${booking.slot.startTime} - ${booking.slot.endTime}`,
        Student: booking.student?.name || 'N/A',
        Phone: booking.student?.phoneNumber || 'N/A',
        Teacher: booking.slot.teacher?.name || 'N/A',
        Branch: booking.slot.branch?.name || 'N/A',
        Status: booking.status,
        Attended: booking.attended ? 'Yes' : 'No'
      }));

      filename = `attendance_report_${format(new Date(), 'yyyy-MM-dd')}`;

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
        Date: format(new Date(slot.date), 'yyyy-MM-dd'),
        Time: `${slot.startTime} - ${slot.endTime}`,
        Teacher: slot.teacher?.name || 'N/A',
        Branch: slot.branch?.name || 'N/A',
        Capacity: slot.capacity,
        Booked: slot.bookings.length,
        Available: slot.capacity - slot.bookings.length,
        'Utilization %': slot.capacity > 0 ? Math.round((slot.bookings.length / slot.capacity) * 100) : 0
      }));

      filename = `utilization_report_${format(new Date(), 'yyyy-MM-dd')}`;

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
        Date: format(new Date(assessment.assessedAt), 'yyyy-MM-dd'),
        Student: assessment.student?.name || 'N/A',
        Phone: assessment.student?.phoneNumber || 'N/A',
        Teacher: assessment.teacher?.name || 'N/A',
        Branch: assessment.booking?.slot?.branch?.name || 'N/A',
        Score: assessment.score,
        Remarks: assessment.remarks || ''
      }));

      filename = `assessments_report_${format(new Date(), 'yyyy-MM-dd')}`;
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

export default router;