/**
 * HTTP Proxy Timezone Detection
 * Detects timezone for HTTP/HTTPS proxies (not SOCKS5)
 */

const http = require('http');
const https = require('https');

/**
 * Detect timezone through HTTP/HTTPS proxy
 * @param {Object} proxy - Proxy configuration
 * @returns {Promise<string>} - Detected timezone
 */
async function detectHTTPProxyTimezone(proxy) {
  try {
    console.log('🌍 [HTTP PROXY] Detecting timezone...');
    console.log('🔍 [HTTP PROXY] Proxy:', `${proxy.host}:${proxy.port}`);
    
    // Try multiple geolocation APIs
    const apis = [
      { url: 'http://ip-api.com/json/?fields=timezone,country,city,query', module: http },
      { url: 'http://ipapi.co/json/', module: http },
      { url: 'http://ipinfo.io/json', module: http }
    ];
    
    for (const api of apis) {
      try {
        const result = await makeHTTPProxyRequest(proxy, api.url, api.module);
        if (result) {
          console.log('✅ [HTTP PROXY] Timezone detected successfully!');
          return result;
        }
      } catch (err) {
        console.warn('⚠️ [HTTP PROXY] API failed:', api.url, err.message);
        continue;
      }
    }
    
    console.warn('⚠️ [HTTP PROXY] All APIs failed, using fallback');
    return 'America/New_York';
    
  } catch (error) {
    console.error('❌ [HTTP PROXY] Timezone detection error:', error.message);
    return 'America/New_York';
  }
}

/**
 * Make HTTP request through HTTP/HTTPS proxy
 */
function makeHTTPProxyRequest(proxy, targetUrl, httpModule) {
  return new Promise((resolve, reject) => {
    const targetUrlObj = new URL(targetUrl);
    
    // Build proxy authentication header
    let authHeader = null;
    if (proxy.username && proxy.password) {
      const auth = Buffer.from(`${proxy.username}:${proxy.password}`).toString('base64');
      authHeader = `Basic ${auth}`;
    }
    
    const options = {
      hostname: proxy.host,
      port: proxy.port,
      path: targetUrl,
      method: 'GET',
      timeout: 10000,
      headers: {
        'Host': targetUrlObj.hostname,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    };
    
    // Add proxy authentication if needed
    if (authHeader) {
      options.headers['Proxy-Authorization'] = authHeader;
    }
    
    const req = httpModule.request(options, (res) => {
      let data = '';
      
      res.on('data', chunk => data += chunk);
      
      res.on('end', () => {
        try {
          const geo = JSON.parse(data);
          
          // Try different response formats
          let timezone = geo.timezone || geo.time_zone || geo.tz;
          
          // Additional fallbacks
          if (!timezone && geo.data && geo.data.timezone) {
            timezone = geo.data.timezone;
          }
          
          if (timezone && timezone !== 'auto') {
            console.log('✅ [HTTP PROXY] Detected from', targetUrl);
            console.log('✅ [HTTP PROXY] Location:', geo.country || geo.country_name, '-', geo.city || geo.city_name);
            console.log('✅ [HTTP PROXY] Timezone:', timezone);
            console.log('✅ [HTTP PROXY] IP:', geo.query || geo.ip);
            resolve(timezone);
          } else {
            // Try to construct timezone from offset if available
            if (geo.utc_offset || geo.offset) {
              const offset = geo.utc_offset || geo.offset;
              console.log('⚠️ [HTTP PROXY] No timezone in response, trying to construct from offset:', offset);
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

module.exports = {
  detectHTTPProxyTimezone
};
