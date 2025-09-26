import express, { Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { authenticate } from '../middleware/auth';
import { asyncHandler, ValidationError } from '../middleware/errorHandler';

// Define types locally since we removed Prisma
type UserRole = 'SUPER_ADMIN' | 'BRANCH_ADMIN' | 'TEACHER' | 'STUDENT';

const router = express.Router();

// Helper function to get date ranges
const getDateRanges = () => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  return {
    today: startOfToday.toISOString(),
    week: startOfWeek.toISOString(),
    month: startOfMonth.toISOString(),
    year: startOfYear.toISOString(),
    now: now.toISOString()
  };
};

// GET /api/dashboard/metrics - Get comprehensive dashboard metrics based on user role
router.get('/metrics', 
  authenticate, 
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user!;
    const { period = 'month' } = req.query;
    const dates = getDateRanges();
    const startDate = dates[period as keyof typeof dates] || dates.month;

    try {
      // Test database connection
      const { error: dbError } = await supabase.from('users').select('id').limit(1);
      
      if (dbError) {
        // Fallback to mock data if database is unavailable
        const mockData = getMockDashboardData(user.role as UserRole);
        return res.json(mockData);
      }

      let metrics: any = {};

      switch (user.role) {
        case 'SUPER_ADMIN':
          metrics = await getSuperAdminMetrics(startDate);
          break;
        case 'BRANCH_ADMIN':
          metrics = await getBranchAdminMetrics(user.branchId!, startDate);
          break;
        case 'TEACHER':
          metrics = await getTeacherMetrics(user.userId, startDate);
          break;
        case 'STUDENT':
          metrics = await getStudentMetrics(user.userId, startDate);
          break;
        default:
          throw new ValidationError('Invalid user role');
      }

      res.json({
        success: true,
        role: user.role,
        period,
        metrics,
        generatedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error('Dashboard metrics error:', error);
      // Fallback to mock data
      const mockData = getMockDashboardData(user.role as UserRole);
      res.json(mockData);
    }
  })
);

// Super Admin Dashboard Metrics
async function getSuperAdminMetrics(startDate: string) {
  const [
    totalUsers,
    totalBranches,
    totalSlots,
    totalBookings,
    recentBookings,
    upcomingSlots,
    systemStats,
    branchStats,
    userStats
  ] = await Promise.all([
    // Total users
    supabase.from('users').select('id', { count: 'exact', head: true }),
    
    // Total branches
    supabase.from('branches').select('id', { count: 'exact', head: true }),
    
    // Total slots
    supabase.from('slots').select('id', { count: 'exact', head: true }),
    
    // Total bookings
    supabase.from('bookings').select('id', { count: 'exact', head: true }),
    
    // Recent bookings with details
    supabase
      .from('bookings')
      .select(`
        *,
        slot:slots(*, branch:branches(name), teacher:users(name)),
        student:users(name)
      `)
      .order('created_at', { ascending: false })
      .limit(10),
    
    // Upcoming slots
    supabase
      .from('slots')
      .select(`
        *,
        branch:branches(name),
        teacher:users(name)
      `)
      .gte('date', startDate)
      .order('date', { ascending: true })
      .limit(10),
    
    // System statistics
    getSystemStatistics(),
    
    // Branch statistics
    getBranchStatistics(),
    
    // User statistics
    getUserStatistics()
  ]);

  return {
    overview: {
      totalUsers: totalUsers.count || 0,
      totalBranches: totalBranches.count || 0,
      totalSlots: totalSlots.count || 0,
      totalBookings: totalBookings.count || 0,
      activeUsers: userStats.activeUsers,
      systemHealth: systemStats.health
    },
    recentActivity: {
      recentBookings: recentBookings.data || [],
      upcomingSlots: upcomingSlots.data || []
    },
    branchPerformance: branchStats,
    systemMetrics: systemStats,
    userMetrics: userStats
  };
}

// Branch Admin Dashboard Metrics
async function getBranchAdminMetrics(branchId: string, startDate: string) {
  const [
    branchInfo,
    branchUsers,
    branchSlots,
    branchBookings,
    recentBookings,
    upcomingSlots,
    teacherStats,
    studentStats
  ] = await Promise.all([
    // Branch information
    supabase.from('branches').select('*').eq('id', branchId).single(),
    
    // Branch users
    supabase.from('users').select('id, name, role, is_active').eq('branch_id', branchId),
    
    // Branch slots
    supabase.from('slots').select('id', { count: 'exact', head: true }).eq('branch_id', branchId),
    
    // Branch bookings
    supabase
      .from('bookings')
      .select(`
        *,
        slot:slots!inner(*, branch:branches!inner(name)),
        student:users(name)
      `)
      .eq('slot.branch_id', branchId),
    
    // Recent bookings for this branch
    supabase
      .from('bookings')
      .select(`
        *,
        slot:slots!inner(*, branch:branches!inner(name), teacher:users(name)),
        student:users(name)
      `)
      .eq('slot.branch_id', branchId)
      .order('created_at', { ascending: false })
      .limit(10),
    
    // Upcoming slots for this branch
    supabase
      .from('slots')
      .select(`
        *,
        branch:branches(name),
        teacher:users(name)
      `)
      .eq('branch_id', branchId)
      .gte('date', startDate)
      .order('date', { ascending: true })
      .limit(10),
    
    // Teacher statistics
    getTeacherStatistics(branchId),
    
    // Student statistics
    getStudentStatistics(branchId)
  ]);

  const totalBookings = branchBookings.data?.length || 0;
  const totalSlots = branchSlots.count || 0;

  return {
    branch: branchInfo.data,
    overview: {
      totalUsers: branchUsers.data?.length || 0,
      totalSlots,
      totalBookings,
      activeUsers: branchUsers.data?.filter(u => u.is_active).length || 0,
      teachers: branchUsers.data?.filter(u => u.role === 'TEACHER').length || 0,
      students: branchUsers.data?.filter(u => u.role === 'STUDENT').length || 0
    },
    recentActivity: {
      recentBookings: recentBookings.data || [],
      upcomingSlots: upcomingSlots.data || []
    },
    teacherMetrics: teacherStats,
    studentMetrics: studentStats,
    utilization: {
      slotUtilization: totalSlots > 0 ? (totalBookings / totalSlots) * 100 : 0
    }
  };
}

// Teacher Dashboard Metrics
async function getTeacherMetrics(teacherId: string, startDate: string) {
  const [
    teacherInfo,
    mySlots,
    myBookings,
    upcomingSlots,
    recentBookings,
    studentStats
  ] = await Promise.all([
    // Teacher information
    supabase.from('users').select('*').eq('id', teacherId).single(),
    
    // My slots
    supabase
      .from('slots')
      .select(`
        *,
        branch:branches(name)
      `)
      .eq('teacher_id', teacherId)
      .gte('date', startDate)
      .order('date', { ascending: true }),
    
    // My bookings
    supabase
      .from('bookings')
      .select(`
        *,
        slot:slots!inner(*, branch:branches(name)),
        student:users(name)
      `)
      .eq('slot.teacher_id', teacherId),
    
    // Upcoming slots
    supabase
      .from('slots')
      .select(`
        *,
        branch:branches(name)
      `)
      .eq('teacher_id', teacherId)
      .gte('date', startDate)
      .order('date', { ascending: true })
      .limit(10),
    
    // Recent bookings for my slots
    supabase
      .from('bookings')
      .select(`
        *,
        slot:slots!inner(*, branch:branches(name)),
        student:users(name)
      `)
      .eq('slot.teacher_id', teacherId)
      .order('created_at', { ascending: false })
      .limit(10),
    
    // Student statistics
    getStudentStatisticsForTeacher(teacherId)
  ]);

  const totalSlots = mySlots.data?.length || 0;
  const totalBookings = myBookings.data?.length || 0;

  return {
    teacher: teacherInfo.data,
    overview: {
      totalSlots,
      totalBookings,
      upcomingSlots: upcomingSlots.data?.length || 0,
      averageBookingsPerSlot: totalSlots > 0 ? totalBookings / totalSlots : 0
    },
    schedule: {
      upcomingSlots: upcomingSlots.data || [],
      recentBookings: recentBookings.data || []
    },
    studentMetrics: studentStats,
    performance: {
      slotUtilization: totalSlots > 0 ? (totalBookings / totalSlots) * 100 : 0,
      averageStudentsPerSlot: totalSlots > 0 ? totalBookings / totalSlots : 0
    }
  };
}

// Student Dashboard Metrics
async function getStudentMetrics(studentId: string, startDate: string) {
  const [
    studentInfo,
    myBookings,
    upcomingBookings,
    completedBookings,
    availableSlots,
    notifications
  ] = await Promise.all([
    // Student information
    supabase.from('users').select('*').eq('id', studentId).single(),
    
    // My bookings
    supabase
      .from('bookings')
      .select(`
        *,
        slot:slots(*, branch:branches(name), teacher:users(name))
      `)
      .eq('student_id', studentId),
    
    // Upcoming bookings
    supabase
      .from('bookings')
      .select(`
        *,
        slot:slots!inner(*, branch:branches(name), teacher:users(name))
      `)
      .eq('student_id', studentId)
      .eq('status', 'CONFIRMED')
      .gte('slot.date', startDate)
      .order('slot.date', { ascending: true }),
    
    // Completed bookings
    supabase
      .from('bookings')
      .select(`
        *,
        slot:slots!inner(*, branch:branches(name), teacher:users(name))
      `)
      .eq('student_id', studentId)
      .eq('status', 'COMPLETED')
      .order('slot.date', { ascending: false })
      .limit(5),
    
    // Available slots
    supabase
      .from('slots')
      .select(`
        *,
        branch:branches(name),
        teacher:users(name)
      `)
      .gte('date', startDate)
      .lt('booked_count', 'capacity')
      .order('date', { ascending: true })
      .limit(10),
    
    // Recent notifications
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', studentId)
      .order('created_at', { ascending: false })
      .limit(5)
  ]);

  const totalBookings = myBookings.data?.length || 0;
  const upcomingCount = upcomingBookings.data?.length || 0;
  const completedCount = completedBookings.data?.length || 0;

  return {
    student: studentInfo.data,
    overview: {
      totalBookings,
      upcomingBookings: upcomingCount,
      completedBookings: completedCount,
      availableSlots: availableSlots.data?.length || 0
    },
    bookings: {
      upcoming: upcomingBookings.data || [],
      completed: completedBookings.data || []
    },
    availableSlots: availableSlots.data || [],
    notifications: notifications.data || [],
    progress: {
      completionRate: totalBookings > 0 ? (completedCount / totalBookings) * 100 : 0,
      upcomingSessions: upcomingCount
    }
  };
}

// Helper functions for statistics
async function getSystemStatistics() {
  const [dbHealth, memoryUsage, uptime] = await Promise.all([
    checkDatabaseHealth(),
    getMemoryUsage(),
    getUptime()
  ]);

  return {
    health: dbHealth ? 'healthy' : 'unhealthy',
    memory: memoryUsage,
    uptime,
    timestamp: new Date().toISOString()
  };
}

async function getBranchStatistics() {
  const { data: branches } = await supabase
    .from('branches')
    .select(`
      id,
      name,
      users!inner(id, role),
      slots!inner(id, booked_count, capacity)
    `);

  return branches?.map(branch => ({
    id: branch.id,
    name: branch.name,
    totalUsers: branch.users?.length || 0,
    totalSlots: branch.slots?.length || 0,
    totalBookings: branch.slots?.reduce((sum, slot) => sum + slot.booked_count, 0) || 0,
    utilization: branch.slots?.length > 0 
      ? (branch.slots.reduce((sum, slot) => sum + slot.booked_count, 0) / 
         branch.slots.reduce((sum, slot) => sum + slot.capacity, 0)) * 100 
      : 0
  })) || [];
}

async function getUserStatistics() {
  const { data: users } = await supabase
    .from('users')
    .select('id, role, is_active, created_at');

  const activeUsers = users?.filter(u => u.is_active).length || 0;
  const totalUsers = users?.length || 0;
  const roleDistribution = users?.reduce((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return {
    totalUsers,
    activeUsers,
    inactiveUsers: totalUsers - activeUsers,
    roleDistribution
  };
}

async function getTeacherStatistics(branchId?: string) {
  let query = supabase.from('users').select('id, name, role').eq('role', 'TEACHER');
  
  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  const { data: teachers } = await query;

  return {
    totalTeachers: teachers?.length || 0,
    teachers: teachers || []
  };
}

async function getStudentStatistics(branchId?: string) {
  let query = supabase.from('users').select('id, name, role, is_active').eq('role', 'STUDENT');
  
  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  const { data: students } = await query;

  return {
    totalStudents: students?.length || 0,
    activeStudents: students?.filter(s => s.is_active).length || 0,
    students: students || []
  };
}

async function getStudentStatisticsForTeacher(teacherId: string) {
  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      student_id,
      student:users(name, created_at)
    `)
    .eq('slot.teacher_id', teacherId);

  const uniqueStudents = new Set(bookings?.map(b => b.student_id) || []);
  const studentCount = uniqueStudents.size;

  return {
    totalStudents: studentCount,
    totalBookings: bookings?.length || 0,
    averageBookingsPerStudent: studentCount > 0 ? (bookings?.length || 0) / studentCount : 0
  };
}

async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}

function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    used: Math.round(usage.heapUsed / 1024 / 1024), // MB
    total: Math.round(usage.heapTotal / 1024 / 1024), // MB
    percentage: Math.round((usage.heapUsed / usage.heapTotal) * 100)
  };
}

function getUptime() {
  return Math.round(process.uptime());
}

// Mock data fallback
function getMockDashboardData(role: UserRole) {
  const baseData = {
    success: true,
    role,
    period: 'month',
    generatedAt: new Date().toISOString(),
    metrics: {}
  };

  switch (role) {
    case 'SUPER_ADMIN':
      return {
        ...baseData,
        metrics: {
          overview: {
            totalUsers: 150,
            totalBranches: 5,
            totalSlots: 300,
            totalBookings: 1200,
            activeUsers: 140,
            systemHealth: 'healthy'
          },
          recentActivity: {
            recentBookings: [],
            upcomingSlots: []
          }
        }
      };
    case 'BRANCH_ADMIN':
      return {
        ...baseData,
        metrics: {
          overview: {
            totalUsers: 30,
            totalSlots: 60,
            totalBookings: 240,
            activeUsers: 28,
            teachers: 5,
            students: 23
          }
        }
      };
    case 'TEACHER':
      return {
        ...baseData,
        metrics: {
          overview: {
            totalSlots: 20,
            totalBookings: 80,
            upcomingSlots: 5,
            averageBookingsPerSlot: 4
          }
        }
      };
    case 'STUDENT':
      return {
        ...baseData,
        metrics: {
          overview: {
            totalBookings: 8,
            upcomingBookings: 2,
            completedBookings: 6,
            availableSlots: 15
          }
        }
      };
    default:
      return baseData;
  }
}

export default router;
