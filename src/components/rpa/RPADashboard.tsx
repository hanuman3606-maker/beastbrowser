import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Code, 
  Activity, 
  BarChart3, 
  Play, 
  Settings,
  Plus,
  BookOpen,
  Monitor,
  Users,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

// Import the RPA components
import RPAScriptBuilder from './RPAScriptBuilder';
import RPAScriptLibrary from './RPAScriptLibrary';
import RPAExecutionPanel from './RPAExecutionPanel';
// Monitoring dashboard removed - not needed

const RPADashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');

  // Get stats from localStorage for overview
  const getOverviewStats = () => {
    const scripts = JSON.parse(localStorage.getItem('antidetect_rpa_scripts') || '[]');
    const profiles = JSON.parse(localStorage.getItem('antidetect_profiles') || '[]');
    const executions = JSON.parse(localStorage.getItem('rpa_executions') || '[]');
    
    const activeExecutions = executions.filter((e: any) => 
      ['pending', 'running', 'paused'].includes(e.status)
    );
    const completedExecutions = executions.filter((e: any) => 
      e.status === 'completed'
    );
    const failedExecutions = executions.filter((e: any) => 
      e.status === 'failed'
    );

    return {
      totalScripts: scripts.length,
      totalProfiles: profiles.length,
      activeExecutions: activeExecutions.length,
      completedExecutions: completedExecutions.length,
      failedExecutions: failedExecutions.length,
      totalExecutions: executions.length
    };
  };

  const stats = getOverviewStats();

  const quickActions = [
    {
      title: 'Create New Script',
      description: 'Build a custom automation script',
      icon: <Plus className="h-6 w-6" />,
      color: 'bg-orange-500',
      action: () => setActiveTab('builder')
    },
    {
      title: 'View Library',
      description: 'Browse your script collection',
      icon: <BookOpen className="h-6 w-6" />,
      color: 'bg-purple-500',
      action: () => setActiveTab('library')
    },
    {
      title: 'Monitor Performance',
      description: 'Track execution analytics',
      icon: <Monitor className="h-6 w-6" />,
      color: 'bg-orange-500',
      action: () => setActiveTab('monitoring')
    }
  ];

  const recentActivities = [
    {
      type: 'script_created',
      title: 'New script created',
      description: 'Auto Scrolling Script',
      time: '2 hours ago',
      icon: <Code className="h-4 w-4" />
    },
    {
      type: 'execution_completed',
      title: 'Execution completed',
      description: 'Form Filler on Profile 1',
      time: '4 hours ago',
      icon: <CheckCircle className="h-4 w-4" />
    },
    {
      type: 'execution_failed',
      title: 'Execution failed',
      description: 'Clicker Script on Profile 2',
      time: '6 hours ago',
      icon: <AlertCircle className="h-4 w-4" />
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">RPA Automation Center</h1>
          <p className="text-muted-foreground mt-2">
            Create, manage, and monitor your browser automation scripts
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1">
          <Zap className="h-3 w-3" />
          RPA System Active
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="builder">Script Builder</TabsTrigger>
          <TabsTrigger value="library">Script Library</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Scripts</p>
                    <p className="text-2xl font-bold">{stats.totalScripts}</p>
                  </div>
                  <Code className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Profiles</p>
                    <p className="text-2xl font-bold">{stats.totalProfiles}</p>
                  </div>
                  <Users className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Executions</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.activeExecutions}</p>
                  </div>
                  <Activity className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Executions</p>
                    <p className="text-2xl font-bold">{stats.totalExecutions}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Actions */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {quickActions.map((action, index) => (
                      <div
                        key={index}
                        className="p-4 border rounded-lg cursor-pointer hover:border-primary transition-colors"
                        onClick={action.action}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg text-white ${action.color}`}>
                            {action.icon}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{action.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {action.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentActivities.map((activity, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="p-1 rounded bg-muted">
                          {activity.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{activity.title}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {activity.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {activity.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Getting Started Guide */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Getting Started with RPA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-orange-500 text-white text-sm flex items-center justify-center font-bold">1</div>
                    <h4 className="font-medium">Create Scripts</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Use the Script Builder to create automation scripts. Choose from templates or build custom JavaScript code.
                  </p>
                  <Button size="sm" onClick={() => setActiveTab('builder')}>
                    Start Building
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-green-500 text-white text-sm flex items-center justify-center font-bold">2</div>
                    <h4 className="font-medium">Use in Profile Manager</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Go to Profile Manager to execute your scripts on browser profiles. Scripts created here will be available there.
                  </p>
                  <Button size="sm" onClick={() => window.location.hash = '#profiles'}>
                    Go to Profiles
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-purple-500 text-white text-sm flex items-center justify-center font-bold">3</div>
                    <h4 className="font-medium">Monitor Results</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Track execution progress and view logs in the Profile Manager when running scripts on profiles.
                  </p>
                  <Button size="sm" onClick={() => window.location.hash = '#profiles'}>
                    View in Profiles
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="builder">
          <RPAScriptBuilder />
        </TabsContent>

        <TabsContent value="library">
          <RPAScriptLibrary />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RPADashboard;

