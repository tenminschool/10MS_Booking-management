#!/usr/bin/env node
/**
 * Quick validation script to test our fixes
 */

const { spawn } = require('child_process');

console.log('🔧 Testing fixes for Task 19 E2E testing...');
console.log('=' .repeat(50));

async function testFrontendUIScript() {
  console.log('\n📱 Testing Frontend UI script syntax...');
  
  return new Promise((resolve) => {
    const process = spawn('npx', ['tsx', '--check', 'frontend/src/tests/end-to-end-ui-test.ts'], {
      stdio: 'pipe'
    });
    
    let output = '';
    let error = '';
    
    process.stdout?.on('data', (data) => {
      output += data.toString();
    });
    
    process.stderr?.on('data', (data) => {
      error += data.toString();
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        console.log('   ✅ Frontend UI script syntax is valid');
        resolve(true);
      } else {
        console.log('   ❌ Frontend UI script has syntax errors:');
        console.log('   ', error);
        resolve(false);
      }
    });
  });
}

async function testBackendScript() {
  console.log('\n🔧 Testing Backend integration script syntax...');
  
  return new Promise((resolve) => {
    const process = spawn('npx', ['tsx', '--check', 'backend/src/end-to-end-comprehensive-test.ts'], {
      stdio: 'pipe'
    });
    
    let output = '';
    let error = '';
    
    process.stdout?.on('data', (data) => {
      output += data.toString();
    });
    
    process.stderr?.on('data', (data) => {
      error += data.toString();
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        console.log('   ✅ Backend integration script syntax is valid');
        resolve(true);
      } else {
        console.log('   ❌ Backend integration script has syntax errors:');
        console.log('   ', error);
        resolve(false);
      }
    });
  });
}

async function testPackageScripts() {
  console.log('\n📦 Testing package.json scripts...');
  
  const fs = require('fs');
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const backendPackageJson = JSON.parse(fs.readFileSync('backend/package.json', 'utf8'));
  
  const requiredRootScripts = ['test:e2e', 'test:e2e:backend', 'test:e2e:frontend'];
  const requiredBackendScripts = ['test:cleanup'];
  
  let allScriptsValid = true;
  
  requiredRootScripts.forEach(script => {
    if (packageJson.scripts[script]) {
      console.log(`   ✅ Root script '${script}' exists`);
    } else {
      console.log(`   ❌ Root script '${script}' missing`);
      allScriptsValid = false;
    }
  });
  
  requiredBackendScripts.forEach(script => {
    if (backendPackageJson.scripts[script]) {
      console.log(`   ✅ Backend script '${script}' exists`);
    } else {
      console.log(`   ❌ Backend script '${script}' missing`);
      allScriptsValid = false;
    }
  });
  
  return allScriptsValid;
}

async function main() {
  const frontendValid = await testFrontendUIScript();
  const backendValid = await testBackendScript();
  const scriptsValid = await testPackageScripts();
  
  console.log('\n' + '=' .repeat(50));
  console.log('📊 VALIDATION RESULTS:');
  console.log(`Frontend UI Script: ${frontendValid ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Backend Integration Script: ${backendValid ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Package Scripts: ${scriptsValid ? '✅ PASS' : '❌ FAIL'}`);
  
  const allValid = frontendValid && backendValid && scriptsValid;
  console.log(`Overall Status: ${allValid ? '✅ ALL FIXES APPLIED' : '❌ ISSUES REMAIN'}`);
  
  if (allValid) {
    console.log('\n🎉 All fixes have been applied successfully!');
    console.log('You can now run: npm run test:e2e');
  } else {
    console.log('\n⚠️  Some issues remain. Please check the errors above.');
  }
  
  console.log('=' .repeat(50));
}

main().catch(console.error);