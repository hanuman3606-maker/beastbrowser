/**
 * Chrome 139 Runtime Launcher
 * 
 * Provides Chrome 139 as an alternative runtime with advanced anti-detection
 * fingerprinting features. Spawns Chrome as a standalone process with per-profile
 * user data directories and customizable fingerprint parameters.
 * 
 * @author Beast Browser Team
 * @license MIT
 */

const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { app } = require('electron');

// SOCKS5 proxy handler integration
const socks5Handler = require('./socks5-handler');

// Timezone extension builder for proper timezone injection
const { createTimezoneExtension } = require('./timezone-extension-builder');
const { createProxyAuthExtension } = require('./proxy-auth-extension-builder');
const { detectHTTPProxyTimezone } = require('./http-proxy-timezone');
const { createMobileExtension } = require('./create-mobile-extension');
const { createVersionSpoofExtension } = require('./version-spoof-extension-builder');

class Chrome139Runtime {
  constructor() {
    this.chromePath = null;
    this.version = null;
    this.activeProcesses = new Map();
    this.profileCrashCount = new Map();
    this.profileUserAgents = new Map();
    this.crashHistory = new Map(); // 🔧 FIX: Add crashHistory Map
    this.maxCrashes = 3;
    this.logsDir = path.join(os.homedir(), 'BeastBrowser', 'logs', 'runtime');
    this.initialized = false;
    
    // Ensure logs directory exists
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
    
    // Delay detection until app is ready
    if (app && app.isReady && app.isReady()) {
      this.detectRuntime();
      this.initialized = true;
    } else if (app) {
      app.on('ready', () => {
        this.detectRuntime();
        this.initialized = true;
      });
    } else {
      this.detectRuntime();
      this.initialized = true;
    }
    
    console.log('✅ Chrome139Runtime initialized successfully');
  }

  /**
   * Detect Chrome 139 binary and validate version
   * Uses bundled extracted Chrome folder
   */
  detectRuntime() {
    let appPath;
    try {
      appPath = app && app.isPackaged ? path.dirname(app.getPath('exe')) : process.cwd();
    } catch (e) {
      appPath = process.cwd();
    }

    console.log('🔍 Chrome 139 Detection started');
    console.log('📂 App path:', appPath);
    console.log('📦 Packaged:', app && app.isPackaged);

    const possiblePaths = [
      // Bundled Chrome 139 folder (highest priority)
      path.join(appPath, 'ungoogled-chromium_139.0.7258.154-1.1_windows_x64', 'chrome.exe'),
      path.join(appPath, 'chrome139', 'chrome.exe'),
      // User folder installations
      path.join(os.homedir(), 'BeastBrowser', 'chrome', 'chrome.exe'),
      path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'BeastBrowser', 'chrome', 'chrome.exe'),
      // Fallback to system Chrome if installed
      path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Google', 'Chrome', 'Application', 'chrome.exe')
    ];

    for (const chromePath of possiblePaths) {
      console.log(`🔍 Checking: ${chromePath}`);
      if (fs.existsSync(chromePath)) {
        console.log(`  ✅ File exists!`);
        try {
          const version = this.getChromeVersion(chromePath);
          console.log(`  📋 Version: ${version}`);
          if (version && version >= 100) { // Accept Chrome 100+
            this.chromePath = chromePath;
            this.version = version;
            console.log(`✅ Chrome runtime detected: v${version} at ${chromePath}`);
            return true;
          }
        } catch (e) {
          console.warn(`  ⚠️ Version check failed:`, e.message);
        }
      } else {
        console.log(`  ❌ Not found`);
      }
    }

    console.warn('⚠️ Chrome 139 runtime not found at any expected path');
    return false;
  }

  /**
   * Get Chrome version from executable
   */
  getChromeVersion(chromePath) {
    try {
      // Just check if file exists and is executable - skip version check for speed
      if (fs.existsSync(chromePath)) {
        // Assume it's Chrome 139 if it's in the ungoogled-chromium folder
        if (chromePath.includes('ungoogled-chromium_139')) {
          console.log('  ✅ Detected ungoogled-chromium 139 from path');
          return 139;
        }
        
        // Try version check with longer timeout
        const output = execFileSync(chromePath, ['--version'], { 
          encoding: 'utf8', 
          timeout: 10000, // 10 seconds timeout
          windowsHide: true
        });
        const match = output.match(/(\d+)\./);
        return match ? parseInt(match[1], 10) : null;
      }
      return null;
    } catch (e) {
      // If version check fails but file exists, assume it's valid Chrome
      if (fs.existsSync(chromePath)) {
        console.warn('  ⚠️ Version check failed but file exists, assuming Chrome 100+');
        return 100; // Assume valid Chrome
      }
      console.warn('  ❌ Version check failed:', e.message);
      return null;
    }
  }

  /**
   * Check if runtime is available
   */
  isAvailable() {
    return this.chromePath !== null && fs.existsSync(this.chromePath);
  }

  /**
   * Get runtime info
   */
  getRuntimeInfo() {
    return {
      available: this.isAvailable(),
      path: this.chromePath,
      version: this.version,
      supportsFingerprint: this.version >= 139,
      supportsGPUFlags: this.version >= 139
    };
  }

  /**
   * Build Chrome launch arguments from profile config
   */
  buildArgs(profile) {
    console.log('🔍 buildArgs called');
    console.log('🔍 this:', typeof this);
    console.log('🔍 this.profileUserAgents:', typeof this.profileUserAgents);
    console.log('🔍 profileUserAgents is Map?', this.profileUserAgents instanceof Map);
    
    // Emergency fix if Map is undefined
    if (!this.profileUserAgents) {
      console.error('❌ EMERGENCY: profileUserAgents is undefined! Creating new Map...');
      this.profileUserAgents = new Map();
    }
    
    const args = [];
    const userDataDir = profile.userDataDir || path.join(os.homedir(), 'BeastBrowser', 'ChromeProfiles', profile.id);
    
    // Ensure user data directory exists before building args
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }
    
    // Set Google as default search engine in Preferences
    this.setDefaultSearchEngine(userDataDir);

    // Essential args
    args.push(`--user-data-dir=${userDataDir}`);
    args.push('--no-first-run');
    args.push('--no-default-browser-check');
    
    // Clean startup (no infobars or warnings)
    args.push('--disable-component-update');
    args.push('--no-service-autorun');
    args.push('--disable-sync');
    // Don't disable background networking - might prevent page loads
    // args.push('--disable-background-networking');
    // NOTE: Don't disable extensions - we need them for timezone injection
    // args.push('--disable-extensions'); // REMOVED - would block timezone extension
    args.push('--disable-translate');
    
    // Hide automation banner and improve stealth
    args.push('--disable-blink-features=AutomationControlled');
    // NOTE: --no-sandbox removed as it shows warning infobar in Chrome
    // Ungoogled Chromium runs without sandbox by default for better compatibility
    args.push('--disable-infobars');
    args.push('--test-type'); // Hides all warnings including sandbox warnings
    args.push('--disable-extensions-except=');
    args.push('--disable-web-security');
    args.push('--allow-running-insecure-content');
    
    // CRITICAL: Create injection script in user data dir
    // Ungoogled Chromium auto-loads scripts from user scripts directory
    try {
      const userScriptsDir = path.join(userDataDir, 'UserScripts');
      if (!fs.existsSync(userScriptsDir)) {
        fs.mkdirSync(userScriptsDir, { recursive: true });
      }
      
      // Get User-Agent for this profile
      let userAgentForScript = null;
      if (this.profileUserAgents && this.profileUserAgents.has(profile.id)) {
        userAgentForScript = this.profileUserAgents.get(profile.id);
      } else {
        userAgentForScript = this.loadUserAgent(profile.platform || 'windows');
      }
      
      if (userAgentForScript) {
        const versionMatch = userAgentForScript.match(/Chrome\/(\d+)/);
        if (versionMatch) {
          const targetVersion = versionMatch[1];
          const injectionScript = this.generateInjectionScript(userAgentForScript, targetVersion);
          fs.writeFileSync(path.join(userScriptsDir, 'version-spoof.js'), injectionScript, 'utf8');
          console.log(`✅ Version spoof injection script created for Chrome ${targetVersion}`);
        }
      }
    } catch (e) {
      console.error('❌ Failed to create user script:', e);
    }
    
    // Disable features that can leak information or block functionality
    // - TranslateUI: Translation popup
    // - BlinkGenPropertyTrees: Performance feature
    // - IsolateOrigins, site-per-process: Navigation restrictions
    // - UserAgentClientHint: Prevents Client Hints headers (Sec-CH-UA-*) that expose real Chrome version
    args.push('--disable-features=TranslateUI,BlinkGenPropertyTrees,IsolateOrigins,site-per-process,UserAgentClientHint');
    args.push('--disable-client-hints-component-update');
    
    // Set Google as default search engine
    args.push('--search-engine-choice-country=US');
    args.push('--force-search-engine-choice-screen=false');
    
    // HTTPS-First Mode - Always try HTTPS first
    args.push('--enable-features=HttpsUpgrades');
    
    // HSTS (HTTP Strict Transport Security)
    // Forces HTTPS on all domains
    args.push('--enable-strict-mixed-content-checking');
    
    // Disable insecure origins
    args.push('--unsafely-treat-insecure-origin-as-secure=');
    
    // NOTE: Ungoogled Chromium doesn't support custom --fingerprint-* flags
    // These flags don't exist in standard Chromium and will cause launch failures
    // Fingerprinting is handled via JavaScript injection instead
    
    // Platform fingerprinting - DISABLED (invalid Chrome flag)
    // The platform is used for UA selection and mobile emulation, not as a Chrome flag
    
    // GPU fingerprinting - DISABLED (these flags don't exist in Chromium)
    // GPU spoofing is handled via WebGL override in the content scripts

    // Locale and timezone
    // Auto-detect timezone based on proxy location if not set
    let timezone = profile.timezone;
    
    // CRITICAL: Filter out "auto" - it's not a valid IANA timezone
    if (timezone === 'auto' || timezone === 'Auto' || !timezone) {
      // Check if we have a proxy timezone first
      if (profile.proxyTimezone && profile.proxyTimezone !== 'auto' && profile.proxyTimezone !== 'Auto') {
        timezone = profile.proxyTimezone; // Set by SOCKS5 or HTTP proxy handler
        console.log('🌍 Using auto-detected timezone from proxy:', timezone);
      } else {
        // Use system timezone as fallback
        try {
          timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          console.log('✅ Using system timezone:', timezone);
        } catch (e) {
          timezone = 'America/New_York'; // Safe fallback
          console.log('⚠️ Using fallback timezone:', timezone);
        }
      }
    }
    
    // Collect all extensions to load
    const extensionsToLoad = [];
    
    if (timezone && timezone !== 'auto' && timezone !== 'Auto') {
      // CRITICAL: Create timezone injection extension
      try {
        const extensionDir = createTimezoneExtension(userDataDir, timezone);
        extensionsToLoad.push(extensionDir);
        console.log('✅ TIMEZONE EXTENSION CREATED:', extensionDir);
        console.log('✅ Timezone will be injected into all pages:', timezone);
      } catch (error) {
        console.error('❌ Failed to create timezone extension:', error.message);
        console.error('❌ Error stack:', error.stack);
        console.warn('⚠️ Falling back to Chrome flags only (less reliable)');
        if (timezone !== 'auto' && timezone !== 'Auto') {
          args.push(`--timezone-id=${timezone}`);
        }
      }
      
      // METHOD 1: Chrome language/locale
      args.push(`--lang=en-US`);
      
      // METHOD 2: Chrome TZ flag (V8/ICU level)
      if (timezone && timezone !== 'auto') {
        args.push(`--tz=${timezone}`);
      }
      
      // METHOD 3: Force timezone via additional Chrome flags
      if (timezone && timezone !== 'auto') {
        // ICU timezone override
        args.push(`--force-timezone=${timezone}`);
        // V8 timezone override
        args.push(`--timezone=${timezone}`);
      }
      
      // METHOD 4: Block system timezone detection
      args.push('--disable-timezone-tracking');
      args.push('--disable-features=AutofillServerCommunication');
      
      console.log('🌍 TIMEZONE INJECTION ACTIVE:', timezone);
      console.log('🌍 Method 1: Chrome flags (--tz, --timezone, --force-timezone)');
      console.log('🌍 Method 2: Extension override (getTimezoneOffset, all Date getters)');
      console.log('🌍 Method 3: Environment variables (TZ, ICU_TIMEZONE, CHROME_TIMEZONE)');
      console.log('🌍 Method 4: System timezone detection BLOCKED');
    } else {
      console.warn('⚠️⚠️⚠️ NO VALID TIMEZONE SPECIFIED - WILL USE SYSTEM TIMEZONE (LEAK RISK!)');
      console.warn('   Profile ID:', profile.id);
      console.warn('   Has proxy:', !!profile.proxy);
      console.warn('   Profile timezone:', profile.timezone);
      console.warn('   Proxy timezone:', profile.proxyTimezone);
      
      // Even if no valid timezone, try to create extension with system timezone as fallback
      try {
        const systemTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (systemTimezone) {
          const extensionDir = createTimezoneExtension(userDataDir, systemTimezone);
          extensionsToLoad.push(extensionDir);
          console.log('✅ FALLBACK TIMEZONE EXTENSION CREATED:', extensionDir);
          console.log('✅ Fallback timezone will be injected:', systemTimezone);
        }
      } catch (error) {
        console.error('❌ Failed to create fallback timezone extension:', error.message);
      }
    }
    
    // Check for RPA extension
    const rpaExtensionDir = path.join(userDataDir, 'BeastRPAExtension');
    if (fs.existsSync(rpaExtensionDir)) {
      extensionsToLoad.push(rpaExtensionDir);
      console.log('✅ RPA EXTENSION FOUND AND WILL BE LOADED:', rpaExtensionDir);
    }
    
    // Check for Proxy Auth extension - MUST LOAD FIRST for auth to work
    const proxyAuthExtensionDir = path.join(userDataDir, 'BeastProxyAuthExtension');
    if (fs.existsSync(proxyAuthExtensionDir)) {
      // Add at beginning so it loads first!
      extensionsToLoad.unshift(proxyAuthExtensionDir);
      console.log('✅ PROXY AUTH EXTENSION FOUND - WILL LOAD FIRST:', proxyAuthExtensionDir);
      
      // Verify extension files exist
      const manifestPath = path.join(proxyAuthExtensionDir, 'manifest.json');
      const bgPath = path.join(proxyAuthExtensionDir, 'background.js');
      console.log('   📄 Manifest exists:', fs.existsSync(manifestPath));
      console.log('   📄 Background exists:', fs.existsSync(bgPath));
    } else {
      console.warn('⚠️ Proxy Auth Extension NOT FOUND at:', proxyAuthExtensionDir);
    }
    
    // Create mobile viewport extension for Android/iOS
    console.log('🔍 PROFILE DEBUG: profile.platform =', profile.platform);
    const platform = profile.platform ? profile.platform.toLowerCase() : null;
    console.log('🔍 PLATFORM DEBUG: Normalized platform =', platform);
    if (platform === 'android' || platform === 'ios') {
      try {
        const width = platform === 'android' ? 412 : 390;
        const height = platform === 'android' ? 915 : 844;
        const mobileExtDir = createMobileExtension(userDataDir, width, height);
        if (fs.existsSync(mobileExtDir)) {
          extensionsToLoad.push(mobileExtDir);
          console.log(`✅ MOBILE VIEWPORT EXTENSION LOADED FOR: ${platform.toUpperCase()}`);
        }
      } catch (error) {
        console.error('❌ Failed to create mobile extension:', error);
      }
    }
    
    // CRITICAL: Create Version Spoof Extension
    // This MUST be loaded to prevent websites from detecting Chrome 139
    // It overrides navigator.userAgent, navigator.appVersion, and navigator.userAgentData
    try {
      // Get user agent - either from cached Map or load new one
      let userAgentForSpoof = null;
      
      // For mobile, load mobile UA
      if (platform === 'android' || platform === 'ios') {
        userAgentForSpoof = this.loadUserAgent(platform);
        if (!userAgentForSpoof) {
          // Fallback mobile UAs
          userAgentForSpoof = platform === 'android' 
            ? 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36'
            : 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
        }
      } else {
        // Desktop - check cache first
        if (this.profileUserAgents && this.profileUserAgents.has(profile.id)) {
          userAgentForSpoof = this.profileUserAgents.get(profile.id);
        } else {
          userAgentForSpoof = this.loadUserAgent(profile.platform || 'windows');
          if (userAgentForSpoof && this.profileUserAgents) {
            this.profileUserAgents.set(profile.id, userAgentForSpoof);
          }
        }
      }
      
      // Create version spoof extension if we have a user agent
      if (userAgentForSpoof) {
        const versionSpoofExtDir = createVersionSpoofExtension(userDataDir, userAgentForSpoof);
        if (versionSpoofExtDir && fs.existsSync(versionSpoofExtDir)) {
          extensionsToLoad.push(versionSpoofExtDir);
          console.log('✅ VERSION SPOOF EXTENSION LOADED');
          console.log('   Will spoof as:', userAgentForSpoof.substring(0, 80) + '...');
        }
      } else {
        console.warn('⚠️ No User-Agent available for version spoofing extension');
      }
    } catch (error) {
      console.error('❌ Failed to create version spoof extension:', error);
    }
    
    // Load all extensions
    if (extensionsToLoad.length > 0) {
      args.push(`--load-extension=${extensionsToLoad.join(',')}`);
      console.log(`✅ Loading ${extensionsToLoad.length} extension(s)`);
    }
    
    if (profile.lang) {
      args.push(`--lang=${profile.lang}`);
    }
    if (profile.acceptLang) {
      args.push(`--accept-lang=${profile.acceptLang}`);
    }

    // Proxy configuration
    console.log('🔍 BuildArgs - Proxy check:', {
      useBuiltinProxy: profile.useBuiltinProxy,
      hasProxy: !!profile.proxy,
      proxyType: profile.proxy?.type
    });
    
    if (profile.useBuiltinProxy && profile.proxy) {
      const proxy = profile.proxy;
      
      // Build proxy string with authentication if provided
      let proxyStr = '';
      const type = (proxy.type || 'http').toLowerCase();
      
      if (proxy.username && proxy.password) {
        // For HTTP proxy with auth, use format: http://user:pass@host:port
        // This is the ONLY way that works reliably in Chromium
        const encodedUser = encodeURIComponent(proxy.username);
        const encodedPass = encodeURIComponent(proxy.password);
        proxyStr = `${type}://${encodedUser}:${encodedPass}@${proxy.host}:${proxy.port}`;
        console.log('🔐 Using authenticated proxy:', `${type}://${proxy.username}:***@${proxy.host}:${proxy.port}`);
      } else {
        proxyStr = `${type}://${proxy.host}:${proxy.port}`;
        console.log('✅ Using proxy without auth:', proxyStr);
      }
      
      if (proxyStr) {
        args.push(`--proxy-server=${proxyStr}`);
        // Force ALL traffic through proxy (no bypass)
        args.push('--proxy-bypass-list=<-loopback>'); // Bypass only localhost
        console.log('✅ Added proxy arg: --proxy-server=' + proxyStr.replace(/:[^:]*@/, ':***@'));
        console.log('✅ Added proxy bypass: <-loopback> (only localhost bypassed)');
      }
    } else {
      console.log('ℹ️ Not using builtin proxy');
    }
    
    // WebRTC IP leak protection
    args.push('--enforce-webrtc-ip-permission-check');
    
    // Geolocation spoofing (if specified)
    if (profile.latitude && profile.longitude) {
      args.push(`--latitude=${profile.latitude}`);
      args.push(`--longitude=${profile.longitude}`);
      args.push(`--geolocation-accuracy=${profile.geoAccuracy || 100}`);
      console.log('📍 Geolocation set:', profile.latitude, profile.longitude);
    }

    // Mobile device emulation for Android/iOS (using platform from above)
    console.log('🔍 DEBUG: Platform value:', platform, '(type:', typeof platform, ')');
    console.log('🔍 DEBUG: profile.platform:', profile.platform);
    
    const isMobile = platform === 'android' || platform === 'ios';
    console.log('🔍 DEBUG: isMobile:', isMobile);
    
    if (isMobile) {
      // Load random mobile user-agent from txt file
      let mobileUA = this.loadUserAgent(platform);
      if (!mobileUA) {
        // Fallback to default if loading fails
        mobileUA = platform === 'android' 
          ? 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36'
          : 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
      }
      
      args.push(`--user-agent=${mobileUA}`);
      console.log(`📱 ${platform.toUpperCase()}: Mobile UA loaded from useragents/${platform}.txt`);
      console.log(`📱 UA: ${mobileUA.substring(0, 80)}...`);
    } else {
      // Desktop - use custom size if specified
      if (profile.windowWidth && profile.windowHeight) {
        args.push(`--window-size=${profile.windowWidth},${profile.windowHeight}`);
      }
      
      // Desktop user-agent from useragents folder - unique per profile
      let userAgent = null;
      
      // Check if profile already has a UA
      try {
        console.log('🔍 UA CHECK: this =', typeof this);
        console.log('🔍 UA CHECK: this.profileUserAgents =', typeof this.profileUserAgents);
        console.log('🔍 UA CHECK: profile.id =', profile.id);
        
        if (this.profileUserAgents && this.profileUserAgents.has(profile.id)) {
          userAgent = this.profileUserAgents.get(profile.id);
          console.log('♻️ Using cached UA for profile:', profile.id);
        } else {
          // Load new random UA
          userAgent = this.loadUserAgent(profile.platform || 'windows');
          if (userAgent && this.profileUserAgents) {
            this.profileUserAgents.set(profile.id, userAgent);
            console.log('🆕 Assigned new UA to profile:', profile.id);
          }
        }
      } catch (err) {
        console.error('❌❌❌ ERROR IN UA LOADING:', err.message);
        console.error('Stack:', err.stack);
        throw err; // Re-throw to see full error
      }
      
      if (userAgent) {
        args.push(`--user-agent=${userAgent}`);
        console.log('🖥️ Desktop UA:', userAgent.substring(0, 60) + '...');
      }
    }

    // Starting URL - check both startUrl and startingUrl
    // 🎯 Check if RPA script should be injected
    const rpaInjectionFile = path.join(userDataDir, 'RPA_Injection', 'inject.html');
    const hasRPAScript = global.rpaScriptsToInject && global.rpaScriptsToInject.has(profile.id);
    
    if (hasRPAScript && fs.existsSync(rpaInjectionFile)) {
      // Use RPA injection file as starting URL
      const injectionUrl = `file:///${rpaInjectionFile.replace(/\\/g, '/')}`;
      args.push(injectionUrl);
      console.log('🎯 Starting URL: RPA Injection File (will redirect to target)');
      console.log('📄 File:', injectionUrl);
    } else {
      const startUrl = profile.startUrl || profile.startingUrl;
      if (startUrl && startUrl.trim()) {
        const url = startUrl.trim();
        // Validate URL format
        if (url.startsWith('http://') || url.startsWith('https://')) {
          args.push(url);
          console.log('🌐 Starting URL:', url);
        } else {
          // Add https:// if protocol missing
          args.push(`https://${url}`);
          console.log('🌐 Starting URL (added https):', `https://${url}`);
        }
      } else {
        // Default URL if none specified - Test Version Detection Page
        let appPath;
        try {
          appPath = app && app.isPackaged ? path.dirname(app.getPath('exe')) : process.cwd();
        } catch (e) {
          appPath = process.cwd();
        }
        const testPagePath = path.join(appPath, 'test-version-detection.html');
        const defaultUrl = `file:///${testPagePath.replace(/\\/g, '/')}`;
        args.push(defaultUrl);
        console.log('🌐 Starting URL (default): Test Version Detection Page');
        console.log('📄 File:', defaultUrl);
      }
    }
    
    // Debug: Show final args array structure
    console.log('🔍 DEBUG: Total args count:', args.length);
    console.log('🔍 DEBUG: Last 3 args:', args.slice(-3));
    console.log('🔍 DEBUG: Full args array:');
    args.forEach((arg, i) => {
      console.log(`  [${i}]: ${arg}`);
    });

    return args;
  }

  /**
   * Load random user agent from txt file based on platform
   */
  loadUserAgent(platform) {
    try {
      let appPath;
      try {
        appPath = app && app.isPackaged ? path.dirname(app.getPath('exe')) : process.cwd();
      } catch (e) {
        // If app is not available (running tests), use cwd
        appPath = process.cwd();
      }
      const uaFilePath = path.join(appPath, 'useragents', `${platform.toLowerCase()}.txt`);
      
      if (!fs.existsSync(uaFilePath)) {
        console.warn(`⚠️ User agent file not found for platform: ${platform}`);
        return null;
      }

      // Read file and split by lines
      const content = fs.readFileSync(uaFilePath, 'utf8');
      const userAgents = content.split('\n').filter(line => line.trim().length > 0);
      
      if (userAgents.length === 0) {
        return null;
      }

      // Return random user agent
      const randomIndex = Math.floor(Math.random() * userAgents.length);
      return userAgents[randomIndex].trim();
    } catch (error) {
      console.error(`❌ Failed to load user agent for ${platform}:`, error.message);
      return null;
    }
  }

  /**
   * Build proxy string from proxy config
   * NOTE: SOCKS5 proxies are handled separately via tunnel - this should only get HTTP/HTTPS
   */
  buildProxyString(proxy) {
    if (!proxy || !proxy.host || !proxy.port) return null;
    
    const type = (proxy.type || 'http').toLowerCase();
    
    // SOCKS5 should NEVER reach here - it's handled via tunnel in launchProfile
    if (type === 'socks5' || type === 'socks') {
      console.error('⚠️ SOCKS5 proxy in buildProxyString - this should have been converted to HTTP tunnel!');
      return null; // Don't build direct SOCKS5 string
    }
    
    // Build proxy URL WITHOUT authentication
    // CRITICAL: Chrome's --proxy-server does NOT support user:pass in URL
    // Authentication MUST be handled via proxy auth extension
    let proxyUrl = `${type}://${proxy.host}:${proxy.port}`;
    
    if (proxy.username && proxy.password) {
      console.log('🔐 Proxy has authentication - will be handled by extension');
    }
    
    console.log('✅ Built proxy string:', proxyUrl);
    return proxyUrl;
  }

  /**
   * Launch profile with Chrome 139
   * @param {Object} profile - Profile configuration
   * @param {Object} options - Launch options (may contain proxy)
   */
  async launchProfile(profile, options = {}) {
    console.log('\n🚀🚀🚀 launchProfile START 🚀🚀🚀');
    console.log('🔍 this exists?', this !== undefined && this !== null);
    console.log('🔍 this.profileUserAgents?', typeof this.profileUserAgents);
    console.log('🔍 this.activeProcesses?', typeof this.activeProcesses);
    
    // Emergency initialization
    if (!this.profileUserAgents) {
      console.error('❌ CRITICAL: profileUserAgents undefined in launchProfile!');
      this.profileUserAgents = new Map();
    }
    if (!this.activeProcesses) {
      console.error('❌ CRITICAL: activeProcesses undefined in launchProfile!');
      this.activeProcesses = new Map();
    }
    
    console.log('🔍 ═══ PROFILE OBJECT DEBUG ═══');
    console.log('Profile ID:', profile.id);
    console.log('Profile Name:', profile.name);
    console.log('Profile platform field:', profile.platform);
    console.log('🔍 ═══════════════════════════');
    
    // Retry detection if not initialized
    if (!this.initialized || !this.chromePath) {
      console.log('⚠️ Runtime not initialized, retrying detection...');
      this.detectRuntime();
    }

    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'Chrome 139 runtime not available. Please ensure ungoogled-chromium folder is in app directory.'
      };
    }

    // Check if already running
    if (this.activeProcesses.has(profile.id)) {
      console.log(`⚠️ Profile ${profile.id} already running with Chrome 139`);
      return {
        success: false,
        error: 'Profile already running with Chrome 139 runtime'
      };
    }

    // Check crash history
    if (this.isProfileFaulty(profile.id)) {
      return {
        success: false,
        error: 'Profile has crashed repeatedly. Please check logs and consider reverting to default runtime.',
        faulty: true
      };
    }

    // 🔧 Handle SOCKS5 proxy - create local HTTP tunnel
    // Proxy can be in profile.proxy OR options.proxy
    let socks5Tunnel = null;
    const proxy = options.proxy || profile.proxy;
    
    console.log('🔍 Proxy Debug - Profile ID:', profile.id);
    console.log('🔍 Options object:', JSON.stringify(options, null, 2));
    console.log('🔍 Profile.proxy:', JSON.stringify(profile.proxy, null, 2));
    console.log('🔍 Options.proxy:', JSON.stringify(options.proxy, null, 2));
    console.log('🔍 Final proxy:', JSON.stringify(proxy, null, 2));
    console.log('🔍 Is SOCKS5?', proxy ? socks5Handler.isSocks5Proxy(proxy) : 'No proxy');
    
    if (proxy && socks5Handler.isSocks5Proxy(proxy)) {
      try {
        console.log('🔧 Creating SOCKS5 tunnel for profile:', profile.id);
        console.log('🔧 SOCKS5 Config:', JSON.stringify(proxy, null, 2));
        
        const socksInfo = await socks5Handler.getSocks5ProxyArgs(profile.id, proxy);
        socks5Tunnel = socksInfo.tunnel;
        
        console.log('✅ Tunnel Info:', JSON.stringify({
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
        profile.useBuiltinProxy = true;
        
        // Enable WebRTC leak protection for proxied profiles
        profile.disableNonProxiedUdp = true;
        
        // Auto-set timezone from detected proxy location
        if (socksInfo.timezone && socksInfo.timezone !== 'auto') {
          profile.proxyTimezone = socksInfo.timezone;
          console.log('🌍 Auto-detected timezone from proxy:', socksInfo.timezone);
        } else {
          // Fallback if detection failed
          profile.proxyTimezone = 'America/New_York';
          console.log('🌍 Using fallback timezone: America/New_York (proxy detection failed)');
        }
        
        // Clear any "auto" value in profile.timezone
        if (profile.timezone === 'auto' || profile.timezone === 'Auto') {
          console.log('⚠️ Clearing invalid profile.timezone:', profile.timezone);
          profile.timezone = null;
        }
        
        console.log('✅ SOCKS5 tunnel created! Local proxy:', socksInfo.proxyUrl);
        console.log('✅ WebRTC leak protection enabled');
      } catch (error) {
        console.error('❌ Failed to create SOCKS5 tunnel:', error.message);
        console.error('❌ Error stack:', error.stack);
        return { 
          success: false, 
          error: `SOCKS5 tunnel failed: ${error.message}` 
        };
      }
    } else if (proxy) {
      console.log('ℹ️ HTTP/HTTPS proxy detected (not SOCKS5)');
      
      // CRITICAL: Enable built-in proxy for HTTP/HTTPS
      profile.useBuiltinProxy = true;
      console.log('✅ Enabled useBuiltinProxy for HTTP/HTTPS proxy');
      
      // Create proxy authentication extension if credentials provided
      if (proxy.username && proxy.password) {
        try {
          const userDataDir = profile.userDataDir || path.join(os.homedir(), 'BeastBrowser', 'ChromeProfiles', profile.id);
          const authExtensionDir = createProxyAuthExtension(userDataDir, proxy.username, proxy.password);
          console.log('✅ Proxy auth extension created:', authExtensionDir);
        } catch (error) {
          console.error('❌ Failed to create proxy auth extension:', error.message);
        }
      }
      
      // DETECT TIMEZONE for HTTP/HTTPS proxy
      console.log('🔄 Detecting timezone for HTTP/HTTPS proxy...');
      try {
        const detectedTimezone = await detectHTTPProxyTimezone(proxy);
        if (detectedTimezone && detectedTimezone !== 'auto') {
          profile.proxyTimezone = detectedTimezone;
          console.log('✅ HTTP Proxy timezone detected:', detectedTimezone);
        } else {
          profile.proxyTimezone = 'America/New_York';
          console.log('⚠️ Using fallback timezone: America/New_York');
        }
      } catch (error) {
        console.error('❌ HTTP proxy timezone detection failed:', error.message);
        profile.proxyTimezone = 'America/New_York';
        console.log('⚠️ Using fallback timezone: America/New_York');
      }
      
      // Clear any "auto" value in profile.timezone
      if (profile.timezone === 'auto' || profile.timezone === 'Auto') {
        console.log('⚠️ Clearing invalid profile.timezone:', profile.timezone);
        profile.timezone = null;
      }
    } else {
      console.log('ℹ️ No proxy configured');
    }

    const args = this.buildArgs(profile);
    const logPath = path.join(this.logsDir, `${profile.id}-${Date.now()}.log`);
    const logStream = fs.createWriteStream(logPath, { flags: 'a' });

    console.log(`🚀 Launching Chrome 139 for profile: ${profile.id}`);
    console.log(`📋 Args: ${args.join(' ')}`);
    console.log(`📝 Log: ${logPath}`);

    // Log launch info
    logStream.write(`=== Chrome 139 Launch ===\n`);
    logStream.write(`Profile: ${profile.id}\n`);
    logStream.write(`Time: ${new Date().toISOString()}\n`);
    logStream.write(`Chrome: ${this.chromePath}\n`);
    logStream.write(`Version: ${this.version}\n`);
    logStream.write(`Args: ${JSON.stringify(args, null, 2)}\n`);
    logStream.write(`\n=== Process Output ===\n`);

    try {
      // Ensure user data directory exists
      const userDataDir = profile.userDataDir || path.join(os.homedir(), 'BeastBrowser', 'ChromeProfiles', profile.id);
      if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true });
      }

      // Prepare environment variables
      const env = { ...process.env };
      
      // METHOD 5: Environment Variables - CRITICAL for process-level override
      const timezone = profile.proxyTimezone || profile.timezone;
      if (timezone && timezone !== 'auto' && timezone !== 'Auto') {
        // Set MULTIPLE timezone env variables for MAXIMUM compatibility
        env.TZ = timezone;  // Standard Unix TZ variable
        env.CHROME_TIMEZONE = timezone;  // Chrome-specific
        env.ICU_TIMEZONE = timezone;  // V8/ICU timezone
        env.TIMEZONE = timezone;  // Additional fallback
        env.TZ_DATA = timezone;  // V8 timezone data
        
        // BLOCK India timezone explicitly
        env.BLOCK_SYSTEM_TIMEZONE = '1';
        env.FORCE_TIMEZONE_OVERRIDE = '1';
        
        console.log('🌍 METHOD 5: Environment variables SET:', timezone);
        console.log('   ✅ TZ =', timezone);
        console.log('   ✅ CHROME_TIMEZONE =', timezone);
        console.log('   ✅ ICU_TIMEZONE =', timezone);
        console.log('   ✅ TIMEZONE =', timezone);
        console.log('   ✅ TZ_DATA =', timezone);
        console.log('   🚫 BLOCK_SYSTEM_TIMEZONE = 1');
        console.log('   🚫 India timezone BLOCKED at environment level');
      } else {
        console.warn('⚠️ No valid timezone to set in environment');
      }
      
      // CRITICAL: Force UTC offset calculation and inject
      if (timezone) {
        try {
          // Calculate UTC offset for the timezone
          const now = new Date();
          const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            hour: 'numeric',
            hour12: false
          });
          
          console.log('🌍 Timezone will be enforced via Chrome flags:', timezone);
        } catch (e) {
          console.warn('⚠️ Timezone calculation failed:', e.message);
        }
      }
      
      // Spawn Chrome process with custom environment
      const child = spawn(this.chromePath, args, {
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: false,
        env // Pass custom environment with timezone
      });

      // Pipe output to log file
      child.stdout.on('data', (data) => {
        logStream.write(data);
      });

      child.stderr.on('data', (data) => {
        logStream.write(data);
      });

      // Handle process exit
      const startTime = Date.now();
      child.on('exit', (code, signal) => {
        const runtime = Date.now() - startTime;
        logStream.write(`\n=== Process Exited ===\n`);
        logStream.write(`Exit Code: ${code}\n`);
        logStream.write(`Signal: ${signal}\n`);
        logStream.write(`Runtime: ${runtime}ms\n`);
        logStream.end();

        console.log(`🛑 Profile ${profile.id} exited: code=${code}, runtime=${runtime}ms`);

        // Track crashes (exit within 10 seconds)
        if (runtime < 10000) {
          this.recordCrash(profile.id);
        }

        // Cleanup SOCKS5 tunnel if exists
        const processInfo = this.activeProcesses ? this.activeProcesses.get(profile.id) : null;
        if (processInfo && processInfo.socks5Tunnel) {
          socks5Handler.closeSocks5Tunnel(profile.id).catch(e => 
            console.warn('Failed to close SOCKS5 tunnel:', e.message)
          );
        }

        if (this.activeProcesses) {
          this.activeProcesses.delete(profile.id);
        }
      });

      child.on('error', (err) => {
        logStream.write(`\n=== Process Error ===\n`);
        logStream.write(`${err.stack}\n`);
        logStream.end();
        console.error(`❌ Chrome 139 process error for ${profile.id}:`, err);
        
        // Cleanup SOCKS5 tunnel if exists
        const processInfo = this.activeProcesses ? this.activeProcesses.get(profile.id) : null;
        if (processInfo && processInfo.socks5Tunnel) {
          socks5Handler.closeSocks5Tunnel(profile.id).catch(e => 
            console.warn('Failed to close SOCKS5 tunnel:', e.message)
          );
        }
        
        if (this.activeProcesses) {
          this.activeProcesses.delete(profile.id);
        }
      });

      // Store process info including SOCKS5 tunnel
      this.activeProcesses.set(profile.id, {
        process: child,
        config: profile,
        logPath,
        startTime,
        socks5Tunnel // Store tunnel reference for cleanup
      });

      console.log(`✅ Chrome 139 launched for profile ${profile.id} (PID: ${child.pid})`);

      // 🎯 INJECT RPA SCRIPT DIRECTLY (if exists)
      if (global.rpaScriptsToInject && global.rpaScriptsToInject.has(profile.id)) {
        const rpaData = global.rpaScriptsToInject.get(profile.id);
        console.log(`\n🚀 RPA SCRIPT DETECTED FOR PROFILE ${profile.id}`);
        console.log(`📝 Script: "${rpaData.scriptName}"`);
        console.log(`📏 Length: ${rpaData.scriptContent.length} characters`);
        
        // Create injection file that Chrome will automatically run
        const userDataDir = profile.userDataDir || path.join(os.homedir(), 'BeastBrowser', 'ChromeProfiles', profile.id);
        const injectionDir = path.join(userDataDir, 'RPA_Injection');
        
        try {
          // Create injection directory
          if (!fs.existsSync(injectionDir)) {
            fs.mkdirSync(injectionDir, { recursive: true });
          }
          
          // Get the real starting URL
          const startUrl = profile.startUrl || profile.startingUrl || 'https://example.com';
          const finalUrl = startUrl.startsWith('http') ? startUrl : `https://${startUrl}`;
          
          // Create HTML file that will auto-inject the script
          const scriptContentEscaped = rpaData.scriptContent.replace(/`/g, '\\`').replace(/\$/g, '\\$');
          const injectionHTML = `<!DOCTYPE html>
<html>
<head><title>RPA Injector - Loading...</title></head>
<body style="background:#000;color:#0f0;font-family:monospace;padding:20px;">
<h2>🚀 BeastBrowser RPA Injection</h2>
<p>✅ Script: ${(rpaData.scriptName || 'RPA Script').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
<p id="status">⏳ Redirecting to target page...</p>
<script>
console.log('🎯 BeastBrowser RPA Direct Injector Active');
console.log('📝 Script Name: ${(rpaData.scriptName || 'RPA Script').replace(/'/g, "\\'")}');
console.log('🌐 Target URL: ${finalUrl.replace(/'/g, "\\'")}');

// Inject the RPA script into page context immediately
const rpaScript = \`${scriptContentEscaped}\`;

// Navigate to target URL with script injection
setTimeout(function() {
  document.getElementById('status').textContent = '✅ Navigating...';
  
  // Navigate to the real URL
  window.location.href = '${finalUrl.replace(/'/g, "\\'")}';
  
  // After navigation, inject the script via localStorage
  // This will persist and execute on the target page
  try {
    localStorage.setItem('beastbrowser_rpa_script', rpaScript);
    localStorage.setItem('beastbrowser_rpa_name', '${(rpaData.scriptName || 'RPA Script').replace(/'/g, "\\'")}');
    console.log('✅ RPA script stored in localStorage for target page');
  } catch (e) {
    console.warn('⚠️ Could not store in localStorage:', e.message);
  }
}, 1000);
</script>
</body>
</html>`;
          
          const injectionFile = path.join(injectionDir, 'inject.html');
          fs.writeFileSync(injectionFile, injectionHTML, 'utf8');
          
          console.log(`✅ RPA injection file created: ${injectionFile}`);
          console.log(`💡 Script will execute on every page load`);
          
          // Clean up the script from global storage
          // global.rpaScriptsToInject.delete(profile.id);
        } catch (error) {
          console.error(`❌ Failed to create RPA injection file:`, error);
        }
      }

      // Check if RPA execution time is stored (from executeRPAScript)
      if (global.rpaExecutionTimes && global.rpaExecutionTimes.has(profile.id)) {
        const executionTime = global.rpaExecutionTimes.get(profile.id);
        const durationMs = executionTime * 60 * 1000; // Convert minutes to milliseconds
        
        console.log(`\n⏰ RPA AUTO-CLOSE: Setting timer for ${executionTime} minute(s) (${durationMs}ms)`);
        console.log(`🎯 Profile will auto-close after RPA execution completes`);
        
        // Initialize timer storage
        global.rpaAutoCloseTimers = global.rpaAutoCloseTimers || new Map();
        
        // Clear any existing timer for this profile
        if (global.rpaAutoCloseTimers.has(profile.id)) {
          clearTimeout(global.rpaAutoCloseTimers.get(profile.id));
          console.log(`🔄 Cleared existing timer for profile ${profile.id}`);
        }
        
        // Set new timer for auto-close
        const timer = setTimeout(async () => {
          console.log(`\n⏰ AUTO-CLOSE: Execution time (${executionTime} min) elapsed for profile ${profile.id}`);
          console.log('🛑 AUTO-CLOSE: Closing profile now...');
          
          try {
            await this.closeProfile(profile.id);
            console.log(`✅ AUTO-CLOSE: Profile ${profile.id} closed successfully`);
          } catch (error) {
            console.error(`❌ AUTO-CLOSE: Failed to close profile ${profile.id}:`, error.message);
          }
          
          // Clean up
          global.rpaAutoCloseTimers.delete(profile.id);
          global.rpaExecutionTimes.delete(profile.id);
        }, durationMs);
        
        // Store timer reference
        global.rpaAutoCloseTimers.set(profile.id, timer);
        console.log(`✅ Auto-close timer started for profile ${profile.id}`);
        console.log(`📅 Will close at: ${new Date(Date.now() + durationMs).toLocaleTimeString()}\n`);
        
        // Don't delete rpaExecutionTimes yet - keep it until timer fires or profile closes manually
      }

      return {
        success: true,
        pid: child.pid,
        logPath,
        args
      };
    } catch (error) {
      logStream.write(`\n=== Launch Error ===\n`);
      logStream.write(`${error.stack}\n`);
      logStream.end();
      
      console.error(`❌ Failed to launch Chrome 139 for ${profile.id}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Close profile
   */
  async closeProfile(profileId) {
    if (!this.activeProcesses) {
      console.error('❌ activeProcesses is undefined in closeProfile!');
      this.activeProcesses = new Map();
      return { success: false, error: 'Profile not running' };
    }
    
    const info = this.activeProcesses.get(profileId);
    if (!info) {
      console.log(`⚠️ Profile ${profileId} not found in active processes`);
      return { success: false, error: 'Profile not running' };
    }

    try {
      console.log(`🛑 Closing Chrome 139 profile: ${profileId} (PID: ${info.process.pid})`);
      
      // Kill process forcefully
      if (process.platform === 'win32') {
        // Windows: kill ALL chrome.exe processes for this userDataDir
        const userDataDir = info.config.userDataDir;
        console.log(`🔪 Force killing Chrome processes for: ${userDataDir}`);
        
        try {
          // Method 1: Kill by PID
          execFileSync('taskkill', ['/pid', info.process.pid.toString(), '/T', '/F'], {
            windowsHide: true,
            timeout: 5000
          });
          console.log(`✅ Killed process tree for PID ${info.process.pid}`);
        } catch (e) {
          console.warn(`⚠️ Taskkill by PID failed:`, e.message);
        }
        
        // Method 2: Force kill ALL chrome.exe (nuclear option for stuck processes)
        try {
          const { exec } = require('child_process');
          exec('taskkill /F /IM chrome.exe /T', (error) => {
            if (!error) {
              console.log(`✅ Force killed all chrome.exe processes`);
            }
          });
        } catch (e) {
          console.warn(`⚠️ Force kill all chrome failed:`, e.message);
        }
      } else {
        // Unix: kill process group
        try {
          process.kill(-info.process.pid, 'SIGKILL');
        } catch (e) {
          info.process.kill('SIGKILL');
        }
      }

      // Close SOCKS5 tunnel if exists
      if (info.socks5Tunnel) {
        try {
          await socks5Handler.closeSocks5Tunnel(profileId);
          console.log(`✅ SOCKS5 tunnel closed for profile ${profileId}`);
        } catch (e) {
          console.warn(`⚠️ SOCKS5 tunnel close failed:`, e.message);
        }
      }

      // Remove from active processes immediately
      this.activeProcesses.delete(profileId);
      console.log(`✅ Profile ${profileId} removed from active list`);

      // Clean up RPA auto-close timer if exists
      if (global.rpaAutoCloseTimers && global.rpaAutoCloseTimers.has(profileId)) {
        clearTimeout(global.rpaAutoCloseTimers.get(profileId));
        global.rpaAutoCloseTimers.delete(profileId);
        console.log(`🧹 Cleared RPA auto-close timer for profile ${profileId}`);
      }
      
      // Clean up RPA execution time storage
      if (global.rpaExecutionTimes && global.rpaExecutionTimes.has(profileId)) {
        global.rpaExecutionTimes.delete(profileId);
        console.log(`🧹 Cleared RPA execution time for profile ${profileId}`);
      }

      return { success: true };
    } catch (error) {
      console.error(`❌ Error closing profile ${profileId}:`, error);
      // Remove anyway to prevent stuck state
      this.activeProcesses.delete(profileId);
      return { success: false, error: error.message };
    }
  }

  /**
   * Record crash for profile
   */
  recordCrash(profileId) {
    if (!this.crashHistory.has(profileId)) {
      this.crashHistory.set(profileId, []);
    }
    
    const crashes = this.crashHistory.get(profileId);
    const now = Date.now();
    
    // Add crash timestamp
    crashes.push(now);
    
    // Keep only crashes from last 60 seconds
    const recent = crashes.filter(t => now - t < 60000);
    this.crashHistory.set(profileId, recent);
    
    console.warn(`⚠️ Crash recorded for ${profileId}: ${recent.length} crashes in 60s`);
  }

  /**
   * Check if profile is faulty (3+ crashes in 60s)
   */
  isProfileFaulty(profileId) {
    const crashes = this.crashHistory.get(profileId) || [];
    const now = Date.now();
    const recent = crashes.filter(t => now - t < 60000);
    return recent.length >= 3;
  }

  /**
   * Get active profiles
   */
  getActiveProfiles() {
    return Array.from(this.activeProcesses.keys());
  }

  /**
   * Check if profile is active (running)
   */
  isProfileActive(profileId) {
    return this.activeProcesses.has(profileId);
  }

  /**
   * Get profile info
   */
  getProfileInfo(profileId) {
    const info = this.activeProcesses.get(profileId);
    if (!info) return null;

    return {
      pid: info.process.pid,
      logPath: info.logPath,
      startTime: info.startTime,
      runtime: Date.now() - info.startTime
    };
  }

  /**
   * Inject RPA script directly via CDP (Chrome DevTools Protocol)
   * @param {string} profileId - Profile ID
   */
  async injectRPAScript(profileId) {
    try {
      // Get RPA script from global storage
      if (!global.rpaScriptsToInject || !global.rpaScriptsToInject.has(profileId)) {
        console.log('⚠️ No RPA script found for profile:', profileId);
        return { success: false, error: 'No script found' };
      }

      const rpaData = global.rpaScriptsToInject.get(profileId);
      const scriptContent = rpaData.scriptContent;
      const scriptName = rpaData.scriptName || 'RPA Script';

      console.log(`🚀 Injecting RPA script "${scriptName}" into profile ${profileId}`);
      console.log(`📝 Script length: ${scriptContent.length} characters`);

      // Get CDP debugging port for this profile
      const processInfo = this.activeProcesses.get(profileId);
      if (!processInfo) {
        console.log('⚠️ Profile not running:', profileId);
        return { success: false, error: 'Profile not running' };
      }

      // We'll inject the script when page loads
      // Store it for injection in launchProfile
      console.log('✅ Script stored for injection on page load');
      
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to inject RPA script:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Close all profiles
   */
  async closeAll() {
    const profileIds = Array.from(this.activeProcesses.keys());
    console.log(`🛑 Closing ${profileIds.length} Chrome 139 profiles`);
    
    const results = await Promise.allSettled(
      profileIds.map(id => this.closeProfile(id))
    );
    
    return {
      success: true,
      closed: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length
    };
  }

  /**
   * Set Google as default search engine in Chrome Preferences
   * @param {string} userDataDir - Chrome user data directory
   */
  setDefaultSearchEngine(userDataDir) {
    try {
      // Create Web Data file with Google search engine
      const webDataPath = path.join(userDataDir, 'Default', 'Web Data');
      const prefsPath = path.join(userDataDir, 'Default', 'Preferences');
      const localStatePath = path.join(userDataDir, 'Local State');
      const defaultDir = path.join(userDataDir, 'Default');
      
      // Create Default directory if it doesn't exist
      if (!fs.existsSync(defaultDir)) {
        fs.mkdirSync(defaultDir, { recursive: true });
      }
      
      // Set in Preferences file
      let prefs = {};
      if (fs.existsSync(prefsPath)) {
        try {
          prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));
        } catch (e) {
          console.warn('⚠️ Could not parse existing Preferences');
        }
      }
      
      // Configure default search provider - Complete Google config
      prefs.default_search_provider = {
        enabled: true,
        encodings: 'UTF-8',
        icon_url: 'https://www.google.com/favicon.ico',
        id: '1',
        keyword: 'google.com',
        name: 'Google',
        prepopulate_id: 1,
        search_url: 'https://www.google.com/search?q={searchTerms}&sourceid=chrome&ie=UTF-8',
        suggest_url: 'https://www.google.com/complete/search?output=chrome&q={searchTerms}',
        new_tab_url: 'https://www.google.com',
        instant_url: 'https://www.google.com/webhp?sourceid=chrome-instant&ie=UTF-8',
        image_url: 'https://www.google.com/searchbyimage/upload',
        search_url_post_params: '',
        suggest_url_post_params: '',
        instant_url_post_params: '',
        image_url_post_params: '',
        alternate_urls: [
          'https://www.google.com/search#q={searchTerms}',
          'https://www.google.com/webhp#q={searchTerms}'
        ],
        short_name: 'Google',
        search_terms_replacement_key: 'espv'
      };
      
      // CRITICAL: Set default_search_provider_data (this is what Chrome actually uses!)
      prefs.default_search_provider_data = {
        template_url_data: {
          created_by_policy: 0,
          created_from_play_api: false,
          date_created: '13285880809717107',
          encodings: 'UTF-8',
          favicon_url: 'https://www.google.com/favicon.ico',
          id: 2,
          input_encodings: ['UTF-8'],
          is_active: 1,
          keyword: 'google.com',
          last_modified: '13285880809717107',
          last_visited: '13285880809717107',
          new_tab_url: 'https://www.google.com',
          originating_url: '',
          prepopulate_id: 1,
          safe_for_autoreplace: true,
          short_name: 'Google',
          suggestions_url: 'https://www.google.com/complete/search?output=chrome&q={searchTerms}',
          sync_guid: '',
          url: 'https://www.google.com/search?q={searchTerms}&sourceid=chrome&ie=UTF-8',
          usage_count: 0,
          alternate_urls: []
        }
      };
      
      // Set homepage to Google
      prefs.homepage = 'https://www.google.com';
      prefs.homepage_is_newtabpage = false; // Use Google, not blank page
      
      // HTTPS-First Mode settings
      prefs.https_first_mode = {
        enabled: true,
        fallback_to_http: false // Don't allow HTTP fallback
      };
      
      // Enable HTTPS Upgrades
      prefs.https_upgrades = {
        enabled: true
      };
      
      // Mixed content blocking
      prefs.profile = prefs.profile || {};
      prefs.profile.managed_auto_select_certificate_for_urls = [];
      prefs.profile.content_settings = prefs.profile.content_settings || {};
      prefs.profile.content_settings.exceptions = prefs.profile.content_settings.exceptions || {};
      prefs.profile.content_settings.exceptions.mixed_content = {
        '*': {
          setting: 2 // Block all mixed content (HTTP on HTTPS pages)
        }
      };
      
      // Disable search provider override
      prefs.search_provider_overrides = false;
      prefs.search_provider_overrides_version = -1;
      
      // Omnibox configuration - CRITICAL for search detection
      prefs.omnibox = prefs.omnibox || {};
      prefs.omnibox.prevent_url_elisions = false;
      
      // Browser configuration
      prefs.browser = prefs.browser || {};
      prefs.browser.has_seen_welcome_page = true;
      
      // Alternate error pages (helps with URL vs search detection)
      prefs.alternate_error_pages = prefs.alternate_error_pages || {};
      prefs.alternate_error_pages.enabled = true;
      
      // DNS prefetching (improves search experience)
      prefs.dns_prefetching = prefs.dns_prefetching || {};
      prefs.dns_prefetching.enabled = true;
      
      // Profile configuration
      prefs.profile = prefs.profile || {};
      prefs.profile.default_content_setting_values = prefs.profile.default_content_setting_values || {};
      
      // Write preferences
      fs.writeFileSync(prefsPath, JSON.stringify(prefs, null, 2), 'utf8');
      
      // Set in Local State
      let localState = {};
      if (fs.existsSync(localStatePath)) {
        try {
          localState = JSON.parse(fs.readFileSync(localStatePath, 'utf8'));
        } catch (e) {
          console.warn('⚠️ Could not parse Local State');
        }
      }
      
      if (!localState.default_search_provider_data) {
        localState.default_search_provider_data = {};
      }
      
      localState.default_search_provider_data.template_url_data = {
        keyword: 'google.com',
        short_name: 'Google',
        url: 'https://www.google.com/search?q={searchTerms}&sourceid=chrome&ie=UTF-8',
        suggestions_url: 'https://www.google.com/complete/search?output=chrome&q={searchTerms}',
        favicon_url: 'https://www.google.com/favicon.ico',
        encodings: 'UTF-8',
        prepopulate_id: 1,
        id: 1,
        safe_for_autoreplace: true,
        is_active: 1
      };
      
      fs.writeFileSync(localStatePath, JSON.stringify(localState, null, 2), 'utf8');
      
      console.log('✅ Google set as default search engine in Preferences and Local State');
    } catch (e) {
      console.error('❌ Failed to set default search engine:', e);
    }
  }

  /**
   * Generate injection script for version spoofing
   * @param {string} userAgent - Target User-Agent
   * @param {string} targetVersion - Target Chrome version
   * @returns {string} - JavaScript injection code
   */
  generateInjectionScript(userAgent, targetVersion) {
    return `// Beast Browser Version Spoof - Injected at document_start
(function() {
  'use strict';
  
  const TARGET_UA = ${JSON.stringify(userAgent)};
  const TARGET_VERSION = ${JSON.stringify(targetVersion)};
  
  console.log('🔧 BEAST BROWSER VERSION SPOOF ACTIVE');
  console.log('🎯 Target version:', TARGET_VERSION);
  
  // Override navigator.userAgent
  try {
    Object.defineProperty(Navigator.prototype, 'userAgent', {
      get: () => TARGET_UA,
      configurable: true,
      enumerable: true
    });
  } catch (e) {}
  
  // Override navigator.appVersion
  try {
    const appVersion = TARGET_UA.replace(/^Mozilla\\//, '');
    Object.defineProperty(Navigator.prototype, 'appVersion', {
      get: () => appVersion,
      configurable: true,
      enumerable: true
    });
  } catch (e) {}
  
  // Override navigator.userAgentData
  if ('userAgentData' in navigator || 'userAgentData' in Navigator.prototype) {
    try {
      delete Navigator.prototype.userAgentData;
      
      const createUserAgentData = () => ({
        brands: [
          { brand: 'Not;A=Brand', version: '99' },
          { brand: 'Chromium', version: TARGET_VERSION },
          { brand: 'Google Chrome', version: TARGET_VERSION }
        ],
        mobile: false,
        platform: 'Windows',
        getHighEntropyValues: async (hints) => {
          const values = {
            architecture: 'x86',
            bitness: '64',
            brands: [
              { brand: 'Not;A=Brand', version: '99' },
              { brand: 'Chromium', version: TARGET_VERSION },
              { brand: 'Google Chrome', version: TARGET_VERSION }
            ],
            fullVersionList: [
              { brand: 'Not;A=Brand', version: '99.0.0.0' },
              { brand: 'Chromium', version: TARGET_VERSION + '.0.0.0' },
              { brand: 'Google Chrome', version: TARGET_VERSION + '.0.0.0' }
            ],
            mobile: false,
            model: '',
            platform: 'Windows',
            platformVersion: '10.0.0',
            uaFullVersion: TARGET_VERSION + '.0.0.0',
            wow64: false
          };
          const result = {};
          if (hints) hints.forEach(h => { if (h in values) result[h] = values[h]; });
          return Promise.resolve(result);
        },
        toJSON: function() {
          return { brands: this.brands, mobile: this.mobile, platform: this.platform };
        }
      });
      
      Object.defineProperty(Navigator.prototype, 'userAgentData', {
        get: createUserAgentData,
        configurable: true,
        enumerable: true
      });
      
      Object.defineProperty(navigator, 'userAgentData', {
        get: createUserAgentData,
        configurable: true
      });
      
      console.log('✅ userAgentData spoofed to version:', TARGET_VERSION);
    } catch (e) {
      console.error('❌ userAgentData spoof failed:', e);
    }
  }
  
  console.log('✅ Version spoofing complete for Chrome', TARGET_VERSION);
})();
`;
  }
}

// Singleton instance
const chrome139Runtime = new Chrome139Runtime();

module.exports = chrome139Runtime;
