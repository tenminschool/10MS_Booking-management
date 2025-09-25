# Utility Scripts

This directory contains utility scripts for testing, validation, and system management for the 10MS Speaking Test Booking System.

## 📁 Directory Structure

### 🔧 [Utilities](./utilities/)
General-purpose utility scripts
- `test-all-endpoints.js` - Comprehensive API endpoint testing
- `check-server-status.js` - Server status and port checking

### ✅ [Validation](./validation/)
Validation and verification scripts
- `test-fixes-validation.js` - Validates applied fixes
- `validate-e2e-setup.js` - E2E testing setup validation

### 🧪 [Testing](./testing/)
Testing and quality assurance scripts
- `run-comprehensive-e2e-tests.ts` - Comprehensive E2E test runner

## 🛠️ Script Usage

### Testing All API Endpoints
```bash
node scripts/utilities/test-all-endpoints.js
```
Tests all major API endpoints and provides a comprehensive status report.

### Checking Server Status
```bash
node scripts/utilities/check-server-status.js
```
Checks which ports are active and provides server status information.

### Validating E2E Setup
```bash
node scripts/validation/validate-e2e-setup.js
```
Validates that the E2E testing environment is properly configured.

### Running Comprehensive E2E Tests
```bash
npx tsx scripts/testing/run-comprehensive-e2e-tests.ts
```
Executes the full E2E testing suite with comprehensive coverage.

## 📋 Script Features

### API Testing (`test-all-endpoints.js`)
- Tests authentication endpoints
- Validates dashboard metrics
- Checks notification system
- Verifies branch management
- Provides detailed status report

### Server Status (`check-server-status.js`)
- Checks multiple ports (3000, 3001, 5173, 5174, 5175)
- Identifies running services
- Provides port usage information
- Suggests next steps

### E2E Testing (`run-comprehensive-e2e-tests.ts`)
- Backend API integration testing
- Frontend UI responsiveness testing
- Cross-browser compatibility validation
- Service management and orchestration

## 🔍 Script Output Examples

### Successful API Test
```
🧪 Testing All API Endpoints

1. Testing Health Endpoint...
   ⚠️ Health: unhealthy (database disconnected)

2. Testing Staff Login...
   ✅ Staff Login: Super Admin (SUPER_ADMIN)

3. Testing Dashboard Metrics...
   ✅ Dashboard: 1247 bookings, 5 branches

🎉 All endpoints are working correctly!
```

### Server Status Check
```
🔍 Checking server status...

✅ Port 3001: Server running on port 3001
✅ Port 5175: Server running on port 5175

🚀 Available servers:
• Backend API: http://localhost:3001
• Frontend: http://localhost:5175
```

## ⚙️ Configuration

### Environment Requirements
- Node.js v18+
- TypeScript for .ts files
- Access to running servers
- Proper environment variables

### Dependencies
Scripts use minimal dependencies:
- `axios` for HTTP requests
- `http` module for port checking
- Standard Node.js modules

## 🚀 Adding New Scripts

### Script Categories
1. **Utilities**: General-purpose tools
2. **Validation**: Verification and checking
3. **Testing**: Quality assurance and testing

### Naming Conventions
- Use kebab-case for filenames
- Include descriptive names
- Add appropriate file extensions (.js, .ts)

### Documentation Requirements
- Add usage instructions
- Include example output
- Document any dependencies
- Update this README

## 🔧 Troubleshooting

### Common Issues
1. **Permission Errors**: Ensure scripts are executable
2. **Port Conflicts**: Check for running services
3. **Missing Dependencies**: Run `npm install`
4. **Environment Variables**: Verify .env configuration

### Debug Mode
Most scripts include verbose output for debugging:
- Check console output for detailed information
- Review error messages for specific issues
- Verify server connectivity before running tests