import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabaseSubscriptionService } from '@/services/supabaseSubscriptionService';
import { toast } from 'sonner';

/**
 * Hook for tracking profile creation and subscription usage
 */
export function useSubscriptionTracking() {
  const { currentUser } = useAuth();

  /**
   * Record a profile creation in Supabase
   */
  const recordProfileCreation = useCallback(async (
    profileName: string,
    profileId: string,
    isBulk: boolean = false,
    profileCount: number = 1
  ): Promise<boolean> => {
    if (!currentUser || !currentUser.email) {
      toast.error('User not authenticated');
      return false;
    }

    try {
      const result = await supabaseSubscriptionService.recordProfileCreation(
        currentUser.id,
        currentUser.email,
        profileName,
        profileId,
        isBulk,
        profileCount
      );

      if (result.success) {
        console.log('Profile creation recorded successfully');
        return true;
      } else {
        console.error('Failed to record profile creation:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Error recording profile creation:', error);
      return false;
    }
  }, [currentUser]);

  /**
   * Validate if user can create profiles
   */
  const validateProfileCreation = useCallback(async (): Promise<{
    allowed: boolean;
    reason?: string;
  }> => {
    if (!currentUser || !currentUser.email) {
      return {
        allowed: false,
        reason: 'User not authenticated'
      };
    }

    try {
      const validation = await supabaseSubscriptionService.validateProfileCreation(currentUser.email);
      return {
        allowed: validation.allowed,
        reason: validation.reason
      };
    } catch (error) {
      console.error('Error validating profile creation:', error);
      return {
        allowed: false,
        reason: 'Error validating subscription'
      };
    }
  }, [currentUser]);

  /**
   * Get subscription statistics
   */
  const getSubscriptionStats = useCallback(async () => {
    if (!currentUser || !currentUser.email) {
      return null;
    }

    try {
      return await supabaseSubscriptionService.getSubscriptionStats(currentUser.email);
    } catch (error) {
      console.error('Error getting subscription stats:', error);
      return null;
    }
  }, [currentUser]);

  /**
   * Get profile creation history
   */
  const getProfileHistory = useCallback(async (limit: number = 50) => {
    if (!currentUser || !currentUser.email) {
      return [];
    }

    try {
      return await supabaseSubscriptionService.getProfileCreationHistory(currentUser.email, limit);
    } catch (error) {
      console.error('Error getting profile history:', error);
      return [];
    }
  }, [currentUser]);

  return {
    recordProfileCreation,
    validateProfileCreation,
    getSubscriptionStats,
    getProfileHistory
  };
}
