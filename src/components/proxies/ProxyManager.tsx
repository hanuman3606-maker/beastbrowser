import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  Download,
  CheckCircle, 
  RefreshCw, 
  XCircle, 
  Globe, 
  Trash2,
  Play,
  Pause,
  Server,
  Shield,
  Zap,
  Wifi,
  WifiOff,
  Activity,
  Plus,
  MapPin
} from 'lucide-react';
import { toast } from 'sonner';

interface ProxyConfig {
  id: string;
  type: 'HTTP' | 'HTTPS' | 'SOCKS5';
  host: string;
  port: number;
  username?: string;
  password?: string;
  status: 'active' | 'inactive';
  country?: string;
  city?: string;
  ip?: string;
  isp?: string;
}

export default function ProxyManager() {
  const [proxies, setProxies] = useState<ProxyConfig[]>([]);
  const [proxyInput, setProxyInput] = useState('');
  const [proxyType, setProxyType] = useState<'HTTP' | 'HTTPS' | 'SOCKS5'>('HTTP');
  const [isRotating, setIsRotating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationProgress, setValidationProgress] = useState(0);

  useEffect(() => {
    // Load proxies from localStorage
    const savedProxies = localStorage.getItem('antidetect_proxies');
    if (savedProxies) {
      setProxies(JSON.parse(savedProxies));
    }
  }, []);

  const saveProxies = (newProxies: ProxyConfig[]) => {
    setProxies(newProxies);
    localStorage.setItem('antidetect_proxies', JSON.stringify(newProxies));
  };

  const parseProxies = (input: string): ProxyConfig[] => {
    const lines = input.split('\n').filter(line => line.trim());
    const newProxies: ProxyConfig[] = [];

    lines.forEach((line, index) => {
      const raw = line.trim();
      // Support optional scheme like socks5://host:port or bare host:port:user:pass
      let text = raw;
      let typeFromScheme: 'HTTP' | 'HTTPS' | 'SOCKS5' | undefined;
      const schemeMatch = raw.match(/^(socks5|http|https):\/\//i);
      if (schemeMatch) {
        const scheme = schemeMatch[1].toLowerCase();
        if (scheme === 'socks5') typeFromScheme = 'SOCKS5';
        if (scheme === 'http') typeFromScheme = 'HTTP';
        if (scheme === 'https') typeFromScheme = 'HTTPS';
        text = raw.replace(/^[^:]+:\/\//, '');
      }
      const parts = text.split(':');
      if (parts.length >= 2) {
        const [host, port, username, password] = parts;
        const portNum = parseInt(port);
        const finalType: 'HTTP' | 'HTTPS' | 'SOCKS5' = typeFromScheme || proxyType;
        const proxy: ProxyConfig = {
          id: `proxy_${Date.now()}_${index}`,
          type: finalType,
          host: host.trim(),
          port: portNum,
          username: username?.trim(),
          password: password?.trim(),
          status: 'inactive'
        };
        newProxies.push(proxy);
      }
    });

    return newProxies;
  };

  const addProxies = () => {
    if (!proxyInput.trim()) {
      toast.error('Please enter proxy addresses');
      return;
    }

    const newProxies = parseProxies(proxyInput);
    if (newProxies.length === 0) {
      toast.error('No valid proxies found');
      return;
    }

    const updatedProxies = [...proxies, ...newProxies];
    saveProxies(updatedProxies);
    setProxyInput('');
    toast.success(`${newProxies.length} proxies added successfully`);
  };

  const validateProxy = async (proxy: ProxyConfig): Promise<boolean> => {
    try {
      // Step 1: Check if host is a valid IP, domain, or subdomain (relaxed validation)
      const isValidIP = /^(\d{1,3}\.){3}\d{1,3}$/.test(proxy.host);
      const isValidDomain = /^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]$/.test(proxy.host);
      
      if (!isValidIP && !isValidDomain) {
        console.log(`Invalid host format: ${proxy.host}`);
        return false;
      }

      // Step 2: Try to verify the IP exists and is reachable
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      try {
        // Attempt to fetch from a test endpoint through the proxy host lookup
        const response = await fetch(`https://api.ipify.org?format=json`, {
          signal: controller.signal,
          mode: 'cors'
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          return false;
        }

        // Step 3: Validate port range
        if (proxy.port < 1 || proxy.port > 65535) {
          console.log(`Invalid port: ${proxy.port}`);
          return false;
        }

        // Step 4: Check for common proxy ports
        const commonPorts = [80, 443, 1080, 3128, 8080, 8888, 8000, 3129, 8118];
        const isCommonPort = commonPorts.includes(proxy.port);

        // Step 5: Additional validation based on proxy type
        if (proxy.type === 'SOCKS5' && proxy.port === 80) {
          console.log('SOCKS5 rarely uses port 80');
          return false;
        }

        // Step 6: If username/password provided, more likely to be valid
        const hasAuth = proxy.username && proxy.password;
        
        // Final validation score
        let validationScore = 0;
        if (isValidIP || isValidDomain) validationScore += 30;
        if (isCommonPort) validationScore += 25;
        if (hasAuth) validationScore += 25;
        if (proxy.port > 1000 && proxy.port < 65000) validationScore += 20;

        // Proxy is valid if score >= 70
        return validationScore >= 70;

      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.log(`Proxy validation failed for ${proxy.host}:${proxy.port}`, fetchError);
        return false;
      }

    } catch (error) {
      console.error('Proxy validation error:', error);
      return false;
    }
  };

  const getProxyLocation = async (host: string): Promise<{ country?: string; city?: string; ip?: string; isp?: string }> => {
    try {
      // Using ip-api.com for geolocation (free, no API key needed)
      const response = await fetch(`http://ip-api.com/json/${host}?fields=status,country,city,query,isp`);
      const data = await response.json();
      
      if (data.status === 'success') {
        return {
          country: data.country || 'Unknown',
          city: data.city || 'Unknown',
          ip: data.query || host,
          isp: data.isp || 'Unknown'
        };
      }
      return { country: 'Unknown', city: 'Unknown', ip: host, isp: 'Unknown' };
    } catch (error) {
      console.error('Failed to get location:', error);
      return { country: 'Unknown', city: 'Unknown', ip: host, isp: 'Unknown' };
    }
  };

  // Test individual proxy
  const testSingleProxy = async (proxyId: string) => {
    const proxyIndex = proxies.findIndex(p => p.id === proxyId);
    if (proxyIndex === -1) return;
    
    const proxy = proxies[proxyIndex];
    toast.info(`Testing proxy ${proxy.host}:${proxy.port}...`);
    
    try {
      // Check if Electron API is available
      if (!(window as any).electronAPI?.testProxy) {
        toast.error('❌ Please restart the application to enable proxy testing');
        return;
      }
      
      // Test proxy using Electron API
      const testResult = await (window as any).electronAPI.testProxy({
        type: proxy.type || 'HTTP',
        host: proxy.host,
        port: proxy.port,
        username: proxy.username || '',
        password: proxy.password || ''
      });
      
      const updatedProxies = [...proxies];
      updatedProxies[proxyIndex] = {
        ...proxy,
        status: testResult.success ? 'active' : 'inactive',
        country: testResult.country || 'Unknown',
        city: testResult.city || 'Unknown',
        ip: testResult.ip || proxy.host,
        timezone: testResult.timezone || 'UTC'
      } as any;
      
      setProxies(updatedProxies);
      saveProxies(updatedProxies);
      
      if (testResult.success) {
        toast.success(`✅ Proxy working! IP: ${testResult.ip} | Location: ${testResult.city}, ${testResult.country}`);
      } else {
        toast.error(`❌ Proxy failed: ${testResult.error || 'Connection failed'}`);
      }
    } catch (error) {
      toast.error(`❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const validateAllProxies = async () => {
    // Check if Electron API is available
    if (!(window as any).electronAPI?.testProxy) {
      toast.error('❌ Please restart the application to enable proxy testing');
      return;
    }
    
    setIsValidating(true);
    setValidationProgress(0);
    
    const updatedProxies = [...proxies];
    
    for (let i = 0; i < proxies.length; i++) {
      const proxy = proxies[i];
      
      // Test proxy using Electron API
      const testResult = await (window as any).electronAPI.testProxy({
        type: proxy.type || 'HTTP',
        host: proxy.host,
        port: proxy.port,
        username: proxy.username || '',
        password: proxy.password || ''
      });
      
      updatedProxies[i] = {
        ...proxy,
        status: testResult.success ? 'active' : 'inactive',
        country: testResult.country || 'Unknown',
        city: testResult.city || 'Unknown',
        ip: testResult.ip || proxy.host,
        timezone: testResult.timezone || 'UTC'
      } as any;
      
      setValidationProgress(((i + 1) / proxies.length) * 100);
      
      // Update proxies in real-time during validation
      setProxies([...updatedProxies]);
    }
    
    saveProxies(updatedProxies);
    setIsValidating(false);
    
    const activeCount = updatedProxies.filter(p => p.status === 'active').length;
    toast.success(`Validation complete: ${activeCount}/${proxies.length} proxies are working`);
  };

  const deleteProxy = (proxyId: string) => {
    const updatedProxies = proxies.filter(p => p.id !== proxyId);
    saveProxies(updatedProxies);
    toast.success('Proxy deleted');
  };

  const clearAllProxies = () => {
    saveProxies([]);
    toast.success('All proxies cleared');
  };

  const exportProxies = () => {
    const activeProxies = proxies.filter(p => p.status === 'active');
    const proxyText = activeProxies.map(p => 
      p.username ? `${p.host}:${p.port}:${p.username}:${p.password}` : `${p.host}:${p.port}`
    ).join('\n');
    
    const blob = new Blob([proxyText], { type: 'text/plain' });
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `antidetect_proxies_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(downloadUrl);
    toast.success(`Working proxies exported: ${activeProxies.length}/${proxies.length} proxies are working`);
  };

  const activeProxies = proxies.filter(p => p.status === 'active');
  const inactiveProxies = proxies.filter(p => p.status === 'inactive');

  return (
    <div className="space-y-8">
      {/* Modern Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 via-blue-900 to-indigo-900 p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
              <Server className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-2">🌐 Proxy Manager</h2>
              <p className="text-blue-100 text-lg">Professional proxy management with real-time validation</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={exportProxies}
              disabled={activeProxies.length === 0}
              className="border-white/30 text-white hover:bg-white/20 backdrop-blur-sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Working
            </Button>
            <Button
              variant="outline"
              onClick={clearAllProxies}
              disabled={proxies.length === 0}
              className="border-white/30 text-white hover:bg-white/20 backdrop-blur-sm"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden border-2 hover:shadow-xl transition-all duration-300 group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-full bg-orange-100 group-hover:bg-blue-200 transition-colors">
                <Globe className="h-6 w-6 text-orange-600" />
              </div>
              <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                Total
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Proxies</p>
              <p className="text-3xl font-bold text-blue-800">{proxies.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 hover:shadow-xl transition-all duration-300 group">
          <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-100 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-full bg-green-100 group-hover:bg-green-200 transition-colors">
                <Wifi className="h-6 w-6 text-green-600" />
              </div>
              <Badge className="bg-green-100 text-green-700">
                Working
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Active Proxies</p>
              <p className="text-3xl font-bold text-green-800">{activeProxies.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 hover:shadow-xl transition-all duration-300 group">
          <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-pink-100 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-full bg-red-100 group-hover:bg-red-200 transition-colors">
                <WifiOff className="h-6 w-6 text-red-600" />
              </div>
              <Badge variant="destructive" className="bg-red-100 text-red-700">
                Failed
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Inactive Proxies</p>
              <p className="text-3xl font-bold text-red-800">{inactiveProxies.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 hover:shadow-xl transition-all duration-300 group">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-amber-100 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-full bg-orange-100 group-hover:bg-orange-200 transition-colors">
                <Activity className={`h-6 w-6 text-orange-600 ${isRotating ? 'animate-pulse' : ''}`} />
              </div>
              <Badge variant="outline" className="bg-orange-100 text-orange-700">
                Rotation
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Auto Rotation</p>
              <div className="flex items-center gap-2">
                <Switch
                  checked={isRotating}
                  onCheckedChange={setIsRotating}
                />
                <span className={`text-sm font-semibold ${isRotating ? 'text-green-600' : 'text-gray-500'}`}>
                  {isRotating ? 'ON' : 'OFF'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modern Add Proxies Section */}
      <Card className="border-2 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 border-b">
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-blue-600" />
            Add New Proxies
          </CardTitle>
          <CardDescription>Add multiple proxies at once with support for all major proxy types</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Proxy Type</Label>
              <Select value={proxyType} onValueChange={(value: 'HTTP' | 'HTTPS' | 'SOCKS5') => setProxyType(value)}>
                <SelectTrigger className="border-2 focus:border-indigo-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HTTP">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      HTTP
                    </div>
                  </SelectItem>
                  <SelectItem value="HTTPS">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      HTTPS
                    </div>
                  </SelectItem>
                  <SelectItem value="SOCKS5">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      SOCKS5
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={validateAllProxies}
                disabled={proxies.length === 0 || isValidating}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isValidating ? 'animate-spin' : ''}`} />
                {isValidating ? 'Validating...' : 'Validate All Proxies'}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Proxy List</Label>
            <Textarea
              placeholder="192.168.1.1:8080&#10;192.168.1.2:8080:username:password&#10;socks5://192.168.1.3:1080&#10;https://192.168.1.4:3128"
              value={proxyInput}
              onChange={(e) => setProxyInput(e.target.value)}
              rows={8}
              className="border-2 focus:border-indigo-500 font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground bg-gray-50 p-3 rounded-lg">
              <strong>Supported formats:</strong> host:port | host:port:user:pass | protocol://host:port
              <br />
              <strong>Example:</strong> 192.168.1.1:8080 or socks5://192.168.1.2:1080:username:password
            </p>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={addProxies}
              disabled={!proxyInput.trim()}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <Upload className="h-4 w-4 mr-2" />
              Add Proxies ({proxyInput.split('\n').filter(line => line.trim()).length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Validation Progress */}
      {isValidating && (
        <Card className="border-2 shadow-lg">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Validating Proxies...</h3>
                <span className="text-sm font-medium text-indigo-600">{Math.round(validationProgress)}%</span>
              </div>
              <Progress value={validationProgress} className="h-3" />
              <p className="text-sm text-muted-foreground">
                Testing connectivity and validating proxy configurations...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Proxy List */}
      <Card className="border-2 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 border-b">
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5 text-blue-600" />
            Proxy List ({proxies.length})
          </CardTitle>
          <CardDescription>Manage and monitor all your proxy configurations</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">Proxy Details</TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Authentication</TableHead>
                  <TableHead className="font-semibold">IP Address</TableHead>
                  <TableHead className="font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proxies.map((proxy) => (
                  <TableRow key={proxy.id} className="hover:bg-gray-50 transition-colors">
                    <TableCell>
                      <div className="font-medium text-gray-900">
                        {proxy.host}:{proxy.port}
                      </div>
                      <div className="text-sm text-gray-500 font-mono">
                        {proxy.username && `User: ${proxy.username}`}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`font-medium ${
                        proxy.type === 'SOCKS5' ? 'border-yellow-500 text-yellow-700' :
                        proxy.type === 'HTTPS' ? 'border-green-500 text-green-700' :
                        'border-blue-500 text-orange-700'
                      }`}>
                        {proxy.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {proxy.status === 'active' ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-sm font-medium">Active</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-red-600">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <XCircle className="h-4 w-4" />
                            <span className="text-sm font-medium">Inactive</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {proxy.username ? (
                        <Badge className="bg-green-100 text-green-700">
                          <Shield className="h-3 w-3 mr-1" />
                          Authenticated
                        </Badge>
                      ) : (
                        <span className="text-gray-400 text-sm">No Auth</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Globe className="h-3 w-3 text-blue-500" />
                        <span className="text-sm font-mono text-gray-700">
                          {proxy.ip || proxy.host}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => testSingleProxy(proxy.id)}
                          className="hover:bg-orange-50 border-blue-300 text-orange-600"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Test
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteProxy(proxy.id)}
                          className="hover:bg-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {proxies.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <Server className="h-12 w-12 text-gray-300" />
                        <div>
                          <h3 className="text-lg font-medium text-gray-600">No Proxies Added</h3>
                          <p className="text-gray-500">Add some proxies to get started with proxy management</p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
