import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FirebaseLoginModal } from '@/components/FirebaseLoginModal';
import { useAuth } from '@/contexts/AuthContext';
import { Profile } from './CreateProfileModal';
import ProfileManager from './ProfileManager';
import ProfileCreationGuard from './ProfileCreationGuard';

interface ProfileCreationFlowProps {
  profiles: Profile[];
  onProfilesChange: (profiles: Profile[]) => void;
}

export function ProfileCreationFlow({ profiles, onProfilesChange }: ProfileCreationFlowProps) {
  const { currentUser } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  // If user is not logged in, show a login prompt
  if (!currentUser) {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Profile Creation</CardTitle>
            <CardDescription>
              You need to log in to create and manage browser profiles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertTitle>Authentication Required</AlertTitle>
              <AlertDescription>
                Please log in to your BeastBrowser account to create and manage profiles.
                If you don't have an account, you can sign up for free.
              </AlertDescription>
            </Alert>
            
            <div className="flex justify-center gap-4">
              <Button onClick={() => setShowLoginModal(true)}>
                Log In
              </Button>
              <Button variant="outline" asChild>
                <a href="https://beastbrowser.com/signup" target="_blank" rel="noopener noreferrer">
                  Sign Up
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <FirebaseLoginModal 
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={() => {
            setShowLoginModal(false);
          }}
        />
      </div>
    );
  }

  // If user is logged in, show the profile manager with subscription guard
  return (
    <ProfileCreationGuard mode="single">
      <ProfileManager profiles={profiles} onProfilesChange={onProfilesChange} />
    </ProfileCreationGuard>
  );
}