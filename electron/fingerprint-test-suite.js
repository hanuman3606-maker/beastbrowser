/**
 * Fingerprint Test Suite
 * 
 * Automated testing framework for validating Chrome 139 fingerprint
 * anti-detection capabilities across multiple test sites.
 * 
 * @author Beast Browser Team
 * @license MIT
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class FingerprintTestSuite {
  constructor() {
    this.testUrls = {
      creepjs: 'https://abrahamjuliot.github.io/creepjs/',
      browserleaks: 'https://browserleaks.com/canvas',
      webrtc: 'https://browserleaks.com/webrtc',
      cloudflare: 'https://www.cloudflare.com/',
      turnstile: 'https://demo.turnstile.workers.dev/',
      webgl: 'https://get.webgl.org/',
      deviceinfo: 'https://www.deviceinfo.me/'
    };
  }

  /**
   * Run all tests for a profile
   */
  async runAllTests(chromePath, userDataDir, proxy = null) {
    const results = {
      timestamp: new Date().toISOString(),
      tests: {},
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };

    console.log('🧪 Starting fingerprint test suite...');

    const tests = [
      { name: 'launch', fn: () => this.testLaunch(chromePath, userDataDir, proxy) },
      { name: 'webrtc', fn: () => this.testWebRTC(chromePath, userDataDir, proxy) },
      { name: 'canvas', fn: () => this.testCanvas(chromePath, userDataDir, proxy) },
      { name: 'webgl', fn: () => this.testWebGL(chromePath, userDataDir, proxy) },
      { name: 'cloudflare', fn: () => this.testCloudflare(chromePath, userDataDir, proxy) }
    ];

    for (const test of tests) {
      try {
        console.log(`\n📝 Running test: ${test.name}`);
        const result = await test.fn();
        results.tests[test.name] = result;
        results.summary.total++;
        
        if (result.passed) {
          results.summary.passed++;
          console.log(`✅ ${test.name} PASSED`);
        } else if (result.warning) {
          results.summary.warnings++;
          console.log(`⚠️ ${test.name} WARNING: ${result.message}`);
        } else {
          results.summary.failed++;
          console.log(`❌ ${test.name} FAILED: ${result.message}`);
        }
      } catch (error) {
        console.error(`❌ ${test.name} ERROR:`, error.message);
        results.tests[test.name] = {
          passed: false,
          error: error.message
        };
        results.summary.total++;
        results.summary.failed++;
      }
    }

    console.log('\n📊 Test Summary:');
    console.log(`   Total: ${results.summary.total}`);
    console.log(`   Passed: ${results.summary.passed}`);
    console.log(`   Failed: ${results.summary.failed}`);
    console.log(`   Warnings: ${results.summary.warnings}`);

    return results;
  }

  /**
   * Test: Launch and basic navigation
   */
  async testLaunch(chromePath, userDataDir, proxy) {
    let browser = null;
    try {
      const launchOptions = {
        executablePath: chromePath,
        userDataDir,
        headless: false,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled'
        ]
      };

      if (proxy) {
        launchOptions.args.push(`--proxy-server=${proxy}`);
      }

      browser = await puppeteer.launch(launchOptions);
      const page = await browser.newPage();
      
      await page.goto('https://example.com', { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      const title = await page.title();
      await browser.close();

      return {
        passed: title.includes('Example'),
        message: `Browser launched and navigated successfully. Title: ${title}`
      };
    } catch (error) {
      if (browser) await browser.close().catch(() => {});
      return {
        passed: false,
        message: error.message
      };
    }
  }

  /**
   * Test: WebRTC leak protection
   */
  async testWebRTC(chromePath, userDataDir, proxy) {
    let browser = null;
    try {
      const launchOptions = {
        executablePath: chromePath,
        userDataDir,
        headless: false,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-non-proxied-udp',
          '--enforce-webrtc-ip-permission-check'
        ]
      };

      if (proxy) {
        launchOptions.args.push(`--proxy-server=${proxy}`);
      }

      browser = await puppeteer.launch(launchOptions);
      const page = await browser.newPage();
      
      await page.goto(this.testUrls.webrtc, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      // Wait for WebRTC detection
      await page.waitForTimeout(3000);

      // Check for local IP leakage
      const leaks = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('*'));
        const text = elements.map(el => el.textContent).join(' ');
        
        // Look for private IP patterns
        const privateIpPattern = /\b(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)\d+\.\d+\b/g;
        const matches = text.match(privateIpPattern);
        
        return matches ? matches.length : 0;
      });

      await browser.close();

      if (leaks > 0) {
        return {
          passed: false,
          warning: true,
          message: `Potential WebRTC IP leak detected (${leaks} private IPs found)`
        };
      }

      return {
        passed: true,
        message: 'No WebRTC IP leaks detected'
      };
    } catch (error) {
      if (browser) await browser.close().catch(() => {});
      return {
        passed: false,
        message: error.message
      };
    }
  }

  /**
   * Test: Canvas fingerprinting
   */
  async testCanvas(chromePath, userDataDir, proxy) {
    let browser = null;
    try {
      const launchOptions = {
        executablePath: chromePath,
        userDataDir,
        headless: false,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled'
        ]
      };

      if (proxy) {
        launchOptions.args.push(`--proxy-server=${proxy}`);
      }

      browser = await puppeteer.launch(launchOptions);
      const page = await browser.newPage();
      
      const canvasFingerprint = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 200;
        canvas.height = 50;
        
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillStyle = '#f60';
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = '#069';
        ctx.fillText('BeastBrowser Test 🦁', 2, 15);
        
        return canvas.toDataURL();
      });

      await browser.close();

      return {
        passed: canvasFingerprint.length > 100,
        message: `Canvas fingerprint generated (${canvasFingerprint.length} chars)`,
        fingerprint: canvasFingerprint.substring(0, 100) + '...'
      };
    } catch (error) {
      if (browser) await browser.close().catch(() => {});
      return {
        passed: false,
        message: error.message
      };
    }
  }

  /**
   * Test: WebGL fingerprinting
   */
  async testWebGL(chromePath, userDataDir, proxy) {
    let browser = null;
    try {
      const launchOptions = {
        executablePath: chromePath,
        userDataDir,
        headless: false,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled'
        ]
      };

      if (proxy) {
        launchOptions.args.push(`--proxy-server=${proxy}`);
      }

      browser = await puppeteer.launch(launchOptions);
      const page = await browser.newPage();
      
      await page.goto(this.testUrls.webgl, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      await page.waitForTimeout(2000);

      const webglSupported = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        return gl !== null;
      });

      const webglInfo = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) return null;
        
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        return {
          vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'N/A',
          renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'N/A'
        };
      });

      await browser.close();

      return {
        passed: webglSupported,
        message: `WebGL ${webglSupported ? 'supported' : 'not supported'}`,
        vendor: webglInfo?.vendor,
        renderer: webglInfo?.renderer
      };
    } catch (error) {
      if (browser) await browser.close().catch(() => {});
      return {
        passed: false,
        message: error.message
      };
    }
  }

  /**
   * Test: Cloudflare challenge
   */
  async testCloudflare(chromePath, userDataDir, proxy) {
    let browser = null;
    try {
      const launchOptions = {
        executablePath: chromePath,
        userDataDir,
        headless: false,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled'
        ]
      };

      if (proxy) {
        launchOptions.args.push(`--proxy-server=${proxy}`);
      }

      browser = await puppeteer.launch(launchOptions);
      const page = await browser.newPage();
      
      await page.goto(this.testUrls.cloudflare, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      // Wait for potential challenge
      await page.waitForTimeout(5000);

      const title = await page.title();
      const url = page.url();
      
      await browser.close();

      // Check if we got past Cloudflare (no challenge page)
      const passed = !title.toLowerCase().includes('checking') && 
                    !title.toLowerCase().includes('challenge') &&
                    !url.includes('cdn-cgi/challenge');

      return {
        passed,
        warning: !passed,
        message: passed ? 'Cloudflare page loaded successfully' : 'Cloudflare challenge detected',
        title,
        url
      };
    } catch (error) {
      if (browser) await browser.close().catch(() => {});
      return {
        passed: false,
        message: error.message
      };
    }
  }

  /**
   * Quick test for UI (single endpoint)
   */
  async quickTest(testName, chromePath, userDataDir, proxy) {
    const testMap = {
      launch: () => this.testLaunch(chromePath, userDataDir, proxy),
      webrtc: () => this.testWebRTC(chromePath, userDataDir, proxy),
      canvas: () => this.testCanvas(chromePath, userDataDir, proxy),
      webgl: () => this.testWebGL(chromePath, userDataDir, proxy),
      cloudflare: () => this.testCloudflare(chromePath, userDataDir, proxy)
    };

    if (!testMap[testName]) {
      return {
        passed: false,
        error: `Unknown test: ${testName}`
      };
    }

    try {
      return await testMap[testName]();
    } catch (error) {
      return {
        passed: false,
        error: error.message
      };
    }
  }
}

// Singleton instance
const fingerprintTestSuite = new FingerprintTestSuite();

module.exports = fingerprintTestSuite;
