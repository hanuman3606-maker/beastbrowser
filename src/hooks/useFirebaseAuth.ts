import { useState, useEffect } from 'react';

interface FirebaseUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName: string | null;
}

interface AuthState {
  user: FirebaseUser | null;
  loading: boolean;
  error: string | null;
}

export function useFirebaseAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const initAuth = async () => {
      try {
        // Check if user is already logged in
        const result = await window.firebaseAPI.getUser();
        
        if (result.success) {
          setAuthState({
            user: result.user,
            loading: false,
            error: null
          });
        } else {
          setAuthState({
            user: null,
            loading: false,
            error: null
          });
        }

        // Listen for auth state changes
        unsubscribe = window.firebaseAPI.onAuthStateChanged((data: any) => {
          if (data.isAuthenticated) {
            setAuthState({
              user: data.user,
              loading: false,
              error: null
            });
          } else {
            setAuthState({
              user: null,
              loading: false,
              error: null
            });
          }
        });
      } catch (error: any) {
        setAuthState({
          user: null,
          loading: false,
          error: error.message || 'Failed to initialize auth'
        });
      }
    };

    initAuth();

    // Cleanup
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      
      const result = await window.firebaseAPI.login(email, password);
      
      if (result.success) {
        setAuthState({
          user: result.user,
          loading: false,
          error: null
        });
        return { success: true };
      } else {
        setAuthState({
          user: null,
          loading: false,
          error: result.error || 'Login failed'
        });
        return { success: false, error: result.error || 'Login failed' };
      }
    } catch (error: any) {
      setAuthState({
        user: null,
        loading: false,
        error: error.message || 'Login failed'
      });
      return { success: false, error: error.message || 'Login failed' };
    }
  };

  const logout = async () => {
    try {
      setAuthState({
        user: null,
        loading: false,
        error: null
      });
      return { success: true };
    } catch (error: any) {
      setAuthState(prev => ({
        ...prev,
        error: error.message || 'Logout failed'
      }));
      return { success: false, error: error.message || 'Logout failed' };
    }
  };

  return {
    ...authState,
    login,
    logout
  };
}