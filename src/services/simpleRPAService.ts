import { Profile } from '@/components/profiles/CreateProfileModal';

export interface SimpleRPAScript {
  id: string;
  name: string;
  websiteUrl: string;
  javascriptCode: string;
  duration: number; // in seconds
  createdAt: string;
  updatedAt: string;
}

export class SimpleRPAService {
  private static instance: SimpleRPAService;
  private readonly SCRIPTS_KEY = 'beastbrowser_simple_rpa_scripts';

  static getInstance(): SimpleRPAService {
    if (!SimpleRPAService.instance) {
      SimpleRPAService.instance = new SimpleRPAService();
    }
    return SimpleRPAService.instance;
  }

  // Get all saved scripts
  getAllScripts(): SimpleRPAScript[] {
    try {
      const saved = localStorage.getItem(this.SCRIPTS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Failed to load simple RPA scripts:', error);
      return [];
    }
  }

  // Get script by ID
  getScriptById(scriptId: string): SimpleRPAScript | undefined {
    return this.getAllScripts().find(script => script.id === scriptId);
  }

  // Create a new script
  createScript(script: Omit<SimpleRPAScript, 'id' | 'createdAt' | 'updatedAt'>): SimpleRPAScript {
    const newScript: SimpleRPAScript = {
      ...script,
      id: `simple_script_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const scripts = this.getAllScripts();
    scripts.push(newScript);
    this.saveScripts(scripts);

    return newScript;
  }

  // Update an existing script
  updateScript(scriptId: string, updates: Partial<SimpleRPAScript>): void {
    const scripts = this.getAllScripts();
    const index = scripts.findIndex(script => script.id === scriptId);

    if (index !== -1) {
      scripts[index] = {
        ...scripts[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      this.saveScripts(scripts);
    }
  }

  // Delete a script
  deleteScript(scriptId: string): void {
    const scripts = this.getAllScripts();
    const filteredScripts = scripts.filter(script => script.id !== scriptId);
    this.saveScripts(filteredScripts);
  }

  // Save scripts to localStorage
  private saveScripts(scripts: SimpleRPAScript[]): void {
    localStorage.setItem(this.SCRIPTS_KEY, JSON.stringify(scripts));
  }

  // Execute script on a profile
  async executeScriptOnProfile(script: SimpleRPAScript, profile: Profile): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if profile browser window is actually open via Electron API
      if (window.electronAPI?.getProfileStatus) {
        const status = await window.electronAPI.getProfileStatus(profile.id);
        if (!status.isOpen) {
          throw new Error(`Profile "${profile.name}" browser window is not open. Please launch the profile first.`);
        }
      } else {
        // Fallback check for development mode
        const isProfileActive = profile.isActive !== undefined ? profile.isActive : false;
        if (!isProfileActive) {
          throw new Error(`Profile "${profile.name}" browser window is not open. Please launch the profile first.`);
        }
      }

      // First navigate to the website
      if (script.websiteUrl) {
        console.log(`🌐 Navigating to: ${script.websiteUrl}`);
        if (window.electronAPI?.executeRPAScript) {
          const navigateResult = await window.electronAPI.executeRPAScript(profile.id, {
            id: 'navigate',
            params: { url: script.websiteUrl }
          });

          if (!navigateResult.success) {
            throw new Error(navigateResult.error || 'Navigation failed');
          }
        } else {
          // Fallback for development mode
          console.log(`🔗 Simulated navigation to: ${script.websiteUrl}`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // Wait for page to load
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Execute the JavaScript code
      console.log(`🤖 Executing JavaScript code`);
      if (window.electronAPI?.executeRPAScript) {
        // Execute the JavaScript code directly without wrapping it
        const jsResult = await window.electronAPI.executeRPAScript(profile.id, {
          id: 'execute_js',
          params: { code: script.javascriptCode }
        });

        if (!jsResult.success) {
          throw new Error(jsResult.error || 'JavaScript execution failed');
        }
      } else {
        // Fallback for development mode
        console.log(`🤖 Simulated JavaScript execution`);
        console.log(`Code: ${script.javascriptCode}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Wait for the specified duration
      if (script.duration > 0) {
        console.log(`⏱️ Waiting for ${script.duration} seconds`);
        await new Promise(resolve => setTimeout(resolve, script.duration * 1000));
      }

      // Close the browser if needed
      // Note: We don't automatically close the browser here as it's managed by the profile manager

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Simple RPA execution failed:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }
}

export const simpleRPAService = SimpleRPAService.getInstance();