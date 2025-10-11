import { Profile } from '@/components/profiles/CreateProfileModal';

// BeastBrowser API service for local server communication
const BEASTBROWSER_API_URL = 'http://localhost:3000/api/v1';
const API_KEY = 'beastbrowser-dev-key';

interface BeastBrowserResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp?: string;
}

interface BeastBrowserProfile {
  profileId: string;
  name: string;
  platform: string;
  userAgent: string;
  fingerprint: {
    screen: { width: number; height: number; devicePixelRatio: number };
    languages: string[];
    timezone: string;
  };
  proxy?: {
    type: string;
    host: string;
    port: number;
    geo?: {
      country: string;
      city: string;
      timezone: string;
    };
  };
  status: 'created' | 'open' | 'closed';
  createdAt: string;
  lastSeen: string;
}

interface BeastBrowserProxy {
  type: 'http' | 'https' | 'socks5';
  host: string;
  port: number;
  username?: string;
  password?: string;
}

interface BeastBrowserAutomationTask {
  type: 'open_url' | 'click' | 'type' | 'scroll' | 'wait';
  url?: string;
  selector?: string;
  text?: string;
  wait?: number;
  interactions?: BeastBrowserAutomationTask[];
}

class BeastBrowserService {
  private static instance: BeastBrowserService;

  static getInstance(): BeastBrowserService {
    if (!BeastBrowserService.instance) {
      BeastBrowserService.instance = new BeastBrowserService();
    }
    return BeastBrowserService.instance;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<BeastBrowserResponse<T>> {
    try {
      const response = await fetch(`${BEASTBROWSER_API_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred',
      };
    }
  }

  // Profile Management
  async createProfile(profileData: {
    name: string;
    platform: string;
    userAgent?: string;
    fingerprint_seed?: string;
    proxy?: BeastBrowserProxy;
    timezone_override?: boolean;
  }): Promise<BeastBrowserResponse<BeastBrowserProfile>> {
    return this.request<BeastBrowserProfile>('/profiles/create', {
      method: 'POST',
      body: JSON.stringify(profileData),
    });
  }

  async listProfiles(): Promise<BeastBrowserResponse<{ profiles: BeastBrowserProfile[]; total: number }>> {
    return this.request<{ profiles: BeastBrowserProfile[]; total: number }>('/profiles/list');
  }

  async openProfile(
    profileId: string, 
    options: { headless?: boolean; windowSize?: { width: number; height: number } } = {}
  ): Promise<BeastBrowserResponse<{ profileId: string; browser: { pid: number; wsEndpoint: string } }>> {
    return this.request<{ profileId: string; browser: { pid: number; wsEndpoint: string } }>(`/profiles/${profileId}/open`, {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  async closeProfile(profileId: string): Promise<BeastBrowserResponse<{ profileId: string; status: string }>> {
    return this.request<{ profileId: string; status: string }>(`/profiles/${profileId}/close`, {
      method: 'POST',
    });
  }

  async deleteProfile(profileId: string): Promise<BeastBrowserResponse<{ profileId: string; deleted: boolean }>> {
    return this.request<{ profileId: string; deleted: boolean }>(`/profiles/${profileId}`, {
      method: 'DELETE',
    });
  }

  async cloneProfile(profileId: string, newName: string): Promise<BeastBrowserResponse<{ newProfileId: string }>> {
    return this.request<{ newProfileId: string }>(`/profiles/${profileId}/clone`, {
      method: 'POST',
      body: JSON.stringify({ name: newName }),
    });
  }

  // Proxy Management
  async validateProxy(proxy: BeastBrowserProxy): Promise<BeastBrowserResponse<{
    valid: boolean;
    latency?: number;
    geo?: { country: string; city: string; timezone: string };
    ip?: string;
    error?: string;
  }>> {
    return this.request<{
      valid: boolean;
      latency?: number;
      geo?: { country: string; city: string; timezone: string };
      ip?: string;
      error?: string;
    }>('/proxy/validate', {
      method: 'POST',
      body: JSON.stringify(proxy),
    });
  }

  async updateProfileProxy(profileId: string, proxy: BeastBrowserProxy): Promise<BeastBrowserResponse<{
    profileId: string;
    proxy: BeastBrowserProxy;
  }>> {
    return this.request<{ profileId: string; proxy: BeastBrowserProxy }>(`/profiles/${profileId}/proxy`, {
      method: 'POST',
      body: JSON.stringify(proxy),
    });
  }

  // User-Agent Management
  async getUserAgents(platform: string, limit?: number): Promise<BeastBrowserResponse<{
    platform: string;
    userAgents: string[];
    total: number;
    sample: string;
  }>> {
    const params = new URLSearchParams({ platform });
    if (limit) params.append('limit', limit.toString());
    return this.request<{ platform: string; userAgents: string[]; total: number; sample: string }>(`/useragents/list?${params}`);
  }

  async randomizeUserAgent(profileId: string): Promise<BeastBrowserResponse<{
    profileId: string;
    userAgent: string;
    applied: boolean;
  }>> {
    return this.request<{ profileId: string; userAgent: string; applied: boolean }>(`/profiles/${profileId}/useragent/randomize`, {
      method: 'POST',
    });
  }

  // Automation
  async runAutomation(
    profileId: string,
    tasks: BeastBrowserAutomationTask[],
    options: { concurrency?: number; stopOnProxyExhaust?: boolean } = {}
  ): Promise<BeastBrowserResponse<{
    runId: string;
    profileId: string;
    status: string;
    totalTasks: number;
    completedTasks: number;
  }>> {
    return this.request<{
      runId: string;
      profileId: string;
      status: string;
      totalTasks: number;
      completedTasks: number;
    }>('/automation/run', {
      method: 'POST',
      body: JSON.stringify({
        profileId,
        tasks,
        ...options,
      }),
    });
  }

  async stopAutomation(runId: string): Promise<BeastBrowserResponse<{
    runId: string;
    status: string;
    completedTasks: number;
  }>> {
    return this.request<{ runId: string; status: string; completedTasks: number }>(`/automation/${runId}/stop`, {
      method: 'POST',
    });
  }

  async getAutomationStatus(runId: string): Promise<BeastBrowserResponse<{
    runId: string;
    status: string;
    progress: {
      totalTasks: number;
      completedTasks: number;
      currentTask?: string;
      currentUrl?: string;
    };
    results: any[];
  }>> {
    return this.request<{
      runId: string;
      status: string;
      progress: {
        totalTasks: number;
        completedTasks: number;
        currentTask?: string;
        currentUrl?: string;
      };
      results: any[];
    }>(`/automation/${runId}/status`);
  }

  // Fingerprint
  async generateFingerprint(options: {
    seed?: string;
    platform: string;
    strength?: 'high' | 'medium' | 'low';
  }): Promise<BeastBrowserResponse<{
    fingerprint: any;
    seed: string;
    generatedAt: string;
  }>> {
    return this.request<{ fingerprint: any; seed: string; generatedAt: string }>('/fingerprint/generate', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  async applyFingerprint(profileId: string, fingerprint: any): Promise<BeastBrowserResponse<{
    profileId: string;
    applied: boolean;
    restartRequired: boolean;
  }>> {
    return this.request<{ profileId: string; applied: boolean; restartRequired: boolean }>(`/profiles/${profileId}/fingerprint/apply`, {
      method: 'POST',
      body: JSON.stringify({ fingerprint }),
    });
  }

  // Settings
  async getSettings(): Promise<BeastBrowserResponse<{
    webrtc_disable: boolean;
    disable_plugins: boolean;
    inject_timezone_from_proxy: boolean;
    default_search_engine: string;
    auto_fingerprint_on_create: boolean;
    max_concurrent_profiles: number;
    chromium_path: string;
    default_port: number;
    log_level: string;
    rate_limit: any;
  }>> {
    return this.request('/settings');
  }

  async updateSettings(settings: any): Promise<BeastBrowserResponse<{
    updated: string[];
    updatedAt: string;
  }>> {
    return this.request('/settings/update', {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  }

  // Health
  async getHealth(): Promise<BeastBrowserResponse<{
    status: string;
    uptime: number;
    activeProfiles: number;
    totalProfiles: number;
    systemResources: {
      memory: { used: string; total: string; percentage: number };
      cpu: { usage: number; cores: number };
    };
    chromium: { version: string; path: string; status: string };
    checkedAt: string;
  }>> {
    return this.request('/health');
  }

  // Utility methods
  async ping(): Promise<BeastBrowserResponse<{ status: string }>> {
    return this.request('/health');
  }

  // Convert BeastBrowser profile to app profile format
  convertToAppProfile(beastProfile: BeastBrowserProfile): Profile {
    return {
      id: beastProfile.profileId,
      name: beastProfile.name,
      browserType: 'anti',
      proxyType: beastProfile.proxy?.type as any || 'none',
      proxy: beastProfile.proxy ? {
        host: beastProfile.proxy.host,
        port: beastProfile.proxy.port.toString(),
        username: beastProfile.proxy.username,
        password: beastProfile.proxy.password,
      } : undefined,
      userAgent: beastProfile.userAgent,
      userAgentPlatform: beastProfile.platform,
      timezone: beastProfile.fingerprint.timezone,
      locale: beastProfile.fingerprint.languages[0] || 'en-US',
      fingerprint: beastProfile.fingerprint,
      tags: [],
      notes: '',
      createdAt: beastProfile.createdAt,
      isActive: beastProfile.status === 'open',
      geoData: beastProfile.proxy?.geo ? {
        country: beastProfile.proxy.geo.country,
        city: beastProfile.proxy.geo.city,
        timezone: beastProfile.proxy.geo.timezone,
      } : undefined,
    };
  }

  // Convert app profile to BeastBrowser profile format
  convertToBeastProfile(appProfile: Profile): {
    name: string;
    platform: string;
    userAgent?: string;
    fingerprint_seed?: string;
    proxy?: BeastBrowserProxy;
    timezone_override?: boolean;
  } {
    return {
      name: appProfile.name,
      platform: appProfile.userAgentPlatform,
      userAgent: appProfile.userAgent,
      proxy: appProfile.proxy && appProfile.proxyType !== 'none' ? {
        type: appProfile.proxyType as any,
        host: appProfile.proxy.host,
        port: parseInt(appProfile.proxy.port),
        username: appProfile.proxy.username,
        password: appProfile.proxy.password,
      } : undefined,
      timezone_override: false,
    };
  }
}

export const beastBrowserService = BeastBrowserService.getInstance();
export type { BeastBrowserProfile, BeastBrowserProxy, BeastBrowserAutomationTask };
