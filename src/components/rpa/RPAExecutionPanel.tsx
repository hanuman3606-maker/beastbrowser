import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Play, 
  Pause, 
  Square, 
  Clock, 
  User, 
  Globe, 
  Code, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Loader2,
  Eye,
  RefreshCw,
  Zap,
  Activity,
  Timer
} from 'lucide-react';
import { toast } from 'sonner';

interface RPAScript {
  id: string;
  name: string;
  description: string;
  websiteUrl: string;
  executionTime: number;
  scriptType: 'javascript' | 'custom' | 'template';
  scriptContent: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  executionCount: number;
  lastExecuted?: string;
}

interface Profile {
  id: string;
  name: string;
  isActive: boolean;
  userAgent?: string;
  proxy?: any;
  fingerprint?: any;
}

interface ExecutionSession {
  id: string;
  scriptId: string;
  scriptName: string;
  profileId: string;
  profileName: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  startTime: string;
  endTime?: string;
  duration?: number;
  progress: {
    currentStep: number;
    totalSteps: number;
    stepName?: string;
  };
  logs: ExecutionLog[];
  result?: ExecutionResult;
  error?: string;
}

interface ExecutionLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  data?: any;
}

interface ExecutionResult {
  success: boolean;
  stepsCompleted: number;
  stepsSkipped: number;
  stepsFailed: number;
  executionTime: number;
  extractedData?: Record<string, any>;
  screenshots?: string[];
  errors?: string[];
}

const RPAExecutionPanel: React.FC = () => {
  const [scripts, setScripts] = useState<RPAScript[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeExecutions, setActiveExecutions] = useState<ExecutionSession[]>([]);
  const [executionHistory, setExecutionHistory] = useState<ExecutionSession[]>([]);
  
  // Selection states
  const [selectedScript, setSelectedScript] = useState<string>('');
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);

  // Load data from localStorage
  useEffect(() => {
    const savedScripts = localStorage.getItem('antidetect_rpa_scripts');
    const savedProfiles = localStorage.getItem('antidetect_profiles');
    const savedExecutions = localStorage.getItem('rpa_executions');

    if (savedScripts) {
      try {
        const parsedScripts = JSON.parse(savedScripts);
        setScripts(parsedScripts);
      } catch (error) {
        console.error('Failed to parse RPA scripts:', error);
      }
    }
    if (savedProfiles) {
      try {
        const parsedProfiles = JSON.parse(savedProfiles);
        setProfiles(parsedProfiles);
      } catch (error) {
        console.error('Failed to parse profiles:', error);
      }
    }
    if (savedExecutions) {
      try {
        const executions = JSON.parse(savedExecutions);
        setActiveExecutions(executions.filter((e: ExecutionSession) => 
          ['pending', 'running', 'paused'].includes(e.status)
        ));
        setExecutionHistory(executions.filter((e: ExecutionSession) => 
          ['completed', 'failed', 'cancelled'].includes(e.status)
        ));
      } catch (error) {
        console.error('Failed to parse executions:', error);
      }
    }
  }, []);

  // Save executions to localStorage
  useEffect(() => {
    const allExecutions = [...activeExecutions, ...executionHistory];
    localStorage.setItem('rpa_executions', JSON.stringify(allExecutions));
  }, [activeExecutions, executionHistory]);

  const handleStartExecution = async () => {
    if (!selectedScript || !selectedProfile) {
      toast.error('Please select both a script and a profile');
      return;
    }

    const script = scripts.find(s => s.id === selectedScript);
    const profile = profiles.find(p => p.id === selectedProfile);

    if (!script || !profile) {
      toast.error('Selected script or profile not found');
      return;
    }

    if (!profile.isActive) {
      toast.error('Selected profile is not active');
      return;
    }

    setIsExecuting(true);

    try {
      const executionSession: ExecutionSession = {
        id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        scriptId: script.id,
        scriptName: script.name,
        profileId: profile.id,
        profileName: profile.name,
        status: 'pending',
        startTime: new Date().toISOString(),
        progress: {
          currentStep: 0,
          totalSteps: 1
        },
        logs: [
          {
            id: `log_${Date.now()}`,
            timestamp: new Date().toISOString(),
            level: 'info',
            message: `Starting execution of "${script.name}" on profile "${profile.name}"`
          }
        ]
      };

      setActiveExecutions(prev => [...prev, executionSession]);

      // Simulate execution process
      await simulateExecution(executionSession, script);

      toast.success(`Execution started for ${script.name} on ${profile.name}`);
    } catch (error) {
      toast.error('Failed to start execution');
      console.error('Execution error:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const simulateExecution = async (execution: ExecutionSession, script: RPAScript) => {
    try {
      // Update status to running
      setActiveExecutions(prev => 
        prev.map(e => e.id === execution.id ? { ...e, status: 'running' } : e)
      );

      // Add log entry
      addExecutionLog(execution.id, 'info', 'Initializing browser profile...');

      // Simulate browser opening delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      addExecutionLog(execution.id, 'info', `Loading profile configuration...`);

      // Simulate profile loading
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (script.websiteUrl) {
        addExecutionLog(execution.id, 'info', `Navigating to ${script.websiteUrl}...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      addExecutionLog(execution.id, 'info', 'Starting automation script...');

      // Simulate script execution with realistic steps
      const executionSteps = Math.floor(Math.random() * 4) + 3; // 3-6 steps
      const stepNames = [
        'Waiting for page load',
        'Finding target elements',
        'Interacting with page elements',
        'Collecting data',
        'Taking screenshots',
        'Finalizing operations'
      ];

      for (let i = 0; i < executionSteps; i++) {
        await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
        
        const stepName = stepNames[i] || `Step ${i + 1}`;
        addExecutionLog(execution.id, 'info', `${stepName}...`);

        // Update progress
        setActiveExecutions(prev => 
          prev.map(e => e.id === execution.id ? {
            ...e,
            progress: {
              currentStep: i + 1,
              totalSteps: executionSteps,
              stepName: stepName
            }
          } : e)
        );
      }

      // Complete execution
      const endTime = new Date().toISOString();
      const duration = new Date(endTime).getTime() - new Date(execution.startTime).getTime();

      const result: ExecutionResult = {
        success: Math.random() > 0.05, // 95% success rate
        stepsCompleted: executionSteps,
        stepsSkipped: 0,
        stepsFailed: Math.random() > 0.95 ? 1 : 0,
        executionTime: duration,
        extractedData: { 
          timestamp: endTime,
          profile: execution.profileName,
          script: execution.scriptName
        },
        screenshots: ['execution_screenshot.png'],
        errors: Math.random() > 0.95 ? ['Element not found'] : undefined
      };

      const completedExecution: ExecutionSession = {
        ...execution,
        status: result.success ? 'completed' : 'failed',
        endTime,
        duration,
        result,
        error: result.success ? undefined : 'Script execution failed'
      };

      // Move from active to history
      setActiveExecutions(prev => prev.filter(e => e.id !== execution.id));
      setExecutionHistory(prev => [completedExecution, ...prev]);

      // Update script execution count
      setScripts(prev => prev.map(s => 
        s.id === script.id 
          ? { ...s, executionCount: s.executionCount + 1, lastExecuted: endTime }
          : s
      ));

      addExecutionLog(execution.id, result.success ? 'info' : 'error', 
        result.success ? 'Execution completed successfully' : 'Execution failed');

      toast.success(`Execution completed for ${script.name}`);
    } catch (error) {
      console.error('Execution simulation error:', error);
      addExecutionLog(execution.id, 'error', 'Execution failed due to unexpected error');
      
      const failedExecution: ExecutionSession = {
        ...execution,
        status: 'failed',
        endTime: new Date().toISOString(),
        duration: new Date().getTime() - new Date(execution.startTime).getTime(),
        error: 'Unexpected error during execution'
      };

      setActiveExecutions(prev => prev.filter(e => e.id !== execution.id));
      setExecutionHistory(prev => [failedExecution, ...prev]);
      
      toast.error(`Execution failed for ${script.name}`);
    }
  };

  const addExecutionLog = (executionId: string, level: 'info' | 'warning' | 'error' | 'debug', message: string) => {
    const log: ExecutionLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      level,
      message
    };

    setActiveExecutions(prev => 
      prev.map(e => e.id === executionId ? {
        ...e,
        logs: [...e.logs, log]
      } : e)
    );
  };

  const handlePauseExecution = (executionId: string) => {
    setActiveExecutions(prev => 
      prev.map(e => e.id === executionId ? { ...e, status: 'paused' } : e)
    );
    toast.info('Execution paused');
  };

  const handleResumeExecution = (executionId: string) => {
    setActiveExecutions(prev => 
      prev.map(e => e.id === executionId ? { ...e, status: 'running' } : e)
    );
    toast.info('Execution resumed');
  };

  const handleStopExecution = (executionId: string) => {
    const execution = activeExecutions.find(e => e.id === executionId);
    if (execution) {
      const cancelledExecution: ExecutionSession = {
        ...execution,
        status: 'cancelled',
        endTime: new Date().toISOString(),
        duration: new Date().getTime() - new Date(execution.startTime).getTime()
      };

      setActiveExecutions(prev => prev.filter(e => e.id !== executionId));
      setExecutionHistory(prev => [cancelledExecution, ...prev]);
    }
    toast.info('Execution stopped');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'running': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'paused': return <Pause className="h-4 w-4 text-orange-500" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled': return <Square className="h-4 w-4 text-gray-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'paused': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return 'N/A';
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">RPA Execution Panel</h1>
          <p className="text-muted-foreground mt-2">
            Run your automation scripts on browser profiles
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            {activeExecutions.length} Active
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Timer className="h-3 w-3" />
            {executionHistory.length} Completed
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Execution Controls */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Start Execution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Script</label>
                <Select value={selectedScript} onValueChange={setSelectedScript}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a script" />
                  </SelectTrigger>
                  <SelectContent>
                    {scripts.map((script) => (
                      <SelectItem key={script.id} value={script.id}>
                        <div className="flex items-center gap-2">
                          <Code className="h-4 w-4" />
                          {script.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Select Profile</label>
                <Select value={selectedProfile} onValueChange={setSelectedProfile}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a profile" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.filter(p => p.isActive).map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {profile.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedScript && selectedProfile && (
                <div className="bg-muted p-3 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Execution Preview</h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Code className="h-3 w-3" />
                      {scripts.find(s => s.id === selectedScript)?.name}
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3" />
                      {profiles.find(p => p.id === selectedProfile)?.name}
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe className="h-3 w-3" />
                      {scripts.find(s => s.id === selectedScript)?.websiteUrl}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      {scripts.find(s => s.id === selectedScript)?.executionTime} minutes
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={handleStartExecution}
                disabled={!selectedScript || !selectedProfile || isExecuting}
                className="w-full flex items-center gap-2"
              >
                {isExecuting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {isExecuting ? 'Starting...' : 'Start Execution'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Active Executions */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Active Executions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                {activeExecutions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No active executions</p>
                    <p className="text-sm">Start an execution to see it here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeExecutions.map((execution) => (
                      <div key={execution.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {getStatusIcon(execution.status)}
                              <h4 className="font-medium">{execution.scriptName}</h4>
                              <Badge className={getStatusColor(execution.status)}>
                                {execution.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {execution.profileName}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDuration(Date.now() - new Date(execution.startTime).getTime())}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {execution.status === 'running' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePauseExecution(execution.id)}
                              >
                                <Pause className="h-3 w-3" />
                              </Button>
                            )}
                            {execution.status === 'paused' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleResumeExecution(execution.id)}
                              >
                                <Play className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStopExecution(execution.id)}
                            >
                              <Square className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        {execution.status === 'running' && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span>{execution.progress.stepName || 'Processing...'}</span>
                              <span>{execution.progress.currentStep}/{execution.progress.totalSteps}</span>
                            </div>
                            <Progress 
                              value={(execution.progress.currentStep / execution.progress.totalSteps) * 100} 
                              className="h-2"
                            />
                          </div>
                        )}

                        <Separator className="my-3" />

                        <ScrollArea className="h-20">
                          <div className="space-y-1">
                            {execution.logs.slice(-3).map((log) => (
                              <div key={log.id} className="text-xs flex items-start gap-2">
                                <span className="text-muted-foreground">
                                  {new Date(log.timestamp).toLocaleTimeString()}
                                </span>
                                <span className={`${
                                  log.level === 'error' ? 'text-red-500' :
                                  log.level === 'warning' ? 'text-yellow-500' :
                                  log.level === 'info' ? 'text-blue-500' : 'text-gray-500'
                                }`}>
                                  [{log.level.toUpperCase()}]
                                </span>
                                <span>{log.message}</span>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Execution History */}
      {executionHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              Execution History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {executionHistory.slice(0, 10).map((execution) => (
                  <div key={execution.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(execution.status)}
                      <div>
                        <div className="font-medium">{execution.scriptName}</div>
                        <div className="text-sm text-muted-foreground">
                          {execution.profileName} • {formatDuration(execution.duration)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(execution.status)}>
                        {execution.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(execution.startTime).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RPAExecutionPanel;
