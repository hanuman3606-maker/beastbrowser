#!/usr/bin/env node

/**
 * BeastBrowser Integration Test Script
 * Tests the integration between the React app and BeastBrowser server
 */

const axios = require('axios');

const BEASTBROWSER_API_URL = 'http://localhost:3000/api/v1';
const API_KEY = 'beastbrowser-dev-key';

// Create axios instance
const client = axios.create({
  baseURL: BEASTBROWSER_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY
  }
});

// Test colors
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName) {
  log(`\n${colors.bold}🧪 Testing: ${testName}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

async function testServerHealth() {
  logTest('Server Health Check');
  
  try {
    const response = await client.get('/health');
    if (response.data && response.data.status === 'healthy') {
      logSuccess('Server is healthy and running');
      logInfo(`Active profiles: ${response.data.activeProfiles || 0}`);
      logInfo(`Total profiles: ${response.data.totalProfiles || 0}`);
      return true;
    } else {
      logError('Server health check failed');
      return false;
    }
  } catch (error) {
    logError(`Server health check failed: ${error.message}`);
    return false;
  }
}

async function testProfileCreation() {
  logTest('Profile Creation');
  
  try {
    const profileData = {
      name: `Test Profile ${Date.now()}`,
      platform: 'windows',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      fingerprint_seed: 'test-seed-123'
    };
    
    const response = await client.post('/profiles/create', profileData);
    
    if (response.data && response.data.profileId) {
      logSuccess(`Profile created successfully: ${response.data.profileId}`);
      return response.data.profileId;
    } else {
      logError('Profile creation failed');
      return null;
    }
  } catch (error) {
    logError(`Profile creation failed: ${error.message}`);
    return null;
  }
}

async function testProfileListing() {
  logTest('Profile Listing');
  
  try {
    const response = await client.get('/profiles/list');
    
    if (response.data && response.data.profiles) {
      logSuccess(`Found ${response.data.profiles.length} profiles`);
      response.data.profiles.forEach(profile => {
        logInfo(`- ${profile.name} (${profile.status})`);
      });
      return response.data.profiles;
    } else {
      logError('Profile listing failed');
      return [];
    }
  } catch (error) {
    logError(`Profile listing failed: ${error.message}`);
    return [];
  }
}

async function testProfileOpening(profileId) {
  logTest('Profile Opening');
  
  try {
    const response = await client.post(`/profiles/${profileId}/open`, {
      headless: false,
      windowSize: { width: 1280, height: 720 }
    });
    
    if (response.data && response.data.browser) {
      logSuccess(`Profile opened successfully`);
      logInfo(`PID: ${response.data.browser.pid}`);
      logInfo(`WebSocket: ${response.data.browser.wsEndpoint}`);
      return true;
    } else {
      logError('Profile opening failed');
      return false;
    }
  } catch (error) {
    logError(`Profile opening failed: ${error.message}`);
    return false;
  }
}

async function testProfileClosing(profileId) {
  logTest('Profile Closing');
  
  try {
    const response = await client.post(`/profiles/${profileId}/close`);
    
    if (response.data && response.data.status) {
      logSuccess(`Profile closed successfully`);
      return true;
    } else {
      logError('Profile closing failed');
      return false;
    }
  } catch (error) {
    logError(`Profile closing failed: ${error.message}`);
    return false;
  }
}

async function testProxyValidation() {
  logTest('Proxy Validation');
  
  try {
    const proxyData = {
      type: 'http',
      host: '127.0.0.1',
      port: 8080
    };
    
    const response = await client.post('/proxy/validate', proxyData);
    
    if (response.data) {
      if (response.data.valid) {
        logSuccess('Proxy validation successful');
        logInfo(`IP: ${response.data.ip}`);
        logInfo(`Latency: ${response.data.latency}ms`);
      } else {
        logWarning('Proxy validation failed (expected for localhost:8080)');
      }
      return true;
    } else {
      logError('Proxy validation failed');
      return false;
    }
  } catch (error) {
    logError(`Proxy validation failed: ${error.message}`);
    return false;
  }
}

async function testAutomation() {
  logTest('Automation Engine');
  
  try {
    // First create a test profile
    const profileData = {
      name: `Automation Test ${Date.now()}`,
      platform: 'windows'
    };
    
    const createResponse = await client.post('/profiles/create', profileData);
    if (!createResponse.data || !createResponse.data.profileId) {
      logError('Failed to create test profile for automation');
      return false;
    }
    
    const profileId = createResponse.data.profileId;
    
    // Test automation tasks
    const automationData = {
      profileId: profileId,
      tasks: [
        {
          type: 'open_url',
          url: 'https://example.com',
          wait: 3
        },
        {
          type: 'wait',
          wait: 2
        }
      ],
      concurrency: 1,
      stopOnProxyExhaust: true
    };
    
    const response = await client.post('/automation/run', automationData);
    
    if (response.data && response.data.runId) {
      logSuccess(`Automation started successfully`);
      logInfo(`Run ID: ${response.data.runId}`);
      
      // Wait a bit and check status
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const statusResponse = await client.get(`/automation/${response.data.runId}/status`);
      if (statusResponse.data) {
        logInfo(`Status: ${statusResponse.data.status}`);
        logInfo(`Progress: ${statusResponse.data.progress.completedTasks}/${statusResponse.data.progress.totalTasks}`);
      }
      
      // Clean up - delete the test profile
      await client.delete(`/profiles/${profileId}`);
      
      return true;
    } else {
      logError('Automation start failed');
      return false;
    }
  } catch (error) {
    logError(`Automation test failed: ${error.message}`);
    return false;
  }
}

async function testUserAgents() {
  logTest('User Agent Management');
  
  try {
    const response = await client.get('/useragents/list?platform=windows&limit=5');
    
    if (response.data && response.data.userAgents) {
      logSuccess(`Found ${response.data.userAgents.length} Windows user agents`);
      response.data.userAgents.slice(0, 2).forEach((ua, index) => {
        logInfo(`${index + 1}. ${ua.substring(0, 80)}...`);
      });
      return true;
    } else {
      logError('User agent listing failed');
      return false;
    }
  } catch (error) {
    logError(`User agent test failed: ${error.message}`);
    return false;
  }
}

async function testFingerprintGeneration() {
  logTest('Fingerprint Generation');
  
  try {
    const response = await client.post('/fingerprint/generate', {
      platform: 'windows',
      strength: 'medium'
    });
    
    if (response.data && response.data.fingerprint) {
      logSuccess('Fingerprint generated successfully');
      logInfo(`Screen: ${response.data.fingerprint.screen.width}x${response.data.fingerprint.screen.height}`);
      logInfo(`Languages: ${response.data.fingerprint.languages.join(', ')}`);
      return true;
    } else {
      logError('Fingerprint generation failed');
      return false;
    }
  } catch (error) {
    logError(`Fingerprint test failed: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  log(`${colors.bold}🚀 Starting BeastBrowser Integration Tests${colors.reset}`);
  log(`API URL: ${BEASTBROWSER_API_URL}`);
  log(`API Key: ${API_KEY}`);
  
  const results = {
    health: false,
    profileCreation: false,
    profileListing: false,
    profileOpening: false,
    profileClosing: false,
    proxyValidation: false,
    automation: false,
    userAgents: false,
    fingerprint: false
  };
  
  // Test 1: Server Health
  results.health = await testServerHealth();
  if (!results.health) {
    logError('Server is not running. Please start the BeastBrowser server first.');
    logInfo('Run: npm start (in the BeastBrowser server directory)');
    return;
  }
  
  // Test 2: Profile Creation
  const profileId = await testProfileCreation();
  results.profileCreation = profileId !== null;
  
  // Test 3: Profile Listing
  results.profileListing = await testProfileListing();
  
  // Test 4: Profile Opening (if profile was created)
  if (profileId) {
    results.profileOpening = await testProfileOpening(profileId);
    
    // Test 5: Profile Closing
    results.profileClosing = await testProfileClosing(profileId);
    
    // Clean up - delete the test profile
    try {
      await client.delete(`/profiles/${profileId}`);
      logInfo('Test profile cleaned up');
    } catch (error) {
      logWarning(`Failed to clean up test profile: ${error.message}`);
    }
  }
  
  // Test 6: Proxy Validation
  results.proxyValidation = await testProxyValidation();
  
  // Test 7: Automation
  results.automation = await testAutomation();
  
  // Test 8: User Agents
  results.userAgents = await testUserAgents();
  
  // Test 9: Fingerprint Generation
  results.fingerprint = await testFingerprintGeneration();
  
  // Summary
  log(`\n${colors.bold}📊 Test Results Summary:${colors.reset}`);
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const color = passed ? 'green' : 'red';
    log(`${status} ${test}`, color);
  });
  
  log(`\n${colors.bold}Overall: ${passedTests}/${totalTests} tests passed${colors.reset}`);
  
  if (passedTests === totalTests) {
    logSuccess('🎉 All tests passed! BeastBrowser integration is working correctly.');
  } else {
    logWarning(`⚠️  ${totalTests - passedTests} tests failed. Please check the BeastBrowser server.`);
  }
  
  return results;
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    logError(`Test runner failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testServerHealth,
  testProfileCreation,
  testProfileListing,
  testProfileOpening,
  testProfileClosing,
  testProxyValidation,
  testAutomation,
  testUserAgents,
  testFingerprintGeneration
};
