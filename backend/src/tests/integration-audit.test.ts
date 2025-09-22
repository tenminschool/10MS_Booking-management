// Integration tests for audit logging and system settings
import request from 'supertest';
import app from '../index';
import { testDataManager, formatTestResult, delay } from './setup';

export async function runAuditIntegrationTests(): Promise<void> {
  console.log('🧪 Running Audit Logging and System Settings Integration Tests...\n');

  try {
    // Setup test data
    await testDataManager.cleanup();
    await testDataManager.createTestUsers();

    const users = testDataManager.getUsers();
    const branches = testDataManager.getBranches();

    const superAdmin = users.find(u => u.role === 'SUPER_ADMIN')!;
    const branchAdmin = users.find(u => u.role === 'BRANCH_ADMIN')!;
    const teacher = users.find(u => u.role === 'TEACHER')!;
    const student = users.find(u => u.role === 'STUDENT')!;

    console.log('📋 Test 1: Audit Log Creation for CRUD Operations');

    // Test 1.1: User creation audit log
    const newUserResponse = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${branchAdmin.token}`)
      .send({
        name: 'Test Audit User',
        email: 'audit.test@example.com',
        role: 'TEACHER',
        branchId: branchAdmin.branchId,
        password: 'password123'
      });

    const userCreationSuccess = newUserResponse.status === 201;
    let newUserId: string | null = null;
    
    if (userCreationSuccess) {
      newUserId = newUserResponse.body.user?.id;
    }

    formatTestResult(
      'User creation for audit testing',
      userCreationSuccess,
      userCreationSuccess ? 'Test user created successfully' : 'Failed to create test user',
      !userCreationSuccess ? newUserResponse.body : null
    );

    // Wait for audit log processing
    await delay(500);

    // Test 1.2: Check audit log for user creation
    const userCreationAuditResponse = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${branchAdmin.token}`)
      .query({ 
        entityType: 'user',
        action: 'CREATE',
        entityId: newUserId
      });

    const userCreationAuditExists = userCreationAuditResponse.status === 200 &&
                                   userCreationAuditResponse.body.auditLogs?.some((log: any) => 
                                     log.action === 'CREATE' && 
                                     log.entityType === 'user' &&
                                     log.entityId === newUserId
                                   );

    formatTestResult(
      'User creation audit log',
      userCreationAuditExists,
      userCreationAuditExists ? 'User creation audit log recorded' : 'User creation audit log missing',
      !userCreationAuditExists ? userCreationAuditResponse.body : null
    );

    // Test 1.3: User update audit log
    if (newUserId) {
      const userUpdateResponse = await request(app)
        .put(`/api/users/${newUserId}`)
        .set('Authorization', `Bearer ${branchAdmin.token}`)
        .send({
          name: 'Updated Audit User',
          email: 'updated.audit.test@example.com'
        });

      const userUpdateSuccess = userUpdateResponse.status === 200;

      formatTestResult(
        'User update for audit testing',
        userUpdateSuccess,
        userUpdateSuccess ? 'Test user updated successfully' : 'Failed to update test user',
        !userUpdateSuccess ? userUpdateResponse.body : null
      );

      if (userUpdateSuccess) {
        await delay(500);

        // Check audit log for user update
        const userUpdateAuditResponse = await request(app)
          .get('/api/audit-logs')
          .set('Authorization', `Bearer ${branchAdmin.token}`)
          .query({ 
            entityType: 'user',
            action: 'UPDATE',
            entityId: newUserId
          });

        const userUpdateAuditExists = userUpdateAuditResponse.status === 200 &&
                                     userUpdateAuditResponse.body.auditLogs?.some((log: any) => 
                                       log.action === 'UPDATE' && 
                                       log.entityType === 'user' &&
                                       log.entityId === newUserId &&
                                       log.oldValues && log.newValues
                                     );

        formatTestResult(
          'User update audit log with old/new values',
          userUpdateAuditExists,
          userUpdateAuditExists ? 'User update audit log with old/new values recorded' : 'User update audit log missing or incomplete',
          !userUpdateAuditExists ? userUpdateAuditResponse.body : null
        );
      }
    }

    console.log('\n📋 Test 2: Booking Operations Audit Logging');

    // Test 2.1: Create slot for booking test
    const auditSlotResponse = await request(app)
      .post('/api/slots')
      .set('Authorization', `Bearer ${branchAdmin.token}`)
      .send({
        branchId: branchAdmin.branchId,
        teacherId: teacher.id,
        date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0],
        startTime: '15:00',
        endTime: '15:30',
        capacity: 1
      });

    const auditSlotSuccess = auditSlotResponse.status === 201;
    let auditSlotId: string | null = null;

    if (auditSlotSuccess) {
      auditSlotId = auditSlotResponse.body.slot?.id;
    }

    // Test 2.2: Create booking and check audit log
    if (auditSlotId) {
      const bookingResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${student.token}`)
        .send({
          slotId: auditSlotId,
          studentPhoneNumber: student.phoneNumber
        });

      const bookingSuccess = bookingResponse.status === 201;
      let bookingId: string | null = null;

      if (bookingSuccess) {
        bookingId = bookingResponse.body.booking?.id;
        await delay(500);

        // Check booking creation audit log
        const bookingAuditResponse = await request(app)
          .get('/api/audit-logs')
          .set('Authorization', `Bearer ${branchAdmin.token}`)
          .query({ 
            entityType: 'booking',
            action: 'CREATE',
            entityId: bookingId
          });

        const bookingAuditExists = bookingAuditResponse.status === 200 &&
                                  bookingAuditResponse.body.auditLogs?.some((log: any) => 
                                    log.action === 'CREATE' && 
                                    log.entityType === 'booking' &&
                                    log.entityId === bookingId
                                  );

        formatTestResult(
          'Booking creation audit log',
          bookingAuditExists,
          bookingAuditExists ? 'Booking creation audit log recorded' : 'Booking creation audit log missing',
          !bookingAuditExists ? bookingAuditResponse.body : null
        );

        // Test 2.3: Cancel booking and check audit log
        const cancellationResponse = await request(app)
          .put(`/api/bookings/${bookingId}/cancel`)
          .set('Authorization', `Bearer ${student.token}`)
          .send({
            reason: 'Audit test cancellation'
          });

        if (cancellationResponse.status === 200) {
          await delay(500);

          const cancellationAuditResponse = await request(app)
            .get('/api/audit-logs')
            .set('Authorization', `Bearer ${branchAdmin.token}`)
            .query({ 
              entityType: 'booking',
              action: 'UPDATE',
              entityId: bookingId
            });

          const cancellationAuditExists = cancellationAuditResponse.status === 200 &&
                                         cancellationAuditResponse.body.auditLogs?.some((log: any) => 
                                           log.action === 'UPDATE' && 
                                           log.entityType === 'booking' &&
                                           log.entityId === bookingId &&
                                           log.newValues?.status === 'CANCELLED'
                                         );

          formatTestResult(
            'Booking cancellation audit log',
            cancellationAuditExists,
            cancellationAuditExists ? 'Booking cancellation audit log recorded' : 'Booking cancellation audit log missing',
            !cancellationAuditExists ? cancellationAuditResponse.body : null
          );
        }
      }
    }

    console.log('\n📋 Test 3: Assessment Operations Audit Logging');

    // Test 3.1: Create assessment and check audit log
    if (auditSlotId) {
      // Create a new booking for assessment
      const assessmentBookingResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${student.token}`)
        .send({
          slotId: auditSlotId,
          studentPhoneNumber: student.phoneNumber
        });

      if (assessmentBookingResponse.status === 201) {
        const assessmentBookingId = assessmentBookingResponse.body.booking?.id;

        // Mark booking as completed
        await testDataManager.testPrisma.booking.update({
          where: { id: assessmentBookingId },
          data: { status: 'COMPLETED', attended: true }
        });

        // Record assessment
        const assessmentResponse = await request(app)
          .post('/api/assessments')
          .set('Authorization', `Bearer ${teacher.token}`)
          .send({
            bookingId: assessmentBookingId,
            score: 7.5,
            remarks: 'Excellent performance in all areas'
          });

        const assessmentSuccess = assessmentResponse.status === 201;
        
        if (assessmentSuccess) {
          const assessmentId = assessmentResponse.body.assessment?.id;
          await delay(500);

          // Check assessment creation audit log
          const assessmentAuditResponse = await request(app)
            .get('/api/audit-logs')
            .set('Authorization', `Bearer ${branchAdmin.token}`)
            .query({ 
              entityType: 'assessment',
              action: 'CREATE',
              entityId: assessmentId
            });

          const assessmentAuditExists = assessmentAuditResponse.status === 200 &&
                                       assessmentAuditResponse.body.auditLogs?.some((log: any) => 
                                         log.action === 'CREATE' && 
                                         log.entityType === 'assessment' &&
                                         log.entityId === assessmentId
                                       );

          formatTestResult(
            'Assessment creation audit log',
            assessmentAuditExists,
            assessmentAuditExists ? 'Assessment creation audit log recorded' : 'Assessment creation audit log missing',
            !assessmentAuditExists ? assessmentAuditResponse.body : null
          );
        }
      }
    }

    console.log('\n📋 Test 4: System Settings Management');

    // Test 4.1: Create system setting
    const systemSettingResponse = await request(app)
      .post('/api/system-settings')
      .set('Authorization', `Bearer ${superAdmin.token}`)
      .send({
        key: 'booking.cancellation_hours',
        value: '24',
        description: 'Hours before booking when cancellation is allowed'
      });

    const systemSettingSuccess = systemSettingResponse.status === 201;

    formatTestResult(
      'System setting creation',
      systemSettingSuccess,
      systemSettingSuccess ? 'System setting created successfully' : 'Failed to create system setting',
      !systemSettingSuccess ? systemSettingResponse.body : null
    );

    // Test 4.2: Update system setting and check audit log
    if (systemSettingSuccess) {
      const settingId = systemSettingResponse.body.setting?.id;

      const updateSettingResponse = await request(app)
        .put(`/api/system-settings/${settingId}`)
        .set('Authorization', `Bearer ${superAdmin.token}`)
        .send({
          value: '48',
          description: 'Updated: Hours before booking when cancellation is allowed'
        });

      const updateSettingSuccess = updateSettingResponse.status === 200;

      formatTestResult(
        'System setting update',
        updateSettingSuccess,
        updateSettingSuccess ? 'System setting updated successfully' : 'Failed to update system setting',
        !updateSettingSuccess ? updateSettingResponse.body : null
      );

      if (updateSettingSuccess) {
        await delay(500);

        // Check system setting audit log
        const settingAuditResponse = await request(app)
          .get('/api/audit-logs')
          .set('Authorization', `Bearer ${superAdmin.token}`)
          .query({ 
            entityType: 'system_setting',
            action: 'UPDATE',
            entityId: settingId
          });

        const settingAuditExists = settingAuditResponse.status === 200 &&
                                  settingAuditResponse.body.auditLogs?.some((log: any) => 
                                    log.action === 'UPDATE' && 
                                    log.entityType === 'system_setting' &&
                                    log.entityId === settingId &&
                                    log.oldValues?.value === '24' &&
                                    log.newValues?.value === '48'
                                  );

        formatTestResult(
          'System setting update audit log',
          settingAuditExists,
          settingAuditExists ? 'System setting update audit log recorded with old/new values' : 'System setting update audit log missing',
          !settingAuditExists ? settingAuditResponse.body : null
        );
      }
    }

    console.log('\n📋 Test 5: Audit Log Access Control');

    // Test 5.1: Super Admin can view all audit logs
    const allAuditLogsResponse = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${superAdmin.token}`);

    const superAdminAuditAccess = allAuditLogsResponse.status === 200 &&
                                 Array.isArray(allAuditLogsResponse.body.auditLogs);

    formatTestResult(
      'Super Admin access to all audit logs',
      superAdminAuditAccess,
      superAdminAuditAccess ? 'Super Admin can access all audit logs' : 'Super Admin cannot access audit logs',
      !superAdminAuditAccess ? allAuditLogsResponse.body : null
    );

    // Test 5.2: Branch Admin can view branch-specific audit logs
    const branchAuditLogsResponse = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${branchAdmin.token}`)
      .query({ branchId: branchAdmin.branchId });

    const branchAdminAuditAccess = branchAuditLogsResponse.status === 200;

    formatTestResult(
      'Branch Admin access to branch audit logs',
      branchAdminAuditAccess,
      branchAdminAuditAccess ? 'Branch Admin can access branch-specific audit logs' : 'Branch Admin cannot access branch audit logs',
      !branchAdminAuditAccess ? branchAuditLogsResponse.body : null
    );

    // Test 5.3: Teacher cannot access audit logs
    const teacherAuditLogsResponse = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${teacher.token}`);

    const teacherAuditBlocked = teacherAuditLogsResponse.status === 403 ||
                               teacherAuditLogsResponse.status === 401;

    formatTestResult(
      'Teacher blocked from audit logs',
      teacherAuditBlocked,
      teacherAuditBlocked ? 'Teacher correctly blocked from audit logs' : 'Teacher can access audit logs (security issue)',
      !teacherAuditBlocked ? teacherAuditLogsResponse.body : null
    );

    // Test 5.4: Student cannot access audit logs
    const studentAuditLogsResponse = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${student.token}`);

    const studentAuditBlocked = studentAuditLogsResponse.status === 403 ||
                               studentAuditLogsResponse.status === 401;

    formatTestResult(
      'Student blocked from audit logs',
      studentAuditBlocked,
      studentAuditBlocked ? 'Student correctly blocked from audit logs' : 'Student can access audit logs (security issue)',
      !studentAuditBlocked ? studentAuditLogsResponse.body : null
    );

    console.log('\n📋 Test 6: Audit Log Filtering and Search');

    // Test 6.1: Filter audit logs by date range
    const dateFilterResponse = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${superAdmin.token}`)
      .query({ 
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString()
      });

    const dateFilterSuccess = dateFilterResponse.status === 200;

    formatTestResult(
      'Audit log date range filtering',
      dateFilterSuccess,
      dateFilterSuccess ? 'Audit logs can be filtered by date range' : 'Date range filtering failed',
      !dateFilterSuccess ? dateFilterResponse.body : null
    );

    // Test 6.2: Filter audit logs by user
    const userFilterResponse = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${superAdmin.token}`)
      .query({ userId: branchAdmin.id });

    const userFilterSuccess = userFilterResponse.status === 200;

    formatTestResult(
      'Audit log user filtering',
      userFilterSuccess,
      userFilterSuccess ? 'Audit logs can be filtered by user' : 'User filtering failed',
      !userFilterSuccess ? userFilterResponse.body : null
    );

    // Test 6.3: Filter audit logs by entity type and action
    const entityActionFilterResponse = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${superAdmin.token}`)
      .query({ 
        entityType: 'user',
        action: 'CREATE'
      });

    const entityActionFilterSuccess = entityActionFilterResponse.status === 200;

    formatTestResult(
      'Audit log entity type and action filtering',
      entityActionFilterSuccess,
      entityActionFilterSuccess ? 'Audit logs can be filtered by entity type and action' : 'Entity type and action filtering failed',
      !entityActionFilterSuccess ? entityActionFilterResponse.body : null
    );

    console.log('\n📋 Test 7: System Settings Access Control');

    // Test 7.1: Super Admin can manage all system settings
    const allSystemSettingsResponse = await request(app)
      .get('/api/system-settings')
      .set('Authorization', `Bearer ${superAdmin.token}`);

    const superAdminSettingsAccess = allSystemSettingsResponse.status === 200;

    formatTestResult(
      'Super Admin access to system settings',
      superAdminSettingsAccess,
      superAdminSettingsAccess ? 'Super Admin can access system settings' : 'Super Admin cannot access system settings',
      !superAdminSettingsAccess ? allSystemSettingsResponse.body : null
    );

    // Test 7.2: Branch Admin has limited system settings access
    const branchAdminSettingsResponse = await request(app)
      .get('/api/system-settings')
      .set('Authorization', `Bearer ${branchAdmin.token}`);

    const branchAdminSettingsAccess = branchAdminSettingsResponse.status === 200 ||
                                     branchAdminSettingsResponse.status === 403;

    formatTestResult(
      'Branch Admin system settings access control',
      branchAdminSettingsAccess,
      branchAdminSettingsAccess ? 'Branch Admin system settings access properly controlled' : 'Branch Admin system settings access control failed',
      null
    );

    // Test 7.3: Teacher and Student cannot access system settings
    const teacherSettingsResponse = await request(app)
      .get('/api/system-settings')
      .set('Authorization', `Bearer ${teacher.token}`);

    const teacherSettingsBlocked = teacherSettingsResponse.status === 403 ||
                                  teacherSettingsResponse.status === 401;

    formatTestResult(
      'Teacher blocked from system settings',
      teacherSettingsBlocked,
      teacherSettingsBlocked ? 'Teacher correctly blocked from system settings' : 'Teacher can access system settings (security issue)',
      !teacherSettingsBlocked ? teacherSettingsResponse.body : null
    );

  } catch (error) {
    console.error('❌ Audit integration test error:', error);
    formatTestResult('Audit Integration Tests', false, 'Test suite failed with error', error);
  } finally {
    await testDataManager.cleanup();
  }

  console.log('\n✅ Audit Logging and System Settings Integration Tests Completed\n');
}

export default runAuditIntegrationTests;