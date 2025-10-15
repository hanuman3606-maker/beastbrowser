/**
 * Chrome 139 Runtime Panel
 * 
 * UI for Chrome 139 runtime selection and advanced fingerprint configuration
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { 
  Cpu, 
  Globe, 
  Monitor, 
  Shield, 
  Fingerprint, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Sparkles,
  TestTube,
  Loader2,
  Info
} from 'lucide-react';
import { chrome139RuntimeService, RuntimeInfo } from '@/services/chrome139RuntimeService';
import { fingerprintTestService, TestName } from '@/services/fingerprintTestService';
import { toast } from 'sonner';

export interface FingerprintConfig {
  runtime: 'beast' | 'chrome139';
  fingerprintSeed?: number;
  platform?: 'windows' | 'macos' | 'linux';
  platformVersion?: string;
  brand?: 'Chrome' | 'Edge' | 'Opera' | 'Vivaldi' | 'Brave';
  brandVersion?: string;
  hardwareConcurrency?: number;
  gpuVendor?: string;
  gpuRenderer?: string;
  timezone?: string;
  lang?: string;
  acceptLang?: string;
  autoGPU?: boolean;
  forceGPU?: boolean;
  headlessUA?: boolean;
  useProxyManager?: boolean;
  useAuthTunnel?: boolean;
  windowWidth?: number;
  windowHeight?: number;
}

interface Chrome139RuntimePanelProps {
  config: Partial<FingerprintConfig>;
  onChange: (config: Partial<FingerprintConfig>) => void;
  profileId?: string;
}

const Chrome139RuntimePanel: React.FC<Chrome139RuntimePanelProps> = ({ config, onChange, profileId }) => {
  const [runtimeInfo, setRuntimeInfo] = useState<RuntimeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [testingFingerprint, setTestingFingerprint] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, any>>({});

  useEffect(() => {
    loadRuntimeInfo();
  }, []);

  const loadRuntimeInfo = async () => {
    setLoading(true);
    const info = await chrome139RuntimeService.getRuntimeInfo();
    setRuntimeInfo(info);
    setLoading(false);
  };

  const updateConfig = (updates: Partial<FingerprintConfig>) => {
    onChange({ ...config, ...updates });
  };

  const generateRandomSeed = () => {
    const seed = Math.floor(Math.random() * 999999999);
    updateConfig({ fingerprintSeed: seed });
    toast.success(`Random seed generated: ${seed}`);
  };

  const generateGPUStrings = () => {
    const vendors = [
      'NVIDIA Corporation',
      'Intel Inc.',
      'AMD',
      'Google Inc. (ANGLE)'
    ];
    
    const renderers: Record<string, string[]> = {
      'NVIDIA Corporation': [
        'NVIDIA GeForce GTX 1060',
        'NVIDIA GeForce RTX 3060',
        'NVIDIA GeForce GTX 1650',
        'NVIDIA GeForce RTX 2060'
      ],
      'Intel Inc.': [
        'Intel(R) UHD Graphics 630',
        'Intel(R) Iris(R) Xe Graphics',
        'Intel(R) HD Graphics 620'
      ],
      'AMD': [
        'AMD Radeon RX 580',
        'AMD Radeon RX 6600',
        'AMD Radeon Vega 8'
      ],
      'Google Inc. (ANGLE)': [
        'ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 Direct3D11 vs_5_0 ps_5_0)',
        'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0)'
      ]
    };

    const vendor = vendors[Math.floor(Math.random() * vendors.length)];
    const rendererList = renderers[vendor];
    const renderer = rendererList[Math.floor(Math.random() * rendererList.length)];

    updateConfig({ gpuVendor: vendor, gpuRenderer: renderer });
    toast.success('GPU strings generated');
  };

  const runQuickTest = async (testName: TestName) => {
    if (!runtimeInfo?.available) {
      toast.error('Chrome 139 runtime not available');
      return;
    }

    setTestingFingerprint(true);
    toast.info(`Running ${testName} test...`);

    try {
      const userDataDir = `${process.env.USERPROFILE || process.env.HOME}/BeastBrowser/ChromeProfiles/test-${Date.now()}`;
      const result = await fingerprintTestService.quickTest(
        testName,
        runtimeInfo.path!,
        userDataDir
      );

      setTestResults(prev => ({ ...prev, [testName]: result }));

      if (result.passed) {
        toast.success(`${testName} test passed!`);
      } else if (result.warning) {
        toast.warning(`${testName}: ${result.message}`);
      } else {
        toast.error(`${testName} test failed: ${result.message}`);
      }
    } catch (error: any) {
      toast.error(`Test error: ${error.message}`);
    } finally {
      setTestingFingerprint(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Runtime Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            Runtime Selection
          </CardTitle>
          <CardDescription>
            Choose between Beast Browser default or Chrome 139 with advanced fingerprinting
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Browser Runtime</Label>
            <Select 
              value={config.runtime || 'beast'} 
              onValueChange={(value: 'beast' | 'chrome139') => updateConfig({ runtime: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beast">Beast Browser Default</SelectItem>
                <SelectItem value="chrome139" disabled={!runtimeInfo?.available}>
                  Chrome 139 (Advanced Fingerprinting)
                  {!runtimeInfo?.available && ' - Not Available'}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {runtimeInfo && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {runtimeInfo.available ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="font-medium">Chrome 139 Available</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span className="font-medium">Chrome 139 Not Found</span>
                      </>
                    )}
                  </div>
                  {runtimeInfo.available && (
                    <>
                      <div className="text-sm text-muted-foreground">Version: {runtimeInfo.version}</div>
                      <div className="text-sm text-muted-foreground">Path: {runtimeInfo.path}</div>
                      {runtimeInfo.supportsFingerprint && (
                        <Badge variant="outline" className="mt-1">Fingerprint Flags Supported</Badge>
                      )}
                      {runtimeInfo.supportsGPUFlags && (
                        <Badge variant="outline" className="mt-1 ml-1">GPU Spoofing Supported</Badge>
                      )}
                    </>
                  )}
                  {!runtimeInfo.available && (
                    <div className="text-sm text-muted-foreground mt-1">
                      Install Chrome at: %PROGRAMFILES%\BeastBrowser\bin\chrome.exe
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Fingerprint Configuration - Only show if Chrome 139 selected */}
      {config.runtime === 'chrome139' && runtimeInfo?.available && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Fingerprint className="h-5 w-5" />
                Fingerprint Configuration
              </CardTitle>
              <CardDescription>
                Configure advanced anti-detection fingerprint parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Fingerprint Seed */}
              <div className="space-y-2">
                <Label className="flex items-center justify-between">
                  Fingerprint Seed
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={generateRandomSeed}
                  >
                    <Sparkles className="h-4 w-4 mr-1" />
                    Generate
                  </Button>
                </Label>
                <Input
                  type="number"
                  placeholder="e.g., 123456789"
                  value={config.fingerprintSeed || ''}
                  onChange={(e) => updateConfig({ fingerprintSeed: parseInt(e.target.value) || undefined })}
                />
                <p className="text-xs text-muted-foreground">
                  Integer seed for deterministic fingerprint randomization
                </p>
              </div>

              <Separator />

              {/* Platform */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Platform</Label>
                  <Select 
                    value={config.platform || 'windows'} 
                    onValueChange={(value: any) => updateConfig({ platform: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="windows">Windows</SelectItem>
                      <SelectItem value="macos">macOS</SelectItem>
                      <SelectItem value="linux">Linux</SelectItem>
                      <SelectItem value="android">Android</SelectItem>
                      <SelectItem value="ios">iOS</SelectItem>
                      <SelectItem value="tv">TV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Platform Version</Label>
                  <Input
                    placeholder="e.g., 10.0.19045"
                    value={config.platformVersion || ''}
                    onChange={(e) => updateConfig({ platformVersion: e.target.value })}
                  />
                </div>
              </div>

              {/* Brand */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Browser Brand</Label>
                  <Select 
                    value={config.brand || 'Chrome'} 
                    onValueChange={(value: any) => updateConfig({ brand: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Chrome">Chrome</SelectItem>
                      <SelectItem value="Edge">Edge</SelectItem>
                      <SelectItem value="Opera">Opera</SelectItem>
                      <SelectItem value="Vivaldi">Vivaldi</SelectItem>
                      <SelectItem value="Brave">Brave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Brand Version</Label>
                  <Input
                    placeholder="e.g., 139.0.7258.154"
                    value={config.brandVersion || ''}
                    onChange={(e) => updateConfig({ brandVersion: e.target.value })}
                  />
                </div>
              </div>

              <Separator />

              {/* Hardware */}
              <div className="space-y-2">
                <Label>Hardware Concurrency (CPU Cores)</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    min={2}
                    max={32}
                    step={2}
                    value={[config.hardwareConcurrency || 8]}
                    onValueChange={([value]) => updateConfig({ hardwareConcurrency: value })}
                    className="flex-1"
                  />
                  <span className="w-12 text-center font-mono">{config.hardwareConcurrency || 8}</span>
                </div>
              </div>

              <Separator />

              {/* GPU */}
              {runtimeInfo.supportsGPUFlags && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>GPU Fingerprinting</Label>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={generateGPUStrings}
                    >
                      <Sparkles className="h-4 w-4 mr-1" />
                      Generate
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label>GPU Vendor</Label>
                    <Input
                      placeholder="e.g., NVIDIA Corporation"
                      value={config.gpuVendor || ''}
                      onChange={(e) => updateConfig({ gpuVendor: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>GPU Renderer</Label>
                    <Input
                      placeholder="e.g., NVIDIA GeForce GTX 1060"
                      value={config.gpuRenderer || ''}
                      onChange={(e) => updateConfig({ gpuRenderer: e.target.value })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto GPU from Seed</Label>
                      <p className="text-xs text-muted-foreground">Generate GPU strings automatically</p>
                    </div>
                    <Switch
                      checked={config.autoGPU || false}
                      onCheckedChange={(checked) => updateConfig({ autoGPU: checked })}
                    />
                  </div>
                </div>
              )}

              <Separator />

              {/* Locale & Timezone */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Input
                    placeholder="e.g., Asia/Kolkata"
                    value={config.timezone || ''}
                    onChange={(e) => updateConfig({ timezone: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Language</Label>
                  <Input
                    placeholder="e.g., hi-IN"
                    value={config.lang || ''}
                    onChange={(e) => updateConfig({ lang: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Accept Languages</Label>
                <Input
                  placeholder="e.g., hi-IN,en-US"
                  value={config.acceptLang || ''}
                  onChange={(e) => updateConfig({ acceptLang: e.target.value })}
                />
              </div>

              <Separator />

              {/* Window Size - Optional */}
              <div className="space-y-3">
                <div>
                  <Label>Window Size (Optional)</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave empty for natural browser size. Auto user-agent from {config.platform || 'windows'}.txt
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Input
                      type="number"
                      placeholder="Width (e.g., 1920)"
                      value={config.windowWidth || ''}
                      onChange={(e) => updateConfig({ windowWidth: parseInt(e.target.value) || undefined })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Input
                      type="number"
                      placeholder="Height (e.g., 1080)"
                      value={config.windowHeight || ''}
                      onChange={(e) => updateConfig({ windowHeight: parseInt(e.target.value) || undefined })}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Proxy & Privacy */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Use Beast Proxy Manager</Label>
                    <p className="text-xs text-muted-foreground">Use existing proxy configuration</p>
                  </div>
                  <Switch
                    checked={config.useProxyManager !== false}
                    onCheckedChange={(checked) => updateConfig({ useProxyManager: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Local Auth Tunnel</Label>
                    <p className="text-xs text-muted-foreground">For proxy credentials</p>
                  </div>
                  <Switch
                    checked={config.useAuthTunnel || false}
                    onCheckedChange={(checked) => updateConfig({ useAuthTunnel: checked })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Test Suite */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Fingerprint Tests
              </CardTitle>
              <CardDescription>
                Validate anti-detection capabilities with one-click tests
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => runQuickTest('webrtc')}
                  disabled={testingFingerprint}
                >
                  {testingFingerprint ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Shield className="h-4 w-4 mr-1" />}
                  WebRTC Leak
                  {testResults.webrtc && (
                    testResults.webrtc.passed ? 
                      <CheckCircle className="h-4 w-4 ml-auto text-green-500" /> :
                      <XCircle className="h-4 w-4 ml-auto text-red-500" />
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => runQuickTest('canvas')}
                  disabled={testingFingerprint}
                >
                  {testingFingerprint ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Monitor className="h-4 w-4 mr-1" />}
                  Canvas
                  {testResults.canvas && (
                    testResults.canvas.passed ? 
                      <CheckCircle className="h-4 w-4 ml-auto text-green-500" /> :
                      <XCircle className="h-4 w-4 ml-auto text-red-500" />
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => runQuickTest('webgl')}
                  disabled={testingFingerprint}
                >
                  {testingFingerprint ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Cpu className="h-4 w-4 mr-1" />}
                  WebGL
                  {testResults.webgl && (
                    testResults.webgl.passed ? 
                      <CheckCircle className="h-4 w-4 ml-auto text-green-500" /> :
                      <XCircle className="h-4 w-4 ml-auto text-red-500" />
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => runQuickTest('cloudflare')}
                  disabled={testingFingerprint}
                >
                  {testingFingerprint ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Globe className="h-4 w-4 mr-1" />}
                  Cloudflare
                  {testResults.cloudflare && (
                    testResults.cloudflare.passed ? 
                      <CheckCircle className="h-4 w-4 ml-auto text-green-500" /> :
                      testResults.cloudflare.warning ?
                        <AlertCircle className="h-4 w-4 ml-auto text-yellow-500" /> :
                        <XCircle className="h-4 w-4 ml-auto text-red-500" />
                  )}
                </Button>
              </div>

              {Object.keys(testResults).length > 0 && (
                <Alert>
                  <AlertDescription>
                    <div className="text-sm space-y-1">
                      {Object.entries(testResults).map(([test, result]: [string, any]) => (
                        <div key={test} className="flex items-start gap-2">
                          <span className="font-medium capitalize">{test}:</span>
                          <span className="text-muted-foreground">{result.message}</span>
                        </div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default Chrome139RuntimePanel;
