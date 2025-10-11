import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  TrendingUp,
  Users,
  Zap,
  BarChart3,
  RefreshCw,
  Play,
  Pause,
  Square,
  Eye,
  Download,
  Filter,
  Calendar,
  Timer,
  Globe,
  Code,
  User
} from 'lucide-react';
import { toast } from 'sonner';

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

interface DashboardStats {
  totalExecutions: number;
  activeExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  totalScripts: number;
  totalProfiles: number;
  successRate: number;
}

interface PerformanceMetrics {
  scriptPerformance: {
    scriptId: string;
    scriptName: string;
    totalRuns: number;
    successRate: number;
    averageTime: number;
  }[];
  profilePerformance: {
    profileId: string;
    profileName: string;
    totalRuns: number;
    successRate: number;
    averageTime: number;
  }[];
  hourlyStats: {
    hour: string;
    executions: number;
    successRate: number;
  }[];
}

const RPAMonitoringDashboard: React.FC = () => {
  const [executions, setExecutions] = useState<ExecutionSession[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalExecutions: 0,
    activeExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    averageExecutionTime: 0,
    totalScripts: 0,
    totalProfiles: 0,
    successRate: 0
  });
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    scriptPerformance: [],
    profilePerformance: [],
    hourlyStats: []
  });
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load data from localStorage
  useEffect(() => {
    loadDashboardData();
  }, [timeRange]);

  const loadDashboardData = () => {
    const savedExecutions = localStorage.getItem('rpa_executions');
    const savedScripts = localStorage.getItem('rpa_scripts');
    const savedProfiles = localStorage.getItem('antidetect_profiles');

    if (savedExecutions) {
      const allExecutions = JSON.parse(savedExecutions);
      const filteredExecutions = filterExecutionsByTimeRange(allExecutions, timeRange);
      setExecutions(filteredExecutions);
      calculateStats(filteredExecutions, savedScripts, savedProfiles);
      calculateMetrics(filteredExecutions);
    }
  };

  const filterExecutionsByTimeRange = (executions: ExecutionSession[], range: string) => {
    const now = new Date();
    const cutoffDate = new Date();

    switch (range) {
      case '24h':
        cutoffDate.setHours(now.getHours() - 24);
        break;
      case '7d':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        cutoffDate.setDate(now.getDate() - 30);
        break;
    }

    return executions.filter(execution => 
      new Date(execution.startTime) >= cutoffDate
    );
  };

  const calculateStats = (executions: ExecutionSession[], scriptsData?: string, profilesData?: string) => {
    const totalExecutions = executions.length;
    const activeExecutions = executions.filter(e => ['pending', 'running', 'paused'].includes(e.status)).length;
    const successfulExecutions = executions.filter(e => e.status === 'completed').length;
    const failedExecutions = executions.filter(e => e.status === 'failed').length;
    
    const completedExecutions = executions.filter(e => e.duration);
    const averageExecutionTime = completedExecutions.length > 0 
      ? completedExecutions.reduce((sum, e) => sum + (e.duration || 0), 0) / completedExecutions.length
      : 0;

    const totalScripts = scriptsData ? JSON.parse(scriptsData).length : 0;
    const totalProfiles = profilesData ? JSON.parse(profilesData).length : 0;
    const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

    setStats({
      totalExecutions,
      activeExecutions,
      successfulExecutions,
      failedExecutions,
      averageExecutionTime,
      totalScripts,
      totalProfiles,
      successRate
    });
  };

  const calculateMetrics = (executions: ExecutionSession[]) => {
    // Script performance
    const scriptMap = new Map();
    executions.forEach(execution => {
      const key = execution.scriptId;
      if (!scriptMap.has(key)) {
        scriptMap.set(key, {
          scriptId: execution.scriptId,
          scriptName: execution.scriptName,
          totalRuns: 0,
          successfulRuns: 0,
          totalTime: 0,
          timeCount: 0
        });
      }
      const script = scriptMap.get(key);
      script.totalRuns++;
      if (execution.status === 'completed') {
        script.successfulRuns++;
      }
      if (execution.duration) {
        script.totalTime += execution.duration;
        script.timeCount++;
      }
    });

    const scriptPerformance = Array.from(scriptMap.values()).map(script => ({
      scriptId: script.scriptId,
      scriptName: script.scriptName,
      totalRuns: script.totalRuns,
      successRate: script.totalRuns > 0 ? (script.successfulRuns / script.totalRuns) * 100 : 0,
      averageTime: script.timeCount > 0 ? script.totalTime / script.timeCount : 0
    }));

    // Profile performance
    const profileMap = new Map();
    executions.forEach(execution => {
      const key = execution.profileId;
      if (!profileMap.has(key)) {
        profileMap.set(key, {
          profileId: execution.profileId,
          profileName: execution.profileName,
          totalRuns: 0,
          successfulRuns: 0,
          totalTime: 0,
          timeCount: 0
        });
      }
      const profile = profileMap.get(key);
      profile.totalRuns++;
      if (execution.status === 'completed') {
        profile.successfulRuns++;
      }
      if (execution.duration) {
        profile.totalTime += execution.duration;
        profile.timeCount++;
      }
    });

    const profilePerformance = Array.from(profileMap.values()).map(profile => ({
      profileId: profile.profileId,
      profileName: profile.profileName,
      totalRuns: profile.totalRuns,
      successRate: profile.totalRuns > 0 ? (profile.successfulRuns / profile.totalRuns) * 100 : 0,
      averageTime: profile.timeCount > 0 ? profile.totalTime / profile.timeCount : 0
    }));

    // Hourly stats
    const hourlyMap = new Map();
    executions.forEach(execution => {
      const hour = new Date(execution.startTime).getHours();
      const key = `${hour}:00`;
      if (!hourlyMap.has(key)) {
        hourlyMap.set(key, {
          hour: key,
          executions: 0,
          successful: 0
        });
      }
      const hourData = hourlyMap.get(key);
      hourData.executions++;
      if (execution.status === 'completed') {
        hourData.successful++;
      }
    });

    const hourlyStats = Array.from(hourlyMap.values()).map(hour => ({
      hour: hour.hour,
      executions: hour.executions,
      successRate: hour.executions > 0 ? (hour.successful / hour.executions) * 100 : 0
    }));

    setMetrics({
      scriptPerformance: scriptPerformance.sort((a, b) => b.totalRuns - a.totalRuns),
      profilePerformance: profilePerformance.sort((a, b) => b.totalRuns - a.totalRuns),
      hourlyStats: hourlyStats.sort((a, b) => parseInt(a.hour) - parseInt(b.hour))
    });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      loadDashboardData();
      toast.success('Dashboard refreshed');
    } catch (error) {
      toast.error('Failed to refresh dashboard');
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatDuration = (duration: number) => {
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'running': return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />;
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">RPA Monitoring Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Monitor and analyze your automation performance
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Executions</p>
                <p className="text-2xl font-bold">{stats.totalExecutions}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Executions</p>
                <p className="text-2xl font-bold text-blue-600">{stats.activeExecutions}</p>
              </div>
              <Zap className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold text-green-600">{stats.successRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Execution Time</p>
                <p className="text-2xl font-bold">{formatDuration(stats.averageExecutionTime)}</p>
              </div>
              <Timer className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Executions */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Executions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                {executions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No executions found</p>
                    <p className="text-sm">Start running scripts to see them here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {executions.slice(0, 20).map((execution) => (
                      <div key={execution.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(execution.status)}
                          <div>
                            <div className="font-medium">{execution.scriptName}</div>
                            <div className="text-sm text-muted-foreground">
                              {execution.profileName} • {formatDuration(execution.duration || 0)}
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
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Performance Metrics */}
        <div className="space-y-6">
          {/* Script Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Top Scripts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                <div className="space-y-3">
                  {metrics.scriptPerformance.slice(0, 5).map((script) => (
                    <div key={script.scriptId} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">{script.scriptName}</span>
                        <span className="text-sm text-muted-foreground">{script.totalRuns} runs</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={script.successRate} className="flex-1 h-2" />
                        <span className="text-xs text-muted-foreground">{script.successRate.toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Profile Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Top Profiles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                <div className="space-y-3">
                  {metrics.profilePerformance.slice(0, 5).map((profile) => (
                    <div key={profile.profileId} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">{profile.profileName}</span>
                        <span className="text-sm text-muted-foreground">{profile.totalRuns} runs</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={profile.successRate} className="flex-1 h-2" />
                        <span className="text-xs text-muted-foreground">{profile.successRate.toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Hourly Activity Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Hourly Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end gap-2">
            {metrics.hourlyStats.map((hour) => (
              <div key={hour.hour} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                  style={{ height: `${(hour.executions / Math.max(...metrics.hourlyStats.map(h => h.executions))) * 200}px` }}
                  title={`${hour.hour}: ${hour.executions} executions (${hour.successRate.toFixed(0)}% success)`}
                />
                <span className="text-xs text-muted-foreground mt-2">{hour.hour}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RPAMonitoringDashboard;
