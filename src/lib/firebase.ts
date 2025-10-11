/**
 * DEPRECATED: Firebase has been replaced with Supabase
 * This file exists only for backward compatibility
 * Use @/lib/supabase and @/contexts/AuthContext instead
 */

// Mock Firebase exports to prevent errors in old components
export const app = null;
export const auth = null;

console.warn('⚠️ Firebase is deprecated. Use Supabase authentication instead.');