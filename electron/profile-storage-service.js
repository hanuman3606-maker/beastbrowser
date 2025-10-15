/**
 * Profile Storage Service for BeastBrowser
 * Provides persistent, encrypted local storage for browser profiles
 * Uses SQLite for structured data and file system for profile data
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { encryptionService } = require('./encryption-service');

class ProfileStorageService {
  constructor() {
    this.initialized = false;
    this.storageDir = null;
    this.profilesFile = null;
    this.backupDir = null;
    this.db = null;
  }

  /**
   * Initialize the storage service
   */
  async initialize() {
    try {
      console.log('🔧 Initializing Profile Storage Service...');

      // Get app data directory (persistent across app restarts)
      const userDataPath = app.getPath('userData');
      this.storageDir = path.join(userDataPath, 'BeastBrowser_Profiles');
      this.backupDir = path.join(this.storageDir, 'backups');
      this.profilesFile = path.join(this.storageDir, 'profiles.encrypted');

      // Create directories if they don't exist
      if (!fs.existsSync(this.storageDir)) {
        fs.mkdirSync(this.storageDir, { recursive: true, mode: 0o700 });
        console.log('📁 Created storage directory:', this.storageDir);
      }

      if (!fs.existsSync(this.backupDir)) {
        fs.mkdirSync(this.backupDir, { recursive: true, mode: 0o700 });
        console.log('📁 Created backup directory:', this.backupDir);
      }

      // Initialize encryption service
      await encryptionService.initialize(userDataPath);

      // Initialize database (using JSON file with encryption for simplicity)
      await this.initializeDatabase();

      this.initialized = true;
      console.log('✅ Profile Storage Service initialized successfully');
      console.log('📂 Storage location:', this.storageDir);

      return {
        success: true,
        storageDir: this.storageDir
      };
    } catch (error) {
      console.error('❌ Failed to initialize Profile Storage Service:', error);
      throw error;
    }
  }

  /**
   * Initialize database
   */
  async initializeDatabase() {
    try {
      // Check if profiles file exists
      if (fs.existsSync(this.profilesFile)) {
        console.log('📖 Loading existing profiles database...');
        await this.loadDatabase();
      } else {
        console.log('📝 Creating new profiles database...');
        this.db = {
          profiles: [],
          metadata: {
            version: '1.0.0',
            created: new Date().toISOString(),
            lastModified: new Date().toISOString()
          }
        };
        await this.saveDatabase();
      }
    } catch (error) {
      console.error('❌ Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Load database from encrypted file
   */
  async loadDatabase() {
    try {
      const encryptedData = fs.readFileSync(this.profilesFile, 'utf8');
      this.db = encryptionService.decrypt(encryptedData);
      
      // Ensure profiles array exists
      if (!this.db.profiles) {
        this.db.profiles = [];
      }

      console.log(`✅ Loaded ${this.db.profiles.length} profiles from database`);
      return this.db;
    } catch (error) {
      console.error('❌ Failed to load database:', error);
      
      // Try to restore from backup
      const restored = await this.restoreFromBackup();
      if (restored) {
        console.log('✅ Database restored from backup');
        return this.db;
      }
      
      throw error;
    }
  }

  /**
   * Save database to encrypted file
   */
  async saveDatabase() {
    try {
      // Update last modified timestamp
      if (!this.db.metadata) {
        this.db.metadata = {};
      }
      this.db.metadata.lastModified = new Date().toISOString();

      // Encrypt and save
      const encryptedData = encryptionService.encrypt(this.db);
      fs.writeFileSync(this.profilesFile, encryptedData, { mode: 0o600 });

      console.log(`💾 Saved ${this.db.profiles.length} profiles to database`);
      return true;
    } catch (error) {
      console.error('❌ Failed to save database:', error);
      throw error;
    }
  }

  /**
   * Create backup of current database
   */
  async createBackup() {
    try {
      if (!fs.existsSync(this.profilesFile)) {
        return false;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(this.backupDir, `profiles_backup_${timestamp}.encrypted`);
      
      fs.copyFileSync(this.profilesFile, backupFile);
      
      // Keep only last 10 backups
      await this.cleanOldBackups(10);
      
      console.log('💾 Backup created:', backupFile);
      return true;
    } catch (error) {
      console.error('❌ Failed to create backup:', error);
      return false;
    }
  }

  /**
   * Restore from latest backup
   */
  async restoreFromBackup() {
    try {
      const backups = fs.readdirSync(this.backupDir)
        .filter(f => f.startsWith('profiles_backup_') && f.endsWith('.encrypted'))
        .sort()
        .reverse();

      if (backups.length === 0) {
        console.log('⚠️ No backups found');
        return false;
      }

      const latestBackup = path.join(this.backupDir, backups[0]);
      console.log('🔄 Restoring from backup:', latestBackup);

      const encryptedData = fs.readFileSync(latestBackup, 'utf8');
      this.db = encryptionService.decrypt(encryptedData);

      // Save restored data
      await this.saveDatabase();

      console.log('✅ Successfully restored from backup');
      return true;
    } catch (error) {
      console.error('❌ Failed to restore from backup:', error);
      return false;
    }
  }

  /**
   * Clean old backups, keeping only the specified number
   */
  async cleanOldBackups(keepCount = 10) {
    try {
      const backups = fs.readdirSync(this.backupDir)
        .filter(f => f.startsWith('profiles_backup_') && f.endsWith('.encrypted'))
        .sort()
        .reverse();

      if (backups.length > keepCount) {
        const toDelete = backups.slice(keepCount);
        for (const backup of toDelete) {
          fs.unlinkSync(path.join(this.backupDir, backup));
        }
        console.log(`🗑️ Cleaned ${toDelete.length} old backups`);
      }
    } catch (error) {
      console.error('⚠️ Failed to clean old backups:', error);
    }
  }

  /**
   * Get all profiles
   */
  async getAllProfiles() {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      await this.loadDatabase();
      return {
        success: true,
        profiles: this.db.profiles || []
      };
    } catch (error) {
      console.error('❌ Failed to get profiles:', error);
      return {
        success: false,
        error: error.message,
        profiles: []
      };
    }
  }

  /**
   * Get profile by ID
   */
  async getProfileById(profileId) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      await this.loadDatabase();
      const profile = this.db.profiles.find(p => p.id === profileId);
      
      return {
        success: !!profile,
        profile: profile || null
      };
    } catch (error) {
      console.error('❌ Failed to get profile:', error);
      return {
        success: false,
        error: error.message,
        profile: null
      };
    }
  }

  /**
   * Save profile (create or update)
   */
  async saveProfile(profile) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      await this.loadDatabase();

      // Create backup before modifying
      await this.createBackup();

      // Check if profile exists
      const existingIndex = this.db.profiles.findIndex(p => p.id === profile.id);

      if (existingIndex >= 0) {
        // Update existing profile
        this.db.profiles[existingIndex] = {
          ...profile,
          updatedAt: new Date().toISOString()
        };
        console.log('✏️ Updated profile:', profile.name);
      } else {
        // Add new profile
        this.db.profiles.push({
          ...profile,
          createdAt: profile.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        console.log('➕ Added new profile:', profile.name);
      }

      await this.saveDatabase();

      return {
        success: true,
        profile: profile
      };
    } catch (error) {
      console.error('❌ Failed to save profile:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Save multiple profiles (bulk operation)
   */
  async saveProfiles(profiles) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      await this.loadDatabase();

      // Create backup before modifying
      await this.createBackup();

      // Replace all profiles
      this.db.profiles = profiles.map(profile => ({
        ...profile,
        updatedAt: new Date().toISOString()
      }));

      await this.saveDatabase();

      console.log(`💾 Saved ${profiles.length} profiles`);

      return {
        success: true,
        count: profiles.length
      };
    } catch (error) {
      console.error('❌ Failed to save profiles:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete profile
   */
  async deleteProfile(profileId) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      await this.loadDatabase();

      // Create backup before deleting
      await this.createBackup();

      const initialCount = this.db.profiles.length;
      this.db.profiles = this.db.profiles.filter(p => p.id !== profileId);
      const deleted = initialCount - this.db.profiles.length;

      if (deleted > 0) {
        await this.saveDatabase();
        console.log('🗑️ Deleted profile:', profileId);
      }

      return {
        success: deleted > 0,
        deleted: deleted > 0
      };
    } catch (error) {
      console.error('❌ Failed to delete profile:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete multiple profiles
   */
  async deleteProfiles(profileIds) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      await this.loadDatabase();

      // Create backup before deleting
      await this.createBackup();

      const initialCount = this.db.profiles.length;
      this.db.profiles = this.db.profiles.filter(p => !profileIds.includes(p.id));
      const deleted = initialCount - this.db.profiles.length;

      if (deleted > 0) {
        await this.saveDatabase();
        console.log(`🗑️ Deleted ${deleted} profiles`);
      }

      return {
        success: true,
        deletedCount: deleted
      };
    } catch (error) {
      console.error('❌ Failed to delete profiles:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Export profiles to unencrypted JSON file
   */
  async exportProfiles(exportPath) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      await this.loadDatabase();

      const exportData = {
        profiles: this.db.profiles,
        exportedAt: new Date().toISOString(),
        version: this.db.metadata.version
      };

      fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2), 'utf8');

      console.log(`📤 Exported ${this.db.profiles.length} profiles to:`, exportPath);

      return {
        success: true,
        count: this.db.profiles.length,
        path: exportPath
      };
    } catch (error) {
      console.error('❌ Failed to export profiles:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Import profiles from JSON file
   */
  async importProfiles(importPath, merge = false) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const importData = JSON.parse(fs.readFileSync(importPath, 'utf8'));
      const importedProfiles = importData.profiles || [];

      if (!Array.isArray(importedProfiles)) {
        throw new Error('Invalid import file format');
      }

      await this.loadDatabase();

      // Create backup before importing
      await this.createBackup();

      if (merge) {
        // Merge with existing profiles (avoid duplicates by ID)
        const existingIds = new Set(this.db.profiles.map(p => p.id));
        const newProfiles = importedProfiles.filter(p => !existingIds.has(p.id));
        this.db.profiles.push(...newProfiles);
        console.log(`📥 Merged ${newProfiles.length} new profiles`);
      } else {
        // Replace all profiles
        this.db.profiles = importedProfiles;
        console.log(`📥 Replaced with ${importedProfiles.length} imported profiles`);
      }

      await this.saveDatabase();

      return {
        success: true,
        imported: merge ? importedProfiles.filter(p => !this.db.profiles.some(ep => ep.id === p.id)).length : importedProfiles.length,
        total: this.db.profiles.length
      };
    } catch (error) {
      console.error('❌ Failed to import profiles:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats() {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      await this.loadDatabase();

      const stats = {
        totalProfiles: this.db.profiles.length,
        storageLocation: this.storageDir,
        databaseSize: fs.existsSync(this.profilesFile) ? fs.statSync(this.profilesFile).size : 0,
        backupCount: fs.existsSync(this.backupDir) ? fs.readdirSync(this.backupDir).filter(f => f.endsWith('.encrypted')).length : 0,
        lastModified: this.db.metadata?.lastModified || 'Unknown',
        version: this.db.metadata?.version || '1.0.0'
      };

      return {
        success: true,
        stats
      };
    } catch (error) {
      console.error('❌ Failed to get storage stats:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clear all profiles (dangerous operation)
   */
  async clearAllProfiles() {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      // Create backup before clearing
      await this.createBackup();

      this.db.profiles = [];
      await this.saveDatabase();

      console.log('🗑️ All profiles cleared');

      return {
        success: true
      };
    } catch (error) {
      console.error('❌ Failed to clear profiles:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Export singleton instance
const profileStorageService = new ProfileStorageService();

module.exports = { profileStorageService };
