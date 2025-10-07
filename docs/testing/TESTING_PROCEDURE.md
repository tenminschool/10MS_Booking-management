# Testing Procedure - Speaking Test Booking System

## Overview
This document outlines the comprehensive testing procedure for the Speaking Test Booking System. The testing is divided into three parts: Sanity Test, Jest Test, and Smoke Test.

## Part 1: Sanity Test (Quick Health Check)

### Purpose
Run a lightweight check to confirm basic system health and functionality.

### Test Steps
1. **App Build and Start Check**
   - Run `npm run build` in both frontend and backend
   - Run `npm start` in both frontend and backend
   - Verify no build errors or startup crashes

2. **Environment Variables Check**
   - Verify `.env` files exist and contain required variables
   - Check Supabase connection string is present
   - Verify JWT secret is configured
   - Check all required environment variables are loaded

3. **Supabase Connection Check**
   - Test database connectivity
   - Verify Supabase can connect to Supabase
   - Check if database schema is up to date
   - Run `npx supabase db push` to ensure schema sync

4. **Main Pages Load Check**
   - Navigate to `/` (home page)
   - Navigate to `/login` (login page)
   - Navigate to `/dashboard` (dashboard page)
   - Verify no 404 errors or crashes

### Expected Output
- ✅ **Pass**: All checks pass, system is healthy
- ❌ **Fail**: Any check fails, log specific errors

### Success Criteria
- App builds without errors
- App starts without crashes
- Environment variables loaded correctly
- Supabase connection is live
- Main pages load without errors

---

## Part 2: Jest Test (Logic + Unit Coverage)

### Purpose
Run all Jest tests to verify logic and unit test coverage.

### Test Steps
1. **Run Jest Test Suite**
   - Execute `npm test` in both frontend and backend
   - Run all test files in the repository
   - Check for any failing tests

2. **Coverage Analysis**
   - Generate coverage report
   - Check coverage percentage for key files
   - Identify untested code areas

3. **Key Function Tests**
   - Test utility functions (validation, formatting, etc.)
   - Test React hooks (useApiCall, etc.)
   - Test API endpoints
   - Test authentication logic
   - Test business logic functions

### Expected Output
- ✅ **Pass**: All tests pass, good coverage
- ❌ **Fail**: Tests fail, log specific failures

### Success Criteria
- All Jest tests pass
- Coverage > 70% for critical files
- No test failures or errors

---

## Part 3: Smoke Test (Full Feature Completeness)

### Purpose
Test all frontend flows and Supabase CRUD features end-to-end.

### Test Categories

#### 3.1 Authentication Flow
- [ ] User registration
- [ ] User login (all roles)
- [ ] User logout
- [ ] Password reset
- [ ] Role-based access control

#### 3.2 Student Features
- [ ] View available slots
- [ ] Book a slot
- [ ] Cancel booking
- [ ] Reschedule booking
- [ ] View booking history
- [ ] View assessment results
- [ ] Join waiting list

#### 3.3 Teacher Features
- [ ] View assigned slots
- [ ] Mark attendance
- [ ] Record assessment
- [ ] View student performance
- [ ] Update profile

#### 3.4 Branch Admin Features
- [ ] View branch dashboard
- [ ] Manage slots
- [ ] Manage users
- [ ] View branch reports
- [ ] Manage waiting list

#### 3.5 Super Admin Features
- [ ] View system dashboard
- [ ] Manage all branches
- [ ] Manage all users
- [ ] View system reports
- [ ] System configuration

#### 3.6 API Endpoints
- [ ] GET /api/bookings
- [ ] POST /api/bookings
- [ ] PUT /api/bookings/:id
- [ ] DELETE /api/bookings/:id
- [ ] GET /api/slots
- [ ] POST /api/slots
- [ ] GET /api/assessments
- [ ] POST /api/assessments
- [ ] GET /api/users
- [ ] POST /api/users

#### 3.7 Database Operations
- [ ] Create booking
- [ ] Read booking
- [ ] Update booking
- [ ] Delete booking
- [ ] Create slot
- [ ] Read slot
- [ ] Update slot
- [ ] Delete slot
- [ ] Create assessment
- [ ] Read assessment
- [ ] Update assessment
- [ ] Delete assessment

### Test Results Format

#### ✅ Working Features
- List all features that work correctly
- Include any minor issues that don't affect functionality

#### ❌ Broken/Incomplete Features
- List all features that don't work
- Include specific error messages
- Note what needs to be fixed

### Success Criteria
- All critical features work end-to-end
- No major bugs or crashes
- All API endpoints respond correctly
- Database operations work properly

---

## Testing Schedule

### After Every 2 Tasks
- Run Part 1: Sanity Test
- Run Part 2: Jest Test
- Run Part 3: Smoke Test
- Document results
- Fix any issues found

### Final Testing
- Run all three parts
- Ensure 100% working features
- Document final status
- Prepare for deployment

---

## Test Environment Setup

### Prerequisites
- Node.js installed
- npm/yarn installed
- Supabase account and project
- Database schema deployed
- Environment variables configured

### Commands
```bash
# Backend
cd backend
npm install
npm run build
npm start

# Frontend
cd frontend
npm install
npm run build
npm start

# Testing
npm test
npm run test:coverage
```

### Test Data
- Create test users for each role
- Create test slots
- Create test bookings
- Create test assessments

---

## Issue Tracking

### Issue Categories
1. **Critical**: Blocks core functionality
2. **High**: Affects user experience significantly
3. **Medium**: Minor issues that can be worked around
4. **Low**: Cosmetic issues

### Issue Resolution
1. Document the issue
2. Assign priority level
3. Fix the issue
4. Re-test the feature
5. Update test results

---

## Test Results Template

### Test Run: [Date]
- **Sanity Test**: ✅ Pass / ❌ Fail
- **Jest Test**: ✅ Pass / ❌ Fail
- **Smoke Test**: ✅ Pass / ❌ Fail

### Issues Found:
1. [Issue description] - [Priority] - [Status]
2. [Issue description] - [Priority] - [Status]

### Working Features:
- [Feature 1]
- [Feature 2]
- [Feature 3]

### Broken Features:
- [Feature 1] - [Error description]
- [Feature 2] - [Error description]
- [Feature 3] - [Error description]

### Next Steps:
- [Action 1]
- [Action 2]
- [Action 3]
