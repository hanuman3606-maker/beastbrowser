import { supabase, SupabaseSubscription, SupabaseProfileCreation } from '@/lib/supabase';
import { toast } from 'sonner';

/**
 * Supabase Subscription Service
 * Handles all subscription validation, expiry checking, and profile creation tracking
 */
class SupabaseSubscriptionService {
  private static instance: SupabaseSubscriptionService;

  private constructor() {}

  static getInstance(): SupabaseSubscriptionService {
    if (!SupabaseSubscriptionService.instance) {
      SupabaseSubscriptionService.instance = new SupabaseSubscriptionService();
    }
    return SupabaseSubscriptionService.instance;
  }

  /**
   * Check if user has an active subscription
   */
  async hasActiveSubscription(email: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*, users!inner(email)')
        .eq('users.email', email.toLowerCase())
        .eq('status', 'active')
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error checking subscription:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error('Error checking subscription:', error);
      return false;
    }
  }

  /**
   * Get user's active subscription details
   */
  async getActiveSubscription(email: string): Promise<SupabaseSubscription | null> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*, users!inner(email)')
        .eq('users.email', email.toLowerCase())
        .eq('status', 'active')
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Error getting subscription:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting subscription:', error);
      return null;
    }
  }

  /**
   * Get all user subscriptions (including expired)
   */
  async getUserSubscriptions(email: string): Promise<SupabaseSubscription[]> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*, users!inner(email)')
        .eq('users.email', email.toLowerCase())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting subscriptions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting subscriptions:', error);
      return [];
    }
  }

  /**
   * Create a new subscription after payment
   */
  async createSubscription(
    userId: string,
    email: string,
    planId: string,
    planName: string,
    amount: number,
    currency: string,
    interval: 'month' | 'year',
    paymentMethod: string,
    paymentId?: string
  ): Promise<{ success: boolean; subscription?: SupabaseSubscription; error?: string }> {
    try {
      const startDate = new Date();
      const endDate = new Date();
      
      // Calculate end date based on interval
      if (interval === 'month') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      const subscriptionData = {
        user_id: userId,
        user_email: email.toLowerCase(),
        plan_id: planId,
        plan_name: planName,
        status: 'active',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        amount,
        currency,
        payment_method: paymentMethod,
        payment_id: paymentId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('subscriptions')
        .insert(subscriptionData)
        .select()
        .single();

      if (error) {
        console.error('Error creating subscription:', error);
        return { success: false, error: error.message };
      }

      return { success: true, subscription: data };
    } catch (error: any) {
      console.error('Error creating subscription:', error);
      return { success: false, error: error.message || 'Failed to create subscription' };
    }
  }

  /**
   * Check if subscription is expired and update status
   */
  async checkAndUpdateExpiredSubscriptions(email: string): Promise<void> {
    try {
      const now = new Date().toISOString();
      
      // Update expired subscriptions
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase())
        .single();
      
      if (userData) {
        const { error } = await supabase
          .from('subscriptions')
          .update({ status: 'expired' })
          .eq('user_id', userData.id)
          .eq('status', 'active')
          .lt('expires_at', now);
        
        if (error) {
          console.error('Error updating expired subscriptions:', error);
        }
      }
    } catch (error) {
      console.error('Error checking expired subscriptions:', error);
    }
  }

  /**
   * Validate if user can create profiles
   * Directly checks Supabase database
   */
  async validateProfileCreation(email: string): Promise<{
    allowed: boolean;
    reason?: string;
    subscription?: SupabaseSubscription;
  }> {
    try {
      // Check if we need daily validation
      const lastValidationKey = `subscription_validation_${email}`;
      const lastValidation = localStorage.getItem(lastValidationKey);
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      // If already validated today, use cached result
      if (lastValidation) {
        const cached = JSON.parse(lastValidation);
        if (cached.date === today && cached.subscription) {
          console.log('✅ Using cached validation (already checked today)');
          return {
            allowed: true,
            subscription: cached.subscription
          };
        }
      }
      
      console.log('🔍 Validating profile creation for:', email);
      
      // First check and update expired subscriptions
      await this.checkAndUpdateExpiredSubscriptions(email);
      
      // Get active subscription directly from Supabase
      const subscription = await this.getActiveSubscription(email);
      
      if (!subscription) {
        console.log('❌ No active subscription found');
        return {
          allowed: false,
          reason: 'No active subscription found. Please update your plan to continue creating profiles.'
        };
      }
      
      // Check if subscription is still valid
      const expiresAt = new Date(subscription.expires_at);
      const now = new Date();
      
      if (expiresAt < now) {
        console.log('❌ Subscription expired');
        return {
          allowed: false,
          reason: 'Your subscription has expired. Please renew to continue creating profiles.'
        };
      }
      
      // Calculate days remaining
      const diffTime = expiresAt.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      console.log('✅ Valid subscription found:', {
        plan: subscription.plan_type,
        daysRemaining,
        expiresAt: subscription.expires_at
      });
      
      // Cache validation result for today
      localStorage.setItem(lastValidationKey, JSON.stringify({
        date: today,
        subscription,
        daysRemaining
      }));
      console.log('💾 Validation cached for today');
      
      return {
        allowed: true,
        subscription
      };
    } catch (error: any) {
      console.error('❌ Error validating profile creation:', error);
      return {
        allowed: false,
        reason: 'Error validating subscription. Please try again.'
      };
    }
  }

  /**
   * Record profile creation in database
   */
  async recordProfileCreation(
    userId: string,
    email: string,
    profileName: string,
    profileId: string,
    isBulk: boolean = false,
    profileCount: number = 1
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const profileData = {
        user_id: userId,
        user_email: email.toLowerCase(),
        profile_name: profileName,
        profile_id: profileId,
        created_at: new Date().toISOString(),
        is_bulk: isBulk,
        profile_count: profileCount
      };

      const { error } = await supabase
        .from('profile_creations')
        .insert(profileData);

      if (error) {
        console.error('Error recording profile creation:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error recording profile creation:', error);
      return { success: false, error: error.message || 'Failed to record profile creation' };
    }
  }

  /**
   * Get user's profile creation history
   */
  async getProfileCreationHistory(email: string, limit: number = 50): Promise<SupabaseProfileCreation[]> {
    try {
      const { data, error } = await supabase
        .from('profile_creations')
        .select('*')
        .eq('user_email', email.toLowerCase())
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error getting profile history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting profile history:', error);
      return [];
    }
  }

  /**
   * Get total profile count for user
   */
  async getTotalProfileCount(email: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('profile_creations')
        .select('profile_count')
        .eq('user_email', email.toLowerCase());

      if (error) {
        console.error('Error getting profile count:', error);
        return 0;
      }

      return data.reduce((total, item) => total + (item.profile_count || 1), 0);
    } catch (error) {
      console.error('Error getting profile count:', error);
      return 0;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);

      if (error) {
        console.error('Error cancelling subscription:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error cancelling subscription:', error);
      return { success: false, error: error.message || 'Failed to cancel subscription' };
    }
  }

  /**
   * Sync user data to admin panel
   */
  async syncUserToAdmin(
    userId: string,
    email: string,
    displayName: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const userData = {
        id: userId,
        email: email.toLowerCase(),
        display_name: displayName,
        last_login_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('users')
        .upsert(userData, {
          onConflict: 'id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('Error syncing user to admin:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error syncing user to admin:', error);
      return { success: false, error: error.message || 'Failed to sync user' };
    }
  }

  /**
   * Get subscription statistics
   */
  async getSubscriptionStats(email: string): Promise<{
    totalSpent: number;
    activeSubscription: SupabaseSubscription | null;
    totalProfiles: number;
    daysRemaining: number;
  }> {
    try {
      const subscriptions = await this.getUserSubscriptions(email);
      const activeSubscription = await this.getActiveSubscription(email);
      const totalProfiles = await this.getTotalProfileCount(email);

      const totalSpent = subscriptions.reduce((total, sub) => total + (sub.amount || 0), 0);

      let daysRemaining = 0;
      if (activeSubscription) {
        const expiresAt = new Date(activeSubscription.expires_at);
        const now = new Date();
        const diffTime = expiresAt.getTime() - now.getTime();
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      return {
        totalSpent,
        activeSubscription,
        totalProfiles,
        daysRemaining: Math.max(0, daysRemaining)
      };
    } catch (error) {
      console.error('Error getting subscription stats:', error);
      return {
        totalSpent: 0,
        activeSubscription: null,
        totalProfiles: 0,
        daysRemaining: 0
      };
    }
  }
}

export const supabaseSubscriptionService = SupabaseSubscriptionService.getInstance();
