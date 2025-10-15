/**
 * RPA Service
 * Manages RPA scripts with localStorage persistence
 */

export interface RPAScript {
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
  category?: string;
  isRunning?: boolean;
}

const STORAGE_KEY = 'antidetect_rpa_scripts';

class RPAService {
  private scripts: Map<string, RPAScript> = new Map();

  constructor() {
    this.loadFromLocalStorage();
  }

  private loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const scripts: RPAScript[] = JSON.parse(stored);
        this.scripts.clear();
        scripts.forEach(script => {
          this.scripts.set(script.id, script);
        });
        console.log(`✅ Loaded ${scripts.length} RPA scripts from localStorage`);
      }
    } catch (error) {
      console.error('Failed to load RPA scripts:', error);
    }
  }

  private saveToLocalStorage(): void {
    try {
      const scripts = Array.from(this.scripts.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scripts));
      console.log(`✅ Saved ${scripts.length} RPA scripts to localStorage`);
    } catch (error) {
      console.error('Failed to save RPA scripts:', error);
    }
  }

  getAllScripts(): RPAScript[] {
    return Array.from(this.scripts.values());
  }

  getScriptById(id: string): RPAScript | undefined {
    return this.scripts.get(id);
  }

  addScript(script: Omit<RPAScript, 'id' | 'createdAt' | 'updatedAt' | 'executionCount'>): RPAScript {
    const newScript: RPAScript = {
      ...script,
      id: `rpa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      executionCount: 0
    };

    this.scripts.set(newScript.id, newScript);
    this.saveToLocalStorage();
    console.log('✅ Added new RPA script:', newScript.name);
    return newScript;
  }

  updateScript(id: string, updates: Partial<RPAScript>): RPAScript | null {
    const script = this.scripts.get(id);
    if (!script) {
      console.error('Script not found:', id);
      return null;
    }

    const updated = {
      ...script,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.scripts.set(id, updated);
    this.saveToLocalStorage();
    console.log('✅ Updated RPA script:', updated.name);
    return updated;
  }

  deleteScript(id: string): boolean {
    const deleted = this.scripts.delete(id);
    if (deleted) {
      this.saveToLocalStorage();
      console.log('✅ Deleted RPA script:', id);
    }
    return deleted;
  }

  setScriptRunning(id: string, isRunning: boolean): void {
    const script = this.scripts.get(id);
    if (script) {
      script.isRunning = isRunning;
      this.scripts.set(id, script);
    }
  }

  debugLocalStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      console.log('📦 RPA Scripts in localStorage:', stored ? JSON.parse(stored) : 'None');
    } catch (error) {
      console.error('Failed to debug localStorage:', error);
    }
  }

  // NO DEFAULT SCRIPTS - User will create their own
  // Removed: createDefaultScrollScript() and initializeDefaults()
  
  clearAllScripts(): void {
    this.scripts.clear();
    this.saveToLocalStorage();
    console.log('✅ Cleared all RPA scripts');
  }
}

export const rpaService = new RPAService();
// NO DEFAULT SCRIPTS - Users create their own
