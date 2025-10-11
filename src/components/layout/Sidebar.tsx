import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Globe, 
  Bot, 
  Settings, 
  User,
  Shield,
  Menu,
  X,
  Gift,
  Headphones
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isCollapsed: boolean;
  onToggle: () => void;
}

const tabs = [
  {
    id: 'profiles',
    label: 'Profile Manager',
    icon: Users,
    description: 'Create and manage anti-detection browser profiles'
  },
  {
    id: 'proxies',
    label: 'Proxy Manager',
    icon: Globe,
    description: 'Configure and test proxy connections'
  },
  {
    id: 'rpa',
    label: 'Automation Center',
    icon: Bot,
    description: 'Create and run automation scripts'
  },
  {
    id: 'referral',
    label: 'Referral Program',
    icon: Gift,
    description: 'Earn 50% commission with referrals'
  },
  {
    id: 'support',
    label: 'Support Team',
    icon: Headphones,
    description: 'Get help from support'
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    description: 'Global configuration'
  },
  {
    id: 'user',
    label: 'Account',
    icon: User,
    description: 'User management'
  }
];

export default function Sidebar({ activeTab, onTabChange, isCollapsed, onToggle }: SidebarProps) {
  return (
    <div className={cn(
      "bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 border-r border-blue-500/20 transition-all duration-300 ease-in-out flex flex-col shadow-2xl",
      isCollapsed ? "w-16" : "w-64",
      "animate-fade-in"
    )}>
      {/* Header */}
      <div className="p-6 border-b border-blue-400/20 flex items-center justify-center bg-gradient-to-r from-slate-800/90 to-blue-900/90 backdrop-blur-sm relative">
        {!isCollapsed && (
          <div className="flex items-center justify-center">
            <img 
              src="beast-logo.png" 
              alt="Beast Browser Logo" 
              className="h-50 w-50 drop-shadow-2xl hover:scale-110 transition-transform duration-300 animate-pulse-slow" 
              onError={(e) => {
                // Fallback if image not found
                e.currentTarget.style.display = 'none';
                console.warn('Logo not found at beast-logo.png');
              }}
            />
          </div>
        )}
        {isCollapsed && (
          <img 
            src="beast-logo.png" 
            alt="Beast Browser Logo" 
            className="h-12 w-12 drop-shadow-lg hover:scale-110 transition-transform duration-300" 
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-200 hover:bg-blue-500/20 hover:text-white transition-all duration-200 rounded-lg"
        >
          {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto">
        <div className="space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <Button
                key={tab.id}
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start h-12 text-slate-200 transition-all duration-200 ease-in-out rounded-lg",
                  isCollapsed && "px-3",
                  isActive && "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 border border-blue-400/30",
                  !isActive && "hover:bg-gradient-to-r hover:from-blue-500/20 hover:to-indigo-500/20 hover:text-white"
                )}
                onClick={() => onTabChange(tab.id)}
              >
                <Icon className={cn("h-5 w-5 flex-shrink-0", !isCollapsed && "mr-3")} />
                {!isCollapsed && (
                  <div className="flex-1 text-left min-w-0">
                    <div className="font-medium truncate">{tab.label}</div>
                    <div className="text-xs text-slate-300/80 truncate">{tab.description}</div>
                  </div>
                )}
                {isActive && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                )}
              </Button>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-blue-400/20 bg-gradient-to-r from-slate-800/80 to-blue-900/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-xs bg-blue-500/20 text-blue-100 border-blue-400/30">
              <Shield className="h-3 w-3 mr-1" />
              Secure
            </Badge>
            <span className="text-xs text-slate-300/70 font-mono">v2.0.4</span>
          </div>
        </div>
      )}
    </div>
  );
}