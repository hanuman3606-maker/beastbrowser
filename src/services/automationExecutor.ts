import { RPATask, RPAStep, RPAExecution } from '@/types/rpa';
import { enhancedRPAService } from './enhancedRPAService';
import { Profile } from '@/components/profiles/CreateProfileModal';
import { browserRPAService } from './browserRPAService';

export class AutomationExecutor {
  private static instance: AutomationExecutor;
  private activeExecutions = new Map<string, RPAExecution>();

  static getInstance(): AutomationExecutor {
    if (!AutomationExecutor.instance) {
      AutomationExecutor.instance = new AutomationExecutor();
    }
    return AutomationExecutor.instance;
  }

  // Execute a task on multiple profiles
  async executeTaskOnProfiles(taskId: string, profiles: Profile[]): Promise<void> {
    const task = enhancedRPAService.getTaskById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    console.log(`🚀 Starting bulk execution of "${task.name}" on ${profiles.length} profiles`);
    
    // Create executions for each profile
    const executions = profiles.map(profile => {
      const execution = enhancedRPAService.createExecution(taskId, profile.id, profile.name);
      this.activeExecutions.set(execution.id, execution);
      return execution;
    });

    // Execute tasks concurrently on all profiles
    const promises = executions.map(execution => 
      this.executeTaskOnProfile(task, execution)
    );

    try {
      await Promise.allSettled(promises);
      console.log(`✅ Bulk execution completed for "${task.name}"`);
    } catch (error) {
      console.error('❌ Bulk execution failed:', error);
    }
  }

  // Execute a single task on one profile
  private async executeTaskOnProfile(task: RPATask, execution: RPAExecution): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Update execution status to running
      enhancedRPAService.updateExecution(execution.id, {
        status: 'running',
        currentStep: 0
      });

      enhancedRPAService.addExecutionLog(execution.id, {
        level: 'info',
        message: `Starting execution of "${task.name}" on profile "${execution.profileName}"`,
        step: 0,
        stepName: 'Initialization'
      });

      // Execute the task using browser RPA service
      const profile = { id: execution.profileId, name: execution.profileName } as Profile;
      const result = await browserRPAService.executeTaskOnProfile(task, profile);

      // Mark execution as completed
      const duration = Date.now() - startTime;
      enhancedRPAService.updateExecution(execution.id, {
        status: 'completed',
        endTime: new Date().toISOString(),
        duration,
        result
      });

      enhancedRPAService.addExecutionLog(execution.id, {
        level: 'info',
        message: `Task completed successfully in ${duration}ms`,
        step: task.steps.length,
        stepName: 'Completion'
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      enhancedRPAService.updateExecution(execution.id, {
        status: 'failed',
        endTime: new Date().toISOString(),
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      enhancedRPAService.addExecutionLog(execution.id, {
        level: 'error',
        message: `Task failed: ${error}`,
        step: execution.currentStep || 0,
        stepName: 'Error'
      });
    } finally {
      this.activeExecutions.delete(execution.id);
    }
  }

  // Stop execution for a profile
  async stopExecution(executionId: string): Promise<void> {
    const execution = this.activeExecutions.get(executionId);
    if (execution) {
      enhancedRPAService.updateExecution(executionId, {
        status: 'cancelled',
        endTime: new Date().toISOString()
      });
      
      enhancedRPAService.addExecutionLog(executionId, {
        level: 'info',
        message: 'Execution stopped by user',
        step: execution.currentStep || 0,
        stepName: 'Cancellation'
      });

      this.activeExecutions.delete(executionId);
    }
  }

  // Get active executions
  getActiveExecutions(): RPAExecution[] {
    return Array.from(this.activeExecutions.values());
  }

  // Utility delay function
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const automationExecutor = AutomationExecutor.getInstance();