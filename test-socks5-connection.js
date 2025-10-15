/**
 * SOCKS5 Connection Test Script
 * 
 * This script tests SOCKS5 proxy connectivity independently of the main application
 * to help diagnose connection issues.
 */

const socks5Handler = require('./electron/socks5-handler');

// Example SOCKS5 configuration - replace with your actual proxy details
const testProxy = {
  host: 'your-socks5-host.com', // Replace with your SOCKS5 host
  port: 1080,                   // Replace with your SOCKS5 port
  username: 'your-username',    // Optional: Replace if authentication required
  password: 'your-password'     // Optional: Replace if authentication required
};

async function testSocks5Connection() {
  console.log('🧪 SOCKS5 Connection Test');
  console.log('========================');
  
  try {
    // Test the connection
    const result = await socks5Handler.testSocks5Connection(testProxy);
    
    if (result.success) {
      console.log('✅ SOCKS5 Connection Test PASSED');
      console.log('   IP:', result.ip);
      console.log('   Country:', result.country);
      console.log('   City:', result.city);
      console.log('   Timezone:', result.timezone);
    } else {
      console.log('❌ SOCKS5 Connection Test FAILED');
      console.log('   Error:', result.error);
      console.log('   Message:', result.message);
    }
  } catch (error) {
    console.error('❌ SOCKS5 Connection Test ERROR:', error.message);
    console.error('   Stack:', error.stack);
  }
  
  console.log('\n📝 Instructions:');
  console.log('1. Edit this file to add your actual SOCKS5 proxy details');
  console.log('2. Run with: node test-socks5-connection.js');
  console.log('3. Check the output for connection status');
}

// Run the test if this file is executed directly
if (require.main === module) {
  testSocks5Connection();
}

module.exports = { testSocks5Connection };