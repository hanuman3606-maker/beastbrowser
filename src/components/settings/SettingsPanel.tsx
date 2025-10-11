import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  Shield, 
  Globe, 
  Monitor, 
  Zap, 
  Database,
  Download,
  Upload,
  RefreshCw,
  Info,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface GlobalSettings {
  browserPath: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  autoSaveProfiles: boolean;
  maxConcurrentBrowsers: number;
  defaultTimeout: number;
  antiDetection: {
    patchWebDriver: boolean;
    spoofWebGL: boolean;
    spoofCanvas: boolean;
    spoofAudioContext: boolean;
    blockWebRTC: boolean;
    spoofTimezone: boolean;
    randomizeViewport: boolean;
    spoofLanguages: boolean;
    spoofPlugins: boolean;
    spoofFonts: boolean;
  };
  proxy: {
    defaultType: 'HTTP' | 'HTTPS' | 'SOCKS5';
    rotationEnabled: boolean;
    rotationInterval: number;
    validateOnAdd: boolean;
    timeoutSeconds: number;
  };
  performance: {
    disableImages: boolean;
    disableCSS: boolean;
    disableJavaScript: boolean;
    enableCache: boolean;
    maxMemoryUsage: number;
  };
  ui?: {
    showWelcomePage: boolean;
  };
}

export default function SettingsPanel() {
  const [settings, setSettings] = useState<GlobalSettings>({
    browserPath: '',
    logLevel: 'info',
    autoSaveProfiles: true,
    maxConcurrentBrowsers: 10,
    defaultTimeout: 30000,
    antiDetection: {
      patchWebDriver: true,
      spoofWebGL: true,
      spoofCanvas: true,
      spoofAudioContext: true,
      blockWebRTC: true,
      spoofTimezone: true,
      randomizeViewport: true,
      spoofLanguages: true,
      spoofPlugins: true,
      spoofFonts: true,
    },
    proxy: {
      defaultType: 'HTTP',
      rotationEnabled: false,
      rotationInterval: 300,
      validateOnAdd: true,
      timeoutSeconds: 10,
    },
    performance: {
      disableImages: false,
      disableCSS: false,
      disableJavaScript: false,
      enableCache: true,
      maxMemoryUsage: 2048,
    },
    ui: { showWelcomePage: true }
  });

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('antidetect_settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const saveSettings = (newSettings: GlobalSettings) => {
    // Validate settings before saving
    if (newSettings.maxConcurrentBrowsers < 1 || newSettings.maxConcurrentBrowsers > 50) {
      toast.error('Max concurrent browsers must be between 1 and 50');
      return;
    }
    if (newSettings.defaultTimeout < 1000 || newSettings.defaultTimeout > 120000) {
      toast.error('Default timeout must be between 1000ms and 120000ms');
      return;
    }
    if (newSettings.proxy.timeoutSeconds < 1 || newSettings.proxy.timeoutSeconds > 60) {
      toast.error('Proxy timeout must be between 1 and 60 seconds');
      return;
    }
    if (newSettings.performance.maxMemoryUsage < 512 || newSettings.performance.maxMemoryUsage > 8192) {
      toast.error('Max memory usage must be between 512MB and 8192MB');
      return;
    }
    
    setSettings(newSettings);
    localStorage.setItem('antidetect_settings', JSON.stringify(newSettings));
    toast.success('✓ Settings saved successfully', {
      description: 'All changes have been applied',
      duration: 3000,
    });
  };

  const resetToDefaults = () => {
    const defaultSettings: GlobalSettings = {
      browserPath: '',
      logLevel: 'info',
      autoSaveProfiles: true,
      maxConcurrentBrowsers: 10,
      defaultTimeout: 30000,
      antiDetection: {
        patchWebDriver: true,
        spoofWebGL: true,
        spoofCanvas: true,
        spoofAudioContext: true,
        blockWebRTC: true,
        spoofTimezone: true,
        randomizeViewport: true,
        spoofLanguages: true,
        spoofPlugins: true,
        spoofFonts: true,
      },
      proxy: {
        defaultType: 'HTTP',
        rotationEnabled: false,
        rotationInterval: 300,
        validateOnAdd: true,
        timeoutSeconds: 10,
      },
      performance: {
        disableImages: false,
        disableCSS: false,
        disableJavaScript: false,
        enableCache: true,
        maxMemoryUsage: 2048,
      },
      ui: { showWelcomePage: true }
    };
    
    saveSettings(defaultSettings);
    toast.success('Settings reset to defaults');
  };

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'antidetect_settings.json';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Settings exported');
  };

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedSettings = JSON.parse(e.target?.result as string);
        saveSettings(importedSettings);
        toast.success('Settings imported successfully');
      } catch (error) {
        toast.error('Failed to import settings. Invalid file format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <TooltipProvider>
      <div className="space-y-6 p-6">
        {/* Professional Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight">Global Settings</h1>
              <p className="text-muted-foreground text-base">
                Configure advanced anti-detection features and system preferences
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={exportSettings}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Export settings to JSON file</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <label htmlFor="import-settings">
                    <Button variant="outline" size="sm" asChild>
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        Import
                      </span>
                    </Button>
                  </label>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Import settings from JSON file</p>
                </TooltipContent>
              </Tooltip>
              <input
                id="import-settings"
                type="file"
                accept=".json"
                onChange={importSettings}
                className="hidden"
              />
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={resetToDefaults}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Reset all settings to default values</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          <Separator />
        </div>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-5 h-auto p-1">
            <TabsTrigger value="general" className="flex items-center gap-2 py-3">
              <Settings className="h-4 w-4" />
              <span>General</span>
            </TabsTrigger>
            <TabsTrigger value="antidetection" className="flex items-center gap-2 py-3">
              <Shield className="h-4 w-4" />
              <span>Anti-Detection</span>
            </TabsTrigger>
            <TabsTrigger value="proxy" className="flex items-center gap-2 py-3">
              <Globe className="h-4 w-4" />
              <span>Proxy</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2 py-3">
              <Zap className="h-4 w-4" />
              <span>Performance</span>
            </TabsTrigger>
            <TabsTrigger value="ui" className="flex items-center gap-2 py-3">
              <Monitor className="h-4 w-4" />
              <span>Interface</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  <span>General Configuration</span>
                </CardTitle>
                <CardDescription>
                  Core system settings and browser configuration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="browser-path">Browser Executable Path</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Specify custom Chrome/Chromium path. Leave empty for automatic detection.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="browser-path"
                    placeholder="/path/to/chrome or leave empty for auto-detection"
                    value={settings.browserPath}
                    onChange={(e) => setSettings(prev => ({ ...prev, browserPath: e.target.value }))}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Auto-detection works for most installations
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="log-level">Log Level</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Control verbosity of application logs</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Select 
                      value={settings.logLevel} 
                      onValueChange={(value: 'debug' | 'info' | 'warn' | 'error') => setSettings(prev => ({ ...prev, logLevel: value }))}
                    >
                      <SelectTrigger id="log-level">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="debug">🔍 Debug (Verbose)</SelectItem>
                        <SelectItem value="info">ℹ️ Info (Recommended)</SelectItem>
                        <SelectItem value="warn">⚠️ Warning (Important)</SelectItem>
                        <SelectItem value="error">❌ Error (Critical Only)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="max-browsers">Max Concurrent Browsers</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Maximum number of browser instances (1-50)</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="max-browsers"
                      type="number"
                      min="1"
                      max="50"
                      value={settings.maxConcurrentBrowsers}
                      onChange={(e) => setSettings(prev => ({ ...prev, maxConcurrentBrowsers: parseInt(e.target.value) || 1 }))}
                    />
                    <p className="text-xs text-muted-foreground">Higher values require more system resources</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="timeout">Default Timeout (ms)</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Default operation timeout in milliseconds (1000-120000)</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="timeout"
                      type="number"
                      min="1000"
                      max="120000"
                      step="1000"
                      value={settings.defaultTimeout}
                      onChange={(e) => setSettings(prev => ({ ...prev, defaultTimeout: parseInt(e.target.value) || 30000 }))}
                    />
                    <p className="text-xs text-muted-foreground">{(settings.defaultTimeout / 1000).toFixed(1)} seconds</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Profile Management</Label>
                    <div className="flex items-center space-x-3 p-4 border rounded-lg">
                      <Switch
                        id="auto-save"
                        checked={settings.autoSaveProfiles}
                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoSaveProfiles: checked }))}
                      />
                      <div className="flex-1">
                        <Label htmlFor="auto-save" className="cursor-pointer font-medium">Auto-save profiles</Label>
                        <p className="text-xs text-muted-foreground">Automatically save profile changes</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="antidetection" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  <span>Anti-Detection Features</span>
                </CardTitle>
                <CardDescription>
                  Advanced fingerprint protection and stealth mechanisms
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <Switch
                      id="patch-webdriver"
                      checked={settings.antiDetection.patchWebDriver}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({
                          ...prev,
                          antiDetection: { ...prev.antiDetection, patchWebDriver: checked }
                        }))
                      }
                    />
                    <div className="flex-1">
                      <Label htmlFor="patch-webdriver" className="cursor-pointer font-medium">Patch WebDriver Detection</Label>
                      <p className="text-xs text-muted-foreground">Hide automation indicators</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <Switch
                      id="spoof-webgl"
                      checked={settings.antiDetection.spoofWebGL}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({
                          ...prev,
                          antiDetection: { ...prev.antiDetection, spoofWebGL: checked }
                        }))
                      }
                    />
                    <div className="flex-1">
                      <Label htmlFor="spoof-webgl" className="cursor-pointer font-medium">Spoof WebGL Fingerprint</Label>
                      <p className="text-xs text-muted-foreground">Randomize GPU information</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <Switch
                      id="spoof-canvas"
                      checked={settings.antiDetection.spoofCanvas}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({
                          ...prev,
                          antiDetection: { ...prev.antiDetection, spoofCanvas: checked }
                        }))
                      }
                    />
                    <div className="flex-1">
                      <Label htmlFor="spoof-canvas" className="cursor-pointer font-medium">Spoof Canvas Fingerprint</Label>
                      <p className="text-xs text-muted-foreground">Protect against canvas tracking</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <Switch
                      id="spoof-audio"
                      checked={settings.antiDetection.spoofAudioContext}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({
                          ...prev,
                          antiDetection: { ...prev.antiDetection, spoofAudioContext: checked }
                        }))
                      }
                    />
                    <div className="flex-1">
                      <Label htmlFor="spoof-audio" className="cursor-pointer font-medium">Spoof Audio Context</Label>
                      <p className="text-xs text-muted-foreground">Randomize audio fingerprint</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <Switch
                      id="block-webrtc"
                      checked={settings.antiDetection.blockWebRTC}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({
                          ...prev,
                          antiDetection: { ...prev.antiDetection, blockWebRTC: checked }
                        }))
                      }
                    />
                    <div className="flex-1">
                      <Label htmlFor="block-webrtc" className="cursor-pointer font-medium">Block WebRTC</Label>
                      <p className="text-xs text-muted-foreground">Prevent IP leak via WebRTC</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <Switch
                      id="spoof-timezone"
                      checked={settings.antiDetection.spoofTimezone}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({
                          ...prev,
                          antiDetection: { ...prev.antiDetection, spoofTimezone: checked }
                        }))
                      }
                    />
                    <div className="flex-1">
                      <Label htmlFor="spoof-timezone" className="cursor-pointer font-medium">Spoof Timezone</Label>
                      <p className="text-xs text-muted-foreground">Match timezone with proxy location</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <Switch
                      id="randomize-viewport"
                      checked={settings.antiDetection.randomizeViewport}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({
                          ...prev,
                          antiDetection: { ...prev.antiDetection, randomizeViewport: checked }
                        }))
                      }
                    />
                    <div className="flex-1">
                      <Label htmlFor="randomize-viewport" className="cursor-pointer font-medium">Randomize Viewport</Label>
                      <p className="text-xs text-muted-foreground">Vary window dimensions</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <Switch
                      id="spoof-languages"
                      checked={settings.antiDetection.spoofLanguages}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({
                          ...prev,
                          antiDetection: { ...prev.antiDetection, spoofLanguages: checked }
                        }))
                      }
                    />
                    <div className="flex-1">
                      <Label htmlFor="spoof-languages" className="cursor-pointer font-medium">Spoof Languages</Label>
                      <p className="text-xs text-muted-foreground">Customize browser language</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <Switch
                      id="spoof-plugins"
                      checked={settings.antiDetection.spoofPlugins}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({
                          ...prev,
                          antiDetection: { ...prev.antiDetection, spoofPlugins: checked }
                        }))
                      }
                    />
                    <div className="flex-1">
                      <Label htmlFor="spoof-plugins" className="cursor-pointer font-medium">Spoof Plugins</Label>
                      <p className="text-xs text-muted-foreground">Mask installed browser plugins</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <Switch
                      id="spoof-fonts"
                      checked={settings.antiDetection.spoofFonts}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({
                          ...prev,
                          antiDetection: { ...prev.antiDetection, spoofFonts: checked }
                        }))
                      }
                    />
                    <div className="flex-1">
                      <Label htmlFor="spoof-fonts" className="cursor-pointer font-medium">Spoof Font List</Label>
                      <p className="text-xs text-muted-foreground">Randomize system font enumeration</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="proxy" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  <span>Proxy Configuration</span>
                </CardTitle>
                <CardDescription>
                  Network routing and proxy management settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="proxy-type">Default Proxy Type</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Default protocol for new proxy connections</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Select 
                      value={settings.proxy.defaultType} 
                      onValueChange={(value: 'HTTP' | 'HTTPS' | 'SOCKS5') => 
                        setSettings(prev => ({
                          ...prev,
                          proxy: { ...prev.proxy, defaultType: value }
                        }))
                      }
                    >
                      <SelectTrigger id="proxy-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HTTP">🌐 HTTP</SelectItem>
                        <SelectItem value="HTTPS">🔒 HTTPS (Secure)</SelectItem>
                        <SelectItem value="SOCKS5">🚀 SOCKS5 (Advanced)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="proxy-timeout">Validation Timeout (seconds)</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Maximum time to wait for proxy validation (1-60s)</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="proxy-timeout"
                      type="number"
                      min="1"
                      max="60"
                      value={settings.proxy.timeoutSeconds}
                      onChange={(e) => 
                        setSettings(prev => ({
                          ...prev,
                          proxy: { ...prev.proxy, timeoutSeconds: parseInt(e.target.value) || 10 }
                        }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">Recommended: 10 seconds</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="flex items-center space-x-3 p-4 border rounded-lg">
                    <Switch
                      id="proxy-rotation"
                      checked={settings.proxy.rotationEnabled}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({
                          ...prev,
                          proxy: { ...prev.proxy, rotationEnabled: checked }
                        }))
                      }
                    />
                    <div className="flex-1">
                      <Label htmlFor="proxy-rotation" className="cursor-pointer font-medium">Enable Proxy Rotation</Label>
                      <p className="text-xs text-muted-foreground">Automatically switch between proxies</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-4 border rounded-lg">
                    <Switch
                      id="validate-proxy"
                      checked={settings.proxy.validateOnAdd}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({
                          ...prev,
                          proxy: { ...prev.proxy, validateOnAdd: checked }
                        }))
                      }
                    />
                    <div className="flex-1">
                      <Label htmlFor="validate-proxy" className="cursor-pointer font-medium">Validate Proxies on Add</Label>
                      <p className="text-xs text-muted-foreground">Test proxy connectivity before adding</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="rotation-interval">Rotation Interval (seconds)</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Time between automatic proxy rotations (60-3600s)</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="rotation-interval"
                    type="number"
                    min="60"
                    max="3600"
                    step="60"
                    value={settings.proxy.rotationInterval}
                    onChange={(e) => 
                      setSettings(prev => ({
                        ...prev,
                        proxy: { ...prev.proxy, rotationInterval: parseInt(e.target.value) || 300 }
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">{(settings.proxy.rotationInterval / 60).toFixed(1)} minutes</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  <span>Performance Optimization</span>
                </CardTitle>
                <CardDescription>
                  Resource management and browser performance tuning
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex items-center space-x-3 p-4 border rounded-lg">
                    <Switch
                      id="disable-images"
                      checked={settings.performance.disableImages}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({
                          ...prev,
                          performance: { ...prev.performance, disableImages: checked }
                        }))
                      }
                    />
                    <div className="flex-1">
                      <Label htmlFor="disable-images" className="cursor-pointer font-medium">Disable Images</Label>
                      <p className="text-xs text-muted-foreground">Faster loading, reduced bandwidth</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-4 border rounded-lg">
                    <Switch
                      id="disable-css"
                      checked={settings.performance.disableCSS}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({
                          ...prev,
                          performance: { ...prev.performance, disableCSS: checked }
                        }))
                      }
                    />
                    <div className="flex-1">
                      <Label htmlFor="disable-css" className="cursor-pointer font-medium">Disable CSS</Label>
                      <p className="text-xs text-muted-foreground">Minimal styling, faster rendering</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-4 border rounded-lg">
                    <Switch
                      id="disable-js"
                      checked={settings.performance.disableJavaScript}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({
                          ...prev,
                          performance: { ...prev.performance, disableJavaScript: checked }
                        }))
                      }
                    />
                    <div className="flex-1">
                      <Label htmlFor="disable-js" className="cursor-pointer font-medium">Disable JavaScript</Label>
                      <p className="text-xs text-muted-foreground">⚠️ May break functionality</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-4 border rounded-lg">
                    <Switch
                      id="enable-cache"
                      checked={settings.performance.enableCache}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({
                          ...prev,
                          performance: { ...prev.performance, enableCache: checked }
                        }))
                      }
                    />
                    <div className="flex-1">
                      <Label htmlFor="enable-cache" className="cursor-pointer font-medium">Enable Cache</Label>
                      <p className="text-xs text-muted-foreground">Store resources for faster reloads</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="max-memory">Max Memory Usage (MB)</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Maximum memory allocation per browser instance (512-8192 MB)</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="max-memory"
                    type="number"
                    min="512"
                    max="8192"
                    step="256"
                    value={settings.performance.maxMemoryUsage}
                    onChange={(e) => 
                      setSettings(prev => ({
                        ...prev,
                        performance: { ...prev.performance, maxMemoryUsage: parseInt(e.target.value) || 2048 }
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">{(settings.performance.maxMemoryUsage / 1024).toFixed(2)} GB per browser</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ui" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  <span>Interface Preferences</span>
                </CardTitle>
                <CardDescription>
                  Customize application behavior and user interface
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3 p-4 border rounded-lg">
                  <Switch
                    id="show-welcome"
                    checked={settings.ui?.showWelcomePage ?? true}
                    onCheckedChange={(checked) => {
                      const next = { ...settings, ui: { ...(settings.ui||{}), showWelcomePage: checked } };
                      setSettings(next);
                      (window as any).beastAPI?.updateSettings?.({ showWelcomePage: checked });
                    }}
                  />
                  <div className="flex-1">
                    <Label htmlFor="show-welcome" className="cursor-pointer font-medium">Show Welcome Page</Label>
                    <p className="text-xs text-muted-foreground">Display welcome page when opening new profiles</p>
                  </div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg border border-muted">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    If disabled, new profile windows will open Google directly
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <Card className="border-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Ready to save your changes?</p>
                <p className="text-xs text-muted-foreground">All settings will be applied immediately</p>
              </div>
              <Button onClick={() => saveSettings(settings)} size="lg" className="gap-2">
                <Database className="h-4 w-4" />
                Save All Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}