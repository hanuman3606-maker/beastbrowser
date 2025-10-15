/**
 * Playwright Auto-Installer
 * Automatically installs Playwright chromium on first run if missing
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class PlaywrightInstaller {
  constructor() {
    this.isInstalling = false;
  }

  /**
   * Check if Playwright chromium is installed
   */
  isChromiumInstalled() {
    try {
      // Check common Playwright chromium paths
      const playwrightPath = path.join(
        os.homedir(),
        'AppData',
        'Local',
        'ms-playwright'
      );

      if (!fs.existsSync(playwrightPath)) {
        console.log('⚠️ Browser directory not found');
        return false;
      }

      // Look for chromium folders
      const folders = fs.readdirSync(playwrightPath);
      const chromiumFolder = folders.find(f => f.startsWith('chromium-'));

      if (!chromiumFolder) {
        console.log('⚠️ Chrome browser not found');
        return false;
      }

      const chromePath = path.join(
        playwrightPath,
        chromiumFolder,
        'chrome-win',
        'chrome.exe'
      );

      const exists = fs.existsSync(chromePath);
      console.log(`${exists ? '✅' : '❌'} Chrome browser path:`, chromePath);
      return exists;
    } catch (error) {
      console.error('❌ Error checking Chrome browser:', error.message);
      return false;
    }
  }

  /**
   * Install Playwright chromium
   */
  async install() {
    if (this.isInstalling) {
      console.log('⏳ Browser installation already in progress...');
      return { success: false, message: 'Installation in progress' };
    }

    this.isInstalling = true;

    try {
      console.log('📥 Downloading Chrome browser...');
      console.log('⏳ This may take 2-3 minutes (one-time only)...');

      // Run playwright install chromium
      execSync('npx playwright install chromium', {
        stdio: 'inherit',
        timeout: 5 * 60 * 1000 // 5 minutes timeout
      });

      console.log('✅ Chrome browser downloaded successfully!');
      this.isInstalling = false;
      return { success: true, message: 'Chrome browser installed' };
    } catch (error) {
      console.error('❌ Failed to download Chrome browser:', error.message);
      this.isInstalling = false;
      return { success: false, message: error.message };
    }
  }

  /**
   * Ensure Playwright chromium is installed (check + install if needed)
   */
  async ensureInstalled() {
    console.log('🔍 Checking Chrome browser...');

    if (this.isChromiumInstalled()) {
      console.log('✅ Chrome browser already installed');
      return { success: true, message: 'Already installed' };
    }

    console.log('⚠️ Chrome browser not found, downloading...');
    return await this.install();
  }
}

module.exports = new PlaywrightInstaller();
