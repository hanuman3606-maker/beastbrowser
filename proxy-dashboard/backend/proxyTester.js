/**
 * Proxy Tester Module
 * 
 * Tests HTTP, HTTPS, SOCKS4, and SOCKS5 proxies by making real network requests
 * Returns proxy status, detected IP, latency, and error details
 * 
 * Supports:
 * - HTTP/HTTPS proxies (with authentication)
 * - SOCKS4/SOCKS5 proxies (with authentication)
 * - Concurrent testing with timeout handling
 * - Detailed error messages
 * 
 * @author Beast Browser Team
 */

const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');
const dns = require('dns').promises;

/**
 * Test endpoints to verify proxy functionality
 * These services return the IP address seen by the server
 */
const TEST_ENDPOINTS = [
  'https://api.ipify.org?format=json',  // Primary - returns JSON: {"ip": "1.2.3.4"}
  'https://ifconfig.me/ip',              // Backup - returns plain text IP
  'https://api.my-ip.io/ip',             // Backup - returns plain text IP
  'https://checkip.amazonaws.com'        // Backup - returns plain text IP
];

/**
 * Configuration
 */
const CONFIG = {
  TIMEOUT: 10000,           // 10 seconds max per test
  MAX_RETRIES: 2,           // Retry failed tests
  DNS_TIMEOUT: 3000,        // DNS resolution timeout
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

/**
 * Parse proxy URL and extract components
 * Supports formats:
 * - http://host:port
 * - http://user:pass@host:port
 * - socks5://host:port
 * - host:port (defaults to HTTP)
 */
function parseProxyUrl(proxyString, type = 'http') {
  try {
    // Add protocol if missing
    if (!proxyString.includes('://')) {
      proxyString = `${type}://${proxyString}`;
    }

    const url = new URL(proxyString);
    
    return {
      protocol: url.protocol.replace(':', ''),
      host: url.hostname,
      port: parseInt(url.port) || getDefaultPort(url.protocol),
      username: url.username || null,
      password: url.password || null,
      auth: url.username ? `${url.username}:${url.password}` : null
    };
  } catch (error) {
    throw new Error(`Invalid proxy format: ${error.message}`);
  }
}

/**
 * Get default port for proxy type
 */
function getDefaultPort(protocol) {
  const defaults = {
    'http:': 80,
    'https:': 443,
    'socks4:': 1080,
    'socks5:': 1080
  };
  return defaults[protocol] || 8080;
}

/**
 * Create proxy agent based on type
 */
function createProxyAgent(proxyConfig, type) {
  const { protocol, host, port, username, password } = proxyConfig;
  
  // Build proxy URL
  let proxyUrl;
  if (username && password) {
    proxyUrl = `${protocol}://${username}:${password}@${host}:${port}`;
  } else {
    proxyUrl = `${protocol}://${host}:${port}`;
  }

  console.log(`🔧 Creating ${type.toUpperCase()} proxy agent: ${host}:${port}`);

  // Create appropriate agent based on type
  if (type === 'socks4' || type === 'socks5') {
    return new SocksProxyAgent(proxyUrl);
  } else {
    // HTTP/HTTPS
    return new HttpsProxyAgent(proxyUrl);
  }
}

/**
 * Verify DNS resolution for proxy host
 */
async function verifyDNS(host) {
  try {
    const startTime = Date.now();
    await dns.lookup(host);
    const dnsTime = Date.now() - startTime;
    console.log(`✅ DNS resolved for ${host} in ${dnsTime}ms`);
    return { success: true, time: dnsTime };
  } catch (error) {
    console.error(`❌ DNS resolution failed for ${host}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Make HTTP request through proxy
 */
async function makeProxyRequest(agent, endpoint, timeout) {
  const startTime = Date.now();
  
  try {
    const response = await axios.get(endpoint, {
      httpAgent: agent,
      httpsAgent: agent,
      timeout: timeout,
      headers: {
        'User-Agent': CONFIG.USER_AGENT,
        'Accept': 'application/json, text/plain, */*'
      },
      validateStatus: (status) => status === 200
    });

    const latency = Date.now() - startTime;
    
    // Extract IP from response
    let detectedIp = null;
    if (typeof response.data === 'object' && response.data.ip) {
      detectedIp = response.data.ip;
    } else if (typeof response.data === 'string') {
      detectedIp = response.data.trim();
    }

    return {
      success: true,
      ip: detectedIp,
      latency,
      endpoint
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    throw {
      success: false,
      latency,
      error: error.message,
      code: error.code
    };
  }
}

/**
 * Test proxy with retry logic
 */
async function testProxyWithRetry(agent, retries = CONFIG.MAX_RETRIES) {
  let lastError = null;
  
  // Try each endpoint
  for (const endpoint of TEST_ENDPOINTS) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        console.log(`🔄 Testing endpoint: ${endpoint} (attempt ${attempt + 1}/${retries + 1})`);
        const result = await makeProxyRequest(agent, endpoint, CONFIG.TIMEOUT);
        console.log(`✅ Success! IP: ${result.ip}, Latency: ${result.latency}ms`);
        return result;
      } catch (error) {
        lastError = error;
        console.log(`⚠️ Attempt ${attempt + 1} failed: ${error.error}`);
        
        // Don't retry on auth errors or connection refused
        if (error.code === 'ECONNREFUSED' || error.code === 'ERR_PROXY_AUTH_FAILED') {
          break;
        }
        
        // Wait before retry (exponential backoff)
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }
  }
  
  // All attempts failed
  throw lastError;
}

/**
 * Main proxy test function
 * 
 * @param {Object} proxyData - Proxy configuration
 * @param {string} proxyData.host - Proxy host/IP
 * @param {number} proxyData.port - Proxy port
 * @param {string} proxyData.type - Proxy type (http/https/socks4/socks5)
 * @param {string} proxyData.username - Optional username
 * @param {string} proxyData.password - Optional password
 * 
 * @returns {Object} Test result with status, IP, latency, and error details
 */
async function testProxy(proxyData) {
  const startTime = Date.now();
  const { host, port, type = 'http', username, password } = proxyData;

  console.log('\n🧪 ========================================');
  console.log(`🧪 Testing Proxy: ${host}:${port} (${type.toUpperCase()})`);
  console.log('🧪 ========================================');

  try {
    // Validate input
    if (!host || !port) {
      throw new Error('Host and port are required');
    }

    // Normalize proxy type
    const proxyType = type.toLowerCase();
    if (!['http', 'https', 'socks4', 'socks5'].includes(proxyType)) {
      throw new Error(`Unsupported proxy type: ${type}`);
    }

    // Step 1: Verify DNS resolution
    console.log('📡 Step 1: Verifying DNS resolution...');
    const dnsResult = await Promise.race([
      verifyDNS(host),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('DNS timeout')), CONFIG.DNS_TIMEOUT)
      )
    ]);

    if (!dnsResult.success) {
      return {
        status: 'failed',
        error: `DNS resolution failed: ${dnsResult.error}`,
        errorType: 'dns_error',
        host,
        port,
        type: proxyType,
        totalTime: Date.now() - startTime
      };
    }

    // Step 2: Create proxy configuration
    console.log('🔧 Step 2: Creating proxy configuration...');
    const proxyConfig = {
      protocol: proxyType,
      host,
      port: parseInt(port),
      username,
      password
    };

    // Step 3: Create proxy agent
    console.log('🔌 Step 3: Creating proxy agent...');
    const agent = createProxyAgent(proxyConfig, proxyType);

    // Step 4: Test proxy with retry
    console.log('🚀 Step 4: Testing proxy connection...');
    const testResult = await testProxyWithRetry(agent);

    // Success!
    const totalTime = Date.now() - startTime;
    console.log(`✅ Proxy test SUCCESSFUL in ${totalTime}ms`);
    console.log(`📍 Detected IP: ${testResult.ip}`);
    console.log(`⚡ Latency: ${testResult.latency}ms`);

    return {
      status: 'working',
      ip: testResult.ip,
      latency: testResult.latency,
      totalTime,
      host,
      port,
      type: proxyType,
      endpoint: testResult.endpoint
    };

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ Proxy test FAILED in ${totalTime}ms`);
    console.error(`❌ Error: ${error.error || error.message}`);

    // Categorize error
    let errorType = 'unknown_error';
    let errorMessage = error.error || error.message;

    if (error.code === 'ECONNREFUSED') {
      errorType = 'connection_refused';
      errorMessage = 'Connection refused - proxy not responding';
    } else if (error.code === 'ETIMEDOUT' || errorMessage.includes('timeout')) {
      errorType = 'timeout';
      errorMessage = 'Connection timeout - proxy too slow or unreachable';
    } else if (error.code === 'ENOTFOUND') {
      errorType = 'host_not_found';
      errorMessage = 'Host not found - invalid proxy address';
    } else if (error.code === 'ERR_PROXY_AUTH_FAILED' || errorMessage.includes('auth')) {
      errorType = 'auth_failed';
      errorMessage = 'Authentication failed - invalid username/password';
    } else if (errorMessage.includes('DNS')) {
      errorType = 'dns_error';
    }

    return {
      status: 'failed',
      error: errorMessage,
      errorType,
      latency: error.latency || totalTime,
      totalTime,
      host,
      port,
      type: type.toLowerCase()
    };
  }
}

/**
 * Test multiple proxies concurrently
 * 
 * @param {Array} proxies - Array of proxy configurations
 * @param {number} concurrency - Max concurrent tests (default: 5)
 * 
 * @returns {Array} Array of test results
 */
async function testMultipleProxies(proxies, concurrency = 5) {
  console.log(`\n🚀 Testing ${proxies.length} proxies with concurrency: ${concurrency}`);
  
  const results = [];
  const queue = [...proxies];
  const inProgress = new Set();

  while (queue.length > 0 || inProgress.size > 0) {
    // Start new tests up to concurrency limit
    while (inProgress.size < concurrency && queue.length > 0) {
      const proxy = queue.shift();
      const promise = testProxy(proxy)
        .then(result => {
          results.push(result);
          inProgress.delete(promise);
        })
        .catch(error => {
          results.push({
            status: 'failed',
            error: error.message,
            ...proxy
          });
          inProgress.delete(promise);
        });
      
      inProgress.add(promise);
    }

    // Wait for at least one to complete
    if (inProgress.size > 0) {
      await Promise.race(inProgress);
    }
  }

  console.log(`\n✅ Completed testing ${proxies.length} proxies`);
  console.log(`✅ Working: ${results.filter(r => r.status === 'working').length}`);
  console.log(`❌ Failed: ${results.filter(r => r.status === 'failed').length}`);

  return results;
}

module.exports = {
  testProxy,
  testMultipleProxies,
  parseProxyUrl
};
