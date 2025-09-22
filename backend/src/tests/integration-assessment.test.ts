// Integration tests for assessment recording and CSV import
import request from 'supertest';
import app from '../index';
import { testDataManager, formatTestResult, delay } from './setup';
import path from 'path';
import fs from 'fs';

export async function runAssessmentIntegrationTests(): Promise<void> {
  console.log('🧪 Running Assessment Recording and CSV Import Integration Tests...\n');

  try {
    // Setup test data
    await testDataManager.cleanup();
    await testDataManager.createTestBookings(); // Creates full test data structure

    const users = testDataManager.getUsers();
    const bookings = testDataManager.getBookings();
    const branches = testDataManager.getBranches();

    const teacher = users.find(u => u.role === 'TEACHER')!;
    const student = users.find(u => u.role === 'STUDENT')!;
    const branchAdmin = users.find(u => u.role === 'BRANCH_ADMIN')!;
    const superAdmin = users.find(u => u.role === 'SUPER_ADMIN')!;

    console.log('📋 Test 1: Assessment Recording');

    // Test 1.1: Teacher records assessment for completed booking
    const completedBooking = bookings[0];
    
    // First mark the booking as completed
    await testDataManager.testPrisma.booking.update({
      where: { id: completedBooking.id },
      data: { 
        status: 'COMPLETED',
        attended: true
      }
    });

    const assessmentData = {
      bookingId: completedBooking.id,
      score: 6.5,
      remarks: 'Good fluency and pronunciation. Needs improvement in vocabulary range. Shows confidence in speaking but occasional grammatical errors.'
    };

    const recordAssessmentResponse = await request(app)
      .post('/api/assessments')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send(assessmentData);

    const assessmentRecordSuccess = recordAssessmentResponse.status === 201 &&
                                   recordAssessmentResponse.body.assessment?.score === 6.5;

    formatTestResult(
      'Teacher records assessment',
      assessmentRecordSuccess,
      assessmentRecordSuccess ? 'Assessment recorded successfully with IELTS score' : 'Failed to record assessment',
      !assessmentRecordSuccess ? recordAssessmentResponse.body : null
    );

    let assessmentId: string | null = null;
    if (assessmentRecordSuccess) {
      assessmentId = recordAssessmentResponse.body.assessment?.id;
    }

    // Test 1.2: Validate IELTS score range (0-9 with 0.5 increments)
    const invalidScoreTests = [
      { score: -1, description: 'negative score' },
      { score: 10, description: 'score above 9' },
      { score: 6.3, description: 'invalid increment (not 0.5)' },
      { score: 'invalid', description: 'non-numeric score' }
    ];

    let scoreValidationPassed = 0;
    for (const test of invalidScoreTests) {
      const invalidScoreResponse = await request(app)
        .post('/api/assessments')
        .set('Authorization', `Bearer ${teacher.token}`)
        .send({
          bookingId: completedBooking.id,
          score: test.score,
          remarks: 'Test invalid score'
        });

      if (invalidScoreResponse.status === 400) {
        scoreValidationPassed++;
      }
    }

    const scoreValidationSuccess = scoreValidationPassed === invalidScoreTests.length;

    formatTestResult(
      'IELTS score validation',
      scoreValidationSuccess,
      scoreValidationSuccess ? 'All invalid scores correctly rejected' : `Only ${scoreValidationPassed}/${invalidScoreTests.length} invalid scores rejected`,
      !scoreValidationSuccess ? 'Some invalid scores were accepted' : null
    );

    // Test 1.3: Valid IELTS score increments
    const validScores = [0, 0.5, 1, 1.5, 5.5, 6, 7.5, 8, 9];
    let validScoresPassed = 0;

    // Create additional completed bookings for testing valid scores
    for (let i = 0; i < Math.min(validScores.length, 3); i++) {
      const testSlot = await testDataManager.testPrisma.slot.create({
        data: {
          branchId: branches[0].id,
          teacherId: teacher.id,
          date: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000),
          startTime: `${9 + i}:00`,
          endTime: `${9 + i}:30`,
          capacity: 1
        }
      });

      const testBooking = await testDataManager.testPrisma.booking.create({
        data: {
          studentId: student.id,
          slotId: testSlot.id,
          status: 'COMPLETED',
          attended: true
        }
      });

      const validScoreResponse = await request(app)
        .post('/api/assessments')
        .set('Authorization', `Bearer ${teacher.token}`)
        .send({
          bookingId: testBooking.id,
          score: validScores[i],
          remarks: `Test score ${validScores[i]}`
        });

      if (validScoreResponse.status === 201) {
        validScoresPassed++;
      }
    }

    formatTestResult(
      'Valid IELTS score acceptance',
      validScoresPassed === 3,
      validScoresPassed === 3 ? 'All valid IELTS scores accepted' : `Only ${validScoresPassed}/3 valid scores accepted`,
      null
    );

    console.log('\n📋 Test 2: Assessment History and Access Control');

    // Test 2.1: Student views their own assessments
    const studentAssessmentsResponse = await request(app)
      .get('/api/assessments/my-assessments')
      .set('Authorization', `Bearer ${student.token}`);

    const studentAccessSuccess = studentAssessmentsResponse.status === 200 &&
                                Array.isArray(studentAssessmentsResponse.body.assessments);

    formatTestResult(
      'Student views own assessments',
      studentAccessSuccess,
      studentAccessSuccess ? 'Student can view their assessment history' : 'Student cannot access assessment history',
      !studentAccessSuccess ? studentAssessmentsResponse.body : null
    );

    // Test 2.2: Teacher views assessments they recorded
    const teacherAssessmentsResponse = await request(app)
      .get('/api/assessments/my-recorded')
      .set('Authorization', `Bearer ${teacher.token}`);

    const teacherAccessSuccess = teacherAssessmentsResponse.status === 200;

    formatTestResult(
      'Teacher views recorded assessments',
      teacherAccessSuccess,
      teacherAccessSuccess ? 'Teacher can view assessments they recorded' : 'Teacher cannot access recorded assessments',
      !teacherAccessSuccess ? teacherAssessmentsResponse.body : null
    );

    // Test 2.3: Cross-branch assessment access for admins
    const branchAssessmentsResponse = await request(app)
      .get('/api/assessments/branch-assessments')
      .set('Authorization', `Bearer ${branchAdmin.token}`);

    const branchAdminAccessSuccess = branchAssessmentsResponse.status === 200;

    formatTestResult(
      'Branch Admin views branch assessments',
      branchAdminAccessSuccess,
      branchAdminAccessSuccess ? 'Branch Admin can view branch assessments' : 'Branch Admin cannot access branch assessments',
      !branchAdminAccessSuccess ? branchAssessmentsResponse.body : null
    );

    console.log('\n📋 Test 3: CSV Import Functionality');

    // Test 3.1: Create test CSV file
    const testCsvPath = path.join(__dirname, 'test-students.csv');
    const csvContent = `name,phoneNumber,branchId
John Doe,+8801711111100,${branches[0].id}
Jane Smith,+8801711111101,${branches[0].id}
Bob Johnson,+8801722222100,${branches[1].id}
Alice Brown,+8801722222101,${branches[1].id}
Invalid User,invalid-phone,${branches[0].id}`;

    fs.writeFileSync(testCsvPath, csvContent);

    // Test 3.2: Branch Admin imports students
    const csvImportResponse = await request(app)
      .post('/api/users/bulk-import')
      .set('Authorization', `Bearer ${branchAdmin.token}`)
      .attach('file', testCsvPath);

    const csvImportSuccess = csvImportResponse.status === 200 &&
                            csvImportResponse.body.imported > 0;

    formatTestResult(
      'CSV student import',
      csvImportSuccess,
      csvImportSuccess ? `Successfully imported ${csvImportResponse.body.imported} students` : 'Failed to import students from CSV',
      !csvImportSuccess ? csvImportResponse.body : null
    );

    // Test 3.3: Validate imported students exist
    if (csvImportSuccess) {
      const importedStudentResponse = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${branchAdmin.token}`)
        .query({ role: 'STUDENT', phoneNumber: '+8801711111100' });

      const importedStudentExists = importedStudentResponse.status === 200 &&
                                   importedStudentResponse.body.users?.some((u: any) => 
                                     u.phoneNumber === '+8801711111100'
                                   );

      formatTestResult(
        'Imported student verification',
        importedStudentExists,
        importedStudentExists ? 'Imported student found in database' : 'Imported student not found',
        !importedStudentExists ? importedStudentResponse.body : null
      );
    }

    // Test 3.4: CSV import error handling
    const invalidCsvContent = `name,phoneNumber,branchId
Invalid User 1,+8801711111100,${branches[0].id}
Invalid User 2,+8801711111100,${branches[0].id}`;

    const invalidCsvPath = path.join(__dirname, 'test-invalid.csv');
    fs.writeFileSync(invalidCsvPath, invalidCsvContent);

    const invalidCsvImportResponse = await request(app)
      .post('/api/users/bulk-import')
      .set('Authorization', `Bearer ${branchAdmin.token}`)
      .attach('file', invalidCsvPath);

    const duplicateHandlingSuccess = invalidCsvImportResponse.status === 400 ||
                                    (invalidCsvImportResponse.status === 200 && 
                                     invalidCsvImportResponse.body.errors?.length > 0);

    formatTestResult(
      'CSV import duplicate phone handling',
      duplicateHandlingSuccess,
      duplicateHandlingSuccess ? 'Duplicate phone numbers correctly handled' : 'Failed to handle duplicate phone numbers',
      !duplicateHandlingSuccess ? invalidCsvImportResponse.body : null
    );

    console.log('\n📋 Test 4: Role-Based Assessment Access');

    // Test 4.1: Super Admin access to all assessments
    const allAssessmentsResponse = await request(app)
      .get('/api/assessments/all')
      .set('Authorization', `Bearer ${superAdmin.token}`);

    const superAdminAssessmentAccess = allAssessmentsResponse.status === 200;

    formatTestResult(
      'Super Admin access to all assessments',
      superAdminAssessmentAccess,
      superAdminAssessmentAccess ? 'Super Admin can access all assessments' : 'Super Admin cannot access all assessments',
      !superAdminAssessmentAccess ? allAssessmentsResponse.body : null
    );

    // Test 4.2: Student cannot access other students' assessments
    const otherStudent = users.find(u => u.role === 'STUDENT' && u.id !== student.id);
    if (otherStudent && assessmentId) {
      const unauthorizedAccessResponse = await request(app)
        .get(`/api/assessments/${assessmentId}`)
        .set('Authorization', `Bearer ${otherStudent.token}`);

      const unauthorizedBlocked = unauthorizedAccessResponse.status === 403 ||
                                 unauthorizedAccessResponse.status === 404;

      formatTestResult(
        'Student cannot access other assessments',
        unauthorizedBlocked,
        unauthorizedBlocked ? 'Unauthorized assessment access correctly blocked' : 'Failed to block unauthorized assessment access',
        !unauthorizedBlocked ? unauthorizedAccessResponse.body : null
      );
    }

    console.log('\n📋 Test 5: Assessment Analytics and Reporting');

    // Test 5.1: Branch assessment analytics
    const branchAnalyticsResponse = await request(app)
      .get('/api/reports/assessment-analytics')
      .set('Authorization', `Bearer ${branchAdmin.token}`)
      .query({ branchId: branchAdmin.branchId });

    const branchAnalyticsSuccess = branchAnalyticsResponse.status === 200;

    formatTestResult(
      'Branch assessment analytics',
      branchAnalyticsSuccess,
      branchAnalyticsSuccess ? 'Branch assessment analytics accessible' : 'Branch assessment analytics failed',
      !branchAnalyticsSuccess ? branchAnalyticsResponse.body : null
    );

    // Test 5.2: Teacher performance metrics
    const teacherMetricsResponse = await request(app)
      .get('/api/reports/teacher-performance')
      .set('Authorization', `Bearer ${branchAdmin.token}`)
      .query({ teacherId: teacher.id });

    const teacherMetricsSuccess = teacherMetricsResponse.status === 200;

    formatTestResult(
      'Teacher performance metrics',
      teacherMetricsSuccess,
      teacherMetricsSuccess ? 'Teacher performance metrics accessible' : 'Teacher performance metrics failed',
      !teacherMetricsSuccess ? teacherMetricsResponse.body : null
    );

    // Cleanup test files
    try {
      fs.unlinkSync(testCsvPath);
      fs.unlinkSync(invalidCsvPath);
    } catch (error) {
      // Ignore cleanup errors
    }

  } catch (error) {
    console.error('❌ Assessment integration test error:', error);
    formatTestResult('Assessment Integration Tests', false, 'Test suite failed with error', error);
  } finally {
    await testDataManager.cleanup();
  }

  console.log('\n✅ Assessment Recording and CSV Import Integration Tests Completed\n');
}

export default runAssessmentIntegrationTests;