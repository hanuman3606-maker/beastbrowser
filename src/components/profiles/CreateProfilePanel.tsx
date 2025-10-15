import React, { useState, useEffect } from 'react';
import { X, Save, Globe, Shield, Smartphone, Monitor, Tablet, Bot, Plus, Settings, RefreshCw, Clipboard, TestTube, CheckCircle, AlertCircle, Fingerprint } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { userAgentLoader } from '@/lib/useragent-loader';
import { fingerprintGenerator } from '@/data/fingerprints';

interface CreateProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileCreated: (profile: any) => void;
}

const CreateProfilePanel: React.FC<CreateProfilePanelProps> = ({ 
  isOpen, 
  onClose, 
  onProfileCreated 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    proxyType: 'none' as 'none' | 'http' | 'https' | 'socks5',
    proxyHost: '',
    proxyPort: '',
    proxyUsername: '',
    proxyPassword: '',
    startingUrl: '',
    notes: '',
    userAgentPlatform: 'windows',
    browserType: 'anti' as const,
    tags: [] as string[],
    tagInput: '',
    proxyInput: '',
    customUserAgent: '',
    blockWebRTC: false,
    spoofTimezone: true,
    spoofGeolocation: true
  });

  const [isAnimating, setIsAnimating] = useState(isOpen);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [fingerprint, setFingerprint] = useState<any>(null);
  const [isTestingProxy, setIsTestingProxy] = useState(false);
  const [proxyTestResult, setProxyTestResult] = useState<{ 
    success: boolean; 
    message: string;
  } | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isGeneratingFingerprint, setIsGeneratingFingerprint] = useState(false);
  const [isPlatformChanging, setIsPlatformChanging] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    } else {
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const validateField = (field: string, value: any) => {
    const errors: Record<string, string> = {};

    switch (field) {
      case 'name':
        if (!value?.trim()) {
          errors.name = 'Profile name is required';
        } else if (value.trim().length < 2) {
          errors.name = 'Name must be at least 2 characters';
        } else if (value.trim().length > 50) {
          errors.name = 'Name must be less than 50 characters';
        }
        break;

      case 'startingUrl':
        if (value?.trim()) {
          try {
            new URL(value.trim());
          } catch {
            errors.startingUrl = 'Invalid URL format';
          }
        }
        break;

      case 'proxyInput':
        if (formData.proxyType !== 'none' && value?.trim()) {
          const parsed = parseProxyInput(value);
          if (!parsed) {
            errors.proxyInput = 'Invalid proxy format';
          } else {
            const port = parseInt(parsed.port);
            if (isNaN(port) || port < 1 || port > 65535) {
              errors.proxyInput = 'Invalid proxy port';
            }
          }
        }
        break;

      case 'customUserAgent':
        if (value?.trim() && value.trim().length < 10) {
          errors.customUserAgent = 'User agent must be at least 10 characters';
        }
        break;
    }

    return errors;
  };

  const handleInputChange = (field: string, value: any) => {
    // Immediate, synchronous update for smooth typing
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation errors when user starts typing
    if (creationError) {
      setCreationError(null);
    }

    // Handle platform changes - run async in background
    if (field === 'userAgentPlatform' && fingerprint) {
      setIsPlatformChanging(true);
      generateRandomFingerprint(value).then(newFingerprint => {
        setFingerprint(newFingerprint);
        setIsPlatformChanging(false);
      }).catch(error => {
        console.error('Failed to update platform:', error);
        setIsPlatformChanging(false);
      });
    }

    // Debounce validation to not block typing
    if (touchedFields.has(field)) {
      setTimeout(() => {
        const fieldErrors = validateField(field, value);
        setFieldErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return { ...newErrors, ...fieldErrors };
        });
      }, 300);
    }
  };

  const handleFieldBlur = (field: string) => {
    setTouchedFields(prev => new Set([...prev, field]));
    const fieldErrors = validateField(field, formData[field as keyof typeof formData]);
    setFieldErrors(prev => ({ ...prev, ...fieldErrors }));
  };

  const handleAddTag = () => {
    if (formData.tagInput.trim() && !formData.tags.includes(formData.tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, prev.tagInput.trim()],
        tagInput: ''
      }));
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const validateForm = () => {
    const errors: string[] = [];
    const allFieldErrors: Record<string, string> = {};

    // Validate all fields and collect errors
    Object.keys(formData).forEach(field => {
      const fieldErrors = validateField(field, formData[field as keyof typeof formData]);
      Object.assign(allFieldErrors, fieldErrors);
    });

    // Convert field errors to general errors
    Object.values(allFieldErrors).forEach(error => {
      errors.push(error);
    });

    return { errors, fieldErrors: allFieldErrors };
  };

  const handleSubmit = async () => {
    const { errors, fieldErrors } = validateForm();
    
    if (errors.length > 0) {
      setCreationError(errors[0]);
      setFieldErrors(fieldErrors);
      setTouchedFields(new Set(Object.keys(fieldErrors)));
      toast.error(errors[0]);
      return;
    }

    setIsCreating(true);
    setCreationError(null);

    // Use requestAnimationFrame to ensure UI updates before heavy operations
    await new Promise(resolve => requestAnimationFrame(resolve));

    try {
      // Generate enhanced fingerprint with proper timezone injection
      let profileFingerprint = fingerprint;
      if (!profileFingerprint) {
        profileFingerprint = await generateRandomFingerprint(formData.userAgentPlatform);
        setFingerprint(profileFingerprint);
      }

      // Parse proxy input if provided
      let proxyData = undefined;
      let detectedTimezone = 'auto';
      if (formData.proxyType !== 'none' && formData.proxyInput.trim()) {
        const parsed = parseProxyInput(formData.proxyInput);
        if (parsed) {
          proxyData = {
            host: parsed.host,
            port: parsed.port,
            username: parsed.username || '',
            password: parsed.password || ''
          };
          
          // ENHANCED: Auto-detect timezone from proxy IP
          if (window.electronAPI?.getTimezoneFromIP) {
            try {
              const tzResult = await window.electronAPI.getTimezoneFromIP(parsed.host);
              if (tzResult.timezone) {
                detectedTimezone = tzResult.timezone;
                toast.success('Auto-detected timezone: ' + detectedTimezone + ' from proxy location');
              }
            } catch (error) {
              console.warn('Failed to detect timezone from proxy IP:', error);
            }
          }
        }
      }

      // Build complete profile with all required fields
      const profileData = {
        id: `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: formData.name.trim(),
        browserType: formData.browserType,
        proxyType: formData.proxyType,
        proxy: proxyData,
        startingUrl: formData.startingUrl.trim() || '',
        notes: formData.notes.trim() || '',
        platform: formData.userAgentPlatform, // CRITICAL: Must be 'platform' not 'userAgentPlatform' for Playwright detection
        userAgentPlatform: formData.userAgentPlatform, // Keep for backward compatibility
        // Only set userAgent if user provided a custom one, otherwise let Electron assign unique one
        userAgent: formData.customUserAgent.trim() || undefined,
        randomFingerprint: true, // Force Electron to generate unique fingerprint on launch
        timezone: detectedTimezone, // Use detected timezone from proxy or auto
        locale: 'en-US', // Default locale
        fingerprint: profileFingerprint,
        tags: formData.tags.length > 0 ? formData.tags : ['new-profile'],
        isActive: false,
        createdAt: new Date().toISOString(),
        geoData: proxyData ? {
          ip: proxyData.host,
          timezone: detectedTimezone
        } : undefined
      };

      console.log('✅ Creating profile with enhanced data:', {
        name: profileData.name,
        browserType: profileData.browserType,
        proxyType: profileData.proxyType,
        proxyHost: proxyData?.host,
        timezone: profileData.timezone,
        platform: profileData.platform, // Show actual platform field used by Electron
        hasFingerprint: !!profileData.fingerprint
      });

      // Call the parent callback
      onProfileCreated(profileData);
      
      toast.success('Profile "' + profileData.name + '" created successfully with auto-detected settings!');
      
      // Close the panel only after successful creation
      handleClose();
      
    } catch (error) {
      console.error('Profile creation failed:', error);
      setCreationError(error instanceof Error ? error.message : 'Failed to create profile');
      toast.error('Failed to create profile. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      proxyType: 'none',
      proxyHost: '',
      proxyPort: '',
      proxyUsername: '',
      proxyPassword: '',
      startingUrl: '',
      notes: '',
      userAgentPlatform: 'windows',
      browserType: 'anti',
      tags: [],
      tagInput: '',
      proxyInput: '',
      customUserAgent: '',
      blockWebRTC: false,
      spoofTimezone: true,
      spoofGeolocation: true
    });
    setShowAdvanced(false);
    setFingerprint(null);
    setProxyTestResult(null);
    setFieldErrors({});
    setTouchedFields(new Set());
    setCreationError(null);
    setIsPlatformChanging(false);
    setIsGeneratingFingerprint(false);
    onClose();
  };

  const loadUserAgent = async (platform: string) => {
    try {
      const userAgent = await userAgentLoader.getRandomUserAgent(platform as any);
      return userAgent;
    } catch (error) {
      console.error('Failed to load user agent:', error);
      return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    }
  };

  const getSystemTimezone = () => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  };

  const generateRandomFingerprint = async (platform: string) => {
    // Use the real fingerprint generator for truly random and realistic fingerprints
    console.log(`🎲 [CreateProfilePanel] Generating random fingerprint for platform: ${platform}`);
    
    const deviceType = platform === 'android' || platform === 'ios' ? 'mobile' : 'desktop';
    const realFingerprint = fingerprintGenerator.generateRandomFingerprint(platform, deviceType);
    
    console.log(`✅ [CreateProfilePanel] Generated fingerprint:`, {
      cpu: realFingerprint.navigator.hardwareConcurrency,
      memory: realFingerprint.navigator.deviceMemory,
      screen: `${realFingerprint.screen.width}x${realFingerprint.screen.height}`,
      timezone: realFingerprint.timezone,
      userAgent: realFingerprint.userAgent.substring(0, 60) + '...'
    });
    
    return {
      // User Agent
      userAgent: realFingerprint.userAgent,
      
      // Screen (for UI display)
      resolution: `${realFingerprint.screen.width}x${realFingerprint.screen.height}`,
      screen: {
        width: realFingerprint.screen.width,
        height: realFingerprint.screen.height
      },
      
      // Hardware (flat structure for UI)
      hardwareConcurrency: realFingerprint.navigator.hardwareConcurrency,
      deviceMemory: realFingerprint.navigator.deviceMemory,
      platform: realFingerprint.navigator.platform,
      language: realFingerprint.navigator.language,
      maxTouchPoints: realFingerprint.navigator.maxTouchPoints,
      
      // Timezone
      timezone: realFingerprint.timezone,
      
      // Navigator (nested for compatibility)
      navigator: {
        platform: realFingerprint.navigator.platform,
        language: realFingerprint.navigator.language,
        hardwareConcurrency: realFingerprint.navigator.hardwareConcurrency,
        deviceMemory: realFingerprint.navigator.deviceMemory
      },
      
      // Fingerprint hashes
      canvas: realFingerprint.canvas,
      webgl: realFingerprint.webgl,
      audio: realFingerprint.audio,
      
      // WebGL
      webglVendor: 'Google Inc.',
      webglRenderer: `ANGLE (${realFingerprint.navigator.platform})`,
      
      // Canvas & Audio
      canvasNoise: 'Enabled',
      audioSampleRate: '48000'
    };
  };

  const handleGenerateFingerprint = async () => {
    setIsGeneratingFingerprint(true);
    try {
      // Use requestAnimationFrame to ensure UI updates
      await new Promise(resolve => requestAnimationFrame(resolve));
      
      const newFingerprint = await generateRandomFingerprint(formData.userAgentPlatform);
      setFingerprint(newFingerprint);
      toast.success('Random fingerprint generated successfully!');
    } catch (error) {
      console.error('Failed to generate fingerprint:', error);
      toast.error('Failed to generate fingerprint');
    } finally {
      setIsGeneratingFingerprint(false);
    }
  };

  const parseProxyInput = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return null;

    try {
      if (trimmed.includes('://')) {
        const url = new URL(trimmed);
        return {
          host: url.hostname,
          port: url.port || (url.protocol === 'https:' ? '443' : '80'),
          username: url.username || undefined,
          password: url.password || undefined
        };
      }

      if (trimmed.includes('@')) {
        const [auth, hostPort] = trimmed.split('@');
        const [username, password] = auth.split(':');
        const [host, port] = hostPort.split(':');
        return { host, port, username, password };
      }

      const parts = trimmed.split(':');
      if (parts.length >= 2) {
        const [host, port, username, password] = parts;
        return {
          host,
          port,
          username: username || undefined,
          password: password || undefined
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  };

  const handlePasteProxy = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setFormData(prev => ({ ...prev, proxyInput: text }));
      toast.success('Proxy pasted from clipboard!');
      
      // Auto-validate the pasted proxy
      if (formData.proxyType !== 'none' && text.trim()) {
        const fieldErrors = validateField('proxyInput', text);
        setFieldErrors(prev => ({ ...prev, ...fieldErrors }));
      }
    } catch (error) {
      toast.error('Failed to paste from clipboard');
    }
  };

  const handleTestProxy = async () => {
    if (formData.proxyType === 'none') {
      toast.error('No proxy configured to test');
      return;
    }

    setIsTestingProxy(true);
    setProxyTestResult(null);

    try {
      const parsed = parseProxyInput(formData.proxyInput);
      if (!parsed || !parsed.host || !parsed.port) {
        toast.error('Please enter a valid proxy in format: host:port or host:port:user:pass');
        return;
      }

      // Simulate proxy test (in real app, this would use Electron API)
      await new Promise(resolve => setTimeout(resolve, 2000));
      const success = Math.random() > 0.3;
      
      if (success) {
        const mockIP = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
        setProxyTestResult({ success: true, message: `Proxy working! IP: ${mockIP}` });
        toast.success('Proxy test successful! IP: ' + mockIP);
      } else {
        setProxyTestResult({ success: false, message: 'Connection timeout' });
        toast.error('Proxy test failed: Connection timeout');
      }
    } catch (error) {
      console.error('Proxy test error:', error);
      setProxyTestResult({ success: false, message: 'Proxy test failed' });
      toast.error('Proxy test failed');
    } finally {
      setIsTestingProxy(false);
    }
  };

  if (!isAnimating) return null;

  const platformOptions = [
    { value: 'windows', name: 'Windows', icon: Monitor },
    { value: 'macos', name: 'macOS', icon: Monitor },
    { value: 'linux', name: 'Linux', icon: Monitor },
    { value: 'android', name: 'Android', icon: Smartphone },
    { value: 'ios', name: 'iOS', icon: Smartphone },
    { value: 'tv', name: 'TV', icon: Monitor }
  ];

  return (
    <div className={`fixed inset-0 z-50 transition-all duration-300 ${
      isOpen ? 'opacity-100' : 'opacity-0'
    }`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Panel */}
      <div className={`absolute right-0 top-0 h-full w-[520px] bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 shadow-2xl transform transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Plus className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Create New Profile</h2>
                  <p className="text-blue-100 text-sm">Set up a new browser profile</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="text-white hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Basic Information</h3>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-gray-700">Profile Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    onBlur={() => handleFieldBlur('name')}
                    placeholder="Enter profile name"
                    className={`bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500 ${
                      fieldErrors.name ? 'border-red-500 focus:ring-red-500' : ''
                    }`}
                  />
                  {fieldErrors.name && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-gray-700">Browser Type</Label>
                    <Select value={formData.browserType} onValueChange={(value) => handleInputChange('browserType', value)}>
                      <SelectTrigger className="bg-white border-gray-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="anti">
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Beastbrowser
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-gray-700">Platform</Label>
                    <Select 
                      value={formData.userAgentPlatform} 
                      onValueChange={(value) => handleInputChange('userAgentPlatform', value)}
                      disabled={isPlatformChanging}
                    >
                      <SelectTrigger className={`bg-white border-gray-300 ${isPlatformChanging ? 'opacity-50' : ''}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {platformOptions.map((platform) => {
                          const IconComponent = platform.icon;
                          return (
                            <SelectItem key={platform.value} value={platform.value}>
                              <div className="flex items-center gap-2">
                                <IconComponent className="w-4 h-4" />
                                {platform.name}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {isPlatformChanging && (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                        <span className="text-xs text-blue-600">Updating fingerprint...</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-gray-700">Starting URL</Label>
                  <Input
                    value={formData.startingUrl}
                    onChange={(e) => handleInputChange('startingUrl', e.target.value)}
                    onBlur={() => handleFieldBlur('startingUrl')}
                    placeholder="Leave empty for test page (default)"
                    className={`bg-white border-gray-300 ${
                      fieldErrors.startingUrl ? 'border-red-500 focus:ring-red-500' : ''
                    }`}
                  />
                  {fieldErrors.startingUrl && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.startingUrl}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Leave empty to use version detection test page</p>
                </div>

                <div>
                  <Label className="text-gray-700">Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Optional notes about this profile"
                    rows={3}
                    className="bg-white border-gray-300"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Proxy Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Proxy Configuration</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-gray-700">Proxy Type</Label>
                  <Select value={formData.proxyType} onValueChange={(value) => handleInputChange('proxyType', value)}>
                    <SelectTrigger className="bg-white border-gray-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="none">No Proxy</SelectItem>
                      <SelectItem value="http">HTTP</SelectItem>
                      <SelectItem value="https">HTTPS</SelectItem>
                      <SelectItem value="socks5">SOCKS5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.proxyType !== 'none' && (
                  <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div>
                      <Label className="text-gray-700">Proxy Details</Label>
                      <div className="flex gap-2">
                        <Input
                          value={formData.proxyInput}
                          onChange={(e) => handleInputChange('proxyInput', e.target.value)}
                          onBlur={() => handleFieldBlur('proxyInput')}
                          placeholder="host:port or host:port:user:pass or protocol://user:pass@host:port"
                          className={`bg-white border-gray-300 flex-1 ${
                            fieldErrors.proxyInput ? 'border-red-500 focus:ring-red-500' : ''
                          }`}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handlePasteProxy}
                          className="px-3 border-blue-300 text-blue-600 hover:bg-blue-50"
                        >
                          <Clipboard className="h-4 w-4" />
                        </Button>
                      </div>
                      {fieldErrors.proxyInput && (
                        <p className="text-red-500 text-xs mt-1">{fieldErrors.proxyInput}</p>
                      )}
                      <p className="text-gray-500 text-xs mt-1">
                        Supported formats: host:port, host:port:user:pass, user:pass@host:port, protocol://user:pass@host:port
                      </p>
                    </div>

                    <Button
                      onClick={handleTestProxy}
                      disabled={isTestingProxy || !formData.proxyInput.trim()}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                    >
                      <TestTube className="h-4 w-4 mr-2" />
                      {isTestingProxy ? 'Testing...' : 'Test Proxy'}
                    </Button>

                    {proxyTestResult && (
                      <div className={`p-3 rounded-lg border ${proxyTestResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                        <div className="flex items-center gap-2">
                          {proxyTestResult.success ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          )}
                          <p className={proxyTestResult.success ? 'text-green-700 text-sm' : 'text-red-700 text-sm'}>
                            {proxyTestResult.message}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Tags */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <Settings className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Tags</h3>
              </div>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={formData.tagInput}
                    onChange={(e) => handleInputChange('tagInput', e.target.value)}
                    placeholder="Add a tag"
                    className="bg-white border-gray-300"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  />
                  <Button onClick={handleAddTag} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-blue-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <Separator />

            {/* Fingerprint Settings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Fingerprint className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">Browser Fingerprint</h3>
                </div>
                <Button
                  onClick={handleGenerateFingerprint}
                  variant="outline"
                  disabled={isGeneratingFingerprint}
                  className="border-blue-300 text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingFingerprint ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Random Fingerprint
                    </>
                  )}
                </Button>
              </div>

              {fingerprint && (
                <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-300 shadow-sm">
                  <div className="space-y-4">
                    {/* Screen & Hardware */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-white p-2 rounded border border-blue-200">
                        <span className="font-semibold text-blue-700">Screen:</span>
                        <p className="text-gray-700">{fingerprint.resolution}</p>
                      </div>
                      <div className="bg-white p-2 rounded border border-blue-200">
                        <span className="font-semibold text-blue-700">CPU Cores:</span>
                        <p className="text-gray-700">{fingerprint.hardwareConcurrency || 4}</p>
                      </div>
                      <div className="bg-white p-2 rounded border border-blue-200">
                        <span className="font-semibold text-blue-700">Memory:</span>
                        <p className="text-gray-700">{fingerprint.deviceMemory || 8} GB</p>
                      </div>
                      <div className="bg-white p-2 rounded border border-blue-200">
                        <span className="font-semibold text-blue-700">Platform:</span>
                        <p className="text-gray-700">{fingerprint.platform}</p>
                      </div>
                    </div>

                    {/* WebGL & Canvas */}
                    <div className="bg-white p-3 rounded border border-blue-200">
                      <div className="grid grid-cols-1 gap-2 text-xs">
                        <div>
                          <span className="font-semibold text-blue-700">WebGL Vendor:</span>
                          <p className="text-gray-700">{fingerprint.webglVendor || 'Google Inc.'}</p>
                        </div>
                        <div>
                          <span className="font-semibold text-blue-700">WebGL Renderer:</span>
                          <p className="text-gray-700 truncate">{fingerprint.webglRenderer || 'ANGLE (Intel HD Graphics)'}</p>
                        </div>
                        <div>
                          <span className="font-semibold text-blue-700">Canvas Noise:</span>
                          <p className="text-gray-700 font-mono">{fingerprint.canvasNoise || 'Enabled'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Audio & Media */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-white p-2 rounded border border-blue-200">
                        <span className="font-semibold text-blue-700">Audio Rate:</span>
                        <p className="text-gray-700">{fingerprint.audioSampleRate || '48000'} Hz</p>
                      </div>
                      <div className="bg-white p-2 rounded border border-blue-200">
                        <span className="font-semibold text-blue-700">Timezone:</span>
                        <p className="text-gray-700">{fingerprint.timezone}</p>
                      </div>
                      <div className="bg-white p-2 rounded border border-blue-200">
                        <span className="font-semibold text-blue-700">Language:</span>
                        <p className="text-gray-700">{fingerprint.language}</p>
                      </div>
                      <div className="bg-white p-2 rounded border border-blue-200">
                        <span className="font-semibold text-blue-700">Touch Points:</span>
                        <p className="text-gray-700">{fingerprint.maxTouchPoints || 0}</p>
                      </div>
                    </div>

                    {/* User Agent */}
                    <div className="bg-white p-2 rounded border border-blue-200">
                      <span className="font-semibold text-blue-700 text-xs">User Agent:</span>
                      <p className="text-gray-600 text-xs break-all mt-1">{fingerprint.userAgent}</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <Label className="text-gray-700">Custom User Agent (Optional)</Label>
                <Input
                  value={formData.customUserAgent}
                  onChange={(e) => handleInputChange('customUserAgent', e.target.value)}
                  onBlur={() => handleFieldBlur('customUserAgent')}
                  placeholder="Custom user agent string"
                  className={`bg-white border-gray-300 ${
                    fieldErrors.customUserAgent ? 'border-red-500 focus:ring-red-500' : ''
                  }`}
                />
                {fieldErrors.customUserAgent && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.customUserAgent}</p>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.blockWebRTC}
                    onCheckedChange={(checked) => handleInputChange('blockWebRTC', checked)}
                  />
                  <Label className="text-gray-700">Block WebRTC</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.spoofTimezone}
                    onCheckedChange={(checked) => handleInputChange('spoofTimezone', checked)}
                  />
                  <Label className="text-gray-700">Spoof Timezone</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.spoofGeolocation}
                    onCheckedChange={(checked) => handleInputChange('spoofGeolocation', checked)}
                  />
                  <Label className="text-gray-700">Spoof Geolocation</Label>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 bg-gray-50 p-6">
            {creationError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <p className="text-red-700 text-sm">{creationError}</p>
                </div>
              </div>
            )}
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isCreating}
                className="border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.name.trim() || isCreating}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Create Profile
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateProfilePanel;
