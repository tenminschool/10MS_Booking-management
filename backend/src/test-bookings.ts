import prisma from './lib/prisma';
import { generateToken } from './utils/jwt';

interface TestResult {
  test: string;
  success: boolean;
  message: string;
  data?: any;
}

interface ApiResponse {
  message?: string;
  error?: string;
  [key: string]: any;
}

interface SlotResponse extends ApiResponse {
  slot?: {
    id: string;
    [key: string]: any;
  };
}

interface BookingResponse extends ApiResponse {
  booking?: {
    id: string;
    status: string;
    slot: {
      branch: {
        name: string;
      };
      [key: string]: any;
    };
    [key: string]: any;
  };
  previousSlot?: {
    branch: string;
    [key: string]: any;
  };
}

interface AvailableResponse extends ApiResponse {
  slots: Array<{
    id: string;
    [key: string]: any;
  }>;
  total: number;
}

interface MonthlyCheckResponse extends ApiResponse {
  hasMonthlyBooking: boolean;
  existingBooking?: any;
}

const results: TestResult[] = [];

function addResult(test: string, success: boolean, message: string, data?: any) {
  results.push({ test, success, message, data });
  const status = success ? '✅' : '❌';
  console.log(`${status} ${test}: ${message}`);
  if (data) {
    console.log('   Data:', JSON.stringify(data, null, 2));
  }
}

async function makeRequest(url: string, options: any = {}): Promise<{ response: Response; data: any }> {
  const baseUrl = 'http://localhost:3001';
  const response = await fetch(`${baseUrl}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  const data = await response.json();
  return { response, data };
}

async function testBookingFunctionality() {
  console.log('🧪 Testing Cross-Branch Booking Functionality\n');

  try {
    // Setup: Get test data
    const branches = await prisma.branch.findMany({ take: 2 });
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      take: 2
    });
    const teachers = await prisma.user.findMany({
      where: { role: 'TEACHER' },
      take: 2
    });
    const branchAdmin = await prisma.user.findFirst({
      where: { role: 'BRANCH_ADMIN' }
    });
    const superAdmin = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' }
    });

    if (!branches.length || !students.length || !teachers.length || !branchAdmin || !superAdmin) {
      addResult('Setup', false, 'Missing required test data (branches, students, teachers, admins)');
      return;
    }

    // Create test slots in different branches
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    const dayAfterStr = dayAfter.toISOString().split('T')[0];

    // Generate tokens
    const studentToken = generateToken({
      userId: students[0].id,
      role: students[0].role,
      branchId: students[0].branchId ?? undefined
    });

    const adminToken = generateToken({
      userId: superAdmin.id,
      role: superAdmin.role,
      branchId: superAdmin.branchId ?? undefined
    });

    const branchAdminToken = generateToken({
      userId: branchAdmin.id,
      role: branchAdmin.role,
      branchId: branchAdmin.branchId ?? undefined
    });

    // Test 1: Create slots in different branches
    console.log('\n📅 Testing Slot Creation for Cross-Branch Booking');

    const slot1Data = {
      branchId: branches[0].id,
      teacherId: teachers[0].id,
      date: tomorrowStr,
      startTime: '10:00',
      endTime: '11:00',
      capacity: 2
    };

    const slot2Data = {
      branchId: branches[1] ? branches[1].id : branches[0].id,
      teacherId: teachers[1] ? teachers[1].id : teachers[0].id,
      date: dayAfterStr,
      startTime: '14:00',
      endTime: '15:00',
      capacity: 1
    };

    const { response: slotRes1, data: slotData1 } = await makeRequest('/api/slots', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(slot1Data)
    });

    const slotResponse1 = slotData1 as SlotResponse;
    if (slotRes1.status === 201) {
      addResult('Create Slot 1', true, 'Slot created successfully in branch 1', { slotId: slotResponse1.slot?.id });
    } else {
      addResult('Create Slot 1', false, `Failed to create slot: ${slotResponse1.message}`, slotResponse1);
    }

    const { response: slotRes2, data: slotData2 } = await makeRequest('/api/slots', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(slot2Data)
    });

    const slotResponse2 = slotData2 as SlotResponse;
    if (slotRes2.status === 201) {
      addResult('Create Slot 2', true, 'Slot created successfully in branch 2', { slotId: slotResponse2.slot?.id });
    } else {
      addResult('Create Slot 2', false, `Failed to create slot: ${slotResponse2.message}`, slotResponse2);
    }

    const slot1Id = slotResponse1.slot?.id;
    const slot2Id = slotResponse2.slot?.id;

    if (!slot1Id || !slot2Id) {
      addResult('Slot Setup', false, 'Could not create required test slots');
      return;
    }

    // Test 2: Get available slots across branches
    console.log('\n🔍 Testing Cross-Branch Slot Availability');

    const { response: availableRes, data: availableData } = await makeRequest('/api/bookings/available-slots', {
      headers: { Authorization: `Bearer ${studentToken}` }
    });

    const availableResponse = availableData as AvailableResponse;
    if (availableRes.status === 200) {
      const crossBranchSlots = availableResponse.slots.filter((slot: any) =>
        [slot1Id, slot2Id].includes(slot.id)
      );
      addResult('Cross-Branch Availability', true,
        `Found ${crossBranchSlots.length} available slots across branches`,
        { totalSlots: availableResponse.total, testSlots: crossBranchSlots.length }
      );
    } else {
      addResult('Cross-Branch Availability', false, `Failed to get available slots: ${availableResponse.message}`);
    }

    // Test 3: Create booking in first branch
    console.log('\n📝 Testing Booking Creation');

    const { response: bookingRes1, data: bookingData1 } = await makeRequest('/api/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({ slotId: slot1Id })
    });

    const bookingResponse1 = bookingData1 as BookingResponse;
    if (bookingRes1.status === 201) {
      addResult('Create Booking 1', true, 'Booking created successfully', { bookingId: bookingResponse1.booking?.id });
    } else {
      addResult('Create Booking 1', false, `Failed to create booking: ${bookingResponse1.message}`, bookingResponse1);
    }

    const booking1Id = bookingResponse1.booking?.id;

    // Test 4: Test monthly duplicate prevention across branches
    console.log('\n🚫 Testing Monthly Duplicate Prevention');

    const { response: dupRes, data: dupData } = await makeRequest('/api/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({ slotId: slot2Id })
    });

    const dupResponse = dupData as ApiResponse;
    if (dupRes.status === 409 && dupResponse.error === 'Monthly Limit Error') {
      addResult('Monthly Duplicate Prevention', true, 'Correctly prevented duplicate monthly booking across branches');
    } else if (dupRes.status === 201) {
      addResult('Monthly Duplicate Prevention', false, 'Should have prevented duplicate monthly booking', dupResponse);
    } else {
      addResult('Monthly Duplicate Prevention', false, `Unexpected response: ${dupResponse.message}`, dupResponse);
    }

    // Test 5: Check monthly booking status
    console.log('\n📊 Testing Monthly Booking Check');

    const { response: monthlyRes, data: monthlyData } = await makeRequest(
      `/api/bookings/student/${students[0].id}/monthly-check?date=${tomorrowStr}`,
      { headers: { Authorization: `Bearer ${studentToken}` } }
    );

    const monthlyResponse = monthlyData as MonthlyCheckResponse;
    if (monthlyRes.status === 200 && monthlyResponse.hasMonthlyBooking) {
      addResult('Monthly Booking Check', true, 'Correctly identified existing monthly booking', monthlyResponse);
    } else {
      addResult('Monthly Booking Check', false, 'Failed to identify monthly booking', monthlyResponse);
    }

    // Test 6: Test capacity management
    console.log('\n📈 Testing Capacity Management');

    // Try to book the same slot with another student
    const student2Token = generateToken({
      userId: students[1].id,
      role: students[1].role,
      branchId: students[1].branchId ?? undefined
    });

    const { response: capacityRes, data: capacityData } = await makeRequest('/api/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${student2Token}` },
      body: JSON.stringify({ slotId: slot1Id })
    });

    const capacityResponse = capacityData as BookingResponse;
    if (capacityRes.status === 201) {
      addResult('Capacity Management', true, 'Second booking created (within capacity)', { bookingId: capacityResponse.booking?.id });
    } else {
      addResult('Capacity Management', false, `Failed to create second booking: ${capacityResponse.message}`, capacityResponse);
    }

    // Test 7: Test capacity limit
    console.log('\n🔒 Testing Capacity Limit');

    // Create a third student booking to test capacity limit (slot1 has capacity 2)
    const student3 = await prisma.user.findFirst({
      where: {
        role: 'STUDENT',
        id: { notIn: [students[0].id, students[1].id] }
      }
    });

    if (student3) {
      const student3Token = generateToken({
        userId: student3.id,
        role: student3.role,
        branchId: student3.branchId ?? undefined
      });

      const { response: limitRes, data: limitData } = await makeRequest('/api/bookings', {
        method: 'POST',
        headers: { Authorization: `Bearer ${student3Token}` },
        body: JSON.stringify({ slotId: slot1Id })
      });

      const limitResponse = limitData as ApiResponse;
      if (limitRes.status === 409 && limitResponse.error === 'Capacity Error') {
        addResult('Capacity Limit', true, 'Correctly prevented overbooking');
      } else {
        addResult('Capacity Limit', false, `Should have prevented overbooking: ${limitResponse.message}`, limitResponse);
      }
    }

    // Test 8: Test booking cancellation with 24-hour rule
    console.log('\n❌ Testing Booking Cancellation');

    if (booking1Id) {
      const { response: cancelRes, data: cancelData } = await makeRequest(`/api/bookings/${booking1Id}/cancel`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${studentToken}` },
        body: JSON.stringify({ cancellationReason: 'Test cancellation' })
      });

      const cancelResponse = cancelData as BookingResponse;
      if (cancelRes.status === 200) {
        addResult('Booking Cancellation', true, 'Booking cancelled successfully', { status: cancelResponse.booking?.status });
      } else {
        addResult('Booking Cancellation', false, `Failed to cancel booking: ${cancelResponse.message}`, cancelResponse);
      }
    }

    // Test 9: Test cross-branch rescheduling
    console.log('\n🔄 Testing Cross-Branch Rescheduling');

    // First, create a new booking to reschedule
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    // Create a slot for next week
    const futureSlotPayload = {
      branchId: branches[0].id,
      teacherId: teachers[0].id,
      date: nextWeekStr,
      startTime: '16:00',
      endTime: '17:00',
      capacity: 1
    };

    const { response: futureSlotRes, data: futureSlotData } = await makeRequest('/api/slots', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(futureSlotPayload)
    });

    const futureSlotResponse = futureSlotData as SlotResponse;
    if (futureSlotRes.status === 201) {
      // Create booking for future slot
      const { response: futureBookingRes, data: futureBookingData } = await makeRequest('/api/bookings', {
        method: 'POST',
        headers: { Authorization: `Bearer ${student2Token}` },
        body: JSON.stringify({ slotId: futureSlotResponse.slot?.id })
      });

      const futureBookingResponse = futureBookingData as BookingResponse;
      if (futureBookingRes.status === 201) {
        // Create another slot in different branch for rescheduling
        const rescheduleSlotPayload = {
          branchId: branches[1] ? branches[1].id : branches[0].id,
          teacherId: teachers[1] ? teachers[1].id : teachers[0].id,
          date: nextWeekStr,
          startTime: '18:00',
          endTime: '19:00',
          capacity: 1
        };

        const { response: rescheduleSlotRes, data: rescheduleSlotData } = await makeRequest('/api/slots', {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}` },
          body: JSON.stringify(rescheduleSlotPayload)
        });

        const rescheduleSlotResponse = rescheduleSlotData as SlotResponse;
        if (rescheduleSlotRes.status === 201) {
          // Now test rescheduling
          const { response: rescheduleRes, data: rescheduleData } = await makeRequest(
            `/api/bookings/${futureBookingResponse.booking?.id}/reschedule`,
            {
              method: 'PUT',
              headers: { Authorization: `Bearer ${student2Token}` },
              body: JSON.stringify({ newSlotId: rescheduleSlotResponse.slot?.id })
            }
          );

          const rescheduleResponse = rescheduleData as BookingResponse;
          if (rescheduleRes.status === 200) {
            addResult('Cross-Branch Rescheduling', true, 'Successfully rescheduled across branches', {
              oldBranch: rescheduleResponse.previousSlot?.branch,
              newBranch: rescheduleResponse.booking?.slot.branch.name
            });
          } else {
            addResult('Cross-Branch Rescheduling', false, `Failed to reschedule: ${rescheduleResponse.message}`, rescheduleResponse);
          }
        }
      }
    }

    // Test 10: Test admin booking for student
    console.log('\n👨‍💼 Testing Admin Booking for Student');

    // Create another slot for admin booking test
    const adminSlotData = {
      branchId: branches[0].id,
      teacherId: teachers[0].id,
      date: nextWeekStr,
      startTime: '09:00',
      endTime: '10:00',
      capacity: 1
    };

    const { response: adminSlotRes, data: adminSlotDataRes } = await makeRequest('/api/slots', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(adminSlotData)
    });

    const adminSlotResponse = adminSlotDataRes as SlotResponse;
    if (adminSlotRes.status === 201) {
      const { response: adminBookingRes, data: adminBookingData } = await makeRequest('/api/bookings', {
        method: 'POST',
        headers: { Authorization: `Bearer ${branchAdminToken}` },
        body: JSON.stringify({
          slotId: adminSlotResponse.slot?.id,
          studentPhoneNumber: students[0].phoneNumber
        })
      });

      const adminBookingResponse = adminBookingData as BookingResponse;
      if (adminBookingRes.status === 201) {
        addResult('Admin Booking for Student', true, 'Admin successfully created booking for student');
      } else {
        addResult('Admin Booking for Student', false, `Failed admin booking: ${adminBookingResponse.message}`, adminBookingResponse);
      }
    }

    // Test 11: Test attendance marking
    console.log('\n✅ Testing Attendance Marking');

    // Get a confirmed booking to mark attendance
    const confirmedBookings = await prisma.booking.findMany({
      where: { status: 'CONFIRMED' },
      include: { slot: { include: { teacher: true } } },
      take: 1
    });

    if (confirmedBookings.length > 0) {
      const booking = confirmedBookings[0];
      const teacherToken = generateToken({
        userId: booking.slot.teacher.id,
        role: 'TEACHER',
        branchId: booking.slot.teacher.branchId ?? undefined
      });

      const { response: attendanceRes, data: attendanceData } = await makeRequest(
        `/api/bookings/${booking.id}/attendance`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${teacherToken}` },
          body: JSON.stringify({ attended: true })
        }
      );

      const attendanceResponse = attendanceData as BookingResponse;
      if (attendanceRes.status === 200) {
        addResult('Attendance Marking', true, 'Successfully marked attendance', { status: attendanceResponse.booking?.status });
      } else {
        addResult('Attendance Marking', false, `Failed to mark attendance: ${attendanceResponse.message}`, attendanceResponse);
      }
    }

  } catch (error) {
    addResult('Test Execution', false, `Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Summary
  console.log('\n📊 Test Summary');
  console.log('================');
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);

  if (passed === total) {
    console.log('\n🎉 All tests passed! Cross-branch booking functionality is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the implementation.');
    console.log('\nFailed tests:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.test}: ${r.message}`);
    });
  }
}

// Run tests
testBookingFunctionality().catch(console.error);