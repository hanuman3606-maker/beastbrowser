/**
 * Example Login Component with Single Session Support
 * This shows how to integrate the single session feature
 */

import React, { useState } from 'react';
import { useSupabaseSession } from '@/hooks/useSupabaseSession';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, LogIn, LogOut, Shield } from 'lucide-react';

export function LoginExample() {
  const { user, loading, isAuthenticated, signIn, signOut } = useSupabaseSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    setIsSubmitting(true);

    const { error } = await signIn(email, password);

    if (error) {
      console.error('Login error:', error);
      
      // Handle specific error cases
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Invalid email or password');
      } else if (error.message.includes('Email not confirmed')) {
        toast.error('Please confirm your email first');
      } else {
        toast.error('Login failed', {
          description: error.message
        });
      }
    } else {
      toast.success('Login successful!', {
        description: 'Welcome back!'
      });
      setEmail('');
      setPassword('');
    }

    setIsSubmitting(false);
  };

  const handleLogout = async () => {
    setIsSubmitting(true);
    await signOut();
    toast.success('Logged out successfully');
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-600" />
              Logged In
            </CardTitle>
            <CardDescription>
              Single session is active
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-900">
                Welcome, {user.email}!
              </p>
              <p className="text-xs text-green-700 mt-1">
                Your session is protected. Logging in from another device will automatically log you out here.
              </p>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              <p><strong>User ID:</strong> {user.id}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Created:</strong> {new Date(user.created_at).toLocaleDateString()}</p>
            </div>

            <Button
              onClick={handleLogout}
              disabled={isSubmitting}
              className="w-full"
              variant="destructive"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Logging out...
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogIn className="w-5 h-5" />
            Login
          </CardTitle>
          <CardDescription>
            Single session enforced - one device at a time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-900">
                  <strong>Single Session Active:</strong> If you log in from another device, 
                  your previous session will be automatically logged out.
                </p>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Logging in...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Login
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
