import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { sessionManagerV2 } from '@/lib/supabase-session-manager-v2';
import { authPersistenceService } from '@/services/authPersistenceService';
import { User } from '@/types/auth';
import { toast } from 'sonner';

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, displayName: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  async function signup(email: string, password: string, displayName: string) {
    try {
      // Sign up with Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName
          },
          emailRedirectTo: undefined // Disable email confirmation
        }
      });

      if (error) {
        console.error('Signup error:', error);
        
        // Better error messages
        let errorMessage = error.message;
        if (errorMessage.includes('invalid')) {
          errorMessage = 'Please use a valid email address (e.g., yourname@domain.com)';
        }
        
        return { success: false, error: errorMessage };
      }

      if (data.user) {
        const user: User = {
          id: data.user.id,
          email: data.user.email || '',
          displayName: displayName,
          photoURL: undefined,
          createdAt: data.user.created_at,
          lastLoginAt: new Date().toISOString()
        };
        
        setCurrentUser(user);
        setIsAuthenticated(true);
      }

      return { success: true };
    } catch (error: any) {
      console.error('Signup error:', error);
      return { success: false, error: error.message || 'Signup failed' };
    }
  }

  async function login(email: string, password: string) {
    try {
      // Login with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Login error:', error);
        return { success: false, error: error.message };
      }

      if (data.user && data.session) {
        const user: User = {
          id: data.user.id,
          email: data.user.email || '',
          displayName: data.user.user_metadata?.display_name || data.user.email?.split('@')[0] || 'User',
          photoURL: undefined,
          createdAt: data.user.created_at,
          lastLoginAt: new Date().toISOString()
        };
        
        setCurrentUser(user);
        setIsAuthenticated(true);
        
        // 🔐 Initialize single session monitoring
        await sessionManagerV2.initialize();
        
        console.log('✅ Login successful, session saved automatically by Supabase');
        toast.success('Login successful!');
      }

      return { success: true };
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, error: error.message || 'Login failed' };
    }
  }

  async function logout() {
    try {
      console.log('🚪 Logging out...');
      
      // 🔐 Destroy session monitoring
      sessionManagerV2.destroy();
      
      // 🗑️ Clear saved credentials (Remember Me)
      localStorage.removeItem('beast_remember_me');
      localStorage.removeItem('beast_saved_email');
      localStorage.removeItem('beast_saved_password');
      console.log('🗑️ Saved credentials cleared');
      
      // 🗑️ Sign out from Supabase (clears localStorage automatically)
      await supabase.auth.signOut();
      
      setCurrentUser(null);
      setIsAuthenticated(false);
      
      console.log('✅ Logout successful, session cleared');
      toast.info('Logged out successfully');
    } catch (error: any) {
      console.error('❌ Logout error:', error);
    }
  }

  useEffect(() => {
    // Check Supabase auth state - Supabase handles persistence automatically
    const checkAuthState = async () => {
      try {
        console.log('🔍 Checking auth state...');
        
        // Supabase automatically loads session from localStorage
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Session error:', error);
          setCurrentUser(null);
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }
        
        if (session?.user) {
          console.log('✅ Session found, auto-login successful!');
          
          const user: User = {
            id: session.user.id,
            email: session.user.email || '',
            displayName: session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || 'User',
            photoURL: undefined,
            createdAt: session.user.created_at,
            lastLoginAt: new Date().toISOString()
          };
          
          setCurrentUser(user);
          setIsAuthenticated(true);
          
          // Initialize session monitoring
          await sessionManagerV2.initialize();
          
          console.log('✅ User auto-logged in:', user.email);
        } else {
          console.log('ℹ️ No session found, showing login page');
          setCurrentUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('❌ Auth state check error:', error);
        setCurrentUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuthState();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const user: User = {
          id: session.user.id,
          email: session.user.email || '',
          displayName: session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || 'User',
          photoURL: undefined,
          createdAt: session.user.created_at,
          lastLoginAt: new Date().toISOString()
        };
        setCurrentUser(user);
        setIsAuthenticated(true);
      } else {
        setCurrentUser(null);
        setIsAuthenticated(false);
      }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    currentUser,
    login,
    signup,
    logout,
    loading,
    isAuthenticated
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}