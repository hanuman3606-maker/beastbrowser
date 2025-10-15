/**
 * Chrome 139 Runtime Service
 * 
 * Frontend service for managing Chrome 139 runtime operations
 * 
 * @author Beast Browser Team
 */

declare global {
  interface Window {
    electron: {
      invoke: (channel: string, ...args: any[]) => Promise<any>;
    };
  }
}

export interface RuntimeInfo {
  available: boolean;
  path: string | null;
  version: number | null;
  supportsFingerprint: boolean;
  supportsGPUFlags: boolean;
}

export interface ProfileLaunchConfig {
  id: string;
  userDataDir?: string;
  fingerprintSeed?: number;
  platform?: string;
  platformVersion?: string;
  brand?: string;
  brandVersion?: string;
  hardwareConcurrency?: number;
  gpuVendor?: string;
  gpuRenderer?: string;
  timezone?: string;
  lang?: string;
  acceptLang?: string;
  useBuiltinProxy?: boolean;
  proxy?: {
    type: string;
    host: string;
    port: number;
    username?: string;
    password?: string;
  };
  disableNonProxiedUdp?: boolean;
  windowWidth?: number;
  windowHeight?: number;
  startUrl?: string;
}

export interface LaunchResult {
  success: boolean;
  pid?: number;
  logPath?: string;
  args?: string[];
  error?: string;
  faulty?: boolean;
}

export interface ProfileInfo {
  pid: number;
  logPath: string;
  startTime: number;
  runtime: number;
}

class Chrome139RuntimeService {
  /**
   * Get Chrome 139 runtime information
   */
  async getRuntimeInfo(): Promise<RuntimeInfo> {
    try {
      return await window.electron.invoke('chrome139:getRuntimeInfo');
    } catch (error) {
      console.error('Failed to get runtime info:', error);
      return {
        available: false,
        path: null,
        version: null,
        supportsFingerprint: false,
        supportsGPUFlags: false
      };
    }
  }

  /**
   * Launch profile with Chrome 139
   */
  async launchProfile(config: ProfileLaunchConfig): Promise<LaunchResult> {
    try {
      return await window.electron.invoke('chrome139:launchProfile', config);
    } catch (error: any) {
      console.error('Failed to launch profile:', error);
      return {
        success: false,
        error: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Close profile
   */
  async closeProfile(profileId: string): Promise<{ success: boolean; error?: string }> {
    try {
      return await window.electron.invoke('chrome139:closeProfile', profileId);
    } catch (error: any) {
      console.error('Failed to close profile:', error);
      return {
        success: false,
        error: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Get active profiles
   */
  async getActiveProfiles(): Promise<string[]> {
    try {
      return await window.electron.invoke('chrome139:getActiveProfiles');
    } catch (error) {
      console.error('Failed to get active profiles:', error);
      return [];
    }
  }

  /**
   * Get profile info
   */
  async getProfileInfo(profileId: string): Promise<ProfileInfo | null> {
    try {
      return await window.electron.invoke('chrome139:getProfileInfo', profileId);
    } catch (error) {
      console.error('Failed to get profile info:', error);
      return null;
    }
  }

  /**
   * Close all Chrome 139 profiles
   */
  async closeAll(): Promise<{ success: boolean; closed: number; failed: number }> {
    try {
      return await window.electron.invoke('chrome139:closeAll');
    } catch (error) {
      console.error('Failed to close all profiles:', error);
      return { success: false, closed: 0, failed: 0 };
    }
  }
}

export const chrome139RuntimeService = new Chrome139RuntimeService();
