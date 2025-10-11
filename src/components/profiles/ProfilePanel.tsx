import { useState, useEffect } from 'react';
import { X, Save, Trash2, Globe, Shield, Cpu, Monitor, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Profile } from '@/components/profiles/CreateProfileModal';

interface ProfilePanelProps {
  profile: Profile | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (profile: Profile) => void;
  onDelete: (id: string) => void;
}

export default function ProfilePanel({ profile, isOpen, onClose, onSave, onDelete }: ProfilePanelProps) {
  const [formData, setFormData] = useState<Profile>({
    id: '',
    name: '',
    os: 'Windows 11',
    browser: 'Chrome 120',
    screen: '1920x1080',
    proxy: '',
    userAgent: '',
    fingerprint: {
      webGL: true,
      canvas: true,
      audio: true,
      webRTC: true,
      clientRects: true,
      fonts: true
    },
    timezone: 'America/New_York',
    geolocation: { lat: 40.7128, lng: -74.0060 },
    createdAt: new Date()
  });

  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData(profile);
      setIsAnimating(true);
    } else {
      setIsAnimating(false);
    }
  }, [profile, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  const handleDelete = () => {
    if (formData.id) {
      onDelete(formData.id);
      onClose();
    }
  };

  return (
    <div className={`fixed inset-0 z-50 ${isAnimating ? 'animate-fade-in' : ''}`}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-gradient-to-b from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 shadow-2xl animate-slide-in-from-right">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-blue-200/30 bg-gradient-to-r from-blue-500/10 to-indigo-500/10">
            <div className="flex items-center space-x-3">
              <Shield className="h-6 w-6 text-blue-600" />
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {profile?.id ? 'Edit Profile' : 'Create Profile'}
                </h2>
                <p className="text-sm text-muted-foreground">Configure advanced browser fingerprinting</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-100/50"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-3">
                <Globe className="h-5 w-5 text-blue-600" />
                <Label className="text-lg font-semibold">Basic Configuration</Label>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Profile Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="My Secure Profile"
                    className="border-blue-200 focus:border-blue-400 focus:ring-blue-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="os">Operating System</Label>
                  <Select value={formData.os} onValueChange={(value) => setFormData({ ...formData, os: value })}>
                    <SelectTrigger className="border-orange-200 focus:border-orange-400 focus:ring-orange-400">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Windows 11">Windows 11</SelectItem>
                      <SelectItem value="Windows 10">Windows 10</SelectItem>
                      <SelectItem value="macOS Sonoma">macOS Sonoma</SelectItem>
                      <SelectItem value="macOS Ventura">macOS Ventura</SelectItem>
                      <SelectItem value="Ubuntu 22.04">Ubuntu 22.04</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="browser">Browser</Label>
                  <Select value={formData.browser} onValueChange={(value) => setFormData({ ...formData, browser: value })}>
                    <SelectTrigger className="border-orange-200 focus:border-orange-400 focus:ring-orange-400">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Chrome 120">Chrome 120</SelectItem>
                      <SelectItem value="Firefox 121">Firefox 121</SelectItem>
                      <SelectItem value="Edge 120">Edge 120</SelectItem>
                      <SelectItem value="Safari 17">Safari 17</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="screen">Screen Resolution</Label>
                  <Select value={formData.screen} onValueChange={(value) => setFormData({ ...formData, screen: value })}>
                    <SelectTrigger className="border-orange-200 focus:border-orange-400 focus:ring-orange-400">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1920x1080">1920x1080 (Full HD)</SelectItem>
                      <SelectItem value="2560x1440">2560x1440 (2K)</SelectItem>
                      <SelectItem value="3840x2160">3840x2160 (4K)</SelectItem>
                      <SelectItem value="1366x768">1366x768 (HD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator className="bg-blue-200/30" />

            {/* Fingerprint Settings */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-3">
                <Cpu className="h-5 w-5 text-indigo-600" />
                <Label className="text-lg font-semibold">Fingerprint Protection</Label>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">Advanced</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-gray-900/50 rounded-lg border border-blue-200/30">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">WebGL Fingerprint</Label>
                    <p className="text-xs text-muted-foreground">Spoof WebGL rendering</p>
                  </div>
                  <Switch
                    checked={formData.fingerprint.webGL}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      fingerprint: { ...formData.fingerprint, webGL: checked }
                    })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-gray-900/50 rounded-lg border border-blue-200/30">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Canvas Fingerprint</Label>
                    <p className="text-xs text-muted-foreground">Randomize canvas data</p>
                  </div>
                  <Switch
                    checked={formData.fingerprint.canvas}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      fingerprint: { ...formData.fingerprint, canvas: checked }
                    })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-gray-900/50 rounded-lg border border-blue-200/30">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Audio Fingerprint</Label>
                    <p className="text-xs text-muted-foreground">Modify audio context</p>
                  </div>
                  <Switch
                    checked={formData.fingerprint.audio}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      fingerprint: { ...formData.fingerprint, audio: checked }
                    })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-gray-900/50 rounded-lg border border-blue-200/30">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">WebRTC Protection</Label>
                    <p className="text-xs text-muted-foreground">Block IP leaks</p>
                  </div>
                  <Switch
                    checked={formData.fingerprint.webRTC}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      fingerprint: { ...formData.fingerprint, webRTC: checked }
                    })}
                  />
                </div>
              </div>
            </div>

            <Separator className="bg-blue-200/30" />

            {/* Proxy Settings */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-3">
                <Monitor className="h-5 w-5 text-blue-600" />
                <Label className="text-lg font-semibold">Network Configuration</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="proxy">Proxy Connection</Label>
                <Input
                  id="proxy"
                  value={formData.proxy}
                  onChange={(e) => setFormData({ ...formData, proxy: e.target.value })}
                  placeholder="http://user:pass@proxy:port or socks5://..."
                  className="border-orange-200 focus:border-orange-400 focus:ring-orange-400"
                />
                <p className="text-xs text-muted-foreground">Leave empty for direct connection</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select value={formData.timezone} onValueChange={(value) => setFormData({ ...formData, timezone: value })}>
                  <SelectTrigger className="border-orange-200 focus:border-orange-400 focus:ring-orange-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/New_York">America/New_York</SelectItem>
                    <SelectItem value="America/Los_Angeles">America/Los_Angeles</SelectItem>
                    <SelectItem value="Europe/London">Europe/London</SelectItem>
                    <SelectItem value="Europe/Paris">Europe/Paris</SelectItem>
                    <SelectItem value="Asia/Tokyo">Asia/Tokyo</SelectItem>
                    <SelectItem value="Asia/Shanghai">Asia/Shanghai</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-blue-200/30 bg-gradient-to-r from-blue-500/5 to-indigo-500/5">
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="border-blue-300 text-blue-700">
                <Smartphone className="h-3 w-3 mr-1" />
                Advanced Protection
              </Badge>
            </div>
            
            <div className="flex items-center space-x-3">
              {profile?.id && (
                <Button
                  variant="outline"
                  onClick={handleDelete}
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
              <Button
                onClick={handleSave}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                {profile?.id ? 'Update Profile' : 'Create Profile'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
