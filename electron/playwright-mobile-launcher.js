/**
 * Playwright Mobile Browser Launcher
 * Uses Playwright for Android/iOS mobile emulation
 * Better mobile support than Chrome flags
 */

const { chromium, devices } = require('playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');

// SOCKS5 handler for tunnel creation
const socks5Handler = require('./socks5-handler');
const { detectHTTPProxyTimezone } = require('./http-proxy-timezone');

// Playwright auto-installer
const playwrightInstaller = require('./playwright-installer');

class PlaywrightMobileLauncher {
  constructor() {
    this.activeBrowsers = new Map();
    this.profileUserAgents = new Map(); // Store UA per profile
    console.log('✅ PlaywrightMobileLauncher initialized');
  }

  /**
   * Load random user agent from txt file based on platform
   */
  loadUserAgent(platform) {
    try {
      const { app } = require('electron');
      let appPath;
      try {
        appPath = app && app.isPackaged ? path.dirname(app.getPath('exe')) : process.cwd();
      } catch (e) {
        appPath = process.cwd();
      }
      const uaFilePath = path.join(appPath, 'useragents', `${platform.toLowerCase()}.txt`);
      
      if (!fs.existsSync(uaFilePath)) {
        console.warn(`⚠️ User agent file not found for ${platform}: ${uaFilePath}`);
        return null;
      }

      // Read file and split by lines
      const content = fs.readFileSync(uaFilePath, 'utf8');
      const userAgents = content.split('\n').filter(line => line.trim().length > 0);
      
      if (userAgents.length === 0) {
        console.warn(`⚠️ No user agents found in ${platform}.txt`);
        return null;
      }

      // Return random user agent
      const randomIndex = Math.floor(Math.random() * userAgents.length);
      const selectedUA = userAgents[randomIndex].trim();
      console.log(`✅ Loaded ${platform} UA from useragents folder (${userAgents.length} total)`);
      return selectedUA;
    } catch (error) {
      console.error(`❌ Failed to load user agent for ${platform}:`, error.message);
      return null;
    }
  }

  /**
   * Get device configuration for platform with unique UA per profile
   */
  getDeviceConfig(profileId, platform) {
    let userAgent = null;
    
    // Check if profile already has a UA
    if (this.profileUserAgents && this.profileUserAgents.has(profileId)) {
      userAgent = this.profileUserAgents.get(profileId);
      console.log(`♻️ Using cached ${platform} UA for profile:`, profileId);
    } else {
      // Load new random UA
      userAgent = this.loadUserAgent(platform);
      if (!userAgent) {
        // Fallback
        userAgent = platform === 'android'
          ? 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36'
          : 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
        console.log(`⚠️ Using fallback ${platform} UA`);
      } else {
        console.log(`🆕 Loaded new ${platform} UA from useragents/${platform}.txt`);
      }
      
      // Store UA for this profile
      if (this.profileUserAgents) {
        this.profileUserAgents.set(profileId, userAgent);
      }
    }

    if (platform === 'android') {
      // Pixel 7 configuration with unique UA
      return {
        ...devices['Pixel 5'],
        userAgent: userAgent,
        viewport: {
          width: 412,
          height: 915
        },
        deviceScaleFactor: 2.625,
        isMobile: true,
        hasTouch: true
      };
    } else if (platform === 'ios') {
      // iPhone 14 configuration with unique UA
      return {
        ...devices['iPhone 14'],
        userAgent: userAgent,
        viewport: {
          width: 390,
          height: 844
        },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true
      };
    }
    return null;
  }

  /**
   * Launch mobile browser with Playwright
   */
  async launchMobile(profile) {
    try {
      console.log(`🚀 Launching Playwright mobile browser for: ${profile.name} (${profile.id})`);
      
      // ✅ AUTO-INSTALL: Check and install Chrome browser if missing
      console.log('🔍 Checking Chrome browser installation...');
      if (!playwrightInstaller.isChromiumInstalled()) {
        console.log('⚠️ Chrome browser not found! Downloading...');
        console.log('📥 Downloading Chrome... This may take 2-3 minutes (one-time only)');
        
        const installResult = await playwrightInstaller.install();
        if (!installResult.success) {
          return {
            success: false,
            error: `Chrome browser download failed: ${installResult.message}\n\nPlease restart the app and try again.`
          };
        }
        
        console.log('✅ Chrome browser downloaded successfully!');
      } else {
        console.log('✅ Chrome browser ready');
      }
      
      const platform = (profile.platform || '').toLowerCase();
      // Pass profile ID to get unique UA
      const deviceConfig = this.getDeviceConfig(profile.id, platform);
      
      if (!deviceConfig) {
        return {
          success: false,
          error: `Invalid mobile platform: ${platform}`
        };
      }

      // User data directory for persistence
      const userDataDir = profile.userDataDir || path.join(
        os.homedir(), 
        'BeastBrowser', 
        'PlaywrightProfiles', 
        profile.id
      );

      // Ensure directory exists
      if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true });
      }

      console.log(`📱 Device: ${platform.toUpperCase()}`);
      console.log(`📱 Viewport: ${deviceConfig.viewport.width}x${deviceConfig.viewport.height}`);
      console.log(`📱 User Agent: ${deviceConfig.userAgent.substring(0, 60)}...`);
      
      // 🔧 Handle SOCKS5 proxy - create local HTTP tunnel like Chrome139
      let socks5Tunnel = null;
      if (profile.proxy && socks5Handler.isSocks5Proxy(profile.proxy)) {
        try {
          console.log('🔧 Creating SOCKS5 tunnel for Playwright profile:', profile.id);
          console.log('🔧 SOCKS5 Config:', JSON.stringify(profile.proxy, null, 2));
          
          const socksInfo = await socks5Handler.getSocks5ProxyArgs(profile.id, profile.proxy);
          socks5Tunnel = socksInfo.tunnel;
          
          console.log('✅ SOCKS5 Tunnel Info:', JSON.stringify({
            port: socksInfo.port,
            proxyUrl: socksInfo.proxyUrl,
            detectedTimezone: socksInfo.timezone
          }));
          
          // Replace profile proxy with local HTTP tunnel
          profile.proxy = {
            type: 'http',
            host: '127.0.0.1',
            port: socksInfo.port
          };
          
          // Auto-set timezone from detected proxy location
          if (socksInfo.timezone && socksInfo.timezone !== 'auto') {
            profile.proxyTimezone = socksInfo.timezone;
            console.log('🌍 Auto-detected timezone from SOCKS5 proxy:', socksInfo.timezone);
          } else {
            // Fallback if detection failed
            profile.proxyTimezone = 'America/New_York';
            console.log('🌍 Using fallback timezone: America/New_York (proxy detection failed)');
          }
          
          console.log('✅ SOCKS5 tunnel created! Local proxy:', socksInfo.proxyUrl);
        } catch (error) {
          console.error('❌ Failed to create SOCKS5 tunnel for Playwright:', error.message);
          console.error('❌ Error stack:', error.stack);
          return { 
            success: false, 
            error: `SOCKS5 tunnel failed: ${error.message}` 
          };
        }
      } else if (profile.proxy) {
        // HTTP/HTTPS proxy - detect timezone
        console.log('🔄 Detecting timezone for HTTP/HTTPS proxy in Playwright...');
        try {
          const detectedTimezone = await detectHTTPProxyTimezone(profile.proxy);
          if (detectedTimezone && detectedTimezone !== 'auto') {
            profile.proxyTimezone = detectedTimezone;
            console.log('✅ HTTP Proxy timezone detected for Playwright:', detectedTimezone);
          } else {
            profile.proxyTimezone = 'America/New_York';
            console.log('⚠️ Using fallback timezone for Playwright: America/New_York');
          }
        } catch (error) {
          console.error('❌ HTTP proxy timezone detection failed for Playwright:', error.message);
          profile.proxyTimezone = 'America/New_York';
          console.log('⚠️ Using fallback timezone for Playwright: America/New_York');
        }
      }

      // Launch browser with persistent context
      const browser = await chromium.launchPersistentContext(userDataDir, {
        ...deviceConfig,
        headless: false,
        
        // CRITICAL: Ignore default Playwright args that show automation
        ignoreDefaultArgs: ['--enable-automation'],
        
        // Disable Chromium sandbox (prevents warnings)
        chromiumSandbox: false,
        
        // Proxy configuration - now supports SOCKS5 via local HTTP tunnel
        proxy: profile.proxy ? {
          server: `${profile.proxy.type || 'http'}://${profile.proxy.host}:${profile.proxy.port}`,
          username: profile.proxy.username,
          password: profile.proxy.password
        } : undefined,
        
        // Timezone - prioritize proxy timezone if available
        timezoneId: profile.timezone && profile.timezone !== 'auto' 
          ? profile.timezone 
          : (profile.proxyTimezone && profile.proxyTimezone !== 'auto' 
            ? profile.proxyTimezone 
            : Intl.DateTimeFormat().resolvedOptions().timeZone),
        
        // Locale
        locale: profile.locale || 'en-US',
        
        // Geolocation
        geolocation: profile.latitude && profile.longitude ? {
          latitude: parseFloat(profile.latitude),
          longitude: parseFloat(profile.longitude),
          accuracy: profile.geoAccuracy || 100
        } : undefined,
        
        permissions: profile.latitude && profile.longitude ? ['geolocation'] : [],
        
        // Browser args - COMPLETELY hide automation infobar
        args: [
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-component-update',
          '--disable-sync',
          '--disable-translate',
          '--disable-blink-features=AutomationControlled', // Hide automation detection
          '--test-type', // CRITICAL: Hides ALL Chrome warnings and infobars
          '--disable-infobars', // Additional infobar blocking
          '--disable-extensions',
          '--disable-web-security',
          '--allow-running-insecure-content',
          '--disable-features=TranslateUI,BlinkGenPropertyTrees,IsolateOrigins,site-per-process',
          '--disable-dev-shm-usage',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-ipc-flooding-protection'
        ]

      });

      // Get the first page (or create one)
      let page = browser.pages()[0];
      if (!page) {
        page = await browser.newPage();
      }

      // Navigate to starting URL - Default to test page
      let defaultUrl = 'https://www.google.com';
      try {
        const testPagePath = path.join(process.cwd(), 'test-version-detection.html');
        if (fs.existsSync(testPagePath)) {
          defaultUrl = `file:///${testPagePath.replace(/\\/g, '/')}`;
        }
      } catch (e) {
        // Fallback to Google if test page not found
      }
      const startUrl = profile.startUrl || profile.startingUrl || defaultUrl;
      console.log(`🌐 Navigating to: ${startUrl}`);
      
      await page.goto(startUrl, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // Store browser instance
      this.activeBrowsers.set(profile.id, {
        browser,
        context: browser,
        page,
        platform,
        startTime: Date.now()
      });

      console.log(`✅ Playwright mobile browser launched: ${profile.id}`);

      return {
        success: true,
        profileId: profile.id,
        platform,
        viewport: deviceConfig.viewport
      };

    } catch (error) {
      console.error(`❌ Failed to launch Playwright mobile browser:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Close mobile browser
   */
  async closeMobile(profileId) {
    const browserInfo = this.activeBrowsers.get(profileId);
    if (!browserInfo) {
      console.log(`⚠️ Playwright browser not found: ${profileId}`);
      return {
        success: false,
        error: 'Browser not found'
      };
    }

    try {
      const runtime = Date.now() - browserInfo.startTime;
      console.log(`🛑 Closing Playwright browser: ${profileId} (runtime: ${runtime}ms)`);

      // Close browser with timeout
      const closePromise = browserInfo.browser.close();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Close timeout')), 10000)
      );
      
      try {
        await Promise.race([closePromise, timeoutPromise]);
        console.log(`✅ Playwright browser closed gracefully: ${profileId}`);
      } catch (timeoutError) {
        console.warn(`⚠️ Browser close timeout, force killing: ${profileId}`);
        
        // Force kill Playwright processes
        if (process.platform === 'win32') {
          const { exec } = require('child_process');
          // Kill all chrome.exe spawned by Playwright
          exec('taskkill /F /IM chrome.exe /T', (error) => {
            if (!error) console.log(`✅ Force killed Playwright Chrome processes`);
          });
        }
      }
      
      // Remove from active list immediately
      this.activeBrowsers.delete(profileId);
      console.log(`✅ Profile ${profileId} removed from Playwright active list`);
      
      // Cleanup SOCKS5 tunnel if exists
      try {
        await socks5Handler.closeSocks5Tunnel(profileId);
        console.log(`✅ SOCKS5 tunnel closed for Playwright profile ${profileId}`);
      } catch (error) {
        console.warn(`⚠️ Failed to close SOCKS5 tunnel for profile ${profileId}:`, error.message);
      }

      return {
        success: true,
        runtime
      };
    } catch (error) {
      console.error(`❌ Failed to close Playwright browser:`, error);
      // Remove anyway to prevent stuck state
      this.activeBrowsers.delete(profileId);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if profile is active
   */
  isActive(profileId) {
    return this.activeBrowsers.has(profileId);
  }

  /**
   * Get active profile IDs
   */
  getActiveProfiles() {
    return Array.from(this.activeBrowsers.keys());
  }

  /**
   * Get profile info
   */
  getProfileInfo(profileId) {
    const info = this.activeBrowsers.get(profileId);
    if (!info) return null;

    return {
      profileId,
      platform: info.platform,
      startTime: info.startTime,
      runtime: 'playwright',
      isActive: true
    };
  }

  /**
   * Close all browsers
   */
  async closeAll() {
    console.log(`🛑 Closing ${this.activeBrowsers.size} Playwright browsers`);
    
    const closePromises = [];
    for (const [profileId] of this.activeBrowsers) {
      closePromises.push(this.closeMobile(profileId));
    }
    
    await Promise.allSettled(closePromises);
    
    // Close all SOCKS5 tunnels
    try {
      await socks5Handler.closeAllSocks5Tunnels();
      console.log('✅ All SOCKS5 tunnels closed for Playwright');
    } catch (error) {
      console.warn('⚠️ Failed to close all SOCKS5 tunnels:', error.message);
    }
    
    return {
      success: true,
      closed: closePromises.length
    };
  }
}

// Singleton instance
const playwrightMobileLauncher = new PlaywrightMobileLauncher();

module.exports = playwrightMobileLauncher;
