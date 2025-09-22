// Integration tests for cross-branch booking flow
import request from 'supertest';
import app from '../index';
import { testDataManager, formatTestResult, delay } from './setup';

interface ApiResponse {
  message?: string;
  error?: string;
  [key: string]: any;
}

export async function runBookingIntegrationTests(): Promise<void> {
  console.log('🧪 Running Cross-Branch Booking Integration Tests...\n');

  try {
    // Setup test data
    await testDataManager.cleanup();
    await testDataManager.createTestBookings(); // This creates branches, users, slots, and bookings

    const branches = testDataManager.getBranches();
    const users = testDataManager.getUsers();
    const slots = testDataManager.getSlots();
    
    const student1 = users.find(u => u.role === 'STUDENT' && u.branchId === branches[0].id)!;
    const student2 = users.find(u => u.role === 'STUDENT' && u.branchId === branches[1].id)!;
    const teacher1 = users.find(u => u.role === 'TEACHER' && u.branchId === branches[0].id)!;

    console.log('📋 Test 1: Browse Available Slots Across Branches');
    
    // Test 1.1: Student can view slots from all branches
    const browseResponse = await request(app)
      .get('/api/slots/available')
      .set('Authorization', `Bearer ${student1.token}`)
      .query({ view: 'weekly' });

    const browseSuccess = browseResponse.status === 200 && 
                         browseResponse.body.slots && 
                         browseResponse.body.slots.length > 0;
    
    formatTestResult(
      'Browse slots across branches',
      browseSuccess,
      browseSuccess ? `Found ${browseResponse.body.slots.length} available slots` : 'Failed to retrieve slots',
      !browseSuccess ? browseResponse.body : null
    );

    // Test 1.2: Filter slots by specific branch
    const filterResponse = await request(app)
      .get('/api/slots/available')
      .set('Authorization', `Bearer ${student1.token}`)
      .query({ 
        view: 'weekly',
        branchId: branches[1].id // Chittagong branch
      });

    const filterSuccess = filterResponse.status === 200;
    const chittagongSlots = filterResponse.body.slots?.filter((slot: any) => 
      slot.branch.id === branches[1].id
    ) || [];

    formatTestResult(
      'Filter slots by branch',
      filterSuccess && chittagongSlots.length > 0,
      filterSuccess ? `Found ${chittagongSlots.length} slots in Chittagong branch` : 'Failed to filter by branch',
      !filterSuccess ? filterResponse.body : null
    );

    console.log('\n📋 Test 2: Cross-Branch Booking Creation');

    // Test 2.1: Student from Dhaka books slot in Chittagong
    const availableChittagongSlot = slots.find(s => s.branchId === branches[1].id);
    
    const crossBranchBookingResponse = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${student1.token}`)
      .send({
        slotId: availableChittagongSlot?.id,
        studentPhoneNumber: student1.phoneNumber
      });

    const crossBranchSuccess = crossBranchBookingResponse.status === 201;
    
    formatTestResult(
      'Cross-branch booking creation',
      crossBranchSuccess,
      crossBranchSuccess ? 'Successfully booked slot in different branch' : 'Failed to create cross-branch booking',
      !crossBranchSuccess ? crossBranchBookingResponse.body : null
    );

    let crossBranchBookingId: string | null = null;
    if (crossBranchSuccess) {
      crossBranchBookingId = crossBranchBookingResponse.body.booking?.id;
    }

    // Test 2.2: Prevent duplicate booking in same month
    await delay(100); // Small delay to ensure different timestamps

    const duplicateBookingResponse = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${student1.token}`)
      .send({
        slotId: availableChittagongSlot?.id,
        studentPhoneNumber: student1.phoneNumber
      });

    const duplicatePreventionSuccess = duplicateBookingResponse.status === 400 ||
                                     duplicateBookingResponse.body.error?.includes('duplicate') ||
                                     duplicateBookingResponse.body.error?.includes('already booked');

    formatTestResult(
      'Prevent duplicate monthly booking',
      duplicatePreventionSuccess,
      duplicatePreventionSuccess ? 'Successfully prevented duplicate booking' : 'Failed to prevent duplicate booking',
      !duplicatePreventionSuccess ? duplicateBookingResponse.body : null
    );

    console.log('\n📋 Test 3: Booking Confirmation and Notifications');

    // Test 3.1: Check booking confirmation details
    if (crossBranchBookingId) {
      const confirmationResponse = await request(app)
        .get(`/api/bookings/${crossBranchBookingId}`)
        .set('Authorization', `Bearer ${student1.token}`);

      const confirmationSuccess = confirmationResponse.status === 200 &&
                                confirmationResponse.body.booking?.status === 'CONFIRMED';

      formatTestResult(
        'Booking confirmation details',
        confirmationSuccess,
        confirmationSuccess ? 'Booking confirmed with correct details' : 'Failed to confirm booking details',
        !confirmationSuccess ? confirmationResponse.body : null
      );

      // Test 3.2: Check notification creation
      const notificationResponse = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${student1.token}`);

      const notificationSuccess = notificationResponse.status === 200 &&
                                notificationResponse.body.notifications?.some((n: any) => 
                                  n.type === 'BOOKING_CONFIRMED'
                                );

      formatTestResult(
        'Booking confirmation notification',
        notificationSuccess,
        notificationSuccess ? 'Confirmation notification created' : 'Failed to create confirmation notification',
        !notificationSuccess ? notificationResponse.body : null
      );
    }

    console.log('\n📋 Test 4: Cross-Branch Booking Cancellation');

    // Test 4.1: Cancel cross-branch booking
    if (crossBranchBookingId) {
      const cancellationResponse = await request(app)
        .put(`/api/bookings/${crossBranchBookingId}/cancel`)
        .set('Authorization', `Bearer ${student1.token}`)
        .send({
          reason: 'Schedule conflict - integration test'
        });

      const cancellationSuccess = cancellationResponse.status === 200;

      formatTestResult(
        'Cross-branch booking cancellation',
        cancellationSuccess,
        cancellationSuccess ? 'Successfully cancelled cross-branch booking' : 'Failed to cancel cross-branch booking',
        !cancellationSuccess ? cancellationResponse.body : null
      );

      // Test 4.2: Verify slot capacity is restored
      if (cancellationSuccess) {
        await delay(100);
        
        const slotCheckResponse = await request(app)
          .get('/api/slots/available')
          .set('Authorization', `Bearer ${student2.token}`)
          .query({ 
            view: 'weekly',
            branchId: branches[1].id
          });

        const slotRestored = slotCheckResponse.status === 200 &&
                           slotCheckResponse.body.slots?.some((slot: any) => 
                             slot.id === availableChittagongSlot?.id && slot.availableCapacity > 0
                           );

        formatTestResult(
          'Slot capacity restoration after cancellation',
          slotRestored,
          slotRestored ? 'Slot capacity correctly restored' : 'Failed to restore slot capacity',
          !slotRestored ? slotCheckResponse.body : null
        );
      }
    }

    console.log('\n📋 Test 5: Cross-Branch Rescheduling');

    // Test 5.1: Create a booking to reschedule
    const rescheduleTestSlot = slots.find(s => s.branchId === branches[0].id);
    
    const initialBookingResponse = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${student2.token}`)
      .send({
        slotId: rescheduleTestSlot?.id,
        studentPhoneNumber: student2.phoneNumber
      });

    if (initialBookingResponse.status === 201) {
      const bookingId = initialBookingResponse.body.booking?.id;
      const newSlot = slots.find(s => s.id !== rescheduleTestSlot?.id && s.branchId !== rescheduleTestSlot?.branchId);

      if (newSlot) {
        const rescheduleResponse = await request(app)
          .put(`/api/bookings/${bookingId}/reschedule`)
          .set('Authorization', `Bearer ${student2.token}`)
          .send({
            newSlotId: newSlot.id,
            reason: 'Cross-branch reschedule test'
          });

        const rescheduleSuccess = rescheduleResponse.status === 200;

        formatTestResult(
          'Cross-branch rescheduling',
          rescheduleSuccess,
          rescheduleSuccess ? 'Successfully rescheduled to different branch' : 'Failed to reschedule across branches',
          !rescheduleSuccess ? rescheduleResponse.body : null
        );
      }
    }

    console.log('\n📋 Test 6: Business Rules Validation');

    // Test 6.1: Capacity limit enforcement
    const limitedSlot = slots.find(s => s.capacity === 1);
    if (limitedSlot) {
      // First booking should succeed
      const firstBookingResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${student1.token}`)
        .send({
          slotId: limitedSlot.id,
          studentPhoneNumber: student1.phoneNumber
        });

      // Second booking should fail due to capacity
      const secondBookingResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${student2.token}`)
        .send({
          slotId: limitedSlot.id,
          studentPhoneNumber: student2.phoneNumber
        });

      const capacityEnforced = firstBookingResponse.status === 201 && 
                              secondBookingResponse.status === 400;

      formatTestResult(
        'Slot capacity limit enforcement',
        capacityEnforced,
        capacityEnforced ? 'Capacity limits correctly enforced' : 'Failed to enforce capacity limits',
        !capacityEnforced ? { first: firstBookingResponse.body, second: secondBookingResponse.body } : null
      );
    }

    // Test 6.2: 24-hour cancellation rule
    const pastSlot = await testDataManager.testPrisma.slot.create({
      data: {
        branchId: branches[0].id,
        teacherId: teacher1.id,
        date: new Date(Date.now() + 23 * 60 * 60 * 1000), // 23 hours from now
        startTime: '16:00',
        endTime: '16:30',
        capacity: 1
      }
    });

    const pastBookingResponse = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${student1.token}`)
      .send({
        slotId: pastSlot.id,
        studentPhoneNumber: student1.phoneNumber
      });

    if (pastBookingResponse.status === 201) {
      const pastBookingId = pastBookingResponse.body.booking?.id;
      
      const lateCancellationResponse = await request(app)
        .put(`/api/bookings/${pastBookingId}/cancel`)
        .set('Authorization', `Bearer ${student1.token}`)
        .send({
          reason: 'Late cancellation test'
        });

      const lateCancellationBlocked = lateCancellationResponse.status === 400 ||
                                    lateCancellationResponse.body.error?.includes('24 hour');

      formatTestResult(
        '24-hour cancellation rule enforcement',
        lateCancellationBlocked,
        lateCancellationBlocked ? '24-hour rule correctly enforced' : 'Failed to enforce 24-hour rule',
        !lateCancellationBlocked ? lateCancellationResponse.body : null
      );
    }

  } catch (error) {
    console.error('❌ Booking integration test error:', error);
    formatTestResult('Booking Integration Tests', false, 'Test suite failed with error', error);
  } finally {
    await testDataManager.cleanup();
  }

  console.log('\n✅ Cross-Branch Booking Integration Tests Completed\n');
}

// Export for use in main test runner
export default runBookingIntegrationTests;