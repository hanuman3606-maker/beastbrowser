/**
 * Responsive Browser Window Handler
 * Makes Puppeteer browser windows fully responsive to window resize
 * 
 * Features:
 * - Auto-adjusts viewport on window resize
 * - Maintains proper aspect ratio
 * - Smooth resize without page reload
 * - Minimal CPU usage
 * - Chrome-like responsive behavior
 */

const { screen } = require('electron');

class ResponsiveBrowserHandler {
  constructor() {
    this.resizeTimers = new Map(); // Debounce timers per profile
    this.lastSizes = new Map(); // Track last known sizes
  }

  /**
   * Initialize responsive behavior for a browser page
   * @param {string} profileId - Profile identifier
   * @param {Page} page - Puppeteer page instance
   * @param {Browser} browser - Puppeteer browser instance
   */
  async initialize(profileId, page, browser) {
    try {
      console.log(`📐 Initializing responsive behavior for profile: ${profileId}`);

      // Get initial window size from browser
      const pages = await browser.pages();
      const targetPage = pages.find(p => p === page) || pages[0];

      if (!targetPage) {
        console.warn('⚠️ No page found for responsive initialization');
        return;
      }

      // Set initial viewport to match screen
      await this.setResponsiveViewport(targetPage);

      // Inject resize listener into page
      await this.injectResizeListener(targetPage);

      console.log(`✅ Responsive behavior initialized for profile: ${profileId}`);
    } catch (error) {
      console.error(`❌ Failed to initialize responsive behavior:`, error);
    }
  }

  /**
   * Set viewport to be responsive
   */
  async setResponsiveViewport(page) {
    try {
      // Get screen dimensions
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width, height } = primaryDisplay.workAreaSize;

      // Set viewport with device scale factor
      await page.setViewport({
        width: Math.floor(width * 0.8), // 80% of screen width
        height: Math.floor(height * 0.8), // 80% of screen height
        deviceScaleFactor: primaryDisplay.scaleFactor || 1,
        isMobile: false,
        hasTouch: false,
        isLandscape: width > height
      });

      console.log(`📐 Viewport set to: ${Math.floor(width * 0.8)}x${Math.floor(height * 0.8)}`);
    } catch (error) {
      console.error('❌ Failed to set responsive viewport:', error);
    }
  }

  /**
   * Inject resize listener into page
   */
  async injectResizeListener(page) {
    try {
      await page.evaluateOnNewDocument(() => {
        // Make viewport responsive to window resize
        let resizeTimeout;
        
        window.addEventListener('resize', () => {
          clearTimeout(resizeTimeout);
          
          // Debounce resize events (wait 150ms after last resize)
          resizeTimeout = setTimeout(() => {
            // Update viewport meta tag if exists
            let viewport = document.querySelector('meta[name="viewport"]');
            if (!viewport) {
              viewport = document.createElement('meta');
              viewport.name = 'viewport';
              document.head.appendChild(viewport);
            }
            
            // Set responsive viewport
            viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
            
            // Trigger layout recalculation
            document.body.style.width = '100%';
            document.body.style.height = '100vh';
            document.documentElement.style.width = '100%';
            document.documentElement.style.height = '100vh';
            
            // Dispatch custom resize event for web apps
            window.dispatchEvent(new Event('resize'));
            
            console.log('📐 Window resized to:', window.innerWidth, 'x', window.innerHeight);
          }, 150);
        });

        // Initial viewport setup
        let viewport = document.querySelector('meta[name="viewport"]');
        if (!viewport) {
          viewport = document.createElement('meta');
          viewport.name = 'viewport';
          viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
          document.head.appendChild(viewport);
        }

        // Make body and html responsive
        document.documentElement.style.width = '100%';
        document.documentElement.style.height = '100vh';
        document.documentElement.style.overflow = 'auto';
        
        if (document.body) {
          document.body.style.width = '100%';
          document.body.style.height = '100vh';
          document.body.style.margin = '0';
          document.body.style.padding = '0';
        }
      });

      console.log('✅ Resize listener injected into page');
    } catch (error) {
      console.error('❌ Failed to inject resize listener:', error);
    }
  }

  /**
   * Handle window resize event
   * @param {string} profileId - Profile identifier
   * @param {Page} page - Puppeteer page instance
   * @param {number} width - New window width
   * @param {number} height - New window height
   */
  async handleResize(profileId, page, width, height) {
    try {
      // Clear existing timer
      if (this.resizeTimers.has(profileId)) {
        clearTimeout(this.resizeTimers.get(profileId));
      }

      // Debounce resize (wait 200ms after last resize)
      const timer = setTimeout(async () => {
        try {
          // Check if size actually changed
          const lastSize = this.lastSizes.get(profileId);
          if (lastSize && lastSize.width === width && lastSize.height === height) {
            return; // No change, skip
          }

          console.log(`📐 Resizing browser for profile ${profileId}: ${width}x${height}`);

          // Update viewport
          await page.setViewport({
            width: Math.max(800, width), // Minimum 800px width
            height: Math.max(600, height), // Minimum 600px height
            deviceScaleFactor: screen.getPrimaryDisplay().scaleFactor || 1,
            isMobile: false,
            hasTouch: false,
            isLandscape: width > height
          });

          // Store last size
          this.lastSizes.set(profileId, { width, height });

          console.log(`✅ Browser resized successfully for profile ${profileId}`);
        } catch (error) {
          console.error(`❌ Failed to resize browser for profile ${profileId}:`, error);
        } finally {
          this.resizeTimers.delete(profileId);
        }
      }, 200);

      this.resizeTimers.set(profileId, timer);
    } catch (error) {
      console.error('❌ Resize handler error:', error);
    }
  }

  /**
   * Cleanup resources for a profile
   */
  cleanup(profileId) {
    if (this.resizeTimers.has(profileId)) {
      clearTimeout(this.resizeTimers.get(profileId));
      this.resizeTimers.delete(profileId);
    }
    this.lastSizes.delete(profileId);
    console.log(`🗑️ Cleaned up responsive handler for profile: ${profileId}`);
  }

  /**
   * Get optimal window size based on screen
   */
  getOptimalWindowSize() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    return {
      width: Math.floor(width * 0.8),
      height: Math.floor(height * 0.8),
      x: Math.floor(width * 0.1),
      y: Math.floor(height * 0.1)
    };
  }
}

// Export singleton instance
module.exports = new ResponsiveBrowserHandler();
