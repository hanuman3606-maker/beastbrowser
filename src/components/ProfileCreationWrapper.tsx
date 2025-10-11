import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useProfileLimits } from '@/hooks/useProfileLimits';
import { FirebaseLoginModal } from '@/components/FirebaseLoginModal';
import { useAuth } from '@/contexts/AuthContext';

interface ProfileCreationWrapperProps {
  children: (props: {
    canCreate: boolean;
    checking: boolean;
    checkProfileLimit: () => Promise<any>;
    recordProfileCreation: () => Promise<any>;
    syncActiveProfiles: (count: number) => Promise<any>;
    activeProfiles: number;
  }) => React.ReactNode;
}

export function ProfileCreationWrapper({ children }: ProfileCreationWrapperProps) {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const {
    canCreate,
    checking,
    error,
    activeProfiles,
    checkProfileLimit,
    recordProfileCreation,
    syncActiveProfiles
  } = useProfileLimits();

  // Check limits when component mounts
  useEffect(() => {
    const init = async () => {
      // If user is not logged in, show login modal
      if (!currentUser) {
        setShowLoginModal(true);
        return;
      }
      
      const result = await checkProfileLimit();
      
      if (!result.allowed && result.reason) {
        toast({
          title: 'Profile Creation Limit',
          description: result.reason,
          variant: 'destructive',
        });
      }
    };
    
    init();
  }, [checkProfileLimit, toast, currentUser]);

  // Handle limit check errors
  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
    }
  }, [error, toast]);

  return (
    <>
      {children({
        canCreate,
        checking,
        checkProfileLimit,
        recordProfileCreation,
        syncActiveProfiles,
        activeProfiles
      })}
      
      <FirebaseLoginModal 
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={() => {
          setShowLoginModal(false);
          // Re-check limits after successful login
          checkProfileLimit();
        }}
      />
    </>
  );
}