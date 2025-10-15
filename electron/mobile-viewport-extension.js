// Mobile Viewport Extension Creator
// Forces websites to render in mobile mode even if window is larger

const fs = require('fs');
const path = require('path');

/**
 * Create Chrome extension that injects mobile viewport
 * @param {string} userDataDir - User data directory
 * @param {string} deviceType - 'android' or 'ios'
 * @returns {string} Path to extension directory
 */
function createMobileViewportExtension(userDataDir, deviceType = 'android') {
  const extensionDir = path.join(userDataDir, 'BeastMobileViewport');
  
  // Create extension directory
  if (!fs.existsSync(extensionDir)) {
    fs.mkdirSync(extensionDir, { recursive: true });
  }

  // Mobile viewport configurations
  const viewportConfigs = {
    android: {
      width: 412,
      height: 915,
      deviceScaleFactor: 2.625,
      mobile: true,
      screenOrientation: { type: 'portraitPrimary', angle: 0 }
    },
    ios: {
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      mobile: true,
      screenOrientation: { type: 'portraitPrimary', angle: 0 }
    }
  };

  const config = viewportConfigs[deviceType] || viewportConfigs.android;

  // Manifest - Using v2 for better compatibility
  const manifest = {
    manifest_version: 2,
    name: 'BeastBrowser Mobile Viewport',
    version: '1.0.0',
    description: 'Forces mobile viewport for Android/iOS profiles',
    permissions: ['<all_urls>'],
    content_scripts: [
      {
        matches: ['<all_urls>'],
        js: ['content.js'],
        run_at: 'document_start',
        all_frames: true
      }
    ]
  };

  // Content script - Injects mobile viewport
  const contentScript = `
(function() {
  'use strict';
  
  console.log('🔧 BeastBrowser: Mobile viewport injection');
  
  // Mobile viewport configuration
  const VIEWPORT_CONFIG = ${JSON.stringify(config, null, 2)};
  
  // Inject viewport meta tag ASAP
  function injectViewportMeta() {
    // Remove existing viewport tags
    const existingViewports = document.querySelectorAll('meta[name="viewport"]');
    existingViewports.forEach(tag => tag.remove());
    
    // Create mobile viewport meta tag
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes';
    
    // Insert at the beginning of head
    const head = document.head || document.getElementsByTagName('head')[0];
    if (head) {
      head.insertBefore(meta, head.firstChild);
      console.log('✅ Mobile viewport meta tag injected');
    }
  }
  
  // Override screen properties to report mobile dimensions
  function overrideScreenProperties() {
    try {
      // Override screen object
      Object.defineProperties(window.screen, {
        width: { get: () => VIEWPORT_CONFIG.width, configurable: true },
        height: { get: () => VIEWPORT_CONFIG.height, configurable: true },
        availWidth: { get: () => VIEWPORT_CONFIG.width, configurable: true },
        availHeight: { get: () => VIEWPORT_CONFIG.height, configurable: true }
      });
      
      // Override window dimensions
      Object.defineProperties(window, {
        innerWidth: { get: () => VIEWPORT_CONFIG.width, configurable: true },
        innerHeight: { get: () => VIEWPORT_CONFIG.height, configurable: true },
        outerWidth: { get: () => VIEWPORT_CONFIG.width, configurable: true },
        outerHeight: { get: () => VIEWPORT_CONFIG.height, configurable: true }
      });
      
      // Set device pixel ratio
      Object.defineProperty(window, 'devicePixelRatio', {
        get: () => VIEWPORT_CONFIG.deviceScaleFactor,
        configurable: true
      });
      
      console.log('✅ Screen dimensions overridden to mobile size');
    } catch (e) {
      console.warn('⚠️ Could not override screen properties:', e);
    }
  }
  
  // Override navigator properties for mobile detection
  function overrideMobileDetection() {
    try {
      // Mobile platform
      Object.defineProperty(navigator, 'platform', {
        get: () => '${deviceType === 'ios' ? 'iPhone' : 'Linux armv8l'}',
        configurable: true
      });
      
      // Max touch points (mobile has touch)
      Object.defineProperty(navigator, 'maxTouchPoints', {
        get: () => 5,
        configurable: true
      });
      
      console.log('✅ Mobile detection properties set');
    } catch (e) {
      console.warn('⚠️ Could not override navigator properties:', e);
    }
  }
  
  // Execute immediately
  overrideScreenProperties();
  overrideMobileDetection();
  
  // Inject viewport when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectViewportMeta);
  } else {
    injectViewportMeta();
  }
  
  // Also inject on head available
  const observer = new MutationObserver((mutations) => {
    if (document.head) {
      injectViewportMeta();
      observer.disconnect();
    }
  });
  
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
  
  console.log('📱 Mobile viewport: ${config.width}x${config.height} @ ${config.deviceScaleFactor}x');
})();
`;

  // Write files
  fs.writeFileSync(
    path.join(extensionDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  
  fs.writeFileSync(
    path.join(extensionDir, 'content.js'),
    contentScript
  );

  console.log('✅ Mobile viewport extension created:', extensionDir);
  return extensionDir;
}

module.exports = { createMobileViewportExtension };
