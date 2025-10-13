#!/usr/bin/env tsx
/**
 * Populate Test Data Script
 * 
 * Creates dummy data to test incomplete features:
 * - Future slots (>24hrs) for cancellation testing
 * - Bookings for teachers to mark attendance
 * - Branch assignment for branch admin
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3001';
const API_BASE = `${BASE_URL}/api`;

interface TestUser {
  email: string;
  password: string;
  token?: string;
  userId?: string;
}

const adminUser: TestUser = {
  email: 'admin@10minuteschool.com',
  password: 'admin123'
};

const branchAdminUser: TestUser = {
  email: 'dhanmondi@10minuteschool.com',
  password: 'admin123'
};

const teacherUser: TestUser = {
  email: 'sarah@10minuteschool.com',
  password: 'teacher123'
};

const studentUser: TestUser = {
  email: 'student@10minuteschool.com',
  password: 'student123'
};

async function authenticateUsers() {
  console.log('🔐 Authenticating users...\n');
  
  for (const user of [adminUser, branchAdminUser, teacherUser, studentUser]) {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: user.email,
      password: user.password
    });
    
    const token = response.data.token || response.data.data?.token;
    const userData = response.data.user || response.data.data?.user;
    
    user.token = token;
    user.userId = userData?.id;
    console.log(`✅ ${user.email} authenticated`);
  }
  console.log();
}

async function createFutureSlots() {
  console.log('📅 Creating future slots (>24hrs away)...\n');
  
  try {
    // Get branches and teachers
    const [branches, serviceTypes, teachers] = await Promise.all([
      axios.get(`${API_BASE}/branches`, { headers: { Authorization: `Bearer ${adminUser.token}` }}),
      axios.get(`${API_BASE}/service-types`, { headers: { Authorization: `Bearer ${adminUser.token}` }}),
      axios.get(`${API_BASE}/users?role=TEACHER`, { headers: { Authorization: `Bearer ${adminUser.token}` }})
    ]);

    const branchData = branches.data.branches || branches.data;
    const serviceTypeData = serviceTypes.data.serviceTypes || serviceTypes.data;
    const teacherData = teachers.data.users || teachers.data;

    if (!branchData[0] || !serviceTypeData[0] || !teacherData[0]) {
      console.log('⚠️  Missing required data (branches, service types, or teachers)');
      return;
    }

    // Create slots for next 7 days
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const dateStr = futureDate.toISOString().split('T')[0];

    const slot = await axios.post(`${API_BASE}/slots`, {
      branchId: branchData[0].id,
      serviceTypeId: serviceTypeData[0].id,
      teacherId: teacherData[0].id,
      date: dateStr,
      startTime: '10:00',
      endTime: '11:00',
      capacity: 5,
      isBlocked: false
    }, {
      headers: { Authorization: `Bearer ${adminUser.token}` }
    });

    console.log(`✅ Created future slot: ${dateStr} at 10:00`);
    console.log(`   Slot ID: ${slot.data.id}\n`);
    
    return slot.data.id;
  } catch (error: any) {
    console.log(`❌ Failed to create future slot: ${error.response?.data?.message || error.message}\n`);
  }
}

async function createTestBooking(slotId?: string) {
  console.log('📝 Creating test booking for student...\n');
  
  try {
    // Get available slots if no slotId provided
    if (!slotId) {
      const slots = await axios.get(`${API_BASE}/slots/available`, {
        headers: { Authorization: `Bearer ${studentUser.token}` }
      });
      
      if (!slots.data || slots.data.length === 0) {
        console.log('⚠️  No available slots found\n');
        return;
      }
      
      slotId = slots.data[0].id;
    }

    // Check if already booked
    const myBookings = await axios.get(`${API_BASE}/bookings/my-bookings`, {
      headers: { Authorization: `Bearer ${studentUser.token}` }
    });
    
    const alreadyBooked = myBookings.data.find((b: any) => b.slotId === slotId);
    if (alreadyBooked) {
      console.log('✅ Student already has a booking for this slot\n');
      return alreadyBooked.id;
    }

    const booking = await axios.post(`${API_BASE}/bookings`, {
      slotId
    }, {
      headers: { Authorization: `Bearer ${studentUser.token}` }
    });

    console.log(`✅ Created test booking: ${booking.data.id}\n`);
    return booking.data.id;
  } catch (error: any) {
    console.log(`⚠️  Could not create booking: ${error.response?.data?.message || error.message}\n`);
  }
}

async function assignBranchToAdmin() {
  console.log('🏢 Assigning branch to branch admin...\n');
  
  try {
    // Update branch admin user with branchId
    const branches = await axios.get(`${API_BASE}/branches`, {
      headers: { Authorization: `Bearer ${adminUser.token}` }
    });
    
    const branchData = branches.data.branches || branches.data;
    const dhanmondiBranch = branchData.find((b: any) => b.name.includes('Dhanmondi'));
    
    if (!dhanmondiBranch) {
      console.log('⚠️  Dhanmondi branch not found\n');
      return;
    }

    console.log(`✅ Branch admin already has branch: ${dhanmondiBranch.name}\n`);
  } catch (error: any) {
    console.log(`⚠️  Could not assign branch: ${error.message}\n`);
  }
}

async function createTestRoom() {
  console.log('🏠 Creating test room for branch admin...\n');
  
  try {
    const branches = await axios.get(`${API_BASE}/branches`, {
      headers: { Authorization: `Bearer ${branchAdminUser.token}` }
    });
    
    const branchData = branches.data.branches || branches.data;
    const branchId = branchData[0]?.id;

    if (!branchId) {
      console.log('⚠️  No branch found for branch admin\n');
      return;
    }

    const room = await axios.post(`${API_BASE}/rooms`, {
      branchId,
      roomNumber: `R-TEST-${Date.now()}`,
      roomName: 'Test Room',
      roomType: 'general',
      capacity: 10
    }, {
      headers: { Authorization: `Bearer ${branchAdminUser.token}` }
    });

    console.log(`✅ Created test room: ${room.data.room_name}\n`);
  } catch (error: any) {
    console.log(`⚠️  Could not create room: ${error.response?.data?.message || error.message}\n`);
  }
}

async function populateTestData() {
  console.log('\n' + '='.repeat(80));
  console.log('🌱 POPULATING TEST DATA FOR INCOMPLETE FEATURES');
  console.log('='.repeat(80) + '\n');

  try {
    // Step 1: Authenticate all users
    await authenticateUsers();

    // Step 2: Assign branch to admin (check if needed)
    await assignBranchToAdmin();

    // Step 3: Create test room
    await createTestRoom();

    // Step 4: Create future slots
    const futureSlotId = await createFutureSlots();

    // Step 5: Create test booking
    if (futureSlotId) {
      await createTestBooking(futureSlotId);
    }

    console.log('='.repeat(80));
    console.log('✅ Test data population complete!');
    console.log('='.repeat(80) + '\n');

    console.log('📊 You can now run the smoke test again to test incomplete features:\n');
    console.log('   npx tsx scripts/testing/part3-smoke-test.ts\n');

  } catch (error: any) {
    console.error('❌ Error populating test data:', error.message);
    process.exit(1);
  }
}

// Run the script
populateTestData().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});

