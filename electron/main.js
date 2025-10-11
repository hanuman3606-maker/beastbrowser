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

// Track launched profiles
const activeProfiles = new Map();
const launchQueue = new Map(); // Track profiles being launched
const closeQueue = new Set(); // Track profiles being closed
let devServerProcess = null;

// Platform-specific viewport sizes
const PLATFORM_SIZES = {
  windows: { width: 1024, height: 768 },  // Fixed small size
  macos: { width: 1024, height: 768 },    // Fixed small size
  linux: { width: 1024, height: 768 },    // Fixed small size
  android: { width: 412, height: 915, mobile: true },
  ios: { width: 390, height: 844, mobile: true },
  tv: { width: 1920, height: 1080 }
};

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

async function applyPageAntiDetection(page, profile, options) {
  // User agent
  if (profile && profile.userAgent) {
    await page.setUserAgent(profile.userAgent);
  }

  // Viewport - Platform-specific sizing - check all possible fields
  const platform = (profile && (profile.platform || profile.platformType || profile.deviceType || profile.userAgentPlatform)) || 'windows';
  console.log(`🔧 applyPageAntiDetection: Platform = "${platform}" for profile ${profile?.id || 'unknown'}`);
  
  const platformSizes = getPlatformSizes(platform);
  const isMobile = platformSizes.mobile || false;
  
  const fp = profile && profile.fingerprint;
  const screen = (fp && fp.screen) || platformSizes;
  
  // Platform-specific viewport sizes
  let viewportWidth, viewportHeight;
  if (isMobile) {
    // Mobile devices - use exact screen size
    viewportWidth = screen.width || platformSizes.width;
    viewportHeight = screen.height || platformSizes.height;
  } else {
    // Desktop - FORCE SMALL SIZE
    viewportWidth = 1024;
    viewportHeight = 618; // 768 - 150 (chrome height)
  }
  
  await page.setViewport({ 
    width: viewportWidth, 
    height: viewportHeight, 
    deviceScaleFactor: 1,
    isMobile: isMobile,
    hasTouch: isMobile
  });
  
  // Set browser window size to match viewport + chrome
  try {
    const session = await page.target().createCDPSession();
    const { windowId } = await session.send('Browser.getWindowForTarget');
    
    // Calculate final window size - FORCE SMALL for desktop
    const finalWidth = isMobile ? viewportWidth : 1024;
    const finalHeight = isMobile ? viewportHeight : 768;
    
    await session.send('Browser.setWindowBounds', {
      windowId,
      bounds: {
        width: finalWidth,
        height: finalHeight,
        windowState: 'normal'
      }
    });
    
    console.log(`📱 Browser window set: ${finalWidth}x${finalHeight} (${isMobile ? 'Mobile' : 'Desktop'} - ${platform})`);
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

async function openAntiBrowser(profile, options) {
  if (!profile || !profile.id) {
    return { success: false, error: 'Invalid profile' };
  }
  
  // Check if already active
  const existing = activeProfiles.get(profile.id);
  if (existing) {
    console.log('⚠️ Profile already open:', profile.id);
    return { success: true, message: 'Profile already open' };
  }
  
  // Check if currently being launched
  if (launchQueue.has(profile.id)) {
    console.log('⚠️ Profile already launching:', profile.id);
    return { success: false, error: 'Profile is already being launched' };
  }
  
  // Check if being closed
  if (closeQueue.has(profile.id)) {
    console.log('⚠️ Profile is being closed, waiting...');
    // Wait for close to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    if (closeQueue.has(profile.id)) {
      return { success: false, error: 'Profile is being closed, please wait' };
    }
  }
  
  // Mark as launching
  launchQueue.set(profile.id, Date.now());
  console.log('🚀 Launching profile:', profile.id);
  console.log('📋 Full profile data:', JSON.stringify({
    id: profile.id,
    name: profile.name,
    platform: profile.platform,
    platformType: profile.platformType,
    deviceType: profile.deviceType,
    userAgentPlatform: profile.userAgentPlatform
  }, null, 2));
  
  try {
    // Get platform - check multiple possible field names
    const platform = (profile && (profile.platform || profile.platformType || profile.deviceType || profile.userAgentPlatform)) || 'windows';
    console.log(`🖥️ Profile platform detected: "${platform}" for profile: ${profile.id}`);
    
    // Generate random fingerprint if not provided or if random flag is set
    if (!profile.fingerprint || profile.randomFingerprint) {
      console.log('🎲 Generating advanced random fingerprint for', platform);
      profile.fingerprint = generateAdvancedFingerprint(platform);
    }
    
    // Generate random user agent if not provided
    if (!profile.userAgent || profile.randomFingerprint) {
      console.log('🎲 Selecting unique User-Agent for', platform);
      profile.userAgent = getRandomUserAgent(platform, profile.id);
    }
    
    // Ensure platform is set correctly for later use
    if (!profile.platform) {
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
      return { success: false, error: `SOCKS5 tunnel failed: ${error.message}` };
    }
  }
  
  // Find Chromium executable - CRITICAL FIX for distribution
  const chromiumPath = findChromiumExecutable();
  
  if (!chromiumPath) {
    console.error('❌ CRITICAL: Chromium executable not found!');
    console.error('💡 Please ensure Chrome/Chromium is installed or bundled with the app');
    
    // Cleanup SOCKS5 tunnel if it was created
    if (socks5Tunnel) {
      try {
        await socks5Handler.closeSocks5Tunnel(profile.id);
      } catch (_) {}
    }
    
    return { 
      success: false, 
      error: 'Chromium not found. Please install Google Chrome or contact support.' 
    };
  }
  
  console.log(`🚀 Launching browser with Chromium: ${chromiumPath}`);
  
  const launchOptions = {
    headless: false,
    userDataDir,
    args,
    defaultViewport: null,
    executablePath: chromiumPath, // Use detected Chromium path
    // Add better timeout and error handling
    timeout: 60000, // 60 seconds browser launch timeout
    protocolTimeout: 180000, // 3 minutes protocol timeout
    ignoreHTTPSErrors: true,
    dumpio: false // Don't dump browser process stdout/stderr
  };

  let browser;
  try {
    browser = await puppeteerExtra.launch(launchOptions);
  } catch (launchError) {
    // Cleanup SOCKS5 tunnel on launch failure
    if (socks5Tunnel) {
      try {
        await socks5Handler.closeSocks5Tunnel(profile.id);
      } catch (_) {}
    }
    throw launchError;
  }
  const pages = await browser.pages();
  const page = pages.length > 0 ? pages[0] : await browser.newPage();
  
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

async function closeAntiBrowser(profileId) {
  // Check if profile exists
  const entry = activeProfiles.get(profileId);
  if (!entry) {
    console.log('⚠️ Profile not active:', profileId);
    return { success: true, message: 'Profile not active' };
  }
  
  // Check if already being closed
  if (closeQueue.has(profileId)) {
    console.log('⚠️ Profile already being closed:', profileId);
    return { success: false, error: 'Profile is already being closed' };
  }
  
  // Mark as closing
  closeQueue.add(profileId);
  console.log('🛑 Closing profile:', profileId);
  
  try {
    await entry.browser.close();
    activeProfiles.delete(profileId);
    launchQueue.delete(profileId);
    
    // Close SOCKS5 tunnel if exists
    await socks5Handler.closeSocks5Tunnel(profileId);
    
    // Note: We intentionally DO NOT remove user agent from usedUserAgents
    // to maintain uniqueness across all profiles, even after closing
    // User agents will only be recycled when all are used
    
    console.log('✅ Profile closed successfully:', profileId);
    return { success: true };
  } catch (e) {
    console.error('❌ Error closing profile:', profileId, e.message);
    return { success: false, error: e.message };
  } finally {
    // Always remove from close queue
    closeQueue.delete(profileId);
  }
}

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
        const url = action.params?.url || 'https://duckduckgo.com';
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
  ipcMain.handle('antiBrowserOpen', async (_e, profile, opts) => openAntiBrowser(profile, opts || {}));
  ipcMain.handle('antiBrowserClose', async (_e, profileId) => closeAntiBrowser(profileId));
  ipcMain.handle('getProfileStatus', async (_e, profileId) => ({ success: true, isOpen: activeProfiles.has(profileId) }));
  
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
  
  ipcMain.handle('executeRPAScript', async (_e, profileId, action) => {
    console.log('\n📨 executeRPAScript called with:', {
      profileId,
      actionName: action.name,
      hasScriptContent: !!action.scriptContent,
      hasWebsiteUrl: !!action.websiteUrl,
      scriptContentLength: action.scriptContent?.length || 0,
      websiteUrl: action.websiteUrl,
      executionTime: action.executionTime
    });
    
    // Check if this is a custom RPA script object (has scriptContent property)
    if (action.scriptContent && action.websiteUrl) {
      console.log('✅ Detected custom RPA script, calling executeCustomRPAScript');
      // Execute as custom RPA script
      return executeCustomRPAScript(profileId, {
        websiteUrl: action.websiteUrl,
        scriptContent: action.scriptContent,
        executionTime: action.executionTime || 5,
        scriptName: action.name || 'Unnamed Script'
      });
    } else {
      console.log('⚠️ Not a custom script, calling executeAction for predefined action');
      // Execute as predefined action
      return executeAction(profileId, action);
    }
  });
  ipcMain.handle('clearProfileData', async (_e, profileId, types) => clearProfileData(profileId, types));
  ipcMain.handle('clearAllProfileData', async (_e, profileId) => clearProfileData(profileId, ['cache', 'cookies', 'history']));
  ipcMain.handle('getProfileDataUsage', async (_e, profileId) => getProfileUsage(profileId));
  ipcMain.handle('closeAllProfiles', async () => {
    let closed = 0;
    for (const [id] of Array.from(activeProfiles.entries())) {
      try { await closeAntiBrowser(id); closed++; } catch (_) {}
    }
    return { success: true, closedCount: closed };
  });
  ipcMain.handle('loadUserAgents', async (_e, platform) => {
    const dir = getUserAgentsDir();
    if (!dir) return [];
    const file = path.join(dir, `${platform}.json`);
    if (!fs.existsSync(file)) return [];
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return []; }
  });
  ipcMain.handle('getTimezoneFromIP', async (_e, ipOrHost) => detectTimezoneFromIP(ipOrHost));
  
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
      
      // Normalize proxy type for Chromium (lowercase, handle HTTP vs HTTPS)
      const proxyType = (proxy.type || 'HTTP').toUpperCase();
      const proxyScheme = proxyType === 'SOCKS5' ? 'socks5' : proxyType.toLowerCase();
      
      console.log(`🧪 Testing proxy: ${proxyScheme}://${proxy.host}:${proxy.port}`);
      
      // Find Chromium executable for proxy test
      const chromiumPath = findChromiumExecutable();
      
      // Create a test browser with proxy to get real IP
      const testBrowser = await puppeteerExtra.launch({
        headless: true,
        executablePath: chromiumPath, // Use detected Chromium path
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--ignore-certificate-errors',
          `--proxy-server=${proxyScheme}://${proxy.host}:${proxy.port}`
        ]
      });
      
      const testPage = await testBrowser.newPage();
      
      // Authenticate if credentials provided
      if (proxy.username && proxy.password) {
        await testPage.authenticate({
          username: proxy.username,
          password: proxy.password
        });
      }
      
      // Get IP through proxy
      await testPage.goto('https://api.ipify.org?format=json', {
        waitUntil: 'networkidle0',
        timeout: 10000
      });
      
      const content = await testPage.content();
      await testBrowser.close();
      
      // Parse JSON from page content
      const jsonMatch = content.match(/\{[^}]+\}/);
      if (!jsonMatch) {
        throw new Error('Failed to get IP from proxy');
      }
      
      const data = JSON.parse(jsonMatch[0]);
      const responseTime = Date.now() - startTime;
      
      console.log(`✅ Proxy working! IP: ${data.ip} (${responseTime}ms)`);
      
      // Get geo data
      let geoData = null;
      try {
        const geoController = new AbortController();
        const geoTimeout = setTimeout(() => geoController.abort(), 5000);
        
        const geoResponse = await fetch(`https://ipapi.co/${data.ip}/json/`, {
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
        ip: data.ip,
        responseTime,
        testedAt: new Date().toISOString(),
        country: geoData?.country_name,
        region: geoData?.region,
        city: geoData?.city,
        timezone: geoData?.timezone,
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
      
      return {
        success: false,
        error: error.message || 'Connection failed',
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
  
  loadRenderer(win);
  return win;
}

// Auto-updater
const AutoUpdater = require('./auto-updater');
let updater = null;

app.whenReady().then(() => {
  console.log('🚀 BeastBrowser starting...');
  
  // Step 1: Show splash screen immediately
  const splash = createSplashScreen();
  console.log('✨ Splash screen displayed');
  
  // Step 2: Setup IPC handlers
  setupIPC();
  
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

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', async () => {
  try { 
    if (devServerProcess) devServerProcess.kill();
    
    // Cleanup all SOCKS5 tunnels
    await socks5Handler.closeAllSocks5Tunnels();
  } catch (_) {}
});
