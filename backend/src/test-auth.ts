// Simple test script to verify authentication setup
import { hashPassword, comparePassword } from './utils/password';
import { generateToken, verifyToken } from './utils/jwt';
import { UserRole } from '@prisma/client';

async function testAuth() {
  console.log('🧪 Testing Authentication System...\n');

  // Test password hashing
  console.log('1. Testing password hashing...');
  const password = 'testPassword123';
  const hashedPassword = await hashPassword(password);
  console.log(`Original: ${password}`);
  console.log(`Hashed: ${hashedPassword}`);
  
  const isValid = await comparePassword(password, hashedPassword);
  console.log(`Password verification: ${isValid ? '✅ PASS' : '❌ FAIL'}\n`);

  // Test JWT tokens
  console.log('2. Testing JWT tokens...');
  const payload = {
    userId: 'test-user-id',
    role: UserRole.STUDENT,
    phoneNumber: '+8801712345678'
  };
  
  const token = generateToken(payload);
  console.log(`Generated token: ${token.substring(0, 50)}...`);
  
  try {
    const decoded = verifyToken(token);
    console.log('Decoded payload:', decoded);
    console.log(`JWT verification: ✅ PASS\n`);
  } catch (error) {
    console.log(`JWT verification: ❌ FAIL - ${error}\n`);
  }

  // Test validation
  console.log('3. Testing validation schemas...');
  try {
    const { validateRequest, createUserSchema } = await import('./utils/validation');
    
    const validUser = {
      name: 'Test User',
      phoneNumber: '+8801712345678',
      role: UserRole.STUDENT
    };
    
    const result = validateRequest(createUserSchema, validUser);
    console.log('Validation result:', result);
    console.log('Validation: ✅ PASS\n');
  } catch (error) {
    console.log(`Validation: ❌ FAIL - ${error}\n`);
  }

  console.log('🎉 Authentication system test completed!');
}

// Run the test
testAuth().catch(console.error);