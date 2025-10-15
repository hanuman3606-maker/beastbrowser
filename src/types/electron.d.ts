/**
 * Electron API Type Definitions
 * Consolidated type definitions for all Electron IPC APIs
 */

import { Profile } from '@/components/profiles/CreateProfileModal';

declare global {
  interface Window {
    electronAPI?: {
      // Browser profile operations
      openProfile?: (profile: Profile) => Promise<{ success: boolean; message?: string; error?: string }>;
      closeProfile?: (profileId: string) => Promise<{ success: boolean; error?: string }>;
      closeAllProfiles?: () => Promise<{ success: boolean; closedCount?: number; error?: string }>;
      getProfileStatus?: (profileId: string) => Promise<{ id: string; isOpen: boolean; logs: any[] }>;
      
      // Proxy testing
      testProxy?: (proxyConfig: any) => Promise<{ 
        success: boolean; 
        ip?: string; 
        error?: string;
        country?: string;
        region?: string;
        city?: string;
        latitude?: number;
        longitude?: number;
        timezone?: string;
        locale?: string;
        responseTime?: number;
        testEndpoint?: string;
        testedAt?: string;
        geoData?: {
          country?: string;
          region?: string;
          city?: string;
          latitude?: number;
          longitude?: number;
          timezone?: string;
          locale?: string;
        };
      }>;
      
      // Profile logs and system info
      getProfileLogs?: (profileId: string) => Promise<any[]>;
      clearProfileLogs?: (profileId: string) => Promise<{ success: boolean }>;
      getSystemInfo?: () => Promise<any>;
      showSaveDialog?: () => Promise<any>;
      showOpenDialog?: () => Promise<any>;
      getTimezoneFromIP?: (ip: string) => Promise<{ timezone: string; country: string }>;
      
      // RPA execution
      executeRPAScript?: (profileId: string, script: any) => Promise<{ success: boolean; error?: string; message?: string }>;
      
      // Profile data management
      clearProfileData?: (profileId: string, dataTypes: string[]) => Promise<{ success: boolean; message?: string; error?: string; clearedTypes?: string[] }>;
      clearAllProfileData?: (profileId: string) => Promise<{ success: boolean; message?: string; error?: string; clearedItems?: any }>;
      getProfileDataUsage?: (profileId: string) => Promise<{ success: boolean; usage?: any; error?: string }>;
      
      // Anti-detection browser operations
      antiBrowserOpen?: (profile: Profile, options?: any) => Promise<{ success: boolean; error?: string }>;
      antiBrowserClose?: (profileId: string) => Promise<{ success: boolean; error?: string }>;
      
      // Profile storage operations (persistent local storage)
      initializeStorage?: () => Promise<{ success: boolean; storageDir?: string; error?: string }>;
      getAllProfiles?: () => Promise<{ success: boolean; profiles: Profile[]; error?: string }>;
      getProfile?: (profileId: string) => Promise<{ success: boolean; profile: Profile | null; error?: string }>;
      saveProfile?: (profile: Profile) => Promise<{ success: boolean; profile?: Profile; error?: string }>;
      saveProfiles?: (profiles: Profile[]) => Promise<{ success: boolean; count?: number; error?: string }>;
      deleteProfile?: (profileId: string) => Promise<{ success: boolean; deleted?: boolean; error?: string }>;
      deleteProfiles?: (profileIds: string[]) => Promise<{ success: boolean; deletedCount?: number; error?: string }>;
      exportProfiles?: (defaultPath?: string) => Promise<{ success: boolean; count?: number; path?: string; canceled?: boolean; error?: string }>;
      importProfiles?: (merge?: boolean) => Promise<{ success: boolean; imported?: number; total?: number; canceled?: boolean; error?: string }>;
      getStorageStats?: () => Promise<{ success: boolean; stats?: any; error?: string }>;
      createBackup?: () => Promise<{ success: boolean; message?: string; error?: string }>;
      restoreBackup?: () => Promise<{ success: boolean; message?: string; error?: string }>;
      clearAllProfiles?: () => Promise<{ success: boolean; canceled?: boolean; error?: string }>;
      migrateFromLocalStorage?: (profiles: Profile[]) => Promise<{ success: boolean; migrated?: number; existing?: number; total?: number; error?: string }>;
      openStorageDirectory?: () => Promise<{ success: boolean; error?: string }>;
      
      // Profile export/import operations (user-specific encryption for cross-device transfer)
      exportProfileSingle?: (profile: Profile, user: any) => Promise<{ success: boolean; path?: string; profileName?: string; fileSize?: number; canceled?: boolean; error?: string }>;
      exportProfileMultiple?: (profiles: Profile[], user: any) => Promise<{ success: boolean; path?: string; profileCount?: number; fileSize?: number; canceled?: boolean; error?: string }>;
      importProfile?: (user: any, existingProfiles: Profile[]) => Promise<{ success: boolean; profiles?: Profile[]; conflicts?: number; canceled?: boolean; error?: string }>;
      validateImportFile?: (filePath: string) => Promise<{ valid: boolean; format?: string; version?: string; profileCount?: number; profileNames?: string[]; timestamp?: string; error?: string }>;
      
      // Event listeners
      onProfileWindowClosed?: (callback: (event: any, profileId: string) => void) => void;
      removeAllListeners?: (channel: string) => void;
    };
  }
}

export {};
