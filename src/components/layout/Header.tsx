import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  Settings, 
  User,
  Shield,
  Activity,
  Globe 
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';

interface HeaderProps {
  title: string;
  description?: string;
}

export default function Header({ title, description }: HeaderProps) {
  const { currentUser } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [planLabel, setPlanLabel] = useState<'Premium' | 'Free Trial' | 'Free'>('Free');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const sub = await (window as any).firebaseAPI?.getSubscription?.();
        if (sub?.success && sub.subscription) {
          const data = sub.subscription;
          if (data.plan === 'premium' || data.planId === 'monthly_plan' || data.planId === 'yearly_plan') {
            setPlanLabel('Premium');
          } else if (data.trialDays || data.status === 'trialing') {
            setPlanLabel('Free Trial');
          } else {
            setPlanLabel('Free');
          }
        } else {
          setPlanLabel('Free');
        }
      } catch {
        setPlanLabel('Free');
      }
    };
    fetchPlan();
  }, [currentUser?.uid]);

  return (
    <div className="bg-gradient-to-r from-slate-800/50 via-blue-900/50 to-indigo-900/50 backdrop-blur-md border-b border-blue-400/20 rounded-t-xl shadow-lg">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  {title}
                </h1>
                {description && (
                  <p className="text-sm text-slate-400 mt-1">{description}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden md:flex items-center space-x-3 text-sm text-slate-300 bg-slate-800/50 px-4 py-2 rounded-lg border border-blue-500/20">
              <Activity className="h-4 w-4 text-blue-400" />
              <span className="font-mono">{currentTime.toLocaleTimeString()}</span>
              <div className="w-px h-4 bg-blue-500/30"></div>
              <Globe className="h-4 w-4 text-green-400" />
              <span className="text-green-400 font-medium">Online</span>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="relative text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 transition-all duration-200"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-blue-500 rounded-full animate-pulse shadow-lg shadow-blue-500/50"></span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 transition-all duration-200"
            >
              <Settings className="h-5 w-5" />
            </Button>

            <div className="flex items-center space-x-3 pl-3 border-l border-blue-400/20">
              <div className="text-right hidden lg:block">
                <p className="text-sm font-medium text-slate-200">{currentUser?.email}</p>
                <p className="text-xs text-blue-400 font-semibold">{planLabel}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 transition-all duration-200"
              >
                <User className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}