const { autoUpdater } = require('electron-updater');
const { dialog } = require('electron');
const log = require('electron-log');

// Configure logging
log.transports.file.level = 'info';
autoUpdater.logger = log;

// Disable auto-download (we'll ask user first)
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

class AutoUpdater {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    // Check for updates event
    autoUpdater.on('checking-for-update', () => {
      log.info('🔍 Checking for updates...');
      this.sendStatusToWindow('Checking for updates...');
    });

    // Update available
    autoUpdater.on('update-available', (info) => {
      log.info('✅ Update available:', info.version);
      this.sendStatusToWindow(`Update available: v${info.version}`);
      
      // Ask user if they want to download
      dialog.showMessageBox(this.mainWindow, {
        type: 'info',
        title: 'Update Available',
        message: `A new version (v${info.version}) is available!`,
        detail: 'Would you like to download it now?',
        buttons: ['Download', 'Later'],
        defaultId: 0,
        cancelId: 1
      }).then((result) => {
        if (result.response === 0) {
          autoUpdater.downloadUpdate();
        }
      });
    });

    // No update available
    autoUpdater.on('update-not-available', (info) => {
      log.info('✅ App is up to date:', info.version);
      this.sendStatusToWindow('App is up to date');
    });

    // Download progress
    autoUpdater.on('download-progress', (progressObj) => {
      const message = `Downloaded ${Math.round(progressObj.percent)}%`;
      log.info(message);
      this.sendStatusToWindow(message);
      
      // Send progress to renderer
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('download-progress', {
          percent: progressObj.percent,
          transferred: progressObj.transferred,
          total: progressObj.total
        });
      }
    });

    // Update downloaded
    autoUpdater.on('update-downloaded', (info) => {
      log.info('✅ Update downloaded:', info.version);
      this.sendStatusToWindow('Update downloaded');
      
      // Ask user to install
      dialog.showMessageBox(this.mainWindow, {
        type: 'info',
        title: 'Update Ready',
        message: 'Update downloaded successfully!',
        detail: 'The application will restart to install the update.',
        buttons: ['Restart Now', 'Later'],
        defaultId: 0,
        cancelId: 1
      }).then((result) => {
        if (result.response === 0) {
          // Quit and install
          setImmediate(() => autoUpdater.quitAndInstall());
        }
      });
    });

    // Error handling
    autoUpdater.on('error', (error) => {
      log.error('❌ Update error:', error);
      this.sendStatusToWindow('Update error');
      
      // Only show error dialog if it's not a "no updates" error
      if (!error.message.includes('No published versions')) {
        dialog.showMessageBox(this.mainWindow, {
          type: 'error',
          title: 'Update Error',
          message: 'Failed to check for updates',
          detail: error.message
        });
      }
    });
  }

  sendStatusToWindow(text) {
    log.info(text);
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('update-status', text);
    }
  }

  // Check for updates with random delay (0-24 hours) to prevent server load spikes
  checkForUpdatesWithDelay() {
    // Random delay between 0-24 hours (in milliseconds)
    const maxDelay = 24 * 60 * 60 * 1000; // 24 hours
    const randomDelay = Math.floor(Math.random() * maxDelay);
    
    log.info(`⏰ Will check for updates in ${Math.round(randomDelay / 1000 / 60)} minutes`);
    
    setTimeout(() => {
      this.checkForUpdates();
    }, randomDelay);
  }

  // Check for updates immediately
  checkForUpdates() {
    // Only check in production
    if (process.env.NODE_ENV === 'development') {
      log.info('⚠️ Skipping update check in development mode');
      return;
    }

    autoUpdater.checkForUpdates().catch((error) => {
      log.error('Failed to check for updates:', error);
    });
  }

  // Manual check (from menu or button)
  checkForUpdatesManual() {
    autoUpdater.checkForUpdates().catch((error) => {
      log.error('Failed to check for updates:', error);
      dialog.showMessageBox(this.mainWindow, {
        type: 'info',
        title: 'No Updates',
        message: 'You are running the latest version!'
      });
    });
  }
}

module.exports = AutoUpdater;
