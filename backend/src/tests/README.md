# Comprehensive Integration Test Suite

This directory contains a comprehensive integration test suite for the multi-branch speaking test booking system. The test suite validates all core functionality including cross-branch features, audit trails, and mobile responsiveness.

## Test Coverage

### 1. Cross-Branch Booking Flow Tests (`integration-booking.test.ts`)
- **Browse Slots**: View available slots across all branches with filtering
- **Create Bookings**: Cross-branch booking creation with duplicate prevention
- **Booking Confirmation**: Verify booking details and notification creation
- **Cancellation**: Cross-branch booking cancellation with slot capacity restoration
- **Rescheduling**: Cross-branch rescheduling functionality
- **Business Rules**: Capacity limits and 24-hour cancellation rule enforcement

### 2. Authentication System Tests (`integration-auth.test.ts`)
- **Staff Login**: Email/password authentication for all staff roles
- **Student Login**: Phone number + SMS OTP authentication
- **Token Validation**: Protected endpoint access with valid/invalid tokens
- **Role-Based Access**: Access control for different user roles
- **Cross-Branch Context**: Branch information in authentication context
- **Session Management**: Logout and token refresh functionality

### 3. Assessment Recording Tests (`integration-assessment.test.ts`)
- **Score Recording**: IELTS score recording (0-9 with 0.5 increments)
- **Score Validation**: Reject invalid scores and increments
- **Assessment History**: Role-based access to assessment data
- **CSV Import**: Bulk student import with validation and error handling
- **Cross-Branch Access**: Assessment analytics across branches
- **Role Permissions**: Proper access control for assessment data

### 4. Multi-Channel Notification Tests (`integration-notifications.test.ts`)
- **Booking Confirmations**: SMS and in-app notifications for bookings
- **Reminders**: 24-hour reminder system (SMS + in-app)
- **Cancellation Alerts**: Notifications for booking cancellations
- **Teacher Cancellations**: Multi-student notifications for teacher cancellations
- **Notification Management**: Mark as read, bulk operations
- **Templates**: Notification template management and customization
- **Cross-Branch Context**: Branch information in notifications

### 5. Audit Logging Tests (`integration-audit.test.ts`)
- **CRUD Operations**: Audit logs for create, update, delete operations
- **Old/New Values**: Tracking of changes with before/after values
- **System Settings**: Audit trails for system configuration changes
- **Access Control**: Role-based access to audit logs
- **Filtering**: Search and filter audit logs by various criteria
- **Data Integrity**: Ensure all sensitive operations are logged

### 6. Mobile & Data Isolation Tests (`integration-mobile-isolation.test.ts`)
- **Mobile APIs**: Mobile-friendly API response formats
- **Data Isolation**: Branch-level data isolation by user role
- **Cross-Branch Security**: Prevent unauthorized cross-branch access
- **Data Consistency**: Validate data integrity across branches
- **Super Admin Access**: Verify super admin can access all branches
- **Security Boundaries**: Enforce proper access controls

## Running Tests

### Run All Tests
```bash
# Run the complete comprehensive test suite
npm run test:comprehensive

# Or directly with tsx
tsx src/run-comprehensive-tests.ts
```

### Run Individual Test Suites
```bash
# Authentication tests
npm run test:auth

# Booking flow tests
npm run test:booking

# Assessment and CSV import tests
npm run test:assessment

# Notification system tests
npm run test:notifications

# Audit logging tests
npm run test:audit

# Mobile and data isolation tests
npm run test:mobile
```

### Run Specific Test Suite with tsx
```bash
# Using the individual test runner
tsx src/tests/run-individual-tests.ts booking
tsx src/tests/run-individual-tests.ts auth
tsx src/tests/run-individual-tests.ts assessment
tsx src/tests/run-individual-tests.ts notifications
tsx src/tests/run-individual-tests.ts audit
tsx src/tests/run-individual-tests.ts mobile
```

## Test Environment Setup

### Prerequisites
1. **Database**: PostgreSQL database running (Docker Compose recommended)
2. **Environment Variables**: Proper `.env` configuration
3. **Dependencies**: All npm packages installed
4. **Database Schema**: Prisma schema applied (`npm run db:push`)

### Environment Variables
```env
DATABASE_URL="postgresql://username:password@localhost:5432/speaking_test_booking"
TEST_DATABASE_URL="postgresql://username:password@localhost:5432/speaking_test_booking_test" # Optional
JWT_SECRET="your-jwt-secret"
SMS_API_KEY="your-sms-api-key" # For SMS testing
```

### Test Data
The test suite automatically:
- Creates test branches (Dhaka, Chittagong, Sylhet)
- Creates users for all roles across branches
- Creates test slots and bookings
- Cleans up all test data after completion

## Test Architecture

### Test Data Manager (`setup.ts`)
- **Centralized Data Management**: Single source for test data creation
- **Automatic Cleanup**: Ensures clean state between test runs
- **Role-Based Data**: Creates users for all system roles
- **Cross-Branch Data**: Sets up multi-branch test scenarios

### Test Utilities
- **formatTestResult()**: Consistent test result formatting
- **delay()**: Simulate async operations and processing time
- **TestDataManager**: Manages test data lifecycle

### Error Handling
- **Graceful Failures**: Tests continue even if individual assertions fail
- **Detailed Logging**: Clear error messages and debugging information
- **Cleanup on Exit**: Ensures test data is cleaned up even on failures

## Test Results Interpretation

### Success Indicators
- ✅ **PASS**: Test assertion succeeded
- 📊 **Metrics**: Performance and coverage statistics
- 🎉 **All Tests Passed**: Ready for deployment

### Failure Indicators
- ❌ **FAIL**: Test assertion failed with details
- ⚠️ **Warnings**: Non-critical issues that should be reviewed
- 🛑 **Critical Failures**: Issues that block deployment

### Report Sections
1. **Overall Results**: Success rate and timing
2. **Detailed Results**: Individual test suite outcomes
3. **Test Coverage Summary**: What functionality was validated
4. **Next Steps**: Recommendations for addressing failures

## Best Practices

### Running Tests
1. **Clean Environment**: Start with a clean database state
2. **Isolated Runs**: Run tests in isolation to avoid interference
3. **Regular Execution**: Run tests after any significant changes
4. **CI/CD Integration**: Include in automated deployment pipelines

### Debugging Failed Tests
1. **Individual Suites**: Run specific test suites to isolate issues
2. **Verbose Logging**: Enable detailed logging for debugging
3. **Manual Verification**: Manually test failed scenarios
4. **Database State**: Check database state after failures

### Maintenance
1. **Update Test Data**: Keep test scenarios current with requirements
2. **Add New Tests**: Include tests for new features
3. **Performance Monitoring**: Track test execution time
4. **Documentation**: Keep test documentation updated

## Integration with Development Workflow

### Pre-Deployment Checklist
- [ ] All integration tests pass
- [ ] Manual testing on mobile devices completed
- [ ] SMS delivery tested in staging environment
- [ ] Cross-branch scenarios validated
- [ ] Performance benchmarks met
- [ ] Security boundaries verified

### Continuous Integration
The test suite is designed to be integrated into CI/CD pipelines:
- Automated test execution on code changes
- Test result reporting and notifications
- Deployment blocking on test failures
- Performance regression detection

## Troubleshooting

### Common Issues
1. **Database Connection**: Ensure PostgreSQL is running and accessible
2. **Environment Variables**: Verify all required environment variables are set
3. **Port Conflicts**: Check that required ports are available
4. **SMS Service**: Mock SMS service for testing environments

### Performance Considerations
- Tests create and clean up significant amounts of data
- Database operations may be slow on first run
- Network timeouts may occur with external services
- Consider using test database for isolation

### Security Notes
- Test data includes sensitive information (passwords, tokens)
- Ensure test databases are properly secured
- Clean up test data in production environments
- Use mock services for external integrations in testing