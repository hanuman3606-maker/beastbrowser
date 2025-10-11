import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Globe, Clock, Activity, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { browserLifecycleService, BrowserInstance, BrowserLifecycleEvent } from '@/services/browserLifecycleService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/components/ui/use-toast';

interface BrowserLifecycleMonitorProps {
  className?: string;
  onCloseInstance?: (profileId: string) => void;
  showMetrics?: boolean;
}

export const BrowserLifecycleMonitor: React.FC<BrowserLifecycleMonitorProps> = ({
  className = '',
  onCloseInstance,
  showMetrics = true
}) => {
  const [instances, setInstances] = useState<BrowserInstance[]>([]);
  const [metrics, setMetrics] = useState(browserLifecycleService.getMetrics());
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Load initial data
    loadData();

    // Set up event listener for real-time updates
    const handlerId = browserLifecycleService.onEvent((event: BrowserLifecycleEvent) => {
      // Refresh instances on any lifecycle event
      loadData();
      
      // Show toast notifications for important events
      if (event.type === 'launch_failed') {
        toast({
          title: 'Browser Launch Failed',
          description: `Profile ${event.profileId} failed to launch`,
          variant: 'destructive'
        });
      } else if (event.type === 'proxy_failed') {
        toast({
          title: 'Proxy Connection Failed',
          description: `Profile ${event.profileId} proxy connection failed`,
          variant: 'destructive'
        });
      }
    });

    // Set up periodic refresh
    const interval = setInterval(() => {
      loadData();
    }, 2000);

    return () => {
      browserLifecycleService.removeEventHandler(handlerId);
      clearInterval(interval);
    };
  }, []);

  const loadData = () => {
    setInstances(browserLifecycleService.getAllInstances());
    setMetrics(browserLifecycleService.getMetrics());
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    
    // Perform health check
    const healthCheck = await browserLifecycleService.performHealthCheck();
    if (!healthCheck.healthy) {
      toast({
        title: 'Health Check Issues',
        description: healthCheck.issues.join(', '),
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'All Systems Healthy',
        description: 'Browser instances are running normally',
        variant: 'default'
      });
    }
    
    setIsRefreshing(false);
  };

  const handleCloseInstance = async (profileId: string) => {
    try {
      // Notify parent component if callback provided
      if (onCloseInstance) {
        onCloseInstance(profileId);
      } else {
        // Use Electron API to close browser
        if (window.electronAPI?.closeProfile) {
          await window.electronAPI.closeProfile(profileId);
        }
      }
      
      toast({
        title: 'Browser Closing',
        description: 'Browser instance is being closed...'
      });
    } catch (error) {
      toast({
        title: 'Failed to Close Browser',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'launching':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'running':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'closing':
        return <Loader2 className="w-4 h-4 animate-spin text-orange-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Globe className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'launching':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Launching</Badge>;
      case 'running':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Running</Badge>;
      case 'closing':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Closing</Badge>;
      case 'error':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Error</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Unknown</Badge>;
    }
  };

  const getProxyStatusBadge = (status?: string) => {
    if (!status) return null;
    
    switch (status) {
      case 'testing':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Testing</Badge>;
      case 'connected':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Connected</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Failed</Badge>;
      default:
        return null;
    }
  };

  const formatUptime = (startTime: string) => {
    const start = new Date(startTime).getTime();
    const now = Date.now();
    const diff = now - start;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  const activeInstances = instances.filter(i => i.status === 'launching' || i.status === 'running');
  const hasActiveInstances = activeInstances.length > 0;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with metrics */}
      {showMetrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">Active</p>
                  <p className="text-2xl font-bold text-blue-800">{metrics.activeInstances}</p>
                </div>
                <Globe className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">Success Rate</p>
                  <p className="text-2xl font-bold text-green-800">
                    {metrics.totalLaunches > 0 
                      ? Math.round((metrics.successfulLaunches / metrics.totalLaunches) * 100)
                      : 0}%
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700">Total Launches</p>
                  <p className="text-2xl font-bold text-purple-800">{metrics.totalLaunches}</p>
                </div>
                <Activity className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-700">Avg Launch</p>
                  <p className="text-2xl font-bold text-orange-800">
                    {Math.round(metrics.averageLaunchTime / 1000)}s
                  </p>
                </div>
                <Clock className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">Browser Instances</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="border-blue-300 hover:bg-blue-50"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Instance list */}
      {instances.length === 0 ? (
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="p-8 text-center">
            <Globe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No browser instances are currently active</p>
            <p className="text-sm text-gray-500 mt-2">Launch a profile to see it here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {instances.map((instance) => (
            <Card 
              key={instance.profileId} 
              className={`transition-all hover:shadow-md ${
                selectedInstance === instance.profileId 
                  ? 'ring-2 ring-blue-500 border-blue-300' 
                  : 'border-gray-200'
              }`}
              onClick={() => setSelectedInstance(
                selectedInstance === instance.profileId ? null : instance.profileId
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    {getStatusIcon(instance.status)}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-gray-900">{instance.profileName}</h4>
                        {getStatusBadge(instance.status)}
                        {getProxyStatusBadge(instance.proxyStatus)}
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatUptime(instance.startTime)}
                        </span>
                        
                        {instance.url && (
                          <span className="truncate max-w-xs">
                            {instance.url}
                          </span>
                        )}
                        
                        {instance.timezone && (
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {instance.timezone}
                          </span>
                        )}
                        
                        {instance.rpaExecutions.length > 0 && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                            {instance.rpaExecutions.length} RPA jobs
                          </span>
                        )}
                      </div>

                      {instance.error && (
                        <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                          {instance.error}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {(instance.status === 'running' || instance.status === 'error') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCloseInstance(instance.profileId);
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Expanded details */}
                {selectedInstance === instance.profileId && (
                  <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Process ID:</span>
                        <span className="ml-2 font-mono">{instance.processId || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Window ID:</span>
                        <span className="ml-2 font-mono">{instance.windowId || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Locale:</span>
                        <span className="ml-2">{instance.locale || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Last Activity:</span>
                        <span className="ml-2">
                          {new Date(instance.lastActivity).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>

                    {instance.screenshots.length > 0 && (
                      <div>
                        <span className="text-gray-600 text-sm">Recent Screenshots:</span>
                        <div className="flex space-x-2 mt-2">
                          {instance.screenshots.slice(-3).map((screenshot, index) => (
                            <div key={index} className="w-16 h-12 bg-gray-200 rounded border flex items-center justify-center">
                              <span className="text-xs text-gray-500">#{index + 1}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Footer */}
      {hasActiveInstances && (
        <div className="text-center text-sm text-gray-500">
          <p>Click on any instance to view detailed information</p>
          <p className="mt-1">Auto-refreshes every 2 seconds</p>
        </div>
      )}
    </div>
  );
};