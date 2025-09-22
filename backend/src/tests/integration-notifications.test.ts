// Integration tests for multi-channel notification system
import request from 'supertest';
import app from '../index';
import { testDataManager, formatTestResult, delay } from './setup';

export async function runNotificationIntegrationTests(): Promise<void> {
  console.log('🧪 Running Multi-Channel Notification Integration Tests...\n');

  try {
    // Setup test data
    await testDataManager.cleanup();
    await testDataManager.createTestBookings();

    const users = testDataManager.getUsers();
    const bookings = testDataManager.getBookings();
    const slots = testDataManager.getSlots();
    const branches = testDataManager.getBranches();

    const student = users.find(u => u.role === 'STUDENT')!;
    const teacher = users.find(u => u.role === 'TEACHER')!;
    const branchAdmin = users.find(u => u.role === 'BRANCH_ADMIN')!;

    console.log('📋 Test 1: Booking Confirmation Notifications');

    // Test 1.1: Create booking and verify notifications
    const availableSlot = slots.find(s => s.branchId === student.branchId);
    
    const bookingResponse = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${student.token}`)
      .send({
        slotId: availableSlot?.id,
        studentPhoneNumber: student.phoneNumber
      });

    let newBookingId: string | null = null;
    if (bookingResponse.status === 201) {
      newBookingId = bookingResponse.body.booking?.id;
    }

    // Wait for notification processing
    await delay(500);

    // Test 1.2: Check in-app notification creation
    const inAppNotificationsResponse = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${student.token}`);

    const confirmationNotificationExists = inAppNotificationsResponse.status === 200 &&
                                          inAppNotificationsResponse.body.notifications?.some((n: any) => 
                                            n.type === 'BOOKING_CONFIRMED' && n.userId === student.id
                                          );

    formatTestResult(
      'In-app booking confirmation notification',
      confirmationNotificationExists,
      confirmationNotificationExists ? 'In-app confirmation notification created' : 'In-app confirmation notification missing',
      !confirmationNotificationExists ? inAppNotificationsResponse.body : null
    );

    // Test 1.3: Check SMS notification delivery status
    const smsStatusResponse = await request(app)
      .get('/api/notifications/sms-status')
      .set('Authorization', `Bearer ${student.token}`)
      .query({ bookingId: newBookingId });

    const smsStatusTracked = smsStatusResponse.status === 200;

    formatTestResult(
      'SMS notification delivery tracking',
      smsStatusTracked,
      smsStatusTracked ? 'SMS delivery status tracked' : 'SMS delivery status not tracked',
      !smsStatusTracked ? smsStatusResponse.body : null
    );

    console.log('\n📋 Test 2: Booking Reminder Notifications');

    // Test 2.1: Create booking for tomorrow to test reminders
    const tomorrowSlot = await testDataManager.testPrisma.slot.create({
      data: {
        branchId: branches[0].id,
        teacherId: teacher.id,
        date: new Date(Date.now() + 25 * 60 * 60 * 1000), // 25 hours from now
        startTime: '10:00',
        endTime: '10:30',
        capacity: 1
      }
    });

    const reminderBookingResponse = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${student.token}`)
      .send({
        slotId: tomorrowSlot.id,
        studentPhoneNumber: student.phoneNumber
      });

    const reminderBookingSuccess = reminderBookingResponse.status === 201;

    formatTestResult(
      'Booking creation for reminder test',
      reminderBookingSuccess,
      reminderBookingSuccess ? 'Booking created for reminder testing' : 'Failed to create booking for reminder test',
      !reminderBookingSuccess ? reminderBookingResponse.body : null
    );

    // Test 2.2: Trigger reminder system (simulate cron job)
    const triggerRemindersResponse = await request(app)
      .post('/api/notifications/trigger-reminders')
      .set('Authorization', `Bearer ${branchAdmin.token}`);

    const reminderTriggerSuccess = triggerRemindersResponse.status === 200;

    formatTestResult(
      'Reminder system trigger',
      reminderTriggerSuccess,
      reminderTriggerSuccess ? 'Reminder system triggered successfully' : 'Failed to trigger reminder system',
      !reminderTriggerSuccess ? triggerRemindersResponse.body : null
    );

    // Test 2.3: Check reminder notifications created
    await delay(500);

    const reminderNotificationsResponse = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${student.token}`);

    const reminderNotificationExists = reminderNotificationsResponse.status === 200 &&
                                      reminderNotificationsResponse.body.notifications?.some((n: any) => 
                                        n.type === 'BOOKING_REMINDER'
                                      );

    formatTestResult(
      'Reminder notification creation',
      reminderNotificationExists,
      reminderNotificationExists ? 'Reminder notifications created' : 'Reminder notifications not created',
      !reminderNotificationExists ? reminderNotificationsResponse.body : null
    );

    console.log('\n📋 Test 3: Cancellation Notifications');

    // Test 3.1: Student cancels booking
    if (newBookingId) {
      const cancellationResponse = await request(app)
        .put(`/api/bookings/${newBookingId}/cancel`)
        .set('Authorization', `Bearer ${student.token}`)
        .send({
          reason: 'Schedule conflict - test cancellation'
        });

      const cancellationSuccess = cancellationResponse.status === 200;

      formatTestResult(
        'Booking cancellation',
        cancellationSuccess,
        cancellationSuccess ? 'Booking cancelled successfully' : 'Failed to cancel booking',
        !cancellationSuccess ? cancellationResponse.body : null
      );

      // Test 3.2: Check cancellation notification
      if (cancellationSuccess) {
        await delay(500);

        const cancellationNotificationsResponse = await request(app)
          .get('/api/notifications')
          .set('Authorization', `Bearer ${student.token}`);

        const cancellationNotificationExists = cancellationNotificationsResponse.status === 200 &&
                                              cancellationNotificationsResponse.body.notifications?.some((n: any) => 
                                                n.type === 'BOOKING_CANCELLED'
                                              );

        formatTestResult(
          'Cancellation notification creation',
          cancellationNotificationExists,
          cancellationNotificationExists ? 'Cancellation notification created' : 'Cancellation notification not created',
          !cancellationNotificationExists ? cancellationNotificationsResponse.body : null
        );
      }
    }

    console.log('\n📋 Test 4: Teacher Cancellation Notifications');

    // Test 4.1: Create booking for teacher cancellation test
    const teacherCancelSlot = await testDataManager.testPrisma.slot.create({
      data: {
        branchId: branches[0].id,
        teacherId: teacher.id,
        date: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours from now
        startTime: '14:00',
        endTime: '14:30',
        capacity: 2
      }
    });

    const teacherCancelBooking1 = await testDataManager.testPrisma.booking.create({
      data: {
        studentId: student.id,
        slotId: teacherCancelSlot.id,
        status: 'CONFIRMED'
      }
    });

    const student2 = users.find(u => u.role === 'STUDENT' && u.id !== student.id);
    let teacherCancelBooking2: any = null;
    
    if (student2) {
      teacherCancelBooking2 = await testDataManager.testPrisma.booking.create({
        data: {
          studentId: student2.id,
          slotId: teacherCancelSlot.id,
          status: 'CONFIRMED'
        }
      });
    }

    // Test 4.2: Teacher cancels slot
    const teacherCancellationResponse = await request(app)
      .put(`/api/slots/${teacherCancelSlot.id}/cancel`)
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({
        reason: 'Emergency - teacher unavailable'
      });

    const teacherCancellationSuccess = teacherCancellationResponse.status === 200;

    formatTestResult(
      'Teacher slot cancellation',
      teacherCancellationSuccess,
      teacherCancellationSuccess ? 'Teacher successfully cancelled slot' : 'Failed to cancel teacher slot',
      !teacherCancellationSuccess ? teacherCancellationResponse.body : null
    );

    // Test 4.3: Check all affected students received notifications
    if (teacherCancellationSuccess) {
      await delay(1000); // Wait for notification processing

      const student1NotificationsResponse = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${student.token}`);

      const student1NotificationExists = student1NotificationsResponse.status === 200 &&
                                        student1NotificationsResponse.body.notifications?.some((n: any) => 
                                          n.type === 'BOOKING_CANCELLED' && n.message?.includes('teacher')
                                        );

      formatTestResult(
        'Teacher cancellation notification to students',
        student1NotificationExists,
        student1NotificationExists ? 'Students notified of teacher cancellation' : 'Students not notified of teacher cancellation',
        !student1NotificationExists ? student1NotificationsResponse.body : null
      );
    }

    console.log('\n📋 Test 5: Notification Management');

    // Test 5.1: Mark notification as read
    const unreadNotificationsResponse = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${student.token}`)
      .query({ unreadOnly: true });

    if (unreadNotificationsResponse.status === 200 && unreadNotificationsResponse.body.notifications?.length > 0) {
      const notificationId = unreadNotificationsResponse.body.notifications[0].id;

      const markReadResponse = await request(app)
        .put(`/api/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${student.token}`);

      const markReadSuccess = markReadResponse.status === 200;

      formatTestResult(
        'Mark notification as read',
        markReadSuccess,
        markReadSuccess ? 'Notification marked as read successfully' : 'Failed to mark notification as read',
        !markReadSuccess ? markReadResponse.body : null
      );

      // Test 5.2: Verify notification read status
      if (markReadSuccess) {
        const readNotificationResponse = await request(app)
          .get(`/api/notifications/${notificationId}`)
          .set('Authorization', `Bearer ${student.token}`);

        const notificationMarkedRead = readNotificationResponse.status === 200 &&
                                      readNotificationResponse.body.notification?.isRead === true;

        formatTestResult(
          'Notification read status verification',
          notificationMarkedRead,
          notificationMarkedRead ? 'Notification read status correctly updated' : 'Notification read status not updated',
          !notificationMarkedRead ? readNotificationResponse.body : null
        );
      }
    }

    // Test 5.3: Bulk mark notifications as read
    const bulkMarkReadResponse = await request(app)
      .put('/api/notifications/mark-all-read')
      .set('Authorization', `Bearer ${student.token}`);

    const bulkMarkReadSuccess = bulkMarkReadResponse.status === 200;

    formatTestResult(
      'Bulk mark notifications as read',
      bulkMarkReadSuccess,
      bulkMarkReadSuccess ? 'All notifications marked as read' : 'Failed to bulk mark notifications as read',
      !bulkMarkReadSuccess ? bulkMarkReadResponse.body : null
    );

    console.log('\n📋 Test 6: Notification Templates and Customization');

    // Test 6.1: Get notification templates
    const templatesResponse = await request(app)
      .get('/api/notifications/templates')
      .set('Authorization', `Bearer ${branchAdmin.token}`);

    const templatesAccessible = templatesResponse.status === 200 &&
                               Array.isArray(templatesResponse.body.templates);

    formatTestResult(
      'Notification templates access',
      templatesAccessible,
      templatesAccessible ? 'Notification templates accessible' : 'Failed to access notification templates',
      !templatesAccessible ? templatesResponse.body : null
    );

    // Test 6.2: Update notification template (admin only)
    const updateTemplateResponse = await request(app)
      .put('/api/notifications/templates/booking-confirmed')
      .set('Authorization', `Bearer ${branchAdmin.token}`)
      .send({
        smsTemplate: 'Your speaking test is confirmed for {date} at {time}. Branch: {branch}. Contact: {contact}',
        inAppTemplate: 'Booking confirmed for {date} at {time} with {teacher} at {branch}.'
      });

    const templateUpdateSuccess = updateTemplateResponse.status === 200;

    formatTestResult(
      'Notification template update',
      templateUpdateSuccess,
      templateUpdateSuccess ? 'Notification template updated successfully' : 'Failed to update notification template',
      !templateUpdateSuccess ? updateTemplateResponse.body : null
    );

    console.log('\n📋 Test 7: Cross-Branch Notification Context');

    // Test 7.1: Cross-branch booking notification includes branch info
    const crossBranchSlot = slots.find(s => s.branchId !== student.branchId);
    
    if (crossBranchSlot) {
      const crossBranchBookingResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${student.token}`)
        .send({
          slotId: crossBranchSlot.id,
          studentPhoneNumber: student.phoneNumber
        });

      if (crossBranchBookingResponse.status === 201) {
        await delay(500);

        const crossBranchNotificationsResponse = await request(app)
          .get('/api/notifications')
          .set('Authorization', `Bearer ${student.token}`);

        const branchInfoInNotification = crossBranchNotificationsResponse.status === 200 &&
                                        crossBranchNotificationsResponse.body.notifications?.some((n: any) => 
                                          n.type === 'BOOKING_CONFIRMED' && 
                                          (n.message?.includes('branch') || n.title?.includes('branch'))
                                        );

        formatTestResult(
          'Cross-branch notification includes branch info',
          branchInfoInNotification,
          branchInfoInNotification ? 'Cross-branch notifications include branch information' : 'Cross-branch notifications missing branch info',
          !branchInfoInNotification ? crossBranchNotificationsResponse.body : null
        );
      }
    }

    // Test 7.2: Admin notifications for cross-branch activities
    const adminNotificationsResponse = await request(app)
      .get('/api/notifications/admin-alerts')
      .set('Authorization', `Bearer ${branchAdmin.token}`);

    const adminNotificationsAccessible = adminNotificationsResponse.status === 200;

    formatTestResult(
      'Admin notifications for cross-branch activities',
      adminNotificationsAccessible,
      adminNotificationsAccessible ? 'Admin notifications accessible' : 'Admin notifications not accessible',
      !adminNotificationsAccessible ? adminNotificationsResponse.body : null
    );

  } catch (error) {
    console.error('❌ Notification integration test error:', error);
    formatTestResult('Notification Integration Tests', false, 'Test suite failed with error', error);
  } finally {
    await testDataManager.cleanup();
  }

  console.log('\n✅ Multi-Channel Notification Integration Tests Completed\n');
}

export default runNotificationIntegrationTests;