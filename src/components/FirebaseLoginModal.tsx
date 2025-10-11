import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface FirebaseLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: () => void;
}

export function FirebaseLoginModal({ isOpen, onClose, onLoginSuccess }: FirebaseLoginModalProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setPassword('');
      setLoading(false);
    }
  }, [isOpen]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await login(email, password);
      
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Logged in successfully!',
        });
        if (onLoginSuccess) onLoginSuccess();
        onClose();
      } else {
        // Handle specific error cases
        if (result.error?.includes('redirect_to_pricing')) {
          // Redirect to pricing page
          window.location.href = 'https://beastbrowser.com/pricing/';
        } else {
          toast({
            title: 'Error',
            description: result.error || 'Login failed',
            variant: 'destructive',
          });
        }
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Login to BeastBrowser</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleLogin} className="space-y-4" onKeyDown={(e) => e.stopPropagation()}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            autoFocus />
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
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </div>
        </form>
        <div className="text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <a 
            href="https://beastbrowser.com/signup" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Sign up
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}