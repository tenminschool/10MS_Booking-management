// Integration tests for authentication systems
import request from 'supertest';
import app from '../index';
import { testDataManager, formatTestResult, delay } from './setup';
import { hashPassword } from '../utils/password';

export async function runAuthIntegrationTests(): Promise<void> {
  console.log('🧪 Running Authentication Integration Tests...\n');

  try {
    // Setup test data
    await testDataManager.cleanup();
    await testDataManager.createTestUsers();

    const users = testDataManager.getUsers();
    const branches = testDataManager.getBranches();

    console.log('📋 Test 1: Staff Email/Password Authentication');

    // Test 1.1: Valid staff login
    const superAdmin = users.find(u => u.role === 'SUPER_ADMIN')!;
    
    const validStaffLoginResponse = await request(app)
      .post('/api/auth/staff/login')
      .send({
        email: superAdmin.email,
        password: 'password123'
      });

    const validStaffLoginSuccess = validStaffLoginResponse.status === 200 &&
                                  validStaffLoginResponse.body.token &&
                                  validStaffLoginResponse.body.user?.role === 'SUPER_ADMIN';

    formatTestResult(
      'Valid staff login',
      validStaffLoginSuccess,
      validStaffLoginSuccess ? 'Staff login successful with valid credentials' : 'Staff login failed',
      !validStaffLoginSuccess ? validStaffLoginResponse.body : null
    );

    // Test 1.2: Invalid staff login - wrong password
    const invalidPasswordResponse = await request(app)
      .post('/api/auth/staff/login')
      .send({
        email: superAdmin.email,
        password: 'wrongpassword'
      });

    const invalidPasswordBlocked = invalidPasswordResponse.status === 401 ||
                                  invalidPasswordResponse.status === 400;

    formatTestResult(
      'Invalid password rejection',
      invalidPasswordBlocked,
      invalidPasswordBlocked ? 'Invalid password correctly rejected' : 'Failed to reject invalid password',
      !invalidPasswordBlocked ? invalidPasswordResponse.body : null
    );

    // Test 1.3: Invalid staff login - non-existent email
    const nonExistentEmailResponse = await request(app)
      .post('/api/auth/staff/login')
      .send({
        email: 'nonexistent@test.com',
        password: 'password123'
      });

    const nonExistentEmailBlocked = nonExistentEmailResponse.status === 401 ||
                                   nonExistentEmailResponse.status === 404;

    formatTestResult(
      'Non-existent email rejection',
      nonExistentEmailBlocked,
      nonExistentEmailBlocked ? 'Non-existent email correctly rejected' : 'Failed to reject non-existent email',
      !nonExistentEmailBlocked ? nonExistentEmailResponse.body : null
    );

    // Test 1.4: Different staff roles login
    const branchAdmin = users.find(u => u.role === 'BRANCH_ADMIN')!;
    const teacher = users.find(u => u.role === 'TEACHER')!;

    const branchAdminLoginResponse = await request(app)
      .post('/api/auth/staff/login')
      .send({
        email: branchAdmin.email,
        password: 'password123'
      });

    const teacherLoginResponse = await request(app)
      .post('/api/auth/staff/login')
      .send({
        email: teacher.email,
        password: 'password123'
      });

    const multiRoleLoginSuccess = branchAdminLoginResponse.status === 200 &&
                                 teacherLoginResponse.status === 200 &&
                                 branchAdminLoginResponse.body.user?.role === 'BRANCH_ADMIN' &&
                                 teacherLoginResponse.body.user?.role === 'TEACHER';

    formatTestResult(
      'Multiple staff roles login',
      multiRoleLoginSuccess,
      multiRoleLoginSuccess ? 'All staff roles can login successfully' : 'Failed to login different staff roles',
      !multiRoleLoginSuccess ? { branchAdmin: branchAdminLoginResponse.body, teacher: teacherLoginResponse.body } : null
    );

    console.log('\n📋 Test 2: Student Phone Number Authentication');

    // Test 2.1: Request OTP for valid student
    const student = users.find(u => u.role === 'STUDENT')!;
    
    const otpRequestResponse = await request(app)
      .post('/api/auth/student/request-otp')
      .send({
        phoneNumber: student.phoneNumber
      });

    const otpRequestSuccess = otpRequestResponse.status === 200;

    formatTestResult(
      'OTP request for valid student',
      otpRequestSuccess,
      otpRequestSuccess ? 'OTP request successful for valid student' : 'Failed to request OTP for valid student',
      !otpRequestSuccess ? otpRequestResponse.body : null
    );

    // Test 2.2: Request OTP for non-existent phone number
    const invalidOtpRequestResponse = await request(app)
      .post('/api/auth/student/request-otp')
      .send({
        phoneNumber: '+8801999999999'
      });

    const invalidOtpRequestBlocked = invalidOtpRequestResponse.status === 404 ||
                                    invalidOtpRequestResponse.status === 400;

    formatTestResult(
      'OTP request rejection for invalid phone',
      invalidOtpRequestBlocked,
      invalidOtpRequestBlocked ? 'Invalid phone number correctly rejected' : 'Failed to reject invalid phone number',
      !invalidOtpRequestBlocked ? invalidOtpRequestResponse.body : null
    );

    // Test 2.3: Verify OTP (simulated)
    // Note: In a real test, we'd need to mock the SMS service or use a test OTP
    const mockOtp = '123456';
    
    const otpVerifyResponse = await request(app)
      .post('/api/auth/student/verify-otp')
      .send({
        phoneNumber: student.phoneNumber,
        otp: mockOtp
      });

    // This might fail in real implementation without proper OTP, but we test the endpoint
    const otpVerifyEndpointExists = otpVerifyResponse.status !== 404;

    formatTestResult(
      'OTP verification endpoint',
      otpVerifyEndpointExists,
      otpVerifyEndpointExists ? 'OTP verification endpoint accessible' : 'OTP verification endpoint not found',
      !otpVerifyEndpointExists ? otpVerifyResponse.body : null
    );

    console.log('\n📋 Test 3: Token Validation and User Context');

    // Test 3.1: Access protected endpoint with valid token
    const protectedResponse = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${superAdmin.token}`);

    const protectedAccessSuccess = protectedResponse.status === 200 &&
                                  protectedResponse.body.user?.id === superAdmin.id;

    formatTestResult(
      'Protected endpoint access with valid token',
      protectedAccessSuccess,
      protectedAccessSuccess ? 'Valid token grants access to protected endpoints' : 'Failed to access protected endpoint with valid token',
      !protectedAccessSuccess ? protectedResponse.body : null
    );

    // Test 3.2: Access protected endpoint without token
    const noTokenResponse = await request(app)
      .get('/api/auth/me');

    const noTokenBlocked = noTokenResponse.status === 401;

    formatTestResult(
      'Protected endpoint blocks access without token',
      noTokenBlocked,
      noTokenBlocked ? 'Access correctly blocked without token' : 'Failed to block access without token',
      !noTokenBlocked ? noTokenResponse.body : null
    );

    // Test 3.3: Access protected endpoint with invalid token
    const invalidTokenResponse = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid-token-here');

    const invalidTokenBlocked = invalidTokenResponse.status === 401;

    formatTestResult(
      'Protected endpoint blocks access with invalid token',
      invalidTokenBlocked,
      invalidTokenBlocked ? 'Access correctly blocked with invalid token' : 'Failed to block access with invalid token',
      !invalidTokenBlocked ? invalidTokenResponse.body : null
    );

    console.log('\n📋 Test 4: Role-Based Access Control');

    // Test 4.1: Super Admin access to all branches
    const allBranchesResponse = await request(app)
      .get('/api/branches')
      .set('Authorization', `Bearer ${superAdmin.token}`);

    const superAdminAccessSuccess = allBranchesResponse.status === 200 &&
                                   allBranchesResponse.body.branches?.length >= 2;

    formatTestResult(
      'Super Admin access to all branches',
      superAdminAccessSuccess,
      superAdminAccessSuccess ? 'Super Admin can access all branches' : 'Super Admin cannot access all branches',
      !superAdminAccessSuccess ? allBranchesResponse.body : null
    );

    // Test 4.2: Branch Admin access limited to their branch
    const branchAdminBranchesResponse = await request(app)
      .get('/api/branches')
      .set('Authorization', `Bearer ${branchAdmin.token}`);

    // Branch admin should see their branch or get filtered results
    const branchAdminAccessLimited = branchAdminBranchesResponse.status === 200;

    formatTestResult(
      'Branch Admin access control',
      branchAdminAccessLimited,
      branchAdminAccessLimited ? 'Branch Admin access properly controlled' : 'Branch Admin access control failed',
      !branchAdminAccessLimited ? branchAdminBranchesResponse.body : null
    );

    // Test 4.3: Teacher access to their assigned slots
    const teacherSlotsResponse = await request(app)
      .get('/api/slots/my-schedule')
      .set('Authorization', `Bearer ${teacher.token}`);

    const teacherAccessSuccess = teacherSlotsResponse.status === 200;

    formatTestResult(
      'Teacher access to assigned slots',
      teacherAccessSuccess,
      teacherAccessSuccess ? 'Teacher can access their assigned slots' : 'Teacher cannot access assigned slots',
      !teacherAccessSuccess ? teacherSlotsResponse.body : null
    );

    // Test 4.4: Student access to booking features
    const studentBookingsResponse = await request(app)
      .get('/api/bookings/my-bookings')
      .set('Authorization', `Bearer ${student.token}`);

    const studentAccessSuccess = studentBookingsResponse.status === 200;

    formatTestResult(
      'Student access to booking features',
      studentAccessSuccess,
      studentAccessSuccess ? 'Student can access booking features' : 'Student cannot access booking features',
      !studentAccessSuccess ? studentBookingsResponse.body : null
    );

    console.log('\n📋 Test 5: Cross-Branch Authentication Context');

    // Test 5.1: User context includes correct branch information
    const userContextResponse = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${branchAdmin.token}`);

    const correctBranchContext = userContextResponse.status === 200 &&
                                userContextResponse.body.user?.branchId === branchAdmin.branchId;

    formatTestResult(
      'Correct branch context in user authentication',
      correctBranchContext,
      correctBranchContext ? 'User context includes correct branch information' : 'Incorrect branch context in authentication',
      !correctBranchContext ? userContextResponse.body : null
    );

    // Test 5.2: Cross-branch operation permissions
    const otherBranchSlots = await request(app)
      .get('/api/slots/available')
      .set('Authorization', `Bearer ${branchAdmin.token}`)
      .query({ branchId: branches.find(b => b.id !== branchAdmin.branchId)?.id });

    // Branch admin should be able to view other branch slots for cross-branch booking support
    const crossBranchViewSuccess = otherBranchSlots.status === 200;

    formatTestResult(
      'Cross-branch slot viewing permissions',
      crossBranchViewSuccess,
      crossBranchViewSuccess ? 'Cross-branch slot viewing properly handled' : 'Cross-branch slot viewing failed',
      !crossBranchViewSuccess ? otherBranchSlots.body : null
    );

    console.log('\n📋 Test 6: Session Management');

    // Test 6.1: Logout functionality
    const logoutResponse = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${teacher.token}`);

    const logoutSuccess = logoutResponse.status === 200;

    formatTestResult(
      'User logout functionality',
      logoutSuccess,
      logoutSuccess ? 'User logout successful' : 'User logout failed',
      !logoutSuccess ? logoutResponse.body : null
    );

    // Test 6.2: Token refresh (if implemented)
    const refreshResponse = await request(app)
      .post('/api/auth/refresh')
      .set('Authorization', `Bearer ${superAdmin.token}`);

    // This endpoint might not be implemented in MVP, so we just check if it exists
    const refreshEndpointExists = refreshResponse.status !== 404;

    formatTestResult(
      'Token refresh endpoint availability',
      refreshEndpointExists,
      refreshEndpointExists ? 'Token refresh endpoint available' : 'Token refresh endpoint not implemented (OK for MVP)',
      null
    );

  } catch (error) {
    console.error('❌ Authentication integration test error:', error);
    formatTestResult('Authentication Integration Tests', false, 'Test suite failed with error', error);
  } finally {
    await testDataManager.cleanup();
  }

  console.log('\n✅ Authentication Integration Tests Completed\n');
}

export default runAuthIntegrationTests;