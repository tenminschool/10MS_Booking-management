#!/usr/bin/env tsx
// Comprehensive Integration Test Suite for Multi-Branch Speaking Test Booking System
import { testDataManager } from './setup';
import runBookingIntegrationTests from './integration-booking.test';
import runAuthIntegrationTests from './integration-auth.test';
import runAssessmentIntegrationTests from './integration-assessment.test';
import runNotificationIntegrationTests from './integration-notifications.test';
import runAuditIntegrationTests from './integration-audit.test';
import runMobileIsolationIntegrationTests from './integration-mobile-isolation.test';

interface TestSuiteResult {
  name: string;
  success: boolean;
  duration: number;
  error?: any;
}

class ComprehensiveTestRunner {
  private results: TestSuiteResult[] = [];
  private startTime: number = 0;

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Comprehensive Integration Test Suite for Multi-Branch System\n');
    console.log('=' .repeat(80));
    console.log('📋 Test Coverage:');
    console.log('   ✓ Cross-branch booking flow (browse, book, confirm, cancel)');
    console.log('   ✓ Authentication systems (student phone + staff email login)');
    console.log('   ✓ Assessment recording, CSV import, and role-based access control');
    console.log('   ✓ Multi-channel notification system (SMS + in-app) and delivery verification');
    console.log('   ✓ Audit logging system and system settings management');
    console.log('   ✓ Mobile responsiveness testing and cross-branch data isolation validation');
    console.log('=' .repeat(80));
    console.log();

    this.startTime = Date.now();

    const testSuites = [
      { name: 'Authentication Integration Tests', runner: runAuthIntegrationTests },
      { name: 'Cross-Branch Booking Integration Tests', runner: runBookingIntegrationTests },
      { name: 'Assessment Recording and CSV Import Tests', runner: runAssessmentIntegrationTests },
      { name: 'Multi-Channel Notification Integration Tests', runner: runNotificationIntegrationTests },
      { name: 'Audit Logging and System Settings Tests', runner: runAuditIntegrationTests },
      { name: 'Mobile Responsiveness and Data Isolation Tests', runner: runMobileIsolationIntegrationTests }
    ];

    for (const suite of testSuites) {
      await this.runTestSuite(suite.name, suite.runner);
    }

    await this.generateFinalReport();
  }

  private async runTestSuite(name: string, testRunner: () => Promise<void>): Promise<void> {
    console.log(`🧪 Running ${name}...`);
    const suiteStartTime = Date.now();
    
    try {
      await testRunner();
      const duration = Date.now() - suiteStartTime;
      
      this.results.push({
        name,
        success: true,
        duration
      });
      
      console.log(`✅ ${name} completed successfully in ${duration}ms\n`);
    } catch (error) {
      const duration = Date.now() - suiteStartTime;
      
      this.results.push({
        name,
        success: false,
        duration,
        error
      });
      
      console.error(`❌ ${name} failed after ${duration}ms:`, error);
      console.log(); // Add spacing
    }
  }

  private async generateFinalReport(): Promise<void> {
    const totalDuration = Date.now() - this.startTime;
    const successfulTests = this.results.filter(r => r.success).length;
    const failedTests = this.results.filter(r => !r.success).length;
    const totalTests = this.results.length;

    console.log('=' .repeat(80));
    console.log('📊 COMPREHENSIVE TEST SUITE FINAL REPORT');
    console.log('=' .repeat(80));
    console.log();

    console.log('📈 Overall Results:');
    console.log(`   Total Test Suites: ${totalTests}`);
    console.log(`   Successful: ${successfulTests} ✅`);
    console.log(`   Failed: ${failedTests} ${failedTests > 0 ? '❌' : ''}`);
    console.log(`   Success Rate: ${((successfulTests / totalTests) * 100).toFixed(1)}%`);
    console.log(`   Total Duration: ${(totalDuration / 1000).toFixed(2)} seconds`);
    console.log();

    console.log('📋 Detailed Results:');
    this.results.forEach((result, index) => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      const duration = `${(result.duration / 1000).toFixed(2)}s`;
      console.log(`   ${index + 1}. ${status} ${result.name} (${duration})`);
      
      if (!result.success && result.error) {
        console.log(`      Error: ${result.error.message || result.error}`);
      }
    });
    console.log();

    console.log('🎯 Test Coverage Summary:');
    console.log('   ✓ Cross-Branch Booking Flow:');
    console.log('     - Browse slots across multiple branches');
    console.log('     - Create bookings with cross-branch support');
    console.log('     - Cancel and reschedule across branches');
    console.log('     - Business rules validation (capacity, 24-hour rule)');
    console.log();
    
    console.log('   ✓ Authentication Systems:');
    console.log('     - Student phone number + SMS OTP authentication');
    console.log('     - Staff email/password authentication');
    console.log('     - Role-based access control (Super Admin, Branch Admin, Teacher, Student)');
    console.log('     - Token validation and session management');
    console.log();
    
    console.log('   ✓ Assessment Recording:');
    console.log('     - IELTS score recording (0-9 with 0.5 increments)');
    console.log('     - Assessment history and access control');
    console.log('     - CSV student import with validation');
    console.log('     - Cross-branch assessment analytics');
    console.log();
    
    console.log('   ✓ Multi-Channel Notifications:');
    console.log('     - SMS and in-app booking confirmations');
    console.log('     - 24-hour reminder system');
    console.log('     - Teacher cancellation notifications');
    console.log('     - Notification management and templates');
    console.log();
    
    console.log('   ✓ Audit Logging:');
    console.log('     - CRUD operation tracking');
    console.log('     - System settings management');
    console.log('     - Role-based audit log access');
    console.log('     - Filtering and search capabilities');
    console.log();
    
    console.log('   ✓ Mobile & Data Isolation:');
    console.log('     - Mobile-friendly API responses');
    console.log('     - Cross-branch data isolation by role');
    console.log('     - Data consistency validation');
    console.log('     - Security boundary enforcement');
    console.log();

    if (failedTests === 0) {
      console.log('🎉 ALL INTEGRATION TESTS PASSED! 🎉');
      console.log('The multi-branch speaking test booking system is ready for deployment.');
    } else {
      console.log('⚠️  Some tests failed. Please review the errors above before deployment.');
    }

    console.log();
    console.log('=' .repeat(80));
    console.log('📝 Next Steps:');
    console.log('   1. Review any failed tests and fix issues');
    console.log('   2. Run individual test suites for debugging if needed');
    console.log('   3. Perform manual testing on actual mobile devices');
    console.log('   4. Validate SMS delivery in production environment');
    console.log('   5. Test with real user data and scenarios');
    console.log('=' .repeat(80));
  }

  async cleanup(): Promise<void> {
    try {
      await testDataManager.cleanup();
      console.log('🧹 Test data cleanup completed');
    } catch (error) {
      console.error('❌ Test cleanup error:', error);
    }
  }
}

// Main execution
async function main(): Promise<void> {
  const testRunner = new ComprehensiveTestRunner();
  
  try {
    await testRunner.runAllTests();
  } catch (error) {
    console.error('❌ Test suite execution error:', error);
    process.exit(1);
  } finally {
    await testRunner.cleanup();
    process.exit(0);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n🛑 Test suite interrupted. Cleaning up...');
  const testRunner = new ComprehensiveTestRunner();
  await testRunner.cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Test suite terminated. Cleaning up...');
  const testRunner = new ComprehensiveTestRunner();
  await testRunner.cleanup();
  process.exit(0);
});

// Run if called directly
if (require.main === module) {
  main();
}

export default ComprehensiveTestRunner;