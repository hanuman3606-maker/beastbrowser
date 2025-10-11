import { enhancedRPAService } from './enhancedRPAService';
import { RPATask } from '@/types/rpa';

export interface RPAScript {
  id: string;
  name: string;
  description: string;
  category: 'social' | 'ecommerce' | 'data' | 'automation';
  icon: string;
  code: string;
  isRunning?: boolean;
  lastRun?: Date;
  isFromEnhancedRPA?: boolean; // Flag to identify tasks from enhancedRPAService
}

export class RPAService {
  private static instance: RPAService;
  
  static getInstance(): RPAService {
    if (!RPAService.instance) {
      RPAService.instance = new RPAService();
    }
    return RPAService.instance;
  }

  // Get all RPA scripts from localStorage ONLY (no enhanced RPA tasks)
  getAllScripts(): RPAScript[] {
    try {
      // Get scripts ONLY from antidetect_rpa_scripts
      const savedScripts = localStorage.getItem('antidetect_rpa_scripts');
      let scripts: RPAScript[] = [];
      
      if (savedScripts) {
        const parsed = JSON.parse(savedScripts);
        if (Array.isArray(parsed)) {
          scripts = parsed;
        }
      }
      
      console.log('✅ RPA Scripts loaded from antidetect_rpa_scripts:', scripts.length);
      
      // DO NOT load default scripts if empty - user should create their own
      // DO NOT load from beastbrowser_rpa_tasks - that's old dummy data
      
      return scripts;
    } catch (error) {
      console.error('Failed to load RPA scripts:', error);
      return [];
    }
  }

  // Save scripts to localStorage
  saveScripts(scripts: RPAScript[]): void {
    try {
      localStorage.setItem('antidetect_rpa_scripts', JSON.stringify(scripts));
    } catch (error) {
      console.error('Failed to save RPA scripts:', error);
    }
  }

  // Add a new script
  addScript(script: Omit<RPAScript, 'id'>): RPAScript {
    const newScript: RPAScript = {
      ...script,
      id: `script_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    const existingScripts = this.getAllScripts();
    const updatedScripts = [...existingScripts, newScript];
    this.saveScripts(updatedScripts);
    
    return newScript;
  }

  // Update existing script
  updateScript(scriptId: string, updates: Partial<RPAScript>): void {
    const scripts = this.getAllScripts();
    const updatedScripts = scripts.map(script => 
      script.id === scriptId ? { ...script, ...updates } : script
    );
    this.saveScripts(updatedScripts);
  }

  // Delete script
  deleteScript(scriptId: string): void {
    const scripts = this.getAllScripts();
    const updatedScripts = scripts.filter(script => script.id !== scriptId);
    this.saveScripts(updatedScripts);
  }

  // Get script by ID
  getScriptById(scriptId: string): RPAScript | undefined {
    return this.getAllScripts().find(script => script.id === scriptId);
  }

  // Get scripts by category
  getScriptsByCategory(category: RPAScript['category']): RPAScript[] {
    return this.getAllScripts().filter(script => script.category === category);
  }

  // Mark script as running
  setScriptRunning(scriptId: string, isRunning: boolean): void {
    this.updateScript(scriptId, { 
      isRunning, 
      lastRun: isRunning ? new Date() : undefined 
    });
  }

  // Convert RPATask objects to RPAScript format for compatibility
  private convertTasksToScripts(tasks: RPATask[]): RPAScript[] {
    return tasks.map(task => ({
      id: task.id,
      name: task.name,
      description: task.description,
      category: this.mapTaskCategoryToScriptCategory(task.category),
      icon: task.icon || '🤖',
      code: this.generateCodeFromSteps(task.steps),
      isRunning: false,
      lastRun: task.updatedAt ? new Date(task.updatedAt) : undefined,
      isFromEnhancedRPA: true
    }));
  }

  // Map task categories to script categories
  private mapTaskCategoryToScriptCategory(taskCategory: string): 'social' | 'ecommerce' | 'data' | 'automation' {
    const mapping: Record<string, 'social' | 'ecommerce' | 'data' | 'automation'> = {
      'social': 'social',
      'ecommerce': 'ecommerce', 
      'e-commerce': 'ecommerce',
      'data': 'data',
      'scraping': 'data',
      'automation': 'automation',
      'browser': 'automation',
      'general': 'automation'
    };
    return mapping[taskCategory.toLowerCase()] || 'automation';
  }

  // Generate JavaScript code from RPA steps for display/execution
  private generateCodeFromSteps(steps: any[]): string {
    if (!steps || steps.length === 0) {
      return '// Empty task - no steps defined\nconsole.log("No steps to execute");';
    }

    const codeLines = [
      '// Auto-generated code from RPA Task steps',
      '// This code represents the configured RPA steps',
      ''
    ];

    steps.forEach((step, index) => {
      codeLines.push(`// Step ${index + 1}: ${step.name}`);
      codeLines.push(`// ${step.description || 'No description'}`);
      
      switch (step.type) {
        case 'navigate':
          codeLines.push(`await page.goto('${step.config?.url || 'https://example.com'}');`);
          break;
        case 'click':
          codeLines.push(`await page.click('${step.config?.selector || 'button'}');`);
          break;
        case 'type':
          codeLines.push(`await page.type('${step.config?.selector || 'input'}', '${step.config?.text || 'text'}');`);
          break;
        case 'wait':
          if (step.config?.waitType === 'element') {
            codeLines.push(`await page.waitForSelector('${step.config?.selector || 'body'}');`);
          } else {
            codeLines.push(`await page.waitForTimeout(${step.config?.waitTime || 1000});`);
          }
          break;
        case 'scroll':
          codeLines.push(`await page.evaluate(() => window.scrollBy(0, ${step.config?.distance || 300}));`);
          break;
        case 'screenshot':
          codeLines.push(`await page.screenshot({ path: '${step.config?.filename || 'screenshot.png'}' });`);
          break;
        default:
          codeLines.push(`// Custom step: ${step.type}`);
          codeLines.push(`console.log('Executing step: ${step.name}');`);
      }
      codeLines.push('');
    });

    return codeLines.join('\n');
  }

  // Debug method to check localStorage content from both sources
  debugLocalStorage(): void {
    console.log('🔍 =========================');
    console.log('🔍 DEBUG RPA STORAGE ANALYSIS');
    console.log('🔍 =========================');
    
    // Check original RPA scripts
    const savedScripts = localStorage.getItem('antidetect_rpa_scripts');
    console.log('📂 Original RPA Scripts (antidetect_rpa_scripts):', savedScripts);
    if (savedScripts) {
      try {
        const parsed = JSON.parse(savedScripts);
        console.log('📝 Original scripts count:', Array.isArray(parsed) ? parsed.length : 0);
        if (Array.isArray(parsed)) {
          parsed.forEach((script, index) => {
            console.log(`📄 Original Script ${index + 1}:`, {
              id: script.id,
              name: script.name,
              category: script.category
            });
          });
        }
      } catch (error) {
        console.error('❌ Failed to parse original scripts:', error);
      }
    } else {
      console.log('⚠️ No original scripts found');
    }
    
    // Check enhanced RPA tasks
    const savedTasks = localStorage.getItem('beastbrowser_rpa_tasks');
    console.log('📂 Enhanced RPA Tasks (beastbrowser_rpa_tasks):', savedTasks);
    if (savedTasks) {
      try {
        const parsed = JSON.parse(savedTasks);
        console.log('📝 Enhanced tasks count:', Array.isArray(parsed) ? parsed.length : 0);
        if (Array.isArray(parsed)) {
          parsed.forEach((task, index) => {
            console.log(`📄 Enhanced Task ${index + 1}:`, {
              id: task.id,
              name: task.name,
              category: task.category,
              steps: task.steps?.length || 0
            });
          });
        }
      } catch (error) {
        console.error('❌ Failed to parse enhanced tasks:', error);
      }
    } else {
      console.log('⚠️ No enhanced tasks found');
    }
    
    // Test getAllScripts to see combined result
    const allScripts = this.getAllScripts();
    console.log('🔄 Combined getAllScripts() result:', allScripts.length, 'total scripts');
    allScripts.forEach((script, index) => {
      console.log(`🔗 Combined Script ${index + 1}:`, {
        id: script.id,
        name: script.name,
        category: script.category,
        isFromEnhancedRPA: script.isFromEnhancedRPA || false
      });
    });
    
    console.log('🔍 =========================');
  }

  private getDefaultScripts(): RPAScript[] {
    // Return empty array instead of default scripts as per user request
    return [];
  }
}

export const rpaService = RPAService.getInstance();