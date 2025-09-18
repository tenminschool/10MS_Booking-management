// Test script for phone number authentication system
import { validateBangladeshPhone } from './middleware/phoneValidation';
import otpService from './services/otp';
import smsService from './services/sms';

async function testPhoneAuth() {
  console.log('🧪 Testing Phone Number Authentication System...\n');

  // Test phone number validation
  console.log('1. Testing phone number validation...');
  
  const testNumbers = [
    '+8801712345678',  // Valid Grameenphone
    '8801812345678',   // Valid Robi (without +)
    '01912345678',     // Valid Banglalink (local format)
    '+8801234567890',  // Invalid (wrong operator code)
    '01234567890',     // Invalid (wrong length)
    '+1234567890',     // Invalid (not Bangladesh)
  ];

  testNumbers.forEach(number => {
    const result = validateBangladeshPhone(number);
    console.log(`${number}: ${result.isValid ? '✅' : '❌'} ${result.isValid ? `(${result.formatted}, ${result.operator})` : result.error}`);
  });

  console.log('\n2. Testing OTP service...');
  
  // Test OTP generation and verification
  const testPhone = '+8801712345678';
  const otp = otpService.generateOTP();
  console.log(`Generated OTP: ${otp}`);
  
  // Store OTP
  await otpService.storeOTP(testPhone, otp);
  console.log(`OTP stored for ${testPhone}`);
  
  // Check if OTP exists
  const hasValidOTP = await otpService.hasValidOTP(testPhone);
  console.log(`Has valid OTP: ${hasValidOTP ? '✅' : '❌'}`);
  
  // Get remaining time
  const remainingTime = await otpService.getRemainingTime(testPhone);
  console.log(`Remaining time: ${remainingTime} seconds`);
  
  // Test correct OTP verification
  const correctVerification = await otpService.verifyOTP(testPhone, otp);
  console.log(`Correct OTP verification: ${correctVerification.success ? '✅' : '❌'} ${correctVerification.error || ''}`);
  
  // Test incorrect OTP verification (should fail since OTP was consumed)
  await otpService.storeOTP(testPhone, '123456');
  const incorrectVerification = await otpService.verifyOTP(testPhone, '654321');
  console.log(`Incorrect OTP verification: ${incorrectVerification.success ? '❌' : '✅'} ${incorrectVerification.error || ''}`);

  console.log('\n3. Testing SMS service...');
  
  // Test SMS service
  const smsResult = await smsService.sendOTP(testPhone, '123456');
  console.log(`SMS sending: ${smsResult.success ? '✅' : '❌'} ${smsResult.error || `Message ID: ${smsResult.messageId}`}`);
  
  // Test SMS service connection
  const connectionTest = await smsService.testConnection();
  console.log(`SMS service connection: ${connectionTest ? '✅' : '❌'}`);

  console.log('\n4. Testing OTP service statistics...');
  
  // Generate some test data
  await otpService.storeOTP('+8801812345678', '111111');
  await otpService.storeOTP('+8801912345678', '222222');
  
  const stats = otpService.getStats();
  console.log('OTP Statistics:', stats);

  console.log('\n🎉 Phone number authentication system test completed!');
}

// Run the test
testPhoneAuth().catch(console.error);