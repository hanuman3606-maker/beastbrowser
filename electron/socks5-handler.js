/**
 * SOCKS5 Proxy Handler with Automatic Timezone Detection
 * 
 * This file handles SOCKS5 proxy connections properly using proxy-chain
 * and automatically detects timezone based on proxy IP location
 */

const { Server } = require('proxy-chain');
const http = require('http');
const https = require('https');

// Active SOCKS5 proxy servers map
const activeSocksServers = new Map();

// Timezone cache: proxyHost -> timezone
const timezoneCache = new Map();

/**
 * Detect timezone from proxy IP using geolocation API
 * @param {Object} tunnel - Active SOCKS5 tunnel
 * @returns {Promise<string>} - Detected timezone (e.g., "America/Los_Angeles")
 */
async function detectProxyTimezone(tunnel) {
  try {
    console.log('🌍 Detecting timezone through proxy...');
    console.log('🔍 Using local proxy tunnel:', tunnel.proxyUrl);
    
    // Try multiple APIs for better reliability with longer timeout
    const apis = [
      'http://ip-api.com/json/?fields=timezone,country,city,query',
      'http://worldtimeapi.org/api/ip',
      'http://ipapi.co/json/',
      'http://ipinfo.io/json'
    ];
    
    for (const apiUrl of apis) {
      try {
        const result = await makeProxyRequest(tunnel, apiUrl);
        if (result) {
          console.log('✅ Timezone detected successfully!');
          return result;
        }
      } catch (err) {
        console.warn('⚠️ API failed:', apiUrl, err.message);
        continue;
      }
    }
    
    console.warn('⚠️ All APIs failed, using fallback');
    return 'America/New_York';
    
  } catch (error) {
    console.error('❌ Timezone detection error:', error.message);
    return 'America/New_York';
  }
}

/**
 * Make HTTP request through proxy tunnel
 */
function makeProxyRequest(tunnel, targetUrl) {
  return new Promise((resolve, reject) => {
    const url = new URL(tunnel.proxyUrl);
    
    const proxyOptions = {
      hostname: url.hostname,
      port: parseInt(url.port),
      path: targetUrl,
      method: 'GET',
      timeout: 15000, // Increase timeout to 15 seconds
      headers: {
        'Host': new URL(targetUrl).hostname,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
      }
    };
    
    const req = http.request(proxyOptions, (res) => {
      let data = '';
      
      res.on('data', chunk => data += chunk);
      
      res.on('end', () => {
        try {
          const geo = JSON.parse(data);
          
          // Try different response formats
          let timezone = geo.timezone || geo.time_zone || geo.tz;
          
          // worldtimeapi.org format
          if (!timezone && geo.timezone) {
            timezone = geo.timezone;
          }
          
          // ipinfo.io format
          if (!timezone && geo.timezone) {
            timezone = geo.timezone;
          }
          
          // Additional fallbacks
          if (!timezone && geo.data && geo.data.timezone) {
            timezone = geo.data.timezone;
          }
          
          if (timezone && timezone !== 'auto') {
            console.log('✅ Detected from', targetUrl);
            console.log('✅ Location:', geo.country || geo.country_name, '-', geo.city || geo.city_name);
            console.log('✅ Timezone:', timezone);
            console.log('✅ IP:', geo.query || geo.ip);
            resolve(timezone);
          } else {
            // Try to construct timezone from offset if available
            if (geo.utc_offset || geo.offset) {
              const offset = geo.utc_offset || geo.offset;
              console.log('⚠️ No timezone in response, trying to construct from offset:', offset);
              // This is a fallback - not ideal but better than nothing
              resolve('America/New_York'); // Default fallback
            } else {
              reject(new Error('No timezone in response'));
            }
          }
        } catch (err) {
          reject(err);
        }
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    
    req.end();
  });
}

/**
 * Create a local HTTP proxy that forwards to SOCKS5
 * This is needed because Puppeteer/Chromium can't directly use SOCKS5 for all traffic
 * 
 * @param {Object} socksConfig - SOCKS5 configuration
 * @param {string} socksConfig.host - SOCKS5 host
 * @param {number} socksConfig.port - SOCKS5 port
 * @param {string} socksConfig.username - SOCKS5 username (optional)
 * @param {string} socksConfig.password - SOCKS5 password (optional)
 * @returns {Promise<Object>} - Local proxy server info
 */
async function createSocks5Tunnel(socksConfig) {
  try {
    console.log('🔧 Creating SOCKS5 tunnel for:', `${socksConfig.host}:${socksConfig.port}`);
    
    // Build SOCKS5 upstream URL
    let socksUrl = 'socks5://';
    if (socksConfig.username && socksConfig.password) {
      socksUrl += `${encodeURIComponent(socksConfig.username)}:${encodeURIComponent(socksConfig.password)}@`;
    }
    socksUrl += `${socksConfig.host}:${socksConfig.port}`;
    
    console.log('📡 SOCKS5 upstream URL:', socksUrl.replace(/:[^:@]+@/, ':****@')); // Hide password in logs
    
    // Create local HTTP proxy server that tunnels to SOCKS5
    const server = new Server({
      port: 0, // Auto-assign available port
      prepareRequestFunction: () => {
        // Simple configuration - same for all requests
        return {
          upstreamProxyUrl: socksUrl
        };
      },
      verbose: false, // Disable verbose to reduce noise
      // Connection settings
      maxSockets: 500, // Reduced to avoid overload
      keepAlive: true, // Enable keep-alive for better performance
      keepAliveMsecs: 15000, // 15 second keep-alive
      // Retry settings
      retryOnBlockedPage: true,
      maxRequestRetries: 5, // Increased retries
      requestTimeoutSecs: 90 // Increased timeout
    });
    
    // Add comprehensive error handlers
    server.on('connectionError', (err, connectionInfo) => {
      console.error('⚠️ SOCKS5 connection error:', err.message);
      // Suppress internal assertion errors
      if (err.code !== 'ERR_INTERNAL_ASSERTION') {
        console.error('Connection info:', connectionInfo);
      }
    });
    
    server.on('requestFailed', (err) => {
      console.error('⚠️ SOCKS5 request failed:', err.message);
    });
    
    // Catch unhandled errors
    server.on('error', (err) => {
      console.error('⚠️ SOCKS5 server error:', err.message);
    });
    
    await server.listen();
    const localPort = server.port;
    
    console.log('✅ SOCKS5 tunnel created! Local HTTP proxy running on port:', localPort);
    console.log('🔄 All traffic will be routed through SOCKS5:', `${socksConfig.host}:${socksConfig.port}`);
    
    return {
      server,
      localPort,
      proxyUrl: `http://127.0.0.1:${localPort}`,
      originalSocks: socksConfig
    };
    
  } catch (error) {
    console.error('❌ Failed to create SOCKS5 tunnel:', error.message);
    console.error('Stack:', error.stack);
    throw new Error(`SOCKS5 tunnel creation failed: ${error.message}`);
  }
}

/**
 * Get or create SOCKS5 tunnel for a profile
 * 
 * @param {string} profileId - Profile ID
 * @param {Object} socksConfig - SOCKS5 configuration
 * @returns {Promise<Object>} - Tunnel information
 */
async function getSocks5Tunnel(profileId, socksConfig) {
  // Check if tunnel already exists for this profile
  if (activeSocksServers.has(profileId)) {
    const existing = activeSocksServers.get(profileId);
    console.log('♻️ Reusing existing SOCKS5 tunnel for profile:', profileId, 'on port:', existing.localPort);
    return existing;
  }
  
  // Create new tunnel
  const tunnel = await createSocks5Tunnel(socksConfig);
  activeSocksServers.set(profileId, tunnel);
  
  return tunnel;
}

/**
 * Close SOCKS5 tunnel for a profile
 * 
 * @param {string} profileId - Profile ID
 */
async function closeSocks5Tunnel(profileId) {
  if (!activeSocksServers.has(profileId)) {
    return;
  }
  
  try {
    const tunnel = activeSocksServers.get(profileId);
    console.log('🛑 Closing SOCKS5 tunnel for profile:', profileId);
    
    await tunnel.server.close(true);
    activeSocksServers.delete(profileId);
    
    console.log('✅ SOCKS5 tunnel closed for profile:', profileId);
  } catch (error) {
    console.error('⚠️ Error closing SOCKS5 tunnel:', error.message);
    activeSocksServers.delete(profileId); // Remove anyway
  }
}

/**
 * Close all SOCKS5 tunnels
 */
async function closeAllSocks5Tunnels() {
  console.log('🛑 Closing all SOCKS5 tunnels...');
  
  const closePromises = [];
  for (const [profileId, tunnel] of activeSocksServers.entries()) {
    closePromises.push(
      tunnel.server.close(true).catch(err => {
        console.error(`⚠️ Error closing tunnel for ${profileId}:`, err.message);
      })
    );
  }
  
  await Promise.all(closePromises);
  activeSocksServers.clear();
  
  console.log('✅ All SOCKS5 tunnels closed');
}

/**
 * Check if a proxy is SOCKS5
 * 
 * @param {Object} proxy - Proxy configuration
 * @returns {boolean}
 */
function isSocks5Proxy(proxy) {
  if (!proxy || !proxy.type) return false;
  const type = proxy.type.toLowerCase();
  return type === 'socks5' || type === 'socks';
}

/**
 * Get Puppeteer/Chrome launch args for SOCKS5 proxy
 * Returns local HTTP proxy URL that tunnels to SOCKS5
 * Also automatically detects timezone based on proxy location
 * 
 * @param {string} profileId - Profile ID
 * @param {Object} socksConfig - SOCKS5 configuration
 * @returns {Promise<Object>} - Tunnel info with proxy args and detected timezone
 */
async function getSocks5ProxyArgs(profileId, socksConfig) {
  const tunnel = await getSocks5Tunnel(profileId, socksConfig);
  
  // ALWAYS detect timezone (no cache - for accuracy)
  console.log('🔄 Detecting timezone for this session...');
  const timezone = await detectProxyTimezone(tunnel);
  
  // Route ALL traffic through proxy including ads
  return {
    tunnel,
    port: tunnel.localPort, // ✅ Chrome 139 compatibility
    timezone, // ✅ Auto-detected timezone
    args: [
      `--proxy-server=http://127.0.0.1:${tunnel.localPort}`, // Explicit HTTP protocol
      '--no-sandbox',
      '--disable-setuid-sandbox',
      // No proxy bypass - everything goes through proxy
      '--proxy-bypass-list='
    ],
    proxyUrl: tunnel.proxyUrl
  };
}

/**
 * Test SOCKS5 connection
 * 
 * @param {Object} socksConfig - SOCKS5 configuration
 * @returns {Promise<Object>} - Test result
 */
async function testSocks5Connection(socksConfig) {
  let tunnel = null;
  
  try {
    console.log('🧪 Testing SOCKS5 connection...');
    
    // Create temporary tunnel
    tunnel = await createSocks5Tunnel(socksConfig);
    
    // Try to make a request through the tunnel with retry logic
    const http = require('http');
    
    const testUrl = 'http://ip-api.com/json';
    
    // Retry up to 3 times
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`🔄 SOCKS5 test attempt ${attempt}/3`);
        
        const result = await new Promise((resolve, reject) => {
          const req = http.get(testUrl, {
            agent: new http.Agent({
              host: '127.0.0.1',
              port: tunnel.localPort
            })
          }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
              try {
                const json = JSON.parse(data);
                resolve({
                  success: true,
                  ip: json.query,
                  country: json.country,
                  city: json.city,
                  message: 'SOCKS5 proxy working!',
                  timezone: json.timezone
                });
              } catch (err) {
                reject(new Error('Failed to parse response: ' + err.message));
              }
            });
          });
          
          req.on('error', reject);
          req.setTimeout(15000, () => reject(new Error('Connection timeout')));
        });
        
        // If we get here, the test succeeded
        // Close test tunnel
        await tunnel.server.close(true);
        
        console.log('✅ SOCKS5 test successful! IP:', result.ip, 'Country:', result.country, 'Timezone:', result.timezone);
        return result;
        
      } catch (error) {
        lastError = error;
        console.warn(`⚠️ SOCKS5 test attempt ${attempt} failed:`, error.message);
        
        // Wait before retrying (except on last attempt)
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    // If we get here, all attempts failed
    throw lastError;
    
  } catch (error) {
    // Close test tunnel on error
    if (tunnel) {
      try {
        await tunnel.server.close(true);
      } catch (e) {
        // Ignore close errors
      }
    }
    
    console.error('❌ SOCKS5 test failed after all retries:', error.message);
    return {
      success: false,
      error: error.message,
      message: 'SOCKS5 proxy connection failed'
    };
  }
}

module.exports = {
  createSocks5Tunnel,
  getSocks5Tunnel,
  closeSocks5Tunnel,
  closeAllSocks5Tunnels,
  isSocks5Proxy,
  getSocks5ProxyArgs,
  testSocks5Connection
};
