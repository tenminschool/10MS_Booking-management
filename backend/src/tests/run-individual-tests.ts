#!/usr/bin/env tsx
// Individual test runners for debugging specific test suites
import { testDataManager } from './setup';
import runBookingIntegrationTests from './integration-booking.test';
import runAuthIntegrationTests from './integration-auth.test';
import runAssessmentIntegrationTests from './integration-assessment.test';
import runNotificationIntegrationTests from './integration-notifications.test';
import runAuditIntegrationTests from './integration-audit.test';
import runMobileIsolationIntegrationTests from './integration-mobile-isolation.test';

const testSuites = {
  booking: runBookingIntegrationTests,
  auth: runAuthIntegrationTests,
  assessment: runAssessmentIntegrationTests,
  notifications: runNotificationIntegrationTests,
  audit: runAuditIntegrationTests,
  mobile: runMobileIsolationIntegrationTests
};

async function runIndividualTest(testName: string): Promise<void> {
  const testRunner = testSuites[testName as keyof typeof testSuites];
  
  if (!testRunner) {
    console.error(`❌ Unknown test suite: ${testName}`);
    console.log('Available test suites:', Object.keys(testSuites).join(', '));
    process.exit(1);
  }

  console.log(`🧪 Running ${testName} integration tests...\n`);
  
  try {
    await testRunner();
    console.log(`✅ ${testName} tests completed successfully`);
  } catch (error) {
    console.error(`❌ ${testName} tests failed:`, error);
    process.exit(1);
  } finally {
    await testDataManager.cleanup();
  }
}

// Get test name from command line arguments
const testName = process.argv[2];

if (!testName) {
  console.error('❌ Please specify a test suite to run');
  console.log('Usage: tsx src/tests/run-individual-tests.ts <test-name>');
  console.log('Available test suites:', Object.keys(testSuites).join(', '));
  process.exit(1);
}

runIndividualTest(testName);