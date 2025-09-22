// Test setup and utilities for comprehensive testing suite
import { PrismaClient } from '@prisma/client';
import { generateToken } from '../utils/jwt';
import { hashPassword } from '../utils/password';

export const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
    }
  }
});

export interface TestUser {
  id: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  role: 'SUPER_ADMIN' | 'BRANCH_ADMIN' | 'TEACHER' | 'STUDENT';
  branchId?: string;
  token: string;
}

export interface TestBranch {
  id: string;
  name: string;
  address: string;
  contactNumber: string;
}

export interface TestSlot {
  id: string;
  branchId: string;
  teacherId: string;
  date: Date;
  startTime: string;
  endTime: string;
  capacity: number;
}

export interface TestBooking {
  id: string;
  studentId: string;
  slotId: string;
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
}

export class TestDataManager {
  private branches: TestBranch[] = [];
  private users: TestUser[] = [];
  private slots: TestSlot[] = [];
  private bookings: TestBooking[] = [];

  async cleanup() {
    // Clean up in reverse dependency order
    await testPrisma.auditLog.deleteMany();
    await testPrisma.systemSetting.deleteMany();
    await testPrisma.notification.deleteMany();
    await testPrisma.assessment.deleteMany();
    await testPrisma.booking.deleteMany();
    await testPrisma.slot.deleteMany();
    await testPrisma.user.deleteMany();
    await testPrisma.branch.deleteMany();
    
    // Reset internal arrays
    this.branches = [];
    this.users = [];
    this.slots = [];
    this.bookings = [];
  }

  async createTestBranches(): Promise<TestBranch[]> {
    const branchData = [
      {
        name: 'Dhaka Branch',
        address: 'Dhaka, Bangladesh',
        contactNumber: '+8801711111111'
      },
      {
        name: 'Chittagong Branch', 
        address: 'Chittagong, Bangladesh',
        contactNumber: '+8801722222222'
      },
      {
        name: 'Sylhet Branch',
        address: 'Sylhet, Bangladesh', 
        contactNumber: '+8801733333333'
      }
    ];

    for (const data of branchData) {
      const branch = await testPrisma.branch.create({ data });
      this.branches.push(branch);
    }

    return this.branches;
  }

  async createTestUsers(): Promise<TestUser[]> {
    if (this.branches.length === 0) {
      await this.createTestBranches();
    }

    const hashedPassword = await hashPassword('password123');

    const userData = [
      // Super Admin
      {
        name: 'Super Admin',
        email: 'superadmin@test.com',
        role: 'SUPER_ADMIN' as const,
        branchId: null,
        hashedPassword
      },
      // Branch Admins
      {
        name: 'Dhaka Admin',
        email: 'dhaka.admin@test.com',
        role: 'BRANCH_ADMIN' as const,
        branchId: this.branches[0].id,
        hashedPassword
      },
      {
        name: 'Chittagong Admin',
        email: 'chittagong.admin@test.com',
        role: 'BRANCH_ADMIN' as const,
        branchId: this.branches[1].id,
        hashedPassword
      },
      // Teachers
      {
        name: 'Dhaka Teacher 1',
        email: 'dhaka.teacher1@test.com',
        role: 'TEACHER' as const,
        branchId: this.branches[0].id,
        hashedPassword
      },
      {
        name: 'Dhaka Teacher 2',
        email: 'dhaka.teacher2@test.com',
        role: 'TEACHER' as const,
        branchId: this.branches[0].id,
        hashedPassword
      },
      {
        name: 'Chittagong Teacher 1',
        email: 'chittagong.teacher1@test.com',
        role: 'TEACHER' as const,
        branchId: this.branches[1].id,
        hashedPassword
      },
      // Students
      {
        name: 'Student 1',
        phoneNumber: '+8801711111001',
        role: 'STUDENT' as const,
        branchId: this.branches[0].id
      },
      {
        name: 'Student 2',
        phoneNumber: '+8801711111002',
        role: 'STUDENT' as const,
        branchId: this.branches[0].id
      },
      {
        name: 'Student 3',
        phoneNumber: '+8801722222001',
        role: 'STUDENT' as const,
        branchId: this.branches[1].id
      },
      {
        name: 'Student 4',
        phoneNumber: '+8801722222002',
        role: 'STUDENT' as const,
        branchId: this.branches[1].id
      }
    ];

    for (const data of userData) {
      const user = await testPrisma.user.create({ data });
      const token = generateToken({
        userId: user.id,
        role: user.role,
        branchId: user.branchId,
        phoneNumber: user.phoneNumber,
        email: user.email
      });

      this.users.push({
        ...user,
        token
      });
    }

    return this.users;
  }

  async createTestSlots(): Promise<TestSlot[]> {
    if (this.users.length === 0) {
      await this.createTestUsers();
    }

    const teachers = this.users.filter(u => u.role === 'TEACHER');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

    const slotData = [
      // Dhaka Branch slots
      {
        branchId: this.branches[0].id,
        teacherId: teachers[0].id, // Dhaka Teacher 1
        date: tomorrow,
        startTime: '09:00',
        endTime: '09:30',
        capacity: 2
      },
      {
        branchId: this.branches[0].id,
        teacherId: teachers[0].id,
        date: tomorrow,
        startTime: '10:00',
        endTime: '10:30',
        capacity: 1
      },
      {
        branchId: this.branches[0].id,
        teacherId: teachers[1].id, // Dhaka Teacher 2
        date: dayAfterTomorrow,
        startTime: '14:00',
        endTime: '14:30',
        capacity: 2
      },
      // Chittagong Branch slots
      {
        branchId: this.branches[1].id,
        teacherId: teachers[2].id, // Chittagong Teacher 1
        date: tomorrow,
        startTime: '11:00',
        endTime: '11:30',
        capacity: 1
      },
      {
        branchId: this.branches[1].id,
        teacherId: teachers[2].id,
        date: dayAfterTomorrow,
        startTime: '15:00',
        endTime: '15:30',
        capacity: 2
      }
    ];

    for (const data of slotData) {
      const slot = await testPrisma.slot.create({ data });
      this.slots.push(slot);
    }

    return this.slots;
  }

  async createTestBookings(): Promise<TestBooking[]> {
    if (this.slots.length === 0) {
      await this.createTestSlots();
    }

    const students = this.users.filter(u => u.role === 'STUDENT');

    const bookingData = [
      {
        studentId: students[0].id, // Student 1 (Dhaka)
        slotId: this.slots[0].id,   // Dhaka slot
        status: 'CONFIRMED' as const
      },
      {
        studentId: students[2].id, // Student 3 (Chittagong)
        slotId: this.slots[3].id,   // Chittagong slot
        status: 'CONFIRMED' as const
      }
    ];

    for (const data of bookingData) {
      const booking = await testPrisma.booking.create({ data });
      this.bookings.push(booking);
    }

    return this.bookings;
  }

  // Getters for test data
  getBranches(): TestBranch[] { return this.branches; }
  getUsers(): TestUser[] { return this.users; }
  getSlots(): TestSlot[] { return this.slots; }
  getBookings(): TestBooking[] { return this.bookings; }

  getUserByRole(role: string): TestUser | undefined {
    return this.users.find(u => u.role === role);
  }

  getUsersByRole(role: string): TestUser[] {
    return this.users.filter(u => u.role === role);
  }

  getUserByBranch(branchId: string): TestUser[] {
    return this.users.filter(u => u.branchId === branchId);
  }

  getSlotsByBranch(branchId: string): TestSlot[] {
    return this.slots.filter(s => s.branchId === branchId);
  }
}

export const testDataManager = new TestDataManager();

// Helper function to format test results
export function formatTestResult(testName: string, success: boolean, message: string, data?: any): void {
  const status = success ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} ${testName}: ${message}`);
  if (data && !success) {
    console.log('   Error details:', data);
  }
  if (data && success && process.env.VERBOSE_TESTS) {
    console.log('   Data:', data);
  }
}

// Helper function to simulate API delay
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}