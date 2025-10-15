/**
 * Supabase Single Session Manager
 * Handles automatic logout when session is revoked due to login from another device
 */

import { supabase } from './supabase';
import { toast } from 'sonner';

export class SupabaseSessionManager {
  private static instance: SupabaseSessionManager;
  private isMonitoring = false;
  private sessionCheckInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): SupabaseSessionManager {
    if (!SupabaseSessionManager.instance) {
      SupabaseSessionManager.instance = new SupabaseSessionManager();
    }
    return SupabaseSessionManager.instance;
  }

  /**
   * Initialize session monitoring
   * Call this after successful login
   */
  async initialize() {
    if (this.isMonitoring) {
      console.log('📡 Session monitoring already active');
      return;
    }

    console.log('🔐 Initializing single session monitoring...');

    // Listen for auth state changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`🔔 Auth event: ${event}`, {
        hasSession: !!session,
        userId: session?.user?.id
      });

      switch (event) {
        case 'SIGNED_IN':
          await this.onSignIn(session);
          break;

        case 'SIGNED_OUT':
          await this.onSignOut();
          break;

        case 'TOKEN_REFRESHED':
          console.log('🔄 Token refreshed successfully');
          break;

        case 'USER_UPDATED':
          console.log('👤 User updated');
          break;
      }
    });

    // Start periodic session validation
    this.startSessionValidation();

    this.isMonitoring = true;
    console.log('✅ Session monitoring initialized');
  }

  /**
   * Handle sign in event
   */
  private async onSignIn(session: any) {
    if (!session) return;

    console.log('✅ User signed in:', session.user.email);

    // Log session creation
    await this.logSessionEvent(session.user.id, 'login', {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      timestamp: new Date().toISOString()
    });

    // Show success message
    toast.success('Logged in successfully', {
      description: 'Your session is now active'
    });
  }

  /**
   * Handle sign out event
   */
  private async onSignOut() {
    console.log('🚪 User signed out');

    this.stopSessionValidation();

    // Show logout message
    toast.info('Logged out', {
      description: 'Your session has ended'
    });
  }

  /**
   * Start periodic session validation
   * Checks every 30 seconds if session is still valid
   */
  private startSessionValidation() {
    if (this.sessionCheckInterval) {
      return;
    }

    console.log('⏰ Starting session validation checks...');

    this.sessionCheckInterval = setInterval(async () => {
      await this.validateSession();
    }, 30000); // Check every 30 seconds

    // Also validate immediately
    this.validateSession();
  }

  /**
   * Stop session validation
   */
  private stopSessionValidation() {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
      console.log('⏸️ Session validation stopped');
    }
  }

  /**
   * Validate current session
   * If session is invalid (revoked), log out user
   */
  private async validateSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('❌ Session validation error:', error);
        await this.handleSessionRevoked();
        return;
      }

      if (!session) {
        console.log('⚠️ No active session found');
        return;
      }

      // Session is valid
      console.log('✅ Session valid:', {
        userId: session.user.id,
        expiresAt: new Date(session.expires_at! * 1000).toLocaleString()
      });

    } catch (error) {
      console.error('❌ Session validation failed:', error);
      await this.handleSessionRevoked();
    }
  }

  /**
   * Handle session revoked (logged in from another device)
   */
  private async handleSessionRevoked() {
    console.warn('🚨 Session revoked - logging out...');

    // Stop monitoring
    this.stopSessionValidation();
    this.isMonitoring = false;

    // Sign out locally
    await supabase.auth.signOut();

    // Show alert to user
    toast.error('Session Expired', {
      description: 'You have been logged in from another device. Please log in again.',
      duration: 10000,
      action: {
        label: 'Login',
        onClick: () => {
          // Redirect to login page
          window.location.href = '/login';
        }
      }
    });

    // Log the event
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await this.logSessionEvent(user.id, 'revoked', {
        reason: 'logged_in_elsewhere',
        timestamp: new Date().toISOString()
      });
    }

    // Redirect to login after 3 seconds
    setTimeout(() => {
      window.location.href = '/login';
    }, 3000);
  }

  /**
   * Log session event to database
   */
  private async logSessionEvent(
    userId: string,
    eventType: 'login' | 'logout' | 'revoked',
    deviceInfo?: any
  ) {
    try {
      const { error } = await supabase.rpc('log_session_event', {
        p_user_id: userId,
        p_event_type: eventType,
        p_device_info: deviceInfo || {},
        p_ip_address: null // Can be populated from server-side
      });

      if (error) {
        console.error('Failed to log session event:', error);
      } else {
        console.log(`📝 Session event logged: ${eventType}`);
      }
    } catch (error) {
      console.error('Error logging session event:', error);
    }
  }

  /**
   * Manually check if user has multiple sessions
   * (For debugging purposes)
   */
  async checkActiveSessions(): Promise<number> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      // This query requires service role key, so it won't work from client
      // Use this for debugging from server-side only
      console.log('Current user:', user.email);
      return 1; // Client can only see their own session
    } catch (error) {
      console.error('Error checking sessions:', error);
      return 0;
    }
  }

  /**
   * Clean up and stop monitoring
   */
  destroy() {
    this.stopSessionValidation();
    this.isMonitoring = false;
    console.log('🛑 Session manager destroyed');
  }
}

// Export singleton instance
export const sessionManager = SupabaseSessionManager.getInstance();

// Auto-initialize on import (optional)
// Uncomment if you want automatic initialization
// sessionManager.initialize();
