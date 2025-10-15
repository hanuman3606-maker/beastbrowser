/**
 * Mobile Viewport Injection Script
 * This script is injected into every page to force mobile viewport
 */

module.exports = function getMobileViewportScript(width, height, devicePixelRatio, platform) {
  return `
(function() {
  'use strict';
  
  // Configuration
  const MOBILE_WIDTH = ${width};
  const MOBILE_HEIGHT = ${height};
  const DEVICE_PIXEL_RATIO = ${devicePixelRatio};
  const PLATFORM = '${platform}';
  
  console.log('[BeastBrowser] 📱 Mobile viewport injection for', PLATFORM);
  console.log('[BeastBrowser] 📱 Target dimensions:', MOBILE_WIDTH + 'x' + MOBILE_HEIGHT);
  
  // 1. Inject viewport meta tag IMMEDIATELY
  function injectViewportMeta() {
    if (document.documentElement) {
      // Remove existing viewport
      const existing = document.querySelectorAll('meta[name="viewport"]');
      existing.forEach(el => el.remove());
      
      // Create new mobile viewport
      const meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes';
      
      // Insert at the very beginning
      const head = document.head || document.getElementsByTagName('head')[0] || document.documentElement;
      if (head.firstChild) {
        head.insertBefore(meta, head.firstChild);
      } else {
        head.appendChild(meta);
      }
      
      console.log('[BeastBrowser] ✅ Viewport meta tag injected');
    }
  }
  
  // 2. Override window/screen properties
  function overrideProperties() {
    try {
      // Override screen dimensions
      Object.defineProperties(screen, {
        width: { get: () => MOBILE_WIDTH, configurable: true },
        height: { get: () => MOBILE_HEIGHT, configurable: true },
        availWidth: { get: () => MOBILE_WIDTH, configurable: true },
        availHeight: { get: () => MOBILE_HEIGHT, configurable: true }
      });
      
      // Override window inner dimensions
      Object.defineProperties(window, {
        innerWidth: { get: () => MOBILE_WIDTH, configurable: true },
        innerHeight: { get: () => MOBILE_HEIGHT, configurable: true }
      });
      
      // Override devicePixelRatio
      Object.defineProperty(window, 'devicePixelRatio', {
        get: () => DEVICE_PIXEL_RATIO,
        configurable: true
      });
      
      // Override matchMedia for mobile detection
      const originalMatchMedia = window.matchMedia;
      window.matchMedia = function(query) {
        // Force mobile media queries to match
        if (query.includes('max-width') || query.includes('max-device-width')) {
          const match = query.match(/max-width:\\s*(\\d+)/);
          if (match && parseInt(match[1]) >= MOBILE_WIDTH) {
            return {
              matches: true,
              media: query,
              onchange: null,
              addListener: function() {},
              removeListener: function() {},
              addEventListener: function() {},
              removeEventListener: function() {},
              dispatchEvent: function() { return true; }
            };
          }
        }
        return originalMatchMedia.call(this, query);
      };
      
      // Touch support
      Object.defineProperty(navigator, 'maxTouchPoints', {
        get: () => 5,
        configurable: true
      });
      
      console.log('[BeastBrowser] ✅ Properties overridden:', MOBILE_WIDTH + 'x' + MOBILE_HEIGHT);
    } catch (e) {
      console.warn('[BeastBrowser] Could not override properties:', e);
    }
  }
  
  // 3. Force resize events
  function triggerResize() {
    try {
      window.dispatchEvent(new Event('resize'));
      console.log('[BeastBrowser] ✅ Resize event triggered');
    } catch (e) {}
  }
  
  // Execute immediately
  overrideProperties();
  injectViewportMeta();
  
  // Re-inject on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      injectViewportMeta();
      triggerResize();
    });
  } else {
    setTimeout(() => {
      injectViewportMeta();
      triggerResize();
    }, 0);
  }
  
  // Watch for viewport changes
  const observer = new MutationObserver(() => {
    injectViewportMeta();
  });
  
  if (document.documentElement) {
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }
  
  console.log('[BeastBrowser] 📱 Mobile mode active:', MOBILE_WIDTH + 'x' + MOBILE_HEIGHT + ' @' + DEVICE_PIXEL_RATIO + 'x');
})();
`;
};
