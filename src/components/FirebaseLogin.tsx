import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

interface FirebaseLoginProps {
  onLoginSuccess?: () => void;
}

export function FirebaseLogin({ onLoginSuccess }: FirebaseLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();

  // Check if user is already logged in
  useEffect(() => {
    const checkUser = async () => {
      try {
        const result = await window.firebaseAPI.getUser();
        if (result.success) {
          setUser(result.user);
          if (onLoginSuccess) onLoginSuccess();
        }
      } catch (error) {
        console.error('Error checking user:', error);
      }
    };

    checkUser();

    // Listen for auth state changes
    const unsubscribe = window.firebaseAPI.onAuthStateChanged((data: any) => {
      if (data.isAuthenticated) {
        setUser(data.user);
        if (onLoginSuccess) onLoginSuccess();
      } else {
        setUser(null);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [onLoginSuccess]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await window.firebaseAPI.login(email, password);
      
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Logged in successfully!',
        });
        setUser(result.user);
        if (onLoginSuccess) onLoginSuccess();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Login failed',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Login failed',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      // For now, we'll just clear the local state
      setUser(null);
      toast({
        title: 'Success',
        description: 'Logged out successfully!',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Logout failed',
        variant: 'destructive',
      });
    }
  };

  if (user) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
          <CardDescription>You are logged in as {user.email}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={handleLogout} className="w-full">
            Logout
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Login to BeastBrowser</CardTitle>
        <CardDescription>
          Login with your BeastBrowser account to access premium features
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleLogin} onKeyDown={(e) => e.stopPropagation()}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
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
              required
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </CardFooter>
      </form>
      <div className="px-6 pb-6 text-center text-sm text-muted-foreground">
        Don't have an account?{' '}
        <a 
          href="https://beastbrowser.com/signup" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          Sign up on our website
        </a>
      </div>
    </Card>
  );
}