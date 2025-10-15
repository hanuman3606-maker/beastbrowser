import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';

interface LoginFormProps {
  onSwitchToSignup: () => void;
}

// Secure storage keys
const STORAGE_KEYS = {
  REMEMBER_ME: 'beast_remember_me',
  SAVED_EMAIL: 'beast_saved_email',
  SAVED_PASSWORD: 'beast_saved_password'
};

export default function LoginForm({ onSwitchToSignup }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  // Load saved credentials on mount
  useEffect(() => {
    const savedRememberMe = localStorage.getItem(STORAGE_KEYS.REMEMBER_ME) === 'true';
    if (savedRememberMe) {
      const savedEmail = localStorage.getItem(STORAGE_KEYS.SAVED_EMAIL) || '';
      const savedPassword = localStorage.getItem(STORAGE_KEYS.SAVED_PASSWORD) || '';
      
      if (savedEmail && savedPassword) {
        setEmail(savedEmail);
        setPassword(savedPassword);
        setRememberMe(true);
        console.log('✅ Loaded saved credentials');
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      const result = await login(email, password);
      
      if (result.success) {
        // Save credentials if "Remember Me" is checked
        if (rememberMe) {
          localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true');
          localStorage.setItem(STORAGE_KEYS.SAVED_EMAIL, email);
          localStorage.setItem(STORAGE_KEYS.SAVED_PASSWORD, password);
          console.log('💾 Credentials saved for next login');
        } else {
          // Clear saved credentials if unchecked
          localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
          localStorage.removeItem(STORAGE_KEYS.SAVED_EMAIL);
          localStorage.removeItem(STORAGE_KEYS.SAVED_PASSWORD);
          console.log('🗑️ Credentials cleared');
        }
        
        toast.success('Successfully logged in!');
      } else {
        // Handle specific Firebase auth errors
        if (result.error?.includes('user-not-found')) {
          toast.error('No user found with this email.');
        } else if (result.error?.includes('wrong-password')) {
          toast.error('Incorrect password.');
        } else {
          toast.error(result.error || 'Failed to log in');
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error('Failed to log in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Welcome Back</CardTitle>
        <CardDescription className="text-center">
          Sign in to your BeastBrowser account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked as boolean)}
            />
            <Label
              htmlFor="remember"
              className="text-sm font-normal cursor-pointer select-none"
            >
              Remember my email and password
            </Label>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm">
          Don't have an account?{' '}
          <Button variant="link" className="p-0" onClick={onSwitchToSignup}>
            Sign up
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}