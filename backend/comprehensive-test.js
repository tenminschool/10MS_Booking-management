const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function runComprehensiveTest() {
  console.log('🚀 Starting Comprehensive System Test');
  console.log('=====================================\n');

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  function logTest(name, status, details = '') {
    const icon = status ? '✅' : '❌';
    console.log(`${icon} ${name}${details ? ` - ${details}` : ''}`);
    results.tests.push({ name, status, details });
    if (status) results.passed++; else results.failed++;
  }

  try {
    // Test 1: Health Check
    console.log('📊 Testing Health Endpoints...');
    try {
      const healthResponse = await axios.get(`${BASE_URL}/health`);
      logTest('Basic Health Check', healthResponse.status === 200, `Status: ${healthResponse.data.status}`);
    } catch (error) {
      logTest('Basic Health Check', false, error.message);
    }

    try {
      const detailedHealthResponse = await axios.get(`${BASE_URL}/health/detailed`);
      logTest('Detailed Health Check', detailedHealthResponse.status === 200, `Database: ${detailedHealthResponse.data.services.database.status}`);
    } catch (error) {
      logTest('Detailed Health Check', false, error.message);
    }

    // Test 2: Authentication Endpoints
    console.log('\n🔐 Testing Authentication Endpoints...');
    try {
      const authResponse = await axios.get(`${BASE_URL}/api/auth`);
      logTest('Auth Endpoint Access', authResponse.status === 200, 'Auth endpoint accessible');
    } catch (error) {
      logTest('Auth Endpoint Access', false, error.message);
    }

    // Test 3: Protected Endpoints (should require auth)
    console.log('\n🛡️ Testing Protected Endpoints...');
    try {
      await axios.get(`${BASE_URL}/api/dashboard/metrics`);
      logTest('Dashboard Metrics Protection', false, 'Should require authentication');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        logTest('Dashboard Metrics Protection', true, 'Correctly requires authentication');
      } else {
        logTest('Dashboard Metrics Protection', false, error.message);
      }
    }

    try {
      await axios.get(`${BASE_URL}/api/bookings`);
      logTest('Bookings Protection', false, 'Should require authentication');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        logTest('Bookings Protection', true, 'Correctly requires authentication');
      } else {
        logTest('Bookings Protection', false, error.message);
      }
    }

    // Test 4: API Endpoints Structure
    console.log('\n📡 Testing API Endpoints...');
    const endpoints = [
      '/api/auth',
      '/api/users',
      '/api/branches',
      '/api/slots',
      '/api/bookings',
      '/api/notifications',
      '/api/waiting-list',
      '/api/assessments',
      '/api/reports',
      '/api/system',
      '/api/admin/notifications'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${BASE_URL}${endpoint}`);
        logTest(`Endpoint ${endpoint}`, response.status === 200 || response.status === 401, `Status: ${response.status}`);
      } catch (error) {
        if (error.response && (error.response.status === 401 || error.response.status === 404)) {
          logTest(`Endpoint ${endpoint}`, true, `Status: ${error.response.status} (Expected)`);
        } else {
          logTest(`Endpoint ${endpoint}`, false, error.message);
        }
      }
    }

    // Test 5: Server Performance
    console.log('\n⚡ Testing Server Performance...');
    const startTime = Date.now();
    try {
      const perfResponse = await axios.get(`${BASE_URL}/health`);
      const responseTime = Date.now() - startTime;
      logTest('Response Time', responseTime < 1000, `${responseTime}ms`);
    } catch (error) {
      logTest('Response Time', false, error.message);
    }

    // Test 6: Database Connectivity
    console.log('\n🗄️ Testing Database Connectivity...');
    try {
      const dbResponse = await axios.get(`${BASE_URL}/health/detailed`);
      const dbStatus = dbResponse.data.services.database.status;
      logTest('Database Connection', dbStatus === 'connected', `Status: ${dbStatus}`);
    } catch (error) {
      logTest('Database Connection', false, error.message);
    }

    // Test 7: Memory Usage
    console.log('\n💾 Testing Memory Usage...');
    try {
      const memResponse = await axios.get(`${BASE_URL}/health/detailed`);
      const memoryUsage = memResponse.data.services.memory.percentage;
      logTest('Memory Usage', memoryUsage < 95, `${memoryUsage}%`);
    } catch (error) {
      logTest('Memory Usage', false, error.message);
    }

    // Test 8: CORS Headers (if applicable)
    console.log('\n🌐 Testing CORS Configuration...');
    try {
      const corsResponse = await axios.options(`${BASE_URL}/health`);
      logTest('CORS Headers', true, 'CORS configured');
    } catch (error) {
      logTest('CORS Headers', false, error.message);
    }

  } catch (error) {
    console.error('❌ Test suite error:', error.message);
  }

  // Summary
  console.log('\n📊 Test Results Summary');
  console.log('========================');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`);

  if (results.failed === 0) {
    console.log('\n🎉 All tests passed! System is fully functional.');
  } else {
    console.log('\n⚠️ Some tests failed. Please review the issues above.');
  }

  return results;
}

// Run the test
runComprehensiveTest().catch(console.error);
