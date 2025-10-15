/**
 * Supabase Single Session Manager V2
 * Alternative solution without external extensions
 * Works on ANY Supabase Free Plan
 */

import { supabase } from './supabase';
import { toast } from 'sonner';

export class SupabaseSessionManagerV2 {
  private static instance: SupabaseSessionManagerV2;
  private isMonitoring = false;
  private sessionCheckInterval: NodeJS.Timeout | null = null;
  private currentSessionId: string | null = null;

  private constructor() {}

  static getInstance(): SupabaseSessionManagerV2 {
    if (!SupabaseSessionManagerV2.instance) {
      SupabaseSessionManagerV2.instance = new SupabaseSessionManagerV2();
    }
    return SupabaseSessionManagerV2.instance;
  }

  /**
   * Initialize session monitoring after login
   */
  async initialize() {
    if (this.isMonitoring) {
      console.log('📡 Session monitoring already active');
      return;
    }

    console.log('🔐 Initializing single session monitoring (V2)...');

    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.warn('⚠️ No active session found');
      return;
    }

    this.currentSessionId = session.access_token;

    // Register this session in database
    await this.registerSession(session);

    // Listen for auth state changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`🔔 Auth event: ${event}`);

      switch (event) {
        case 'SIGNED_IN':
          await this.onSignIn(session);
          break;

        case 'SIGNED_OUT':
          await this.onSignOut();
          break;

        case 'TOKEN_REFRESHED':
          console.log('🔄 Token refreshed');
          await this.validateSession();
          break;
      }
    });

    // Start periodic session validation
    this.startSessionValidation();

    this.isMonitoring = true;
    console.log('✅ Session monitoring initialized (V2)');
  }

  /**
   * Register session in database
   */
  private async registerSession(session: any) {
    try {
      const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        timestamp: new Date().toISOString()
      };

      const { data, error } = await supabase.rpc('register_session', {
        p_session_id: session.access_token,
        p_device_info: deviceInfo,
        p_ip_address: null // Can be populated from server-side
      });

      if (error) {
        console.error('❌ Failed to register session:', error);
      } else {
        console.log('✅ Session registered in database');
      }
    } catch (error) {
      console.error('❌ Error registering session:', error);
    }
  }

  /**
   * Handle sign in event
   */
  private async onSignIn(session: any) {
    if (!session) return;

    console.log('✅ User signed in:', session.user.email);
    this.currentSessionId = session.access_token;

    // Register the new session
    await this.registerSession(session);

    toast.success('Logged in successfully', {
      description: 'Your session is now active'
    });
  }

  /**
   * Handle sign out event
   */
  private async onSignOut() {
    console.log('🚪 User signed out');

    // Revoke session in database
    if (this.currentSessionId) {
      try {
        await supabase.rpc('revoke_session', {
          p_session_id: this.currentSessionId
        });
      } catch (error) {
        console.error('Error revoking session:', error);
      }
    }

    this.stopSessionValidation();
    this.currentSessionId = null;

    toast.info('Logged out', {
      description: 'Your session has ended'
    });
  }

  /**
   * Start periodic session validation
   */
  private startSessionValidation() {
    if (this.sessionCheckInterval) {
      return;
    }

    console.log('⏰ Starting session validation checks...');

    this.sessionCheckInterval = setInterval(async () => {
      await this.validateSession();
    }, 15000); // Check every 15 seconds

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
   */
  private async validateSession() {
    try {
      if (!this.currentSessionId) {
        return;
      }

      // Check if session is still valid in database
      const { data: isValid, error } = await supabase.rpc('is_session_valid', {
        p_session_id: this.currentSessionId
      });

      if (error) {
        console.error('❌ Session validation error:', error);
        return;
      }

      if (!isValid) {
        console.warn('🚨 Session no longer valid - logged in from another device');
        await this.handleSessionRevoked();
      } else {
        console.log('✅ Session valid');
      }
    } catch (error) {
      console.error('❌ Session validation failed:', error);
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
          window.location.href = '/login';
        }
      }
    });

    // Log the revoked event
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('session_logs').insert({
          user_id: user.id,
          event_type: 'revoked',
          device_info: {
            reason: 'logged_in_elsewhere',
            timestamp: new Date().toISOString()
          }
        });
      }
    } catch (error) {
      console.error('Error logging revoked event:', error);
    }

    // Redirect to login after 3 seconds
    setTimeout(() => {
      window.location.href = '/login';
    }, 3000);
  }

  /**
   * Get active sessions for current user
   */
  async getActiveSessions() {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching sessions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting active sessions:', error);
      return [];
    }
  }

  /**
   * Get session logs for current user
   */
  async getSessionLogs(limit: number = 20) {
    try {
      const { data, error } = await supabase
        .from('session_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching session logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting session logs:', error);
      return [];
    }
  }

  /**
   * Clean up and stop monitoring
   */
  destroy() {
    this.stopSessionValidation();
    this.isMonitoring = false;
    this.currentSessionId = null;
    console.log('🛑 Session manager destroyed');
  }
}

// Export singleton instance
export const sessionManagerV2 = SupabaseSessionManagerV2.getInstance();
