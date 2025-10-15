/**
 * Profile Manager - Advanced Anti-Detection System
 * 
 * Manages isolated browser profiles with per-profile:
 * - Persistent data directories
 * - Proxy configuration
 * - User-Agent randomization
 * - Canvas/WebGL fingerprint protection
 * - WebRTC IP masking
 * - Font/Plugin spoofing
 * - Screen size randomization
 * 
 * @author Beast Browser Team
 * @license MIT
 */

const { app, BrowserWindow, session } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

class ProfileManager {
  constructor() {
    this.profiles = new Map(); // profileId -> { window, config, session }
    this.profilesDir = path.join(app.getPath('userData'), 'Profiles');
    
    // Ensure profiles directory exists
    if (!fs.existsSync(this.profilesDir)) {
      fs.mkdirSync(this.profilesDir, { recursive: true });
    }
    
    console.log('📁 Profile Manager initialized');
    console.log('📂 Profiles directory:', this.profilesDir);
  }

  /**
   * Generate deterministic seed from profile ID
   * Same profile = same seed = consistent fingerprint
   */
  generateSeed(profileId) {
    return crypto.createHash('sha256').update(profileId).digest('hex').substring(0, 16);
  }

  /**
   * Get realistic User-Agent based on platform
   */
  getRandomUserAgent(platform = 'windows', mobile = false) {
    const userAgents = {
      windows: [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
      ],
      macos: [
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ],
      linux: [
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
      ],
      android: [
        'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        'Mozilla/5.0 (Linux; Android 12; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36',
        'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
      ],
      ios: [
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1'
      ]
    };

    const platformAgents = userAgents[platform] || userAgents.windows;
    return platformAgents[Math.floor(Math.random() * platformAgents.length)];
  }

  /**
   * Get random screen size based on platform
   */
  getRandomScreenSize(platform = 'windows', mobile = false) {
    const sizes = {
      windows: [
        { width: 1920, height: 1080, devicePixelRatio: 1 },
        { width: 1366, height: 768, devicePixelRatio: 1 },
        { width: 1536, height: 864, devicePixelRatio: 1.25 },
        { width: 2560, height: 1440, devicePixelRatio: 1 },
        { width: 1440, height: 900, devicePixelRatio: 1 }
      ],
      macos: [
        { width: 1440, height: 900, devicePixelRatio: 2 },
        { width: 1680, height: 1050, devicePixelRatio: 2 },
        { width: 1920, height: 1080, devicePixelRatio: 2 },
        { width: 2560, height: 1440, devicePixelRatio: 2 }
      ],
      linux: [
        { width: 1920, height: 1080, devicePixelRatio: 1 },
        { width: 1600, height: 900, devicePixelRatio: 1 },
        { width: 1366, height: 768, devicePixelRatio: 1 }
      ],
      android: [
        { width: 412, height: 915, devicePixelRatio: 2.625 },
        { width: 360, height: 800, devicePixelRatio: 3 },
        { width: 393, height: 851, devicePixelRatio: 2.75 }
      ],
      ios: [
        { width: 390, height: 844, devicePixelRatio: 3 },
        { width: 428, height: 926, devicePixelRatio: 3 },
        { width: 375, height: 812, devicePixelRatio: 3 }
      ]
    };

    const platformSizes = sizes[platform] || sizes.windows;
    return platformSizes[Math.floor(Math.random() * platformSizes.length)];
  }

  /**
   * Generate random font list
   */
  getRandomFonts(platform = 'windows') {
    const baseFonts = [
      'Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Verdana',
      'Georgia', 'Palatino', 'Garamond', 'Bookman', 'Comic Sans MS',
      'Trebuchet MS', 'Arial Black', 'Impact'
    ];

    const platformFonts = {
      windows: ['Segoe UI', 'Calibri', 'Cambria', 'Consolas', 'Candara'],
      macos: ['San Francisco', 'Helvetica Neue', 'Lucida Grande', 'Monaco'],
      linux: ['Ubuntu', 'Liberation Sans', 'DejaVu Sans', 'Noto Sans']
    };

    const fonts = [...baseFonts, ...(platformFonts[platform] || platformFonts.windows)];
    
    // Randomize order and select subset
    const shuffled = fonts.sort(() => Math.random() - 0.5);
    const count = 15 + Math.floor(Math.random() * 10); // 15-25 fonts
    return shuffled.slice(0, count);
  }

  /**
   * Create profile configuration
   */
  createProfileConfig(profileId, options = {}) {
    const platform = options.platform || 'windows';
    const mobile = options.mobile || false;
    const screenSize = this.getRandomScreenSize(platform, mobile);

    return {
      id: profileId,
      platform,
      mobile,
      userAgent: options.userAgent || this.getRandomUserAgent(platform, mobile),
      proxy: options.proxy || null,
      maskWebRTC: options.maskWebRTC !== false, // Default true
      fingerprintSeed: this.generateSeed(profileId),
      screenSize,
      fonts: this.getRandomFonts(platform),
      plugins: this.getRandomPlugins(platform),
      languages: options.languages || ['en-US', 'en'],
      timezone: options.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      hardwareConcurrency: options.hardwareConcurrency || (mobile ? 4 : 8),
      deviceMemory: options.deviceMemory || (mobile ? 4 : 8),
      maxTouchPoints: mobile ? 5 : 0
    };
  }

  /**
   * Get random plugin list
   */
  getRandomPlugins(platform = 'windows') {
    const plugins = {
      windows: [
        { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
        { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
        { name: 'Chromium PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
        { name: 'Microsoft Edge PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
        { name: 'WebKit built-in PDF', filename: 'internal-pdf-viewer', description: 'Portable Document Format' }
      ],
      macos: [
        { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
        { name: 'QuickTime Plugin', filename: 'QuickTimePlugin.plugin', description: 'QuickTime Plug-in 7.7.3' },
        { name: 'iPhoto Plugin', filename: 'iPhotoPhotocast.plugin', description: 'iPhoto Photocast' }
      ],
      linux: [
        { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
        { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' }
      ]
    };

    return plugins[platform] || plugins.windows;
  }

  /**
   * Create isolated session for profile
   */
  async createSession(profileId, config) {
    const partitionName = `persist:profile-${profileId}`;
    const profileSession = session.fromPartition(partitionName);

    console.log(`🔐 Creating session for profile: ${profileId}`);
    console.log(`📦 Partition: ${partitionName}`);

    // Set proxy if configured
    if (config.proxy) {
      const proxyConfig = {
        proxyRules: config.proxy.type === 'socks5' 
          ? `socks5://${config.proxy.host}:${config.proxy.port}`
          : `http=${config.proxy.host}:${config.proxy.port};https=${config.proxy.host}:${config.proxy.port}`
      };

      if (config.proxy.username && config.proxy.password) {
        proxyConfig.proxyBypassRules = '<-loopback>';
      }

      await profileSession.setProxy(proxyConfig);
      console.log(`🌐 Proxy set: ${config.proxy.host}:${config.proxy.port}`);

      // Handle proxy authentication
      if (config.proxy.username && config.proxy.password) {
        profileSession.on('login', (event, webContents, details, authInfo, callback) => {
          event.preventDefault();
          callback(config.proxy.username, config.proxy.password);
        });
      }
    }

    // Set User-Agent at session level
    profileSession.setUserAgent(config.userAgent);
    console.log(`🎭 User-Agent set: ${config.userAgent.substring(0, 50)}...`);

    // Disable cache for better isolation (optional)
    // profileSession.clearCache();

    return profileSession;
  }

  /**
   * Launch profile window
   */
  async launchProfile(profileId, config, url = 'about:blank') {
    try {
      // Check if profile already open
      if (this.profiles.has(profileId)) {
        console.log(`⚠️ Profile ${profileId} already open`);
        const existing = this.profiles.get(profileId);
        existing.window.focus();
        return existing.window;
      }

      // Create session
      const profileSession = await this.createSession(profileId, config);

      // Create window
      const win = new BrowserWindow({
        width: config.screenSize.width,
        height: config.screenSize.height,
        show: false,
        webPreferences: {
          partition: `persist:profile-${profileId}`,
          session: profileSession,
          preload: path.join(__dirname, 'preload-antidetect.js'),
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
          webSecurity: true,
          allowRunningInsecureContent: false,
          experimentalFeatures: false,
          enableBlinkFeatures: '', // Disable experimental features
          disableBlinkFeatures: 'AutomationControlled' // Hide automation
        },
        title: `Profile: ${profileId}`
      });

      // Pass profile config to preload via IPC
      win.webContents.on('did-finish-load', () => {
        win.webContents.send('profile-config', config);
      });

      // Handle window resize without page reload
      win.on('resize', () => {
        const [width, height] = win.getSize();
        win.webContents.executeJavaScript(`
          if (window.__updateViewport) {
            window.__updateViewport(${width}, ${height});
          }
        `).catch(() => {});
      });

      // Store profile
      this.profiles.set(profileId, {
        window: win,
        config,
        session: profileSession
      });

      // Cleanup on close
      win.on('closed', () => {
        this.profiles.delete(profileId);
        console.log(`🗑️ Profile ${profileId} closed`);
      });

      // Show window when ready
      win.once('ready-to-show', () => {
        win.show();
        console.log(`✅ Profile ${profileId} launched`);
      });

      // Load URL
      await win.loadURL(url);

      return win;
    } catch (error) {
      console.error(`❌ Failed to launch profile ${profileId}:`, error);
      throw error;
    }
  }

  /**
   * Close profile
   */
  async closeProfile(profileId) {
    const profile = this.profiles.get(profileId);
    if (profile) {
      profile.window.close();
      this.profiles.delete(profileId);
      console.log(`✅ Profile ${profileId} closed`);
      return true;
    }
    return false;
  }

  /**
   * Get active profiles
   */
  getActiveProfiles() {
    return Array.from(this.profiles.keys());
  }

  /**
   * Get profile window
   */
  getProfileWindow(profileId) {
    const profile = this.profiles.get(profileId);
    return profile ? profile.window : null;
  }
}

module.exports = ProfileManager;
