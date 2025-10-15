/**
 * Profile Storage Hook
 * Manages profile persistence with automatic migration from localStorage
 */

import { useState, useEffect, useCallback } from 'react';
import { Profile } from '@/components/profiles/CreateProfileModal';
import { profileStorageService } from '@/services/profileStorageService';
import { toast } from 'sonner';

export function useProfileStorage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(false);

  /**
   * Initialize storage and load profiles
   */
  const initialize = useCallback(async () => {
    try {
      setIsLoading(true);

      // Initialize storage service
      const available = await profileStorageService.initialize();
      setStorageAvailable(available);

      if (available) {
        // Check if we need to migrate from localStorage
        const localStorageProfiles = localStorage.getItem('antidetect_profiles');
        
        if (localStorageProfiles) {
          try {
            const parsed = JSON.parse(localStorageProfiles);
            
            if (Array.isArray(parsed) && parsed.length > 0) {
              console.log(`🔄 Found ${parsed.length} profiles in localStorage, migrating...`);
              
              const result = await profileStorageService.migrateFromLocalStorage(parsed);
              
              if (result.success) {
                toast.success(`Migrated ${result.migrated} profiles to secure storage`);
                
                // Clear localStorage after successful migration
                localStorage.removeItem('antidetect_profiles');
                console.log('✅ Migration complete, localStorage cleared');
              }
            }
          } catch (error) {
            console.error('❌ Migration error:', error);
          }
        }

        // Load profiles from persistent storage
        const loadedProfiles = await profileStorageService.getAllProfiles();
        setProfiles(loadedProfiles);
        console.log(`✅ Loaded ${loadedProfiles.length} profiles from storage`);
      } else {
        // Fallback to localStorage if storage not available
        console.warn('⚠️ Using localStorage fallback');
        const localStorageProfiles = localStorage.getItem('antidetect_profiles');
        
        if (localStorageProfiles) {
          try {
            const parsed = JSON.parse(localStorageProfiles);
            setProfiles(Array.isArray(parsed) ? parsed : []);
          } catch {
            setProfiles([]);
          }
        }
      }

      setIsInitialized(true);
    } catch (error) {
      console.error('❌ Failed to initialize storage:', error);
      toast.error('Failed to initialize profile storage');
      setProfiles([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Save profiles to storage
   */
  const saveProfiles = useCallback(async (newProfiles: Profile[]) => {
    setProfiles(newProfiles);

    if (storageAvailable) {
      // Save to persistent storage
      const success = await profileStorageService.saveProfiles(newProfiles);
      
      if (!success) {
        console.warn('⚠️ Failed to save to persistent storage, using localStorage fallback');
        localStorage.setItem('antidetect_profiles', JSON.stringify(newProfiles));
      }
    } else {
      // Fallback to localStorage
      localStorage.setItem('antidetect_profiles', JSON.stringify(newProfiles));
    }
  }, [storageAvailable]);

  /**
   * Add a new profile
   */
  const addProfile = useCallback(async (profile: Profile) => {
    const newProfiles = [...profiles, profile];
    await saveProfiles(newProfiles);
  }, [profiles, saveProfiles]);

  /**
   * Update an existing profile
   */
  const updateProfile = useCallback(async (updatedProfile: Profile) => {
    const newProfiles = profiles.map(p => 
      p.id === updatedProfile.id ? updatedProfile : p
    );
    await saveProfiles(newProfiles);
  }, [profiles, saveProfiles]);

  /**
   * Delete a profile
   */
  const deleteProfile = useCallback(async (profileId: string) => {
    if (storageAvailable) {
      await profileStorageService.deleteProfile(profileId);
    }
    
    const newProfiles = profiles.filter(p => p.id !== profileId);
    setProfiles(newProfiles);
    
    if (!storageAvailable) {
      localStorage.setItem('antidetect_profiles', JSON.stringify(newProfiles));
    }
  }, [profiles, storageAvailable]);

  /**
   * Delete multiple profiles
   */
  const deleteProfiles = useCallback(async (profileIds: string[]) => {
    if (storageAvailable) {
      await profileStorageService.deleteProfiles(profileIds);
    }
    
    const newProfiles = profiles.filter(p => !profileIds.includes(p.id));
    setProfiles(newProfiles);
    
    if (!storageAvailable) {
      localStorage.setItem('antidetect_profiles', JSON.stringify(newProfiles));
    }
  }, [profiles, storageAvailable]);

  /**
   * Reload profiles from storage
   */
  const reloadProfiles = useCallback(async () => {
    if (storageAvailable) {
      const loadedProfiles = await profileStorageService.getAllProfiles();
      setProfiles(loadedProfiles);
    } else {
      const localStorageProfiles = localStorage.getItem('antidetect_profiles');
      if (localStorageProfiles) {
        try {
          const parsed = JSON.parse(localStorageProfiles);
          setProfiles(Array.isArray(parsed) ? parsed : []);
        } catch {
          setProfiles([]);
        }
      }
    }
  }, [storageAvailable]);

  /**
   * Export profiles
   */
  const exportProfiles = useCallback(async () => {
    if (!storageAvailable) {
      toast.error('Export not available in web mode');
      return;
    }

    const result = await profileStorageService.exportProfiles();
    
    if (result.success) {
      toast.success(`Exported ${result.count} profiles successfully`);
    } else {
      toast.error('Failed to export profiles');
    }
  }, [storageAvailable]);

  /**
   * Import profiles
   */
  const importProfiles = useCallback(async (merge = false) => {
    if (!storageAvailable) {
      toast.error('Import not available in web mode');
      return;
    }

    const result = await profileStorageService.importProfiles(merge);
    
    if (result.success) {
      toast.success(`Imported ${result.imported} profiles successfully`);
      await reloadProfiles();
    } else {
      toast.error('Failed to import profiles');
    }
  }, [storageAvailable, reloadProfiles]);

  /**
   * Create backup
   */
  const createBackup = useCallback(async () => {
    if (!storageAvailable) {
      toast.error('Backup not available in web mode');
      return;
    }

    const success = await profileStorageService.createBackup();
    
    if (success) {
      toast.success('Backup created successfully');
    } else {
      toast.error('Failed to create backup');
    }
  }, [storageAvailable]);

  /**
   * Get storage stats
   */
  const getStorageStats = useCallback(async () => {
    if (!storageAvailable) {
      return null;
    }

    return await profileStorageService.getStorageStats();
  }, [storageAvailable]);

  /**
   * Open storage directory
   */
  const openStorageDirectory = useCallback(async () => {
    if (!storageAvailable) {
      toast.error('Storage directory not available in web mode');
      return;
    }

    const success = await profileStorageService.openStorageDirectory();
    
    if (!success) {
      toast.error('Failed to open storage directory');
    }
  }, [storageAvailable]);

  // Initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  return {
    profiles,
    setProfiles: saveProfiles,
    addProfile,
    updateProfile,
    deleteProfile,
    deleteProfiles,
    reloadProfiles,
    exportProfiles,
    importProfiles,
    createBackup,
    getStorageStats,
    openStorageDirectory,
    isLoading,
    isInitialized,
    storageAvailable
  };
}
