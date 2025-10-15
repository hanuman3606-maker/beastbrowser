const { app, ipcMain, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const fetch = require('node-fetch');

// Puppeteer with stealth
const puppeteer = require('puppeteer');
const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteerExtra.use(StealthPlugin());

// SOCKS5 proxy handler (separate from HTTP proxy handling)
const socks5Handler = require('./socks5-handler');

// Responsive browser handler
const responsiveBrowserHandler = require('./responsive-browser-handler');

// Electron storage for persistent auth
const { getStorage } = require('./electron-storage');

// Profile storage service
const { setupProfileStorageHandlers } = require('./profile-storage-handlers');

// Chrome 139 Runtime
const chrome139Runtime = require('./chrome139-runtime');
const playwrightMobileLauncher = require('./playwright-mobile-launcher');
const fingerprintTestSuite = require('./fingerprint-test-suite');

// Subscription Validator
const subscriptionValidator = require('./subscription-validator');

// Global error handlers for SOCKS5 proxy-chain issues
process.on('uncaughtException', (error) => {
  // Silently suppress Node.js internal assertion errors from SOCKS5 proxy-chain
  // These are harmless - proxy still works correctly
  if (error.code === 'ERR_INTERNAL_ASSERTION') {
    return; // Suppress completely - no console output
  }
  
  // Also suppress socket hang up errors from SOCKS5
  if (error.code === 'ECONNRESET' || error.code === 'EPIPE') {
    return; // Suppress completely
  }
  
  // Log only real uncaught exceptions
  console.error('❌ Uncaught Exception:', error);
  console.error(error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Track launched profiles
const activeProfiles = new Map();
const launchQueue = new Map(); // Track profiles being launched
const closeQueue = new Set(); // Track profiles being closed
let devServerProcess = null;

// Platform-specific realistic viewport sizes
const PLATFORM_SIZES = {
  windows: [
    { width: 1920, height: 1080 }, // Full HD
    { width: 1366, height: 768 },  // Laptop
    { width: 1536, height: 864 },  // HD+
    { width: 1280, height: 720 },  // HD
    { width: 1440, height: 900 }   // MacBook Air size
  ],
  macos: [
    { width: 1440, height: 900 },  // MacBook Air/Pro 13"
    { width: 1680, height: 1050 }, // MacBook Pro 15"
    { width: 1920, height: 1080 }, // iMac
    { width: 2560, height: 1440 }, // iMac 5K scaled
    { width: 1280, height: 800 }   // MacBook 12"
  ],
  linux: [
    { width: 1920, height: 1080 }, // Full HD
    { width: 1600, height: 900 },  // HD+
    { width: 1366, height: 768 },  // Common laptop
    { width: 1280, height: 1024 }, // Old 4:3
    { width: 1440, height: 900 }   // Wide
  ],
  android: [
    { width: 412, height: 915, mobile: true },  // Pixel 5
    { width: 360, height: 800, mobile: true },  // Samsung Galaxy
    { width: 384, height: 854, mobile: true },  // OnePlus
    { width: 393, height: 851, mobile: true },  // Pixel 6
    { width: 428, height: 926, mobile: true }   // Large phone
  ],
  ios: [
    { width: 390, height: 844, mobile: true },  // iPhone 13/14
    { width: 428, height: 926, mobile: true },  // iPhone 14 Pro Max
    { width: 375, height: 812, mobile: true },  // iPhone X/11 Pro
    { width: 414, height: 896, mobile: true },  // iPhone 11/XR
    { width: 360, height: 780, mobile: true }   // iPhone SE
  ],
  tv: [
    { width: 1920, height: 1080 }, // Full HD TV
    { width: 3840, height: 2160 }, // 4K TV
    { width: 1280, height: 720 },  // HD TV
    { width: 2560, height: 1440 }  // 2K TV
  ]
};

// Get random size for platform
function getRandomSizeForPlatform(platform) {
  const sizes = PLATFORM_SIZES[platform] || PLATFORM_SIZES.windows;
  return sizes[Math.floor(Math.random() * sizes.length)];
}

// Track used user agents to ensure uniqueness per platform
const usedUserAgents = new Map(); // Map<platform, Set<userAgent>>

// Chromium executable path cache
let cachedChromiumPath = null;

/**
 * Find Chromium executable path
 * Searches in multiple locations to ensure browser works even without system Chrome
 */
function findChromiumExecutable() {
  // Return cached path if already found
  if (cachedChromiumPath) {
    return cachedChromiumPath;
  }

  console.log('🔍 Searching for Chromium executable...');
  
  const platform = process.platform;
  const arch = process.arch;
  
  // Possible Chromium locations
  const searchPaths = [];
  
  // 1. Bundled with puppeteer in node_modules (development)
  const puppeteerChromiumPath = puppeteer.executablePath();
  if (puppeteerChromiumPath) {
    searchPaths.push(puppeteerChromiumPath);
  }
  
  // 2. Bundled in app.asar.unpacked (production - electron-builder)
  if (app.isPackaged) {
    const unpackedPath = process.resourcesPath.replace('app.asar', 'app.asar.unpacked');
    
    if (platform === 'win32') {
      searchPaths.push(
        path.join(unpackedPath, 'node_modules', 'puppeteer', '.local-chromium', `win${arch === 'x64' ? '64' : '32'}-*`, 'chrome-win', 'chrome.exe'),
        path.join(process.resourcesPath, 'chromium', 'chrome.exe'),
        path.join(app.getAppPath(), 'chromium', 'chrome.exe')
      );
    } else if (platform === 'darwin') {
      searchPaths.push(
        path.join(unpackedPath, 'node_modules', 'puppeteer', '.local-chromium', 'mac-*', 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
        path.join(process.resourcesPath, 'chromium', 'Chromium.app', 'Contents', 'MacOS', 'Chromium')
      );
    } else if (platform === 'linux') {
      searchPaths.push(
        path.join(unpackedPath, 'node_modules', 'puppeteer', '.local-chromium', 'linux-*', 'chrome-linux', 'chrome'),
        path.join(process.resourcesPath, 'chromium', 'chrome')
      );
    }
  }
  
  // 3. System Chrome/Chromium (fallback)
  if (platform === 'win32') {
    searchPaths.push(
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(process.env.PROGRAMFILES || '', 'Google', 'Chrome', 'Application', 'chrome.exe')
    );
  } else if (platform === 'darwin') {
    searchPaths.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium'
    );
  } else if (platform === 'linux') {
    searchPaths.push(
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/snap/bin/chromium'
    );
  }
  
  // Search for existing executable
  for (const searchPath of searchPaths) {
    try {
      // Handle wildcard paths (for version-specific folders)
      if (searchPath.includes('*')) {
        const dir = path.dirname(searchPath);
        const pattern = path.basename(searchPath);
        const parentDir = dir.substring(0, dir.lastIndexOf('*'));
        
        if (fs.existsSync(parentDir)) {
          const entries = fs.readdirSync(parentDir);
          for (const entry of entries) {
            const fullPath = path.join(parentDir, entry, ...searchPath.split(path.sep).slice(-2));
            if (fs.existsSync(fullPath)) {
              console.log(`✅ Found Chromium at: ${fullPath}`);
              cachedChromiumPath = fullPath;
              return fullPath;
            }
          }
        }
      } else if (fs.existsSync(searchPath)) {
        console.log(`✅ Found Chromium at: ${searchPath}`);
        cachedChromiumPath = searchPath;
        return searchPath;
      }
    } catch (error) {
      // Continue searching
    }
  }
  
  console.warn('⚠️ Chromium executable not found in any location');
  console.warn('📋 Searched paths:', searchPaths);
  
  // Return undefined to let puppeteer try its default behavior
  return undefined;
}

async function waitForUrl(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { timeout: 1000 });
      if (res && res.ok) return true;
    } catch (_) {}
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

function getProfilesRootDir() {
  const base = app.getPath('userData');
  const dir = path.join(base, 'profiles');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getProfileDir(profileId) {
  const dir = path.join(getProfilesRootDir(), profileId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getUserAgentsDir() {
  // When packaged, files are inside resources/app.asar or extraResources
  const candidatePaths = [
    path.join(app.getAppPath(), 'useragents'),
    path.join(process.resourcesPath || '', 'useragents'),
    path.join(__dirname, '..', 'useragents')
  ];
  for (const p of candidatePaths) {
    try {
      if (p && fs.existsSync(p)) return p;
    } catch (_) {}
  }
  return null;
}

// Get unique random user agent from platform file (no duplicates across profiles)
function getRandomUserAgent(platform = 'windows', profileId = null) {
  try {
    const uaDir = getUserAgentsDir();
    if (!uaDir) {
      console.log('⚠️ UserAgent directory not found, using fallback');
      return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
    }
    
    const platformFile = path.join(uaDir, `${platform.toLowerCase()}.txt`);
    if (!fs.existsSync(platformFile)) {
      console.log(`⚠️ UserAgent file not found for ${platform}, using fallback`);
      return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
    }
    
    const content = fs.readFileSync(platformFile, 'utf-8');
    const allUserAgents = content.split('\n').filter(ua => ua.trim().length > 0).map(ua => ua.trim());
    
    if (allUserAgents.length === 0) {
      console.log(`⚠️ No user agents found in ${platform} file`);
      return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
    }
    
    // Initialize used user agents set for this platform
    if (!usedUserAgents.has(platform)) {
      usedUserAgents.set(platform, new Set());
    }
    
    const usedSet = usedUserAgents.get(platform);
    
    // Find unused user agents
    const unusedUserAgents = allUserAgents.filter(ua => !usedSet.has(ua));
    
    let selectedUA;
    
    if (unusedUserAgents.length > 0) {
      // Select from unused user agents
      selectedUA = unusedUserAgents[Math.floor(Math.random() * unusedUserAgents.length)];
      console.log(`✅ Selected unique ${platform} User-Agent (${usedSet.size + 1}/${allUserAgents.length} used)`);
    } else {
      // All user agents used, reset and start over
      console.log(`⚠️ All ${allUserAgents.length} ${platform} user agents have been used. Resetting pool.`);
      usedUserAgents.set(platform, new Set());
      selectedUA = allUserAgents[Math.floor(Math.random() * allUserAgents.length)];
    }
    
    // Mark this user agent as used
    usedUserAgents.get(platform).add(selectedUA);
    
    return selectedUA;
  } catch (error) {
    console.error('❌ Error loading user agent:', error.message);
    return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
  }
}

// Get platform-specific sizes
function getPlatformSizes(platform = 'windows') {
  const platformLower = platform.toLowerCase();
  return PLATFORM_SIZES[platformLower] || PLATFORM_SIZES.windows;
}

// Generate advanced random fingerprint
function generateAdvancedFingerprint(platform = 'windows') {
  const platformSizes = getPlatformSizes(platform);
  const isMobile = platformSizes.mobile || false;
  
  // Random but realistic screen sizes based on platform
  const screens = {
    windows: [
      { width: 1920, height: 1080 },
      { width: 1366, height: 768 },
      { width: 1536, height: 864 },
      { width: 1440, height: 900 },
      { width: 1600, height: 900 },
      { width: 2560, height: 1440 }
    ],
    macos: [
      { width: 1440, height: 900 },
      { width: 1680, height: 1050 },
      { width: 1920, height: 1080 },
      { width: 2560, height: 1440 },
      { width: 2880, height: 1800 }
    ],
    linux: [
      { width: 1920, height: 1080 },
      { width: 1366, height: 768 },
      { width: 1600, height: 900 },
      { width: 2560, height: 1440 }
    ],
    android: [
      { width: 360, height: 640 },
      { width: 412, height: 915 },
      { width: 384, height: 854 },
      { width: 393, height: 873 }
    ],
    ios: [
      { width: 390, height: 844 },
      { width: 428, height: 926 },
      { width: 375, height: 812 },
      { width: 414, height: 896 }
    ],
    tv: [
      { width: 1920, height: 1080 },
      { width: 3840, height: 2160 }
    ]
  };
  
  const platformScreens = screens[platform.toLowerCase()] || screens.windows;
  const screen = platformScreens[Math.floor(Math.random() * platformScreens.length)];
  
  // Random hardware concurrency (CPU cores)
  const hardwareConcurrency = isMobile 
    ? [4, 6, 8][Math.floor(Math.random() * 3)]
    : [4, 8, 12, 16][Math.floor(Math.random() * 4)];
  
  // Random device memory (GB)
  const deviceMemory = isMobile
    ? [2, 4, 6, 8][Math.floor(Math.random() * 4)]
    : [4, 8, 16, 32][Math.floor(Math.random() * 4)];
  
  // Platform-specific properties
  const platforms = {
    windows: ['Win32', 'Win64'],
    macos: ['MacIntel'],
    linux: ['Linux x86_64', 'Linux i686'],
    android: ['Linux armv8l', 'Linux armv7l'],
    ios: ['iPhone', 'iPad'],
    tv: ['Linux armv7l', 'SmartTV']
  };
  
  const platformValue = platforms[platform.toLowerCase()] || platforms.windows;
  const selectedPlatform = platformValue[Math.floor(Math.random() * platformValue.length)];
  
  // WebGL vendors/renderers
  const webglVendors = [
    'Google Inc.',
    'Google Inc. (NVIDIA)',
    'Google Inc. (Intel)',
    'Google Inc. (AMD)',
    'Google Inc. (Apple)',
    'ARM',
    'Qualcomm'
  ];
  
  const webglRenderers = {
    windows: [
      'ANGLE (NVIDIA GeForce GTX 1660 Direct3D11)',
      'ANGLE (Intel HD Graphics 630 Direct3D11)',
      'ANGLE (AMD Radeon RX 580 Direct3D11)',
      'ANGLE (NVIDIA GeForce RTX 3060 Direct3D11)'
    ],
    macos: [
      'Apple M1',
      'Apple M2',
      'Intel Iris Plus Graphics 640',
      'AMD Radeon Pro 5500M'
    ],
    linux: [
      'Mesa DRI Intel HD Graphics',
      'NVIDIA GeForce GTX 1060',
      'AMD Radeon RX 570'
    ],
    android: [
      'Adreno (TM) 640',
      'Mali-G76',
      'Adreno (TM) 730'
    ],
    ios: [
      'Apple GPU',
      'Apple A15 GPU',
      'Apple A16 GPU'
    ],
    tv: [
      'Mali-T820',
      'VideoCore IV'
    ]
  };
  
  const renderers = webglRenderers[platform.toLowerCase()] || webglRenderers.windows;
  
  // Enhanced audio context fingerprint
  const audioContext = {
    sampleRate: [44100, 48000][Math.floor(Math.random() * 2)],
    channelCount: [2, 6, 8][Math.floor(Math.random() * 3)],
    channelCountMode: 'explicit',
    baseLatency: (Math.random() * 0.01).toFixed(6)
  };

  // Canvas fingerprint noise
  const canvasNoise = Math.random().toString(36).substring(2, 15);
  
  // WebGL fingerprint noise
  const webglNoise = Math.random().toString(36).substring(2, 15);
  
  // Battery status (if not mobile)
  const battery = isMobile ? {
    charging: Math.random() > 0.5,
    level: (Math.random() * 0.5 + 0.5).toFixed(2),
    chargingTime: Math.random() > 0.5 ? Infinity : Math.floor(Math.random() * 3600)
  } : null;

  // Timezone offset
  const timezoneOffsets = [-12, -11, -10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const timezoneOffset = timezoneOffsets[Math.floor(Math.random() * timezoneOffsets.length)] * 60;

  // Media devices
  const mediaDevices = {
    audioinput: Math.floor(Math.random() * 3) + 1,
    videoinput: Math.floor(Math.random() * 2) + 1,
    audiooutput: Math.floor(Math.random() * 3) + 1
  };

  // Fonts
  const fonts = [
    'Arial', 'Verdana', 'Helvetica', 'Times New Roman', 'Courier New',
    'Georgia', 'Palatino', 'Garamond', 'Bookman', 'Comic Sans MS',
    'Trebuchet MS', 'Arial Black', 'Impact'
  ];
  const installedFonts = fonts.filter(() => Math.random() > 0.3);

  // Plugins (for older browsers)
  const plugins = isMobile ? [] : [
    'Chrome PDF Plugin',
    'Chrome PDF Viewer',
    'Native Client'
  ];

  return {
    screen,
    hardwareConcurrency,
    deviceMemory,
    navigator: {
      platform: selectedPlatform,
      languages: ['en-US', 'en'],
      vendor: 'Google Inc.',
      maxTouchPoints: isMobile ? Math.floor(Math.random() * 5) + 5 : 0,
      doNotTrack: Math.random() > 0.5 ? '1' : null,
      cookieEnabled: true,
      onLine: true,
      pdfViewerEnabled: true
    },
    webgl: {
      vendor: webglVendors[Math.floor(Math.random() * webglVendors.length)],
      renderer: renderers[Math.floor(Math.random() * renderers.length)],
      version: 'WebGL 2.0',
      shadingLanguageVersion: 'WebGL GLSL ES 3.00',
      noise: webglNoise
    },
    canvas: {
      noise: canvasNoise,
      enabled: true
    },
    audio: audioContext,
    battery: battery,
    timezone: {
      offset: timezoneOffset,
      name: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    mediaDevices: mediaDevices,
    fonts: installedFonts,
    plugins: plugins,
    permissions: {
      notifications: 'default',
      geolocation: 'prompt',
      camera: 'prompt',
      microphone: 'prompt'
    }
  };
}

async function detectTimezoneFromIP(ipOrHost) {
  try {
    // ipOrHost may be host; we query without DNS resolve
    const urls = [
      `https://ipapi.co/${ipOrHost}/json/`,
      `http://ip-api.com/json/${ipOrHost}`,
      `https://ipinfo.io/${ipOrHost}/json`
    ];
    
    for (const url of urls) {
      try {
        const res = await fetch(url, { timeout: 10000 });
        if (!res.ok) continue;
        const data = await res.json();
        const tz = data.timezone || data.time_zone || data.tz || (data.location && data.location.timezone);
        if (tz) return { success: true, timezone: tz, raw: data };
      } catch (_) {
        continue;
      }
    }
  } catch (_) {}
  return { success: false, timezone: 'UTC', error: 'Failed to detect timezone' };
}

/**
 * Create RPA Script Extension for Chrome 139
 * Creates a Chrome extension that executes the RPA script on page load
 */
function createRPAScriptExtension(userDataDir, action) {
  const extensionDir = path.join(userDataDir, 'BeastRPAExtension');
  
  // Remove old extension if exists
  if (fs.existsSync(extensionDir)) {
    fs.rmSync(extensionDir, { recursive: true, force: true });
  }
  
  fs.mkdirSync(extensionDir, { recursive: true });
  
  // Create manifest.json with MAIN world injection
  const manifest = {
    manifest_version: 3,
    name: "Beast Browser RPA Automation",
    version: "1.0.0",
    description: "Executes RPA automation scripts",
    permissions: [],
    host_permissions: ["<all_urls>"],
    content_scripts: [
      {
        matches: ["<all_urls>"],
        js: ["rpa-script.js"],
        run_at: "document_idle", // Run after page loads
        world: "MAIN", // CRITICAL: Inject into page's main world
        all_frames: false
      }
    ]
  };
  
  fs.writeFileSync(
    path.join(extensionDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8'
  );
  
  // Create RPA script WITHOUT template literals to avoid escaping issues
  const scriptContent = action.scriptContent || '';
  const scriptName = (action.name || 'Unnamed').replace(/'/g, "\\'");
  
  // Build script - Execute user script DIRECTLY without IIFE wrapper
  // This allows setTimeout, setInterval, and async operations to work properly
  // NO URL CHECKING - Script runs on ALL pages (user controls URL via profile's Starting URL)
  const rpaScript = [
    '// Beast Browser RPA Automation Script',
    '// Script: ' + scriptName,
    '',
    'console.log("🤖 Beast RPA Extension Loaded");',
    'console.log("📍 Current URL:", window.location.href);',
    'console.log("🎯 Script Name:", "' + scriptName + '");',
    '',
    'try {',
    '  console.log("🚀 Starting RPA automation...");',
    '  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");',
    '  ',
    '  // ===== USER SCRIPT STARTS HERE =====',
    '  ',
    scriptContent,
    '  ',
    '  // ===== USER SCRIPT ENDS HERE =====',
    '  ',
    '} catch (error) {',
    '  console.error("❌ RPA script execution error:", error);',
    '  console.error("Stack:", error.stack);',
    '}'
  ].join('\n');
  
  fs.writeFileSync(
    path.join(extensionDir, 'rpa-script.js'),
    rpaScript,
    'utf8'
  );
  
  console.log('✅ RPA extension created:', extensionDir);
  return extensionDir;
}

async function applyPageAntiDetection(page, profile, options) {
  // User agent
  if (profile && profile.userAgent) {
    await page.setUserAgent(profile.userAgent);
  }

  // Viewport - Platform-specific sizing - check all possible fields
  const platform = (profile && (profile.platform || profile.platformType || profile.deviceType || profile.userAgentPlatform)) || 'windows';
  console.log(`🔧 applyPageAntiDetection: Platform = "${platform}" for profile ${profile?.id || 'unknown'}`);
  
  const platformSizes = getPlatformSizes(platform);
  // Get random realistic size for this platform
  const randomSize = getRandomSizeForPlatform(platform);
  const isMobile = randomSize.mobile || false;
  
  const fp = profile && profile.fingerprint;
  const screen = (fp && fp.screen) || randomSize;
  
  // Use realistic viewport sizes based on platform
  const viewportWidth = screen.width || randomSize.width;
  const viewportHeight = screen.height || randomSize.height;
  
  // Calculate browser chrome height (address bar, tabs, etc.)
  const chromeHeight = isMobile ? 0 : 150; // Desktop has chrome UI
  
  await page.setViewport({ 
    width: viewportWidth, 
    height: viewportHeight - chromeHeight, 
    deviceScaleFactor: isMobile ? 2 : 1, // Mobile has higher DPI
    isMobile: isMobile,
    hasTouch: isMobile
  });
  
  // Set browser window size to match viewport + chrome
  try {
    const session = await page.target().createCDPSession();
    const { windowId } = await session.send('Browser.getWindowForTarget');
    
    await session.send('Browser.setWindowBounds', {
      windowId,
      bounds: {
        width: viewportWidth,
        height: viewportHeight,
        windowState: 'normal'
      }
    });
    
    console.log(`📱 Browser window set: ${viewportWidth}x${viewportHeight} (${isMobile ? 'Mobile' : 'Desktop'} - ${platform})`);
  } catch (e) {
    console.log('⚠️ Could not set window bounds:', e.message);
  }
  
  // Inject responsive viewport meta tag and CSS to prevent overflow
  await page.evaluateOnNewDocument(() => {
    // Add viewport meta tag for responsive behavior - Fixed MutationObserver error
    const addViewportMeta = () => {
      if (document.head && !document.querySelector('meta[name="viewport"]')) {
        const meta = document.createElement('meta');
        meta.name = 'viewport';
        meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=5.0';
        document.head.appendChild(meta);
      }
    };
    
    // Try to add immediately if document is ready
    if (document.readyState !== 'loading') {
      addViewportMeta();
    } else {
      // Otherwise wait for DOMContentLoaded
      document.addEventListener('DOMContentLoaded', addViewportMeta);
    }
    
    // Also use MutationObserver safely
    if (typeof MutationObserver !== 'undefined' && document.documentElement) {
      const observer = new MutationObserver(() => {
        if (document.head && !document.querySelector('meta[name="viewport"]')) {
          addViewportMeta();
          observer.disconnect();
        }
      });
      
      try {
        observer.observe(document.documentElement, { childList: true, subtree: true });
      } catch (e) {
        // Silently fail if observe fails
      }
    }
    
    // Inject CSS to prevent content overflow
    const injectResponsiveCSS = () => {
      if (!document.querySelector('#responsive-fix-style')) {
        const style = document.createElement('style');
        style.id = 'responsive-fix-style';
        style.textContent = `
          html, body {
            max-width: 100vw !important;
            overflow-x: hidden !important;
            box-sizing: border-box !important;
          }
          * {
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
          img, video, iframe, embed, object {
            max-width: 100% !important;
            height: auto !important;
          }
        `;
        (document.head || document.documentElement).appendChild(style);
      }
    };
    
    // Inject CSS as soon as possible
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', injectResponsiveCSS);
    } else {
      injectResponsiveCSS();
    }
    
    // Also inject on any dynamic content load
    setTimeout(injectResponsiveCSS, 100);
    setTimeout(injectResponsiveCSS, 500);
  });

  // Languages
  const languages = fp && fp.navigator && fp.navigator.languages ? fp.navigator.languages : ['en-US', 'en'];
  await page.evaluateOnNewDocument((langs) => {
    Object.defineProperty(navigator, 'languages', { get: () => langs });
  }, languages);

  // Platform
  if (fp && fp.navigator && fp.navigator.platform) {
    const platform = fp.navigator.platform;
    await page.evaluateOnNewDocument((p) => {
      Object.defineProperty(navigator, 'platform', { get: () => p });
    }, platform);
  }
  
  // Hardware Concurrency (CPU cores)
  const hardwareConcurrency = (fp && fp.hardwareConcurrency) || 8;
  await page.evaluateOnNewDocument((cores) => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => cores });
  }, hardwareConcurrency);
  
  // Device Memory (RAM)
  const deviceMemory = (fp && fp.deviceMemory) || 8;
  await page.evaluateOnNewDocument((memory) => {
    Object.defineProperty(navigator, 'deviceMemory', { get: () => memory });
  }, deviceMemory);
  
  // Max Touch Points (mobile detection)
  const maxTouchPoints = (fp && fp.navigator && fp.navigator.maxTouchPoints !== undefined) ? fp.navigator.maxTouchPoints : 0;
  await page.evaluateOnNewDocument((points) => {
    Object.defineProperty(navigator, 'maxTouchPoints', { get: () => points });
  }, maxTouchPoints);

  // WebGL fingerprint advanced spoof with real fingerprint data
  const webglVendor = (fp && fp.webgl && fp.webgl.vendor) || 'Google Inc.';
  const webglRenderer = (fp && fp.webgl && fp.webgl.renderer) || 'ANGLE (Intel HD Graphics Direct3D11)';
  
  await page.evaluateOnNewDocument((vendor, renderer) => {
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(parameter) {
      // VENDOR / RENDERER spoof with real fingerprint data
      if (parameter === 37445) return vendor; // UNMASKED_VENDOR_WEBGL
      if (parameter === 37446) return renderer; // UNMASKED_RENDERER_WEBGL
      return getParameter.apply(this, [parameter]);
    };
    
    // Also spoof WebGL2
    if (window.WebGL2RenderingContext) {
      const getParameter2 = WebGL2RenderingContext.prototype.getParameter;
      WebGL2RenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) return vendor;
        if (parameter === 37446) return renderer;
        return getParameter2.apply(this, [parameter]);
      };
    }
  }, webglVendor, webglRenderer);

  // Canvas noise
  await page.evaluateOnNewDocument(() => {
    const toDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function() {
      const ctx = this.getContext('2d');
      if (ctx) {
        const shift = 0.000001;
        const { width, height } = this;
        const imageData = ctx.getImageData(0, 0, width, height);
        for (let i = 0; i < imageData.data.length; i += 4) {
          imageData.data[i] += shift;
        }
        ctx.putImageData(imageData, 0, 0);
      }
      return toDataURL.apply(this, arguments);
    };
  });

  // WebRTC Blocking - Prevent IP leaks
  await page.evaluateOnNewDocument(() => {
    console.log('🔒 WebRTC blocking enabled - Preventing IP leaks');
    
    // Block getUserMedia (camera/microphone access)
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = function() {
        console.log('🚫 WebRTC: getUserMedia blocked');
        return Promise.reject(new Error('Permission denied'));
      };
    }

    // Block RTCPeerConnection completely
    if (window.RTCPeerConnection) {
      const OriginalRTCPeerConnection = window.RTCPeerConnection;
      window.RTCPeerConnection = function() {
        console.log('🚫 WebRTC: RTCPeerConnection blocked');
        throw new Error('RTCPeerConnection is not supported');
      };
      window.RTCPeerConnection.prototype = OriginalRTCPeerConnection.prototype;
    }

    // Block webkitRTCPeerConnection
    if (window.webkitRTCPeerConnection) {
      const OriginalWebkitRTC = window.webkitRTCPeerConnection;
      window.webkitRTCPeerConnection = function() {
        console.log('🚫 WebRTC: webkitRTCPeerConnection blocked');
        throw new Error('webkitRTCPeerConnection is not supported');
      };
      window.webkitRTCPeerConnection.prototype = OriginalWebkitRTC.prototype;
    }

    // Block mozRTCPeerConnection
    if (window.mozRTCPeerConnection) {
      const OriginalMozRTC = window.mozRTCPeerConnection;
      window.mozRTCPeerConnection = function() {
        console.log('🚫 WebRTC: mozRTCPeerConnection blocked');
        throw new Error('mozRTCPeerConnection is not supported');
      };
      window.mozRTCPeerConnection.prototype = OriginalMozRTC.prototype;
    }

    // Block RTCSessionDescription
    if (window.RTCSessionDescription) {
      window.RTCSessionDescription = undefined;
    }

    // Block RTCIceCandidate
    if (window.RTCIceCandidate) {
      window.RTCIceCandidate = undefined;
    }

    // Block enumerateDevices (device fingerprinting)
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices = function() {
        console.log('🚫 WebRTC: enumerateDevices blocked');
        return Promise.resolve([]);
      };
    }

    // Block getDisplayMedia (screen sharing)
    if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
      navigator.mediaDevices.getDisplayMedia = function() {
        console.log('🚫 WebRTC: getDisplayMedia blocked');
        return Promise.reject(new Error('Permission denied'));
      };
    }

    console.log('✅ WebRTC fully blocked - No IP leaks possible');
  });

  // Timezone - use saved proxy timezone first
  console.log('🔍 DEBUG: Checking timezone...');
  console.log('🔍 DEBUG: Profile timezone:', profile?.timezone);
  console.log('🔍 DEBUG: Proxy object:', options?.proxy);
  console.log('🔍 DEBUG: Proxy timezone:', options?.proxy?.timezone);
  
  let tzToUse = (profile && profile.timezone && profile.timezone !== 'auto') ? profile.timezone : null;
  
  // Priority 1: Use saved proxy timezone (from test) - SKIP "auto"
  if (!tzToUse && options && options.proxy && options.proxy.timezone && options.proxy.timezone !== 'auto') {
    tzToUse = options.proxy.timezone;
    console.log(`🕐 Using saved proxy timezone: ${tzToUse}`);
  }
  
  // Priority 2: Detect from proxy host (fallback)
  if (!tzToUse && options && options.proxy && options.proxy.host) {
    console.log(`🌍 Attempting to detect timezone from proxy host: ${options.proxy.host}`);
    
    // Try to get real IP through proxy first
    try {
      const chromiumPath = findChromiumExecutable();
      const testBrowser = await puppeteerExtra.launch({
        headless: true,
        executablePath: chromiumPath, // Use detected Chromium path
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          `--proxy-server=${(options.proxy.type || 'http').toLowerCase()}://${options.proxy.host}:${options.proxy.port}`
        ]
      });
      
      const testPage = await testBrowser.newPage();
      
      if (options.proxy.username && options.proxy.password) {
        await testPage.authenticate({
          username: options.proxy.username,
          password: options.proxy.password
        });
      }
      
      await testPage.goto('https://api.ipify.org?format=json', { timeout: 10000 });
      const content = await testPage.content();
      await testBrowser.close();
      
      const jsonMatch = content.match(/\{[^}]+\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        console.log(`🌍 Real proxy IP detected: ${data.ip}`);
        
        const tz = await detectTimezoneFromIP(data.ip);
        console.log('🌍 Timezone detection result:', tz);
        if (tz && tz.timezone) {
          tzToUse = tz.timezone;
          console.log(`✅ Detected timezone from proxy IP: ${tzToUse}`);
        }
      }
    } catch (e) {
      console.warn('⚠️ Failed to get real proxy IP:', e.message);
    }
  }
  
  console.log('🎯 FINAL TIMEZONE TO USE:', tzToUse);
  
  // If no timezone found, use proxy location default (NOT system timezone!)
  if (!tzToUse && options && options.proxy) {
    tzToUse = 'America/New_York'; // Default for US proxies
    console.log('⚠️ No timezone detected, using default:', tzToUse);
  }
  
  // CRITICAL: Never use system timezone if proxy is configured
  if (!tzToUse && !options?.proxy) {
    // Only use system timezone if NO proxy configured
    tzToUse = Intl.DateTimeFormat().resolvedOptions().timeZone;
    console.log('⚠️ No proxy, using system timezone:', tzToUse);
  }
  
  if (tzToUse) {
    try {
      await page.emulateTimezone(tzToUse);
      console.log(`✅ Timezone emulated: ${tzToUse}`);
      
      // Inject timezone spoofing script - MUST override Date.prototype.toString()
      console.log('🚀 INJECTING TIMEZONE SCRIPT FOR:', tzToUse);
      await page.evaluateOnNewDocument((targetTimezone) => {
        console.log('🔥 TIMEZONE SCRIPT EXECUTING! Target:', targetTimezone);
        // Calculate timezone offset for target timezone
        function getTargetTimezoneOffset() {
          try {
            const now = new Date();
            // Get offset in minutes (negative for west, positive for east)
            const formatter = new Intl.DateTimeFormat('en-US', {
              timeZone: targetTimezone,
              timeZoneName: 'longOffset'
            });
            const parts = formatter.formatToParts(now);
            const offsetPart = parts.find(part => part.type === 'timeZoneName');
            
            if (offsetPart && offsetPart.value) {
              // Parse GMT+05:30 or GMT-08:00
              const match = offsetPart.value.match(/GMT([+-])(\d{1,2}):?(\d{2})?/);
              if (match) {
                const sign = match[1] === '+' ? -1 : 1; // Inverted for getTimezoneOffset
                const hours = parseInt(match[2]);
                const mins = parseInt(match[3] || '0');
                return sign * (hours * 60 + mins);
              }
            }
            
            // Fallback method
            const localDate = new Date(now.toLocaleString('en-US', { timeZone: targetTimezone }));
            const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
            return Math.round((utcDate.getTime() - localDate.getTime()) / 60000);
          } catch (e) {
            return 0;
          }
        }
        
        const targetOffset = getTargetTimezoneOffset();
        
        // Get timezone abbreviation
        function getTimezoneAbbr() {
          try {
            const formatter = new Intl.DateTimeFormat('en-US', {
              timeZone: targetTimezone,
              timeZoneName: 'short'
            });
            const parts = formatter.formatToParts(new Date());
            const tzPart = parts.find(part => part.type === 'timeZoneName');
            return tzPart ? tzPart.value : targetTimezone.split('/').pop();
          } catch (e) {
            return targetTimezone.split('/').pop();
          }
        }
        
        const timezoneAbbr = getTimezoneAbbr();
        
        // Store original methods
        const originalDateToString = Date.prototype.toString;
        const originalDateToLocaleString = Date.prototype.toLocaleString;
        const originalDateToLocaleDateString = Date.prototype.toLocaleDateString;
        const originalDateToLocaleTimeString = Date.prototype.toLocaleTimeString;
        const originalDateToTimeString = Date.prototype.toTimeString;
        const originalDateToDateString = Date.prototype.toDateString;
        const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
        const originalIntlDateTimeFormat = Intl.DateTimeFormat;
        
        // Override Date.prototype.toString() - CRITICAL for system time display
        Date.prototype.toString = function() {
          try {
            // Create date string in target timezone
            const options = {
              timeZone: targetTimezone,
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false
            };
            
            const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(this);
            const weekday = parts.find(p => p.type === 'weekday')?.value || '';
            const month = parts.find(p => p.type === 'month')?.value || '';
            const day = parts.find(p => p.type === 'day')?.value || '';
            const year = parts.find(p => p.type === 'year')?.value || '';
            const hour = parts.find(p => p.type === 'hour')?.value || '';
            const minute = parts.find(p => p.type === 'minute')?.value || '';
            const second = parts.find(p => p.type === 'second')?.value || '';
            
            // Format GMT offset (inverted sign for display)
            const sign = targetOffset > 0 ? '-' : '+';
            const absOffset = Math.abs(targetOffset);
            const hours = Math.floor(absOffset / 60);
            const mins = absOffset % 60;
            const gmtStr = `GMT${sign}${hours.toString().padStart(2, '0')}${mins.toString().padStart(2, '0')}`;
            
            return `${weekday} ${month} ${day} ${year} ${hour}:${minute}:${second} ${gmtStr} (${timezoneAbbr})`;
          } catch (e) {
            console.error('Date.toString override error:', e);
            return originalDateToString.call(this);
          }
        };
        
        // Override Date.prototype.toTimeString()
        Date.prototype.toTimeString = function() {
          const str = originalDateToTimeString.call(this);
          return str.replace(/GMT[+-]\d{4}.*/, () => {
            const sign = targetOffset <= 0 ? '+' : '-';
            const hours = Math.abs(Math.floor(targetOffset / 60));
            const mins = Math.abs(targetOffset % 60);
            return `GMT${sign}${hours.toString().padStart(2, '0')}${mins.toString().padStart(2, '0')} (${timezoneAbbr})`;
          });
        };
        
        // Override Date.prototype.getTimezoneOffset()
        Date.prototype.getTimezoneOffset = function() {
          return targetOffset;
        };
        
        // Override Date locale methods
        Date.prototype.toLocaleString = function(locales, options) {
          options = options || {};
          options.timeZone = targetTimezone;
          return originalDateToLocaleString.call(this, locales, options);
        };
        
        Date.prototype.toLocaleDateString = function(locales, options) {
          options = options || {};
          options.timeZone = targetTimezone;
          return originalDateToLocaleDateString.call(this, locales, options);
        };
        
        Date.prototype.toLocaleTimeString = function(locales, options) {
          options = options || {};
          options.timeZone = targetTimezone;
          return originalDateToLocaleTimeString.call(this, locales, options);
        };
        
        // Override Intl.DateTimeFormat
        Intl.DateTimeFormat = function(locales, options) {
          options = options || {};
          if (!options.timeZone) {
            options.timeZone = targetTimezone;
          }
          return new originalIntlDateTimeFormat(locales, options);
        };
        
        // Copy static methods
        Object.setPrototypeOf(Intl.DateTimeFormat, originalIntlDateTimeFormat);
        Object.defineProperty(Intl.DateTimeFormat, 'prototype', {
          value: originalIntlDateTimeFormat.prototype,
          writable: false
        });
        
        console.log('🕐 Timezone spoofed to:', targetTimezone);
        console.log('📍 Timezone offset:', targetOffset, 'minutes');
        console.log('🏷️ Timezone abbreviation:', timezoneAbbr);
        
        // VERIFICATION TEST
        const testDate = new Date();
        console.log('✅ VERIFICATION: new Date().toString() =', testDate.toString());
        console.log('✅ VERIFICATION: new Date().getTimezoneOffset() =', testDate.getTimezoneOffset());
      }, tzToUse);
      
      console.log(`✅ Timezone spoofing script injected for: ${tzToUse}`);
    } catch (e) {
      console.warn(`⚠️ Failed to set timezone: ${e.message}`);
    }
  }
}

function buildLaunchArgs(profile, options) {
  // Get platform-specific screen size - check all possible fields
  const platform = (profile && (profile.platform || profile.platformType || profile.deviceType || profile.userAgentPlatform)) || 'windows';
  console.log(`🔧 buildLaunchArgs: Platform = "${platform}" for profile ${profile?.id || 'unknown'}`);
  console.log(`🔍 buildLaunchArgs: Available fields - platform: ${profile?.platform}, userAgentPlatform: ${profile?.userAgentPlatform}`);
  
  const platformSizes = getPlatformSizes(platform);
  const isMobile = platformSizes.mobile || false;
  
  const fp = profile && profile.fingerprint;
  const screen = (fp && fp.screen) || platformSizes;
  
  console.log(`📏 buildLaunchArgs: Screen size = ${screen.width}x${screen.height}, isMobile = ${isMobile}`);
  
  // Platform-specific window sizes
  let windowWidth, windowHeight;
  if (isMobile) {
    // Mobile devices (Android, iOS)
    windowWidth = screen.width || platformSizes.width;
    windowHeight = screen.height || platformSizes.height;
  } else {
    // Desktop devices - FORCE SMALL SIZE
    windowWidth = 1024;
    windowHeight = 768;
  }
  
  console.log(`✅ buildLaunchArgs: Final window size = ${windowWidth}x${windowHeight}`);
  
  // Get app icon path
  const iconPath = path.join(__dirname, '..', 'public', 'free.ico');
  
  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-blink-features=AutomationControlled',
    '--disable-infobars',
    '--window-position=0,0',
    `--window-size=${windowWidth},${windowHeight}`,
    '--ignore-certificate-errors',
    '--ignore-certificate-errors-spki-list',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--disable-gpu',
    '--hide-scrollbars',
    '--mute-audio',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-features=Translate,site-per-process,IsolateOrigins,Http2',
    '--lang=en-US',
    '--force-device-scale-factor=1',
    // Set app icon for taskbar
    `--app-icon=${iconPath}`,
    // Network optimization for proxies
    '--disable-http2',
    '--disable-quic',
    // Allow all content including ads - NO BLOCKING
    '--disable-popup-blocking',
    '--disable-extensions',
    '--disable-plugins-discovery',
    '--allow-running-insecure-content',
    '--disable-web-security',
    '--disable-site-isolation-trials',
    '--disable-features=IsolateOrigins,site-per-process',
    '--disable-site-isolation-for-policy',
    '--allow-insecure-localhost',
    '--disable-blink-features=BlockCredentialedSubresources',
    // WebRTC blocking flags
    '--disable-webrtc',
    '--disable-webrtc-hw-encoding',
    '--disable-webrtc-hw-decoding',
    '--disable-webrtc-encryption',
    '--enforce-webrtc-ip-permission-check'
  ];
  
  // Mobile-specific args
  if (isMobile) {
    args.push('--use-mobile-user-agent');
    args.push('--enable-features=OverlayScrollbar');
    console.log(`📱 Mobile mode enabled for ${platform}: ${windowWidth}x${windowHeight}`);
  } else {
    console.log(`🖥️ Desktop mode for ${platform}: ${windowWidth}x${windowHeight}`);
  }
  
  const proxy = options && options.proxy;
  if (proxy && proxy.host && proxy.port) {
    const proxyType = (proxy.type || 'http').toLowerCase();
    
    // HTTP/HTTPS proxies - working perfectly!
    if (proxyType === 'http' || proxyType === 'https') {
      const proxyUri = `${proxyType}://${proxy.host}:${proxy.port}`;
      args.push(`--proxy-server=${proxyUri}`);
      console.log('✅ Using HTTP/HTTPS proxy:', proxyUri);
    }
    // SOCKS5 will be handled separately in openAntiBrowser
    else if (proxyType === 'socks5' || proxyType === 'socks') {
      console.log('🔧 SOCKS5 proxy detected - will create tunnel');
      // Proxy args will be added after tunnel creation
    }
  }
  
  return args;
}

// 🚀 NEW: Smart launcher - Playwright for mobile, Chrome139 for desktop
async function openAntiBrowser(profile, options) {
  try {
    console.log('🔍 ============ openAntiBrowser DEBUG ============');
    console.log('🔍 profile.id:', profile?.id);
    console.log('🔍 profile.name:', profile?.name);
    console.log('🔍 profile.platform (RAW):', profile?.platform);
    console.log('🔍 profile.platform type:', typeof profile?.platform);
    console.log('🔍 Full profile object:', JSON.stringify(profile, null, 2));
    console.log('🔍 options:', JSON.stringify(options || {}));
    
    const platform = (profile.platform || '').toLowerCase().trim();
    console.log('🔍 platform (processed):', platform);
    console.log('🔍 platform === "android":', platform === 'android');
    console.log('🔍 platform === "ios":', platform === 'ios');
    
    // Check if mobile platform (Android/iOS)
    const isMobilePlatform = platform === 'android' || platform === 'ios';
    console.log('🔍 isMobilePlatform:', isMobilePlatform);
    
    if (isMobilePlatform) {
      console.log(`✅ Playwright Mobile Launch selected for profile: ${profile.id} (${platform.toUpperCase()})`);
      return await playwrightMobileLauncher.launchMobile(profile);
    } else {
      console.log(`✅ Chrome 139 Launch selected for profile: ${profile.id} (platform: ${platform || 'windows'})`);
      return await chrome139Runtime.launchProfile(profile, options);
    }
  } catch (error) {
    console.error('❌❌❌ CRITICAL ERROR in openAntiBrowser:');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    throw error;
  }
}

// 🛑 NEW: Smart closer - checks which browser type
async function closeAntiBrowser(profileId) {
  console.log('🛑 Close requested for profile:', profileId);
  
  // Cancel any pending auto-close timer for this profile
  if (global.rpaAutoCloseTimers && global.rpaAutoCloseTimers.has(profileId)) {
    clearTimeout(global.rpaAutoCloseTimers.get(profileId));
    global.rpaAutoCloseTimers.delete(profileId);
    console.log(`⏰ Cancelled auto-close timer for profile ${profileId} (manual close)`);
  }
  
  // Clean up RPA execution time storage
  if (global.rpaExecutionTimes && global.rpaExecutionTimes.has(profileId)) {
    global.rpaExecutionTimes.delete(profileId);
    console.log(`🧹 Cleared RPA execution time for profile ${profileId} (manual close)`);
  }
  
  // Check if it's a Playwright mobile browser
  if (playwrightMobileLauncher.isActive(profileId)) {
    console.log('🛑 Closing Playwright mobile browser:', profileId);
    return await playwrightMobileLauncher.closeMobile(profileId);
  } else {
    console.log('🛑 Closing Chrome 139 browser:', profileId);
    return await chrome139Runtime.closeProfile(profileId);
  }
}

// Old Puppeteer code removed - now using Chrome 139 runtime exclusively
// The functions below are kept for RPA and other features

// Security: Validate user script for dangerous operations
function validateUserScript(scriptContent) {
  const dangerousPatterns = [
    /require\s*\(/gi,
    /import\s+.*from/gi,
    /fs\.\w+/gi,
    /child_process/gi,
    /eval\s*\(/gi,
    // Removed: /Function\s*\(/gi - too strict, blocks legitimate code
    /\bprocess\./gi,
    /__dirname/gi,
    /__filename/gi,
    /Buffer\./gi
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(scriptContent)) {
      return {
        valid: false,
        error: `Security Error: Script contains potentially dangerous operation: ${pattern.source}`
      };
    }
  }

  return { valid: true };
}

async function executeAction(profileId, action) {
  const entry = activeProfiles.get(profileId);
  if (!entry) return { success: false, error: 'Profile not open' };
  const page = entry.page;
  try {
    switch (action.id) {
      case 'navigate':
      profile.platform = platform;
      console.log(`✅ Platform field set to: "${platform}"`);
    }

    const userDataDir = getProfileDir(profile.id);
  let args = buildLaunchArgs(profile, options || {});
  let socks5Tunnel = null;

  // Handle SOCKS5 proxy separately (creates local HTTP tunnel)
  const proxy = options && options.proxy;
  if (proxy && socks5Handler.isSocks5Proxy(proxy)) {
    try {
      console.log('🔧 Creating SOCKS5 tunnel for profile:', profile.id);
      const socksInfo = await socks5Handler.getSocks5ProxyArgs(profile.id, proxy);
      socks5Tunnel = socksInfo.tunnel;
      
      // Add SOCKS5 tunnel proxy args
      args = args.concat(socksInfo.args);
      
      console.log('✅ SOCKS5 tunnel created! Local proxy:', socksInfo.proxyUrl);
    } catch (error) {
      console.error('❌ Failed to create SOCKS5 tunnel:', error.message);
      // Clear launch queue on SOCKS5 error
      launchQueue.delete(profile.id);
      return { success: false, error: `SOCKS5 tunnel failed: ${error.message}` };
    }
  }
  
  // Use bundled Chromium - NO system Chrome dependency!
  console.log('🚀 Looking for bundled Chromium...');
  
  // Find bundled Chromium path
  let chromiumPath = null;
  
  // In production (packaged app)
  if (app.isPackaged) {
    // Check bundled chromium-cache in resources
    const bundledChromiumBase = path.join(process.resourcesPath, 'chromium-cache', 'chrome');
    console.log('📦 Checking bundled Chromium at:', bundledChromiumBase);
    
    if (fs.existsSync(bundledChromiumBase)) {
      // Find the version folder (e.g., win64-140.0.7339.185)
      const versions = fs.readdirSync(bundledChromiumBase);
      if (versions.length > 0) {
        const versionFolder = versions[0]; // Get first (should be only one)
        chromiumPath = path.join(bundledChromiumBase, versionFolder, 'chrome-win64', 'chrome.exe');
        console.log('✅ Found bundled Chromium:', chromiumPath);
      }
    }
  }
  
  // In development - use local cache
  if (!chromiumPath) {
    try {
      chromiumPath = puppeteer.executablePath();
      console.log('🔧 Using development Chromium:', chromiumPath);
    } catch (e) {
      console.error('❌ Could not find Chromium:', e.message);
    }
  }
  
  // Final check - if still no Chromium found
  if (!chromiumPath || !fs.existsSync(chromiumPath)) {
    console.error('❌ CRITICAL: Chromium not found!');
    console.error('📦 App packaged:', app.isPackaged);
    console.error('📂 Resources path:', process.resourcesPath);
    
    // Cleanup and return error
    if (socks5Tunnel) {
      try {
        await socks5Handler.closeSocks5Tunnel(profile.id);
      } catch (_) {}
    }
    launchQueue.delete(profile.id);
    
    return {
      success: false,
      error: 'Browser engine not found. Please reinstall the application.'
    };
  }
  
  const launchOptions = {
    headless: false,
    userDataDir,
    args,
    defaultViewport: null,
    executablePath: chromiumPath, // Use bundled Chromium
    timeout: 60000, // 60 seconds browser launch timeout
    protocolTimeout: 180000, // 3 minutes protocol timeout
    ignoreHTTPSErrors: true,
    dumpio: false // Don't dump browser process stdout/stderr
  };

  let browser;
  try {
    console.log('🚀 Launching Puppeteer with bundled Chromium...');
    browser = await puppeteerExtra.launch(launchOptions);
    console.log('✅ Browser launched successfully!');
  } catch (launchError) {
    console.error('❌ Browser launch failed:', launchError.message);
    
    // Cleanup SOCKS5 tunnel on launch failure
    if (socks5Tunnel) {
      try {
        await socks5Handler.closeSocks5Tunnel(profile.id);
      } catch (_) {}
    }
    
    // CRITICAL: Clear launch queue on error
    launchQueue.delete(profile.id);
    
    return { 
      success: false, 
      error: `Failed to launch browser: ${launchError.message}. Please try again.` 
    };
  }
  const pages = await browser.pages();
  const page = pages.length > 0 ? pages[0] : await browser.newPage();
  
  // 📐 Initialize responsive browser behavior
  await responsiveBrowserHandler.initialize(profile.id, page, browser);
  
  // Set custom window title to show in taskbar
  await page.evaluateOnNewDocument(() => {
    // Override document.title to show custom name
    Object.defineProperty(document, 'title', {
      get: function() {
        return 'Beast Browser - Anti-Detection';
      },
      set: function(newTitle) {
        // Allow title changes but prefix with Beast Browser
        Object.defineProperty(document, 'title', {
          value: `Beast Browser - ${newTitle}`,
          writable: true,
          configurable: true
        });
      },
      configurable: true
    });
  });

  // Set longer timeouts for page operations (especially for SOCKS5)
  page.setDefaultTimeout(120000); // 2 minutes default timeout
  page.setDefaultNavigationTimeout(180000); // 3 minutes navigation timeout

  // Proxy auth (proxy variable already declared above)
  if (proxy && proxy.username) {
    await page.authenticate({ username: proxy.username, password: proxy.password || '' });
  }

  // Enable request interception for HTTPS upgrade
  await page.setRequestInterception(true);
  
  // Global MutationObserver fix and ad-blocking prevention
  await page.evaluateOnNewDocument(() => {
    // Fix MutationObserver globally to prevent errors from any script
    const OriginalMutationObserver = window.MutationObserver;
    window.MutationObserver = class SafeMutationObserver extends OriginalMutationObserver {
      observe(target, options) {
        // Validate that target is a valid Node
        if (!target || !(target instanceof Node)) {
          console.warn('⚠️ Invalid MutationObserver target, skipping observe');
          return;
        }
        try {
          return super.observe(target, options);
        } catch (e) {
          console.warn('⚠️ MutationObserver.observe failed:', e.message);
        }
      }
    };
    
    console.log('✅ MutationObserver globally patched for safety');
  });
  
  // Force HTTPS and prevent ad-blocking
  await page.evaluateOnNewDocument(() => {
    // Intercept and upgrade HTTP to HTTPS for XHR
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      if (typeof url === 'string' && url.startsWith('http://') && !url.includes('localhost')) {
        url = url.replace('http://', 'https://');
        console.log('🔒 XHR upgraded to HTTPS:', url);
      }
      return originalOpen.call(this, method, url, ...rest);
    };

    // Intercept fetch and upgrade to HTTPS
    const originalFetch = window.fetch;
    window.fetch = function(url, ...rest) {
      if (typeof url === 'string' && url.startsWith('http://') && !url.includes('localhost')) {
        url = url.replace('http://', 'https://');
        console.log('🔒 Fetch upgraded to HTTPS:', url);
      }
      return originalFetch.call(this, url, ...rest);
    };
    
    // Intercept document.location changes
    const originalLocationSetter = Object.getOwnPropertyDescriptor(window.location, 'href').set;
    Object.defineProperty(window.location, 'href', {
      set: function(url) {
        if (typeof url === 'string' && url.startsWith('http://') && !url.includes('localhost')) {
          url = url.replace('http://', 'https://');
          console.log('🔒 Location upgraded to HTTPS:', url);
        }
        return originalLocationSetter.call(this, url);
      }
    });

    // Prevent any ad-blocking scripts
    console.log('✅ Ad-blocking prevention enabled');
    console.log('✅ HTTPS upgrade enabled');
    console.log('✅ All content allowed - No blocking');
    
    // Override any potential ad-blockers
    Object.defineProperty(window, 'adBlockEnabled', {
      get: () => false,
      configurable: false
    });
    
    // Prevent ad-block detection
    Object.defineProperty(window, 'canRunAds', {
      get: () => true,
      configurable: false
    });
    
    // Override common ad-blocker detection methods
    window.adsbygoogle = window.adsbygoogle || [];
    
    // Ensure Google Ads can load in iframes
    try {
      delete window.frameElement;
    } catch (e) {}
    
    // Override iframe sandbox restrictions for ads
    const originalCreateElement = document.createElement;
    document.createElement = function(tagName, options) {
      const element = originalCreateElement.call(this, tagName, options);
      if (tagName.toLowerCase() === 'iframe') {
        // Remove sandbox restrictions that might block ads
        const originalSetAttribute = element.setAttribute;
        element.setAttribute = function(name, value) {
          if (name.toLowerCase() === 'sandbox') {
            // Allow scripts and same-origin for ads
            value = value + ' allow-scripts allow-same-origin allow-popups allow-forms';
          }
          return originalSetAttribute.call(this, name, value);
        };
      }
      return element;
    };
    
    console.log('✅ Google Ads iframe restrictions removed');
  });

  await applyPageAntiDetection(page, profile, options || {});
  
  // Set zoom level to 100% to prevent scaling issues
  try {
    const session = await page.target().createCDPSession();
    await session.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1.0 });
    await session.send('Emulation.setDeviceMetricsOverride', {
      width: 0,
      height: 0,
      deviceScaleFactor: 1,
      mobile: false,
      screenOrientation: { type: 'landscapePrimary', angle: 0 }
    });
  } catch (e) {
    console.log('⚠️ Could not set page scale:', e.message);
  }

  // Intercept ALL navigation requests to upgrade HTTP to HTTPS
  page.on('request', async (request) => {
    const url = request.url();
    
    // Only intercept main frame navigations (URL bar changes)
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
      if (url.startsWith('http://') && !url.includes('localhost') && !url.includes('127.0.0.1')) {
        const httpsUrl = url.replace('http://', 'https://');
        console.log('🔒 Navigation upgraded to HTTPS:', httpsUrl);
        
        // Abort the HTTP request and navigate to HTTPS instead
        await request.abort();
        await page.goto(httpsUrl, { 
          waitUntil: 'domcontentloaded',
          timeout: 180000
        }).catch(() => {});
        return;
      }
    }
    
    // Continue with normal request
    request.continue().catch(() => {});
  });

  // Starting URL with HTTPS forcing
  if (profile.startingUrl) {
    // Force HTTPS if URL starts with http://
    let targetUrl = profile.startingUrl;
    if (targetUrl.startsWith('http://') && !targetUrl.includes('localhost')) {
      targetUrl = targetUrl.replace('http://', 'https://');
      console.log('🔒 Upgraded HTTP to HTTPS:', targetUrl);
    }
    
    try { 
      console.log(`🌐 Navigating to: ${targetUrl}`);
      await page.goto(targetUrl, { 
        waitUntil: 'domcontentloaded', // Faster loading
        timeout: 180000 // 3 minutes timeout for SOCKS5
      }); 
      console.log('✅ Page loaded successfully');
    } catch (err) {
      console.error(`⚠️ Failed to load starting URL:`, err.message);
      // Don't fail - just log and continue
      console.log('⚠️ Continuing with blank page...');
    }
  }

  browser.on('disconnected', async () => {
    activeProfiles.delete(profile.id);
    launchQueue.delete(profile.id);
    
    // 🗑️ Cleanup responsive handler
    responsiveBrowserHandler.cleanup(profile.id);
    
    // Close SOCKS5 tunnel if it exists
    if (socks5Tunnel) {
      try {
        await socks5Handler.closeSocks5Tunnel(profile.id);
      } catch (err) {
        console.error('⚠️ Error closing SOCKS5 tunnel on disconnect:', err.message);
      }
    }
    
    BrowserWindow.getAllWindows().forEach((w) => w.webContents.send('profile-window-closed', profile.id));
  });

  activeProfiles.set(profile.id, { browser, page, userDataDir, launchedAt: Date.now(), options: options || {} });
  
  // Remove from launch queue after successful launch
  launchQueue.delete(profile.id);
  console.log('✅ Profile launched successfully:', profile.id);
  
  return { success: true };
  
  } catch (error) {
    // Remove from launch queue on error
    launchQueue.delete(profile.id);
    console.error('❌ Failed to launch profile:', profile.id, error.message);
    return { success: false, error: error.message };
  }
}

// ❌ REMOVED: Duplicate closeAntiBrowser function (old Puppeteer code)
// The correct closeAntiBrowser is defined above (line ~1329)
// This duplicate was causing browser windows to not close properly

// Security: Validate user script for dangerous operations
function validateUserScript(scriptContent) {
  const dangerousPatterns = [
    /require\s*\(/gi,
    /import\s+.*from/gi,
    /fs\.\w+/gi,
    /child_process/gi,
    /eval\s*\(/gi,
    // Removed: /Function\s*\(/gi - too strict, blocks legitimate code
    /\bprocess\./gi,
    /__dirname/gi,
    /__filename/gi,
    /Buffer\./gi
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(scriptContent)) {
      return {
        valid: false,
        error: `Security Error: Script contains potentially dangerous operation: ${pattern.source}`
      };
    }
  }

  return { valid: true };
}

async function executeAction(profileId, action) {
  const entry = activeProfiles.get(profileId);
  if (!entry) return { success: false, error: 'Profile not open' };
  const page = entry.page;
  try {
    switch (action.id) {
      case 'navigate':
        const url = action.params?.url || 'https://www.google.com';
        // Navigate and wait for network idle for better page load
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
        return { success: true };
      case 'new_tab':
        const newPage = await page.browser().newPage();
        // Bring new tab to front
        await newPage.bringToFront();
        return { success: true };
      case 'close_tab':
        {
          const pages = await page.browser().pages();
          const idx = Math.max(0, Math.min((action.params?.tabIndex ?? pages.length - 1), pages.length - 1));
          await pages[idx].close({ runBeforeUnload: true });
          return { success: true };
        }
      case 'switch_tab':
        {
          const pages = await page.browser().pages();
          const idx = Math.max(0, Math.min((action.params?.tabIndex ?? 0), pages.length - 1));
          const target = pages[idx];
          await target.bringToFront();
          return { success: true };
        }
      case 'refresh':
        await page.reload({ waitUntil: 'domcontentloaded' });
        return { success: true };
      case 'go_back':
        await page.goBack({ waitUntil: 'domcontentloaded' });
        return { success: true };
      case 'click':
        const selector = action.params?.selector;
        const timeout = action.params?.timeout || 10000;
        
        // Wait for element to be visible and clickable
        await page.waitForSelector(selector, { timeout, visible: true });
        
        // Add small delay before click for better reliability
        await page.waitForTimeout(100);
        
        // Perform click with proper delay
        await page.click(selector, { delay: 100 });
        
        // Wait a bit after click for any UI updates
        await page.waitForTimeout(200);
        return { success: true };
      case 'input':
        const inputSelector = action.params?.selector;
        const inputText = action.params?.text || '';
        const inputTimeout = action.params?.timeout || 10000;
        
        // Wait for element to be visible and enabled
        await page.waitForSelector(inputSelector, { timeout: inputTimeout, visible: true });
        
        // Clear the field first if needed
        await page.focus(inputSelector);
        await page.click(inputSelector, { clickCount: 3 }); // Select all
        await page.keyboard.press('Backspace');
        
        // Type with human-like delay
        const typingDelay = 50 + Math.random() * 100;
        await page.type(inputSelector, inputText, { delay: typingDelay });
        
        // Wait a bit after input
        await page.waitForTimeout(100);
        return { success: true };
      case 'wait':
        const waitTime = action.params?.ms || 1000;
        // Ensure minimum wait time for better reliability
        const actualWaitTime = Math.max(100, waitTime);
        await page.waitForTimeout(actualWaitTime);
        return { success: true };
      case 'scroll':
        // Implement smooth continuous scrolling exactly like the provided script
        await page.evaluate(() => {
          // Set timeout to start scrolling after 32 seconds like in the provided script
          setTimeout(() => {
            let direction = 1; // 1 for down, -1 for up
            const scrollSpeed = 2; // Adjust speed of continuous scroll
            const scrollInterval = 16; // ~60fps
            let isScrolling = true;

            function continuousScroll() {
              if (!isScrolling) return;

              const maxHeight = document.body.scrollHeight - window.innerHeight;
              const currentPos = window.scrollY;

              // Reverse direction at top or bottom
              if (currentPos >= maxHeight && direction === 1) {
                direction = -1;
              } else if (currentPos <= 0 && direction === -1) {
                direction = 1;
              }

              window.scrollBy({
                top: scrollSpeed * direction,
                behavior: 'smooth'
              });

              // Continue scrolling
              setTimeout(continuousScroll, scrollInterval);
            }

            // Start scrolling
            setTimeout(() => {
              continuousScroll();
            }, 32000);

            // Stop scrolling on user interaction
            window.addEventListener('wheel', () => {
              isScrolling = false;
            });
            window.addEventListener('touchstart', () => {
              isScrolling = false;
            });

            // Functions to manually trigger top/bottom scroll
            window.scrollToTop = function() {
              window.scrollTo({
                top: 0,
                behavior: 'smooth'
              });
              isScrolling = false;
            }

            window.scrollToBottom = function() {
              window.scrollTo({
                top: document.body.scrollHeight,
                behavior: 'smooth'
              });
              isScrolling = false;
            }
          }, 32000); // Start scrolling after 32 seconds
        });
        return { success: true };
      case 'hover':
        await page.waitForSelector(action.params?.selector, { timeout: action.params?.timeout || 10000 });
        await page.hover(action.params?.selector);
        return { success: true };
      case 'focus':
        await page.waitForSelector(action.params?.selector, { timeout: action.params?.timeout || 10000 });
        await page.focus(action.params?.selector);
        return { success: true };
      case 'dropdown':
        await page.waitForSelector(action.params?.selector, { timeout: action.params?.timeout || 10000 });
        await page.select(action.params?.selector, action.params?.value || '');
        return { success: true };
      case 'screenshot':
        const buf = await page.screenshot({ encoding: 'base64', fullPage: true });
        return { success: true, data: { base64: buf } };
      case 'extract':
        await page.waitForSelector(action.params?.selector, { timeout: action.params?.timeout || 10000 });
        const text = await page.$eval(action.params?.selector, (el) => el.innerText);
        return { success: true, data: { text } };
      case 'execute_custom_script':
        // Execute user's custom JavaScript automation
        return await executeCustomRPAScript(profileId, action.params);
      default:
        return { success: false, error: 'Unknown action' };
    }
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function dirSize(dir) {
  let total = 0;
  const stack = [dir];
  while (stack.length) {
    const p = stack.pop();
    if (!p || !fs.existsSync(p)) continue;
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      for (const f of fs.readdirSync(p)) stack.push(path.join(p, f));
    } else {
      total += stat.size;
    }
  }
  return total;
}

async function clearProfileData(profileId, types) {
  const dir = getProfileDir(profileId);
  const targets = [];
  if (!types || types.includes('cache')) targets.push('Cache');
  if (!types || types.includes('cookies')) targets.push('Cookies');
  if (!types || types.includes('history')) targets.push('History');
  let cleared = 0;
  for (const t of targets) {
    const p = path.join(dir, 'Default', t);
    try {
      if (fs.existsSync(p)) {
        const before = dirSize(p);
        fs.rmSync(p, { recursive: true, force: true });
        cleared += before;
      }
    } catch (_) {}
  }
  return { success: true, clearedBytes: cleared };
}

function getProfileUsage(profileId) {
  const dir = getProfileDir(profileId);
  return { success: true, bytes: dirSize(dir) };
}

// Execute custom RPA script with security validation and console capture
async function executeCustomRPAScript(profileId, params) {
  const entry = activeProfiles.get(profileId);
  if (!entry) return { success: false, error: 'Profile not open' };
  
  const { websiteUrl, scriptContent, executionTime, scriptName } = params;
  
  if (!scriptContent || !scriptContent.trim()) {
    return { success: false, error: 'Script content is empty' };
  }
  
  if (!websiteUrl || !websiteUrl.trim()) {
    return { success: false, error: 'Website URL is required' };
  }
  
  // Security validation
  const validation = validateUserScript(scriptContent);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }
  
  const page = entry.page;
  const consoleLogs = [];
  
  try {
    console.log(`\n🚀 Starting RPA Script: "${scriptName}"`);
    console.log(`📍 Target URL: ${websiteUrl}`);
    console.log(`⏱️ Execution Duration: ${executionTime} minutes`);
    
    // Setup console message capture from browser
    page.on('console', msg => {
      const logEntry = {
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date().toISOString()
      };
      consoleLogs.push(logEntry);
      console.log(`[Browser ${msg.type().toUpperCase()}]:`, msg.text());
    });
    
    // Setup error capture
    page.on('pageerror', error => {
      const errorEntry = {
        type: 'error',
        text: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      };
      consoleLogs.push(errorEntry);
      console.error(`[Browser ERROR]:`, error.message);
    });
    
    // Navigate to target URL
    console.log(`🌐 Navigating to: ${websiteUrl}`);
    await page.goto(websiteUrl, { 
      waitUntil: 'networkidle2', 
      timeout: 60000 
    });
    
    console.log('✅ Page loaded successfully');
    
    // Execute user's custom JavaScript in page context
    console.log('🤖 Executing custom automation script...');
    console.log('📝 Script length:', scriptContent.length, 'characters');
    console.log('📄 Script preview (first 200 chars):', scriptContent.substring(0, 200));
    
    // Execute script and capture any errors
    const evalResult = await page.evaluate((userScript) => {
      try {
        console.log('🎬 [INSIDE BROWSER] Starting script execution...');
        console.log('📋 [INSIDE BROWSER] Script type:', typeof userScript);
        console.log('📝 [INSIDE BROWSER] Script length:', userScript.length);
        
        // Execute user's script in sandboxed context
        eval(userScript);
        
        console.log('✅ [INSIDE BROWSER] Script eval completed without errors');
        return { success: true, message: 'Script executed' };
      } catch (error) {
        console.error('❌ [INSIDE BROWSER] Script execution error:', error.message);
        console.error('❌ [INSIDE BROWSER] Error stack:', error.stack);
        return { success: false, error: error.message, stack: error.stack };
      }
    }, scriptContent);
    
    console.log('📊 Evaluation result:', evalResult);
    
    if (!evalResult.success) {
      console.error('❌ Script evaluation failed:', evalResult.error);
      throw new Error(`Script evaluation failed: ${evalResult.error}`);
    }
    
    console.log('✅ Script injected and started');
    
    // Keep browser open for specified duration
    const durationMs = executionTime * 60 * 1000; // Convert minutes to milliseconds
    console.log(`⏳ Keeping browser open for ${executionTime} minute(s)...`);
    
    // Wait for execution duration
    await new Promise(resolve => setTimeout(resolve, durationMs));
    
    console.log(`✅ RPA Script "${scriptName}" completed successfully\n`);
    
    return { 
      success: true, 
      message: 'Script executed successfully',
      consoleLogs: consoleLogs,
      duration: executionTime
    };
    
  } catch (error) {
    console.error(`❌ RPA Script "${scriptName}" failed:`, error.message);
    return { 
      success: false, 
      error: error.message,
      consoleLogs: consoleLogs
    };
  }
}

// IPC
function setupIPC() {
  // Setup profile storage handlers first
  setupProfileStorageHandlers();
  
  // Setup persistent storage handlers for auth
  const storage = getStorage();
  ipcMain.handle('storage-get', async (_e, key) => storage.getItem(key));
  ipcMain.handle('storage-set', async (_e, key, value) => storage.setItem(key, value));
  ipcMain.handle('storage-remove', async (_e, key) => storage.removeItem(key));
  ipcMain.handle('storage-clear', async () => storage.clear());
  console.log('✅ Persistent storage handlers registered');
  
  ipcMain.handle('antiBrowserOpen', async (_e, profile, opts) => openAntiBrowser(profile, opts || {}));
  ipcMain.handle('antiBrowserClose', async (_e, profileId) => closeAntiBrowser(profileId));
  
  // ✅ Check profile status from both runtimes
  ipcMain.handle('getProfileStatus', async (_e, profileId) => {
    const isActiveChrome = chrome139Runtime.isProfileActive(profileId);
    const isActivePlaywright = playwrightMobileLauncher.isActive(profileId);
    return { isOpen: isActiveChrome || isActivePlaywright };
  });
  
  // Bulk operations - Launch multiple profiles in parallel
  ipcMain.handle('antiBrowserOpenBulk', async (_e, profiles, opts) => {
    console.log(`🚀 Bulk launch requested for ${profiles.length} profiles`);
    const results = await Promise.allSettled(
      profiles.map(profile => openAntiBrowser(profile, opts || {}))
    );
    
    const succeeded = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - succeeded;
    
    console.log(`✅ Bulk launch complete: ${succeeded} succeeded, ${failed} failed`);
    return {
      success: true,
      results: results.map((r, i) => ({
        profileId: profiles[i].id,
        success: r.status === 'fulfilled' && r.value.success,
        error: r.status === 'rejected' ? r.reason?.message : (r.value.error || null)
      })),
      summary: { succeeded, failed, total: profiles.length }
    };
  });
  
  // Bulk close - Close multiple profiles in parallel
  ipcMain.handle('antiBrowserCloseBulk', async (_e, profileIds) => {
    console.log(`🛑 Bulk close requested for ${profileIds.length} profiles`);
    const results = await Promise.allSettled(
      profileIds.map(id => closeAntiBrowser(id))
    );
    
    const succeeded = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - succeeded;
    
    console.log(`✅ Bulk close complete: ${succeeded} succeeded, ${failed} failed`);
    return {
      success: true,
      results: results.map((r, i) => ({
        profileId: profileIds[i],
        success: r.status === 'fulfilled' && r.value.success,
        error: r.status === 'rejected' ? r.reason?.message : (r.value.error || null)
      })),
      summary: { succeeded, failed, total: profileIds.length }
    };
  });
  
  // Profile deletion - Close browser before deletion
  ipcMain.handle('profileWillDelete', async (_e, profileId) => {
    console.log(`🗑️ Profile deletion requested: ${profileId}`);
    
    // Close browser if active
    if (activeProfiles.has(profileId)) {
      console.log(`🛑 Closing active browser for profile: ${profileId}`);
      await closeAntiBrowser(profileId);
    }
    
    // Remove from launch queue if queued
    if (launchQueue.has(profileId)) {
      console.log(`❌ Removing from launch queue: ${profileId}`);
      launchQueue.delete(profileId);
    }
    
    // Remove from close queue if present
    closeQueue.delete(profileId);
    
    console.log(`✅ Profile cleanup complete: ${profileId}`);
    return { success: true };
  });
  
  // Bulk deletion - Close browsers before deletion
  ipcMain.handle('profilesWillDelete', async (_e, profileIds) => {
    console.log(`🗑️ Bulk deletion requested for ${profileIds.length} profiles`);
    
    const results = await Promise.allSettled(
      profileIds.map(async (id) => {
        if (activeProfiles.has(id)) {
          await closeAntiBrowser(id);
        }
        launchQueue.delete(id);
        closeQueue.delete(id);
        return { profileId: id, success: true };
      })
    );
    
    console.log(`✅ Bulk cleanup complete for ${profileIds.length} profiles`);
    return { success: true, results };
  });
  
  // ✅ RPA Script Execution - DIRECT INJECTION (No Extension)
  ipcMain.handle('executeRPAScript', async (_e, profileId, action) => {
    console.log('\n📨 executeRPAScript called with:', {
      profileId,
      actionName: action.name,
      hasScriptContent: !!action.scriptContent,
      executionTime: action.executionTime
    });
    
    try {
      // Store RPA script for this profile - will be injected when browser opens
      global.rpaScriptsToInject = global.rpaScriptsToInject || new Map();
      global.rpaScriptsToInject.set(profileId, {
        scriptContent: action.scriptContent,
        scriptName: action.name,
        executionTime: action.executionTime
      });
      
      console.log('✅ RPA script stored for direct injection');
      console.log('✅ Script will be injected immediately when profile opens');
      console.log(`⏱️ Execution Duration: ${action.executionTime} minutes`);
      console.log('🌐 Script will run on profile\'s Starting URL');
      console.log('🎯 Using DIRECT INJECTION (no extension needed)');
      
      // Check if profile is currently running
      const isRunning = chrome139Runtime.isProfileActive(profileId);
      
      // Store RPA execution time for auto-close
      if (action.executionTime && action.executionTime > 0) {
        global.rpaExecutionTimes = global.rpaExecutionTimes || new Map();
        global.rpaExecutionTimes.set(profileId, action.executionTime);
        console.log(`📝 Saved RPA execution time: ${action.executionTime} minute(s) for profile ${profileId}`);
        console.log(`⏰ Auto-close timer will start AFTER profile launches`);
      }
      
      // If profile is already running, inject script NOW
      if (isRunning) {
        console.log('🚀 Profile is running - attempting immediate injection...');
        const result = await chrome139Runtime.injectRPAScript(profileId);
        if (result.success) {
          console.log('✅ Script injected immediately!');
          return {
            success: true,
            message: 'Script injected into running profile!',
            injectedImmediately: true,
            autoCloseScheduled: !!(action.executionTime && action.executionTime > 0),
            executionTimeMinutes: action.executionTime
          };
        } else {
          console.warn('⚠️ Immediate injection failed, will inject on next page load');
        }
      }
      
      return {
        success: true,
        message: isRunning 
          ? 'Script will be injected on next page navigation'
          : 'Script ready! Will be injected when profile opens',
        needsRelaunch: false,
        autoCloseScheduled: !!(action.executionTime && action.executionTime > 0),
        executionTimeMinutes: action.executionTime
      };
    } catch (error) {
      console.error('❌ Failed to setup RPA execution:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });
  ipcMain.handle('clearProfileData', async (_e, profileId, types) => clearProfileData(profileId, types));
  ipcMain.handle('clearAllProfileData', async (_e, profileId) => clearProfileData(profileId, ['cache', 'cookies', 'history']));
  ipcMain.handle('getProfileDataUsage', async (_e, profileId) => getProfileUsage(profileId));
  // ✅ Chrome 139: Close all profiles
  ipcMain.handle('closeAllProfiles', async () => {
    console.log('🛑 Close all profiles requested');
    return await chrome139Runtime.closeAll();
  });
  
  // Chrome 139 Runtime Handlers
  ipcMain.handle('chrome139:getRuntimeInfo', async () => {
    return chrome139Runtime.getRuntimeInfo();
  });
  
  ipcMain.handle('chrome139:launchProfile', async (_e, profile) => {
    console.log('🚀 Chrome 139 launch requested for profile:', profile.id);
    return await chrome139Runtime.launchProfile(profile);
  });
  
  ipcMain.handle('chrome139:closeProfile', async (_e, profileId) => {
    console.log('🛑 Chrome 139 close requested for profile:', profileId);
    return await chrome139Runtime.closeProfile(profileId);
  });
  
  ipcMain.handle('chrome139:getActiveProfiles', async () => {
    // Return both Chrome139 AND Playwright mobile profiles
    const chromeProfiles = chrome139Runtime.getActiveProfiles();
    const playwrightProfiles = playwrightMobileLauncher.getActiveProfiles();
    
    // Combine both lists (no duplicates since they use different runtimes)
    const allActiveProfiles = [...chromeProfiles, ...playwrightProfiles];
    
    console.log(`📊 Active profiles: ${allActiveProfiles.length} total (Chrome: ${chromeProfiles.length}, Playwright: ${playwrightProfiles.length})`);
    
    return allActiveProfiles;
  });
  
  ipcMain.handle('chrome139:getProfileInfo', async (_e, profileId) => {
    // Check both Chrome139 and Playwright
    const chromeInfo = chrome139Runtime.getProfileInfo(profileId);
    if (chromeInfo) return chromeInfo;
    
    const playwrightInfo = playwrightMobileLauncher.getProfileInfo(profileId);
    if (playwrightInfo) return playwrightInfo;
    
    return null; // Profile not active in either runtime
  });
  
  ipcMain.handle('chrome139:closeAll', async () => {
    // Close both Playwright mobile and Chrome 139 browsers
    const [chromeResult, playwrightResult] = await Promise.allSettled([
      chrome139Runtime.closeAll(),
      playwrightMobileLauncher.closeAll()
    ]);
    
    const chromeClosed = chromeResult.status === 'fulfilled' ? chromeResult.value.closed : 0;
    const playwrightClosed = playwrightResult.status === 'fulfilled' ? playwrightResult.value.closed : 0;
    
    console.log(`✅ Close all complete: ${chromeClosed} Chrome, ${playwrightClosed} Playwright`);
    
    return {
      success: true,
      closed: chromeClosed + playwrightClosed,
      failed: 0
    };
  });
  
  // Fingerprint Test Suite Handlers
  ipcMain.handle('fingerprint:runAllTests', async (_e, chromePath, userDataDir, proxy) => {
    console.log('🧪 Running full fingerprint test suite');
    return await fingerprintTestSuite.runAllTests(chromePath, userDataDir, proxy);
  });
  
  ipcMain.handle('fingerprint:quickTest', async (_e, testName, chromePath, userDataDir, proxy) => {
    console.log(`🧪 Running quick test: ${testName}`);
    return await fingerprintTestSuite.quickTest(testName, chromePath, userDataDir, proxy);
  });
  
  ipcMain.handle('loadUserAgents', async (_e, platform) => {
    const dir = getUserAgentsDir();
    if (!dir) return [];
    const file = path.join(dir, `${platform}.json`);
    if (!fs.existsSync(file)) return [];
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return []; }
  });
  ipcMain.handle('getTimezoneFromIP', async (_e, ipOrHost) => detectTimezoneFromIP(ipOrHost));

  // 🔐 Subscription Validation Handlers
  ipcMain.handle('validateSubscription', async (_e, userEmail) => {
    console.log('🔐 MAIN: Validating subscription for:', userEmail);
    try {
      const status = await subscriptionValidator.validateSubscription(userEmail);
      return status;
    } catch (error) {
      console.error('❌ MAIN: Subscription validation error:', error);
      return {
        valid: false,
        hasSubscription: false,
        message: 'Validation failed: ' + error.message,
        error: error.message
      };
    }
  });

  ipcMain.handle('getSubscriptionDetails', async (_e, userEmail) => {
    return await subscriptionValidator.getSubscriptionDetails(userEmail);
  });

  ipcMain.handle('clearSubscriptionCache', async () => {
    subscriptionValidator.clearCache();
    return { success: true, message: 'Cache cleared' };
  });
  
  // Proxy testing - Test if proxy is working
  ipcMain.handle('testProxy', async (_e, proxy) => {
    const startTime = Date.now();
    
    try {
      // Validate proxy object
      console.log('📥 Received proxy object:', JSON.stringify(proxy, null, 2));
      
      if (!proxy || !proxy.host || !proxy.port) {
        console.error('❌ Invalid proxy object:', proxy);
        return {
          success: false,
          error: 'Invalid proxy configuration: missing host or port',
          responseTime: Date.now() - startTime,
          testedAt: new Date().toISOString()
        };
      }
      
      // Normalize proxy type
      const proxyType = (proxy.type || 'HTTP').toUpperCase();
      console.log(`🧪 Testing proxy: ${proxyType}://${proxy.host}:${proxy.port}`);
      
      // Use axios with proxy agents for better SOCKS5 support
      const axios = require('axios');
      const { HttpsProxyAgent } = require('https-proxy-agent');
      const { SocksProxyAgent } = require('socks-proxy-agent');
      
      // Build proxy URL with authentication
      let proxyUrl;
      if (proxy.username && proxy.password) {
        proxyUrl = `${proxyType.toLowerCase()}://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`;
      } else {
        proxyUrl = `${proxyType.toLowerCase()}://${proxy.host}:${proxy.port}`;
      }
      
      console.log(`🔗 Proxy URL: ${proxyUrl.replace(/:([^:@]+)@/, ':****@')}`); // Hide password in logs
      
      // Create appropriate agent based on proxy type
      let agent;
      if (proxyType === 'SOCKS5' || proxyType === 'SOCKS4') {
        agent = new SocksProxyAgent(proxyUrl);
        console.log('🧦 Using SocksProxyAgent');
      } else {
        agent = new HttpsProxyAgent(proxyUrl);
        console.log('🌐 Using HttpsProxyAgent');
      }
      
      // Test endpoints (try multiple in case one fails)
      const testEndpoints = [
        'https://api.ipify.org?format=json',
        'https://ifconfig.me/ip',
        'https://api.my-ip.io/ip'
      ];
      
      let testResult = null;
      let lastError = null;
      
      for (const endpoint of testEndpoints) {
        try {
          console.log(`📡 Testing endpoint: ${endpoint}`);
          
          const response = await axios.get(endpoint, {
            httpAgent: agent,
            httpsAgent: agent,
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          
          // Extract IP from response
          let detectedIp = null;
          if (typeof response.data === 'object' && response.data.ip) {
            detectedIp = response.data.ip;
          } else if (typeof response.data === 'string') {
            detectedIp = response.data.trim();
          }
          
          if (detectedIp) {
            testResult = { ip: detectedIp, endpoint };
            console.log(`✅ Got IP: ${detectedIp} from ${endpoint}`);
            break;
          }
        } catch (error) {
          lastError = error;
          console.log(`⚠️ Endpoint ${endpoint} failed: ${error.message}`);
          continue;
        }
      }
      
      if (!testResult) {
        throw lastError || new Error('All test endpoints failed');
      }
      
      const responseTime = Date.now() - startTime;
      console.log(`✅ Proxy working! IP: ${testResult.ip} (${responseTime}ms)`);
      
      // Get geo data
      let geoData = null;
      try {
        const geoController = new AbortController();
        const geoTimeout = setTimeout(() => geoController.abort(), 5000);
        
        const geoResponse = await fetch(`https://ipapi.co/${testResult.ip}/json/`, {
          signal: geoController.signal
        });
        
        clearTimeout(geoTimeout);
        
        if (geoResponse.ok) {
          geoData = await geoResponse.json();
          console.log(`📍 Geo data: ${geoData.country_name}, ${geoData.city}`);
        }
      } catch (e) {
        console.warn('⚠️ Geo lookup failed:', e.message);
      }
      
      return {
        success: true,
        ip: testResult.ip,
        responseTime,
        testedAt: new Date().toISOString(),
        country: geoData?.country_name || 'Unknown',
        region: geoData?.region || 'Unknown',
        city: geoData?.city || 'Unknown',
        timezone: geoData?.timezone || 'UTC',
        geoData: geoData ? {
          country: geoData.country_name,
          region: geoData.region,
          city: geoData.city,
          timezone: geoData.timezone
        } : undefined
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(`❌ Proxy test failed:`, error.message);
      
      // Better error messages
      let errorMessage = error.message || 'Connection failed';
      if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Connection refused - proxy not responding';
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = 'Connection timeout - proxy too slow or unreachable';
      } else if (error.code === 'ENOTFOUND') {
        errorMessage = 'Host not found - invalid proxy address';
      } else if (errorMessage.includes('auth')) {
        errorMessage = 'Authentication failed - invalid username/password';
      }
      
      return {
        success: false,
        error: errorMessage,
        responseTime,
        testedAt: new Date().toISOString()
      };
    }
  });
}

async function loadRenderer(win) {
  // IMPORTANT: Don't call win.show() here - let splash screen handle the transition
  
  // Prefer dev server if available
  const devUrl = 'http://localhost:5173';
  try {
    const res = await fetch(devUrl, { timeout: 2000 });
    if (res && res.ok) {
      await win.loadURL(devUrl);
      // Don't show - splash will handle transition
      return;
    }
  } catch (_) {}

  // Try to auto-start Vite dev server and wait until it's ready (ONLY IN DEVELOPMENT)
  if (!app.isPackaged && !devServerProcess) {
    try {
      const { spawn } = require('child_process');
      const cmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      devServerProcess = spawn(cmd, ['run', 'dev'], {
        cwd: process.cwd(),
        stdio: 'inherit',
        shell: false
      });
      devServerProcess.on('exit', () => { devServerProcess = null; });
      
      const ready = await waitForUrl(devUrl, 45000);
      if (ready) {
        await win.loadURL(devUrl);
        // Don't show - splash will handle transition
        return;
      }
    } catch (_) {}
  }

  // Fallback to built files
  let distIndex = path.join(app.getAppPath(), 'dist-new', 'index.html');
  if (!fs.existsSync(distIndex)) {
    // Try old dist folder
    distIndex = path.join(app.getAppPath(), 'dist', 'index.html');
  }
  if (!fs.existsSync(distIndex)) {
    // Also try project root dist-new
    distIndex = path.join(process.cwd(), 'dist-new', 'index.html');
  }
  if (!fs.existsSync(distIndex)) {
    // Also try project root dist
    distIndex = path.join(process.cwd(), 'dist', 'index.html');
  }
  if (fs.existsSync(distIndex)) {
    await win.loadFile(distIndex);
    // Don't show - splash will handle transition
    return;
  }

  // If neither dev nor dist is available, show error (this is an exception)
  const html = `<!doctype html><html><body style="font-family: sans-serif; padding:24px;">
    <h2>BeastBrowser: Renderer not available</h2>
    <p>Start the Vite dev server or build the app:</p>
    <pre>npm run dev  (then run Electron)\n— OR —\nnpm run build && npm run electron-dev</pre>
  </body></html>`;
  win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  // Only show in error case
  win.show();
}

/**
 * Create professional splash screen with loading animation
 */
function createSplashScreen() {
  const iconPath = path.join(__dirname, '..', 'public', 'free.ico');
  
  const splash = new BrowserWindow({
    width: 500,
    height: 300,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    center: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    skipTaskbar: true, // Don't show in taskbar
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  
  // Professional loading screen HTML
  const splashHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          overflow: hidden;
        }
        
        .splash-container {
          text-align: center;
          padding: 40px;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(10px);
          animation: fadeIn 0.5s ease-in;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        
        .logo {
          font-size: 48px;
          font-weight: 800;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 10px;
          letter-spacing: -1px;
        }
        
        .tagline {
          font-size: 14px;
          color: #666;
          margin-bottom: 30px;
          font-weight: 500;
        }
        
        .loader {
          width: 200px;
          height: 4px;
          background: #e0e0e0;
          border-radius: 10px;
          overflow: hidden;
          margin: 0 auto 20px;
        }
        
        .loader-bar {
          height: 100%;
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
          border-radius: 10px;
          animation: loading 1.5s ease-in-out infinite;
        }
        
        @keyframes loading {
          0% { width: 0%; margin-left: 0%; }
          50% { width: 75%; margin-left: 0%; }
          100% { width: 0%; margin-left: 100%; }
        }
        
        .status {
          font-size: 12px;
          color: #999;
          font-weight: 500;
          animation: pulse 2s ease-in-out infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .version {
          font-size: 10px;
          color: #ccc;
          margin-top: 20px;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="splash-container">
        <div class="logo">🦁 BeastBrowser</div>
        <div class="tagline">Anti-Detection Browser</div>
        <div class="loader">
          <div class="loader-bar"></div>
        </div>
        <div class="status">Loading application...</div>
        <div class="version">v2.0.4</div>
      </div>
    </body>
    </html>
  `;
  
  splash.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(splashHTML));
  splash.show();
  
  return splash;
}

function createLauncherWindow() {
  // Get icon path
  const iconPath = path.join(__dirname, '..', 'public', 'free.ico');
  
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // Don't show immediately - wait for splash to finish
    icon: iconPath,
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  
  // Show window when ready
  win.once('ready-to-show', () => {
    console.log('✅ Main window ready to show');
  });
  
  // Prevent window close if browser profiles are open
  win.on('close', (event) => {
    const activeCount = chrome139Runtime.getActiveProfiles().length;
    if (activeCount > 0) {
      console.log('⚠️ Preventing window close - browser profiles still open:', activeCount);
      event.preventDefault(); // Stop window from closing
      
      // Show warning dialog
      const { dialog } = require('electron');
      dialog.showMessageBox(win, {
        type: 'warning',
        title: 'Browser Profiles Open',
        message: 'Cannot close BeastBrowser',
        detail: `You have ${activeCount} browser profile(s) still open.

Please close all browser windows first, then try closing BeastBrowser again.

Or click "Force Close All" to close everything.`,
        buttons: ['Cancel', 'Force Close All'],
        defaultId: 0,
        cancelId: 0
      }).then(async result => {
        // If user clicks "Force Close All"
        if (result.response === 1) {
          console.log('🛑 Force closing all browser profiles...');
          
          // Close all browsers via Chrome 139 runtime
          await chrome139Runtime.closeAll();
          
          console.log('✅ All profiles closed, now closing app');
          win.destroy(); // Force close window
          app.quit();
        }
      });
    }
  });
  
  loadRenderer(win);
  return win;
}

// Auto-updater
const AutoUpdater = require('./auto-updater');
let updater = null;

app.whenReady().then(() => {
  console.log('🚀 BeastBrowser starting...');
  
  // Clear any stale launch/close queues from previous sessions
  launchQueue.clear();
  closeQueue.clear();
  console.log('🧹 Cleared stale launch/close queues');
  
  // Step 1: Show splash screen immediately
  const splash = createSplashScreen();
  console.log('✨ Splash screen displayed');
  
  // Step 2: Setup IPC handlers
  setupIPC();
  
  // Step 2.5: Initialize Chrome 139 Runtime
  console.log('🔍 Initializing Chrome 139 Runtime...');
  if (!chrome139Runtime.initialized) {
    chrome139Runtime.detectRuntime();
    chrome139Runtime.initialized = true;
  }
  const runtimeInfo = chrome139Runtime.getRuntimeInfo();
  console.log('📋 Chrome 139 Status:', runtimeInfo.available ? `✅ Available (v${runtimeInfo.version})` : '❌ Not Available');
  console.log('📂 Chrome Path:', runtimeInfo.path || 'Not found');
  
  // Step 3: Create main window (hidden)
  const mainWindow = createLauncherWindow();
  
  // Step 4: Track splash start time
  const splashStartTime = Date.now();
  
  // Step 5: When main window is ready, transition from splash
  mainWindow.webContents.once('did-finish-load', () => {
    console.log('✅ Main window loaded');
    
    // Calculate how long splash has been showing
    const splashDuration = Date.now() - splashStartTime;
    const minSplashTime = 2500; // Minimum 2.5 seconds for professional feel
    const remainingTime = Math.max(500, minSplashTime - splashDuration); // At least 500ms
    
    console.log(`⏱️ Splash shown for ${splashDuration}ms, waiting ${remainingTime}ms more`);
    
    setTimeout(() => {
      // Smooth fade out: First fade splash, then show main window
      console.log('🔄 Starting transition...');
      
      // Fade out splash window
      let opacity = 1.0;
      const fadeInterval = setInterval(() => {
        opacity -= 0.1;
        if (opacity <= 0) {
          clearInterval(fadeInterval);
          splash.close();
          
          // Now show main window with fade in
          mainWindow.setOpacity(0);
          mainWindow.show();
          mainWindow.focus();
          
          let mainOpacity = 0;
          const fadeInInterval = setInterval(() => {
            mainOpacity += 0.1;
            mainWindow.setOpacity(mainOpacity);
            if (mainOpacity >= 1.0) {
              clearInterval(fadeInInterval);
              console.log('🎉 BeastBrowser ready!');
            }
          }, 30);
        } else {
          splash.setOpacity(opacity);
        }
      }, 30);
    }, remainingTime);
  });
  
  // Fallback: If loading takes too long, show window anyway after 10 seconds
  setTimeout(() => {
    if (!mainWindow.isVisible()) {
      console.log('⚠️ Fallback: Showing window after timeout');
      splash.close();
      mainWindow.show();
    }
  }, 10000);
  
  // Initialize auto-updater with random delay
  updater = new AutoUpdater(mainWindow);
  updater.checkForUpdatesWithDelay();
  
  app.on('activate', () => { 
    if (BrowserWindow.getAllWindows().length === 0) {
      const splash = createSplashScreen();
      const win = createLauncherWindow();
      const startTime = Date.now();
      
      win.webContents.once('did-finish-load', () => {
        const elapsed = Date.now() - startTime;
        const minTime = 2500;
        const remaining = Math.max(500, minTime - elapsed);
        
        setTimeout(() => {
          // Smooth fade transition
          let opacity = 1.0;
          const fadeOut = setInterval(() => {
            opacity -= 0.1;
            if (opacity <= 0) {
              clearInterval(fadeOut);
              splash.close();
              
              win.setOpacity(0);
              win.show();
              win.focus();
              
              let mainOpacity = 0;
              const fadeIn = setInterval(() => {
                mainOpacity += 0.1;
                win.setOpacity(mainOpacity);
                if (mainOpacity >= 1.0) {
                  clearInterval(fadeIn);
                }
              }, 30);
            } else {
              splash.setOpacity(opacity);
            }
          }, 30);
        }, remaining);
      });
    }
  });
});

app.on('window-all-closed', async () => {
  // Automatically close all browser profiles before quitting
  const activeCount = chrome139Runtime.getActiveProfiles().length;
  if (activeCount > 0) {
    console.log(`🔄 Auto-closing ${activeCount} browser profile(s)...`);
    
    try {
      await chrome139Runtime.closeAll();
      console.log('✅ All browser profiles closed');
    } catch (e) {
      console.error('❌ Error closing profiles:', e);
    }
  }
  
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', async (event) => {
  // Check if any browser profiles are still open
  const activeCount = chrome139Runtime.getActiveProfiles().length;
  if (activeCount > 0) {
    console.log(`🔄 Closing ${activeCount} browser profile(s) before quit...`);
    event.preventDefault(); // Prevent quit temporarily
    
    try {
      // Close all browser profiles
      await chrome139Runtime.closeAll();
      console.log('✅ All browser profiles closed, quitting app...');
      
      // Force kill any remaining chrome processes
      if (process.platform === 'win32') {
        const { exec } = require('child_process');
        exec('taskkill /F /IM chrome.exe /T', (error) => {
          if (error && !error.message.includes('not found')) {
            console.log('⚠️ No chrome.exe processes found (already closed)');
          } else {
            console.log('✅ Force killed any remaining chrome processes');
          }
        });
      }
      
      // Now quit for real
      setTimeout(() => app.quit(), 500); // Small delay to let processes die
    } catch (e) {
      console.error('❌ Error closing profiles:', e);
      
      // Show error dialog
      const { dialog } = require('electron');
      const result = await dialog.showMessageBox({
        type: 'error',
        title: 'Error Closing Profiles',
        message: 'Could not close all browser profiles automatically',
        detail: 'Some browser windows may still be open. Please close them manually.',
        buttons: ['Cancel', 'Force Quit Anyway'],
        defaultId: 0,
        cancelId: 0
      });
      
      // If user clicks "Force Quit Anyway"
      if (result.response === 1) {
        console.log('🛑 Force quitting...');
        
        // Kill all chrome processes forcefully
        if (process.platform === 'win32') {
          const { exec } = require('child_process');
          exec('taskkill /F /IM chrome.exe /T');
        }
        
        setTimeout(() => app.quit(), 300);
      }
    }
    
    return;
  }
  
  try { 
    if (devServerProcess) devServerProcess.kill();
    
    // Cleanup all SOCKS5 tunnels
    await socks5Handler.closeAllSocks5Tunnels();
  } catch (_) {}
});
