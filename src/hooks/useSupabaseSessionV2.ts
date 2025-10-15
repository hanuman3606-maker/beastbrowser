/**
 * React Hook for Supabase Single Session Management V2
 * Alternative solution without external extensions
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { sessionManagerV2 } from '@/lib/supabase-session-manager-v2';
import { Session, User } from '@supabase/supabase-js';

interface UseSupabaseSessionV2Return {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  getActiveSessions: () => Promise<any[]>;
  getSessionLogs: (limit?: number) => Promise<any[]>;
}

export function useSupabaseSessionV2(): UseSupabaseSessionV2Return {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Initialize session manager if logged in
      if (session) {
        sessionManagerV2.initialize();
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      sessionManagerV2.destroy();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error) {
      // Initialize session manager after successful login
      await sessionManagerV2.initialize();
    }

    setLoading(false);
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    setLoading(false);
    return { error };
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    sessionManagerV2.destroy();
    setLoading(false);
  };

  const getActiveSessions = async () => {
    return await sessionManagerV2.getActiveSessions();
  };

  const getSessionLogs = async (limit: number = 20) => {
    return await sessionManagerV2.getSessionLogs(limit);
  };

  return {
    session,
    user,
    loading,
    isAuthenticated: !!session,
    signIn,
    signUp,
    signOut,
    getActiveSessions,
    getSessionLogs,
  };
}
