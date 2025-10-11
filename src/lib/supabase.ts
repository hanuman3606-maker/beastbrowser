import { createClient } from '@supabase/supabase-js';

// Supabase configuration using environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials are not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file');
}

// Initialize Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
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
