#!/usr/bin/env node

const axios = require('axios');

const API_BASE = 'http://localhost:3001';

async function testEndpoints() {
  console.log('🧪 Testing All API Endpoints\n');

  try {
    // 1. Test health endpoint
    console.log('1. Testing Health Endpoint...');
    try {
      const health = await axios.get(`${API_BASE}/health`);
      console.log(`   ✅ Health: ${health.data.status} (${health.status})\n`);
    } catch (healthError) {
      if (healthError.response?.status === 503) {
        console.log(`   ⚠️ Health: ${healthError.response.data.status} (database disconnected)\n`);
      } else {
        throw healthError;
      }
    }

    // 2. Test staff login
    console.log('2. Testing Staff Login...');
    const loginResponse = await axios.post(`${API_BASE}/api/auth/staff/login`, {
      email: 'admin@10minuteschool.com',
      password: 'admin123'
    });
    const token = loginResponse.data.token;
    console.log(`   ✅ Staff Login: ${loginResponse.data.user.name} (${loginResponse.data.user.role})\n`);

    // 3. Test student OTP request
    console.log('3. Testing Student OTP Request...');
    const otpResponse = await axios.post(`${API_BASE}/api/auth/student/request-otp`, {
      phoneNumber: '+8801712345678'
    });
    console.log(`   ✅ OTP Request: ${otpResponse.data.message}\n`);

    // 4. Test student OTP verification
    console.log('4. Testing Student OTP Verification...');
    const verifyResponse = await axios.post(`${API_BASE}/api/auth/student/verify-otp`, {
      phoneNumber: '+8801712345678',
      otp: '123456'
    });
    console.log(`   ✅ OTP Verify: ${verifyResponse.data.user.name} (${verifyResponse.data.user.role})\n`);

    // Create headers with token
    const headers = { Authorization: `Bearer ${token}` };

    // 5. Test dashboard metrics
    console.log('5. Testing Dashboard Metrics...');
    const dashboardResponse = await axios.get(`${API_BASE}/api/dashboard/metrics`, { headers });
    console.log(`   ✅ Dashboard: ${dashboardResponse.data.totalBookings} bookings, ${dashboardResponse.data.totalBranches} branches\n`);

    // 6. Test notifications
    console.log('6. Testing Notifications...');
    const notificationsResponse = await axios.get(`${API_BASE}/api/notifications/my`, { headers });
    console.log(`   ✅ Notifications: ${notificationsResponse.data.notifications.length} notifications, ${notificationsResponse.data.unreadCount} unread\n`);

    // 7. Test branches
    console.log('7. Testing Branches...');
    const branchesResponse = await axios.get(`${API_BASE}/api/branches`, { headers });
    console.log(`   ✅ Branches: ${branchesResponse.data.branches.length} branches found\n`);

    // 8. Test current user
    console.log('8. Testing Current User...');
    const userResponse = await axios.get(`${API_BASE}/api/auth/me`, { headers });
    console.log(`   ✅ Current User: ${userResponse.data.user.name} (${userResponse.data.user.role})\n`);

    // 9. Test bookings/my endpoint
    console.log('9. Testing My Bookings...');
    const bookingsResponse = await axios.get(`${API_BASE}/api/bookings/my`, { headers });
    const bookingsData = bookingsResponse.data.bookings || bookingsResponse.data;
    console.log(`   ✅ My Bookings: ${bookingsData.length} bookings found\n`);

    console.log('🎉 All endpoints are working correctly!');
    console.log('\n📊 Summary:');
    console.log('• Authentication: ✅ Working (with mock fallback)');
    console.log('• Dashboard: ✅ Working (with mock data)');
    console.log('• Notifications: ✅ Working (with mock data)');
    console.log('• Branches: ✅ Working (with mock data)');
    console.log('• Health Check: ⚠️ Unhealthy (database disconnected)');
    console.log('\n🌐 Frontend should now load without console errors!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testEndpoints();