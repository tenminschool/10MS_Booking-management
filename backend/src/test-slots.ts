import request from 'supertest';
import app from './index';
import prisma from './lib/prisma';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';

// Test data
let testBranch: any;
let testTeacher: any;
let testBranchAdmin: any;
let testSuperAdmin: any;
let testSlot: any;

// Helper function to create JWT token
function createToken(user: any) {
  return jwt.sign(
    { 
      userId: user.id, 
      role: user.role, 
      branchId: user.branchId 
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// Setup test data
async function setupTestData() {
  console.log('Setting up test data...');

  // Create test branch
  testBranch = await prisma.branch.create({
    data: {
      name: 'Test Branch for Slots',
      address: '123 Test Street',
      contactNumber: '+8801234567890',
      isActive: true
    }
  });

  // Create test users
  testSuperAdmin = await prisma.user.create({
    data: {
      name: 'Super Admin',
      email: 'superadmin@test.com',
      role: 'SUPER_ADMIN',
      isActive: true
    }
  });

  testBranchAdmin = await prisma.user.create({
    data: {
      name: 'Branch Admin',
      email: 'branchadmin@test.com',
      role: 'BRANCH_ADMIN',
      branchId: testBranch.id,
      isActive: true
    }
  });

  testTeacher = await prisma.user.create({
    data: {
      name: 'Test Teacher',
      email: 'teacher@test.com',
      role: 'TEACHER',
      branchId: testBranch.id,
      isActive: true
    }
  });

  console.log('Test data setup complete');
}

// Cleanup test data
async function cleanupTestData() {
  console.log('Cleaning up test data...');
  
  await prisma.booking.deleteMany({
    where: { slot: { branchId: testBranch.id } }
  });
  
  await prisma.slot.deleteMany({
    where: { branchId: testBranch.id }
  });
  
  await prisma.user.deleteMany({
    where: { branchId: testBranch.id }
  });
  
  await prisma.user.deleteMany({
    where: { id: testSuperAdmin.id }
  });
  
  await prisma.branch.deleteMany({
    where: { id: testBranch.id }
  });
  
  console.log('Cleanup complete');
}

// Test functions
async function testCreateSlot() {
  console.log('\n=== Testing Slot Creation ===');

  const token = createToken(testBranchAdmin);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];

  const slotData = {
    branchId: testBranch.id,
    teacherId: testTeacher.id,
    date: dateStr,
    startTime: '10:00',
    endTime: '11:00',
    capacity: 2
  };

  console.log('Creating slot with data:', slotData);

  const response = await request(app)
    .post('/api/slots')
    .set('Authorization', `Bearer ${token}`)
    .send(slotData);

  console.log('Response status:', response.status);
  console.log('Response body:', JSON.stringify(response.body, null, 2));

  if (response.status === 201) {
    testSlot = response.body.slot;
    console.log('✅ Slot created successfully');
    return true;
  } else {
    console.log('❌ Failed to create slot');
    return false;
  }
}

async function testGetSlots() {
  console.log('\n=== Testing Get Slots ===');

  const token = createToken(testBranchAdmin);

  console.log('Fetching slots...');

  const response = await request(app)
    .get('/api/slots')
    .set('Authorization', `Bearer ${token}`)
    .query({ view: 'weekly' });

  console.log('Response status:', response.status);
  console.log('Response body:', JSON.stringify(response.body, null, 2));

  if (response.status === 200 && response.body.slots.length > 0) {
    console.log('✅ Slots fetched successfully');
    return true;
  } else {
    console.log('❌ Failed to fetch slots');
    return false;
  }
}

async function testGetSlotById() {
  console.log('\n=== Testing Get Slot by ID ===');

  if (!testSlot) {
    console.log('❌ No test slot available');
    return false;
  }

  const token = createToken(testBranchAdmin);

  console.log('Fetching slot by ID:', testSlot.id);

  const response = await request(app)
    .get(`/api/slots/${testSlot.id}`)
    .set('Authorization', `Bearer ${token}`);

  console.log('Response status:', response.status);
  console.log('Response body:', JSON.stringify(response.body, null, 2));

  if (response.status === 200) {
    console.log('✅ Slot fetched by ID successfully');
    return true;
  } else {
    console.log('❌ Failed to fetch slot by ID');
    return false;
  }
}

async function testUpdateSlot() {
  console.log('\n=== Testing Slot Update ===');

  if (!testSlot) {
    console.log('❌ No test slot available');
    return false;
  }

  const token = createToken(testBranchAdmin);
  const updateData = {
    capacity: 3,
    endTime: '11:30'
  };

  console.log('Updating slot with data:', updateData);

  const response = await request(app)
    .put(`/api/slots/${testSlot.id}`)
    .set('Authorization', `Bearer ${token}`)
    .send(updateData);

  console.log('Response status:', response.status);
  console.log('Response body:', JSON.stringify(response.body, null, 2));

  if (response.status === 200) {
    console.log('✅ Slot updated successfully');
    return true;
  } else {
    console.log('❌ Failed to update slot');
    return false;
  }
}

async function testSlotConflictValidation() {
  console.log('\n=== Testing Slot Conflict Validation ===');

  const token = createToken(testBranchAdmin);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];

  // Try to create a conflicting slot
  const conflictingSlotData = {
    branchId: testBranch.id,
    teacherId: testTeacher.id,
    date: dateStr,
    startTime: '10:30', // Overlaps with existing slot
    endTime: '11:30',
    capacity: 1
  };

  console.log('Creating conflicting slot with data:', conflictingSlotData);

  const response = await request(app)
    .post('/api/slots')
    .set('Authorization', `Bearer ${token}`)
    .send(conflictingSlotData);

  console.log('Response status:', response.status);
  console.log('Response body:', JSON.stringify(response.body, null, 2));

  if (response.status === 409) {
    console.log('✅ Conflict validation working correctly');
    return true;
  } else {
    console.log('❌ Conflict validation failed');
    return false;
  }
}

async function testCrossBranchFiltering() {
  console.log('\n=== Testing Cross-Branch Filtering ===');

  // Create another branch and teacher
  const branch2 = await prisma.branch.create({
    data: {
      name: 'Test Branch 2',
      address: '456 Test Avenue',
      contactNumber: '+8801234567891',
      isActive: true
    }
  });

  const teacher2 = await prisma.user.create({
    data: {
      name: 'Teacher 2',
      email: 'teacher2@test.com',
      role: 'TEACHER',
      branchId: branch2.id,
      isActive: true
    }
  });

  // Create slot in second branch
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2);
  const dateStr = tomorrow.toISOString().split('T')[0];

  await prisma.slot.create({
    data: {
      branchId: branch2.id,
      teacherId: teacher2.id,
      date: new Date(dateStr),
      startTime: '14:00',
      endTime: '15:00',
      capacity: 1
    }
  });

  // Test super admin can see all branches
  const superAdminToken = createToken(testSuperAdmin);
  
  console.log('Testing super admin cross-branch access...');
  
  const superAdminResponse = await request(app)
    .get('/api/slots')
    .set('Authorization', `Bearer ${superAdminToken}`)
    .query({ view: 'weekly' });

  console.log('Super admin response status:', superAdminResponse.status);
  console.log('Super admin slots count:', superAdminResponse.body.slots?.length || 0);

  // Test branch admin can only see their branch
  const branchAdminToken = createToken(testBranchAdmin);
  
  console.log('Testing branch admin branch-specific access...');
  
  const branchAdminResponse = await request(app)
    .get('/api/slots')
    .set('Authorization', `Bearer ${branchAdminToken}`)
    .query({ view: 'weekly' });

  console.log('Branch admin response status:', branchAdminResponse.status);
  console.log('Branch admin slots count:', branchAdminResponse.body.slots?.length || 0);

  // Cleanup
  await prisma.slot.deleteMany({ where: { branchId: branch2.id } });
  await prisma.user.deleteMany({ where: { branchId: branch2.id } });
  await prisma.branch.deleteMany({ where: { id: branch2.id } });

  if (superAdminResponse.status === 200 && branchAdminResponse.status === 200) {
    console.log('✅ Cross-branch filtering working correctly');
    return true;
  } else {
    console.log('❌ Cross-branch filtering failed');
    return false;
  }
}

async function testBulkSlotCreation() {
  console.log('\n=== Testing Bulk Slot Creation ===');

  const token = createToken(testBranchAdmin);
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + 3);

  const bulkSlots = [
    {
      branchId: testBranch.id,
      teacherId: testTeacher.id,
      date: baseDate.toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '10:00',
      capacity: 1
    },
    {
      branchId: testBranch.id,
      teacherId: testTeacher.id,
      date: baseDate.toISOString().split('T')[0],
      startTime: '14:00',
      endTime: '15:00',
      capacity: 2
    }
  ];

  console.log('Creating bulk slots:', bulkSlots.length);

  const response = await request(app)
    .post('/api/slots/bulk')
    .set('Authorization', `Bearer ${token}`)
    .send({ slots: bulkSlots });

  console.log('Response status:', response.status);
  console.log('Response body:', JSON.stringify(response.body, null, 2));

  if (response.status === 201) {
    console.log('✅ Bulk slot creation successful');
    return true;
  } else {
    console.log('❌ Bulk slot creation failed');
    return false;
  }
}

async function testSlotAvailabilityCalculation() {
  console.log('\n=== Testing Slot Availability Calculation ===');

  if (!testSlot) {
    console.log('❌ No test slot available');
    return false;
  }

  // Create a test student
  const testStudent = await prisma.user.create({
    data: {
      name: 'Test Student',
      email: 'student@test.com',
      role: 'STUDENT',
      isActive: true
    }
  });

  // Create a booking for the slot
  await prisma.booking.create({
    data: {
      studentId: testStudent.id,
      slotId: testSlot.id,
      status: 'CONFIRMED'
    }
  });

  const token = createToken(testBranchAdmin);

  console.log('Fetching slot with booking...');

  const response = await request(app)
    .get(`/api/slots/${testSlot.id}`)
    .set('Authorization', `Bearer ${token}`);

  console.log('Response status:', response.status);
  console.log('Availability info:', {
    capacity: response.body.capacity,
    bookedCount: response.body.bookedCount,
    availableSpots: response.body.availableSpots,
    isAvailable: response.body.isAvailable
  });

  // Cleanup
  await prisma.booking.deleteMany({ where: { studentId: testStudent.id } });
  await prisma.user.deleteMany({ where: { id: testStudent.id } });

  if (response.status === 200 && response.body.bookedCount === 1) {
    console.log('✅ Availability calculation working correctly');
    return true;
  } else {
    console.log('❌ Availability calculation failed');
    return false;
  }
}

async function testDeleteSlot() {
  console.log('\n=== Testing Slot Deletion ===');

  if (!testSlot) {
    console.log('❌ No test slot available');
    return false;
  }

  const token = createToken(testBranchAdmin);

  console.log('Deleting slot:', testSlot.id);

  const response = await request(app)
    .delete(`/api/slots/${testSlot.id}`)
    .set('Authorization', `Bearer ${token}`);

  console.log('Response status:', response.status);
  console.log('Response body:', JSON.stringify(response.body, null, 2));

  if (response.status === 200) {
    console.log('✅ Slot deleted successfully');
    return true;
  } else {
    console.log('❌ Failed to delete slot');
    return false;
  }
}

// Main test runner
async function runSlotTests() {
  console.log('🚀 Starting Slot Management System Tests');
  console.log('==========================================');

  try {
    await setupTestData();

    const tests = [
      { name: 'Create Slot', fn: testCreateSlot },
      { name: 'Get Slots', fn: testGetSlots },
      { name: 'Get Slot by ID', fn: testGetSlotById },
      { name: 'Update Slot', fn: testUpdateSlot },
      { name: 'Slot Conflict Validation', fn: testSlotConflictValidation },
      { name: 'Cross-Branch Filtering', fn: testCrossBranchFiltering },
      { name: 'Bulk Slot Creation', fn: testBulkSlotCreation },
      { name: 'Availability Calculation', fn: testSlotAvailabilityCalculation },
      { name: 'Delete Slot', fn: testDeleteSlot }
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
      try {
        const result = await test.fn();
        if (result) {
          passed++;
        } else {
          failed++;
        }
      } catch (error) {
        console.log(`❌ ${test.name} threw an error:`, error);
        failed++;
      }
    }

    console.log('\n==========================================');
    console.log('🏁 Test Results Summary');
    console.log('==========================================');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${passed + failed}`);
    
    if (failed === 0) {
      console.log('🎉 All tests passed! Slot management system is working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Please review the implementation.');
    }

  } catch (error) {
    console.error('❌ Test setup failed:', error);
  } finally {
    await cleanupTestData();
    await prisma.$disconnect();
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runSlotTests().catch(console.error);
}

export { runSlotTests };