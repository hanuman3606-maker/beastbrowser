/**
 * Profile Storage Service (Frontend)
 * Provides interface to interact with Electron's persistent profile storage
 */

import { Profile } from '@/components/profiles/CreateProfileModal';

class ProfileStorageService {
  private initialized = false;
  private storageAvailable = false;

  /**
   * Check if running in Electron environment
   */
  private isElectron(): boolean {
    return !!(window.electronAPI && typeof window.electronAPI === 'object');
  }

  /**
   * Initialize the storage service
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) {
      return this.storageAvailable;
    }

    if (!this.isElectron()) {
      console.warn('⚠️ Not running in Electron, storage features disabled');
      this.storageAvailable = false;
      this.initialized = true;
      return false;
    }

    try {
      console.log('🔧 Initializing Profile Storage Service...');
      
      if (window.electronAPI?.initializeStorage) {
        const result = await window.electronAPI.initializeStorage();
        
        if (result.success) {
          console.log('✅ Profile storage initialized');
          console.log('📂 Storage location:', result.storageDir);
          this.storageAvailable = true;
        } else {
          console.error('❌ Failed to initialize storage:', result.error);
          this.storageAvailable = false;
        }
      } else {
        console.warn('⚠️ Storage API not available');
        this.storageAvailable = false;
      }

      this.initialized = true;
      return this.storageAvailable;
    } catch (error) {
      console.error('❌ Error initializing storage:', error);
      this.storageAvailable = false;
      this.initialized = true;
      return false;
    }
  }

  /**
   * Get all profiles from persistent storage
   */
  async getAllProfiles(): Promise<Profile[]> {
    if (!this.storageAvailable) {
      await this.initialize();
    }

    if (!this.storageAvailable || !window.electronAPI?.getAllProfiles) {
      console.warn('⚠️ Storage not available, returning empty array');
      return [];
    }

    try {
      const result = await window.electronAPI.getAllProfiles();
      
      if (result.success) {
        console.log(`✅ Loaded ${result.profiles.length} profiles from storage`);
        return result.profiles;
      } else {
        console.error('❌ Failed to load profiles:', result.error);
        return [];
      }
    } catch (error) {
      console.error('❌ Error loading profiles:', error);
      return [];
    }
  }

  /**
   * Get a single profile by ID
   */
  async getProfile(profileId: string): Promise<Profile | null> {
    if (!this.storageAvailable || !window.electronAPI?.getProfile) {
      return null;
    }

    try {
      const result = await window.electronAPI.getProfile(profileId);
      return result.success ? result.profile : null;
    } catch (error) {
      console.error('❌ Error getting profile:', error);
      return null;
    }
  }

  /**
   * Save a single profile
   */
  async saveProfile(profile: Profile): Promise<boolean> {
    if (!this.storageAvailable) {
      await this.initialize();
    }

    if (!this.storageAvailable || !window.electronAPI?.saveProfile) {
      console.warn('⚠️ Storage not available, profile not saved');
      return false;
    }

    try {
      const result = await window.electronAPI.saveProfile(profile);
      
      if (result.success) {
        console.log('✅ Profile saved:', profile.name);
        return true;
      } else {
        console.error('❌ Failed to save profile:', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Error saving profile:', error);
      return false;
    }
  }

  /**
   * Save multiple profiles (bulk operation)
   */
  async saveProfiles(profiles: Profile[]): Promise<boolean> {
    if (!this.storageAvailable) {
      await this.initialize();
    }

    if (!this.storageAvailable || !window.electronAPI?.saveProfiles) {
      console.warn('⚠️ Storage not available, profiles not saved');
      return false;
    }

    try {
      const result = await window.electronAPI.saveProfiles(profiles);
      
      if (result.success) {
        console.log(`✅ Saved ${result.count} profiles`);
        return true;
      } else {
        console.error('❌ Failed to save profiles:', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Error saving profiles:', error);
      return false;
    }
  }

  /**
   * Delete a single profile
   */
  async deleteProfile(profileId: string): Promise<boolean> {
    if (!this.storageAvailable || !window.electronAPI?.deleteProfile) {
      return false;
    }

    try {
      const result = await window.electronAPI.deleteProfile(profileId);
      
      if (result.success) {
        console.log('✅ Profile deleted:', profileId);
        return true;
      } else {
        console.error('❌ Failed to delete profile:', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Error deleting profile:', error);
      return false;
    }
  }

  /**
   * Delete multiple profiles
   */
  async deleteProfiles(profileIds: string[]): Promise<number> {
    if (!this.storageAvailable || !window.electronAPI?.deleteProfiles) {
      return 0;
    }

    try {
      const result = await window.electronAPI.deleteProfiles(profileIds);
      
      if (result.success) {
        console.log(`✅ Deleted ${result.deletedCount} profiles`);
        return result.deletedCount || 0;
      } else {
        console.error('❌ Failed to delete profiles:', result.error);
        return 0;
      }
    } catch (error) {
      console.error('❌ Error deleting profiles:', error);
      return 0;
    }
  }

  /**
   * Export profiles to JSON file
   */
  async exportProfiles(defaultPath?: string): Promise<{ success: boolean; count?: number; path?: string }> {
    if (!this.storageAvailable || !window.electronAPI?.exportProfiles) {
      return { success: false };
    }

    try {
      const result = await window.electronAPI.exportProfiles(defaultPath);
      
      if (result.success) {
        console.log(`✅ Exported ${result.count} profiles to:`, result.path);
      } else if (!result.canceled) {
        console.error('❌ Failed to export profiles:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error exporting profiles:', error);
      return { success: false };
    }
  }

  /**
   * Import profiles from JSON file
   */
  async importProfiles(merge = false): Promise<{ success: boolean; imported?: number; total?: number }> {
    if (!this.storageAvailable || !window.electronAPI?.importProfiles) {
      return { success: false };
    }

    try {
      const result = await window.electronAPI.importProfiles(merge);
      
      if (result.success) {
        console.log(`✅ Imported ${result.imported} profiles (total: ${result.total})`);
      } else if (!result.canceled) {
        console.error('❌ Failed to import profiles:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error importing profiles:', error);
      return { success: false };
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<any> {
    if (!this.storageAvailable || !window.electronAPI?.getStorageStats) {
      return null;
    }

    try {
      const result = await window.electronAPI.getStorageStats();
      return result.success ? result.stats : null;
    } catch (error) {
      console.error('❌ Error getting storage stats:', error);
      return null;
    }
  }

  /**
   * Create a backup of current profiles
   */
  async createBackup(): Promise<boolean> {
    if (!this.storageAvailable || !window.electronAPI?.createBackup) {
      return false;
    }

    try {
      const result = await window.electronAPI.createBackup();
      
      if (result.success) {
        console.log('✅ Backup created successfully');
      } else {
        console.error('❌ Failed to create backup:', result.error);
      }
      
      return result.success;
    } catch (error) {
      console.error('❌ Error creating backup:', error);
      return false;
    }
  }

  /**
   * Restore from latest backup
   */
  async restoreBackup(): Promise<boolean> {
    if (!this.storageAvailable || !window.electronAPI?.restoreBackup) {
      return false;
    }

    try {
      const result = await window.electronAPI.restoreBackup();
      
      if (result.success) {
        console.log('✅ Restored from backup successfully');
      } else {
        console.error('❌ Failed to restore backup:', result.message);
      }
      
      return result.success;
    } catch (error) {
      console.error('❌ Error restoring backup:', error);
      return false;
    }
  }

  /**
   * Clear all profiles (dangerous operation)
   */
  async clearAllProfiles(): Promise<boolean> {
    if (!this.storageAvailable || !window.electronAPI?.clearAllProfiles) {
      return false;
    }

    try {
      const result = await window.electronAPI.clearAllProfiles();
      
      if (result.success) {
        console.log('✅ All profiles cleared');
      } else if (!result.canceled) {
        console.error('❌ Failed to clear profiles:', result.error);
      }
      
      return result.success;
    } catch (error) {
      console.error('❌ Error clearing profiles:', error);
      return false;
    }
  }

  /**
   * Migrate profiles from localStorage to persistent storage
   */
  async migrateFromLocalStorage(profiles: Profile[]): Promise<{ success: boolean; migrated: number; total: number }> {
    if (!this.storageAvailable) {
      await this.initialize();
    }

    if (!this.storageAvailable || !window.electronAPI?.migrateFromLocalStorage) {
      console.warn('⚠️ Storage not available, migration skipped');
      return { success: false, migrated: 0, total: 0 };
    }

    try {
      const result = await window.electronAPI.migrateFromLocalStorage(profiles);
      
      if (result.success) {
        console.log(`✅ Migration complete: ${result.migrated} new, ${result.existing} existing, ${result.total} total`);
      } else {
        console.error('❌ Migration failed:', result.error);
      }
      
      return {
        success: result.success,
        migrated: result.migrated || 0,
        total: result.total || 0
      };
    } catch (error) {
      console.error('❌ Error during migration:', error);
      return { success: false, migrated: 0, total: 0 };
    }
  }

  /**
   * Open storage directory in file explorer
   */
  async openStorageDirectory(): Promise<boolean> {
    if (!this.storageAvailable || !window.electronAPI?.openStorageDirectory) {
      return false;
    }

    try {
      const result = await window.electronAPI.openStorageDirectory();
      return result.success;
    } catch (error) {
      console.error('❌ Error opening storage directory:', error);
      return false;
    }
  }

  /**
   * Check if storage is available
   */
  isStorageAvailable(): boolean {
    return this.storageAvailable;
  }
}

// Export singleton instance
export const profileStorageService = new ProfileStorageService();
