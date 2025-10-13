#!/usr/bin/env tsx
/**
 * Master Test Runner
 * 
 * Runs all three parts of the comprehensive testing suite:
 * 1. Sanity Test (Quick Health Check)
 * 2. Jest Test (Logic + Unit Coverage)
 * 3. Smoke Test (Full Feature Completeness)
 * 
 * Generates a comprehensive report and identifies issues to fix
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

interface TestSuiteResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'ERROR';
  duration: number;
  output: string;
  error?: string;
}

class MasterTestRunner {
  private results: TestSuiteResult[] = [];
  private startTime: number = 0;

  async runAllTests(): Promise<void> {
    console.log('\n' + '═'.repeat(100));
    console.log('🚀 COMPREHENSIVE TESTING SUITE - ALL STAKEHOLDERS & FEATURES');
    console.log('═'.repeat(100));
    console.log('Running three-part testing strategy:');
    console.log('   Part 1: ��� Sanity Test (Quick Health Check)');
    console.log('   Part 2: 🧪 Jest Test (Logic + Unit Coverage)');
    console.log('   Part 3: 🔥 Smoke Test (Full Feature Completeness)');
    console.log('═'.repeat(100) + '\n');

    this.startTime = Date.now();

    // Part 1: Sanity Test
    await this.runTestSuite(
      'Part 1: Sanity Test',
      path.join(__dirname, 'part1-sanity-test.ts')
    );

    // Part 2: Jest Test
    await this.runTestSuite(
      'Part 2: Jest Test',
      path.join(__dirname, 'part2-jest-tests.ts')
    );

    // Part 3: Smoke Test
    await this.runTestSuite(
      'Part 3: Smoke Test',
      path.join(__dirname, 'part3-smoke-test.ts')
    );

    // Generate Master Report
    this.generateMasterReport();
  }

  private async runTestSuite(name: string, scriptPath: string): Promise<void> {
    const start = Date.now();
    console.log(`\n${'═'.repeat(100)}`);
    console.log(`🏃 Running ${name}...`);
    console.log(`${'═'.repeat(100)}\n`);

    try {
      const { stdout, stderr } = await execAsync(`tsx ${scriptPath}`, {
        cwd: process.cwd(),
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });

      const duration = Date.now() - start;
      
      console.log(stdout);
      if (stderr && !stderr.includes('warning')) {
        console.log('Stderr:', stderr);
      }

      this.results.push({
        name,
        status: 'PASS',
        duration,
        output: stdout
      });

      console.log(`\n✅ ${name} completed successfully in ${(duration / 1000).toFixed(2)}s\n`);

    } catch (error: any) {
      const duration = Date.now() - start;
      const output = error.stdout || '';
      const errorMsg = error.stderr || error.message;

      console.log(output);
      console.log(`\n❌ ${name} failed after ${(duration / 1000).toFixed(2)}s`);
      console.log(`Error: ${errorMsg}\n`);

      this.results.push({
        name,
        status: error.code === 1 ? 'FAIL' : 'ERROR',
        duration,
        output,
        error: errorMsg
      });
    }
  }

  private generateMasterReport(): void {
    const totalDuration = Date.now() - this.startTime;

    console.log('\n' + '═'.repeat(100));
    console.log('📊 MASTER TEST REPORT - COMPREHENSIVE TESTING SUITE');
    console.log('═'.repeat(100));

    console.log('\n📈 Test Suite Results:\n');

    for (const result of this.results) {
      const icon = result.status === 'PASS' ? '✅' : '❌';
      const statusColor = result.status === 'PASS' ? '\x1b[32m' : '\x1b[31m';
      const resetColor = '\x1b[0m';
      
      console.log(`${icon} ${result.name}`);
      console.log(`   Status: ${statusColor}${result.status}${resetColor}`);
      console.log(`   Duration: ${(result.duration / 1000).toFixed(2)}s`);
      if (result.error) {
        console.log(`   Error: ${result.error.substring(0, 200)}`);
      }
      console.log();
    }

    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.status === 'PASS').length;
    const failedTests = this.results.filter(r => r.status === 'FAIL').length;
    const errorTests = this.results.filter(r => r.status === 'ERROR').length;

    console.log('═'.repeat(100));
    console.log('📊 OVERALL SUMMARY');
    console.log('═'.repeat(100));
    console.log(`\n   Total Test Suites: ${totalTests}`);
    console.log(`   ✅ Passed: ${passedTests}`);
    console.log(`   ❌ Failed: ${failedTests}`);
    console.log(`   ⚠️  Errors: ${errorTests}`);
    console.log(`   Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log(`   Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    console.log('\n' + '═'.repeat(100));
    console.log('🎯 RECOMMENDATIONS');
    console.log('═'.repeat(100));

    const failedSuites = this.results.filter(r => r.status !== 'PASS');
    
    if (failedSuites.length === 0) {
      console.log('\n✅ ALL TEST SUITES PASSED!');
      console.log('   Your system is healthy and all features are working as expected.');
      console.log('   No issues detected across sanity checks, unit tests, and smoke tests.');
    } else {
      console.log('\n❌ Some test suites failed. Review the following:\n');
      
      failedSuites.forEach((suite, index) => {
        console.log(`${index + 1}. ${suite.name}`);
        console.log(`   Issue: ${suite.error || 'Tests failed - see detailed output above'}`);
        console.log(`   Action: Review the detailed output above and fix the identified issues`);
        console.log();
      });

      console.log('\n💡 Next Steps:');
      console.log('   1. Review the detailed error messages above');
      console.log('   2. Fix the broken/incomplete features identified');
      console.log('   3. Rerun this test suite: tsx scripts/testing/run-all-tests.ts');
      console.log('   4. Continue until all tests pass');
    }

    console.log('\n' + '═'.repeat(100));
    console.log('📝 TEST ARTIFACTS');
    console.log('═'.repeat(100));
    console.log('\n   This report has been displayed above.');
    console.log('   For detailed logs, review the individual test suite outputs.\n');

    console.log('═'.repeat(100) + '\n');

    // Exit with appropriate code
    if (failedTests > 0 || errorTests > 0) {
      console.log('❌ Test suite completed with failures\n');
      process.exit(1);
    } else {
      console.log('✅ All tests passed successfully!\n');
      process.exit(0);
    }
  }
}

// Run all tests
const runner = new MasterTestRunner();
runner.runAllTests().catch(error => {
  console.error('\n❌ Master test runner encountered an error:', error);
  process.exit(1);
});

