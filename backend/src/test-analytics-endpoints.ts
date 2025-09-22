import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

// Mock authentication token - replace with actual token
const AUTH_TOKEN = 'your-auth-token-here';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

async function testAnalyticsEndpoints() {
  console.log('🧪 Testing Analytics Endpoints...\n');

  try {
    // Test 1: Basic reports endpoint
    console.log('1. Testing basic reports endpoint...');
    const reportsResponse = await api.get('/api/reports', {
      params: {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        reportType: 'overview'
      }
    });
    console.log('✅ Basic reports endpoint working');
    console.log('   - Total bookings:', reportsResponse.data.totalBookings || 0);
    console.log('   - Attendance rate:', reportsResponse.data.attendanceRate || 0);
    console.log('   - Utilization rate:', reportsResponse.data.utilizationRate || 0);

    // Test 2: Analytics endpoint
    console.log('\n2. Testing analytics endpoint...');
    const analyticsResponse = await api.get('/api/reports/analytics');
    console.log('✅ Analytics endpoint working');
    console.log('   - Growth data:', analyticsResponse.data.growth ? 'Available' : 'Not available');
    console.log('   - Peak hours:', analyticsResponse.data.peakHours?.length || 0, 'entries');
    console.log('   - Teacher performance:', analyticsResponse.data.teacherPerformance?.length || 0, 'entries');

    // Test 3: Real-time metrics endpoint
    console.log('\n3. Testing real-time metrics endpoint...');
    const realTimeResponse = await api.get('/api/reports/real-time');
    console.log('✅ Real-time metrics endpoint working');
    console.log('   - Today\'s bookings:', realTimeResponse.data.todayMetrics?.bookings || 0);
    console.log('   - Recent activity:', realTimeResponse.data.recentActivity?.length || 0, 'entries');
    console.log('   - System alerts:', realTimeResponse.data.systemAlerts?.length || 0, 'alerts');

    // Test 4: No-show analysis endpoint
    console.log('\n4. Testing no-show analysis endpoint...');
    const noShowResponse = await api.get('/api/reports/no-show-analysis', {
      params: { days: 30 }
    });
    console.log('✅ No-show analysis endpoint working');
    console.log('   - Total no-shows:', noShowResponse.data.summary?.totalNoShows || 0);
    console.log('   - Repeat offenders:', noShowResponse.data.patterns?.repeatOffenders?.length || 0);
    console.log('   - Recommendations:', noShowResponse.data.recommendations?.length || 0);

    // Test 5: Export functionality
    console.log('\n5. Testing export functionality...');
    const exportResponse = await api.get('/api/reports/export', {
      params: {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        reportType: 'attendance',
        format: 'csv'
      },
      responseType: 'blob'
    });
    console.log('✅ Export functionality working');
    console.log('   - Response type:', typeof exportResponse.data);
    console.log('   - Content length:', exportResponse.data.size || 'Unknown');

    console.log('\n🎉 All analytics endpoints are working correctly!');

  } catch (error: any) {
    console.error('❌ Error testing analytics endpoints:', error.message);
    if (error.response) {
      console.error('   - Status:', error.response.status);
      console.error('   - Data:', error.response.data);
    }
  }
}

async function testWithMockData() {
  console.log('📊 Testing with mock data scenarios...\n');

  const testScenarios = [
    {
      name: 'Super Admin - All Branches',
      params: { reportType: 'overview' }
    },
    {
      name: 'Branch Admin - Specific Branch',
      params: { reportType: 'overview', branchId: 'branch-123' }
    },
    {
      name: 'Attendance Report',
      params: { reportType: 'attendance', startDate: '2024-01-01', endDate: '2024-01-31' }
    },
    {
      name: 'Utilization Report',
      params: { reportType: 'utilization', startDate: '2024-01-01', endDate: '2024-01-31' }
    },
    {
      name: 'Assessment Analytics',
      params: { reportType: 'assessments', startDate: '2024-01-01', endDate: '2024-01-31' }
    }
  ];

  for (const scenario of testScenarios) {
    try {
      console.log(`Testing: ${scenario.name}`);
      const response = await api.get('/api/reports', { params: scenario.params });
      console.log(`✅ ${scenario.name} - Success`);
      console.log(`   - Response keys: ${Object.keys(response.data).join(', ')}`);
    } catch (error: any) {
      console.log(`❌ ${scenario.name} - Failed: ${error.message}`);
    }
  }
}

// Performance test
async function testPerformance() {
  console.log('\n⚡ Testing endpoint performance...\n');

  const endpoints = [
    '/api/reports?reportType=overview',
    '/api/reports/analytics',
    '/api/reports/real-time',
    '/api/reports/no-show-analysis'
  ];

  for (const endpoint of endpoints) {
    const startTime = Date.now();
    try {
      await api.get(endpoint);
      const endTime = Date.now();
      console.log(`✅ ${endpoint} - ${endTime - startTime}ms`);
    } catch (error: any) {
      console.log(`❌ ${endpoint} - Failed: ${error.message}`);
    }
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting comprehensive analytics endpoint testing...\n');
  
  await testAnalyticsEndpoints();
  await testWithMockData();
  await testPerformance();
  
  console.log('\n✨ Testing complete!');
}

// Export for use in other files
export {
  testAnalyticsEndpoints,
  testWithMockData,
  testPerformance,
  runAllTests
};

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}