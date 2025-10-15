import { createClient } from '@supabase/supabase-js';

// Supabase configuration using environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials are not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file');
}

// Initialize Electron storage on startup
async function initElectronStorage() {
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    try {
      // Load all stored keys from Electron storage to localStorage
      const authToken = await (window as any).electronAPI.invoke('storage-get', 'supabase.auth.token');
      const authTokenVerifier = await (window as any).electronAPI.invoke('storage-get', 'supabase.auth.token-code-verifier');
      
      if (authToken) {
        localStorage.setItem('supabase.auth.token', authToken);
        console.log('📦 Restored auth token from Electron storage');
      }
      if (authTokenVerifier) {
        localStorage.setItem('supabase.auth.token-code-verifier', authTokenVerifier);
        console.log('📦 Restored auth verifier from Electron storage');
      }
    } catch (error) {
      console.error('❌ Failed to restore from Electron storage:', error);
    }
  }
}

// Run initialization
if (typeof window !== 'undefined') {
  initElectronStorage();
}

// Custom storage for Electron - uses localStorage but with logging
const customStorage = {
  getItem: (key: string) => {
    try {
      const value = localStorage.getItem(key);
      console.log(`📦 Storage GET: ${key} = ${value ? 'found' : 'null'}`);
      return value;
    } catch (error) {
      console.error('Storage GET error:', error);
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
      console.log(`💾 Storage SET: ${key} = saved`);
      
      // Sync to Electron storage in background (if available)
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        (window as any).electronAPI.invoke('storage-set', key, value).catch(() => {});
      }
    } catch (error) {
      console.error('Storage SET error:', error);
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
      console.log(`🗑️ Storage REMOVE: ${key}`);
      
      // Sync to Electron storage in background (if available)
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        (window as any).electronAPI.invoke('storage-remove', key).catch(() => {});
      }
    } catch (error) {
      console.error('Storage REMOVE error:', error);
    }
  }
};

// Initialize Supabase client with persistent session storage
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorage,
    storageKey: 'supabase.auth.token', // Explicit storage key
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // Disable for Electron
    flowType: 'pkce',
  }
});

// Database types
export interface SupabaseUser {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
  last_login_at: string;
}

export interface SupabaseSubscription {
  id: string;
  user_id: string;
  plan_type: string;
  status: 'active' | 'expired' | 'inactive';
  created_at: string;
  expires_at: string;
  payment_gateway: string;
  amount: number;
  currency: string;
}

export interface SupabaseProfileCreation {
  id: string;
  user_id: string;
  user_email: string;
  profile_name: string;
  profile_id: string;
  created_at: string;
  is_bulk: boolean;
  profile_count: number;
}

export interface SupabasePlanLimits {
  plan_id: string;
  plan_name: string;
  price: number;
  interval: 'month' | 'year';
  max_profiles: number;
  max_bulk_profiles: number;
  features: string[];
}
