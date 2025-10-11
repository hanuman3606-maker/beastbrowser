// Type definitions for Firebase API in Electron preload
export {};

declare global {
  interface Window {
    firebaseAPI: {
      // Authentication
      login: (email: string, password: string) => Promise<{ success: boolean; user?: any; error?: string }>;
      getUser: () => Promise<{ success: boolean; user?: any; error?: string }>;
      
      // Profile limits
      checkProfileLimit: () => Promise<{ allowed: boolean; reason?: string; action?: string; plan?: string; dailyCount?: number; remaining?: number; activeProfiles?: number }>;
      recordProfileCreation: () => Promise<{ success: boolean; error?: string }>;
      
      // Profile management
      syncActiveProfiles: (count: number) => Promise<{ success: boolean; error?: string }>;
      
      // Subscription
      getSubscription: () => Promise<{ success: boolean; subscription?: any; error?: string }>;
      
      // Coupons
      validateCoupon: (code: string) => Promise<{ success: boolean; coupon?: any; error?: string }>;
      
      // Events
      onAuthStateChanged: (callback: (data: any) => void) => () => void;
      onRedirectToPricing: (callback: (data: any) => void) => () => void;
    };
  }
}