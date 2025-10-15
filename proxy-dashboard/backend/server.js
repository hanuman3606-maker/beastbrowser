/**
 * Proxy Testing API Server
 * 
 * Express server that provides REST API for testing proxies
 * Handles HTTP, HTTPS, SOCKS4, and SOCKS5 proxies
 * 
 * Endpoints:
 * - POST /api/test-proxy - Test single proxy
 * - POST /api/test-proxies - Test multiple proxies
 * - GET /api/health - Health check
 * 
 * @author Beast Browser Team
 */

const express = require('express');
const cors = require('cors');
const { testProxy, testMultipleProxies } = require('./proxyTester');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`\n📨 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * Test single proxy
 * 
 * POST /api/test-proxy
 * Body: {
 *   host: "1.2.3.4",
 *   port: 8080,
 *   type: "http|https|socks4|socks5",
 *   username: "optional",
 *   password: "optional"
 * }
 */
app.post('/api/test-proxy', async (req, res) => {
  try {
    const { host, port, type, username, password } = req.body;

    // Validate required fields
    if (!host || !port) {
      return res.status(400).json({
        success: false,
        error: 'Host and port are required'
      });
    }

    // Validate port
    const portNum = parseInt(port);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      return res.status(400).json({
        success: false,
        error: 'Invalid port number (must be 1-65535)'
      });
    }

    // Validate type
    const proxyType = (type || 'http').toLowerCase();
    if (!['http', 'https', 'socks4', 'socks5'].includes(proxyType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid proxy type (must be http, https, socks4, or socks5)'
      });
    }

    console.log(`🧪 Testing proxy: ${host}:${port} (${proxyType})`);

    // Test proxy
    const result = await testProxy({
      host,
      port: portNum,
      type: proxyType,
      username,
      password
    });

    // Return result
    res.json({
      success: result.status === 'working',
      result
    });

  } catch (error) {
    console.error('❌ Server error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Test multiple proxies concurrently
 * 
 * POST /api/test-proxies
 * Body: {
 *   proxies: [
 *     { host: "1.2.3.4", port: 8080, type: "http" },
 *     { host: "5.6.7.8", port: 1080, type: "socks5", username: "user", password: "pass" }
 *   ],
 *   concurrency: 5 (optional, default: 5)
 * }
 */
app.post('/api/test-proxies', async (req, res) => {
  try {
    const { proxies, concurrency = 5 } = req.body;

    // Validate input
    if (!Array.isArray(proxies) || proxies.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Proxies array is required and must not be empty'
      });
    }

    // Limit batch size
    if (proxies.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 100 proxies per batch'
      });
    }

    // Validate concurrency
    const concurrencyNum = parseInt(concurrency);
    if (isNaN(concurrencyNum) || concurrencyNum < 1 || concurrencyNum > 20) {
      return res.status(400).json({
        success: false,
        error: 'Concurrency must be between 1 and 20'
      });
    }

    console.log(`🧪 Testing ${proxies.length} proxies with concurrency: ${concurrencyNum}`);

    // Test all proxies
    const results = await testMultipleProxies(proxies, concurrencyNum);

    // Calculate statistics
    const stats = {
      total: results.length,
      working: results.filter(r => r.status === 'working').length,
      failed: results.filter(r => r.status === 'failed').length,
      avgLatency: Math.round(
        results
          .filter(r => r.status === 'working')
          .reduce((sum, r) => sum + r.latency, 0) / 
        results.filter(r => r.status === 'working').length || 0
      )
    };

    res.json({
      success: true,
      results,
      stats
    });

  } catch (error) {
    console.error('❌ Server error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Error handling middleware
 */
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

/**
 * 404 handler
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

/**
 * Start server
 */
app.listen(PORT, () => {
  console.log('\n🚀 ========================================');
  console.log('🚀 Proxy Testing API Server');
  console.log('🚀 ========================================');
  console.log(`🌐 Server running on: http://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🧪 Test endpoint: POST http://localhost:${PORT}/api/test-proxy`);
  console.log('🚀 ========================================\n');
});

module.exports = app;
