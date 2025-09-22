// Comprehensive test for the complete student phone authentication system
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth';
import prisma from './lib/prisma';
import { UserRole } from '@prisma/client';

// Create test app without starting server
const createTestApp = () => {
  const app = express();
  
  // Middleware
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.set('trust proxy', true);
  
  // Routes
  app.use('/api/auth', authRoutes);
  
  return app;
};

async function testCompleteAuth() {
  console.log('🧪 Testing Complete Student Phone Authentication System...\n');

  const app = createTestApp();

  // Test data
  const testStudent = {
    phoneNumber: '+8801712345678',
    name: 'Test Student',
    role: UserRole.STUDENT
  };

  try {
    // 1. Create a test student in the database
    console.log('1. Setting up test student...');
    await prisma.user.upsert({
      where: { phoneNumber: testStudent.phoneNumber },
      update: { isActive: true },
      create: {
        phoneNumber: testStudent.phoneNumber,
        name: testStudent.name,
        role: testStudent.role,
        isActive: true
      }
    });
    console.log('✅ Test student created/updated');

    // 2. Test OTP request endpoint
    console.log('\n2. Testing OTP request endpoint...');
    const otpResponse = await request(app)
      .post('/api/auth/student/request-otp')
      .send({ phoneNumber: testStudent.phoneNumber })
      .expect(200);
    
    console.log('✅ OTP request successful');
    console.log('Response:', otpResponse.body);

    // Get the OTP from development mode response
    const otp = otpResponse.body.otp;
    if (!otp) {
      throw new Error('OTP not found in development response');
    }

    // 3. Test OTP verification and login
    console.log('\n3. Testing OTP verification and login...');
    const loginResponse = await request(app)
      .post('/api/auth/student/verify-otp')
      .send({ 
        phoneNumber: testStudent.phoneNumber,
        otp: otp
      })
      .expect(200);

    console.log('✅ OTP verification and login successful');
    console.log('Login response:', {
      user: loginResponse.body.user,
      tokenExists: !!loginResponse.body.token,
      expiresIn: loginResponse.body.expiresIn
    });

    const token = loginResponse.body.token;

    // 4. Test authenticated endpoint
    console.log('\n4. Testing authenticated endpoint...');
    const meResponse = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    console.log('✅ Authenticated endpoint access successful');
    console.log('User data:', meResponse.body.user);

    // 5. Test OTP status endpoint
    console.log('\n5. Testing OTP status endpoint...');
    const statusResponse = await request(app)
      .get(`/api/auth/student/otp-status/${encodeURIComponent(testStudent.phoneNumber)}`)
      .expect(200);

    console.log('✅ OTP status check successful');
    console.log('Status:', statusResponse.body);

    // 6. Test rate limiting (request multiple OTPs)
    console.log('\n6. Testing rate limiting...');
    
    // First request should work
    await request(app)
      .post('/api/auth/student/request-otp')
      .send({ phoneNumber: testStudent.phoneNumber })
      .expect(429); // Should be rate limited since we already have a valid OTP

    console.log('✅ Rate limiting working correctly');

    // 7. Test invalid phone number
    console.log('\n7. Testing invalid phone number validation...');
    await request(app)
      .post('/api/auth/student/request-otp')
      .send({ phoneNumber: '123456789' })
      .expect(400);

    console.log('✅ Phone number validation working correctly');

    // 8. Test invalid OTP
    console.log('\n8. Testing invalid OTP verification...');
    await request(app)
      .post('/api/auth/student/verify-otp')
      .send({ 
        phoneNumber: testStudent.phoneNumber,
        otp: '000000'
      })
      .expect(401);

    console.log('✅ Invalid OTP rejection working correctly');

    // 9. Test logout
    console.log('\n9. Testing logout...');
    const logoutResponse = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    console.log('✅ Logout successful');
    console.log('Logout response:', logoutResponse.body);

    console.log('\n🎉 Complete student phone authentication system test PASSED!');
    console.log('\n📋 Summary:');
    console.log('✅ SMS OTP service integration');
    console.log('✅ Student login endpoints with phone number verification');
    console.log('✅ Phone number validation and OTP verification logic');
    console.log('✅ Student authentication middleware and session management');
    console.log('✅ Rate limiting and security measures');
    console.log('✅ Error handling and validation');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  } finally {
    // Cleanup
    await prisma.user.deleteMany({
      where: { phoneNumber: testStudent.phoneNumber }
    });
    await prisma.$disconnect();
  }
}

// Run the test
if (require.main === module) {
  testCompleteAuth().catch(console.error);
}

export default testCompleteAuth;