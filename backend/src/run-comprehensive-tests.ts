#!/usr/bin/env tsx
// Simple runner for the comprehensive test suite
import ComprehensiveTestRunner from './tests/comprehensive-test-suite';

async function runTests() {
  console.log('🚀 Starting Comprehensive Integration Test Suite...\n');
  
  const testRunner = new ComprehensiveTestRunner();
  await testRunner.runAllTests();
}

runTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});