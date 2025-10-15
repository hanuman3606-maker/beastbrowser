/**
 * Chrome 139 Integration Test Script
 * 
 * Automated testing for Chrome 139 runtime integration
 * 
 * Usage:
 *   node test-chrome139-integration.js
 *   node test-chrome139-integration.js --quick
 *   node test-chrome139-integration.js --test=webrtc
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

// Import Chrome 139 runtime (assuming it's available)
const chrome139Runtime = require('./electron/chrome139-runtime');
const fingerprintTestSuite = require('./electron/fingerprint-test-suite');

// Test configuration
const TEST_PROFILE = {
  id: 'test-chrome139-' + Date.now(),
  userDataDir: path.join(os.homedir(), 'BeastBrowser', 'ChromeProfiles', 'test-chrome139'),
  fingerprintSeed: 123456789,
  platform: 'windows',
  platformVersion: '10.0.19045',
  brand: 'Chrome',
  brandVersion: '139.0.7258.154',
  hardwareConcurrency: 8,
  gpuVendor: 'NVIDIA Corporation',
  gpuRenderer: 'NVIDIA GeForce GTX 1060',
  timezone: 'Asia/Kolkata',
  lang: 'hi-IN',
  acceptLang: 'hi-IN,en-US',
  disableNonProxiedUdp: true,
  windowWidth: 1920,
  windowHeight: 1080,
  startUrl: 'https://example.com'
};

// Parse command line arguments
const args = process.argv.slice(2);
const isQuick = args.includes('--quick');
const specificTest = args.find(arg => arg.startsWith('--test='))?.split('=')[1];

// Test results
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📝',
    success: '✅',
    error: '❌',
    warning: '⚠️'
  }[type] || 'ℹ️';
  
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

function recordTest(name, passed, message, warning = false) {
  results.tests.push({ name, passed, message, warning });
  if (passed) {
    results.passed++;
  } else if (warning) {
    results.warnings++;
  } else {
    results.failed++;
  }
}

// Test 1: Runtime Detection
async function testRuntimeDetection() {
  log('Test 1: Runtime Detection', 'info');
  
  const runtimeInfo = chrome139Runtime.getRuntimeInfo();
  
  if (!runtimeInfo.available) {
    recordTest('Runtime Detection', false, 'Chrome 139 runtime not found');
    log('Chrome 139 not detected. Please install at C:\\Program Files\\BeastBrowser\\bin\\chrome.exe', 'error');
    return false;
  }
  
  log(`Chrome detected: v${runtimeInfo.version} at ${runtimeInfo.path}`, 'success');
  log(`Supports fingerprint: ${runtimeInfo.supportsFingerprint}`, 'info');
  log(`Supports GPU flags: ${runtimeInfo.supportsGPUFlags}`, 'info');
  
  recordTest('Runtime Detection', true, `Chrome v${runtimeInfo.version} detected`);
  return true;
}

// Test 2: Profile Launch
async function testProfileLaunch() {
  log('Test 2: Profile Launch', 'info');
  
  try {
    log('Launching test profile...', 'info');
    const result = await chrome139Runtime.launchProfile(TEST_PROFILE);
    
    if (!result.success) {
      recordTest('Profile Launch', false, result.error || 'Launch failed');
      log(`Launch failed: ${result.error}`, 'error');
      return null;
    }
    
    log(`Profile launched successfully (PID: ${result.pid})`, 'success');
    log(`Log file: ${result.logPath}`, 'info');
    
    recordTest('Profile Launch', true, `Launched with PID ${result.pid}`);
    
    // Wait for browser to stabilize
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    return result.pid;
  } catch (error) {
    recordTest('Profile Launch', false, error.message);
    log(`Launch error: ${error.message}`, 'error');
    return null;
  }
}

// Test 3: Profile Info Retrieval
async function testProfileInfo() {
  log('Test 3: Profile Info Retrieval', 'info');
  
  try {
    const info = chrome139Runtime.getProfileInfo(TEST_PROFILE.id);
    
    if (!info) {
      recordTest('Profile Info', false, 'Could not retrieve profile info');
      log('Failed to get profile info', 'error');
      return false;
    }
    
    log(`Profile info retrieved: PID=${info.pid}, Runtime=${info.runtime}ms`, 'success');
    recordTest('Profile Info', true, 'Profile info retrieved successfully');
    return true;
  } catch (error) {
    recordTest('Profile Info', false, error.message);
    log(`Error: ${error.message}`, 'error');
    return false;
  }
}

// Test 4: Active Profiles List
async function testActiveProfilesList() {
  log('Test 4: Active Profiles List', 'info');
  
  try {
    const activeProfiles = chrome139Runtime.getActiveProfiles();
    
    if (!activeProfiles.includes(TEST_PROFILE.id)) {
      recordTest('Active Profiles', false, 'Test profile not in active list');
      log('Test profile not found in active profiles', 'error');
      return false;
    }
    
    log(`Active profiles: ${activeProfiles.length}`, 'success');
    recordTest('Active Profiles', true, `Found ${activeProfiles.length} active profiles`);
    return true;
  } catch (error) {
    recordTest('Active Profiles', false, error.message);
    log(`Error: ${error.message}`, 'error');
    return false;
  }
}

// Test 5: Fingerprint Tests (if not quick mode)
async function testFingerprint() {
  if (isQuick) {
    log('Test 5: Fingerprint Tests - SKIPPED (quick mode)', 'warning');
    return true;
  }
  
  log('Test 5: Fingerprint Tests', 'info');
  
  try {
    const runtimeInfo = chrome139Runtime.getRuntimeInfo();
    
    if (specificTest) {
      log(`Running specific test: ${specificTest}`, 'info');
      const testResult = await fingerprintTestSuite.quickTest(
        specificTest,
        runtimeInfo.path,
        TEST_PROFILE.userDataDir
      );
      
      if (testResult.passed) {
        log(`${specificTest} test PASSED: ${testResult.message}`, 'success');
        recordTest(`Fingerprint: ${specificTest}`, true, testResult.message);
      } else if (testResult.warning) {
        log(`${specificTest} test WARNING: ${testResult.message}`, 'warning');
        recordTest(`Fingerprint: ${specificTest}`, false, testResult.message, true);
      } else {
        log(`${specificTest} test FAILED: ${testResult.message}`, 'error');
        recordTest(`Fingerprint: ${specificTest}`, false, testResult.message);
      }
    } else {
      log('Running full fingerprint test suite...', 'info');
      const suiteResults = await fingerprintTestSuite.runAllTests(
        runtimeInfo.path,
        TEST_PROFILE.userDataDir
      );
      
      log(`Test suite complete: ${suiteResults.summary.passed}/${suiteResults.summary.total} passed`, 'success');
      
      // Record individual test results
      for (const [testName, testResult] of Object.entries(suiteResults.tests)) {
        recordTest(
          `Fingerprint: ${testName}`,
          testResult.passed,
          testResult.message,
          testResult.warning
        );
      }
    }
    
    return true;
  } catch (error) {
    recordTest('Fingerprint Tests', false, error.message);
    log(`Error: ${error.message}`, 'error');
    return false;
  }
}

// Test 6: Profile Close
async function testProfileClose() {
  log('Test 6: Profile Close', 'info');
  
  try {
    log('Closing test profile...', 'info');
    const result = await chrome139Runtime.closeProfile(TEST_PROFILE.id);
    
    if (!result.success) {
      recordTest('Profile Close', false, result.error || 'Close failed');
      log(`Close failed: ${result.error}`, 'error');
      return false;
    }
    
    log('Profile closed successfully', 'success');
    recordTest('Profile Close', true, 'Profile closed successfully');
    
    // Verify profile is no longer active
    await new Promise(resolve => setTimeout(resolve, 2000));
    const activeProfiles = chrome139Runtime.getActiveProfiles();
    
    if (activeProfiles.includes(TEST_PROFILE.id)) {
      log('Warning: Profile still appears in active list', 'warning');
    }
    
    return true;
  } catch (error) {
    recordTest('Profile Close', false, error.message);
    log(`Error: ${error.message}`, 'error');
    return false;
  }
}

// Test 7: Cleanup
async function testCleanup() {
  log('Test 7: Cleanup', 'info');
  
  try {
    // Clean up test profile directory
    if (fs.existsSync(TEST_PROFILE.userDataDir)) {
      fs.rmSync(TEST_PROFILE.userDataDir, { recursive: true, force: true });
      log('Test profile directory cleaned up', 'success');
    }
    
    recordTest('Cleanup', true, 'Test artifacts cleaned up');
    return true;
  } catch (error) {
    recordTest('Cleanup', false, error.message);
    log(`Cleanup error: ${error.message}`, 'warning');
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('Chrome 139 Integration Test Suite');
  console.log('='.repeat(60) + '\n');
  
  log(`Mode: ${isQuick ? 'Quick' : 'Full'}`, 'info');
  if (specificTest) {
    log(`Specific test: ${specificTest}`, 'info');
  }
  console.log('');
  
  const startTime = Date.now();
  
  try {
    // Test 1: Runtime Detection
    const runtimeAvailable = await testRuntimeDetection();
    if (!runtimeAvailable) {
      log('\nCannot proceed without Chrome 139 runtime. Aborting tests.', 'error');
      printSummary();
      process.exit(1);
    }
    
    console.log('');
    
    // Test 2: Profile Launch
    const pid = await testProfileLaunch();
    if (!pid) {
      log('\nCannot proceed without successful profile launch. Aborting tests.', 'error');
      printSummary();
      process.exit(1);
    }
    
    console.log('');
    
    // Test 3: Profile Info
    await testProfileInfo();
    console.log('');
    
    // Test 4: Active Profiles
    await testActiveProfilesList();
    console.log('');
    
    // Test 5: Fingerprint Tests
    if (!isQuick || specificTest) {
      await testFingerprint();
      console.log('');
    }
    
    // Test 6: Profile Close
    await testProfileClose();
    console.log('');
    
    // Test 7: Cleanup
    await testCleanup();
    console.log('');
    
  } catch (error) {
    log(`Unexpected error: ${error.message}`, 'error');
    console.error(error.stack);
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('Test Summary');
  console.log('='.repeat(60));
  console.log(`Duration: ${duration}s`);
  console.log(`Total Tests: ${results.tests.length}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⚠️ Warnings: ${results.warnings}`);
  console.log('='.repeat(60));
  
  // Print detailed results
  console.log('\nDetailed Results:');
  console.log('-'.repeat(60));
  results.tests.forEach(test => {
    const status = test.passed ? '✅ PASS' : test.warning ? '⚠️ WARN' : '❌ FAIL';
    console.log(`${status} - ${test.name}`);
    console.log(`        ${test.message}`);
  });
  console.log('-'.repeat(60) + '\n');
  
  // Exit with appropriate code
  const exitCode = results.failed > 0 ? 1 : 0;
  process.exit(exitCode);
}

function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('Test Summary (Incomplete)');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⚠️ Warnings: ${results.warnings}`);
  console.log('='.repeat(60) + '\n');
}

// Run tests
runTests().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
