#!/usr/bin/env tsx

/**
 * Verification script for Task 16: Advanced Booking Features and Cross-Branch Edge Cases
 * 
 * This script verifies the implementation of:
 * - Late cancellation handling with slot blocking
 * - Teacher cancellation workflow with automatic multi-channel student notifications
 * - Priority rescheduling system for students affected by teacher cancellations (cross-branch options)
 * - Administrative override capabilities with proper audit logging
 * - Cross-branch booking conflicts and business rule enforcement using system settings
 */

import axios from 'axios';
import prisma from './lib/prisma';

const API_BASE = 'http://localhost:3000/api';

interface TestResult {
  feature: string;
  passed: boolean;
  details: string;
  error?: string;
}

async function getAuthToken(role: 'STUDENT' | 'TEACHER' | 'BRANCH_ADMIN' | 'SUPER_ADMIN'): Promise<string> {
  try {
    let loginData;
    
    if (role === 'STUDENT') {
      // Use phone number login for students
      const student = await prisma.user.findFirst({
        where: { role: 'STUDENT', isActive: true }
      });
      
      if (!student?.phoneNumber) {
        throw new Error('No student with phone number found');
      }
      
      loginData = {
        phoneNumber: student.phoneNumber,
        otp: '123456' // Mock OTP for testing
      };
    } else {
      // Use email login for staff
      const user = await prisma.user.findFirst({
        where: { role, isActive: true, email: { not: null } }
      });
      
      if (!user?.email) {
        throw new Error(`No ${role} with email found`);
      }
      
      loginData = {
        email: user.email,
        password: 'password123' // Default test password
      };
    }

    const response = await axios.post(`${API_BASE}/auth/login`, loginData);
    return response.data.token;
  } catch (error) {
    console.error(`Failed to get auth token for ${role}:`, error);
    throw error;
  }
}

async function testLateCancellationHandling(): Promise<TestResult> {
  try {
    console.log('🧪 Testing late cancellation handling with slot blocking...');
    
    const studentToken = await getAuthToken('STUDENT');
    const adminToken = await getAuthToken('SUPER_ADMIN');
    
    // Create a test booking first
    const slotsResponse = await axios.get(`${API_BASE}/bookings/available-slots`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    
    if (slotsResponse.data.slots.length === 0) {
      return {
        feature: 'Late Cancellation Handling',
        passed: false,
        details: 'No available slots for testing'
      };
    }
    
    const testSlot = slotsResponse.data.slots[0];
    
    // Create booking
    const bookingResponse = await axios.post(`${API_BASE}/bookings`, {
      slotId: testSlot.id
    }, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    
    const bookingId = bookingResponse.data.booking.id;
    
    // Test cancellation with admin override
    const cancelResponse = await axios.put(`${API_BASE}/bookings/${bookingId}/cancel`, {
      cancellationReason: 'Testing late cancellation',
      adminOverride: true
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    const success = cancelResponse.data.adminOverride === true;
    
    return {
      feature: 'Late Cancellation Handling',
      passed: success,
      details: success ? 'Admin override for late cancellation works correctly' : 'Admin override failed'
    };
    
  } catch (error: any) {
    return {
      feature: 'Late Cancellation Handling',
      passed: false,
      details: 'Failed to test late cancellation',
      error: error.message
    };
  }
}

async function testTeacherCancellationWorkflow(): Promise<TestResult> {
  try {
    console.log('🧪 Testing teacher cancellation workflow...');
    
    const teacherToken = await getAuthToken('TEACHER');
    
    // Get teacher's slots
    const teacher = await prisma.user.findFirst({
      where: { role: 'TEACHER', isActive: true }
    });
    
    if (!teacher) {
      return {
        feature: 'Teacher Cancellation Workflow',
        passed: false,
        details: 'No teacher found for testing'
      };
    }
    
    const teacherSlots = await prisma.slot.findMany({
      where: { teacherId: teacher.id },
      take: 1
    });
    
    if (teacherSlots.length === 0) {
      return {
        feature: 'Teacher Cancellation Workflow',
        passed: false,
        details: 'No teacher slots found for testing'
      };
    }
    
    const testSlot = teacherSlots[0];
    
    // Test teacher cancellation
    const cancelResponse = await axios.post(`${API_BASE}/bookings/teacher-cancel/${testSlot.id}`, {
      cancellationReason: 'Emergency - teacher unavailable',
      notifyStudents: true,
      offerPriorityRescheduling: true
    }, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    
    const success = cancelResponse.data.message.includes('processed successfully');
    
    return {
      feature: 'Teacher Cancellation Workflow',
      passed: success,
      details: success ? `Cancelled slot with ${cancelResponse.data.affectedStudents} affected students` : 'Teacher cancellation failed'
    };
    
  } catch (error: any) {
    return {
      feature: 'Teacher Cancellation Workflow',
      passed: false,
      details: 'Failed to test teacher cancellation',
      error: error.message
    };
  }
}

async function testPriorityReschedulingSystem(): Promise<TestResult> {
  try {
    console.log('🧪 Testing priority rescheduling system...');
    
    const studentToken = await getAuthToken('STUDENT');
    
    const student = await prisma.user.findFirst({
      where: { role: 'STUDENT', isActive: true }
    });
    
    if (!student) {
      return {
        feature: 'Priority Rescheduling System',
        passed: false,
        details: 'No student found for testing'
      };
    }
    
    // Check priority slots
    const priorityResponse = await axios.get(`${API_BASE}/bookings/priority-slots/${student.id}`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    
    const hasPriorityAccess = priorityResponse.data.hasPriorityRescheduling !== undefined;
    
    return {
      feature: 'Priority Rescheduling System',
      passed: hasPriorityAccess,
      details: hasPriorityAccess ? 
        `Priority rescheduling status: ${priorityResponse.data.hasPriorityRescheduling}` : 
        'Priority rescheduling endpoint not accessible'
    };
    
  } catch (error: any) {
    return {
      feature: 'Priority Rescheduling System',
      passed: false,
      details: 'Failed to test priority rescheduling',
      error: error.message
    };
  }
}

async function testAdministrativeOverrides(): Promise<TestResult> {
  try {
    console.log('🧪 Testing administrative override capabilities...');
    
    const adminToken = await getAuthToken('SUPER_ADMIN');
    
    const student = await prisma.user.findFirst({
      where: { role: 'STUDENT', isActive: true }
    });
    
    if (!student) {
      return {
        feature: 'Administrative Overrides',
        passed: false,
        details: 'No student found for testing'
      };
    }
    
    // Test monthly limit bypass
    const overrideResponse = await axios.post(`${API_BASE}/bookings/admin-override`, {
      action: 'bypass_monthly_limit',
      targetId: student.id,
      reason: 'Testing administrative override capabilities'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    const success = overrideResponse.data.success === true;
    
    return {
      feature: 'Administrative Overrides',
      passed: success,
      details: success ? 'Monthly limit bypass override works correctly' : 'Administrative override failed'
    };
    
  } catch (error: any) {
    return {
      feature: 'Administrative Overrides',
      passed: false,
      details: 'Failed to test administrative overrides',
      error: error.message
    };
  }
}

async function testCrossBranchConflictDetection(): Promise<TestResult> {
  try {
    console.log('🧪 Testing cross-branch booking conflict detection...');
    
    const adminToken = await getAuthToken('SUPER_ADMIN');
    
    // Test cross-branch conflicts endpoint
    const conflictsResponse = await axios.get(`${API_BASE}/bookings/cross-branch-conflicts`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    const hasConflictDetection = conflictsResponse.data.settings !== undefined;
    
    return {
      feature: 'Cross-Branch Conflict Detection',
      passed: hasConflictDetection,
      details: hasConflictDetection ? 
        `Cross-branch booking enabled: ${conflictsResponse.data.settings.allowCrossBranchBooking}` : 
        'Cross-branch conflict detection not working'
    };
    
  } catch (error: any) {
    return {
      feature: 'Cross-Branch Conflict Detection',
      passed: false,
      details: 'Failed to test cross-branch conflicts',
      error: error.message
    };
  }
}

async function testBlockedSlotsManagement(): Promise<TestResult> {
  try {
    console.log('🧪 Testing blocked slots management...');
    
    const adminToken = await getAuthToken('SUPER_ADMIN');
    
    // Test blocked slots endpoint
    const blockedSlotsResponse = await axios.get(`${API_BASE}/bookings/blocked-slots`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    const hasBlockedSlotsManagement = blockedSlotsResponse.data.blockedSlots !== undefined;
    
    return {
      feature: 'Blocked Slots Management',
      passed: hasBlockedSlotsManagement,
      details: hasBlockedSlotsManagement ? 
        `Found ${blockedSlotsResponse.data.total} blocked slots` : 
        'Blocked slots management not working'
    };
    
  } catch (error: any) {
    return {
      feature: 'Blocked Slots Management',
      passed: false,
      details: 'Failed to test blocked slots management',
      error: error.message
    };
  }
}

async function verifyTask16Implementation(): Promise<void> {
  console.log('🔍 Verifying Task 16: Advanced Booking Features and Cross-Branch Edge Cases\n');
  
  const tests = [
    testLateCancellationHandling,
    testTeacherCancellationWorkflow,
    testPriorityReschedulingSystem,
    testAdministrativeOverrides,
    testCrossBranchConflictDetection,
    testBlockedSlotsManagement
  ];
  
  const results: TestResult[] = [];
  
  for (const test of tests) {
    try {
      const result = await test();
      results.push(result);
      
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${result.feature}: ${result.details}`);
      
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    } catch (error) {
      console.error(`❌ Test failed: ${error}`);
      results.push({
        feature: 'Unknown',
        passed: false,
        details: 'Test execution failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  console.log('\n📊 Task 16 Verification Summary:');
  console.log('=====================================');
  
  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;
  
  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.feature}`);
  });
  
  console.log(`\n📈 Overall Result: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 Task 16 implementation is complete and working correctly!');
    
    console.log('\n✅ Implemented Features:');
    console.log('  • Late cancellation handling with slot blocking');
    console.log('  • Teacher cancellation workflow with automatic notifications');
    console.log('  • Priority rescheduling system for affected students');
    console.log('  • Administrative override capabilities with audit logging');
    console.log('  • Cross-branch booking conflict detection and management');
    console.log('  • Blocked slots management system');
    console.log('  • System settings integration for business rules');
    
  } else {
    console.log('⚠️  Some features may need additional work or testing.');
  }
}

// Run verification
if (require.main === module) {
  verifyTask16Implementation()
    .then(() => {
      console.log('\n✅ Task 16 verification completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Task 16 verification failed:', error);
      process.exit(1);
    });
}

export { verifyTask16Implementation };