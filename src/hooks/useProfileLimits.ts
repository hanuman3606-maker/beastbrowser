import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface ProfileLimitState {
  canCreate: boolean;
  checking: boolean;
  error: string | null;
  plan: string | null;
  dailyCount: number;
  remaining: number;
  activeProfiles: number;
  reason: string | null;
}

export function useProfileLimits() {
  const { currentUser } = useAuth();
  const [limitState, setLimitState] = useState<ProfileLimitState>({
    canCreate: true,
    checking: false,
    error: null,
    plan: null,
    dailyCount: 0,
    remaining: 7,
    activeProfiles: 0,
    reason: null
  });

  const checkProfileLimit = async () => {
    // If user is not logged in, return appropriate response
    if (!currentUser) {
      return { 
        allowed: false, 
        reason: 'Login required to create profiles',
        action: 'login_required'
      };
    }
    
    try {
      setLimitState(prev => ({ ...prev, checking: true, error: null }));
      
      const result = await window.firebaseAPI.checkProfileLimit();
      
      if (result.allowed) {
        setLimitState({
          canCreate: true,
          checking: false,
          error: null,
          plan: result.plan || null,
          dailyCount: result.dailyCount || 0,
          remaining: result.remaining || 7,
          activeProfiles: result.activeProfiles || 0,
          reason: null
        });
      } else {
        setLimitState({
          canCreate: false,
          checking: false,
          error: null,
          plan: result.plan || null,
          dailyCount: 0,
          remaining: 0,
          activeProfiles: 0,
          reason: result.reason || 'Profile creation not allowed'
        });
        
        // Handle redirect to pricing if needed
        if (result.action === 'redirect_to_pricing') {
          // This will be handled by the main process
          window.location.href = 'https://beastbrowser.com/pricing/';
        }
      }
      
      return result;
    } catch (error: any) {
      setLimitState({
        canCreate: false,
        checking: false,
        error: error.message || 'Failed to check profile limits',
        plan: null,
        dailyCount: 0,
        remaining: 0,
        activeProfiles: 0,
        reason: error.message || 'Failed to check profile limits'
      });
      
      return { allowed: false, reason: error.message || 'Failed to check profile limits' };
    }
  };

  const recordProfileCreation = async () => {
    try {
      const result = await window.firebaseAPI.recordProfileCreation();
      return result;
    } catch (error: any) {
      console.error('Error recording profile creation:', error);
      return { success: false, error: error.message || 'Failed to record profile creation' };
    }
  };

  const syncActiveProfiles = async (count: number) => {
    try {
      const result = await window.firebaseAPI.syncActiveProfiles(count);
      return result;
    } catch (error: any) {
      console.error('Error syncing active profiles:', error);
      return { success: false, error: error.message || 'Failed to sync active profiles' };
    }
  };

  return {
    ...limitState,
    checkProfileLimit,
    recordProfileCreation,
    syncActiveProfiles
  };
}