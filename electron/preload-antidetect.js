/**
 * Preload Script - Advanced Anti-Detection
 * 
 * Implements comprehensive fingerprint protection:
 * - Canvas fingerprinting protection (deterministic noise)
 * - WebGL fingerprinting protection
 * - WebRTC IP leak protection
 * - Navigator property spoofing
 * - Font enumeration protection
 * - Plugin list spoofing
 * - Screen size randomization
 * 
 * Security: Uses contextBridge for safe IPC, no nodeIntegration
 * 
 * @author Beast Browser Team
 */

const { contextBridge, ipcRenderer } = require('electron');

// Profile configuration (will be set by main process)
let profileConfig = null;

/**
 * Generate deterministic random number from seed
 */
function seededRandom(seed, min = 0, max = 1) {
  const x = Math.sin(seed++) * 10000;
  const random = x - Math.floor(x);
  return min + random * (max - min);
}

/**
 * Apply version spoofing to prevent Chrome 139 detection
 * CRITICAL: This runs in preload context BEFORE page scripts
 */
function applyVersionSpoofing() {
  // Extract target version from navigator.userAgent
  const userAgent = navigator.userAgent;
  const versionMatch = userAgent.match(/Chrome\/(\d+)/);
  
  if (!versionMatch) {
    console.warn('⚠️ Could not extract Chrome version from User-Agent');
    return;
  }
  
  const targetVersion = String(versionMatch[1]); // Ensure it's a string
  console.log(`🔧 PRELOAD VERSION SPOOF: Targeting Chrome ${targetVersion}`);
  console.log(`🔍 Version type: ${typeof targetVersion}, length: ${targetVersion.length}, value: "${targetVersion}"`);
  
  if (!targetVersion || targetVersion === 'undefined') {
    console.error('❌ TARGET_VERSION is invalid!');
    return;
  }
  
  // Override navigator.userAgentData to match User-Agent version
  if ('userAgentData' in navigator || 'userAgentData' in Navigator.prototype) {
    try {
      // Delete existing property
      delete Navigator.prototype.userAgentData;
      
      // Create spoofed userAgentData - MUST capture targetVersion in closure
      const spoofVersion = targetVersion; // Capture in closure
      const createSpoofedUAD = () => {
        const brands = [
          { brand: 'Not;A=Brand', version: '99' },
          { brand: 'Chromium', version: spoofVersion },
          { brand: 'Google Chrome', version: spoofVersion }
        ];
        
        console.log('🔍 Creating UAD with brands:', JSON.stringify(brands));
        
        return {
          brands: brands,
          mobile: false,
          platform: 'Windows',
          getHighEntropyValues: async (hints) => {
            const values = {
              architecture: 'x86',
              bitness: '64',
              brands: [
                { brand: 'Not;A=Brand', version: '99' },
                { brand: 'Chromium', version: spoofVersion },
                { brand: 'Google Chrome', version: spoofVersion }
              ],
              fullVersionList: [
                { brand: 'Not;A=Brand', version: '99.0.0.0' },
                { brand: 'Chromium', version: spoofVersion + '.0.0.0' },
                { brand: 'Google Chrome', version: spoofVersion + '.0.0.0' }
              ],
              mobile: false,
              model: '',
              platform: 'Windows',
              platformVersion: '10.0.0',
              uaFullVersion: spoofVersion + '.0.0.0',
              wow64: false
            };
            const result = {};
            if (hints && Array.isArray(hints)) {
              hints.forEach(h => { if (h in values) result[h] = values[h]; });
            }
            return Promise.resolve(result);
          },
          toJSON: function() {
            return { brands: this.brands, mobile: this.mobile, platform: this.platform };
          }
        };
      };
      
      // Override on prototype
      Object.defineProperty(Navigator.prototype, 'userAgentData', {
        get: createSpoofedUAD,
        configurable: true,
        enumerable: true
      });
      
      // Override on instance
      Object.defineProperty(navigator, 'userAgentData', {
        get: createSpoofedUAD,
        configurable: true
      });
      
      console.log(`✅ userAgentData spoofed to Chrome ${spoofVersion}`);
      const testUAD = createSpoofedUAD();
      console.log('✅ Brands:', JSON.stringify(testUAD.brands));
      
      // Verify immediately
      const verifyBrands = navigator.userAgentData.brands;
      console.log('✅ Verified navigator.userAgentData.brands:', JSON.stringify(verifyBrands));
      
      const chromeBrand = verifyBrands.find(b => b.brand.includes('Chrome') && !b.brand.includes('Not'));
      if (chromeBrand) {
        console.log(`✅ Chrome brand version: "${chromeBrand.version}" (type: ${typeof chromeBrand.version})`);
        if (!chromeBrand.version || chromeBrand.version === '' || chromeBrand.version === 'undefined') {
          console.error('❌❌❌ CRITICAL: Brand version is EMPTY!');
        }
      }
    } catch (e) {
      console.error('❌ Failed to spoof userAgentData:', e);
    }
  }
}

/**
 * Apply all anti-detection measures
 */
function applyAntiDetection(config) {
  if (!config) return;

  console.log('🛡️ Applying anti-detection for profile:', config.id);
  
  // CRITICAL: Apply version spoofing FIRST before anything else
  applyVersionSpoofing();

  // Convert seed string to number
  const seedNum = parseInt(config.fingerprintSeed, 16);

  // 1. Canvas Fingerprinting Protection
  protectCanvas(seedNum);

  // 2. WebGL Fingerprinting Protection
  protectWebGL(seedNum);

  // 3. WebRTC IP Leak Protection
  if (config.maskWebRTC) {
    protectWebRTC(config);
  }

  // 4. Navigator Properties
  spoofNavigator(config);

  // 5. Screen Properties
  spoofScreen(config.screenSize);

  // 6. Fonts
  spoofFonts(config.fonts);

  // 7. Plugins
  spoofPlugins(config.plugins);

  // 8. Remove automation indicators
  removeAutomationIndicators();

  // 9. Setup viewport manager
  setupViewportManager(config.screenSize);

  console.log('✅ Anti-detection applied successfully');
}

/**
 * Canvas Fingerprinting Protection
 * Adds deterministic noise to canvas operations
 */
function protectCanvas(seed) {
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  const originalToBlob = HTMLCanvasElement.prototype.toBlob;
  const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;

  // Override toDataURL
  HTMLCanvasElement.prototype.toDataURL = function(...args) {
    const context = this.getContext('2d');
    if (context) {
      // Add subtle noise
      const imageData = context.getImageData(0, 0, this.width, this.height);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        // Add deterministic noise based on seed
        const noise = seededRandom(seed + i, -2, 2);
        data[i] = Math.max(0, Math.min(255, data[i] + noise));     // R
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise)); // G
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise)); // B
      }
      
      context.putImageData(imageData, 0, 0);
    }
    
    return originalToDataURL.apply(this, args);
  };

  // Override toBlob
  HTMLCanvasElement.prototype.toBlob = function(callback, ...args) {
    const context = this.getContext('2d');
    if (context) {
      const imageData = context.getImageData(0, 0, this.width, this.height);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        const noise = seededRandom(seed + i, -2, 2);
        data[i] = Math.max(0, Math.min(255, data[i] + noise));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
      }
      
      context.putImageData(imageData, 0, 0);
    }
    
    return originalToBlob.call(this, callback, ...args);
  };

  // Override getImageData
  CanvasRenderingContext2D.prototype.getImageData = function(...args) {
    const imageData = originalGetImageData.apply(this, args);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const noise = seededRandom(seed + i, -1, 1);
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }
    
    return imageData;
  };

  console.log('🎨 Canvas protection enabled');
}

/**
 * WebGL Fingerprinting Protection
 */
function protectWebGL(seed) {
  const getParameter = WebGLRenderingContext.prototype.getParameter;
  const getExtension = WebGLRenderingContext.prototype.getExtension;

  // Override getParameter
  WebGLRenderingContext.prototype.getParameter = function(parameter) {
    const result = getParameter.call(this, parameter);
    
    // Spoof specific parameters
    if (parameter === this.RENDERER) {
      return 'Intel Iris OpenGL Engine';
    }
    if (parameter === this.VENDOR) {
      return 'Intel Inc.';
    }
    if (parameter === this.VERSION) {
      return 'WebGL 1.0 (OpenGL ES 2.0 Chromium)';
    }
    if (parameter === this.SHADING_LANGUAGE_VERSION) {
      return 'WebGL GLSL ES 1.0 (OpenGL ES GLSL ES 1.0 Chromium)';
    }
    
    // Add noise to numeric values
    if (typeof result === 'number') {
      const noise = seededRandom(seed + parameter, -0.1, 0.1);
      return result + noise;
    }
    
    return result;
  };

  // Override getExtension to control available extensions
  WebGLRenderingContext.prototype.getExtension = function(name) {
    // Block certain extensions that can be used for fingerprinting
    const blockedExtensions = [
      'WEBGL_debug_renderer_info',
      'WEBGL_debug_shaders'
    ];
    
    if (blockedExtensions.includes(name)) {
      return null;
    }
    
    return getExtension.call(this, name);
  };

  // Also protect WebGL2
  if (typeof WebGL2RenderingContext !== 'undefined') {
    WebGL2RenderingContext.prototype.getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGL2RenderingContext.prototype.getExtension = WebGLRenderingContext.prototype.getExtension;
  }

  console.log('🎮 WebGL protection enabled');
}

/**
 * WebRTC IP Leak Protection
 */
function protectWebRTC(config) {
  // Override RTCPeerConnection
  const OriginalRTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection;
  
  if (!OriginalRTCPeerConnection) {
    console.log('⚠️ RTCPeerConnection not available');
    return;
  }

  const ProxiedRTCPeerConnection = function(...args) {
    const pc = new OriginalRTCPeerConnection(...args);
    
    // Override createOffer to filter ICE candidates
    const originalCreateOffer = pc.createOffer;
    pc.createOffer = function(...offerArgs) {
      return originalCreateOffer.apply(this, offerArgs).then(offer => {
        // Filter out local IP addresses from SDP
        if (offer.sdp) {
          offer.sdp = offer.sdp.replace(/([0-9]{1,3}\.){3}[0-9]{1,3}/g, (match) => {
            // Replace local IPs with proxy IP or fake IP
            if (match.startsWith('192.168.') || match.startsWith('10.') || match.startsWith('172.')) {
              return config.proxy ? config.proxy.host : '0.0.0.0';
            }
            return match;
          });
        }
        return offer;
      });
    };
    
    // Override createAnswer
    const originalCreateAnswer = pc.createAnswer;
    pc.createAnswer = function(...answerArgs) {
      return originalCreateAnswer.apply(this, answerArgs).then(answer => {
        if (answer.sdp) {
          answer.sdp = answer.sdp.replace(/([0-9]{1,3}\.){3}[0-9]{1,3}/g, (match) => {
            if (match.startsWith('192.168.') || match.startsWith('10.') || match.startsWith('172.')) {
              return config.proxy ? config.proxy.host : '0.0.0.0';
            }
            return match;
          });
        }
        return answer;
      });
    };
    
    // Override setLocalDescription
    const originalSetLocalDescription = pc.setLocalDescription;
    pc.setLocalDescription = function(description) {
      if (description && description.sdp) {
        description.sdp = description.sdp.replace(/([0-9]{1,3}\.){3}[0-9]{1,3}/g, (match) => {
          if (match.startsWith('192.168.') || match.startsWith('10.') || match.startsWith('172.')) {
            return config.proxy ? config.proxy.host : '0.0.0.0';
          }
          return match;
        });
      }
      return originalSetLocalDescription.call(this, description);
    };
    
    return pc;
  };
  
  ProxiedRTCPeerConnection.prototype = OriginalRTCPeerConnection.prototype;
  
  window.RTCPeerConnection = ProxiedRTCPeerConnection;
  if (window.webkitRTCPeerConnection) {
    window.webkitRTCPeerConnection = ProxiedRTCPeerConnection;
  }

  console.log('🔒 WebRTC protection enabled');
}

/**
 * Spoof Navigator Properties
 */
function spoofNavigator(config) {
  // Extract Chrome version from User-Agent (e.g., "Chrome/111" -> "111")
  let targetChromeVersion = '111'; // Default fallback
  if (config.userAgent) {
    const match = config.userAgent.match(/Chrome\/(\d+)/);
    if (match) {
      targetChromeVersion = match[1];
    }
  }
  
  console.log(`🔧 Spoofing Chrome version: ${targetChromeVersion}`);

  // User-Agent
  Object.defineProperty(navigator, 'userAgent', {
    get: () => config.userAgent,
    configurable: true
  });

  // AppVersion - CRITICAL: Must match User-Agent version
  Object.defineProperty(navigator, 'appVersion', {
    get: () => {
      // Extract appVersion from User-Agent (everything after "Mozilla/")
      if (config.userAgent) {
        const match = config.userAgent.match(/Mozilla\/(.+)/);
        return match ? match[1] : '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36';
      }
      return '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36';
    },
    configurable: true
  });

  // UserAgentData - CRITICAL: Client Hints API (Chrome 90+)
  // This is the main API websites use to detect Chrome version
  if ('userAgentData' in navigator) {
    const spoofedUserAgentData = {
      brands: [
        { brand: 'Not A(Brand', version: '8' },
        { brand: 'Chromium', version: targetChromeVersion },
        { brand: 'Google Chrome', version: targetChromeVersion }
      ],
      mobile: config.platform === 'android' || config.platform === 'ios',
      platform: (() => {
        const platforms = {
          windows: 'Windows',
          macos: 'macOS',
          linux: 'Linux',
          android: 'Android',
          ios: 'iOS'
        };
        return platforms[config.platform] || 'Windows';
      })(),
      getHighEntropyValues: async (hints) => {
        const values = {
          architecture: 'x86',
          bitness: '64',
          brands: [
            { brand: 'Not A(Brand', version: '8' },
            { brand: 'Chromium', version: targetChromeVersion },
            { brand: 'Google Chrome', version: targetChromeVersion }
          ],
          fullVersionList: [
            { brand: 'Not A(Brand', version: '8.0.0.0' },
            { brand: 'Chromium', version: `${targetChromeVersion}.0.0.0` },
            { brand: 'Google Chrome', version: `${targetChromeVersion}.0.0.0` }
          ],
          mobile: config.platform === 'android' || config.platform === 'ios',
          model: config.platform === 'android' ? 'Pixel 7' : (config.platform === 'ios' ? 'iPhone' : ''),
          platform: (() => {
            const platforms = {
              windows: 'Windows',
              macos: 'macOS',
              linux: 'Linux',
              android: 'Android',
              ios: 'iOS'
            };
            return platforms[config.platform] || 'Windows';
          })(),
          platformVersion: config.platform === 'windows' ? '10.0.0' : '13.0.0',
          uaFullVersion: `${targetChromeVersion}.0.0.0`,
          wow64: false
        };
        
        // Return only requested hints
        const result = {};
        if (hints) {
          hints.forEach(hint => {
            if (hint in values) {
              result[hint] = values[hint];
            }
          });
        }
        return result;
      },
      toJSON: function() {
        return {
          brands: this.brands,
          mobile: this.mobile,
          platform: this.platform
        };
      }
    };

    Object.defineProperty(navigator, 'userAgentData', {
      get: () => spoofedUserAgentData,
      configurable: true
    });
    
    console.log(`✅ navigator.userAgentData spoofed to Chrome ${targetChromeVersion}`);
  }

  // Platform
  Object.defineProperty(navigator, 'platform', {
    get: () => {
      const platforms = {
        windows: 'Win32',
        macos: 'MacIntel',
        linux: 'Linux x86_64',
        android: 'Linux armv8l',
        ios: 'iPhone'
      };
      return platforms[config.platform] || 'Win32';
    },
    configurable: true
  });

  // Languages
  Object.defineProperty(navigator, 'languages', {
    get: () => config.languages,
    configurable: true
  });

  Object.defineProperty(navigator, 'language', {
    get: () => config.languages[0],
    configurable: true
  });

  // Hardware Concurrency
  Object.defineProperty(navigator, 'hardwareConcurrency', {
    get: () => config.hardwareConcurrency,
    configurable: true
  });

  // Device Memory
  if ('deviceMemory' in navigator) {
    Object.defineProperty(navigator, 'deviceMemory', {
      get: () => config.deviceMemory,
      configurable: true
    });
  }

  // Max Touch Points
  Object.defineProperty(navigator, 'maxTouchPoints', {
    get: () => config.maxTouchPoints,
    configurable: true
  });

  // Vendor
  Object.defineProperty(navigator, 'vendor', {
    get: () => 'Google Inc.',
    configurable: true
  });

  console.log('🎭 Navigator properties spoofed');
}

/**
 * Spoof Screen Properties
 */
function spoofScreen(screenSize) {
  // Screen dimensions
  Object.defineProperty(screen, 'width', {
    get: () => screenSize.width,
    configurable: true
  });

  Object.defineProperty(screen, 'height', {
    get: () => screenSize.height,
    configurable: true
  });

  Object.defineProperty(screen, 'availWidth', {
    get: () => screenSize.width,
    configurable: true
  });

  Object.defineProperty(screen, 'availHeight', {
    get: () => screenSize.height - 40, // Taskbar height
    configurable: true
  });

  // Device Pixel Ratio
  Object.defineProperty(window, 'devicePixelRatio', {
    get: () => screenSize.devicePixelRatio,
    configurable: true
  });

  // Inner dimensions
  Object.defineProperty(window, 'innerWidth', {
    get: () => screenSize.width,
    configurable: true
  });

  Object.defineProperty(window, 'innerHeight', {
    get: () => screenSize.height - 150, // Browser chrome
    configurable: true
  });

  // Outer dimensions
  Object.defineProperty(window, 'outerWidth', {
    get: () => screenSize.width,
    configurable: true
  });

  Object.defineProperty(window, 'outerHeight', {
    get: () => screenSize.height,
    configurable: true
  });

  console.log(`📐 Screen spoofed: ${screenSize.width}x${screenSize.height}`);
}

/**
 * Spoof Fonts
 */
function spoofFonts(fonts) {
  // Override FontFaceSet
  if ('fonts' in document) {
    const originalCheck = FontFaceSet.prototype.check;
    FontFaceSet.prototype.check = function(font, text) {
      // Check if font is in our list
      const fontFamily = font.split(' ').pop().replace(/['"]/g, '');
      if (fonts.includes(fontFamily)) {
        return true;
      }
      return originalCheck.call(this, font, text);
    };
  }

  console.log(`🔤 ${fonts.length} fonts spoofed`);
}

/**
 * Spoof Plugins
 */
function spoofPlugins(plugins) {
  // Create fake plugin array
  const fakePlugins = plugins.map((p, index) => ({
    name: p.name,
    filename: p.filename,
    description: p.description,
    length: 1,
    item: (i) => fakePlugins[index],
    namedItem: (name) => name === p.name ? fakePlugins[index] : null
  }));

  Object.defineProperty(navigator, 'plugins', {
    get: () => ({
      length: fakePlugins.length,
      ...fakePlugins,
      item: (index) => fakePlugins[index],
      namedItem: (name) => fakePlugins.find(p => p.name === name) || null,
      refresh: () => {}
    }),
    configurable: true
  });

  // Spoof mimeTypes
  Object.defineProperty(navigator, 'mimeTypes', {
    get: () => ({
      length: 4,
      item: () => null,
      namedItem: () => null
    }),
    configurable: true
  });

  console.log(`🔌 ${plugins.length} plugins spoofed`);
}

/**
 * Remove Automation Indicators
 */
function removeAutomationIndicators() {
  // Remove webdriver property
  Object.defineProperty(navigator, 'webdriver', {
    get: () => false,
    configurable: true
  });

  // Remove automation flag from Chrome but preserve chrome object
  if (window.chrome) {
    // Keep chrome.runtime but remove automation-specific properties
    const originalRuntime = window.chrome.runtime;
    Object.defineProperty(window.chrome, 'runtime', {
      get: () => {
        // Return a clean runtime object without automation markers
        if (originalRuntime) {
          const cleanRuntime = {};
          // Copy safe properties only
          ['id', 'getManifest', 'getURL', 'connect', 'sendMessage'].forEach(prop => {
            if (prop in originalRuntime && typeof originalRuntime[prop] !== 'undefined') {
              cleanRuntime[prop] = originalRuntime[prop];
            }
          });
          return Object.keys(cleanRuntime).length > 0 ? cleanRuntime : undefined;
        }
        return undefined;
      },
      configurable: true
    });
    
    // CRITICAL: Override chrome.app to hide Chrome version
    // chrome.app can leak the real Chrome version
    try {
      Object.defineProperty(window.chrome, 'app', {
        get: () => undefined,
        configurable: true
      });
    } catch (e) {}
    
    // Override chrome.loadTimes (deprecated but still exists in some Chrome versions)
    try {
      Object.defineProperty(window.chrome, 'loadTimes', {
        get: () => undefined,
        configurable: true
      });
    } catch (e) {}
    
    // Override chrome.csi (deprecated but can leak version)
    try {
      Object.defineProperty(window.chrome, 'csi', {
        get: () => undefined,
        configurable: true
      });
    } catch (e) {}
  }

  // Remove Puppeteer/Playwright indicators
  delete window.__playwright;
  delete window.__puppeteer;
  delete window.__nightmare;
  delete window._phantom;
  delete window.callPhantom;
  delete window.domAutomation;
  delete window.domAutomationController;
  delete window.__webdriver_evaluate;
  delete window.__selenium_evaluate;
  delete window.__webdriver_script_function;
  delete window.__webdriver_script_func;
  delete window.__webdriver_script_fn;
  delete window.__fxdriver_evaluate;
  delete window.__driver_evaluate;
  delete window.__webdriver_unwrapped;
  delete window.__fxdriver_unwrapped;
  delete window.__webdriver_script_fn;
  delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
  delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
  delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
  
  // Override permissions to look normal (not automated)
  if (navigator.permissions && navigator.permissions.query) {
    const originalQuery = navigator.permissions.query;
    navigator.permissions.query = (parameters) => {
      if (parameters.name === 'notifications') {
        return Promise.resolve({ state: 'prompt', onchange: null });
      }
      return originalQuery(parameters);
    };
  }
  
  // Override plugin array to look like normal Chrome
  Object.defineProperty(navigator, 'plugins', {
    get: () => {
      return [
        {
          0: { type: 'application/x-google-chrome-pdf', suffixes: 'pdf', description: 'Portable Document Format' },
          description: 'Portable Document Format',
          filename: 'internal-pdf-viewer',
          length: 1,
          name: 'Chrome PDF Plugin'
        },
        {
          0: { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' },
          description: 'Portable Document Format',
          filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
          length: 1,
          name: 'Chrome PDF Viewer'
        }
      ];
    },
    configurable: true
  });
  delete window.__driver_unwrapped;
  delete window.__webdriver_unwrapped;
  delete window.__driver_evaluate;
  delete window.__selenium_unwrapped;
  delete window.__fxdriver_unwrapped;

  // Remove ChromeDriver and automation controller
  delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
  delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
  delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;

  console.log('🤖 Automation indicators removed');
}

/**
 * Setup Viewport Manager (no reload on resize)
 */
function setupViewportManager(screenSize) {
  // Create viewport update function
  window.__updateViewport = function(width, height) {
    // Update viewport meta tag
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.appendChild(viewport);
    }
    viewport.content = `width=${width}, initial-scale=1.0`;

    // Update window dimensions
    Object.defineProperty(window, 'innerWidth', {
      get: () => width,
      configurable: true
    });

    Object.defineProperty(window, 'innerHeight', {
      get: () => height - 150,
      configurable: true
    });

    // Dispatch resize event
    window.dispatchEvent(new Event('resize'));
    
    console.log(`📐 Viewport updated: ${width}x${height}`);
  };

  console.log('📱 Viewport manager ready');
}

/**
 * Expose safe API to renderer
 */
contextBridge.exposeInMainWorld('antiDetect', {
  getConfig: () => profileConfig,
  isProtected: () => !!profileConfig,
  testCanvas: () => {
    // Test canvas fingerprint
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.fillText('Test', 10, 10);
    return canvas.toDataURL();
  },
  testWebRTC: async () => {
    // Test WebRTC IP leak
    try {
      const pc = new RTCPeerConnection({ iceServers: [] });
      const offer = await pc.createOffer();
      return offer.sdp.includes('192.168.') ? 'LEAK' : 'PROTECTED';
    } catch (e) {
      return 'ERROR';
    }
  }
});

console.log('🛡️ Anti-detection preload script loaded');

// CRITICAL: Apply version spoofing IMMEDIATELY
// This runs before ANY page scripts load
console.log('🔧 Applying version spoofing...');
try {
  applyVersionSpoofing();
  console.log('✅ Version spoofing applied successfully');
} catch (e) {
  console.error('❌ Version spoofing failed:', e);
}

// Also apply on profile config
ipcRenderer.on('profile-config', (event, config) => {
  profileConfig = config;
  console.log('🔐 Profile config received:', config.id);
  
  // Apply anti-detection immediately
  applyAntiDetection(config);
});
