/**
 * SOCKS5 Proxy Handler for Puppeteer
 * 
 * This file handles SOCKS5 proxy connections properly using proxy-chain
 * HTTP proxies are still handled in main.js (don't touch that!)
 */

const { Server } = require('proxy-chain');

// Active SOCKS5 proxy servers map
const activeSocksServers = new Map();

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
      maxSockets: Infinity, // No limit on connections
      keepAlive: true,
      keepAliveMsecs: 60000
    });
    
    // Add error handler to server
    server.on('connectionError', (err) => {
      console.error('⚠️ SOCKS5 connection error:', err.message);
    });
    
    server.on('requestFailed', (err) => {
      console.error('⚠️ SOCKS5 request failed:', err.message);
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
 * Get Puppeteer launch args for SOCKS5 proxy
 * Returns local HTTP proxy URL that tunnels to SOCKS5
 * 
 * @param {string} profileId - Profile ID
 * @param {Object} socksConfig - SOCKS5 configuration
 * @returns {Promise<Object>} - Tunnel info with proxy args
 */
async function getSocks5ProxyArgs(profileId, socksConfig) {
  const tunnel = await getSocks5Tunnel(profileId, socksConfig);
  
  // Route ALL traffic through proxy including ads
  return {
    tunnel,
    args: [
      `--proxy-server=${tunnel.proxyUrl}`,
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
    
    // Try to make a request through the tunnel
    const https = require('https');
    const http = require('http');
    
    const testUrl = 'http://ip-api.com/json';
    
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
              message: 'SOCKS5 proxy working!'
            });
          } catch (err) {
            reject(new Error('Failed to parse response'));
          }
        });
      });
      
      req.on('error', reject);
      req.setTimeout(10000, () => reject(new Error('Connection timeout')));
    });
    
    // Close test tunnel
    await tunnel.server.close(true);
    
    console.log('✅ SOCKS5 test successful! IP:', result.ip, 'Country:', result.country);
    return result;
    
  } catch (error) {
    // Close test tunnel on error
    if (tunnel) {
      try {
        await tunnel.server.close(true);
      } catch (e) {
        // Ignore close errors
      }
    }
    
    console.error('❌ SOCKS5 test failed:', error.message);
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
