/**
 * Test Script for Proxy Tester
 * 
 * Run this to test the proxy testing functionality
 * Usage: node test.js
 */

const { testProxy, testMultipleProxies } = require('./proxyTester');

// Test proxies (replace with your own)
const TEST_PROXIES = [
  // Free public proxies for testing (may not always work)
  { host: '8.8.8.8', port: 80, type: 'http' },  // Will fail (not a proxy)
  { host: 'proxy.example.com', port: 8080, type: 'http' },  // Will fail (doesn't exist)
];

/**
 * Test single proxy
 */
async function testSingle() {
  console.log('\n🧪 ========================================');
  console.log('🧪 TEST 1: Single Proxy Test');
  console.log('🧪 ========================================\n');

  const proxy = {
    host: '8.8.8.8',
    port: 80,
    type: 'http'
  };

  try {
    const result = await testProxy(proxy);
    console.log('\n✅ Test Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('\n❌ Test Failed:', error.message);
  }
}

/**
 * Test multiple proxies
 */
async function testMultiple() {
  console.log('\n🧪 ========================================');
  console.log('🧪 TEST 2: Multiple Proxy Test');
  console.log('🧪 ========================================\n');

  try {
    const results = await testMultipleProxies(TEST_PROXIES, 2);
    console.log('\n✅ Test Results:');
    results.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.host}:${result.port}`);
      console.log(`   Status: ${result.status}`);
      if (result.status === 'working') {
        console.log(`   IP: ${result.ip}`);
        console.log(`   Latency: ${result.latency}ms`);
      } else {
        console.log(`   Error: ${result.error}`);
      }
    });
  } catch (error) {
    console.error('\n❌ Test Failed:', error.message);
  }
}

/**
 * Test with authentication
 */
async function testWithAuth() {
  console.log('\n🧪 ========================================');
  console.log('🧪 TEST 3: Proxy with Authentication');
  console.log('🧪 ========================================\n');

  const proxy = {
    host: 'proxy.example.com',
    port: 8080,
    type: 'http',
    username: 'testuser',
    password: 'testpass'
  };

  try {
    const result = await testProxy(proxy);
    console.log('\n✅ Test Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('\n❌ Test Failed:', error.message);
  }
}

/**
 * Test SOCKS5 proxy
 */
async function testSocks5() {
  console.log('\n🧪 ========================================');
  console.log('🧪 TEST 4: SOCKS5 Proxy');
  console.log('🧪 ========================================\n');

  const proxy = {
    host: 'proxy.example.com',
    port: 1080,
    type: 'socks5'
  };

  try {
    const result = await testProxy(proxy);
    console.log('\n✅ Test Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('\n❌ Test Failed:', error.message);
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('\n🚀 Starting Proxy Tester Tests...\n');

  await testSingle();
  await testMultiple();
  await testWithAuth();
  await testSocks5();

  console.log('\n✅ All tests completed!\n');
}

// Run tests
runAllTests().catch(console.error);
