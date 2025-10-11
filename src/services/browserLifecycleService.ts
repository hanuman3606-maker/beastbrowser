import { Profile } from '@/components/profiles/CreateProfileModal';

export interface BrowserInstance {
  profileId: string;
  profileName: string;
  status: 'launching' | 'running' | 'closing' | 'closed' | 'error';
  startTime: string;
  lastActivity: string;
  processId?: number;
  windowId?: string;
  url?: string;
  title?: string;
  proxyStatus?: 'testing' | 'connected' | 'failed';
  timezone?: string;
  locale?: string;
  error?: string;
  screenshots: string[];
  rpaExecutions: string[];
}

export interface BrowserLifecycleEvent {
  type: 'launch_start' | 'launch_complete' | 'launch_failed' | 'close_start' | 'close_complete' | 'proxy_test' | 'proxy_connected' | 'proxy_failed' | 'navigation' | 'error';
  profileId: string;
  timestamp: string;
  data?: any;
}

export interface BrowserMetrics {
  totalLaunches: number;
  successfulLaunches: number;
  failedLaunches: number;
  averageLaunchTime: number;
  activeInstances: number;
  totalUptime: number;
  proxySuccessRate: number;
}

export class BrowserLifecycleService {
  private static instance: BrowserLifecycleService;
  private instances: Map<string, BrowserInstance> = new Map();
  private eventHistory: BrowserLifecycleEvent[] = [];
  private eventHandlers: Map<string, (event: BrowserLifecycleEvent) => void> = new Map();
  private metrics: BrowserMetrics = {
    totalLaunches: 0,
    successfulLaunches: 0,
    failedLaunches: 0,
    averageLaunchTime: 0,
    activeInstances: 0,
    totalUptime: 0,
    proxySuccessRate: 0
  };

  static getInstance(): BrowserLifecycleService {
    if (!BrowserLifecycleService.instance) {
      BrowserLifecycleService.instance = new BrowserLifecycleService();
    }
    return BrowserLifecycleService.instance;
  }

  // Browser instance management
  async startBrowserLaunch(profile: Profile): Promise<string> {
    const instanceId = profile.id;
    const now = new Date().toISOString();

    const instance: BrowserInstance = {
      profileId: profile.id,
      profileName: profile.name,
      status: 'launching',
      startTime: now,
      lastActivity: now,
      screenshots: [],
      rpaExecutions: []
    };

    this.instances.set(instanceId, instance);
    this.metrics.totalLaunches++;
    this.activeInstances++;

    // Emit launch start event
    this.emitEvent({
      type: 'launch_start',
      profileId: profile.id,
      timestamp: now,
      data: { profileName: profile.name }
    });

    return instanceId;
  }

  async completeBrowserLaunch(profileId: string, data: { processId?: number; windowId?: string; url?: string; title?: string }): Promise<void> {
    const instance = this.instances.get(profileId);
    if (!instance) return;

    instance.status = 'running';
    instance.processId = data.processId;
    instance.windowId = data.windowId;
    instance.url = data.url;
    instance.title = data.title;
    instance.lastActivity = new Date().toISOString();

    this.metrics.successfulLaunches++;
    this.updateAverageLaunchTime();

    this.emitEvent({
      type: 'launch_complete',
      profileId,
      timestamp: new Date().toISOString(),
      data
    });
  }

  async failBrowserLaunch(profileId: string, error: string): Promise<void> {
    const instance = this.instances.get(profileId);
    if (!instance) return;

    instance.status = 'error';
    instance.error = error;
    instance.lastActivity = new Date().toISOString();

    this.metrics.failedLaunches++;
    this.activeInstances--;

    this.emitEvent({
      type: 'launch_failed',
      profileId,
      timestamp: new Date().toISOString(),
      data: { error }
    });
  }

  async startBrowserClose(profileId: string): Promise<void> {
    const instance = this.instances.get(profileId);
    if (!instance) return;

    instance.status = 'closing';
    instance.lastActivity = new Date().toISOString();

    this.emitEvent({
      type: 'close_start',
      profileId,
      timestamp: new Date().toISOString()
    });
  }

  async completeBrowserClose(profileId: string): Promise<void> {
    const instance = this.instances.get(profileId);
    if (!instance) return;

    instance.status = 'closed';
    instance.lastActivity = new Date().toISOString();

    this.activeInstances--;

    this.emitEvent({
      type: 'close_complete',
      profileId,
      timestamp: new Date().toISOString()
    });

    // Clean up after a delay
    setTimeout(() => {
      this.instances.delete(profileId);
    }, 5000);
  }

  // Proxy status tracking
  async updateProxyStatus(profileId: string, status: 'testing' | 'connected' | 'failed', data?: any): Promise<void> {
    const instance = this.instances.get(profileId);
    if (!instance) return;

    instance.proxyStatus = status;
    instance.lastActivity = new Date().toISOString();

    if (status === 'connected' && data) {
      instance.timezone = data.timezone;
      instance.locale = data.locale;
    }

    this.emitEvent({
      type: status === 'testing' ? 'proxy_test' : status === 'connected' ? 'proxy_connected' : 'proxy_failed',
      profileId,
      timestamp: new Date().toISOString(),
      data
    });
  }

  // Navigation tracking
  async updateNavigation(profileId: string, url: string, title?: string): Promise<void> {
    const instance = this.instances.get(profileId);
    if (!instance) return;

    instance.url = url;
    if (title) instance.title = title;
    instance.lastActivity = new Date().toISOString();

    this.emitEvent({
      type: 'navigation',
      profileId,
      timestamp: new Date().toISOString(),
      data: { url, title }
    });
  }

  // Error handling
  async reportError(profileId: string, error: string, context?: any): Promise<void> {
    const instance = this.instances.get(profileId);
    if (!instance) return;

    instance.error = error;
    instance.lastActivity = new Date().toISOString();

    this.emitEvent({
      type: 'error',
      profileId,
      timestamp: new Date().toISOString(),
      data: { error, context }
    });
  }

  // RPA execution tracking
  async addRPAExecution(profileId: string, executionId: string): Promise<void> {
    const instance = this.instances.get(profileId);
    if (!instance) return;

    if (!instance.rpaExecutions.includes(executionId)) {
      instance.rpaExecutions.push(executionId);
    }
  }

  async removeRPAExecution(profileId: string, executionId: string): Promise<void> {
    const instance = this.instances.get(profileId);
    if (!instance) return;

    instance.rpaExecutions = instance.rpaExecutions.filter(id => id !== executionId);
  }

  // Screenshot tracking
  async addScreenshot(profileId: string, screenshotPath: string): Promise<void> {
    const instance = this.instances.get(profileId);
    if (!instance) return;

    instance.screenshots.push(screenshotPath);
    
    // Keep only last 10 screenshots
    if (instance.screenshots.length > 10) {
      instance.screenshots = instance.screenshots.slice(-10);
    }
  }

  // Event handling
  private emitEvent(event: BrowserLifecycleEvent): Promise<void> {
    this.eventHistory.push(event);
    
    // Keep only last 1000 events
    if (this.eventHistory.length > 1000) {
      this.eventHistory = this.eventHistory.slice(-1000);
    }

    // Notify all handlers
    this.eventHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in browser lifecycle event handler:', error);
      }
    });

    return Promise.resolve();
  }

  onEvent(handler: (event: BrowserLifecycleEvent) => void): string {
    const handlerId = `handler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.eventHandlers.set(handlerId, handler);
    return handlerId;
  }

  removeEventHandler(handlerId: string): void {
    this.eventHandlers.delete(handlerId);
  }

  // Getters
  getInstance(profileId: string): BrowserInstance | undefined {
    return this.instances.get(profileId);
  }

  getAllInstances(): BrowserInstance[] {
    return Array.from(this.instances.values());
  }

  getActiveInstances(): BrowserInstance[] {
    return Array.from(this.instances.values()).filter(instance => 
      instance.status === 'launching' || instance.status === 'running'
    );
  }

  getEventHistory(limit = 100): BrowserLifecycleEvent[] {
    return this.eventHistory.slice(-limit);
  }

  getMetrics(): BrowserMetrics {
    return { ...this.metrics };
  }

  // Metrics calculations
  private updateAverageLaunchTime(): void {
    const events = this.eventHistory.filter(e => 
      e.type === 'launch_start' || e.type === 'launch_complete' || e.type === 'launch_failed'
    );

    const launchTimes: number[] = [];
    const launches = events.filter(e => e.type === 'launch_start');

    for (const launch of launches) {
      const complete = events.find(e => 
        e.profileId === launch.profileId && 
        e.type === 'launch_complete' && 
        new Date(e.timestamp) > new Date(launch.timestamp)
      );

      if (complete) {
        const time = new Date(complete.timestamp).getTime() - new Date(launch.timestamp).getTime();
        launchTimes.push(time);
      }
    }

    if (launchTimes.length > 0) {
      this.metrics.averageLaunchTime = launchTimes.reduce((a, b) => a + b, 0) / launchTimes.length;
    }
  }

  private get activeInstances(): number {
    return Array.from(this.instances.values()).filter(instance => 
      instance.status === 'launching' || instance.status === 'running'
    ).length;
  }

  // Health checks
  async performHealthCheck(): Promise<{ healthy: boolean; issues: string[] }> {
    const issues: string[] = [];
    const instances = this.getAllInstances();

    // Check for stale instances (no activity for 5 minutes)
    const staleThreshold = Date.now() - 5 * 60 * 1000;
    const staleInstances = instances.filter(instance => 
      new Date(instance.lastActivity).getTime() < staleThreshold &&
      (instance.status === 'launching' || instance.status === 'running')
    );

    if (staleInstances.length > 0) {
      issues.push(`${staleInstances.length} browser instances appear stale (no activity > 5 minutes)`);
    }

    // Check for failed launches
    const failedLaunches = instances.filter(instance => instance.status === 'error');
    if (failedLaunches.length > 0) {
      issues.push(`${failedLaunches.length} browser instances failed to launch`);
    }

    // Check for proxy issues
    const proxyIssues = instances.filter(instance => instance.proxyStatus === 'failed');
    if (proxyIssues.length > 0) {
      issues.push(`${proxyIssues.length} browser instances have proxy connection issues`);
    }

    return {
      healthy: issues.length === 0,
      issues
    };
  }

  // Cleanup
  async cleanup(): Promise<void> {
    // Close all active instances
    const activeInstances = this.getActiveInstances();
    
    for (const instance of activeInstances) {
      try {
        await this.startBrowserClose(instance.profileId);
        await this.completeBrowserClose(instance.profileId);
      } catch (error) {
        console.error(`Failed to cleanup instance ${instance.profileId}:`, error);
      }
    }

    this.instances.clear();
    this.eventHandlers.clear();
    this.eventHistory = [];
  }
}

export const browserLifecycleService = BrowserLifecycleService.getInstance();