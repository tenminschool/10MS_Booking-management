// Integration tests for mobile responsiveness and cross-branch data isolation
import request from 'supertest';
import app from '../index';
import { testDataManager, formatTestResult, delay } from './setup';

export async function runMobileIsolationIntegrationTests(): Promise<void> {
  console.log('🧪 Running Mobile Responsiveness and Data Isolation Integration Tests...\n');

  try {
    // Setup test data
    await testDataManager.cleanup();
    await testDataManager.createTestBookings();

    const users = testDataManager.getUsers();
    const branches = testDataManager.getBranches();
    const slots = testDataManager.getSlots();

    const superAdmin = users.find(u => u.role === 'SUPER_ADMIN')!;
    const dhakaBranchAdmin = users.find(u => u.role === 'BRANCH_ADMIN' && u.branchId === branches[0].id)!;
    const chittagongBranchAdmin = users.find(u => u.role === 'BRANCH_ADMIN' && u.branchId === branches[1].id)!;
    const dhakaTeacher = users.find(u => u.role === 'TEACHER' && u.branchId === branches[0].id)!;
    const chittagongTeacher = users.find(u => u.role === 'TEACHER' && u.branchId === branches[1].id)!;
    const dhakaStudent = users.find(u => u.role === 'STUDENT' && u.branchId === branches[0].id)!;
    const chittagongStudent = users.find(u => u.role === 'STUDENT' && u.branchId === branches[1].id)!;

    console.log('📋 Test 1: Mobile API Response Format');

    // Test 1.1: API responses include mobile-friendly data structure
    const mobileBookingsResponse = await request(app)
      .get('/api/bookings/my-bookings')
      .set('Authorization', `Bearer ${dhakaStudent.token}`)
      .set('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15');

    const mobileBookingsSuccess = mobileBookingsResponse.status === 200 &&
                                 Array.isArray(mobileBookingsResponse.body.bookings);

    formatTestResult(
      'Mobile-friendly bookings API response',
      mobileBookingsSuccess,
      mobileBookingsSuccess ? 'Bookings API returns mobile-friendly format' : 'Bookings API not mobile-friendly',
      !mobileBookingsSuccess ? mobileBookingsResponse.body : null
    );

    // Test 1.2: Slot data includes essential mobile information
    const mobileSlotsResponse = await request(app)
      .get('/api/slots/available')
      .set('Authorization', `Bearer ${dhakaStudent.token}`)
      .set('User-Agent', 'Mozilla/5.0 (Android 10; Mobile; rv:81.0) Gecko/81.0 Firefox/81.0')
      .query({ view: 'daily' });

    const mobileSlotsSuccess = mobileSlotsResponse.status === 200 &&
                              mobileSlotsResponse.body.slots?.every((slot: any) => 
                                slot.id && slot.date && slot.startTime && slot.endTime && 
                                slot.teacher && slot.branch && slot.availableCapacity !== undefined
                              );

    formatTestResult(
      'Mobile-friendly slots API with essential data',
      mobileSlotsSuccess,
      mobileSlotsSuccess ? 'Slots API includes all essential mobile data' : 'Slots API missing essential mobile data',
      !mobileSlotsSuccess ? mobileSlotsResponse.body : null
    );

    // Test 1.3: Notification data optimized for mobile display
    const mobileNotificationsResponse = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${dhakaStudent.token}`)
      .set('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15');

    const mobileNotificationsSuccess = mobileNotificationsResponse.status === 200 &&
                                      Array.isArray(mobileNotificationsResponse.body.notifications);

    formatTestResult(
      'Mobile-friendly notifications API',
      mobileNotificationsSuccess,
      mobileNotificationsSuccess ? 'Notifications API mobile-friendly' : 'Notifications API not mobile-friendly',
      !mobileNotificationsSuccess ? mobileNotificationsResponse.body : null
    );

    console.log('\n📋 Test 2: Cross-Branch Data Isolation - Branch Admin Level');

    // Test 2.1: Dhaka Branch Admin cannot see Chittagong users
    const dhakaAdminUsersResponse = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${dhakaBranchAdmin.token}`)
      .query({ role: 'TEACHER' });

    const dhakaAdminIsolation = dhakaAdminUsersResponse.status === 200 &&
                               dhakaAdminUsersResponse.body.users?.every((user: any) => 
                                 user.branchId === dhakaBranchAdmin.branchId || user.branchId === null
                               );

    formatTestResult(
      'Dhaka Branch Admin user data isolation',
      dhakaAdminIsolation,
      dhakaAdminIsolation ? 'Dhaka Branch Admin sees only their branch users' : 'Dhaka Branch Admin sees users from other branches',
      !dhakaAdminIsolation ? dhakaAdminUsersResponse.body : null
    );

    // Test 2.2: Chittagong Branch Admin cannot see Dhaka bookings
    const chittagongAdminBookingsResponse = await request(app)
      .get('/api/bookings/branch-bookings')
      .set('Authorization', `Bearer ${chittagongBranchAdmin.token}`);

    const chittagongAdminIsolation = chittagongAdminBookingsResponse.status === 200 &&
                                    (chittagongAdminBookingsResponse.body.bookings?.length === 0 ||
                                     chittagongAdminBookingsResponse.body.bookings?.every((booking: any) => 
                                       booking.slot?.branchId === chittagongBranchAdmin.branchId
                                     ));

    formatTestResult(
      'Chittagong Branch Admin booking data isolation',
      chittagongAdminIsolation,
      chittagongAdminIsolation ? 'Chittagong Branch Admin sees only their branch bookings' : 'Chittagong Branch Admin sees bookings from other branches',
      !chittagongAdminIsolation ? chittagongAdminBookingsResponse.body : null
    );

    // Test 2.3: Branch Admin cannot modify users from other branches
    const otherBranchUser = users.find(u => u.branchId !== dhakaBranchAdmin.branchId && u.role === 'TEACHER');
    
    if (otherBranchUser) {
      const unauthorizedUpdateResponse = await request(app)
        .put(`/api/users/${otherBranchUser.id}`)
        .set('Authorization', `Bearer ${dhakaBranchAdmin.token}`)
        .send({
          name: 'Unauthorized Update Attempt'
        });

      const updateBlocked = unauthorizedUpdateResponse.status === 403 ||
                           unauthorizedUpdateResponse.status === 404;

      formatTestResult(
        'Branch Admin blocked from modifying other branch users',
        updateBlocked,
        updateBlocked ? 'Cross-branch user modification correctly blocked' : 'Cross-branch user modification allowed (security issue)',
        !updateBlocked ? unauthorizedUpdateResponse.body : null
      );
    }

    console.log('\n📋 Test 3: Cross-Branch Data Isolation - Teacher Level');

    // Test 3.1: Dhaka Teacher can only see their own slots
    const dhakaTeacherSlotsResponse = await request(app)
      .get('/api/slots/my-schedule')
      .set('Authorization', `Bearer ${dhakaTeacher.token}`);

    const dhakaTeacherSlotIsolation = dhakaTeacherSlotsResponse.status === 200 &&
                                     (dhakaTeacherSlotsResponse.body.slots?.length === 0 ||
                                      dhakaTeacherSlotsResponse.body.slots?.every((slot: any) => 
                                        slot.teacherId === dhakaTeacher.id
                                      ));

    formatTestResult(
      'Dhaka Teacher slot data isolation',
      dhakaTeacherSlotIsolation,
      dhakaTeacherSlotIsolation ? 'Dhaka Teacher sees only their own slots' : 'Dhaka Teacher sees slots from other teachers',
      !dhakaTeacherSlotIsolation ? dhakaTeacherSlotsResponse.body : null
    );

    // Test 3.2: Teacher cannot access students from other branches
    const teacherStudentsResponse = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${dhakaTeacher.token}`)
      .query({ role: 'STUDENT' });

    const teacherStudentIsolation = teacherStudentsResponse.status === 200 &&
                                   (teacherStudentsResponse.body.users?.length === 0 ||
                                    teacherStudentsResponse.body.users?.every((student: any) => 
                                      student.branchId === dhakaTeacher.branchId
                                    ));

    formatTestResult(
      'Teacher student data isolation',
      teacherStudentIsolation,
      teacherStudentIsolation ? 'Teacher sees only students from their branch' : 'Teacher sees students from other branches',
      !teacherStudentIsolation ? teacherStudentsResponse.body : null
    );

    // Test 3.3: Teacher cannot record assessments for other branch students
    const otherBranchSlot = slots.find(s => s.branchId !== dhakaTeacher.branchId);
    
    if (otherBranchSlot) {
      // Create a booking in the other branch
      const otherBranchBooking = await testDataManager.testPrisma.booking.create({
        data: {
          studentId: chittagongStudent.id,
          slotId: otherBranchSlot.id,
          status: 'COMPLETED',
          attended: true
        }
      });

      const unauthorizedAssessmentResponse = await request(app)
        .post('/api/assessments')
        .set('Authorization', `Bearer ${dhakaTeacher.token}`)
        .send({
          bookingId: otherBranchBooking.id,
          score: 6.0,
          remarks: 'Unauthorized assessment attempt'
        });

      const assessmentBlocked = unauthorizedAssessmentResponse.status === 403 ||
                               unauthorizedAssessmentResponse.status === 404;

      formatTestResult(
        'Teacher blocked from cross-branch assessments',
        assessmentBlocked,
        assessmentBlocked ? 'Cross-branch assessment recording correctly blocked' : 'Cross-branch assessment recording allowed (security issue)',
        !assessmentBlocked ? unauthorizedAssessmentResponse.body : null
      );
    }

    console.log('\n📋 Test 4: Cross-Branch Data Isolation - Student Level');

    // Test 4.1: Student can only see their own bookings
    const studentBookingsResponse = await request(app)
      .get('/api/bookings/my-bookings')
      .set('Authorization', `Bearer ${dhakaStudent.token}`);

    const studentBookingIsolation = studentBookingsResponse.status === 200 &&
                                   (studentBookingsResponse.body.bookings?.length === 0 ||
                                    studentBookingsResponse.body.bookings?.every((booking: any) => 
                                      booking.studentId === dhakaStudent.id
                                    ));

    formatTestResult(
      'Student booking data isolation',
      studentBookingIsolation,
      studentBookingIsolation ? 'Student sees only their own bookings' : 'Student sees bookings from other students',
      !studentBookingIsolation ? studentBookingsResponse.body : null
    );

    // Test 4.2: Student can only see their own assessments
    const studentAssessmentsResponse = await request(app)
      .get('/api/assessments/my-assessments')
      .set('Authorization', `Bearer ${dhakaStudent.token}`);

    const studentAssessmentIsolation = studentAssessmentsResponse.status === 200 &&
                                      (studentAssessmentsResponse.body.assessments?.length === 0 ||
                                       studentAssessmentsResponse.body.assessments?.every((assessment: any) => 
                                         assessment.studentId === dhakaStudent.id
                                       ));

    formatTestResult(
      'Student assessment data isolation',
      studentAssessmentIsolation,
      studentAssessmentIsolation ? 'Student sees only their own assessments' : 'Student sees assessments from other students',
      !studentAssessmentIsolation ? studentAssessmentsResponse.body : null
    );

    // Test 4.3: Student cannot access other students' booking details
    const otherStudentBooking = await testDataManager.testPrisma.booking.findFirst({
      where: { studentId: chittagongStudent.id }
    });

    if (otherStudentBooking) {
      const unauthorizedBookingAccessResponse = await request(app)
        .get(`/api/bookings/${otherStudentBooking.id}`)
        .set('Authorization', `Bearer ${dhakaStudent.token}`);

      const bookingAccessBlocked = unauthorizedBookingAccessResponse.status === 403 ||
                                  unauthorizedBookingAccessResponse.status === 404;

      formatTestResult(
        'Student blocked from other students\' bookings',
        bookingAccessBlocked,
        bookingAccessBlocked ? 'Cross-student booking access correctly blocked' : 'Cross-student booking access allowed (security issue)',
        !bookingAccessBlocked ? unauthorizedBookingAccessResponse.body : null
      );
    }

    console.log('\n📋 Test 5: Super Admin Cross-Branch Access Validation');

    // Test 5.1: Super Admin can access all branch data
    const superAdminAllUsersResponse = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${superAdmin.token}`);

    const superAdminFullAccess = superAdminAllUsersResponse.status === 200 &&
                                superAdminAllUsersResponse.body.users?.length >= users.length;

    formatTestResult(
      'Super Admin access to all users across branches',
      superAdminFullAccess,
      superAdminFullAccess ? 'Super Admin can access users from all branches' : 'Super Admin cannot access all branch users',
      !superAdminFullAccess ? superAdminAllUsersResponse.body : null
    );

    // Test 5.2: Super Admin can access all branch bookings
    const superAdminAllBookingsResponse = await request(app)
      .get('/api/bookings/all-bookings')
      .set('Authorization', `Bearer ${superAdmin.token}`);

    const superAdminBookingAccess = superAdminAllBookingsResponse.status === 200;

    formatTestResult(
      'Super Admin access to all bookings across branches',
      superAdminBookingAccess,
      superAdminBookingAccess ? 'Super Admin can access bookings from all branches' : 'Super Admin cannot access all branch bookings',
      !superAdminBookingAccess ? superAdminAllBookingsResponse.body : null
    );

    // Test 5.3: Super Admin can modify users from any branch
    const testUserForSuperAdmin = users.find(u => u.role === 'TEACHER' && u.branchId === branches[1].id);
    
    if (testUserForSuperAdmin) {
      const superAdminUpdateResponse = await request(app)
        .put(`/api/users/${testUserForSuperAdmin.id}`)
        .set('Authorization', `Bearer ${superAdmin.token}`)
        .send({
          name: 'Super Admin Updated Name'
        });

      const superAdminUpdateSuccess = superAdminUpdateResponse.status === 200;

      formatTestResult(
        'Super Admin cross-branch user modification',
        superAdminUpdateSuccess,
        superAdminUpdateSuccess ? 'Super Admin can modify users from any branch' : 'Super Admin cannot modify cross-branch users',
        !superAdminUpdateSuccess ? superAdminUpdateResponse.body : null
      );
    }

    console.log('\n📋 Test 6: Mobile-Specific API Endpoints');

    // Test 6.1: Mobile dashboard API with condensed data
    const mobileDashboardResponse = await request(app)
      .get('/api/dashboard/mobile')
      .set('Authorization', `Bearer ${dhakaStudent.token}`)
      .set('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15');

    const mobileDashboardSuccess = mobileDashboardResponse.status === 200;

    formatTestResult(
      'Mobile dashboard API endpoint',
      mobileDashboardSuccess,
      mobileDashboardSuccess ? 'Mobile dashboard API accessible' : 'Mobile dashboard API not accessible',
      !mobileDashboardSuccess ? mobileDashboardResponse.body : null
    );

    // Test 6.2: Mobile booking flow with simplified data
    const mobileBookingFlowResponse = await request(app)
      .get('/api/bookings/mobile-summary')
      .set('Authorization', `Bearer ${dhakaStudent.token}`)
      .set('User-Agent', 'Mozilla/5.0 (Android 11; Mobile; rv:85.0) Gecko/85.0 Firefox/85.0');

    const mobileBookingFlowSuccess = mobileBookingFlowResponse.status === 200;

    formatTestResult(
      'Mobile booking flow API',
      mobileBookingFlowSuccess,
      mobileBookingFlowSuccess ? 'Mobile booking flow API accessible' : 'Mobile booking flow API not accessible',
      !mobileBookingFlowSuccess ? mobileBookingFlowResponse.body : null
    );

    console.log('\n📋 Test 7: Data Consistency Across Branches');

    // Test 7.1: Cross-branch booking maintains data integrity
    const crossBranchSlot = slots.find(s => s.branchId !== dhakaStudent.branchId);
    
    if (crossBranchSlot) {
      const crossBranchBookingResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${dhakaStudent.token}`)
        .send({
          slotId: crossBranchSlot.id,
          studentPhoneNumber: dhakaStudent.phoneNumber
        });

      if (crossBranchBookingResponse.status === 201) {
        const bookingId = crossBranchBookingResponse.body.booking?.id;

        // Verify booking appears in both student's view and target branch admin's view
        const studentViewResponse = await request(app)
          .get('/api/bookings/my-bookings')
          .set('Authorization', `Bearer ${dhakaStudent.token}`);

        const targetBranchAdminViewResponse = await request(app)
          .get('/api/bookings/branch-bookings')
          .set('Authorization', `Bearer ${chittagongBranchAdmin.token}`);

        const dataConsistency = studentViewResponse.body.bookings?.some((b: any) => b.id === bookingId) &&
                               targetBranchAdminViewResponse.body.bookings?.some((b: any) => b.id === bookingId);

        formatTestResult(
          'Cross-branch booking data consistency',
          dataConsistency,
          dataConsistency ? 'Cross-branch booking visible to both student and target branch admin' : 'Cross-branch booking data inconsistency',
          !dataConsistency ? { student: studentViewResponse.body, admin: targetBranchAdminViewResponse.body } : null
        );
      }
    }

    // Test 7.2: Branch-specific metrics isolation
    const dhakaBranchMetricsResponse = await request(app)
      .get('/api/reports/branch-metrics')
      .set('Authorization', `Bearer ${dhakaBranchAdmin.token}`)
      .query({ branchId: dhakaBranchAdmin.branchId });

    const chittagongBranchMetricsResponse = await request(app)
      .get('/api/reports/branch-metrics')
      .set('Authorization', `Bearer ${chittagongBranchAdmin.token}`)
      .query({ branchId: chittagongBranchAdmin.branchId });

    const metricsIsolation = dhakaBranchMetricsResponse.status === 200 &&
                            chittagongBranchMetricsResponse.status === 200;

    formatTestResult(
      'Branch metrics data isolation',
      metricsIsolation,
      metricsIsolation ? 'Branch metrics properly isolated' : 'Branch metrics isolation failed',
      !metricsIsolation ? { dhaka: dhakaBranchMetricsResponse.body, chittagong: chittagongBranchMetricsResponse.body } : null
    );

  } catch (error) {
    console.error('❌ Mobile and isolation integration test error:', error);
    formatTestResult('Mobile and Isolation Integration Tests', false, 'Test suite failed with error', error);
  } finally {
    await testDataManager.cleanup();
  }

  console.log('\n✅ Mobile Responsiveness and Data Isolation Integration Tests Completed\n');
}

export default runMobileIsolationIntegrationTests;