import prisma from './lib/prisma';
import { z } from 'zod';

// Test data
let testBranch: any;
let testTeacher: any;
let testSlot: any;

// Validation schemas (copied from slots.ts)
const createSlotSchema = z.object({
  branchId: z.string().min(1, 'Branch ID is required'),
  teacherId: z.string().min(1, 'Teacher ID is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format'),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format'),
  capacity: z.number().int().min(1, 'Capacity must be at least 1').max(10, 'Capacity cannot exceed 10')
});

// Helper functions (copied from slots.ts)
function validateTimeSlot(startTime: string, endTime: string): { isValid: boolean; error?: string } {
  const start = new Date(`2000-01-01T${startTime}:00`);
  const end = new Date(`2000-01-01T${endTime}:00`);
  
  if (start >= end) {
    return { isValid: false, error: 'End time must be after start time' };
  }
  
  const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
  if (durationMinutes < 15) {
    return { isValid: false, error: 'Slot duration must be at least 15 minutes' };
  }
  
  if (durationMinutes > 180) {
    return { isValid: false, error: 'Slot duration cannot exceed 3 hours' };
  }
  
  return { isValid: true };
}

async function checkSlotConflicts(
  branchId: string, 
  teacherId: string, 
  date: string, 
  startTime: string, 
  endTime: string,
  excludeSlotId?: string
): Promise<{ hasConflict: boolean; conflictingSlot?: any }> {
  const whereClause: any = {
    branchId,
    teacherId,
    date: new Date(date),
    OR: [
      // New slot starts during existing slot
      {
        AND: [
          { startTime: { lte: startTime } },
          { endTime: { gt: startTime } }
        ]
      },
      // New slot ends during existing slot
      {
        AND: [
          { startTime: { lt: endTime } },
          { endTime: { gte: endTime } }
        ]
      },
      // New slot completely contains existing slot
      {
        AND: [
          { startTime: { gte: startTime } },
          { endTime: { lte: endTime } }
        ]
      }
    ]
  };

  if (excludeSlotId) {
    whereClause.id = { not: excludeSlotId };
  }

  const conflictingSlot = await prisma.slot.findFirst({
    where: whereClause,
    include: {
      branch: { select: { name: true } },
      teacher: { select: { name: true } }
    }
  });

  return {
    hasConflict: !!conflictingSlot,
    conflictingSlot
  };
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

  // Create test teacher
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
  
  await prisma.branch.deleteMany({
    where: { id: testBranch.id }
  });
  
  console.log('Cleanup complete');
}

// Test functions
async function testSlotValidation() {
  console.log('\n=== Testing Slot Validation ===');

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];

  // Test valid slot data
  const validSlotData = {
    branchId: testBranch.id,
    teacherId: testTeacher.id,
    date: dateStr,
    startTime: '10:00',
    endTime: '11:00',
    capacity: 2
  };

  console.log('Testing valid slot data...');
  try {
    const validated = createSlotSchema.parse(validSlotData);
    const timeValidation = validateTimeSlot(validated.startTime, validated.endTime);
    
    if (timeValidation.isValid) {
      console.log('✅ Valid slot data passed validation');
    } else {
      console.log('❌ Valid slot data failed time validation:', timeValidation.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Valid slot data failed schema validation:', error);
    return false;
  }

  // Test invalid time slot
  console.log('Testing invalid time slot (end before start)...');
  try {
    const timeValidation = validateTimeSlot('11:00', '10:00');
    if (!timeValidation.isValid) {
      console.log('✅ Invalid time slot correctly rejected:', timeValidation.error);
    } else {
      console.log('❌ Invalid time slot was incorrectly accepted');
      return false;
    }
  } catch (error) {
    console.log('❌ Time validation threw error:', error);
    return false;
  }

  // Test short duration
  console.log('Testing short duration (less than 15 minutes)...');
  const shortTimeValidation = validateTimeSlot('10:00', '10:10');
  if (!shortTimeValidation.isValid) {
    console.log('✅ Short duration correctly rejected:', shortTimeValidation.error);
  } else {
    console.log('❌ Short duration was incorrectly accepted');
    return false;
  }

  return true;
}

async function testSlotCreation() {
  console.log('\n=== Testing Slot Creation ===');

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];

  const slotData = {
    branchId: testBranch.id,
    teacherId: testTeacher.id,
    date: new Date(dateStr),
    startTime: '10:00',
    endTime: '11:00',
    capacity: 2
  };

  console.log('Creating slot in database...');

  try {
    testSlot = await prisma.slot.create({
      data: slotData,
      include: {
        branch: {
          select: { id: true, name: true }
        },
        teacher: {
          select: { id: true, name: true }
        }
      }
    });

    console.log('✅ Slot created successfully:', {
      id: testSlot.id,
      branch: testSlot.branch.name,
      teacher: testSlot.teacher.name,
      date: testSlot.date,
      time: `${testSlot.startTime}-${testSlot.endTime}`
    });
    return true;
  } catch (error) {
    console.log('❌ Failed to create slot:', error);
    return false;
  }
}

async function testSlotConflictDetection() {
  console.log('\n=== Testing Slot Conflict Detection ===');

  if (!testSlot) {
    console.log('❌ No test slot available');
    return false;
  }

  const dateStr = testSlot.date.toISOString().split('T')[0];

  // Test overlapping slot
  console.log('Testing overlapping slot detection...');
  const conflictCheck = await checkSlotConflicts(
    testBranch.id,
    testTeacher.id,
    dateStr,
    '10:30', // Overlaps with existing 10:00-11:00 slot
    '11:30'
  );

  if (conflictCheck.hasConflict) {
    console.log('✅ Conflict correctly detected:', {
      conflictingSlot: {
        time: `${conflictCheck.conflictingSlot.startTime}-${conflictCheck.conflictingSlot.endTime}`,
        teacher: conflictCheck.conflictingSlot.teacher.name
      }
    });
  } else {
    console.log('❌ Conflict not detected when it should have been');
    return false;
  }

  // Test non-overlapping slot
  console.log('Testing non-overlapping slot...');
  const noConflictCheck = await checkSlotConflicts(
    testBranch.id,
    testTeacher.id,
    dateStr,
    '12:00', // Does not overlap
    '13:00'
  );

  if (!noConflictCheck.hasConflict) {
    console.log('✅ No conflict correctly detected for non-overlapping slot');
  } else {
    console.log('❌ False conflict detected for non-overlapping slot');
    return false;
  }

  return true;
}

async function testSlotQuerying() {
  console.log('\n=== Testing Slot Querying ===');

  if (!testSlot) {
    console.log('❌ No test slot available');
    return false;
  }

  // Test basic slot query
  console.log('Testing basic slot query...');
  const slots = await prisma.slot.findMany({
    where: { branchId: testBranch.id },
    include: {
      branch: { select: { id: true, name: true } },
      teacher: { select: { id: true, name: true } },
      bookings: {
        where: { status: { in: ['CONFIRMED', 'COMPLETED'] } },
        select: { id: true, status: true }
      }
    },
    orderBy: [
      { date: 'asc' },
      { startTime: 'asc' }
    ]
  });

  if (slots.length > 0) {
    console.log('✅ Slots queried successfully:', {
      count: slots.length,
      firstSlot: {
        id: slots[0].id,
        branch: slots[0].branch.name,
        teacher: slots[0].teacher.name,
        date: slots[0].date,
        time: `${slots[0].startTime}-${slots[0].endTime}`,
        capacity: slots[0].capacity,
        bookings: slots[0].bookings.length
      }
    });
  } else {
    console.log('❌ No slots found in query');
    return false;
  }

  // Test date range query
  console.log('Testing date range query...');
  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);

  const dateRangeSlots = await prisma.slot.findMany({
    where: {
      branchId: testBranch.id,
      date: {
        gte: today,
        lte: nextWeek
      }
    }
  });

  console.log('✅ Date range query successful:', {
    count: dateRangeSlots.length,
    dateRange: `${today.toISOString().split('T')[0]} to ${nextWeek.toISOString().split('T')[0]}`
  });

  return true;
}

async function testSlotAvailabilityCalculation() {
  console.log('\n=== Testing Slot Availability Calculation ===');

  if (!testSlot) {
    console.log('❌ No test slot available');
    return false;
  }

  // Create a test student and booking
  const testStudent = await prisma.user.create({
    data: {
      name: 'Test Student',
      email: 'student@test.com',
      role: 'STUDENT',
      isActive: true
    }
  });

  const booking = await prisma.booking.create({
    data: {
      studentId: testStudent.id,
      slotId: testSlot.id,
      status: 'CONFIRMED'
    }
  });

  // Query slot with booking information
  const slotWithBookings = await prisma.slot.findUnique({
    where: { id: testSlot.id },
    include: {
      bookings: {
        where: { status: { in: ['CONFIRMED', 'COMPLETED'] } },
        select: { id: true, status: true }
      }
    }
  });

  if (slotWithBookings) {
    const bookedCount = slotWithBookings.bookings.length;
    const availableSpots = slotWithBookings.capacity - bookedCount;
    const isAvailable = availableSpots > 0;

    console.log('✅ Availability calculation successful:', {
      capacity: slotWithBookings.capacity,
      bookedCount,
      availableSpots,
      isAvailable
    });

    // Cleanup
    await prisma.booking.deleteMany({ where: { studentId: testStudent.id } });
    await prisma.user.deleteMany({ where: { id: testStudent.id } });

    return bookedCount === 1 && availableSpots === 1 && isAvailable;
  } else {
    console.log('❌ Failed to query slot with bookings');
    return false;
  }
}

async function testSlotUpdate() {
  console.log('\n=== Testing Slot Update ===');

  if (!testSlot) {
    console.log('❌ No test slot available');
    return false;
  }

  console.log('Updating slot capacity...');
  try {
    const updatedSlot = await prisma.slot.update({
      where: { id: testSlot.id },
      data: { capacity: 3 },
      include: {
        branch: { select: { name: true } },
        teacher: { select: { name: true } }
      }
    });

    console.log('✅ Slot updated successfully:', {
      id: updatedSlot.id,
      oldCapacity: testSlot.capacity,
      newCapacity: updatedSlot.capacity
    });

    testSlot = updatedSlot; // Update reference
    return true;
  } catch (error) {
    console.log('❌ Failed to update slot:', error);
    return false;
  }
}

async function testSlotDeletion() {
  console.log('\n=== Testing Slot Deletion ===');

  if (!testSlot) {
    console.log('❌ No test slot available');
    return false;
  }

  console.log('Deleting slot...');
  try {
    await prisma.slot.delete({
      where: { id: testSlot.id }
    });

    console.log('✅ Slot deleted successfully');

    // Verify deletion
    const deletedSlot = await prisma.slot.findUnique({
      where: { id: testSlot.id }
    });

    if (!deletedSlot) {
      console.log('✅ Slot deletion verified');
      return true;
    } else {
      console.log('❌ Slot still exists after deletion');
      return false;
    }
  } catch (error) {
    console.log('❌ Failed to delete slot:', error);
    return false;
  }
}

// Main test runner
async function runSlotTests() {
  console.log('🚀 Starting Slot Management System Tests (Database Layer)');
  console.log('=========================================================');

  try {
    await setupTestData();

    const tests = [
      { name: 'Slot Validation', fn: testSlotValidation },
      { name: 'Slot Creation', fn: testSlotCreation },
      { name: 'Slot Conflict Detection', fn: testSlotConflictDetection },
      { name: 'Slot Querying', fn: testSlotQuerying },
      { name: 'Slot Availability Calculation', fn: testSlotAvailabilityCalculation },
      { name: 'Slot Update', fn: testSlotUpdate },
      { name: 'Slot Deletion', fn: testSlotDeletion }
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

    console.log('\n=========================================================');
    console.log('🏁 Test Results Summary');
    console.log('=========================================================');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${passed + failed}`);
    
    if (failed === 0) {
      console.log('🎉 All tests passed! Slot management system database layer is working correctly.');
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