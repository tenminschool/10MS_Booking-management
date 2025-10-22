/**
 * Mock Authentication System for Development/Testing
 * This provides authentication without requiring database connection
 */

import { generateToken } from '../utils/jwt';

// Mock users for testing
const mockUsers = {
  // Staff users
  'admin@10minuteschool.com': {
    id: 'mock-super-admin-id',
    name: 'Super Admin',
    email: 'admin@10minuteschool.com',
    role: 'SUPER_ADMIN',
    branchId: null,
    branch: null,
    password: 'admin123'
  },
  'dhanmondi@10minuteschool.com': {
    id: 'mock-branch-admin-id',
    name: 'Dhanmondi Admin',
    email: 'dhanmondi@10minuteschool.com',
    role: 'BRANCH_ADMIN',
    branchId: 'mock-branch-1',
    branch: { id: 'mock-branch-1', name: 'Dhanmondi Branch' },
    password: 'admin123'
  },
  'sarah@10minuteschool.com': {
    id: 'mock-teacher-id',
    name: 'Sarah Ahmed',
    email: 'sarah@10minuteschool.com',
    role: 'TEACHER',
    branchId: 'mock-branch-1',
    branch: { id: 'mock-branch-1', name: 'Dhanmondi Branch' },
    password: 'teacher123'
  }
};

// Mock students
const mockStudents = {
  '+8801712345678': {
    id: 'mock-student-1-id',
    name: 'Ahmed Rahman',
    phoneNumber: '+8801712345678',
    role: 'STUDENT',
    branchId: null,
    branch: null
  },
  '+8801812345678': {
    id: 'mock-student-2-id',
    name: 'Fatima Khan',
    phoneNumber: '+8801812345678',
    role: 'STUDENT',
    branchId: null,
    branch: null
  }
};

// Mock student email credentials
const mockStudentEmails = {
  'student@10minuteschool.com': {
    id: 'mock-student-email-id',
    name: 'Student User',
    email: 'student@10minuteschool.com',
    role: 'STUDENT',
    branchId: null,
    branch: null,
    password: 'student123'
  }
};

export const mockAuth = {
  // Mock staff login
  loginStaff: async (email: string, password: string) => {
    const user = mockUsers[email as keyof typeof mockUsers];
    
    if (!user || user.password !== password) {
      throw new Error('Invalid email or password');
    }

    const token = generateToken({
      userId: user.id,
      role: user.role as any,
      branchId: user.branchId || undefined,
      email: user.email,
    });

    return {
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          branchId: user.branchId,
          branch: user.branch
        },
        token,
        expiresIn: '24h'
      }
    };
  },

  // Mock OTP request
  requestOTP: async (phoneNumber: string) => {
    const student = mockStudents[phoneNumber as keyof typeof mockStudents];
    
    if (!student) {
      throw new Error('Student not found');
    }

    // In real implementation, this would send SMS
    console.log(`📱 Mock SMS sent to ${phoneNumber}: Your OTP is 123456`);
    
    return {
      message: 'OTP sent successfully',
      phoneNumber,
      expiresIn: '5 minutes'
    };
  },

  // Mock student email login
  loginStudent: async (email: string, password: string) => {
    const user = mockStudentEmails[email as keyof typeof mockStudentEmails];
    
    if (!user || user.password !== password) {
      throw new Error('Invalid email or password');
    }

    const token = generateToken({
      userId: user.id,
      role: user.role as any,
      email: user.email,
    });

    return {
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          branchId: user.branchId,
          branch: user.branch
        },
        token,
        expiresIn: '24h'
      }
    };
  },

  // Mock OTP verification
  verifyOTP: async (phoneNumber: string, otp: string) => {
    const student = mockStudents[phoneNumber as keyof typeof mockStudents];
    
    if (!student) {
      throw new Error('Student not found');
    }

    // Accept any 6-digit OTP for testing
    if (!/^\d{6}$/.test(otp)) {
      throw new Error('Invalid OTP format');
    }

    const token = generateToken({
      userId: student.id,
      role: student.role as any,
      phoneNumber: student.phoneNumber,
    });

    return {
      data: {
        user: {
          id: student.id,
          name: student.name,
          phoneNumber: student.phoneNumber,
          role: student.role,
          branchId: student.branchId,
          branch: student.branch
        },
        token,
        expiresIn: '24h'
      }
    };
  }
};

export default mockAuth;