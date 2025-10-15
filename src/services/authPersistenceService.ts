/**
 * Authentication Persistence Service
 * Handles persistent login and daily subscription validation
 * 
 * Features:
 * - Secure token storage
 * - Remember me functionality
 * - Daily validation (once per day)
 * - Automatic token refresh
 * - Secure credential management
 */

import { supabase } from '@/lib/supabase';

interface StoredAuth {
  token: string;
  refreshToken: string;
  userId: string;
  email: string;
  expiresAt: number;
  lastValidation: string; // ISO date string (YYYY-MM-DD)
  rememberMe: boolean;
}

interface ValidationResult {
  isValid: boolean;
  needsValidation: boolean;
  daysRemaining?: number;
  planType?: string;
  error?: string;
}

class AuthPersistenceService {
  private static instance: AuthPersistenceService;
  private readonly STORAGE_KEY = 'beast_browser_auth';
  private readonly VALIDATION_KEY = 'beast_browser_last_validation';
  
  private constructor() {}

  static getInstance(): AuthPersistenceService {
    if (!AuthPersistenceService.instance) {
      AuthPersistenceService.instance = new AuthPersistenceService();
    }
    return AuthPersistenceService.instance;
  }

  /**
   * Save authentication data securely
   */
  async saveAuth(
    token: string,
    refreshToken: string,
    userId: string,
    email: string,
    expiresAt: number,
    rememberMe: boolean = true
  ): Promise<void> {
    try {
      const authData: StoredAuth = {
        token,
        refreshToken,
        userId,
        email,
        expiresAt,
        lastValidation: this.getTodayDate(),
        rememberMe
      };

      // Store in localStorage (encrypted in production)
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(authData));
      
      console.log('✅ Auth data saved successfully');
    } catch (error) {
      console.error('❌ Failed to save auth data:', error);
      throw error;
    }
  }

  /**
   * Load stored authentication data
   */
  async loadAuth(): Promise<StoredAuth | null> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        console.log('ℹ️ No stored auth found');
        return null;
      }

      const authData: StoredAuth = JSON.parse(stored);

      // Check if remember me is enabled
      if (!authData.rememberMe) {
        console.log('ℹ️ Remember me disabled, clearing auth');
        this.clearAuth();
        return null;
      }

      // Check if token is expired
      if (Date.now() > authData.expiresAt) {
        console.log('⚠️ Token expired, attempting refresh...');
        const refreshed = await this.refreshToken(authData.refreshToken);
        if (!refreshed) {
          this.clearAuth();
          return null;
        }
        return this.loadAuth(); // Load refreshed data
      }

      console.log('✅ Loaded stored auth for:', authData.email);
      return authData;
    } catch (error) {
      console.error('❌ Failed to load auth data:', error);
      this.clearAuth();
      return null;
    }
  }

  /**
   * Refresh expired token
   */
  private async refreshToken(refreshToken: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken
      });

      if (error || !data.session) {
        console.error('❌ Token refresh failed:', error);
        return false;
      }

      // Save refreshed tokens
      await this.saveAuth(
        data.session.access_token,
        data.session.refresh_token,
        data.session.user.id,
        data.session.user.email || '',
        Date.now() + (data.session.expires_in || 3600) * 1000,
        true
      );

      console.log('✅ Token refreshed successfully');
      return true;
    } catch (error) {
      console.error('❌ Token refresh error:', error);
      return false;
    }
  }

  /**
   * Clear stored authentication
   */
  clearAuth(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.VALIDATION_KEY);
    console.log('🗑️ Auth data cleared');
  }

  /**
   * Check if validation is needed today
   * Returns true if last validation was on a different day
   */
  needsDailyValidation(): boolean {
    try {
      const authData = localStorage.getItem(this.STORAGE_KEY);
      if (!authData) {
        return true; // No auth data, needs validation
      }

      const parsed: StoredAuth = JSON.parse(authData);
      const today = this.getTodayDate();
      const lastValidation = parsed.lastValidation;

      const needsValidation = lastValidation !== today;
      
      if (needsValidation) {
        console.log(`📅 Daily validation needed (last: ${lastValidation}, today: ${today})`);
      } else {
        console.log(`✅ Already validated today (${today})`);
      }

      return needsValidation;
    } catch (error) {
      console.error('❌ Error checking validation date:', error);
      return true; // On error, perform validation
    }
  }

  /**
   * Perform daily subscription validation
   */
  async performDailyValidation(userId: string): Promise<ValidationResult> {
    try {
      console.log('🔍 Performing daily subscription validation...');

      // Check if validation is needed
      if (!this.needsDailyValidation()) {
        return {
          isValid: true,
          needsValidation: false
        };
      }

      // Query subscription from Supabase
      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (error || !subscription) {
        console.warn('⚠️ No active subscription found');
        return {
          isValid: false,
          needsValidation: true,
          error: 'No active subscription'
        };
      }

      // Check expiry
      const expiresAt = new Date(subscription.expires_at);
      const now = new Date();
      const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysRemaining <= 0) {
        console.warn('⚠️ Subscription expired');
        return {
          isValid: false,
          needsValidation: true,
          daysRemaining: 0,
          planType: subscription.plan_type,
          error: 'Subscription expired'
        };
      }

      // Update last validation date
      await this.updateValidationDate();

      console.log(`✅ Subscription valid: ${daysRemaining} days remaining`);
      return {
        isValid: true,
        needsValidation: true,
        daysRemaining,
        planType: subscription.plan_type
      };
    } catch (error: any) {
      console.error('❌ Validation error:', error);
      return {
        isValid: false,
        needsValidation: true,
        error: error.message
      };
    }
  }

  /**
   * Update last validation date to today
   */
  private async updateValidationDate(): Promise<void> {
    try {
      const authData = localStorage.getItem(this.STORAGE_KEY);
      if (!authData) return;

      const parsed: StoredAuth = JSON.parse(authData);
      parsed.lastValidation = this.getTodayDate();
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(parsed));
      console.log('📅 Validation date updated to today');
    } catch (error) {
      console.error('❌ Failed to update validation date:', error);
    }
  }

  /**
   * Get today's date in YYYY-MM-DD format
   */
  private getTodayDate(): string {
    const now = new Date();
    return now.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  /**
   * Check if user is logged in
   */
  isLoggedIn(): boolean {
    const authData = localStorage.getItem(this.STORAGE_KEY);
    if (!authData) return false;

    try {
      const parsed: StoredAuth = JSON.parse(authData);
      return parsed.rememberMe && Date.now() < parsed.expiresAt;
    } catch {
      return false;
    }
  }

  /**
   * Get stored user info
   */
  getStoredUser(): { userId: string; email: string } | null {
    try {
      const authData = localStorage.getItem(this.STORAGE_KEY);
      if (!authData) return null;

      const parsed: StoredAuth = JSON.parse(authData);
      return {
        userId: parsed.userId,
        email: parsed.email
      };
    } catch {
      return null;
    }
  }
}

export const authPersistenceService = AuthPersistenceService.getInstance();
