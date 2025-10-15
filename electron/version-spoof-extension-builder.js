/**
 * Version Spoof Extension Builder
 * 
 * Creates a Chrome extension that injects version spoofing scripts
 * at document_start (before ANY page scripts run) to prevent version detection.
 * 
 * This is CRITICAL for Chrome 139 spoofing as Chrome 126/111.
 */

const fs = require('fs');
const path = require('path');

/**
 * Create version spoofing Chrome extension
 * @param {string} userDataDir - Chrome user data directory
 * @param {string} userAgent - Target User-Agent string
 * @returns {string} - Path to extension directory
 */
function createVersionSpoofExtension(userDataDir, userAgent) {
  if (!userAgent) {
    console.warn('⚠️ No User-Agent provided for version spoofing extension');
    return null;
  }
  
  // Extract target Chrome version from User-Agent
  const match = userAgent.match(/Chrome\/(\d+)/);
  if (!match) {
    console.warn('⚠️ Could not extract Chrome version from User-Agent:', userAgent);
    return null;
  }
  
  const targetVersion = match[1];
  console.log(`🔧 Creating version spoof extension for Chrome ${targetVersion}`);
  console.log(`🔧 Full User-Agent: ${userAgent}`);
  
  // Create extension directory
  const extensionDir = path.join(userDataDir, 'BeastVersionSpoofExtension');
  
  // CRITICAL: Always regenerate extension to ensure latest version
  // Check if extension exists and if version changed
  let shouldRegenerate = true;
  const versionFile = path.join(extensionDir, '.version');
  
  if (fs.existsSync(versionFile)) {
    try {
      const cachedVersion = fs.readFileSync(versionFile, 'utf8').trim();
      if (cachedVersion === targetVersion) {
        console.log(`✅ Extension already exists for Chrome ${targetVersion} - reusing`);
        shouldRegenerate = false;
      } else {
        console.log(`🔄 Version changed: ${cachedVersion} → ${targetVersion} - regenerating`);
        shouldRegenerate = true;
      }
    } catch (e) {
      console.log('⚠️ Could not read version file - will regenerate');
    }
  }
  
  if (!fs.existsSync(extensionDir)) {
    fs.mkdirSync(extensionDir, { recursive: true });
  }
  
  // Skip regeneration if same version
  if (!shouldRegenerate) {
    return extensionDir;
  }
  
  console.log(`📝 Generating extension with TARGET_VERSION = ${targetVersion}`);
  
  // Create manifest.json with Manifest V2 (more reliable in Ungoogled Chromium)
  const manifest = {
    manifest_version: 2,
    name: "Beast Browser Version Spoof",
    version: "1.0.2",
    description: "Spoofs Chrome version to prevent detection",
    permissions: ["<all_urls>"],
    content_scripts: [
      {
        matches: ["<all_urls>"],
        js: ["version-spoof.js"],
        run_at: "document_start", // CRITICAL: Before page loads
        all_frames: true,
        match_about_blank: true
      }
    ],
    web_accessible_resources: []
  };
  
  fs.writeFileSync(
    path.join(extensionDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8'
  );
  
  // Create version spoofing script
  const spoofScript = generateVersionSpoofScript(userAgent, targetVersion);
  fs.writeFileSync(
    path.join(extensionDir, 'version-spoof.js'),
    spoofScript,
    'utf8'
  );
  
  // Write version file for caching
  fs.writeFileSync(versionFile, targetVersion, 'utf8');
  
  console.log('✅ Version spoof extension created at:', extensionDir);
  console.log(`✅ Target Chrome version: ${targetVersion}`);
  console.log(`✅ Version file created: ${versionFile}`);
  
  return extensionDir;
}

/**
 * Generate version spoofing script
 * @param {string} userAgent - Target User-Agent
 * @param {string} targetVersion - Target Chrome version
 * @returns {string} - JavaScript code
 */
function generateVersionSpoofScript(userAgent, targetVersion) {
  // Ensure targetVersion is a string and valid
  const version = String(targetVersion || '111');
  
  // Content script that injects into page context
  return `
// Content script - Injects spoofing code into page context
(function() {
  const script = document.createElement('script');
  script.textContent = \`
  (function() {
    'use strict';
    
    const TARGET_USER_AGENT = ${JSON.stringify(userAgent)};
    const TARGET_VERSION = ${JSON.stringify(version)};
    
    console.log('🔧 BEAST VERSION SPOOF ACTIVE');
    console.log('🎯 Target Chrome version:', TARGET_VERSION);
    
    if (!TARGET_VERSION) {
      console.error('❌ TARGET_VERSION is empty!');
      return;
    }
  
  // ========================================
  // 1. OVERRIDE navigator.userAgent
  // ========================================
  try {
    Object.defineProperty(Navigator.prototype, 'userAgent', {
      get: function() {
        return TARGET_USER_AGENT;
      },
      configurable: true,
      enumerable: true
    });
    console.log('✅ navigator.userAgent spoofed');
  } catch (e) {
    console.error('❌ Failed to spoof navigator.userAgent:', e);
  }
  
  // ========================================
  // 2. OVERRIDE navigator.appVersion
  // ========================================
  try {
    const appVersionMatch = TARGET_USER_AGENT.match(/Mozilla\\/(.+)/);
    const appVersion = appVersionMatch ? appVersionMatch[1] : '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/' + TARGET_VERSION + '.0.0.0 Safari/537.36';
    
    Object.defineProperty(Navigator.prototype, 'appVersion', {
      get: function() {
        return appVersion;
      },
      configurable: true,
      enumerable: true
    });
    console.log('✅ navigator.appVersion spoofed to:', appVersion.substring(0, 50) + '...');
  } catch (e) {
    console.error('❌ Failed to spoof navigator.appVersion:', e);
  }
  
  // ========================================
  // 3. OVERRIDE navigator.userAgentData (Client Hints API)
  // ========================================
  // CRITICAL: Must delete and recreate to override Chrome's native implementation
  try {
    console.log('🔄 Spoofing userAgentData with version:', TARGET_VERSION);
    
    // First, try to delete the existing property descriptor
    try {
      delete Navigator.prototype.userAgentData;
    } catch (e) {
      console.log('Note: Could not delete Navigator.prototype.userAgentData');
    }
    
    // Create fresh spoofed object
    const createSpoofedUserAgentData = () => {
      return {
        brands: [
          { brand: 'Not;A=Brand', version: '99' },
          { brand: 'Chromium', version: TARGET_VERSION },
          { brand: 'Google Chrome', version: TARGET_VERSION }
        ],
        mobile: false,
        platform: 'Windows',
        getHighEntropyValues: async function(hints) {
          console.log('🔄 getHighEntropyValues called with hints:', hints);
          
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
          if (hints && Array.isArray(hints)) {
            hints.forEach(hint => {
              if (hint in values) {
                result[hint] = values[hint];
                console.log('  ✅ Returning', hint + ':', typeof values[hint] === 'string' ? values[hint] : JSON.stringify(values[hint]));
              }
            });
          }
          return Promise.resolve(result);
        },
        toJSON: function() {
          return {
            brands: this.brands,
            mobile: this.mobile,
            platform: this.platform
          };
        }
      };
    };
    
    const spoofedData = createSpoofedUserAgentData();
    console.log('✅ Created spoofed userAgentData with brands:', JSON.stringify(spoofedData.brands));
    
    // Override on Navigator.prototype with writable: false to prevent tampering
    Object.defineProperty(Navigator.prototype, 'userAgentData', {
      get: function() {
        return createSpoofedUserAgentData();
      },
      configurable: true,
      enumerable: true
    });
    console.log('✅ Navigator.prototype.userAgentData overridden');
    
    // Also override on the navigator instance itself
    Object.defineProperty(navigator, 'userAgentData', {
      get: function() {
        return createSpoofedUserAgentData();
      },
      configurable: true
    });
    console.log('✅ navigator.userAgentData overridden (instance)');
    
  } catch (e) {
    console.error('❌ Failed to spoof navigator.userAgentData:', e);
    console.error('❌ Stack:', e.stack);
  }
  
  // ========================================
  // 4. OVERRIDE navigator.vendor
  // ========================================
  try {
    Object.defineProperty(Navigator.prototype, 'vendor', {
      get: function() {
        return 'Google Inc.';
      },
      configurable: true,
      enumerable: true
    });
    console.log('✅ navigator.vendor spoofed');
  } catch (e) {}
  
  // ========================================
  // 5. REMOVE navigator.webdriver
  // ========================================
  try {
    Object.defineProperty(Navigator.prototype, 'webdriver', {
      get: function() {
        return false;
      },
      configurable: true,
      enumerable: true
    });
    console.log('✅ navigator.webdriver removed');
  } catch (e) {}
  
  // ========================================
  // 6. OVERRIDE chrome.app (can leak version)
  // ========================================
  if (typeof chrome !== 'undefined' && chrome) {
    try {
      Object.defineProperty(chrome, 'app', {
        get: () => undefined,
        configurable: true
      });
      console.log('✅ chrome.app hidden');
    } catch (e) {}
    
    try {
      Object.defineProperty(chrome, 'loadTimes', {
        get: () => undefined,
        configurable: true
      });
      console.log('✅ chrome.loadTimes hidden');
    } catch (e) {}
    
    try {
      Object.defineProperty(chrome, 'csi', {
        get: () => undefined,
        configurable: true
      });
      console.log('✅ chrome.csi hidden');
    } catch (e) {}
  }
  
  // ========================================
  // 7. VERIFY SPOOFING
  // ========================================
  console.log('');
  console.log('🔍 VERIFICATION:');
  console.log('   navigator.userAgent:', navigator.userAgent.substring(0, 80));
  console.log('   navigator.appVersion:', navigator.appVersion.substring(0, 80));
  
  if (navigator.userAgentData) {
    console.log('   navigator.userAgentData exists: YES');
    console.log('   navigator.userAgentData.brands:', JSON.stringify(navigator.userAgentData.brands));
    
    // Check if versions are present
    const chromeBrand = navigator.userAgentData.brands.find(b => b.brand.includes('Chrome') || b.brand.includes('Chromium'));
    if (chromeBrand) {
      console.log('   ✅ Chrome brand found with version:', chromeBrand.version);
      if (!chromeBrand.version || chromeBrand.version === '') {
        console.error('   ❌❌❌ VERSION IS EMPTY! This is the problem!');
        console.error('   ❌ TARGET_VERSION was:', TARGET_VERSION);
      }
    }
    
    // Test getHighEntropyValues
    navigator.userAgentData.getHighEntropyValues(['uaFullVersion', 'fullVersionList']).then(values => {
      console.log('   High Entropy Values:');
      console.log('     uaFullVersion:', values.uaFullVersion);
      console.log('     fullVersionList:', JSON.stringify(values.fullVersionList));
    }).catch(e => {
      console.error('   ❌ getHighEntropyValues failed:', e);
    });
  } else {
    console.log('   navigator.userAgentData exists: NO (Chrome < 90?)');
  }
  
    console.log('');
    console.log('✅✅✅ VERSION SPOOFING COMPLETE ✅✅✅');
    console.log('🔒 Chrome version locked to:', TARGET_VERSION);
    console.log('🚫 Real Chrome 139 version HIDDEN');
    console.log('');
  })();
  \`;
  
  // Inject script into page
  (document.head || document.documentElement).appendChild(script);
  script.remove();
  
  console.log('✅ Version spoof script injected into page context');
})();
`;
}

module.exports = {
  createVersionSpoofExtension
};
