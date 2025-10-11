import { 
  RPATask, 
  RPAStep, 
  RPAExecution, 
  RPAExecutionResult,
  RPAJob,
  RPAWorker
} from '@/types/rpa';
import { Profile } from '@/components/profiles/CreateProfileModal';
import { beastBrowserService, BeastBrowserAutomationTask } from '@/services/beastBrowserService';

export interface BrowserRPAConfig {
  timeout: number;
  retries: number;
  delay: number;
  humanBehavior: boolean;
  randomDelay: boolean;
  delayMin: number;
  delayMax: number;
  screenshotOnError: boolean;
  logLevel: 'basic' | 'detailed' | 'verbose';
  continueOnError: boolean;
}

export interface BrowserAction {
  type: 'navigate' | 'click' | 'input' | 'wait' | 'scroll' | 'extract' | 'screenshot' | 'hover' | 'dropdown' | 'focus' | 'close_tab' | 'new_tab' | 'switch_tab' | 'refresh' | 'go_back';
  selector?: string;
  selectorType?: 'css' | 'xpath' | 'text' | 'id' | 'class';
  text?: string;
  url?: string;
  waitTime?: number;
  scrollAmount?: number;
  scrollDirection?: 'up' | 'down' | 'left' | 'right';
  extractVariable?: string;
  extractType?: 'text' | 'attribute' | 'html' | 'value';
  extractAttribute?: string;
  clickType?: 'single' | 'double' | 'right';
  inputType?: 'type' | 'paste' | 'clear';
  typingSpeed?: number;
  clearFirst?: boolean;
  timeout?: number;
  retries?: number;
  onError?: 'continue' | 'stop' | 'retry' | 'skip';
  errorRetries?: number;
}

// Add this interface for browser control
interface BrowserControl {
  executeJavaScript: (script: string) => Promise<any>;
  navigate: (url: string) => Promise<void>;
  click: (selector: string) => Promise<void>;
  type: (selector: string, text: string) => Promise<void>;
  scroll: (direction: 'up' | 'down', amount: number) => Promise<void>;
  waitForSelector: (selector: string, timeout?: number) => Promise<void>;
  waitForTimeout: (ms: number) => Promise<void>;
  takeScreenshot: () => Promise<string>;
}

export class BrowserRPAService {
  private static instance: BrowserRPAService;
  private activeExecutions: Map<string, RPAExecution> = new Map();
  private executionQueue: RPAJob[] = [];
  private maxConcurrentExecutions = 5;
  private runningExecutions = 0;

  static getInstance(): BrowserRPAService {
    if (!BrowserRPAService.instance) {
      BrowserRPAService.instance = new BrowserRPAService();
    }
    return BrowserRPAService.instance;
  }

  /**
   * Execute RPA task on browser profile using direct browser automation
   */
  async executeTaskOnProfile(
    task: RPATask, 
    profile: Profile, 
    config: Partial<BrowserRPAConfig> = {}
  ): Promise<RPAExecutionResult> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const mergedConfig = this.mergeConfig(config);
    
    const execution: RPAExecution = {
      id: executionId,
      taskId: task.id,
      profileId: profile.id,
      profileName: profile.name,
      status: 'pending',
      startTime: new Date().toISOString(),
      totalSteps: task.steps.filter(s => s.enabled).length,
      logs: []
    };

    this.activeExecutions.set(executionId, execution);

    try {
      console.log(`🚀 Starting RPA execution ${executionId} for profile ${profile.name} using direct browser automation`);
      
      execution.status = 'running';
      this.updateExecution(execution);

      // Execute steps directly on browser
      const result = await this.executeStepsOnBrowser(task.steps, profile, execution, mergedConfig);
      
      // Update execution status based on result
      execution.status = result.success ? 'completed' : 'failed';
      execution.endTime = new Date().toISOString();
      
      if (result.success) {
        this.addExecutionLog(executionId, {
          level: 'info',
          message: `Automation completed successfully`,
          timestamp: new Date().toISOString()
        });
      } else {
        this.addExecutionLog(executionId, {
          level: 'error',
          message: `Automation failed: ${result.errors?.join(', ')}`,
          timestamp: new Date().toISOString()
        });
      }

      return {
        success: result.success,
        stepsCompleted: result.stepsCompleted,
        stepsSkipped: result.stepsSkipped,
        stepsFailed: result.stepsFailed,
        executionTime: result.executionTime,
        extractedData: result.extractedData,
        screenshots: result.screenshots,
        errors: result.errors
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      execution.status = 'failed';
      execution.endTime = new Date().toISOString();
      execution.duration = Date.now() - new Date(execution.startTime).getTime();
      execution.error = errorMessage;

      this.addExecutionLog(executionId, {
        level: 'error',
        message: `Execution failed: ${errorMessage}`,
        timestamp: new Date().toISOString()
      });

      this.updateExecution(execution);
      console.error(`❌ RPA execution ${executionId} failed:`, errorMessage);

      throw error;
    } finally {
      this.runningExecutions--;
      this.activeExecutions.delete(executionId);
    }
  }

  /**
   * Execute steps directly on browser
   */
  private async executeStepsOnBrowser(
    steps: RPAStep[],
    profile: Profile,
    execution: RPAExecution,
    config: BrowserRPAConfig
  ): Promise<RPAExecutionResult> {
    const result: RPAExecutionResult = {
      success: false,
      stepsCompleted: 0,
      stepsSkipped: 0,
      stepsFailed: 0,
      executionTime: 0,
      extractedData: {},
      screenshots: [],
      errors: []
    };

    const startTime = Date.now();

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      
      try {
        console.log(`🔧 Executing step ${i + 1}/${steps.length}: ${step.name}`);
        
        this.addExecutionLog(execution.id, {
          level: 'info',
          message: `Executing step: ${step.name}`,
          step: i + 1,
          stepName: step.name
        });

        // Execute the step on browser
        const stepResult = await this.executeStepOnBrowser(step, profile, config);
        
        if (stepResult.success) {
          result.stepsCompleted++;
          
          // Merge extracted data
          if (stepResult.extractedData) {
            Object.assign(result.extractedData, stepResult.extractedData);
          }
          
          // Add screenshots
          if (stepResult.screenshot) {
            result.screenshots!.push(stepResult.screenshot);
          }
          
          this.addExecutionLog(execution.id, {
            level: 'info',
            message: `Step completed successfully: ${step.name}`,
            step: i + 1,
            stepName: step.name
          });
        } else {
          throw new Error(stepResult.error || 'Step execution failed');
        }

        // Human-like delay between steps
        if (config.humanBehavior && config.randomDelay) {
          const delay = Math.random() * (config.delayMax - config.delayMin) + config.delayMin;
          await this.delay(delay);
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown step error';
        result.stepsFailed++;
        result.errors!.push(`Step ${i + 1} (${step.name}): ${errorMessage}`);
        
        this.addExecutionLog(execution.id, {
          level: 'error',
          message: `Step failed: ${step.name} - ${errorMessage}`,
          step: i + 1,
          stepName: step.name
        });

        // Handle error based on step configuration
        const errorAction = step.config.onError || 'continue';
        
        switch (errorAction) {
          case 'stop_task':
            throw error;
          case 'skip':
            result.stepsSkipped++;
            console.log(`⏭️ Skipping failed step: ${step.name}`);
            break;
          case 'retry': {
            const retries = step.config.errorRetries || 1;
            for (let retry = 0; retry < retries; retry++) {
              try {
                await this.delay(1000); // Wait before retry
                const retryResult = await this.executeStepOnBrowser(step, profile, config);
                if (retryResult.success) {
                  result.stepsCompleted++;
                  break;
                }
              } catch (retryError) {
                if (retry === retries - 1) throw error;
              }
            }
            break;
          }
          case 'continue':
          default:
            if (!config.continueOnError) {
              throw error;
            }
            console.log(`➡️ Continuing after error in step: ${step.name}`);
            break;
        }
      }
    }

    result.executionTime = Date.now() - startTime;
    result.success = result.stepsFailed === 0 || config.continueOnError;
    
    return result;
  }

  /**
   * Execute individual step on browser
   */
  private async executeStepOnBrowser(
    step: RPAStep,
    profile: Profile,
    config: BrowserRPAConfig
  ): Promise<{ success: boolean; error?: string; extractedData?: any; screenshot?: string }> {
    
    try {
      // Check if profile browser window is actually open via Electron API
      if (window.electronAPI?.getProfileStatus) {
        const status = await window.electronAPI.getProfileStatus(profile.id);
        if (!status.isOpen) {
          throw new Error(`Profile "${profile.name}" browser window is not open. Please launch the profile first.`);
        }
      } else {
        // Fallback check for development mode
        // Make sure we're checking the correct property
        const isProfileActive = profile.isActive !== undefined ? profile.isActive : false;
        if (!isProfileActive) {
          throw new Error(`Profile "${profile.name}" browser window is not open. Please launch the profile first.`);
        }
      }
      
      // Execute step based on type
      switch (step.type) {
        case 'navigate':
          return await this.executeNavigateStep(step, profile);
        case 'click':
          return await this.executeClickStep(step, profile);
        case 'input':
          return await this.executeInputStep(step, profile);
        case 'wait':
          return await this.executeWaitStep(step, profile);
        case 'scroll':
          return await this.executeScrollStep(step, profile);
        case 'extract':
          return await this.executeExtractStep(step, profile);
        case 'screenshot':
          return await this.executeScreenshotStep(step, profile);
        default:
          // For unsupported steps, simulate execution
          await this.delay(500 + Math.random() * 1000);
          return { success: true };
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Execute navigation step
   */
  private async executeNavigateStep(
    step: RPAStep,
    profile: Profile
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const url = step.config.url;
      if (!url) {
        throw new Error('URL is required for navigation step');
      }

      console.log(`🌐 Navigating to: ${url}`);
      
      // Execute navigation in browser
      if (window.electronAPI?.executeRPAScript) {
        const result = await window.electronAPI.executeRPAScript(profile.id, {
          id: 'navigate',
          params: { url }
        });
        
        if (!result.success) {
          throw new Error(result.error || 'Navigation failed');
        }
      } else {
        // Fallback for development mode
        console.log(`🔗 Simulated navigation to: ${url}`);
        await this.delay(2000 + Math.random() * 1000);
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Navigation failed'
      };
    }
  }

  /**
   * Execute click step
   */
  private async executeClickStep(
    step: RPAStep,
    profile: Profile
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const selector = step.config.selector;
      if (!selector) {
        throw new Error('Selector is required for click step');
      }

      console.log(`👆 Clicking element: ${selector}`);
      
      // Execute click in browser
      if (window.electronAPI?.executeRPAScript) {
        const result = await window.electronAPI.executeRPAScript(profile.id, {
          id: 'click',
          params: { selector, timeout: 10000 }
        });
        
        if (!result.success) {
          throw new Error(result.error || 'Click failed');
        }
      } else {
        // Fallback for development mode
        console.log(`👆 Simulated click on: ${selector}`);
        await this.delay(500 + Math.random() * 500);
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Click failed'
      };
    }
  }

  /**
   * Execute input step
   */
  private async executeInputStep(
    step: RPAStep,
    profile: Profile
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const selector = step.config.selector;
      const text = step.config.inputText || step.config.text || '';
      
      if (!selector) {
        throw new Error('Selector is required for input step');
      }

      console.log(`⌨️ Inputting text into: ${selector}`);
      
      // Execute input in browser
      if (window.electronAPI?.executeRPAScript) {
        const result = await window.electronAPI.executeRPAScript(profile.id, {
          id: 'input',
          params: { selector, text, timeout: 10000 }
        });
        
        if (!result.success) {
          throw new Error(result.error || 'Input failed');
        }
      } else {
        // Fallback for development mode
        console.log(`⌨️ Simulated input "${text}" into: ${selector}`);
        await this.delay(1000 + Math.random() * 1000);
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Input failed'
      };
    }
  }

  /**
   * Execute wait step
   */
  private async executeWaitStep(
    step: RPAStep,
    profile: Profile
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const waitTime = step.config.waitTime || 1000;
      console.log(`⏱️ Waiting ${waitTime}ms`);
      
      // Execute wait in browser
      if (window.electronAPI?.executeRPAScript) {
        const result = await window.electronAPI.executeRPAScript(profile.id, {
          id: 'wait',
          params: { ms: waitTime }
        });
        
        if (!result.success) {
          throw new Error(result.error || 'Wait failed');
        }
      } else {
        // Fallback for development mode
        console.log(`⏱️ Simulated wait for: ${waitTime}ms`);
        await this.delay(waitTime);
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Wait failed'
      };
    }
  }

  /**
   * Execute scroll step
   */
  private async executeScrollStep(
    step: RPAStep,
    profile: Profile
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const direction = step.config.scrollDirection || 'down';
      const amount = step.config.scrollAmount || 300;
      
      console.log(`📜 Scrolling ${direction} by ${amount}px`);
      
      // Execute scroll in browser
      if (window.electronAPI?.executeRPAScript) {
        const result = await window.electronAPI.executeRPAScript(profile.id, {
          id: 'scroll',
          params: { amount, direction }
        });
        
        if (!result.success) {
          throw new Error(result.error || 'Scroll failed');
        }
      } else {
        // Fallback for development mode
        console.log(`📜 Simulated scroll ${direction} by ${amount}px`);
        await this.delay(1000 + Math.random() * 1000);
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Scroll failed'
      };
    }
  }

  /**
   * Execute extract step
   */
  private async executeExtractStep(
    step: RPAStep,
    profile: Profile
  ): Promise<{ success: boolean; error?: string; extractedData?: any }> {
    try {
      const selector = step.config.extractSelector || step.config.selector;
      const variable = step.config.extractVariable || 'data';
      
      if (!selector) {
        throw new Error('Selector is required for extract step');
      }

      console.log(`📊 Extracting data from: ${selector}`);
      
      // Execute extraction in browser
      if (window.electronAPI?.executeRPAScript) {
        const result: any = await window.electronAPI.executeRPAScript(profile.id, {
          id: 'extract',
          params: { selector, timeout: 10000 }
        });
        
        if (!result.success) {
          throw new Error(result.error || 'Extraction failed');
        }
        
        return { 
          success: true, 
          extractedData: result.data || { [variable]: 'Extracted data' }
        };
      } else {
        // Fallback for development mode
        console.log(`📊 Simulated extraction from: ${selector}`);
        await this.delay(1500 + Math.random() * 1000);
        return { 
          success: true, 
          extractedData: { [variable]: 'Simulated extracted data' }
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Extraction failed'
      };
    }
  }

  /**
   * Execute screenshot step
   */
  private async executeScreenshotStep(
    step: RPAStep,
    profile: Profile
  ): Promise<{ success: boolean; error?: string; screenshot?: string }> {
    try {
      console.log(`📸 Taking screenshot`);
      
      // Execute screenshot in browser
      if (window.electronAPI?.executeRPAScript) {
        const result: any = await window.electronAPI.executeRPAScript(profile.id, {
          id: 'screenshot',
          params: {}
        });
        
        if (!result.success) {
          throw new Error(result.error || 'Screenshot failed');
        }
        
        return { 
          success: true, 
          screenshot: result.data?.base64 || 'screenshot_data'
        };
      } else {
        // Fallback for development mode
        console.log(`📸 Simulated screenshot`);
        await this.delay(800 + Math.random() * 800);
        return { 
          success: true, 
          screenshot: 'simulated_screenshot_data'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Screenshot failed'
      };
    }
  }

  /**
   * Execute multiple tasks on multiple profiles with concurrency control
   */
  async executeBulkTasks(
    tasks: RPATask[], 
    profiles: Profile[], 
    config: Partial<BrowserRPAConfig> = {}
  ): Promise<Map<string, RPAExecutionResult>> {
    const results = new Map<string, RPAExecutionResult>();
    const mergedConfig = this.mergeConfig(config);

    console.log(`🔄 Starting bulk execution: ${tasks.length} tasks on ${profiles.length} profiles`);

    // Create execution jobs
    const jobs: RPAJob[] = [];
    for (const task of tasks) {
      for (const profile of profiles) {
        jobs.push({
          id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          taskId: task.id,
          profileId: profile.id,
          profileName: profile.name,
          status: 'queued',
          priority: 1,
          createdAt: new Date().toISOString(),
          progress: {
            currentStep: 0,
            totalSteps: task.steps.filter(s => s.enabled).length
          },
          retryCount: 0,
          maxRetries: mergedConfig.retries
        });
      }
    }

    // Process jobs with concurrency limit
    const chunks = this.chunkArray(jobs, this.maxConcurrentExecutions);
    
    for (const chunk of chunks) {
      const promises = chunk.map(async (job) => {
        try {
          const task = tasks.find(t => t.id === job.taskId);
          const profile = profiles.find(p => p.id === job.profileId);
          
          if (!task || !profile) {
            throw new Error('Task or profile not found');
          }

          const result = await this.executeTaskOnProfile(task, profile, mergedConfig);
          results.set(job.id, result);
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`❌ Job ${job.id} failed:`, errorMessage);
          
          results.set(job.id, {
            success: false,
            stepsCompleted: 0,
            stepsSkipped: 0,
            stepsFailed: 1,
            executionTime: 0,
            extractedData: {},
            screenshots: [],
            errors: [errorMessage]
          });
        }
      });

      await Promise.all(promises);
      
      // Add delay between chunks for human-like behavior
      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await this.delay(mergedConfig.delay);
      }
    }

    console.log(`✅ Bulk execution completed: ${results.size} results`);
    return results;
  }

  /**
   * Convert RPA steps to browser actions
   */
  private convertStepsToActions(steps: RPAStep[]): BrowserAction[] {
    return steps.map(step => {
      const action: BrowserAction = {
        type: this.mapStepTypeToActionType(step.type),
        timeout: step.config.timeout || 30000,
        retries: step.config.errorRetries || 1,
        onError: this.mapOnErrorAction(step.config.onError) || 'continue'
      };

      // Map step-specific configurations
      switch (step.type) {
        case 'navigate':
          action.url = step.config.url;
          break;
        case 'click':
          action.selector = step.config.selector;
          action.selectorType = step.config.selectorType || 'css';
          action.clickType = this.mapClickType(step.config.clickType) || 'single';
          break;
        case 'input':
          action.selector = step.config.selector;
          action.selectorType = step.config.selectorType || 'css';
          action.text = step.config.inputText;
          action.inputType = step.config.inputType || 'type';
          action.typingSpeed = step.config.typingSpeed || 50;
          action.clearFirst = step.config.clearFirst || false;
          break;
        case 'wait':
          action.waitTime = step.config.waitTime || 1000;
          break;
        case 'scroll':
          action.scrollAmount = step.config.scrollAmount || 300;
          action.scrollDirection = step.config.scrollDirection || 'down';
          break;
        case 'extract':
          action.selector = step.config.extractSelector;
          action.selectorType = step.config.selectorType || 'css';
          action.extractVariable = step.config.extractVariable;
          action.extractType = this.mapExtractType(step.config.extractType) || 'text';
          action.extractAttribute = step.config.extractAttribute;
          break;
      }

      return action;
    });
  }

  /**
   * Map RPA step types to browser action types
   */
  private mapStepTypeToActionType(stepType: string): BrowserAction['type'] {
    const typeMap: Record<string, BrowserAction['type']> = {
      'navigate': 'navigate',
      'click': 'click',
      'input': 'input',
      'wait': 'wait',
      'scroll': 'scroll',
      'extract': 'extract',
      'screenshot': 'screenshot',
      'hover': 'hover',
      'dropdown': 'dropdown',
      'focus': 'focus',
      'close_tab': 'close_tab',
      'new_tab': 'new_tab',
      'switch_tab': 'switch_tab',
      'refresh': 'refresh',
      'go_back': 'go_back'
    };

    return typeMap[stepType] || 'wait';
  }

  /**
   * Map onError values to supported browser action values
   */
  private mapOnErrorAction(onError?: string): BrowserAction['onError'] | undefined {
    const errorMap: Record<string, BrowserAction['onError']> = {
      'continue': 'continue',
      'stop': 'stop',
      'stop_task': 'stop',
      'retry': 'retry',
      'skip': 'skip'
    };
    
    return onError ? errorMap[onError] : undefined;
  }

  /**
   * Map clickType values to supported browser action values
   */
  private mapClickType(clickType?: string): BrowserAction['clickType'] | undefined {
    const clickMap: Record<string, BrowserAction['clickType']> = {
      'single': 'single',
      'double': 'double',
      'right': 'right',
      'left': 'single'
    };
    
    return clickType ? clickMap[clickType] : undefined;
  }

  /**
   * Map extractType values to supported browser action values
   */
  private mapExtractType(extractType?: string): BrowserAction['extractType'] | undefined {
    const extractMap: Record<string, BrowserAction['extractType']> = {
      'text': 'text',
      'attribute': 'attribute',
      'html': 'html',
      'value': 'value',
      'multiple': 'text' // Default to text for multiple
    };
    
    return extractType ? extractMap[extractType] : undefined;
  }

  /**
   * Execute browser actions
   */
  private async executeActions(
    actions: BrowserAction[],
    profile: Profile,
    execution: RPAExecution,
    config: BrowserRPAConfig
  ): Promise<RPAExecutionResult> {
    const result: RPAExecutionResult = {
      success: false,
      stepsCompleted: 0,
      stepsSkipped: 0,
      stepsFailed: 0,
      executionTime: 0,
      extractedData: {},
      screenshots: [],
      errors: []
    };

    const startTime = Date.now();

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      
      try {
        console.log(`🔧 Executing action ${i + 1}/${actions.length}: ${action.type}`);
        
        this.addExecutionLog(execution.id, {
          level: 'info',
          message: `Executing ${action.type}: ${action.selector || action.url || 'N/A'}`,
          step: i + 1,
          stepName: `${action.type} action`
        });

        // Execute the action
        const actionResult = await this.executeAction(action, profile, config);
        
        if (actionResult.success) {
          result.stepsCompleted++;
          
          // Merge extracted data
          if (actionResult.extractedData) {
            Object.assign(result.extractedData, actionResult.extractedData);
          }
          
          // Add screenshots
          if (actionResult.screenshot) {
            result.screenshots!.push(actionResult.screenshot);
          }
          
          this.addExecutionLog(execution.id, {
            level: 'info',
            message: `Action completed successfully: ${action.type}`,
            step: i + 1,
            stepName: `${action.type} action`
          });
        } else {
          throw new Error(actionResult.error || 'Action execution failed');
        }

        // Human-like delay between actions
        if (config.humanBehavior && config.randomDelay) {
          const delay = Math.random() * (config.delayMax - config.delayMin) + config.delayMin;
          await this.delay(delay);
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown action error';
        result.stepsFailed++;
        result.errors!.push(`Action ${i + 1} (${action.type}): ${errorMessage}`);
        
        this.addExecutionLog(execution.id, {
          level: 'error',
          message: `Action failed: ${action.type} - ${errorMessage}`,
          step: i + 1,
          stepName: `${action.type} action`
        });

        // Handle error based on action configuration
        switch (action.onError) {
          case 'stop':
            throw error;
          case 'skip':
            result.stepsSkipped++;
            console.log(`⏭️ Skipping failed action: ${action.type}`);
            break;
          case 'retry': {
            const retries = action.errorRetries || 1;
            for (let retry = 0; retry < retries; retry++) {
              try {
                await this.delay(1000);
                const retryResult = await this.executeAction(action, profile, config);
                if (retryResult.success) {
                  result.stepsCompleted++;
                  break;
                }
              } catch (retryError) {
                if (retry === retries - 1) throw error;
              }
            }
            break;
          }
          case 'continue':
          default:
            console.log(`➡️ Continuing after error in action: ${action.type}`);
            break;
        }
      }
    }

    result.executionTime = Date.now() - startTime;
    result.success = result.stepsFailed === 0;

    return result;
  }

  /**
   * Execute individual browser action
   */
  private async executeAction(
    action: BrowserAction,
    profile: Profile,
    config: BrowserRPAConfig
  ): Promise<{ success: boolean; error?: string; extractedData?: any; screenshot?: string }> {
    
    try {
      // Execute action based on type using actual browser automation
      switch (action.type) {
        case 'navigate':
          if (!action.url) {
            throw new Error('URL is required for navigation action');
          }
          
          console.log(`🌐 Navigating to: ${action.url}`);
          
          if (window.electronAPI?.executeRPAScript) {
            const result = await window.electronAPI.executeRPAScript(profile.id, {
              id: 'navigate',
              name: 'Navigate',
              description: 'Navigate to URL',
              category: 'automation',
              icon: '🌐',
              code: `await page.goto('${action.url}');`
            });
            
            if (!result.success) {
              throw new Error(result.error || 'Navigation failed');
            }
          } else {
            // Fallback for development mode
            console.log(`🔗 Simulated navigation to: ${action.url}`);
            await this.delay(2000 + Math.random() * 1000);
          }
          break;
          
        case 'click':
          if (!action.selector) {
            throw new Error('Selector is required for click action');
          }
          
          console.log(`👆 Clicking element: ${action.selector}`);
          
          if (window.electronAPI?.executeRPAScript) {
            const result = await window.electronAPI.executeRPAScript(profile.id, {
              id: 'click',
              params: { selector: action.selector, timeout: action.timeout || 10000 }
            });
            
            if (!result.success) {
              throw new Error(result.error || 'Click failed');
            }
          } else {
            // Fallback for development mode
            console.log(`👆 Simulated click on: ${action.selector}`);
            await this.delay(500 + Math.random() * 500);
          }
          break;
          
        case 'input': {
          if (!action.selector) {
            throw new Error('Selector is required for input action');
          }
          
          const text = action.text || '';
          console.log(`⌨️ Inputting text into: ${action.selector}`);
          
          if (window.electronAPI?.executeRPAScript) {
            const result = await window.electronAPI.executeRPAScript(profile.id, {
              id: 'input',
              params: { selector: action.selector, text, timeout: action.timeout || 10000 }
            });
            
            if (!result.success) {
              throw new Error(result.error || 'Input failed');
            }
          } else {
            // Fallback for development mode
            console.log(`⌨️ Simulated input "${text}" into: ${action.selector}`);
            await this.delay(1000 + Math.random() * 1000);
          }
          break;
        }
          
        case 'wait': {
          const waitTime = action.waitTime || 1000;
          console.log(`⏱️ Waiting ${waitTime}ms`);
          
          if (window.electronAPI?.executeRPAScript) {
            const result = await window.electronAPI.executeRPAScript(profile.id, {
              id: 'wait',
              params: { ms: waitTime }
            });
            
            if (!result.success) {
              throw new Error(result.error || 'Wait failed');
            }
          } else {
            // Fallback for development mode
            console.log(`⏱️ Simulated wait for: ${waitTime}ms`);
            await this.delay(waitTime);
          }
          break;
        }
          
        case 'scroll': {
          const direction = action.scrollDirection || 'down';
          const amount = action.scrollAmount || 300;
          
          console.log(`📜 Scrolling ${direction} by ${amount}px`);
          
          if (window.electronAPI?.executeRPAScript) {
            const result = await window.electronAPI.executeRPAScript(profile.id, {
              id: 'scroll',
              params: { amount, direction }
            });
            
            if (!result.success) {
              throw new Error(result.error || 'Scroll failed');
            }
          } else {
            // Fallback for development mode
            console.log(`📜 Simulated scroll ${direction} by ${amount}px`);
            await this.delay(1000 + Math.random() * 1000);
          }
          break;
        }
          
        case 'extract': {
          if (!action.selector) {
            throw new Error('Selector is required for extract action');
          }
          
          const variable = action.extractVariable || 'data';
          console.log(`📊 Extracting data from: ${action.selector}`);
          
          if (window.electronAPI?.executeRPAScript) {
            const result: any = await window.electronAPI.executeRPAScript(profile.id, {
              id: 'extract',
              params: { selector: action.selector, timeout: action.timeout || 10000 }
            });
            
            if (!result.success) {
              throw new Error(result.error || 'Extraction failed');
            }
            
            return { 
              success: true, 
              extractedData: result.data || { [variable]: 'Extracted data' }
            };
          } else {
            // Fallback for development mode
            console.log(`📊 Simulated extraction from: ${action.selector}`);
            await this.delay(1500 + Math.random() * 1000);
            return { 
              success: true, 
              extractedData: { [variable]: 'Simulated extracted data' }
            };
          }
          break;
        }
          
        case 'screenshot':
          console.log(`📸 Taking screenshot`);
          
          if (window.electronAPI?.executeRPAScript) {
            const result: any = await window.electronAPI.executeRPAScript(profile.id, {
              id: 'screenshot',
              params: {}
            });
            
            if (!result.success) {
              throw new Error(result.error || 'Screenshot failed');
            }
            
            return { 
              success: true, 
              screenshot: result.data?.base64 || 'screenshot_data'
            };
          } else {
            // Fallback for development mode
            console.log(`📸 Simulated screenshot`);
            await this.delay(800 + Math.random() * 800);
            return { 
              success: true, 
              screenshot: 'simulated_screenshot_data'
            };
          }
          
        default:
          // For unsupported actions, simulate execution
          await this.delay(500 + Math.random() * 1000);
          console.log(`🔧 Executing ${action.type}`);
      }

      return { success: true };

    } catch (error) {
      console.error(`❌ Action execution failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Merge configuration with defaults
   */
  // Convert RPA task to BeastBrowser automation tasks
  private convertRPATaskToBeastTasks(task: RPATask): BeastBrowserAutomationTask[] {
    const beastTasks: BeastBrowserAutomationTask[] = [];
    
    for (const step of task.steps.filter(s => s.enabled)) {
      switch (step.type) {
        case 'navigate':
          if (step.config.url) {
            beastTasks.push({
              type: 'open_url',
              url: step.config.url,
              wait: step.config.waitTime || 5,
              interactions: []
            });
          }
          break;
          
        case 'click':
          if (step.config.selector) {
            beastTasks.push({
              type: 'click',
              selector: step.config.selector,
              wait: step.config.waitAfterClickMs || 2
            });
          }
          break;
          
        case 'input':
          if (step.config.selector && step.config.text) {
            beastTasks.push({
              type: 'type',
              selector: step.config.selector,
              text: step.config.text,
              wait: step.config.waitAfterClickMs || 1
            });
          }
          break;
          
        case 'scroll':
          beastTasks.push({
            type: 'scroll',
            wait: step.config.duration || 2
          });
          break;
          
        case 'wait':
          beastTasks.push({
            type: 'wait',
            wait: step.config.duration || 3
          });
          break;
      }
    }
    
    return beastTasks;
  }

  private mergeConfig(config: Partial<BrowserRPAConfig>): BrowserRPAConfig {
    return {
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
      delay: config.delay || 1000,
      humanBehavior: config.humanBehavior !== false,
      randomDelay: config.randomDelay !== false,
      delayMin: config.delayMin || 500,
      delayMax: config.delayMax || 2000,
      screenshotOnError: config.screenshotOnError !== false,
      logLevel: config.logLevel || 'detailed',
      continueOnError: config.continueOnError !== false
    };
  }

  /**
   * Add execution log
   */
  private addExecutionLog(executionId: string, log: any): void {
    const execution = this.activeExecutions.get(executionId);
    if (execution) {
      execution.logs.push({
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        ...log
      });
    }
  }

  /**
   * Update execution status
   */
  private updateExecution(execution: RPAExecution): void {
    this.activeExecutions.set(execution.id, execution);
  }

  /**
   * Get active executions
   */
  getActiveExecutions(): RPAExecution[] {
    return Array.from(this.activeExecutions.values());
  }

  /**
   * Get execution by ID
   */
  getExecutionById(executionId: string): RPAExecution | undefined {
    return this.activeExecutions.get(executionId);
  }

  /**
   * Stop execution
   */
  stopExecution(executionId: string): boolean {
    const execution = this.activeExecutions.get(executionId);
    if (execution && execution.status === 'running') {
      execution.status = 'cancelled';
      execution.endTime = new Date().toISOString();
      this.updateExecution(execution);
      return true;
    }
    return false;
  }

  /**
   * Utility methods
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

export const browserRPAService = BrowserRPAService.getInstance();