#!/usr/bin/env tsx
// Verification script to ensure comprehensive test suite is properly set up
import fs from 'fs';
import path from 'path';

interface TestFile {
  name: string;
  path: string;
  exists: boolean;
  hasExport: boolean;
}

class TestSetupVerifier {
  private testFiles: TestFile[] = [
    { name: 'Test Setup', path: 'src/tests/setup.ts', exists: false, hasExport: false },
    { name: 'Booking Integration Tests', path: 'src/tests/integration-booking.test.ts', exists: false, hasExport: false },
    { name: 'Auth Integration Tests', path: 'src/tests/integration-auth.test.ts', exists: false, hasExport: false },
    { name: 'Assessment Integration Tests', path: 'src/tests/integration-assessment.test.ts', exists: false, hasExport: false },
    { name: 'Notification Integration Tests', path: 'src/tests/integration-notifications.test.ts', exists: false, hasExport: false },
    { name: 'Audit Integration Tests', path: 'src/tests/integration-audit.test.ts', exists: false, hasExport: false },
    { name: 'Mobile & Isolation Tests', path: 'src/tests/integration-mobile-isolation.test.ts', exists: false, hasExport: false },
    { name: 'Comprehensive Test Suite', path: 'src/tests/comprehensive-test-suite.ts', exists: false, hasExport: false },
    { name: 'Individual Test Runner', path: 'src/tests/run-individual-tests.ts', exists: false, hasExport: false },
    { name: 'Main Test Runner', path: 'src/run-comprehensive-tests.ts', exists: false, hasExport: false }
  ];

  async verifySetup(): Promise<void> {
    console.log('🔍 Verifying Comprehensive Test Suite Setup...\n');

    // Check file existence
    for (const testFile of this.testFiles) {
      testFile.exists = fs.existsSync(testFile.path);
      
      if (testFile.exists) {
        try {
          const content = fs.readFileSync(testFile.path, 'utf-8');
          testFile.hasExport = content.includes('export') || content.includes('module.exports');
        } catch (error) {
          testFile.hasExport = false;
        }
      }
    }

    // Generate report
    this.generateReport();
  }

  private generateReport(): void {
    console.log('📊 TEST SETUP VERIFICATION REPORT');
    console.log('=' .repeat(50));
    console.log();

    const existingFiles = this.testFiles.filter(f => f.exists).length;
    const totalFiles = this.testFiles.length;
    const filesWithExports = this.testFiles.filter(f => f.hasExport).length;

    console.log('📈 Overall Status:');
    console.log(`   Files Created: ${existingFiles}/${totalFiles} (${((existingFiles/totalFiles)*100).toFixed(1)}%)`);
    console.log(`   Files with Exports: ${filesWithExports}/${existingFiles}`);
    console.log();

    console.log('📋 File Status:');
    this.testFiles.forEach(file => {
      const existsStatus = file.exists ? '✅' : '❌';
      const exportStatus = file.hasExport ? '📤' : '📭';
      console.log(`   ${existsStatus} ${exportStatus} ${file.name}`);
      if (!file.exists) {
        console.log(`      Missing: ${file.path}`);
      }
    });
    console.log();

    // Check package.json scripts
    console.log('📦 Package.json Scripts:');
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
      const testScripts = Object.keys(packageJson.scripts || {}).filter(script => script.startsWith('test:'));
      
      if (testScripts.length > 0) {
        console.log('   ✅ Test scripts found:');
        testScripts.forEach(script => {
          console.log(`      • ${script}: ${packageJson.scripts[script]}`);
        });
      } else {
        console.log('   ❌ No test scripts found in package.json');
      }
    } catch (error) {
      console.log('   ❌ Could not read package.json');
    }
    console.log();

    // Check dependencies
    console.log('📚 Test Dependencies:');
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
      const testDeps = ['supertest', '@types/supertest'];
      
      testDeps.forEach(dep => {
        const hasDevDep = packageJson.devDependencies?.[dep];
        const hasDep = packageJson.dependencies?.[dep];
        const status = (hasDevDep || hasDep) ? '✅' : '❌';
        console.log(`   ${status} ${dep}`);
      });
    } catch (error) {
      console.log('   ❌ Could not check dependencies');
    }
    console.log();

    // Recommendations
    console.log('📝 Next Steps:');
    if (existingFiles === totalFiles) {
      console.log('   ✅ All test files are created');
      console.log('   🚀 Ready to run comprehensive tests with: npm run test:comprehensive');
      console.log('   📱 Consider running individual test suites for debugging');
      console.log('   🔧 Ensure database is running before executing tests');
    } else {
      console.log('   ❌ Some test files are missing - check the file status above');
      console.log('   📝 Create missing files before running tests');
    }
    
    console.log();
    console.log('🧪 Test Suite Components:');
    console.log('   • Cross-branch booking flow validation');
    console.log('   • Authentication system testing (phone + email)');
    console.log('   • Assessment recording and CSV import validation');
    console.log('   • Multi-channel notification system testing');
    console.log('   • Audit logging and system settings validation');
    console.log('   • Mobile responsiveness and data isolation testing');
    console.log();
    console.log('=' .repeat(50));
  }
}

// Run verification
async function main(): Promise<void> {
  const verifier = new TestSetupVerifier();
  await verifier.verifySetup();
}

if (require.main === module) {
  main().catch(console.error);
}

export default TestSetupVerifier;