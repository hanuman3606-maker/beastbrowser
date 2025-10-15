/**
 * IPC Handlers for Profile Storage
 * Provides communication between renderer and profile storage service
 */

const { ipcMain, dialog, app } = require('electron');
const path = require('path');
const { profileStorageService } = require('./profile-storage-service');
const { profileExportImportService } = require('./profile-export-import-service');
const { profilePackageService } = require('./profile-package-service');

/**
 * Setup all profile storage IPC handlers
 */
function setupProfileStorageHandlers() {
  console.log('🔧 Setting up Profile Storage IPC handlers...');

  // Initialize storage service
  ipcMain.handle('storage:initialize', async () => {
    try {
      return await profileStorageService.initialize();
    } catch (error) {
      console.error('❌ Failed to initialize storage:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Get all profiles
  ipcMain.handle('storage:getAllProfiles', async () => {
    try {
      return await profileStorageService.getAllProfiles();
    } catch (error) {
      console.error('❌ Failed to get all profiles:', error);
      return {
        success: false,
        error: error.message,
        profiles: []
      };
    }
  });

  // Get profile by ID
  ipcMain.handle('storage:getProfile', async (event, profileId) => {
    try {
      return await profileStorageService.getProfileById(profileId);
    } catch (error) {
      console.error('❌ Failed to get profile:', error);
      return {
        success: false,
        error: error.message,
        profile: null
      };
    }
  });

  // Save single profile
  ipcMain.handle('storage:saveProfile', async (event, profile) => {
    try {
      return await profileStorageService.saveProfile(profile);
    } catch (error) {
      console.error('❌ Failed to save profile:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Save multiple profiles (bulk)
  ipcMain.handle('storage:saveProfiles', async (event, profiles) => {
    try {
      return await profileStorageService.saveProfiles(profiles);
    } catch (error) {
      console.error('❌ Failed to save profiles:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Delete single profile
  ipcMain.handle('storage:deleteProfile', async (event, profileId) => {
    try {
      return await profileStorageService.deleteProfile(profileId);
    } catch (error) {
      console.error('❌ Failed to delete profile:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Delete multiple profiles
  ipcMain.handle('storage:deleteProfiles', async (event, profileIds) => {
    try {
      return await profileStorageService.deleteProfiles(profileIds);
    } catch (error) {
      console.error('❌ Failed to delete profiles:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Export profiles
  ipcMain.handle('storage:exportProfiles', async (event, defaultPath) => {
    try {
      // Show save dialog
      const result = await dialog.showSaveDialog({
        title: 'Export Profiles',
        defaultPath: defaultPath || path.join(app.getPath('documents'), 'beastbrowser_profiles_export.json'),
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (result.canceled || !result.filePath) {
        return {
          success: false,
          canceled: true
        };
      }

      return await profileStorageService.exportProfiles(result.filePath);
    } catch (error) {
      console.error('❌ Failed to export profiles:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Import profiles
  ipcMain.handle('storage:importProfiles', async (event, merge = false) => {
    try {
      // Show open dialog
      const result = await dialog.showOpenDialog({
        title: 'Import Profiles',
        defaultPath: app.getPath('documents'),
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      });

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return {
          success: false,
          canceled: true
        };
      }

      return await profileStorageService.importProfiles(result.filePaths[0], merge);
    } catch (error) {
      console.error('❌ Failed to import profiles:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Get storage statistics
  ipcMain.handle('storage:getStats', async () => {
    try {
      return await profileStorageService.getStorageStats();
    } catch (error) {
      console.error('❌ Failed to get storage stats:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Create backup
  ipcMain.handle('storage:createBackup', async () => {
    try {
      const success = await profileStorageService.createBackup();
      return {
        success,
        message: success ? 'Backup created successfully' : 'Failed to create backup'
      };
    } catch (error) {
      console.error('❌ Failed to create backup:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Restore from backup
  ipcMain.handle('storage:restoreBackup', async () => {
    try {
      const success = await profileStorageService.restoreFromBackup();
      return {
        success,
        message: success ? 'Restored from backup successfully' : 'No backups found'
      };
    } catch (error) {
      console.error('❌ Failed to restore backup:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Clear all profiles (dangerous)
  ipcMain.handle('storage:clearAll', async () => {
    try {
      // Show confirmation dialog
      const result = await dialog.showMessageBox({
        type: 'warning',
        title: 'Clear All Profiles',
        message: 'Are you sure you want to delete ALL profiles?',
        detail: 'This action cannot be undone. A backup will be created before deletion.',
        buttons: ['Cancel', 'Delete All'],
        defaultId: 0,
        cancelId: 0
      });

      if (result.response !== 1) {
        return {
          success: false,
          canceled: true
        };
      }

      return await profileStorageService.clearAllProfiles();
    } catch (error) {
      console.error('❌ Failed to clear all profiles:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Migrate from localStorage (one-time migration)
  ipcMain.handle('storage:migrateFromLocalStorage', async (event, localStorageProfiles) => {
    try {
      console.log(`🔄 Migrating ${localStorageProfiles.length} profiles from localStorage...`);
      
      // Get existing profiles
      const existingResult = await profileStorageService.getAllProfiles();
      const existingProfiles = existingResult.profiles || [];

      if (existingProfiles.length > 0) {
        console.log(`⚠️ Found ${existingProfiles.length} existing profiles in storage`);
        
        // Merge profiles, avoiding duplicates
        const existingIds = new Set(existingProfiles.map(p => p.id));
        const newProfiles = localStorageProfiles.filter(p => !existingIds.has(p.id));
        
        if (newProfiles.length > 0) {
          const allProfiles = [...existingProfiles, ...newProfiles];
          await profileStorageService.saveProfiles(allProfiles);
          console.log(`✅ Migrated ${newProfiles.length} new profiles`);
        } else {
          console.log('ℹ️ No new profiles to migrate');
        }

        return {
          success: true,
          migrated: newProfiles.length,
          existing: existingProfiles.length,
          total: existingProfiles.length + newProfiles.length
        };
      } else {
        // No existing profiles, save all
        await profileStorageService.saveProfiles(localStorageProfiles);
        console.log(`✅ Migrated ${localStorageProfiles.length} profiles`);

        return {
          success: true,
          migrated: localStorageProfiles.length,
          existing: 0,
          total: localStorageProfiles.length
        };
      }
    } catch (error) {
      console.error('❌ Failed to migrate profiles:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Open storage directory in file explorer
  ipcMain.handle('storage:openDirectory', async () => {
    try {
      const { shell } = require('electron');
      const stats = await profileStorageService.getStorageStats();
      
      if (stats.success && stats.stats.storageLocation) {
        await shell.openPath(stats.stats.storageLocation);
        return {
          success: true
        };
      }

      return {
        success: false,
        error: 'Storage location not found'
      };
    } catch (error) {
      console.error('❌ Failed to open storage directory:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // ============================================
  // Export/Import Handlers (User-specific encryption)
  // ============================================

  // Export single profile (COMPLETE - includes browser data)
  ipcMain.handle('profile:exportSingle', async (event, profile, user) => {
    try {
      console.log(`\n📤 Export request for profile: ${profile.name}`);
      
      // Show save dialog
      const result = await dialog.showSaveDialog({
        title: 'Export Profile',
        defaultPath: path.join(app.getPath('documents'), `${profile.name}.bbprofile`),
        filters: [
          { name: 'BeastBrowser Profile', extensions: ['bbprofile'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (result.canceled || !result.filePath) {
        console.log('Export canceled by user');
        return {
          success: false,
          canceled: true
        };
      }

      console.log(`Export path: ${result.filePath}`);
      
      // Export profile using package service (includes browser data)
      const exportResult = await profilePackageService.exportProfile(
        profile,
        result.filePath,
        user
      );

      if (exportResult.success) {
        console.log(`✅ Export successful: ${exportResult.fileSize} bytes`);
      } else {
        console.error(`❌ Export failed: ${exportResult.error}`);
      }

      return exportResult;
    } catch (error) {
      console.error('❌ Failed to export profile:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Export multiple profiles (NO ENCRYPTION)
  ipcMain.handle('profile:exportMultiple', async (event, profiles, user) => {
    try {
      // Show save dialog
      const result = await dialog.showSaveDialog({
        title: 'Export Profiles',
        defaultPath: path.join(app.getPath('documents'), `BeastBrowser_Profiles_${profiles.length}.bbprofile`),
        filters: [
          { name: 'BeastBrowser Profile', extensions: ['bbprofile'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (result.canceled || !result.filePath) {
        return {
          success: false,
          canceled: true
        };
      }

      // Get user secret for encryption (with fallback)
      const userSecret = profileExportImportService.getUserSecret(user);
      const userId = (user && user.uid) ? user.uid : 'default-user';
      
      // Export profiles (NO ENCRYPTION now)
      return await profileExportImportService.exportMultipleProfiles(
        profiles,
        result.filePath,
        userId,
        userSecret
      );
    } catch (error) {
      console.error('❌ Failed to export profiles:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Import profile(s) (COMPLETE - includes browser data)
  ipcMain.handle('profile:import', async (event, user, existingProfiles) => {
    try {
      console.log(`\n📥 Import request`);
      
      // Show open dialog
      const result = await dialog.showOpenDialog({
        title: 'Import Profile',
        defaultPath: app.getPath('documents'),
        filters: [
          { name: 'BeastBrowser Profile', extensions: ['bbprofile'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      });

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        console.log('Import canceled by user');
        return {
          success: false,
          canceled: true
        };
      }

      const importPath = result.filePaths[0];
      console.log(`Import file: ${importPath}`);

      // Try to detect file format (ZIP or JSON)
      const fs = require('fs');
      const fileBuffer = fs.readFileSync(importPath);
      const isZipFile = fileBuffer[0] === 0x50 && fileBuffer[1] === 0x4B; // PK signature
      const isJsonFile = fileBuffer[0] === 0x7B || fileBuffer[0] === 0x20; // { or space
      
      console.log(`📦 File format detection: ${isZipFile ? 'ZIP' : isJsonFile ? 'JSON' : 'UNKNOWN'}`);

      let importResult;

      if (isZipFile) {
        // ZIP format - single profile with browser data
        console.log('Using profilePackageService (ZIP format)');
        
        const validation = await profilePackageService.validateImportFile(importPath);
        if (!validation.valid) {
          console.error(`❌ Invalid import file: ${validation.error}`);
          return {
            success: false,
            error: validation.error
          };
        }

        importResult = await profilePackageService.importProfile(
          importPath,
          user,
          existingProfiles
        );

        if (importResult.success) {
          console.log(`✅ Import successful: ${importResult.profile.name}`);
          
          const allProfiles = [...existingProfiles, importResult.profile];
          await profileStorageService.saveProfiles(allProfiles);
          
          return {
            success: true,
            profiles: [importResult.profile],
            conflicts: importResult.wasRenamed ? 1 : 0
          };
        }
      } else if (isJsonFile) {
        // JSON format - multiple profiles (settings only)
        console.log('Using profileExportImportService (JSON format)');
        
        const userSecret = profileExportImportService.getUserSecret(user);
        const userId = (user && user.uid) ? user.uid : 'default-user';
        
        importResult = await profileExportImportService.importProfile(
          importPath,
          userId,
          userSecret,
          existingProfiles
        );

        if (importResult.success) {
          console.log(`✅ Import successful: ${importResult.profiles.length} profile(s)`);
          
          const allProfiles = [...existingProfiles, ...importResult.profiles];
          await profileStorageService.saveProfiles(allProfiles);
          
          return {
            success: true,
            profiles: importResult.profiles,
            conflicts: importResult.conflicts
          };
        }
      } else {
        return {
          success: false,
          error: 'Unknown file format. Expected ZIP or JSON.'
        };
      }

      // If we got here, import failed
      console.error(`❌ Import failed: ${importResult?.error || 'Unknown error'}`);
      return importResult || { success: false, error: 'Import failed' };
    } catch (error) {
      console.error('❌ Failed to import profile:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Validate import file
  ipcMain.handle('profile:validateImport', async (event, filePath) => {
    try {
      return await profileExportImportService.validateImportFile(filePath);
    } catch (error) {
      console.error('❌ Failed to validate import file:', error);
      return {
        valid: false,
        error: error.message
      };
    }
  });

  console.log('✅ Profile Storage IPC handlers registered');
}

module.exports = { setupProfileStorageHandlers };
