import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, CheckCircle, Play, Square, Edit, Trash2, TestTube, Plus, Bot, Copy, Monitor, Smartphone, Tablet, Globe, Link, PlayCircle, RefreshCw, Database, Cookie, History, HardDrive, Cpu, Loader2, Settings, Fingerprint, Shield, Clipboard, Upload, Download } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import CreateProfileModal, { Profile } from './CreateProfileModal';
import ProfilePanel from './ProfilePanel';
import CreateProfilePanel from './CreateProfilePanel';
import { toast } from 'sonner';
import { proxyService } from '@/services/proxyService';
import { rpaService } from '@/services/rpaService';
import { settingsService } from '@/services/settingsService';
import { userAgentLoader } from '@/lib/useragent-loader';
import { getRandomFingerprint } from '@/data/fingerprints';
import { useAuth } from '@/contexts/AuthContext';
import UsageGuard from '@/components/billing/UsageGuard';

// RPA Script interface (matching RPAScriptBuilder)
interface RPAScript {
  id: string;
  name: string;
  description: string;
  websiteUrl: string;
  executionTime: number; // in minutes
  scriptType: 'javascript' | 'custom' | 'template';
  scriptContent: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  executionCount: number;
  lastExecuted?: string;
}

// Service RPA Script interface (from rpaService)
interface ServiceRPAScript {
  id: string;
  name: string;
  description: string;
  category: 'social' | 'ecommerce' | 'data' | 'automation';
  icon: string;
  code: string;
  isRunning?: boolean;
  lastRun?: Date;
  isFromEnhancedRPA?: boolean;
}

// Convert service script to our script format
const convertServiceScriptToScript = (serviceScript: ServiceRPAScript): RPAScript => {
  return {
    id: serviceScript.id,
    name: serviceScript.name,
    description: serviceScript.description,
    websiteUrl: '',
    executionTime: 5,
    scriptType: 'javascript',
    scriptContent: serviceScript.code,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isActive: true,
    executionCount: 0,
    lastExecuted: serviceScript.lastRun ? (typeof serviceScript.lastRun === 'string' ? serviceScript.lastRun : serviceScript.lastRun.toISOString()) : undefined
  };
};

interface ProfileManagerProps {
  profiles: Profile[];
  onProfilesChange: (profiles: Profile[]) => void;
}

interface RPAExecution {
  profileId: string;
  scriptId: string;
  status: 'running' | 'stopped' | 'paused';
  startTime: Date;
  closeAfterCompletion: boolean;
  openedViaRPA: boolean;
}

interface BulkCreateSettings {
  count: number;
  selectedPlatforms: string[];
  proxyType: 'none' | 'saved' | 'http' | 'https' | 'socks5';
  selectedSavedProxy: string;
  namePrefix: string;
  startingUrl: string;
  randomizeFingerprints: boolean;
  bulkProxyInput: string;
  browserType: 'beast' | 'anti';
}

const availablePlatforms = [
  { id: 'windows', name: 'Windows', icon: '🪟' },
  { id: 'macos', name: 'macOS', icon: '🍎' },
  { id: 'linux', name: 'Linux', icon: '🐧' },
  { id: 'android', name: 'Android', icon: '📱' },
  { id: 'ios', name: 'iOS', icon: '📱' },
  { id: 'tv', name: 'TV', icon: '📺' }
];

export const ProfileManager: React.FC<ProfileManagerProps> = ({ profiles, onProfilesChange }) => {
  const { currentUser } = useAuth();
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isProfilePanelOpen, setIsProfilePanelOpen] = useState(false);
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
  const [isBulkCreateOpen, setIsBulkCreateOpen] = useState(false);
  const [testResults, setTestResults] = useState<Map<string, any>>(new Map());
  const [profileStatuses, setProfileStatuses] = useState<Map<string, any>>(new Map());
  const [showRPAModal, setShowRPAModal] = useState(false);
  const [isRPAModalOpen, setIsRPAModalOpen] = useState(false);
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [selectedRPAScript, setSelectedRPAScript] = useState('');
  const [rpaExecutions, setRpaExecutions] = useState<RPAExecution[]>([]);
  const [availableRPAScripts, setAvailableRPAScripts] = useState<RPAScript[]>([]);
  const [savedProxies, setSavedProxies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [rpaOpenedProfiles, setRpaOpenedProfiles] = useState<Set<string>>(new Set());
  const [closeAfterCompletion, setCloseAfterCompletion] = useState(true);
  const [currentActiveThreads, setCurrentActiveThreads] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [profilesPerPage, setProfilesPerPage] = useState(50); // Make it configurable

  // NEW: Cache clearing states
  const [clearingProfiles, setClearingProfiles] = useState<Set<string>>(new Set());
  const [showDataClearModal, setShowDataClearModal] = useState(false);
  const [selectedProfileForClear, setSelectedProfileForClear] = useState<Profile | null>(null);
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>(['cache', 'cookies']);

  // Missing state variables
  const [isTesting, setIsTesting] = useState<Set<string>>(new Set());
  const [isCreatingBulk, setIsCreatingBulk] = useState(false);

  // Bulk create settings
  const [bulkSettings, setBulkSettings] = useState<BulkCreateSettings>({
    count: 5,
    selectedPlatforms: ['windows'],
    proxyType: 'none',
    selectedSavedProxy: '',
    namePrefix: 'Profile',
    startingUrl: '',
    randomizeFingerprints: true,
    bulkProxyInput: '',
    browserType: 'anti'
  });

  // Form state for profile editing - REMOVED TIMEZONE FIELD
  const [formData, setFormData] = useState<Partial<Profile>>({
    name: '',
    proxyType: 'none',
    startingUrl: '',
    notes: ''
  });
  const [formErrors, setFormErrors] = useState<string[]>([]);

  // Platform device metrics for UI display
  const getPlatformDisplayInfo = (platform: string) => {
    const platformInfo = {
      android: { name: 'Android', viewport: '390×844', type: 'Mobile' },
      ios: { name: 'iOS', viewport: '430×932', type: 'Mobile' },
      tv: { name: 'TV', viewport: '1920×1080', type: 'Smart TV' },
      windows: { name: 'Windows', viewport: '1366×768', type: 'Desktop' },
      macos: { name: 'macOS', viewport: '1440×900', type: 'Desktop' },
      linux: { name: 'Linux', viewport: '1366×768', type: 'Desktop' }
    };
    return platformInfo[platform] || platformInfo.windows;
  };

  // NEW: Cache clearing functions
  const handleClearCache = async (profile: Profile) => {
    if (!window.electronAPI?.clearProfileData) {
      toast.error('Cache clearing not available in web mode');
      return;
    }

    setClearingProfiles(prev => new Set([...prev, profile.id]));
    
    try {
      const result = await window.electronAPI.clearProfileData(profile.id, ['cache']);
      
      if (result.success) {
        toast.success(`Cache cleared for profile "${profile.name}"`);
      } else {
        toast.error(`Failed to clear cache: ${result.error}`);
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
      toast.error('Failed to clear cache');
    } finally {
      setClearingProfiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(profile.id);
        return newSet;
      });
    }
  };

  const handleClearCookies = async (profile: Profile) => {
    if (!window.electronAPI?.clearProfileData) {
      toast.error('Cookie clearing not available in web mode');
      return;
    }

    setClearingProfiles(prev => new Set([...prev, profile.id]));
    
    try {
      const result = await window.electronAPI.clearProfileData(profile.id, ['cookies']);
      
      if (result.success) {
        toast.success(`Cookies cleared for profile "${profile.name}"`);
      } else {
        toast.error(`Failed to clear cookies: ${result.error}`);
      }
    } catch (error) {
      console.error('Error clearing cookies:', error);
      toast.error('Failed to clear cookies');
    } finally {
      setClearingProfiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(profile.id);
        return newSet;
      });
    }
  };

  const handleClearHistory = async (profile: Profile) => {
    if (!window.electronAPI?.clearProfileData) {
      toast.error('History clearing not available in web mode');
      return;
    }

    setClearingProfiles(prev => new Set([...prev, profile.id]));
    
    try {
      const result = await window.electronAPI.clearProfileData(profile.id, ['history']);
      
      if (result.success) {
        toast.success(`History cleared for profile "${profile.name}"`);
      } else {
        toast.error(`Failed to clear history: ${result.error}`);
      }
    } catch (error) {
      console.error('Error clearing history:', error);
      toast.error('Failed to clear history');
    } finally {
      setClearingProfiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(profile.id);
        return newSet;
      });
    }
  };

  const handleClearAllData = async (profile: Profile) => {
    if (!window.electronAPI?.clearAllProfileData) {
      toast.error('Data clearing not available in web mode');
      return;
    }

    if (!confirm(`Are you sure you want to clear ALL browsing data for profile "${profile.name}"? This will clear cache, cookies, history, downloads, and form data.`)) {
      return;
    }

    setClearingProfiles(prev => new Set([...prev, profile.id]));
    
    try {
      const result = await window.electronAPI.clearAllProfileData(profile.id);
      
      if (result.success) {
        toast.success(`All browsing data cleared for profile "${profile.name}"`);
        if (result.clearedItems) {
          console.log('Cleared items:', result.clearedItems);
        }
      } else {
        toast.error(`Failed to clear data: ${result.error}`);
      }
    } catch (error) {
      console.error('Error clearing all data:', error);
      toast.error('Failed to clear all data');
    } finally {
      setClearingProfiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(profile.id);
        return newSet;
      });
    }
  };

  const handleOpenDataClearModal = (profile: Profile) => {
    setSelectedProfileForClear(profile);
    setSelectedDataTypes(['cache', 'cookies']); // Default selection
    setShowDataClearModal(true);
  };

  const handleClearSelectedData = async () => {
    if (!selectedProfileForClear || !window.electronAPI?.clearProfileData) {
      toast.error('Data clearing not available');
      return;
    }

    if (selectedDataTypes.length === 0) {
      toast.error('Please select at least one data type to clear');
      return;
    }

    setClearingProfiles(prev => new Set([...prev, selectedProfileForClear.id]));
    
    try {
      const result = await window.electronAPI.clearProfileData(selectedProfileForClear.id, selectedDataTypes);
      
      if (result.success) {
        toast.success(`Cleared ${selectedDataTypes.join(', ')} for profile "${selectedProfileForClear.name}"`);
        setShowDataClearModal(false);
      } else {
        toast.error(`Failed to clear data: ${result.error}`);
      }
    } catch (error) {
      console.error('Error clearing selected data:', error);
      toast.error('Failed to clear selected data');
    } finally {
      setClearingProfiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(selectedProfileForClear.id);
        return newSet;
      });
    }
  };

  const handleGetDataUsage = async (profile: Profile) => {
    if (!window.electronAPI?.getProfileDataUsage) {
      toast.error('Data usage info not available in web mode');
      return;
    }

    try {
      const result = await window.electronAPI.getProfileDataUsage(profile.id);
      
      if (result.success && result.usage) {
        const usage = result.usage;
        toast.info(`Profile "${profile.name}" data usage:\nCookies: ${usage.cookies}\nStorage size: ${usage.storageSize} bytes\nLast accessed: ${new Date(usage.lastAccessed).toLocaleString()}`);
      } else {
        toast.error(`Failed to get data usage: ${result.error}`);
      }
    } catch (error) {
      console.error('Error getting data usage:', error);
      toast.error('Failed to get data usage');
    }
  };

  // Pagination logic - moved outside function to be available in component scope
  const safeProfiles = Array.isArray(profiles) ? profiles : [];
  const totalPages = Math.ceil(safeProfiles.length / profilesPerPage);
  const startIndex = (currentPage - 1) * profilesPerPage;
  const endIndex = startIndex + profilesPerPage;
  const paginatedProfiles = safeProfiles.slice(startIndex, endIndex);

  // Memoized update function to prevent infinite loops
  const updateProfileStatuses = useCallback(async () => {
    if (isLoading) return; // Prevent multiple simultaneous updates
    
    console.log('🔄 STATUS UPDATE: Starting status sync for', profiles.length, 'profiles');
    const newStatuses = new Map<string, any>();
    const statusMismatches: { profileId: string; profileName: string; electronStatus: boolean; reactStatus: boolean }[] = [];
    
    // Update statuses for all profiles
    for (const profile of safeProfiles) {
      try {
        // Check if Electron API is available
        if (window.electronAPI?.getProfileStatus) {
          const status = await window.electronAPI.getProfileStatus(profile.id);
          newStatuses.set(profile.id, {
            isOpen: status.isOpen,
            isRunning: rpaExecutions.some(exec => exec.profileId === profile.id && exec.status === 'running')
          });
          
          // CRITICAL: Detect and track status mismatches
          if (status.isOpen !== profile.isActive) {
            statusMismatches.push({
              profileId: profile.id,
              profileName: profile.name,
              electronStatus: status.isOpen,
              reactStatus: profile.isActive
            });
          }
        } else {
          // Fallback for web mode
          const isRunning = rpaExecutions.some(exec => exec.profileId === profile.id && exec.status === 'running');
          newStatuses.set(profile.id, {
            isOpen: profile.isActive,
            isRunning: isRunning
          });
        }
      } catch (error) {
        console.warn(`🔄 STATUS UPDATE: Failed to get status for profile ${profile.id}:`, error);
        const isRunning = rpaExecutions.some(exec => exec.profileId === profile.id && exec.status === 'running');
        newStatuses.set(profile.id, {
          isOpen: profile.isActive,
          isRunning: isRunning
        });
      }
    }
    
    // CRITICAL: Fix status mismatches by updating React state to match Electron
    if (statusMismatches.length > 0) {
      console.log('🔄 STATUS UPDATE: Found', statusMismatches.length, 'status mismatches, fixing...');
      statusMismatches.forEach(mismatch => {
        console.log(`🔄 STATUS SYNC: ${mismatch.profileName} - Electron: ${mismatch.electronStatus}, React: ${mismatch.reactStatus}`);
      });
      
      // Update all mismatched profiles in a single state update
      const updatedProfiles = safeProfiles.map(profile => {
        const mismatch = statusMismatches.find(m => m.profileId === profile.id);
        if (mismatch) {
          return { ...profile, isActive: mismatch.electronStatus };
        }
        return profile;
      });
      
      onProfilesChange(updatedProfiles);
      console.log('🔄 STATUS UPDATE: Fixed', statusMismatches.length, 'status mismatches');
    }
    
    setProfileStatuses(newStatuses);
    console.log('🔄 STATUS UPDATE: Completed status sync');
  }, [profiles, rpaExecutions, isLoading, onProfilesChange]);

  // Refresh RPA scripts function
  const refreshRPAScripts = useCallback(() => {
    try {
      console.log('🔄 Refreshing RPA scripts...');
      const latestScripts = rpaService.getAllScripts();
      setAvailableRPAScripts(latestScripts.map(convertServiceScriptToScript));
      console.log('✅ RPA scripts refreshed, found:', latestScripts.length, 'scripts');
    } catch (error) {
      console.warn('Failed to refresh RPA scripts:', error);
      setAvailableRPAScripts([]);
    }
  }, []);

  useEffect(() => {
    // Load profiles from localStorage only once on mount
    const savedProfiles = localStorage.getItem('antidetect_profiles');
    if (savedProfiles) {
      try {
        const parsedProfiles = JSON.parse(savedProfiles);
        if (Array.isArray(parsedProfiles) && parsedProfiles.length > 0) {
          onProfilesChange(parsedProfiles);
        }
      } catch (error) {
        console.error('Failed to load profiles:', error);
        onProfilesChange([]);
      }
    }

    // Load saved proxies using service
    try {
      setSavedProxies(proxyService.getSavedProxies());
    } catch (error) {
      console.warn('Failed to load saved proxies:', error);
      setSavedProxies([]);
    }

    // Load RPA scripts DIRECTLY from localStorage (not from rpaService)
    try {
      console.log('🔄 Loading RPA scripts during component initialization...');
      
      // ALWAYS load directly from localStorage to preserve all fields
      const savedScripts = localStorage.getItem('antidetect_rpa_scripts');
      if (savedScripts) {
        const parsed = JSON.parse(savedScripts);
        console.log('📊 Direct localStorage load: Found', parsed.length, 'scripts');
        console.log('📝 Script details:', parsed.map((s: RPAScript) => ({
          name: s.name,
          hasUrl: !!s.websiteUrl,
          url: s.websiteUrl,
          hasContent: !!s.scriptContent,
          contentLength: s.scriptContent?.length || 0
        })));
        setAvailableRPAScripts(parsed);
      } else {
        console.log('⚠️ No scripts in localStorage');
        setAvailableRPAScripts([]);
      }
    } catch (error) {
      console.warn('Failed to load RPA scripts:', error);
      setAvailableRPAScripts([]);
    }

    // Listen for RPA script updates from RPA Dashboard
    const handleRPAScriptsUpdate = () => {
      console.log('🔄 RPA scripts updated event received - refreshing...');
      // Force reload directly from localStorage
      try {
        const savedScripts = localStorage.getItem('antidetect_rpa_scripts');
        if (savedScripts) {
          const parsed = JSON.parse(savedScripts);
          console.log('✅ Event handler: Loaded', parsed.length, 'scripts from localStorage');
          console.log('📝 Updated script details:', parsed.map((s: RPAScript) => ({
            name: s.name,
            hasUrl: !!s.websiteUrl,
            hasContent: !!s.scriptContent
          })));
          setAvailableRPAScripts(parsed);
        } else {
          console.log('⚠️ Event handler: No scripts in localStorage');
          setAvailableRPAScripts([]);
        }
      } catch (error) {
        console.error('Event handler failed:', error);
        setAvailableRPAScripts([]);
      }
    };
    
    window.addEventListener('rpa-scripts-updated', handleRPAScriptsUpdate);

    // Listen for profile window close events from Electron
    if (window.electronAPI?.onProfileWindowClosed) {
      window.electronAPI.onProfileWindowClosed((event, profileId) => {
        console.log('🔴 WINDOW CLOSED: Profile window closed event received for:', profileId);
        
        // When a profile window is manually closed, ONLY update the isActive status
        // DO NOT delete the profile from the state - profiles should persist
        const closedProfile = safeProfiles.find(p => p.id === profileId);
        
        if (closedProfile) {
            console.log(`WINDOW CLOSED: Updating status for profile "${closedProfile.name}" (${profileId})`);
          
          // CRITICAL: Only update the specific profile that was closed
          const updatedProfiles = safeProfiles.map(p => 
            p.id === profileId ? { ...p, isActive: false } : p
          );
          onProfilesChange(updatedProfiles);
          
          // Remove from RPA-opened profiles if it was opened via RPA
          setRpaOpenedProfiles(prev => {
            const newSet = new Set(prev);
            newSet.delete(profileId);
            return newSet;
          });
          
          // Stop any running RPA executions for this profile
          setRpaExecutions(prev => prev.filter(exec => exec.profileId !== profileId));
          
          toast.info(`Profile "${closedProfile.name}" browser window closed - profile saved in dashboard`);
          console.log(`🔴 WINDOW CLOSED: Successfully handled close event for "${closedProfile.name}"`);
        } else {
          console.warn('🔴 WINDOW CLOSED: Profile not found for ID:', profileId);
        }
      });
    }

    // Cleanup listeners on unmount
    return () => {
      window.removeEventListener('rpa-scripts-updated', handleRPAScriptsUpdate);
      if (window.electronAPI?.removeAllListeners) {
        window.electronAPI.removeAllListeners('profile-window-closed');
      }
    };
  }, []); // Empty dependency array - run only once on mount

  useEffect(() => {
    // Update profile statuses with a more aggressive interval for better sync
    const interval = setInterval(updateProfileStatuses, 3000); // Reduced to 3000ms for better responsiveness
    return () => clearInterval(interval);
  }, [updateProfileStatuses]);

  // Add effect to listen for RPA script changes in localStorage
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'antidetect_rpa_scripts') {
        console.log('🔄 RPA scripts updated in localStorage, refreshing...');
        refreshRPAScripts();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [refreshRPAScripts]);

  // Debounced save to localStorage
  useEffect(() => {
    if (Array.isArray(profiles) && profiles.length > 0) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem('antidetect_profiles', JSON.stringify(profiles));
      }, 500); // Debounce saves
      
      return () => clearTimeout(timeoutId);
    }
  }, [profiles]);

  const loadUserAgent = async (platform: string): Promise<string> => {
    try {
      // Use the UserAgentLoader service
      const userAgents = await userAgentLoader.loadUserAgents(platform as any);
      if (userAgents && userAgents.length > 0) {
        return userAgents[Math.floor(Math.random() * userAgents.length)];
      }
    } catch (error) {
      console.warn(`Failed to load user agents for ${platform}:`, error);
    }

    // Return fallback user agent using the service
    return userAgentLoader.getRandomUserAgent(platform as any);
  };


  const parseBulkProxyInput = (input: string) => {
    const lines = input.trim().split('\n').filter(line => line.trim());
    const proxies: any[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      try {
        // Support multiple formats:
        // host:port
        // host:port:username:password
        // protocol://username:password@host:port
        // username:password@host:port
        
        if (trimmed.includes('://')) {
          const url = new URL(trimmed);
          proxies.push({
            host: url.hostname,
            port: url.port || (url.protocol === 'https:' ? '443' : '80'),
            username: url.username || undefined,
            password: url.password || undefined
          });
        } else if (trimmed.includes('@')) {
          const [auth, hostPort] = trimmed.split('@');
          const [username, password] = auth.split(':');
          const [host, port] = hostPort.split(':');
          proxies.push({ host, port, username, password });
        } else {
          const parts = trimmed.split(':');
          if (parts.length >= 2) {
            const [host, port, username, password] = parts;
            proxies.push({
              host,
              port,
              username: username || undefined,
              password: password || undefined
            });
          }
        }
      } catch (error) {
        console.warn(`Failed to parse proxy line: ${line}`, error);
      }
    }
    
    return proxies;
  };

  // Update the handleCreateProfile function to check usage limits
  const handleCreateProfile = () => {
    if (!currentUser) {
      toast.error('You must be logged in to create profiles');
      return;
    }
    
    // Check if user has permission to create more profiles
    // This will be handled by the UsageGuard wrapper in the UI
    setIsCreatePanelOpen(true);
  };

  // Wrapped version that checks usage limits
  const handleCreateProfileWithUsageCheck = () => {
    if (!currentUser) return;
    
    // This will be handled by the UsageGuard wrapper
    handleCreateProfile();
  };

  const handleBulkCreate = async () => {
    setIsCreatingBulk(true);
    await handleBulkCreateProfiles();
    setIsCreatingBulk(false);
  };

  // Generate random fingerprint function
  // NOTE: userAgent is NOT included here - it will be generated by Electron for uniqueness
  const generateRandomFingerprint = (platform: string) => {
    const resolutions = {
      windows: [
        { width: 1920, height: 1080 },
        { width: 1366, height: 768 },
        { width: 1440, height: 900 },
        { width: 1536, height: 864 },
        { width: 1280, height: 720 }
      ],
      macos: [
        { width: 1440, height: 900 },
        { width: 1680, height: 1050 },
        { width: 1920, height: 1080 }
      ],
      linux: [
        { width: 1920, height: 1080 },
        { width: 1366, height: 768 },
        { width: 2560, height: 1440 }
      ],
      android: [
        { width: 414, height: 915 },
        { width: 393, height: 851 },
        { width: 412, height: 915 }
      ],
      ios: [
        { width: 414, height: 896 },
        { width: 375, height: 812 },
        { width: 428, height: 926 }
      ],
      tv: [
        { width: 1920, height: 1080 },
        { width: 3840, height: 2160 },
        { width: 1366, height: 768 }
      ]
    };

    const platformResolutions = resolutions[platform as keyof typeof resolutions] || resolutions.windows;
    const resolution = platformResolutions[Math.floor(Math.random() * platformResolutions.length)];
    const languages = ['en-US', 'en-GB', 'de-DE', 'fr-FR', 'es-ES', 'ja-JP', 'ko-KR', 'zh-CN'];
    const randomLanguage = languages[Math.floor(Math.random() * languages.length)];

    return {
      // userAgent will be set by Electron main process for uniqueness
      screen: resolution,
      timezone: 'auto',
      navigator: {
        platform: platform === 'windows' ? 'Win32' : platform === 'macos' ? 'MacIntel' : platform === 'linux' ? 'Linux x86_64' : platform,
        language: randomLanguage,
        hardwareConcurrency: Math.floor(Math.random() * 8) + 2,
        deviceMemory: [2, 4, 8, 16][Math.floor(Math.random() * 4)]
      },
      canvas: Math.random().toString(36).substring(7),
      webgl: Math.random().toString(36).substring(7),
      audio: Math.random().toString(36).substring(7)
    };
  };

  const handleBulkCreateProfiles = async () => {
    if (bulkSettings.selectedPlatforms.length === 0) {
      toast.error('Please select at least one platform');
      return;
    }

    if (bulkSettings.count < 1) {
      toast.error('Profile count must be at least 1');
      return;
    }

    setIsLoading(true);
    try {
      const newProfiles: Profile[] = [];
      const settings = settingsService.getSettings();
      
      // Parse bulk proxy input if provided
      let bulkProxies: any[] = [];
      if (bulkSettings.proxyType !== 'none' && bulkSettings.proxyType !== 'saved' && bulkSettings.bulkProxyInput.trim()) {
        bulkProxies = parseBulkProxyInput(bulkSettings.bulkProxyInput);
        if (bulkProxies.length === 0) {
          toast.error('No valid proxies found in the input. Please check the format.');
          setIsLoading(false);
          return;
        }
      }
      
      // Create profiles in smaller batches to prevent UI freezing
      const batchSize = 5;
      for (let batch = 0; batch < Math.ceil(bulkSettings.count / batchSize); batch++) {
        const batchStart = batch * batchSize;
        const batchEnd = Math.min(batchStart + batchSize, bulkSettings.count);
        
        for (let i = batchStart; i < batchEnd; i++) {
          const platform = bulkSettings.selectedPlatforms[i % bulkSettings.selectedPlatforms.length];
          // DON'T pre-assign user agent - let Electron assign unique ones on launch
          
          // Generate random fingerprint if enabled
          let fingerprint;
          if (bulkSettings.randomizeFingerprints) {
            fingerprint = generateRandomFingerprint(platform);
          } else {
            // Use basic fingerprint - timezone will be auto-detected from proxy IP
            fingerprint = {
              screen: { width: 1920, height: 1080 },
              timezone: 'auto', // This will be auto-detected from proxy IP
              navigator: {
                platform: platform === 'windows' ? 'Win32' : platform === 'macos' ? 'MacIntel' : platform,
                language: 'en-US',
                hardwareConcurrency: 4,
                deviceMemory: 8
              },
              canvas: 'default',
              webgl: 'default',
              audio: 'default'
            };
          }
          
          // Handle proxy configuration - timezone will be auto-detected
          let proxyConfig;
          
          if (bulkSettings.proxyType === 'saved' && bulkSettings.selectedSavedProxy) {
            const savedProxy = savedProxies.find(p => p.id === bulkSettings.selectedSavedProxy);
            if (savedProxy) {
              proxyConfig = {
                host: savedProxy.host,
                port: savedProxy.port.toString(),
                username: savedProxy.username,
                password: savedProxy.password
              };
            }
          } else if (bulkSettings.proxyType !== 'none' && bulkProxies.length > 0) {
            // Use bulk proxy input - rotate through available proxies
            const proxyIndex = i % bulkProxies.length;
            const bulkProxy = bulkProxies[proxyIndex];
            proxyConfig = {
              host: bulkProxy.host,
              port: bulkProxy.port.toString(),
              username: bulkProxy.username,
              password: bulkProxy.password
            };
          }

          const profile: Profile = {
            id: `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // More unique ID
            name: `${bulkSettings.namePrefix} ${safeProfiles.length + i + 1}`,  // Start from existing count + 1
            browserType: 'anti',
            platform: platform, // FIXED: Add platform field for proper size detection
            proxy: proxyConfig,
            proxyType: bulkSettings.proxyType === 'saved' ? 
              (savedProxies.find(p => p.id === bulkSettings.selectedSavedProxy)?.type?.toLowerCase() || 'http') : 
              bulkSettings.proxyType,
            // DON'T set userAgent here - let Electron assign unique ones
            userAgentPlatform: platform,
            timezone: 'auto', // CHANGED: Always use auto-detection from proxy IP
            locale: settingsService.getDefaultLocale(),
            fingerprint,
            randomFingerprint: true, // Force Electron to generate unique fingerprint on launch
            tags: ['bulk-created'],
            notes: `Bulk created profile for ${platform}`,
            createdAt: new Date().toISOString(),
            isActive: false,
            startingUrl: bulkSettings.startingUrl || ''
          };

          newProfiles.push(profile);
        }
        
        // Small delay between batches to prevent UI freezing
        if (batch < Math.ceil(bulkSettings.count / batchSize) - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      onProfilesChange([...safeProfiles, ...newProfiles]);
      
      // Auto navigate to last page to show newly created profiles
      const newTotalProfiles = safeProfiles.length + newProfiles.length;
      const newLastPage = Math.ceil(newTotalProfiles / profilesPerPage);
      setCurrentPage(newLastPage);
      
      setIsBulkCreateOpen(false);
      toast.success(`Created ${newProfiles.length} profiles successfully`);
      
    } catch (error) {
      console.error('Bulk creation failed:', error);
      toast.error('Failed to create profiles');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileCreated = (profile: Profile) => {
    const safeProfiles = Array.isArray(profiles) ? profiles : [];
    
    // Auto-increment profile name if it's default format
    if (profile.name.match(/^Profile \d+$/)) {
      const profileNumber = safeProfiles.length + 1;
      profile.name = `Profile ${profileNumber}`;
    }
    
    const updatedProfiles = [...safeProfiles, profile];
    onProfilesChange(updatedProfiles);
    
    // Auto navigate to last page to show newly created profile
    const newLastPage = Math.ceil(updatedProfiles.length / profilesPerPage);
    setCurrentPage(newLastPage);
    
    toast.success(`Profile "${profile.name}" created successfully`);
  };

  const handleEditProfile = (profile: Profile) => {
    setSelectedProfile(profile);
    setIsProfilePanelOpen(true);
  };

  const handleSaveProfile = () => {
    if (!formData.name?.trim()) {
      setFormErrors(['Profile name is required']);
      return;
    }

    const profileData: Profile = {
      ...selectedProfile!,
      name: formData.name.trim(),
      proxyType: formData.proxyType || 'none',
      startingUrl: formData.startingUrl || '',
      timezone: 'auto', // CHANGED: Always use auto-detection
      notes: formData.notes || ''
    };

    const safeProfiles = Array.isArray(profiles) ? profiles : [];
    const updatedProfiles = safeProfiles.map(p => 
      p.id === selectedProfile!.id ? profileData : p
    );

    onProfilesChange(updatedProfiles);
    setIsEditing(false);
    setSelectedProfile(null);
    setFormErrors([]);
    
    toast.success('Profile updated successfully');
  };

  const handleDeleteProfile = async (profile: Profile) => {
    console.log('🗑️ DELETE: Attempting to delete profile:', profile.name, profile.id);
    
    if (!confirm(`Are you sure you want to DELETE profile "${profile.name}"? This action cannot be undone.`)) {
      console.log('🗑️ DELETE: User cancelled deletion');
      return;
    }

    try {
      console.log('🗑️ DELETE: Starting deletion process');
      
      // Close browser and cleanup before deletion
      if ((window as any).electronAPI?.profileWillDelete) {
        console.log('🗑️ DELETE: Closing browser and cleaning up...');
        await (window as any).electronAPI.profileWillDelete(profile.id);
        console.log('✅ DELETE: Browser closed and cleanup complete');
      }
    } catch (error) {
      console.warn('🗑️ DELETE: Failed to cleanup profile in Electron:', error);
    }

    // Stop any running RPA executions
    console.log('🗑️ DELETE: Stopping RPA executions');
    setRpaExecutions(prev => prev.filter(exec => exec.profileId !== profile.id));

    // Remove from RPA-opened profiles
    setRpaOpenedProfiles(prev => {
      const newSet = new Set(prev);
      newSet.delete(profile.id);
      return newSet;
    });

    // ACTUALLY DELETE the profile from the state and localStorage
    const safeProfiles = Array.isArray(profiles) ? profiles : [];
    console.log('🗑️ DELETE: Current profiles count:', safeProfiles.length);
    
    const updatedProfiles = safeProfiles.filter(p => p.id !== profile.id);
    console.log('🗑️ DELETE: After deletion profiles count:', updatedProfiles.length);
    
    // Update state and localStorage immediately
    onProfilesChange(updatedProfiles);
    localStorage.setItem('antidetect_profiles', JSON.stringify(updatedProfiles));
    
    console.log('🗑️ DELETE: Profile deleted successfully');
    toast.success(`Profile "${profile.name}" permanently deleted`);
  };

  const handleDeleteSelectedProfiles = async () => {
    if (selectedProfiles.length === 0) {
      toast.error('No profiles selected for deletion');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedProfiles.length} selected profiles?`)) return;

    try {
      setIsLoading(true);
      const safeProfiles = Array.isArray(profiles) ? profiles : [];
      
      // Close browsers and cleanup before deleting
      if ((window as any).electronAPI?.profilesWillDelete) {
        console.log(`🗑️ BULK DELETE: Closing browsers for ${selectedProfiles.length} profiles...`);
        await (window as any).electronAPI.profilesWillDelete(selectedProfiles);
        console.log('✅ BULK DELETE: All browsers closed and cleanup complete');
      }

      // Stop any running RPA executions
      setRpaExecutions(prev => prev.filter(exec => !selectedProfiles.includes(exec.profileId)));

      // Remove profiles from state
      const updatedProfiles = safeProfiles.filter(p => !selectedProfiles.includes(p.id));
      
      // If all profiles are being deleted, close all browser windows
      if (updatedProfiles.length === 0 && window.electronAPI?.closeAllProfiles) {
        try {
          const result = await window.electronAPI.closeAllProfiles();
          if (result.success && result.closedCount && result.closedCount > 0) {
            toast.info(`Closed ${result.closedCount} browser windows`);
          }
        } catch (error) {
          console.warn('Failed to close all browser windows:', error);
        }
      }
      
      // Update state and localStorage immediately
      onProfilesChange(updatedProfiles);
      localStorage.setItem('antidetect_profiles', JSON.stringify(updatedProfiles));
      
      setSelectedProfiles([]);
      toast.success(`Deleted ${selectedProfiles.length} profiles successfully`);
    } catch (error) {
      console.error('Failed to delete profiles:', error);
      toast.error('Failed to delete some profiles');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestProfile = async (profile: Profile) => {
    setIsTesting(prev => new Set([...prev, profile.id]));
    try {
      await handleTestProxy(profile);
    } finally {
      setIsTesting(prev => {
        const newSet = new Set(prev);
        newSet.delete(profile.id);
        return newSet;
      });
    }
  };

  const handleTestProxy = async (profile: Profile) => {
    if (!profile.proxy?.host) {
      setTestResults(prev => new Map(prev.set(profile.id, {
        success: false,
        error: 'No proxy configured'
      })));
      return;
    }
    
    try {
      let result;
      
      // Try using Electron API first
      if (window.electronAPI?.testProxy) {
        result = await window.electronAPI.testProxy({
          type: profile.proxyType || 'HTTP',
          host: profile.proxy.host,
          port: profile.proxy.port,
          username: profile.proxy.username || '',
          password: profile.proxy.password || ''
        });
      } else {
        // Fallback simulation for web mode
        await new Promise(resolve => setTimeout(resolve, 2000));
        const success = Math.random() > 0.3;
        
        if (success) {
          const mockIP = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
          result = { success: true, ip: mockIP };
        } else {
          result = { success: false, error: 'Connection timeout' };
        }
      }
      
      setTestResults(prev => new Map(prev.set(profile.id, result)));
      
      if (result.success) {
        toast.success(`Proxy test successful! IP: ${result.ip}${result.timezone ? `, Timezone: ${result.timezone}` : ''}`);
      } else {
        toast.error(`Proxy test failed: ${result.error}`);
      }
    } catch (error) {
      const errorResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      setTestResults(prev => new Map(prev.set(profile.id, errorResult)));
      toast.error('Proxy test failed');
    }
  };

  // CRITICAL FIX: Add debouncing to prevent multiple browser opens
  const [launchingProfiles, setLaunchingProfiles] = useState<Set<string>>(new Set());
  
  // Helper function to serialize profile data for IPC
  const serializeProfileForIPC = (profile: Profile) => {
    return {
      id: profile.id,
      name: profile.name,
      browserType: profile.browserType,
      platform: profile.platform, // CRITICAL FIX: Add platform field!
      userAgent: profile.userAgent,
      userAgentPlatform: profile.userAgentPlatform,
      proxyType: profile.proxyType,
      proxy: profile.proxy ? {
        host: profile.proxy.host,
        port: profile.proxy.port,
        username: profile.proxy.username,
        password: profile.proxy.password
      } : null,
      startingUrl: profile.startingUrl || '', // Empty = use default test page
      timezone: profile.timezone,
      locale: profile.locale,
      fingerprint: profile.fingerprint ? {
        userAgent: profile.fingerprint.userAgent,
        screen: profile.fingerprint.screen,
        timezone: profile.fingerprint.timezone,
        navigator: profile.fingerprint.navigator,
        canvas: profile.fingerprint.canvas,
        webgl: profile.fingerprint.webgl,
        audio: profile.fingerprint.audio
      } : null,
      isActive: profile.isActive,
      createdAt: profile.createdAt
    };
  };
  
  const handleLaunchProfile = async (profile: Profile) => {
    console.log('🚀 LAUNCH: Attempting to launch profile:', profile.name, profile.id);
    
    // PREVENT MULTIPLE CLICKS - Check if already launching
    if (launchingProfiles.has(profile.id)) {
      console.warn('⚠️ LAUNCH: Profile already launching, ignoring duplicate click:', profile.name);
      toast.warning(`Profile "${profile.name}" is already launching, please wait...`);
      return;
    }
    
    // PREVENT ALREADY OPEN - Check if already active
    if (profile.isActive) {
      console.warn('⚠️ LAUNCH: Profile already active:', profile.name);
      toast.info(`Profile "${profile.name}" is already open`);
      return;
    }
    
    // Mark as launching
    setLaunchingProfiles(prev => new Set([...prev, profile.id]));
    
    try {
      let success = false;
      let errorMessage = '';

      // Sanitize starting URL (fix about bablank issue)
      const normalizeStartingUrl = (url?: string) => {
        const u = (url || '').trim();
        if (!u) return 'https://google.com';
        const lower = u.toLowerCase().replace(/\s+/g, ' ').trim();
        if (lower === 'about blank' || lower === 'about  blank' || lower.includes('about bablank')) return 'https://google.com';
        return u;
      };
      
      // Create a serializable profile object for IPC
      const safeProfile = serializeProfileForIPC({
        ...profile,
        startingUrl: normalizeStartingUrl(profile.startingUrl)
      });

      // Try using Electron API first
      if (safeProfile.browserType === 'anti' && (window as any).electronAPI?.antiBrowserOpen) {
        console.log('🚀 LAUNCH: Using Beastbrowser to open profile');
        const proxyOpt = safeProfile.proxy ? {
          host: safeProfile.proxy.host,
          port: safeProfile.proxy.port,
          username: safeProfile.proxy.username,
          password: safeProfile.proxy.password,
          type: (profile.proxyType || 'http').toLowerCase(),
          timezone: safeProfile.proxy.timezone || safeProfile.timezone
        } : undefined;
        const result = await (window as any).electronAPI.antiBrowserOpen(safeProfile, { proxy: proxyOpt });
        success = result.success;
        errorMessage = result.error || '';
        console.log('🚀 LAUNCH: Anti-Browser IPC result:', result);
        console.log('🚀 LAUNCH: Success:', success, 'Error:', errorMessage);
        
        if (success) {
          toast.success(`Profile "${profile.name}" launched successfully`);
          
          // CRITICAL: Immediately update profile state to reflect the launch
          const safeProfiles = Array.isArray(profiles) ? profiles : [];
          const updatedProfiles = safeProfiles.map(p => 
            p.id === profile.id ? { ...p, isActive: true } : p
          );
          console.log('🚀 LAUNCH: Immediately updating profile state for:', profile.name);
          onProfilesChange(updatedProfiles);
          
          // Force localStorage update immediately
          localStorage.setItem('antidetect_profiles', JSON.stringify(updatedProfiles));
          
          // Verify launch status after a short delay
          setTimeout(async () => {
            console.log('🚀 LAUNCH: Verifying launch status for:', profile.name);
            if (window.electronAPI?.getProfileStatus) {
              const status = await window.electronAPI.getProfileStatus(profile.id);
              console.log('🚀 LAUNCH: Post-launch status verification:', status);
            }
          }, 1500);
        } else {
          toast.error(`Failed to launch profile: ${errorMessage}`);
        }
      } else if ((window as any).electronAPI?.openProfile) {
        console.log('🚀 LAUNCH: Using Electron API (BeastBrowser) to open profile');
        const result = await (window as any).electronAPI.openProfile(safeProfile);
        success = result.success;
        errorMessage = result.error || '';
        console.log('🚀 LAUNCH: BeastBrowser IPC result:', result);
        
        if (success) {
          toast.success(`Profile "${profile.name}" launched successfully`);
          
          // CRITICAL: Immediately update profile state to reflect the launch
          const safeProfiles = Array.isArray(profiles) ? profiles : [];
          const updatedProfiles = safeProfiles.map(p => 
            p.id === profile.id ? { ...p, isActive: true } : p
          );
          console.log('🚀 LAUNCH: Immediately updating profile state for:', profile.name);
          onProfilesChange(updatedProfiles);
          
          // Force localStorage update immediately
          localStorage.setItem('antidetect_profiles', JSON.stringify(updatedProfiles));
          
          // ENHANCED: Force immediate status verification after launch
          setTimeout(async () => {
            console.log('🚀 LAUNCH: Verifying launch status for:', profile.name);
            if (window.electronAPI?.getProfileStatus) {
              const status = await window.electronAPI.getProfileStatus(profile.id);
              console.log('🚀 LAUNCH: Post-launch status verification:', status);
              
              // Double-check status sync and force correction if needed
              const currentProfiles = JSON.parse(localStorage.getItem('antidetect_profiles') || '[]');
              const currentProfile = currentProfiles.find((p: Profile) => p.id === profile.id);
              if (status.isOpen && currentProfile && !currentProfile.isActive) {
                console.log('🚀 LAUNCH: Status mismatch detected, correcting...');
                const correctedProfiles = currentProfiles.map((p: Profile) => 
                  p.id === profile.id ? { ...p, isActive: true } : p
                );
                onProfilesChange(correctedProfiles);
                localStorage.setItem('antidetect_profiles', JSON.stringify(correctedProfiles));
              }
            }
          }, 1500);
        } else {
          toast.error(`Failed to launch profile: ${errorMessage}`);
        }
      } else {
        console.log('🚀 LAUNCH: Electron API not available, using in-app browser simulation');
        // Instead of opening a new window, simulate the browser running within the app
        toast.info(`Launching browser for profile "${profile.name}"...`);
        
        // Simulate successful browser launch within the app
        success = true;
        toast.success(`Profile "${profile.name}" browser launched successfully`);
        
        // Update profile state immediately to mark as active
        const safeProfiles = Array.isArray(profiles) ? profiles : [];
        const updatedProfiles = safeProfiles.map(p => 
          p.id === profile.id ? { ...p, isActive: true } : p
        );
        console.log('🚀 LAUNCH: Updated profiles (in-app mode):', updatedProfiles.length);
        onProfilesChange(updatedProfiles);
        localStorage.setItem('antidetect_profiles', JSON.stringify(updatedProfiles));
        
        // Show a modal or notification that the browser is running
        // This prevents the popup blocker issues and keeps everything within the app
        toast.info(`Browser for profile "${profile.name}" is now running. You can manage it from the profile list.\nProxy: ${profile.proxy?.host ? `${profile.proxy.host}:${profile.proxy.port}` : 'None'} | Platform: ${profile.userAgentPlatform}`, {
          duration: 5000
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('🚀 LAUNCH: Exception occurred:', error);
      toast.error(`Failed to launch profile: ${errorMsg}`);
    } finally {
      // ALWAYS remove from launching set
      setLaunchingProfiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(profile.id);
        return newSet;
      });
    }
  };

  const handleCloseProfile = async (profile: Profile) => {
    console.log('🔴 CLOSE: Attempting to close profile:', profile.name, profile.id);
    
    try {
      let success = false;
      let errorMessage = '';

      // Use antiBrowserClose for all profiles (works for Chrome 139)
      if (window.electronAPI?.antiBrowserClose) {
        console.log('🔴 CLOSE: Using antiBrowserClose IPC');
        const result = await window.electronAPI.antiBrowserClose(profile.id);
        success = result?.success || false;
        errorMessage = result?.error || '';
        console.log('🔴 CLOSE: IPC result:', result);
      } else if (window.electronAPI?.closeProfile) {
        console.log('🔴 CLOSE: Using closeProfile alias');
        const result = await window.electronAPI.closeProfile(profile.id);
        success = result?.success || false;
        errorMessage = result?.error || '';
        console.log('🔴 CLOSE: IPC result:', result);
      } else {
        console.log('🔴 CLOSE: Electron API not available, using fallback');
        // Fallback for web mode - always succeed since we can't actually close external windows
        success = true;
      }

      if (success) {
        console.log('🔴 CLOSE: Successfully closed, updating state');
        // Stop any running RPA executions for this profile
        setRpaExecutions(prev => prev.filter(exec => exec.profileId !== profile.id));
        
        // Remove from RPA-opened profiles if it was opened via RPA
        setRpaOpenedProfiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(profile.id);
          return newSet;
        });
        
        // CRITICAL: Update profile state to mark as inactive - NEVER DELETE THE PROFILE
        const safeProfiles = Array.isArray(profiles) ? profiles : [];
        const updatedProfiles = safeProfiles.map(p => 
          p.id === profile.id ? { ...p, isActive: false } : p
        );
        
        console.log('🔴 CLOSE: Updated profiles:', updatedProfiles.length);
        onProfilesChange(updatedProfiles);
        
        // Force localStorage update immediately
        localStorage.setItem('antidetect_profiles', JSON.stringify(updatedProfiles));
        
        toast.success(`Profile "${profile.name}" browser closed - profile saved in dashboard`);
      } else {
        console.log('🔴 CLOSE: Failed to close profile:', errorMessage);
        toast.error(`Failed to close profile: ${errorMessage}`);
      }
    } catch (error) {
      console.error('🔴 CLOSE: Exception occurred:', error);
      // Even if there's an error, update the state to allow reopening
      const safeProfiles = Array.isArray(profiles) ? profiles : [];
      const updatedProfiles = safeProfiles.map(p => 
        p.id === profile.id ? { ...p, isActive: false } : p
      );
      onProfilesChange(updatedProfiles);
      localStorage.setItem('antidetect_profiles', JSON.stringify(updatedProfiles));
      
      // Remove from RPA-opened profiles
      setRpaOpenedProfiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(profile.id);
        return newSet;
      });
      
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      toast.warning(`Profile "${profile.name}" browser closed (with error) - profile saved in dashboard`);
    }
  };

  const handleRunRPAScript = async () => {
    if (!selectedRPAScript || selectedProfiles.length === 0) {
      toast.error('Please select a script and at least one profile');
      return;
    }

    // Load script DIRECTLY from localStorage (don't use rpaService conversion!)
    console.log('🔍 Loading script from localStorage, ID:', selectedRPAScript);
    const savedScripts = localStorage.getItem('antidetect_rpa_scripts');
    if (!savedScripts) {
      toast.error('No scripts found in storage');
      return;
    }
    
    const allScripts: RPAScript[] = JSON.parse(savedScripts);
    const script = allScripts.find(s => s.id === selectedRPAScript);
    
    if (!script) {
      toast.error('Selected script not found');
      return;
    }
    
    console.log('✅ Script loaded from localStorage:', {
      name: script.name,
      websiteUrl: script.websiteUrl,
      hasWebsiteUrl: !!script.websiteUrl,
      scriptContentLength: script.scriptContent?.length || 0,
      hasScriptContent: !!script.scriptContent
    });

    setIsLoading(true);
    
    try {
      // Step 1: Launch all selected profiles first
      toast.info(`Launching ${selectedProfiles.length} profile browser windows...`);
      let launchSuccessCount = 0;
      let launchFailCount = 0;
      
      for (const profileId of selectedProfiles) {
        const profile = profiles.find(p => p.id === profileId);
        if (profile) {
          try {
            // Check if profile is already open
            let isOpen = false;
            if (window.electronAPI?.getProfileStatus) {
              const status = await window.electronAPI.getProfileStatus(profile.id);
              isOpen = status.isOpen;
            } else {
              isOpen = profile.isActive;
            }
            
            // Launch profile if not already open
            if (!isOpen) {
              await handleLaunchProfile(profile);
              // Mark this profile as opened via RPA
              setRpaOpenedProfiles(prev => new Set([...prev, profileId]));
              // Wait for window to fully load
              await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
              // Still mark as RPA-opened even if already open
              setRpaOpenedProfiles(prev => new Set([...prev, profileId]));
            }
            launchSuccessCount++;
          } catch (error) {
            console.error(`Failed to launch profile ${profile.name}:`, error);
            launchFailCount++;
          }
        }
      }
      
      if (launchFailCount > 0) {
        toast.warning(`Failed to launch ${launchFailCount} profiles. RPA will run on ${launchSuccessCount} successfully launched profiles.`);
      } else {
        toast.success(`All ${launchSuccessCount} profile browser windows launched successfully!`);
      }
      
      // Step 2: Execute RPA script on launched profiles
      if (launchSuccessCount > 0) {
        // Mark script as running
        rpaService.setScriptRunning(selectedRPAScript, true);

        // Create RPA executions for successfully launched profiles
        const successfulProfiles = selectedProfiles.filter(profileId => {
          const profile = profiles.find(p => p.id === profileId);
          return profile; // Only include profiles that exist
        });
        
        const newExecutions: RPAExecution[] = successfulProfiles.map(profileId => ({
          profileId,
          scriptId: script.id,
          status: 'running' as const,
          startTime: new Date(),
          closeAfterCompletion: closeAfterCompletion,
          openedViaRPA: true
        }));

        setRpaExecutions(prev => [...prev, ...newExecutions]);
        toast.success(`RPA script "${script.name}" started on ${launchSuccessCount} profiles`);

        // Execute script on each launched profile sequentially
        let scriptSuccessCount = 0;
        let scriptFailCount = 0;
        
        // Execute scripts in parallel on all profiles for better performance
        const scriptPromises = successfulProfiles.map(async (profileId) => {
          const profile = profiles.find(p => p.id === profileId);
          
          if (profile) {
            try {
              // Execute the actual RPA script (creates extension)
              await executeRPAScript(script, profile);
              scriptSuccessCount++;
              
              // Check if profile is already running
              const electronStatus = await window.electronAPI?.getProfileStatus(profile.id);
              const isRunning = electronStatus?.isOpen || profile.isActive;
              
              if (isRunning) {
                // Profile already running - just show message, don't close/reopen
                console.log(`ℹ️ Profile "${profile.name}" is already running`);
                console.log(`💡 RPA script injected! Close and reopen browser to activate script.`);
                toast.info(`Profile "${profile.name}" is already open. Close and reopen browser to run the script.`, {
                  duration: 5000
                });
              } else {
                // Profile not running - launch it with extension
                console.log(`🚀 Launching profile "${profile.name}" with RPA extension...`);
                await handleLaunchProfile(profile);
                toast.success(`Profile "${profile.name}" launched! Script will execute in 1 second. Check console (F12).`);
              }
              
            } catch (error) {
              console.error(`Error running script on profile ${profile.name}:`, error);
              scriptFailCount++;
              toast.error(`Script failed on profile "${profile.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        });
        
        // Wait for all scripts to complete
        await Promise.allSettled(scriptPromises);

        // Mark script as completed
        setTimeout(() => {
          setRpaExecutions(prev => prev.filter(exec => 
            !newExecutions.some(newExec => 
              newExec.profileId === exec.profileId && newExec.scriptId === exec.scriptId
            )
          ));
          rpaService.setScriptRunning(selectedRPAScript, false);
          
          if (scriptSuccessCount > 0) {
            toast.success(`RPA script "${script.name}" injected into ${scriptSuccessCount} profile(s)! Check browser console (F12) to see execution.`);
          }
          if (scriptFailCount > 0) {
            toast.error(`RPA script failed on ${scriptFailCount} profiles`);
          }
        }, 1000);
      } else {
        toast.error('No profiles could be launched. Please check your profiles and try again.');
      }
      
    } catch (error) {
      console.error('Error in RPA script execution:', error);
      toast.error('Failed to execute RPA script');
    } finally {
      setIsLoading(false);
      setShowRPAModal(false);
      setSelectedRPAScript('');
      setSelectedProfiles([]);
    }
  };

  // Function to actually execute RPA scripts in profile browser windows
  const executeRPAScript = async (script: RPAScript, profile: Profile) => {
    return new Promise<void>((resolve, reject) => {
      const executeAsync = async () => {
        try {
          console.log(`🤖 Executing RPA script "${script.name}" on profile "${profile.name}"`);
          
          // AUTO-INJECT RPA Website URL into Profile's Starting URL
          if (script.websiteUrl && script.websiteUrl.trim()) {
            console.log(`🌐 RPA has Website URL: ${script.websiteUrl}`);
            console.log(`💡 Injecting into profile's Starting URL for browser launch...`);
            
            // Update profile temporarily with RPA's website URL
            const updatedProfile = { ...profile, startingUrl: script.websiteUrl };
            
            // Save to storage so browser launch uses it
            await window.electronAPI.saveProfile(updatedProfile);
            console.log(`✅ Profile Starting URL updated to: ${script.websiteUrl}`);
            
            // Update parent state through callback
            if (onProfilesChange) {
              const updatedProfiles = profiles.map(p => p.id === profile.id ? updatedProfile : p);
              onProfilesChange(updatedProfiles);
            }
          } else {
            console.log(`ℹ️ No Website URL in RPA script - using profile's existing Starting URL`);
          }
          
          // Check if profile browser window is actually open via Electron API
          if (window.electronAPI?.getProfileStatus) {
            const status = await window.electronAPI.getProfileStatus(profile.id);
            if (!status.isOpen) {
              throw new Error(`Profile "${profile.name}" browser window is not open. Please launch the profile first.`);
            }
          } else {
            // Fallback check for development mode
            if (!profile.isActive) {
              throw new Error(`Profile "${profile.name}" browser window is not open. Please launch the profile first.`);
            }
          }
          
          // Execute script in the actual profile browser window via Electron
          if (window.electronAPI?.executeRPAScript) {
            console.log('📤 Sending script to Electron:', {
              profileId: profile.id,
              scriptName: script.name,
              websiteUrl: script.websiteUrl,
              executionTime: script.executionTime,
              hasScriptContent: !!script.scriptContent,
              scriptContentLength: script.scriptContent?.length || 0
            });
            
            const result = await window.electronAPI.executeRPAScript(profile.id, script);
            
            console.log('📥 Received result from Electron:', result);
            
            if (result.success) {
              console.log(`✅ RPA script "${script.name}" injected into profile "${profile.name}" - will execute after delay`);
              resolve();
            } else {
              throw new Error(result.error || 'Script execution failed');
            }
          } else {
            // Fallback for development mode
            console.warn('⚠️ Electron API not available, using simulation mode');
            await executeScriptInBrowser(script, profile);
            resolve();
          }
          
        } catch (error) {
          console.error(`❌ RPA script "${script.name}" failed on profile "${profile.name}":`, error);
          reject(error);
        }
      };
      
      executeAsync();
    });
  };

  // Execute script in browser (fallback for development)
  const executeScriptInBrowser = async (script: RPAScript, profile: Profile) => {
    return new Promise<void>((resolve, reject) => {
      try {
        console.log(`🌐 Executing RPA script in browser simulation mode for profile: ${profile.name}`);
        
        // Create a simplified execution environment
        const simulatedExecution = async () => {
          // Parse script to extract key actions
          const lines = script.scriptContent.split('\n');
          
          for (const line of lines) {
            if (line.trim().startsWith('await page.goto(')) {
              // FIXED: Corrected regex pattern to properly escape quotes
              const urlMatch = line.match(/goto\(["'](.*?)["']\)/);
              if (urlMatch) {
                console.log('🔗 Simulated navigation to:', urlMatch[1]);
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            } else if (line.trim().startsWith('await page.waitForTimeout(')) {
              const timeMatch = line.match(/waitForTimeout\((\d+)\)/);
              if (timeMatch) {
                const waitTime = parseInt(timeMatch[1]);
                console.log('⏱️ Simulated wait for:', waitTime + 'ms');
                await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, 3000)));
              }
            } else if (line.trim().includes('console.log(')) {
              // FIXED: Corrected regex pattern to properly escape quotes
              const logMatch = line.match(/console\.log\(["'](.*?)["']\)/);
              if (logMatch) {
                console.log('📝 Script output:', logMatch[1]);
              }
            }
          }
          
          console.log('✅ Simulated script execution completed');
        };
        
        simulatedExecution().then(resolve).catch(reject);
        
      } catch (error) {
        reject(error);
      }
    });
  };

  const handleSelectAllProfiles = () => {
    const safeProfiles = Array.isArray(profiles) ? profiles : [];
    if (selectedProfiles.length === safeProfiles.length) {
      setSelectedProfiles([]);
    } else {
      setSelectedProfiles(safeProfiles.map(p => p.id));
    }
  };

  const handleOpenAllProfiles = async () => {
    if (selectedProfiles.length === 0) {
      toast.error('No profiles selected');
      return;
    }

    console.log('🚀 BULK OPEN: Starting parallel profile launch for:', selectedProfiles.length, 'profiles');
    
    const safeProfiles = Array.isArray(profiles) ? profiles : [];
    const STAGGER_DELAY = 1500; // 1.5 seconds delay between each profile launch

    try {
      // Launch all profiles in parallel with staggered delays
      const launchPromises = selectedProfiles.map(async (profileId, index) => {
        const profile = safeProfiles.find(p => p.id === profileId);
        if (!profile) return { success: false, profileId };

        try {
          // Stagger the launches - each profile starts 1.5 seconds after the previous one
          await new Promise(resolve => setTimeout(resolve, index * STAGGER_DELAY));
          
          console.log(`🚀 BULK OPEN: Launching profile ${profile.name} (${index + 1}/${selectedProfiles.length})`);
          
          // Check if profile is already open
          let isAlreadyOpen = false;
          if (window.electronAPI?.getProfileStatus) {
            const status = await window.electronAPI.getProfileStatus(profile.id);
            isAlreadyOpen = status.isOpen;
          } else {
            isAlreadyOpen = profile.isActive;
          }
          
          if (isAlreadyOpen) {
            console.log(`🚀 BULK OPEN: Profile ${profile.name} already open, skipping`);
            return { success: true, profileId, skipped: true };
          } else {
            await handleLaunchProfile(profile);
            console.log(`🚀 BULK OPEN: Successfully launched ${profile.name}`);
            return { success: true, profileId };
          }
        } catch (error) {
          console.error(`🚀 BULK OPEN: Failed to launch profile ${profile.name}:`, error);
          return { success: false, profileId, error };
        }
      });

      // Wait for all launches to complete
      const results = await Promise.all(launchPromises);
      
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      const launchedProfiles = results.filter(r => r.success).map(r => r.profileId);

      // CRITICAL: Force immediate status update for all launched profiles
      if (launchedProfiles.length > 0) {
        console.log('🚀 BULK OPEN: Forcing immediate status sync for launched profiles:', launchedProfiles);
        
        // Update React state immediately for all launched profiles
        const updatedProfiles = safeProfiles.map(p => 
          launchedProfiles.includes(p.id) ? { ...p, isActive: true } : p
        );
        onProfilesChange(updatedProfiles);
        
        // Force localStorage update immediately
        localStorage.setItem('antidetect_profiles', JSON.stringify(updatedProfiles));
        
        // Force status synchronization after a short delay
        setTimeout(async () => {
          console.log('🚀 BULK OPEN: Running forced status update...');
          await updateProfileStatuses();
        }, 2000);
      }

      if (successCount > 0) {
        toast.success(`Successfully launched ${successCount} profiles`);
      }
      if (failCount > 0) {
        toast.error(`Failed to launch ${failCount} profiles`);
      }
    } catch (error) {
      console.error('🚀 BULK OPEN: Exception occurred:', error);
      toast.error('Failed to launch selected profiles');
    } finally {
      setSelectedProfiles([]); // Clear selection after launching
    }
  };

  const handleCloseAllProfiles = async () => {
    if (selectedProfiles.length === 0) {
      toast.error('No profiles selected');
      return;
    }

    console.log('🔴 BULK CLOSE: Starting bulk profile close for:', selectedProfiles.length, 'profiles');
    
    let successCount = 0;
    let failCount = 0;
    const safeProfiles = Array.isArray(profiles) ? profiles : [];

    try {
      // Track which profiles were successfully closed for immediate state updates
      const closedProfiles: string[] = [];
      
      for (const profileId of selectedProfiles) {
        const profile = safeProfiles.find(p => p.id === profileId);
        if (profile) {
          try {
            // Check if profile is actually open before trying to close
            let isOpen = false;
            if (window.electronAPI?.getProfileStatus) {
              const status = await window.electronAPI.getProfileStatus(profile.id);
              isOpen = status.isOpen;
            } else {
              isOpen = profile.isActive;
            }
            
            if (isOpen) {
              console.log(`🔴 BULK CLOSE: Closing profile ${profile.name} (${successCount + 1}/${selectedProfiles.length})`);
              await handleCloseProfile(profile);
              closedProfiles.push(profileId);
              successCount++;
              console.log(`🔴 BULK CLOSE: Successfully closed ${profile.name}`);
              
              // Small delay between closes to prevent overwhelming the system
              await new Promise(resolve => setTimeout(resolve, 500));
            } else {
              console.log(`🔴 BULK CLOSE: Profile ${profile.name} already closed, skipping`);
              // Still count as success since desired state is achieved
              successCount++;
            }
          } catch (error) {
            failCount++;
            console.error(`🔴 BULK CLOSE: Failed to close profile ${profile.name}:`, error);
          }
        }
      }

      // CRITICAL: Force immediate status update for all closed profiles
      if (closedProfiles.length > 0) {
        console.log('🔴 BULK CLOSE: Forcing immediate status sync for closed profiles:', closedProfiles);
        
        // Update React state immediately for all closed profiles
        const updatedProfiles = safeProfiles.map(p => 
          closedProfiles.includes(p.id) ? { ...p, isActive: false } : p
        );
        onProfilesChange(updatedProfiles);
        
        // Force localStorage update immediately
        localStorage.setItem('antidetect_profiles', JSON.stringify(updatedProfiles));
        
        // Force status synchronization after a short delay
        setTimeout(async () => {
          console.log('🔴 BULK CLOSE: Running forced status update...');
          await updateProfileStatuses();
        }, 1500);
      }

      if (successCount > 0) {
        toast.success(`Successfully closed ${successCount} profiles - all profiles remain saved in dashboard`);
      }
      if (failCount > 0) {
        toast.error(`Failed to close ${failCount} profiles`);
      }
      if (successCount === 0 && failCount === 0) {
        toast.info('No open profiles to close');
      }
    } catch (error) {
      console.error('🔴 BULK CLOSE: Exception occurred:', error);
      toast.error('Failed to close selected profiles');
    } finally {
      setSelectedProfiles([]); // Clear selection after closing
    }
  };

  // Export/Import handlers
  const handleExportProfiles = async () => {
    if (selectedProfiles.length === 0) {
      toast.error('Please select profiles to export');
      return;
    }

    if (!window.electronAPI?.exportProfileMultiple) {
      toast.error('Export not available in web mode');
      return;
    }

    if (!currentUser) {
      toast.error('Please log in to export profiles');
      return;
    }

    try {
      const safeProfiles = Array.isArray(profiles) ? profiles : [];
      const profilesToExport = safeProfiles.filter(p => selectedProfiles.includes(p.id));

      if (profilesToExport.length === 0) {
        toast.error('No valid profiles selected');
        return;
      }

      console.log(`📤 Exporting ${profilesToExport.length} profile(s)...`);
      
      const result = await window.electronAPI.exportProfileMultiple(profilesToExport, currentUser);

      if (result.success) {
        toast.success(`Successfully exported ${result.profileCount} profile(s) to ${result.path}`);
        console.log(`✅ Export complete: ${result.path} (${result.fileSize} bytes)`);
      } else if (!result.canceled) {
        toast.error(`Export failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export profiles');
    }
  };

  const handleImportProfiles = async () => {
    if (!window.electronAPI?.importProfile) {
      toast.error('Import not available in web mode');
      return;
    }

    if (!currentUser) {
      toast.error('Please log in to import profiles');
      return;
    }

    try {
      console.log('📥 Starting profile import...');
      
      const safeProfiles = Array.isArray(profiles) ? profiles : [];
      const result = await window.electronAPI.importProfile(currentUser, safeProfiles);

      if (result.success && result.profiles) {
        // Add imported profiles to the list
        const updatedProfiles = [...safeProfiles, ...result.profiles];
        onProfilesChange(updatedProfiles);

        const conflictMsg = result.conflicts && result.conflicts > 0 
          ? ` (${result.conflicts} renamed due to conflicts)` 
          : '';
        
        toast.success(`Successfully imported ${result.profiles.length} profile(s)${conflictMsg}`);
        console.log(`✅ Import complete: ${result.profiles.length} profiles imported`);

        // Show details of renamed profiles
        const renamedProfiles = result.profiles.filter((p: any) => p.wasRenamed);
        if (renamedProfiles.length > 0) {
          console.log('📝 Renamed profiles:', renamedProfiles.map((p: any) => 
            `"${p.originalName}" → "${p.name}"`
          ));
        }
      } else if (!result.canceled) {
        toast.error(`Import failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import profiles');
    }
  };

  const handleRPAAction = () => {
    if (selectedProfiles.length === 0) {
      toast.error('Please select profiles first');
      return;
    }
    
    // Refresh RPA scripts before opening modal - ALWAYS load from localStorage
    try {
      const savedScripts = localStorage.getItem('antidetect_rpa_scripts');
      if (savedScripts) {
        const parsed = JSON.parse(savedScripts);
        console.log('🔄 Automate button: Found', parsed.length, 'scripts in localStorage');
        console.log('📝 Script fields check:', parsed.map((s: RPAScript) => ({
          name: s.name,
          hasUrl: !!s.websiteUrl,
          url: s.websiteUrl,
          hasContent: !!s.scriptContent,
          contentLength: s.scriptContent?.length || 0
        })));
        setAvailableRPAScripts(parsed);
      } else {
        console.log('⚠️ No scripts in localStorage');
        setAvailableRPAScripts([]);
      }
    } catch (error) {
      console.warn('Failed to refresh RPA scripts:', error);
      setAvailableRPAScripts([]);
    }
    
    setShowRPAModal(true);
  };

  const handleRunSingleProfileScript = async (script: RPAScript, profile: Profile) => {
    try {
      console.log(`🤖 Running script "${script.name}" on profile "${profile.name}"`);
      
      // Check if profile is active
      if (!profile.isActive) {
        toast.error(`Profile "${profile.name}" is not active. Please launch it first.`);
        return;
      }

      // Execute the script
      await executeRPAScript(script, profile);
      
      // Update script execution count
      const updatedScript = { ...script, executionCount: script.executionCount + 1, lastExecuted: new Date().toISOString() };
      rpaService.updateScript(script.id, updatedScript);
      
      // Refresh scripts
      const scripts = rpaService.getAllScripts();
      setAvailableRPAScripts(scripts.map(convertServiceScriptToScript));
      
      toast.success(`Script "${script.name}" started on profile "${profile.name}"`);
      
    } catch (error) {
      console.error('Error running single profile script:', error);
      toast.error(`Failed to run script: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleProfileSelection = (profileId: string, checked: boolean) => {
    if (checked) {
      setSelectedProfiles(prev => [...prev, profileId]);
    } else {
      setSelectedProfiles(prev => prev.filter(id => id !== profileId));
    }
  };

  const copyProxyToClipboard = (profile: Profile) => {
    if (!profile.proxy?.host) return;
    
    const proxyString = profile.proxy.username 
      ? `${profile.proxy.username}:${profile.proxy.password}@${profile.proxy.host}:${profile.proxy.port}`
      : `${profile.proxy.host}:${profile.proxy.port}`;
    
    navigator.clipboard.writeText(proxyString);
    toast.success('Proxy copied to clipboard');
  };

  const formatProxyDisplay = (profile: Profile) => {
    if (!profile.proxy?.host) return 'No Proxy';
    return `${profile.proxy.host}:${profile.proxy.port}`;
  };

  const getDeviceIcon = (profile: Profile) => {
    if (profile.userAgent?.includes('Mobile')) return <Smartphone className="h-4 w-4" />;
    if (profile.userAgent?.includes('Tablet')) return <Tablet className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };

  const getRunningRPAScript = (profileId: string) => {
    const execution = rpaExecutions.find(exec => exec.profileId === profileId && exec.status === 'running');
    if (!execution) return null;
    
    const script = rpaService.getScriptById(execution.scriptId);
    return script ? { script, execution } : null;
  };


  const handleRefreshProfiles = async () => {
    setIsLoading(true);
    try {
      // Force update profile statuses
      await updateProfileStatuses();
      toast.success('Profile list refreshed');
    } catch (error) {
      console.error('Failed to refresh profiles:', error);
      toast.error('Failed to refresh profile list');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6 bg-white min-h-screen">
      {/* Wrap the profile creation button with UsageGuard */}
      <UsageGuard 
        userId={currentUser?.id || ''} 
        action="createProfile"
        onActionBlocked={(result) => {
          if (result.upgradeRequired) {
            toast.error(result.reason || 'Profile limit reached. Please upgrade your plan.');
            // Optionally redirect to upgrade page
            window.open('https://beastbrowser.com/pricing', '_blank');
          } else {
            toast.error(result.reason || 'Unable to create profile');
          }
        }}
      >
        {/* Glassmorphism Header */}
        {/* Header with Orange/Red Theme */}
        <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-200 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 animate-pulse"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold flex items-center gap-3 text-gray-900">
                  <div className="p-2 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-lg shadow-lg">
                    👥
                  </div>
                  Profile Manager
                </h1>
                <div className="bg-gradient-to-r from-blue-400/20 to-indigo-400/20 rounded-lg px-4 py-2 border border-blue-300/30">
                  <div className="text-gray-700 text-sm font-medium">Monthly Created</div>
                  <div className="text-gray-900 font-bold text-lg">{safeProfiles.filter(profile => {
                    const profileDate = new Date(profile.createdAt || Date.now());
                    const currentMonth = new Date().getMonth();
                    const currentYear = new Date().getFullYear();
                    return profileDate.getMonth() === currentMonth && profileDate.getFullYear() === currentYear;
                  }).length}</div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  onClick={handleRefreshProfiles} 
                  variant="outline"
                  size="sm"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                >
                  <RefreshCw className={`w-3 h-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button 
                  onClick={() => setIsBulkCreateOpen(true)}
                  size="sm"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Bulk Create
                </Button>
                <Button 
                  onClick={handleCreateProfile}
                  size="sm"
                  className="bg-gradient-to-r from-indigo-400 to-blue-400 text-white hover:from-indigo-500 hover:to-blue-500"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  New Profile
                </Button>
              </div>
            </div>
          </div>
        </div>
      </UsageGuard>

      {/* Profile Command Center with Orange/Red Theme */}
      <div className="relative rounded-xl bg-gradient-to-r from-slate-800 via-blue-900 to-indigo-900 border border-blue-500/30 shadow-lg overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5"></div>
        <div className="relative p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-lg">
                🎯
              </div>
              Quick Actions
            </h2>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAllProfiles}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900 h-8 text-xs"
              >
                {selectedProfiles.length === safeProfiles.length ? 'Deselect All' : 'Select All'}
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleOpenAllProfiles}
                disabled={selectedProfiles.length === 0}
                className="bg-gradient-to-r from-green-400 to-emerald-400 text-white hover:from-green-500 hover:to-emerald-500 h-8 text-xs"
              >
                <PlayCircle className="w-3 h-3 mr-1" />
                Launch ({selectedProfiles.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCloseAllProfiles}
                disabled={selectedProfiles.length === 0}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900 h-8 text-xs"
                title="Close browser windows for selected profiles"
              >
                <Square className="w-3 h-3 mr-1" />
                Close ({selectedProfiles.length})
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteSelectedProfiles}
                disabled={selectedProfiles.length === 0}
                className="bg-gradient-to-r from-red-400 to-pink-400 text-white hover:from-red-500 hover:to-pink-500 h-8 text-xs"
                title="Permanently delete selected profiles"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Delete ({selectedProfiles.length})
              </Button>
              <Button
                onClick={handleRPAAction}
                disabled={selectedProfiles.length === 0}
                className="bg-gradient-to-r from-blue-400 to-indigo-400 text-white hover:from-blue-500 hover:to-indigo-500 h-8 text-xs"
              >
                <Bot className="w-3 h-3 mr-1" />
                Automate ({selectedProfiles.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportProfiles}
                disabled={selectedProfiles.length === 0}
                className="border-purple-300 text-purple-700 hover:bg-purple-50 hover:text-purple-900 h-8 text-xs"
                title="Export selected profiles to encrypted file"
              >
                <Download className="w-3 h-3 mr-1" />
                Export ({selectedProfiles.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleImportProfiles}
                className="border-indigo-300 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-900 h-8 text-xs"
                title="Import profiles from encrypted file"
              >
                <Upload className="w-3 h-3 mr-1" />
                Import
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative bg-gradient-to-br from-blue-50 to-indigo-50 backdrop-blur-sm p-3 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-xs font-medium">Total Profiles</p>
                  <p className="text-2xl font-bold text-gray-900">{safeProfiles.length}</p>
                </div>
                <div className="p-2 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-lg">
                  <span className="text-lg">📈</span>
                </div>
              </div>
            </div>
            
            <div className="relative bg-gradient-to-br from-green-50 to-emerald-50 backdrop-blur-sm p-3 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-xs font-medium">Selected</p>
                  <p className="text-2xl font-bold text-gray-900">{selectedProfiles.length}</p>
                </div>
                <div className="p-2 bg-gradient-to-br from-green-400 to-emerald-400 rounded-lg">
                  <span className="text-lg">✅</span>
                </div>
              </div>
            </div>
            
            <div className="relative bg-gradient-to-br from-indigo-50 to-blue-50 backdrop-blur-sm p-3 rounded-lg border border-indigo-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-xs font-medium">Active Profiles</p>
                  <p className="text-2xl font-bold text-gray-900">{safeProfiles.filter(p => p.isActive).length}</p>
                </div>
                <div className="p-2 bg-gradient-to-br from-indigo-400 to-blue-400 rounded-lg">
                  <span className="text-lg">🟢</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profiles List with Pagination */}
      <div className="space-y-6">
        {/* Enhanced Pagination Controls with Profiles Per Page Selection */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-white/90 backdrop-blur-sm border border-white/20 rounded-2xl p-4">
            <div className="flex items-center gap-4">
              <div className="text-gray-700">
                Showing {startIndex + 1}-{Math.min(endIndex, safeProfiles.length)} of {safeProfiles.length} profiles
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm text-gray-600">Profiles per page:</Label>
                <Select
                  value={profilesPerPage.toString()}
                  onValueChange={(value) => {
                    setProfilesPerPage(parseInt(value));
                    setCurrentPage(1); // Reset to first page when changing page size
                  }}
                >
                  <SelectTrigger className="w-20 h-8 bg-white border-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              >
                Previous
              </Button>
              {/* Smart pagination - show first, last, and pages around current */}
              {(() => {
                const maxPagesToShow = 5;
                let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
                const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
                
                // Adjust if we're near the end
                if (endPage - startPage + 1 < maxPagesToShow) {
                  startPage = Math.max(1, endPage - maxPagesToShow + 1);
                }
                
                const pages = [];
                
                // Always show first page
                if (startPage > 1) {
                  pages.push(
                    <Button
                      key={1}
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    >
                      1
                    </Button>
                  );
                  if (startPage > 2) {
                    pages.push(<span key="ellipsis1" className="text-gray-500">...</span>);
                  }
                }
                
                // Show current range
                for (let i = startPage; i <= endPage; i++) {
                  pages.push(
                    <Button
                      key={i}
                      variant={currentPage === i ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(i)}
                      className={currentPage === i 
                        ? "bg-gradient-to-r from-blue-400 to-indigo-400 text-white" 
                        : "border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                      }
                    >
                      {i}
                    </Button>
                  );
                }
                
                // Always show last page
                if (endPage < totalPages) {
                  if (endPage < totalPages - 1) {
                    pages.push(<span key="ellipsis2" className="text-gray-500">...</span>);
                  }
                  pages.push(
                    <Button
                      key={totalPages}
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    >
                      {totalPages}
                    </Button>
                  );
                }
                
                return pages;
              })()}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              >
                Next
              </Button>
            </div>
          </div>
        )}
        
        <div className="space-y-2">
          {paginatedProfiles.length === 0 ? (
            <Card className="bg-white/90 backdrop-blur-sm border border-white/20">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Globe className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500 mb-4">No profiles found</p>
                <Button onClick={handleCreateProfile} className="bg-gradient-to-r from-blue-400 to-indigo-400 text-white hover:from-blue-500 hover:to-indigo-500">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Profile
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {paginatedProfiles.map((profile) => {
                const status = profileStatuses.get(profile.id);
                const testResult = testResults.get(profile.id);
                const runningRPA = getRunningRPAScript(profile.id);
                const isClearing = clearingProfiles.has(profile.id);
                
                return (
                  <div key={profile.id} className="relative group mb-3">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-blue-500/5 rounded-lg blur-sm group-hover:blur-md transition-all duration-200"></div>
                    <div className="relative bg-gradient-to-br from-gray-50 to-blue-50 border border-blue-200/50 rounded-lg p-3 hover:from-blue-50 hover:to-indigo-50 hover:border-blue-300 transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-between">
                      {/* Left Section - Basic Info */}
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedProfiles.includes(profile.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedProfiles(prev => [...prev, profile.id]);
                              } else {
                                setSelectedProfiles(prev => prev.filter(id => id !== profile.id));
                              }
                            }}
                            className="w-4 h-4 border-white/30 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-orange-400 data-[state=checked]:to-red-400"
                          />
                          <div className="p-1.5 bg-gradient-to-br from-orange-400 to-red-500 rounded-md">
                            {getDeviceIcon(profile)}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-sm text-gray-900 truncate">{profile.name}</h3>
                            <p className="text-xs text-gray-500">{profile.browserType}</p>
                          </div>
                        </div>
                        
                        {/* Status Badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge 
                            variant={profile.isActive ? 'default' : 'secondary'} 
                            className={`text-xs px-2 py-1 ${
                              profile.isActive ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'
                            }`}
                          >
                            {profile.isActive ? '🟢 Active' : '🔴 Inactive'}
                          </Badge>
                          {runningRPA && (
                            <Badge className="text-xs px-2 py-1 bg-blue-100 text-blue-700 border-blue-200 animate-pulse">
                              <Bot className="h-3 w-3 mr-1" />
                              {runningRPA.script.name.length > 10 ? runningRPA.script.name.substring(0, 10) + '...' : runningRPA.script.name}
                            </Badge>
                          )}
                          {isClearing && (
                            <Badge className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 border-yellow-200">
                              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                              Clearing
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Middle Section - Proxy & Platform Info */}
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 bg-blue-50 rounded-md p-2 border border-blue-200">
                          <Globe className="h-4 w-4 text-blue-600" />
                          <div className="min-w-0">
                            <div className="text-gray-600 text-xs font-medium">Proxy</div>
                            <div className="text-gray-900 font-medium text-sm truncate max-w-[120px]">
                              {formatProxyDisplay(profile)}
                            </div>
                          </div>
                          {profile.proxy?.host && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyProxyToClipboard(profile)}
                              className="p-1 h-6 w-6 hover:bg-blue-100"
                            >
                              <Copy className="h-3 w-3 text-gray-600" />
                            </Button>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 bg-green-50 rounded-md p-2 border border-green-200">
                          <HardDrive className="h-4 w-4 text-green-600" />
                          <div>
                            <div className="text-gray-600 text-xs font-medium">Platform</div>
                            <div className="text-gray-900 font-medium text-sm">{getPlatformDisplayInfo(profile.userAgentPlatform).name}</div>
                          </div>
                        </div>
                        
                        {testResult && (
                          <div className="flex items-center gap-2 bg-white/60 rounded-md p-2 border border-gray-200">
                            <Badge 
                              variant={testResult.success ? 'default' : 'destructive'}
                              className={`text-xs ${
                                testResult.success ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'
                              }`}
                            >
                              {testResult.success ? '✓' : '✗'}
                            </Badge>
                            {testResult.ip && (
                              <p className="text-xs text-gray-600 font-mono">{testResult.ip}</p>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Right Section - Action Buttons */}
                      <div className="flex items-center gap-2">
                        {profile.isActive ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCloseProfile(profile)}
                            className="h-7 px-2 text-xs bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                          >
                            <Square className="w-3 h-3 mr-1" />
                            Close
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleLaunchProfile(profile)}
                            disabled={launchingProfiles.has(profile.id)}
                            className="h-7 px-2 text-xs bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                          >
                            {launchingProfiles.has(profile.id) ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <>
                                <Play className="w-3 h-3 mr-1" />
                                Launch
                              </>
                            )}
                          </Button>
                        )}
                        
                        {/* Test Proxy Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTestProfile(profile)}
                          disabled={isTesting.has(profile.id)}
                          className="h-7 px-2 text-xs bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200"
                          title="Test proxy"
                        >
                          {isTesting.has(profile.id) ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <TestTube className="w-3 h-3" />
                          )}
                        </Button>
                        
                        {/* Compact action buttons */}
                        {profile.isActive && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleClearCache(profile)}
                              disabled={isClearing}
                              className="h-7 px-2 text-xs bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200"
                              title="Clear cache"
                            >
                              <HardDrive className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleClearCookies(profile)}
                              disabled={isClearing}
                              className="h-7 px-2 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                              title="Clear cookies"
                            >
                              <Cookie className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteProfile(profile)}
                          className="h-7 px-2 text-xs hover:bg-red-50 text-red-600 border border-red-200"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
                })}
              </div>
            )}
        </div>
      </div>

      {/* NEW: Data Clear Modal */}
      {showDataClearModal && selectedProfileForClear && (
        <Dialog open={showDataClearModal} onOpenChange={setShowDataClearModal}>
          <DialogContent className="max-w-md bg-white">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-gray-900">Clear Profile Data</DialogTitle>
              <DialogDescription className="text-gray-600">
                Select which data types to clear for profile &quot;{selectedProfileForClear.name}&quot;
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-3">
                <Label className="text-gray-700 font-medium">Select Data Types to Clear:</Label>
                
                {[
                  { id: 'cache', label: 'Cache', icon: HardDrive, description: 'Temporary files and images' },
                  { id: 'cookies', label: 'Cookies', icon: Cookie, description: 'Login sessions and preferences' },
                  { id: 'history', label: 'History', icon: History, description: 'Browsing history' },
                  { id: 'downloads', label: 'Downloads', icon: Database, description: 'Download history' },
                  { id: 'formdata', label: 'Form Data', icon: Database, description: 'Saved form inputs' },
                  { id: 'passwords', label: 'Passwords', icon: Database, description: 'Saved passwords' }
                ].map((dataType) => {
                  const IconComponent = dataType.icon;
                  return (
                    <div key={dataType.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <Checkbox
                        id={dataType.id}
                        checked={selectedDataTypes.includes(dataType.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedDataTypes(prev => [...prev, dataType.id]);
                          } else {
                            setSelectedDataTypes(prev => prev.filter(id => id !== dataType.id));
                          }
                        }}
                      />
                      <IconComponent className="h-4 w-4 text-gray-500" />
                      <div className="flex-1">
                        <Label htmlFor={dataType.id} className="text-gray-700 cursor-pointer font-medium">
                          {dataType.label}
                        </Label>
                        <p className="text-xs text-gray-500">{dataType.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-700">
                  ⚠️ This action cannot be undone. Selected data will be permanently removed from this profile.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
              <Button 
                variant="outline" 
                onClick={() => setShowDataClearModal(false)}
                className="border-gray-300"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleClearSelectedData}
                disabled={selectedDataTypes.length === 0 || clearingProfiles.has(selectedProfileForClear.id)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {clearingProfiles.has(selectedProfileForClear.id) ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Clearing...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear Selected Data ({selectedDataTypes.length})
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Profile Modal */}
      <CreateProfileModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onProfileCreated={handleProfileCreated}
      />

      {/* Enhanced Bulk Create Sheet - slide-in with proper input handling */}
      <Sheet open={isBulkCreateOpen} onOpenChange={setIsBulkCreateOpen}>
        <SheetContent side="right" className="sm:max-w-2xl w-[95vw] max-w-[600px] p-0">
          <div className="h-full flex flex-col">
            <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4">
              <SheetHeader>
                <SheetTitle className="text-xl font-bold text-white flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    🚀
                  </div>
                  Bulk Profile Creation
                </SheetTitle>
                <SheetDescription className="text-blue-100 text-sm">
                  Create multiple profiles with automated settings. Timezone will be auto-detected from proxy IP.
                </SheetDescription>
              </SheetHeader>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              {/* Browser Type */}
              <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-blue-200">
                <Label className="text-gray-700 font-medium flex items-center gap-2 mb-3">
                  <Bot className="h-4 w-4 text-blue-600" />
                  Browser Type
                </Label>
                <Select 
                  value={bulkSettings.browserType}
                  onValueChange={(value: any) => setBulkSettings(prev => ({ ...prev, browserType: value }))}
                >
                  <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="anti">🛡️ Beastbrowser</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Basic Settings */}
              <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-blue-200">
                <Label className="text-gray-700 font-medium flex items-center gap-2 mb-3">
                  <Settings className="h-4 w-4 text-blue-600" />
                  Basic Configuration
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-gray-700 text-sm">Number of Profiles *</Label>
                    <Input
                      type="number"
                      min="1"
                      max="1000"
                      value={bulkSettings.count}
                      onChange={(e) => {
                        const value = Math.max(1, Math.min(1000, parseInt(e.target.value) || 1));
                        setBulkSettings(prev => ({ ...prev, count: value }));
                      }}
                      onInput={(e) => {
                        const value = Math.max(1, Math.min(1000, parseInt((e.target as HTMLInputElement).value) || 1));
                        setBulkSettings(prev => ({ ...prev, count: value }));
                      }}
                      onFocus={(e) => e.target.focus()}
                      className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      autoComplete="off"
                    />
                    <p className="text-xs text-gray-500 mt-1">Create 1-1000 profiles (AdsPower-level bulk creation)</p>
                  </div>
                  <div>
                    <Label className="text-gray-700 text-sm">Name Prefix *</Label>
                    <Input
                      value={bulkSettings.namePrefix}
                      onChange={(e) => {
                        const value = e.target.value;
                        setBulkSettings(prev => ({ ...prev, namePrefix: value }));
                      }}
                      onInput={(e) => {
                        const value = (e.target as HTMLInputElement).value;
                        setBulkSettings(prev => ({ ...prev, namePrefix: value }));
                      }}
                      onFocus={(e) => e.target.focus()}
                      className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Profile"
                      autoComplete="off"
                    />
                    <p className="text-xs text-gray-500 mt-1">Names: {bulkSettings.namePrefix} 1, {bulkSettings.namePrefix} 2...</p>
                  </div>
                </div>
              </div>

              {/* Starting URL */}
              <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-blue-200">
                <Label className="text-gray-700 font-medium flex items-center gap-2 mb-3">
                  <Link className="h-4 w-4 text-blue-600" />
                  Starting URL (Optional)
                </Label>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-gray-500" />
                  <Input
                    value={bulkSettings.startingUrl}
                    onChange={(e) => {
                      const value = e.target.value;
                      setBulkSettings(prev => ({ ...prev, startingUrl: value }));
                    }}
                    onInput={(e) => {
                      const value = (e.target as HTMLInputElement).value;
                      setBulkSettings(prev => ({ ...prev, startingUrl: value }));
                    }}
                    onFocus={(e) => e.target.focus()}
                    placeholder="https://example.com (optional)"
                    className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    autoComplete="off"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">URL that will open when profiles launch</p>
              </div>

              {/* Platform Selection */}
              <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-blue-200">
                <Label className="text-gray-700 font-medium flex items-center gap-2 mb-3">
                  <Monitor className="h-4 w-4 text-blue-600" />
                  Platform Selection ({bulkSettings.selectedPlatforms.length} selected)
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {availablePlatforms.map(platform => (
                    <label key={platform.id} className="flex items-center space-x-2 p-2 bg-white/60 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-all">
                      <Checkbox
                        id={`bulk-${platform.id}`}
                        checked={bulkSettings.selectedPlatforms.includes(platform.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setBulkSettings(prev => ({
                              ...prev,
                              selectedPlatforms: [...prev.selectedPlatforms, platform.id]
                            }));
                          } else {
                            setBulkSettings(prev => ({
                              ...prev,
                              selectedPlatforms: prev.selectedPlatforms.filter(id => id !== platform.id)
                            }));
                          }
                        }}
                        className="border-blue-300 data-[state=checked]:bg-blue-600"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{platform.icon}</span>
                        <span className="text-sm font-medium text-gray-700">{platform.name}</span>
                      </div>
                    </label>
                  ))}
                </div>
                {bulkSettings.selectedPlatforms.length === 0 && (
                  <p className="text-red-600 text-sm mt-2 font-medium">⚠️ Please select at least one platform</p>
                )}
              </div>

              {/* Fingerprint Settings */}
              <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-blue-200">
                <div className="flex items-center justify-between">
                  <Label className="text-gray-700 font-medium flex items-center gap-2">
                    <Fingerprint className="h-4 w-4 text-blue-600" />
                    Browser Fingerprints
                  </Label>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="randomize-fingerprints"
                      checked={bulkSettings.randomizeFingerprints}
                      onCheckedChange={(checked) => 
                        setBulkSettings(prev => ({ ...prev, randomizeFingerprints: checked as boolean }))
                      }
                      className="border-blue-300 data-[state=checked]:bg-blue-600"
                    />
                    <Label htmlFor="randomize-fingerprints" className="text-sm text-gray-700 cursor-pointer font-medium">
                      Randomize All
                    </Label>
                    <RefreshCw className="h-4 w-4 text-blue-500" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Generate unique fingerprints for each profile to avoid detection</p>
              </div>

              {/* Proxy Configuration */}
              <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-blue-200">
                <Label className="text-gray-700 font-medium flex items-center gap-2 mb-3">
                  <Shield className="h-4 w-4 text-blue-600" />
                  Proxy Configuration
                </Label>
                <Select 
                  value={bulkSettings.proxyType} 
                  onValueChange={(value: any) => setBulkSettings(prev => ({ ...prev, proxyType: value }))}
                >
                  <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="none">🚫 No Proxy</SelectItem>
                    <SelectItem value="saved">💾 Use Saved Proxy</SelectItem>
                    <SelectItem value="http">🌐 HTTP Proxy List</SelectItem>
                    <SelectItem value="https">🔒 HTTPS Proxy List</SelectItem>
                    <SelectItem value="socks5">🧦 SOCKS5 Proxy List</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Saved Proxy Selection */}
              {bulkSettings.proxyType === 'saved' && (
                <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-blue-200">
                  <Label className="text-gray-700 font-medium mb-3 block">Select Working Proxy</Label>
                  <Select 
                    value={bulkSettings.selectedSavedProxy} 
                    onValueChange={(value) => setBulkSettings(prev => ({ ...prev, selectedSavedProxy: value }))}
                  >
                    <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue placeholder="Choose a working proxy..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {savedProxies.filter(p => p.status === 'active' && p.id).length > 0 ? (
                        savedProxies.filter(p => p.status === 'active' && p.id).map((proxy) => (
                          <SelectItem key={proxy.id} value={proxy.id}>
                            <div className="flex items-center gap-2">
                              <Badge className="text-xs bg-green-100 text-green-700 border-green-300">{proxy.type?.toUpperCase()}</Badge>
                              <span className="font-mono text-sm">{proxy.host}:{proxy.port}</span>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-proxy-available" disabled className="text-gray-500">
                          No working proxies available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-700 font-medium flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Timezone auto-detection enabled
                    </p>
                    <p className="text-xs text-blue-600 mt-1">Timezone will be automatically detected from proxy IP location</p>
                  </div>
                </div>
              )}

              {/* Bulk Proxy Input */}
              {bulkSettings.proxyType !== 'none' && bulkSettings.proxyType !== 'saved' && (
                <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-gray-700 font-medium">Proxy List (One per line)</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          const text = await navigator.clipboard.readText();
                          setBulkSettings(prev => ({ ...prev, bulkProxyInput: text }));
                          toast.success('Proxies pasted from clipboard');
                        } catch (error) {
                          toast.error('Failed to paste from clipboard');
                        }
                      }}
                      className="border-blue-300 text-blue-600 hover:bg-blue-50"
                    >
                      <Clipboard className="h-4 w-4 mr-1" />
                      Paste
                    </Button>
                  </div>
                  <Textarea
                    value={bulkSettings.bulkProxyInput}
                    onChange={(e) => {
                      const value = e.target.value;
                      setBulkSettings(prev => ({ ...prev, bulkProxyInput: value }));
                    }}
                    onInput={(e) => {
                      const value = (e.target as HTMLTextAreaElement).value;
                      setBulkSettings(prev => ({ ...prev, bulkProxyInput: value }));
                    }}
                    onFocus={(e) => e.target.focus()}
                    placeholder="Enter proxies (one per line):\nhost:port\nhost:port:username:password\nusername:password@host:port\nprotocol://username:password@host:port"
                    className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500 font-mono text-sm min-h-[120px]"
                    rows={6}
                    autoComplete="off"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-sm text-gray-600">
                      {bulkSettings.bulkProxyInput.trim() ? 
                        `📊 ${bulkSettings.bulkProxyInput.trim().split('\n').filter(line => line.trim()).length} proxies entered` : 
                        '⚠️ No proxies entered'
                      }
                    </p>
                    <p className="text-xs text-blue-600">🌍 Auto timezone detection enabled</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mt-3">
                    <h4 className="font-medium text-blue-900 mb-1 text-sm">📝 Supported Formats:</h4>
                    <ul className="text-xs text-blue-700 space-y-0.5">
                      <li>• <code className="bg-blue-100 px-1 rounded">host:port</code></li>
                      <li>• <code className="bg-blue-100 px-1 rounded">host:port:username:password</code></li>
                      <li>• <code className="bg-blue-100 px-1 rounded">username:password@host:port</code></li>
                      <li>• <code className="bg-blue-100 px-1 rounded">protocol://username:password@host:port</code></li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Creation Summary */}
              <div className="bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg p-4 border border-blue-300">
                <h3 className="font-semibold mb-3 text-gray-900 flex items-center gap-2">
                  <span className="p-1.5 bg-blue-200 rounded-lg text-blue-700">📊</span>
                  Creation Summary
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-white/60 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{bulkSettings.count}</div>
                    <div className="text-sm text-gray-600">Profiles</div>
                  </div>
                  <div className="text-center p-3 bg-white/60 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{bulkSettings.selectedPlatforms.length}</div>
                    <div className="text-sm text-gray-600">Platforms</div>
                  </div>
                </div>
              </div>

              {/* Progress Indicator */}
              {isCreatingBulk && (
                <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center gap-3 mb-3">
                    <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
                    <span className="font-medium text-gray-900">Creating {bulkSettings.count} profiles...</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-400 to-indigo-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: '60%' }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">Generating fingerprints, configuring proxies, and detecting timezones...</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 bg-gray-50 p-6">
              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  onClick={() => setIsBulkCreateOpen(false)}
                  disabled={isCreatingBulk}
                  className="border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleBulkCreate}
                  disabled={bulkSettings.selectedPlatforms.length === 0 || isCreatingBulk || !bulkSettings.namePrefix.trim()}
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-8"
                >
                  {isCreatingBulk ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Creating... ({bulkSettings.count})
                    </>
                  ) : (
                    <>
                      🚀 Create {bulkSettings.count} Profiles
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* RPA Modal */}
      {showRPAModal && (
        <Dialog open={showRPAModal} onOpenChange={setShowRPAModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900">Choose RPA Script</DialogTitle>
              <DialogDescription className="text-gray-600">
                Select an RPA script to run on {selectedProfiles.length} selected profiles
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Script Selection */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-gray-700 font-medium">Available RPA Scripts</Label>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      try {
                        console.log('🔄 Manual refresh button clicked');
                        rpaService.debugLocalStorage();
                        const latestScripts = rpaService.getAllScripts();
                        console.log('🔄 Manual refresh found:', latestScripts.length, 'scripts');
                        console.log('📝 Manual refresh script details:', latestScripts.map(s => ({ name: s.name, id: s.id })));
                        setAvailableRPAScripts(latestScripts.map(convertServiceScriptToScript));
                        toast.success(`Refreshed! Found ${latestScripts.length} RPA scripts`);
                      } catch (error) {
                        console.error('❌ Manual refresh failed:', error);
                        toast.error('Failed to refresh scripts');
                      }
                    }}
                    className="border-orange-300 text-orange-600 hover:bg-orange-50"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Scripts
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      localStorage.removeItem('antidetect_rpa_scripts');
                      toast.info('Cleared localStorage - refresh to see defaults');
                    }}
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    🗑️ Clear Storage
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      // Direct localStorage inspection
                      const rawData = localStorage.getItem('antidetect_rpa_scripts');
                      console.log('🕵️ RAW localStorage data:', rawData);
                      
                      if (rawData) {
                        try {
                          const parsed = JSON.parse(rawData);
                          console.log('✅ Parsed successfully:', parsed);
                          alert(`Found ${parsed.length} scripts in localStorage:\n${parsed.map(s => `- ${s.name} (${s.category})`).join('\n')}`);
                        } catch (e) {
                          console.error('❌ Parse error:', e);
                          alert('Error parsing localStorage data: ' + e.message);
                        }
                      } else {
                        alert('No RPA scripts found in localStorage');
                      }
                    }}
                    className="border-orange-300 text-orange-600 hover:bg-orange-50"
                  >
                    🔍 Inspect Storage
                  </Button>
                </div>
                
                {/* Debug info */}
                <div className="text-xs text-gray-500 mb-2">
                  🔍 Debug: Showing {availableRPAScripts.length} scripts in state
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableRPAScripts.map((script) => {
                    console.log('📄 Rendering script:', script.name, script.id);
                    return (
                      <Card 
                        key={script.id} 
                        className={`cursor-pointer transition-all ${
                          selectedRPAScript === script.id 
                            ? 'border-blue-500 bg-orange-50 shadow-md' 
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                        }`}
                        onClick={() => setSelectedRPAScript(script.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">🤖</span>
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 mb-1">{script.name}</h3>
                              <p className="text-sm text-gray-600 mb-2">{script.description}</p>
                              <Badge variant="outline" className="text-xs">
                                {script.scriptType}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {availableRPAScripts.length === 0 && (
                    <div className="col-span-2 text-center text-gray-500 py-8">
                      No RPA scripts available. Create scripts in the RPA Manager first.
                    </div>
                  )}
                </div>
              </div>

              {selectedRPAScript && (
                <>
                  <Card className="bg-gray-50 border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-sm">🧵 Threads Configuration</CardTitle>
                      <p className="text-xs text-gray-600">Configure how many profiles run simultaneously</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-4">
                        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                          <h4 className="font-semibold text-orange-900 mb-2">Automation Settings</h4>
                          <p className="text-sm text-orange-700">
                            Scripts will run on all selected profiles simultaneously. Each profile will execute the automation script independently.
                          </p>
                        </div>
                      </div>
                      <div className="bg-orange-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-orange-700">
                          <Bot className="w-4 h-4" />
                          <span className="font-medium">Execution Plan:</span>
                        </div>
                        <p className="text-sm text-orange-600 mt-1">
                          Will execute "{availableRPAScripts.find(s => s.id === selectedRPAScript)?.name}" on {selectedProfiles.length} profiles simultaneously.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
              <Button 
                variant="outline" 
                onClick={() => setShowRPAModal(false)}
                className="border-gray-300"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleRunRPAScript}
                disabled={!selectedRPAScript}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Bot className="w-4 h-4 mr-2" />
                Start RPA Script on {selectedProfiles.length} Profiles
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Individual Profile Script Runner Modal */}
      {isRPAModalOpen && selectedProfile && (
        <Dialog open={isRPAModalOpen} onOpenChange={setIsRPAModalOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Bot className="h-5 w-5 text-purple-600" />
                Run Automation Script
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Select a script to run on profile: <span className="font-semibold text-gray-900">{selectedProfile.name}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Profile Info */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-orange-400 to-red-500 rounded-md">
                    {getDeviceIcon(selectedProfile)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">{selectedProfile.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>Platform: {getPlatformDisplayInfo(selectedProfile.userAgentPlatform).name}</span>
                      <span>Proxy: {formatProxyDisplay(selectedProfile)}</span>
                      <Badge 
                        variant={selectedProfile.isActive ? 'default' : 'secondary'} 
                        className={`text-xs ${
                          selectedProfile.isActive ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}
                      >
                        {selectedProfile.isActive ? '🟢 Active' : '🔴 Inactive'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Script Selection */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Available Scripts ({availableRPAScripts.length})</h4>
                {availableRPAScripts.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                    <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No automation scripts available</p>
                    <p className="text-sm text-gray-400">Create scripts in the RPA Dashboard to use automation</p>
                  </div>
                ) : (
                  <div className="grid gap-3 max-h-60 overflow-y-auto">
                    {availableRPAScripts.map((script) => (
                      <div
                        key={script.id}
                        className={`p-4 rounded-lg border cursor-pointer transition-all ${
                          selectedRPAScript === script.id
                            ? 'border-purple-300 bg-purple-50 shadow-md'
                            : 'border-gray-200 bg-white hover:border-purple-200 hover:bg-purple-25'
                        }`}
                        onClick={() => setSelectedRPAScript(script.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h5 className="font-semibold text-gray-900">{script.name}</h5>
                              <Badge variant="outline" className="text-xs">
                                {script.scriptType}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {script.executionTime}min
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{script.description}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>Website: {script.websiteUrl || 'Any'}</span>
                              <span>Executions: {script.executionCount}</span>
                              {script.lastExecuted && (
                                <span>Last: {new Date(script.lastExecuted).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                          <div className="ml-4">
                            {selectedRPAScript === script.id ? (
                              <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-3 h-3 text-white" />
                              </div>
                            ) : (
                              <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Execution Settings */}
              {selectedRPAScript && (
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <h4 className="font-semibold text-gray-900 mb-3">Execution Settings</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Label className="text-sm font-medium text-gray-700">Auto-close after completion:</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={closeAfterCompletion}
                          onChange={(e) => setCloseAfterCompletion(e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-600">Close profiles automatically when script completes</span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>• Script will run automatically when profile browser opens</p>
                      <p>• Browser will close after script completion (if enabled)</p>
                      <p>• You can monitor progress in the execution panel</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
              <Button 
                variant="outline" 
                onClick={() => setIsRPAModalOpen(false)}
                className="border-gray-300"
              >
                Cancel
              </Button>
              <Button 
                onClick={async () => {
                  if (selectedRPAScript && selectedProfile) {
                    const script = availableRPAScripts.find(s => s.id === selectedRPAScript);
                    if (script) {
                      setIsRPAModalOpen(false);
                      await handleRunSingleProfileScript(script, selectedProfile);
                    }
                  }
                }}
                disabled={!selectedRPAScript || !selectedProfile.isActive}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Play className="w-4 h-4 mr-2" />
                Run Script
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Profile Panel */}
      <ProfilePanel
        isOpen={isProfilePanelOpen}
        onClose={() => setIsProfilePanelOpen(false)}
        profile={selectedProfile}
        onSave={handleSaveProfile}
        onDelete={(id: string) => {
          const profile = profiles.find(p => p.id === id);
          if (profile) {
            handleDeleteProfile(profile);
          }
        }}
      />

      {/* Create Profile Panel */}
      <CreateProfilePanel
        isOpen={isCreatePanelOpen}
        onClose={() => setIsCreatePanelOpen(false)}
        onProfileCreated={handleProfileCreated}
      />
    </div>
  );
}

export default ProfileManager;
