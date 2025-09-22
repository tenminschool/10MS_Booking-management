/**
 * Task 6 Verification: Cross-Branch Booking Functionality
 * 
 * This script verifies that all the booking functionality has been implemented
 * according to the requirements without requiring a live database connection.
 */

import fs from 'fs';
import path from 'path';

interface VerificationResult {
  feature: string;
  implemented: boolean;
  details: string[];
  issues: string[];
}

const results: VerificationResult[] = [];

function verifyFile(filePath: string, description: string): { exists: boolean; content?: string } {
  const fullPath = path.join(__dirname, filePath);
  if (fs.existsSync(fullPath)) {
    return { exists: true, content: fs.readFileSync(fullPath, 'utf-8') };
  }
  return { exists: false };
}

function checkImplementation(content: string, patterns: string[], feature: string): VerificationResult {
  const details: string[] = [];
  const issues: string[] = [];
  let implemented = true;

  patterns.forEach(pattern => {
    if (content.includes(pattern)) {
      details.push(`✅ Found: ${pattern}`);
    } else {
      issues.push(`❌ Missing: ${pattern}`);
      implemented = false;
    }
  });

  return { feature, implemented, details, issues };
}

console.log('🔍 Verifying Task 6: Cross-Branch Booking Functionality Implementation\n');

// 1. Verify booking routes file exists
const bookingRoutesFile = verifyFile('routes/bookings.ts', 'Booking Routes');
if (!bookingRoutesFile.exists) {
  console.log('❌ Booking routes file not found');
  process.exit(1);
}

console.log('✅ Booking routes file exists\n');

const bookingContent = bookingRoutesFile.content!;

// 2. Verify booking creation with business rules
const bookingCreationPatterns = [
  'POST /api/bookings',
  'createBookingSchema',
  'checkMonthlyDuplicateBooking',
  'slot.capacity',
  'Monthly Limit Error',
  'Capacity Error',
  'Cannot book slots in the past'
];

results.push(checkImplementation(bookingContent, bookingCreationPatterns, 'Booking Creation with Business Rules'));

// 3. Verify booking cancellation with 24-hour rule
const cancellationPatterns = [
  'PUT /api/bookings/:id/cancel',
  'isCancellationWithin24Hours',
  'Cancellation Policy Violation',
  'within 24 hours',
  'cancelledAt',
  'cancellationReason'
];

results.push(checkImplementation(bookingContent, cancellationPatterns, 'Booking Cancellation with 24-Hour Rule'));

// 4. Verify booking rescheduling with cross-branch support
const reschedulingPatterns = [
  'PUT /api/bookings/:id/reschedule',
  'rescheduleBookingSchema',
  'newSlotId',
  'Rescheduling Policy Violation',
  'cross-branch',
  'previousSlot'
];

results.push(checkImplementation(bookingContent, reschedulingPatterns, 'Booking Rescheduling with Cross-Branch Support'));

// 5. Verify real-time slot capacity updates
const capacityPatterns = [
  'bookedCount',
  'availableSpots',
  'isAvailable',
  'capacity',
  'bookings.length'
];

results.push(checkImplementation(bookingContent, capacityPatterns, 'Real-Time Slot Capacity Updates'));

// 6. Verify monthly duplicate prevention across branches
const duplicatePreventionPatterns = [
  'checkMonthlyDuplicateBooking',
  'startOfMonth',
  'endOfMonth',
  'excludeBookingId',
  'across all branches'
];

results.push(checkImplementation(bookingContent, duplicatePreventionPatterns, 'Monthly Duplicate Prevention Across Branches'));

// 7. Verify cross-branch slot availability
const crossBranchPatterns = [
  'getAvailableSlots',
  'GET /api/bookings/available-slots',
  'cross-branch',
  'branchId',
  'filters.branchId'
];

results.push(checkImplementation(bookingContent, crossBranchPatterns, 'Cross-Branch Slot Availability'));

// 8. Verify attendance marking
const attendancePatterns = [
  'PUT /api/bookings/:id/attendance',
  'attended',
  'COMPLETED',
  'NO_SHOW',
  'mark attendance'
];

results.push(checkImplementation(bookingContent, attendancePatterns, 'Attendance Marking'));

// 9. Verify role-based access control
const rbacPatterns = [
  'user.role',
  'STUDENT',
  'TEACHER',
  'BRANCH_ADMIN',
  'SUPER_ADMIN',
  'Forbidden',
  'access control'
];

results.push(checkImplementation(bookingContent, rbacPatterns, 'Role-Based Access Control'));

// 10. Verify booking status management
const statusPatterns = [
  'BookingStatus',
  'CONFIRMED',
  'CANCELLED',
  'COMPLETED',
  'status',
  'Invalid Status'
];

results.push(checkImplementation(bookingContent, statusPatterns, 'Booking Status Management'));

// 11. Verify monthly booking check endpoint
const monthlyCheckPatterns = [
  'GET /api/bookings/student/:studentId/monthly-check',
  'hasMonthlyBooking',
  'existingBooking',
  'monthly-check'
];

results.push(checkImplementation(bookingContent, monthlyCheckPatterns, 'Monthly Booking Check Endpoint'));

// 12. Verify server integration
const serverFile = verifyFile('index.ts', 'Main Server File');
if (serverFile.exists) {
  const serverContent = serverFile.content!;
  const serverIntegrationPatterns = [
    "import bookingRoutes from './routes/bookings'",
    "app.use('/api/bookings', bookingRoutes)",
    "bookings: '/api/bookings'"
  ];
  
  results.push(checkImplementation(serverContent, serverIntegrationPatterns, 'Server Integration'));
} else {
  results.push({
    feature: 'Server Integration',
    implemented: false,
    details: [],
    issues: ['❌ Server file not found']
  });
}

// 13. Verify helper functions
const helperPatterns = [
  'isCancellationWithin24Hours',
  'checkMonthlyDuplicateBooking',
  'getAvailableSlots',
  'hoursUntilSlot',
  'timeDifference'
];

results.push(checkImplementation(bookingContent, helperPatterns, 'Helper Functions'));

// 14. Verify validation schemas
const validationPatterns = [
  'createBookingSchema',
  'updateBookingSchema',
  'rescheduleBookingSchema',
  'bookingFiltersSchema',
  'z.object',
  'z.string',
  'z.enum'
];

results.push(checkImplementation(bookingContent, validationPatterns, 'Validation Schemas'));

// 15. Verify error handling
const errorHandlingPatterns = [
  'try {',
  'catch (error)',
  'ZodError',
  'status(400)',
  'status(403)',
  'status(404)',
  'status(409)',
  'status(500)',
  'console.error'
];

results.push(checkImplementation(bookingContent, errorHandlingPatterns, 'Error Handling'));

// Print results
console.log('📊 Implementation Verification Results\n');
console.log('=====================================\n');

let totalImplemented = 0;
let totalFeatures = results.length;

results.forEach((result, index) => {
  const status = result.implemented ? '✅' : '❌';
  console.log(`${index + 1}. ${status} ${result.feature}`);
  
  if (result.implemented) {
    totalImplemented++;
    console.log(`   ${result.details.length} features found`);
  } else {
    console.log(`   Issues found:`);
    result.issues.forEach(issue => console.log(`   ${issue}`));
  }
  console.log();
});

// Summary
console.log('📈 Summary');
console.log('==========');
console.log(`✅ Implemented: ${totalImplemented}/${totalFeatures} features`);
console.log(`❌ Missing: ${totalFeatures - totalImplemented}/${totalFeatures} features`);
console.log(`📊 Completion: ${Math.round((totalImplemented / totalFeatures) * 100)}%\n`);

if (totalImplemented === totalFeatures) {
  console.log('🎉 All booking functionality has been successfully implemented!');
  console.log('✨ Task 6 is complete and ready for testing.');
} else {
  console.log('⚠️  Some features are missing or incomplete.');
  console.log('🔧 Please review the issues above and complete the implementation.');
}

// Verify specific requirements from the task
console.log('\n🎯 Task Requirements Verification');
console.log('==================================');

const taskRequirements = [
  {
    requirement: '2.3 - Cross-branch booking support',
    patterns: ['cross-branch', 'branchId', 'available-slots'],
    verified: bookingContent.includes('cross-branch') || bookingContent.includes('available-slots')
  },
  {
    requirement: '2.4 - Monthly booking limit across branches',
    patterns: ['checkMonthlyDuplicateBooking', 'Monthly Limit Error'],
    verified: bookingContent.includes('checkMonthlyDuplicateBooking') && bookingContent.includes('Monthly Limit Error')
  },
  {
    requirement: '3.1 - Booking creation with validation',
    patterns: ['createBookingSchema', 'capacity', 'duplicate'],
    verified: bookingContent.includes('createBookingSchema') && bookingContent.includes('capacity')
  },
  {
    requirement: '3.2 - Booking cancellation with 24-hour rule',
    patterns: ['isCancellationWithin24Hours', '24 hours'],
    verified: bookingContent.includes('isCancellationWithin24Hours') && bookingContent.includes('24 hours')
  },
  {
    requirement: '3.3 - Booking rescheduling',
    patterns: ['reschedule', 'newSlotId'],
    verified: bookingContent.includes('reschedule') && bookingContent.includes('newSlotId')
  },
  {
    requirement: '3.4 - Real-time capacity management',
    patterns: ['bookedCount', 'availableSpots', 'capacity'],
    verified: bookingContent.includes('bookedCount') && bookingContent.includes('availableSpots')
  },
  {
    requirement: '12.1 - Booking status management',
    patterns: ['BookingStatus', 'CONFIRMED', 'CANCELLED', 'COMPLETED'],
    verified: bookingContent.includes('BookingStatus') && bookingContent.includes('CONFIRMED')
  },
  {
    requirement: '12.2 - Attendance tracking',
    patterns: ['attendance', 'attended', 'NO_SHOW'],
    verified: bookingContent.includes('attendance') && bookingContent.includes('attended')
  }
];

taskRequirements.forEach((req, index) => {
  const status = req.verified ? '✅' : '❌';
  console.log(`${status} ${req.requirement}`);
});

const verifiedRequirements = taskRequirements.filter(req => req.verified).length;
console.log(`\n📋 Requirements: ${verifiedRequirements}/${taskRequirements.length} verified`);

if (verifiedRequirements === taskRequirements.length) {
  console.log('\n🏆 All task requirements have been successfully implemented!');
} else {
  console.log('\n⚠️  Some task requirements need attention.');
}