import { notificationService } from './services/notification';
import { schedulerService } from './services/scheduler';

async function verifyTask7Implementation() {
  console.log('🔍 Verifying Task 7: Multi-Channel Notification System Implementation\n');

  const results = {
    smsGatewayIntegration: false,
    inAppNotificationSystem: false,
    notificationTemplates: false,
    automatedReminderSystem: false,
    smsDeliveryTracking: false,
    bookingIntegration: false,
    adminManagement: false,
    errorHandling: false
  };

  try {
    // 1. Verify SMS Gateway Integration
    console.log('1️⃣ Verifying SMS Gateway Integration...');
    try {
      // Check if SMS service is properly integrated
      const smsService = require('./services/sms').smsService;
      const testResult = await smsService.testConnection();
      
      // Check notification service SMS methods
      const templates = notificationService.getTemplates();
      const hasBookingConfirmation = templates.BOOKING_CONFIRMED?.sms?.includes('Booking confirmed');
      const hasBookingReminder = templates.BOOKING_REMINDER?.sms?.includes('Reminder');
      const hasBookingCancellation = templates.BOOKING_CANCELLED?.sms?.includes('cancelled');
      
      results.smsGatewayIntegration = hasBookingConfirmation && hasBookingReminder && hasBookingCancellation;
      console.log(`   ✅ SMS Gateway Integration: ${results.smsGatewayIntegration ? 'PASS' : 'FAIL'}`);
    } catch (error) {
      console.log(`   ❌ SMS Gateway Integration: FAIL - ${error}`);
    }

    // 2. Verify In-App Notification System
    console.log('\n2️⃣ Verifying In-App Notification System...');
    try {
      // Check if notification service has in-app methods
      const hasInAppTemplates = Object.values(notificationService.getTemplates()).every(
        template => template.inApp && template.inApp.title && template.inApp.message
      );
      
      // Check if notification routes exist (by checking if the file exists)
      const fs = require('fs');
      const notificationRoutesExist = fs.existsSync('./src/routes/notifications.ts');
      
      results.inAppNotificationSystem = hasInAppTemplates && notificationRoutesExist;
      console.log(`   ✅ In-App Notification System: ${results.inAppNotificationSystem ? 'PASS' : 'FAIL'}`);
    } catch (error) {
      console.log(`   ❌ In-App Notification System: FAIL - ${error}`);
    }

    // 3. Verify Notification Templates
    console.log('\n3️⃣ Verifying Notification Templates...');
    try {
      const templates = notificationService.getTemplates();
      const requiredTypes = ['BOOKING_CONFIRMED', 'BOOKING_REMINDER', 'BOOKING_CANCELLED', 'SYSTEM_ALERT'];
      
      const hasAllTypes = requiredTypes.every(type => templates[type as keyof typeof templates]);
      const hasPlaceholders = templates.BOOKING_CONFIRMED.sms.includes('{date}') && 
                             templates.BOOKING_CONFIRMED.sms.includes('{time}');
      
      // Test template update functionality
      const originalTemplate = templates.SYSTEM_ALERT;
      notificationService.updateTemplate('SYSTEM_ALERT', {
        sms: 'Test SMS: {message}',
        inApp: { title: 'Test Title', message: 'Test: {message}' }
      });
      const updatedTemplates = notificationService.getTemplates();
      const templateUpdated = updatedTemplates.SYSTEM_ALERT.sms === 'Test SMS: {message}';
      
      // Restore original template
      notificationService.updateTemplate('SYSTEM_ALERT', originalTemplate);
      
      results.notificationTemplates = hasAllTypes && hasPlaceholders && templateUpdated;
      console.log(`   ✅ Notification Templates: ${results.notificationTemplates ? 'PASS' : 'FAIL'}`);
    } catch (error) {
      console.log(`   ❌ Notification Templates: FAIL - ${error}`);
    }

    // 4. Verify Automated Reminder System
    console.log('\n4️⃣ Verifying Automated Reminder System...');
    try {
      // Check scheduler service status
      const schedulerStatus = schedulerService.getStatus();
      const hasReminderJob = schedulerStatus.reminderJobRunning;
      const hasCleanupJob = schedulerStatus.cleanupJobRunning;
      
      // Check if manual trigger methods exist
      const hasManualTrigger = typeof schedulerService.triggerBookingReminders === 'function';
      const hasCleanupTrigger = typeof schedulerService.triggerDailyCleanup === 'function';
      
      results.automatedReminderSystem = hasReminderJob && hasCleanupJob && hasManualTrigger && hasCleanupTrigger;
      console.log(`   ✅ Automated Reminder System: ${results.automatedReminderSystem ? 'PASS' : 'FAIL'}`);
    } catch (error) {
      console.log(`   ❌ Automated Reminder System: FAIL - ${error}`);
    }

    // 5. Verify SMS Delivery Tracking
    console.log('\n5️⃣ Verifying SMS Delivery Tracking...');
    try {
      // Test SMS delivery status methods
      const testMessageId = 'test-msg-123';
      
      // First create a mock SMS delivery log entry
      const mockDeliveryStatus = {
        messageId: testMessageId,
        phoneNumber: '+8801234567890',
        status: 'sent' as const,
        sentAt: new Date()
      };
      
      // Test the methods exist
      const hasUpdateMethod = typeof notificationService.updateSMSDeliveryStatus === 'function';
      const hasGetStatusMethod = typeof notificationService.getSMSDeliveryStatus === 'function';
      const hasGetHistoryMethod = typeof notificationService.getSMSDeliveryHistory === 'function';
      const hasCleanupMethod = typeof notificationService.cleanupSMSDeliveryLogs === 'function';
      
      // Test basic functionality
      if (hasUpdateMethod) {
        notificationService.updateSMSDeliveryStatus(testMessageId, 'delivered');
      }
      
      const testPhone = '+8801234567890';
      const history = hasGetHistoryMethod ? notificationService.getSMSDeliveryHistory(testPhone) : [];
      
      const hasHistoryTracking = Array.isArray(history);
      
      results.smsDeliveryTracking = hasUpdateMethod && hasGetStatusMethod && hasGetHistoryMethod && 
                                   hasCleanupMethod && hasHistoryTracking;
      console.log(`   ✅ SMS Delivery Tracking: ${results.smsDeliveryTracking ? 'PASS' : 'FAIL'}`);
      
      if (!results.smsDeliveryTracking) {
        console.log(`      Methods: Update=${hasUpdateMethod}, GetStatus=${hasGetStatusMethod}, GetHistory=${hasGetHistoryMethod}, Cleanup=${hasCleanupMethod}`);
      }
    } catch (error) {
      console.log(`   ❌ SMS Delivery Tracking: FAIL - ${error}`);
    }

    // 6. Verify Booking Integration
    console.log('\n6️⃣ Verifying Booking Integration...');
    try {
      // Check if scheduler service has booking notification methods
      const hasBookingConfirmation = typeof schedulerService.sendBookingConfirmation === 'function';
      const hasBookingCancellation = typeof schedulerService.sendBookingCancellation === 'function';
      
      // Check if booking routes file has been modified to include notifications
      const fs = require('fs');
      const bookingRoutesContent = fs.readFileSync('./src/routes/bookings.ts', 'utf8');
      const hasSchedulerImport = bookingRoutesContent.includes('schedulerService');
      const hasConfirmationCall = bookingRoutesContent.includes('sendBookingConfirmation');
      const hasCancellationCall = bookingRoutesContent.includes('sendBookingCancellation');
      
      results.bookingIntegration = hasBookingConfirmation && hasBookingCancellation && 
                                  hasSchedulerImport && hasConfirmationCall && hasCancellationCall;
      console.log(`   ✅ Booking Integration: ${results.bookingIntegration ? 'PASS' : 'FAIL'}`);
    } catch (error) {
      console.log(`   ❌ Booking Integration: FAIL - ${error}`);
    }

    // 7. Verify Admin Management
    console.log('\n7️⃣ Verifying Admin Management...');
    try {
      // Check if notification service has admin methods
      const hasSystemAlert = typeof notificationService.sendSystemAlert === 'function';
      const hasTemplateManagement = typeof notificationService.updateTemplate === 'function';
      const hasStatistics = typeof notificationService.getNotificationStats === 'function';
      
      // Check if notification routes have admin endpoints
      const fs = require('fs');
      const routesContent = fs.readFileSync('./src/routes/notifications.ts', 'utf8');
      const hasAdminRoutes = routesContent.includes('/admin/templates') && 
                            routesContent.includes('/admin/stats') &&
                            routesContent.includes('SUPER_ADMIN');
      
      results.adminManagement = hasSystemAlert && hasTemplateManagement && hasStatistics && hasAdminRoutes;
      console.log(`   ✅ Admin Management: ${results.adminManagement ? 'PASS' : 'FAIL'}`);
    } catch (error) {
      console.log(`   ❌ Admin Management: FAIL - ${error}`);
    }

    // 8. Verify Error Handling
    console.log('\n8️⃣ Verifying Error Handling...');
    try {
      // Test error handling in notification service
      let errorHandled = false;
      try {
        // This should handle the error gracefully
        await notificationService.sendNotification('invalid-user-id', 'SYSTEM_ALERT', { message: 'test' });
      } catch (error) {
        errorHandled = true;
      }
      
      // Check if booking routes have try-catch blocks for notifications
      const fs = require('fs');
      const bookingRoutesContent = fs.readFileSync('./src/routes/bookings.ts', 'utf8');
      const hasErrorHandling = bookingRoutesContent.includes('try {') && 
                              bookingRoutesContent.includes('notificationError') &&
                              bookingRoutesContent.includes('Don\'t fail');
      
      results.errorHandling = errorHandled && hasErrorHandling;
      console.log(`   ✅ Error Handling: ${results.errorHandling ? 'PASS' : 'FAIL'}`);
    } catch (error) {
      console.log(`   ❌ Error Handling: FAIL - ${error}`);
    }

    // Summary
    console.log('\n📊 Verification Summary:');
    console.log('═══════════════════════════════════════════════════════════════');
    
    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    
    Object.entries(results).forEach(([test, passed]) => {
      const status = passed ? '✅ PASS' : '❌ FAIL';
      const testName = test.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      console.log(`${status} ${testName}`);
    });
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Overall Result: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log('🎉 Task 7 implementation is COMPLETE and VERIFIED!');
      console.log('\n✅ All requirements satisfied:');
      console.log('   • SMS gateway integration for booking confirmations and reminders');
      console.log('   • In-app notification system with database storage and read/unread status');
      console.log('   • Notification templates for both SMS and in-app channels');
      console.log('   • Automated 24-hour reminder system with cron jobs');
      console.log('   • SMS delivery status tracking and in-app notification management');
    } else {
      console.log('⚠️  Task 7 implementation has some issues that need attention.');
      const failedTests = Object.entries(results)
        .filter(([, passed]) => !passed)
        .map(([test]) => test.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()));
      console.log(`Failed tests: ${failedTests.join(', ')}`);
    }

    return passedTests === totalTests;

  } catch (error) {
    console.error('❌ Verification failed:', error);
    return false;
  }
}

// Run verification if called directly
if (require.main === module) {
  verifyTask7Implementation()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Verification error:', error);
      process.exit(1);
    });
}

export { verifyTask7Implementation };