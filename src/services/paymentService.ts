import { apiService } from './apiService';
import { PaymentRecord, UserSubscription } from '@/types/billing';
import { supabaseSubscriptionService } from './supabaseSubscriptionService';

class PaymentService {
  private static instance: PaymentService;
  private razorpayKeyId: string;
  private nowpaymentsApiKey: string;

  private constructor() {
    // Load API keys from environment variables
    this.razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID || '';
    this.nowpaymentsApiKey = import.meta.env.VITE_NOWPAYMENTS_API_KEY || '';
  }

  static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }

  // Initialize Razorpay payment
  async initializeRazorpayPayment(
    amount: number,
    currency: string,
    userId: string,
    planId: string,
    email: string
  ): Promise<{ orderId: string; paymentId: string } | null> {
    try {
      // Create order on your backend (this would be implemented on your website)
      const response = await fetch('https://beastbrowser.com/api/browser/payment/razorpay/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': import.meta.env.VITE_BEAST_BROWSER_API_KEY || 'beast-browser-api-key-2024',
          'Authorization': `Bearer ${apiService.getToken() || ''}`
        },
        body: JSON.stringify({
          amount,
          currency,
          userId,
          planId,
          email
        })
      });

      const data = await response.json();
      
      if (data.success && data.orderId) {
        return {
          orderId: data.orderId,
          paymentId: data.paymentId
        };
      }
      
      throw new Error(data.error || 'Failed to create Razorpay order');
    } catch (error) {
      console.error('Error initializing Razorpay payment:', error);
      return null;
    }
  }

  // Verify Razorpay payment
  async verifyRazorpayPayment(
    orderId: string,
    paymentId: string,
    signature: string,
    userId: string
  ): Promise<boolean> {
    try {
      const response = await fetch('https://beastbrowser.com/api/browser/payment/razorpay/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': import.meta.env.VITE_BEAST_BROWSER_API_KEY || 'beast-browser-api-key-2024',
          'Authorization': `Bearer ${apiService.getToken() || ''}`
        },
        body: JSON.stringify({
          orderId,
          paymentId,
          signature,
          userId
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Payment verified successfully
        return true;
      }
      
      throw new Error(data.error || 'Payment verification failed');
    } catch (error) {
      console.error('Error verifying Razorpay payment:', error);
      return false;
    }
  }

  // Initialize NowPayments crypto payment
  async initializeNowPayments(
    priceAmount: number,
    priceCurrency: string,
    userId: string,
    planId: string
  ): Promise<{ paymentId: string; paymentUrl: string } | null> {
    try {
      const response = await fetch('https://beastbrowser.com/api/browser/payment/nowpayments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': import.meta.env.VITE_BEAST_BROWSER_API_KEY || 'beast-browser-api-key-2024',
          'Authorization': `Bearer ${apiService.getToken() || ''}`
        },
        body: JSON.stringify({
          priceAmount,
          priceCurrency,
          userId,
          planId
        })
      });

      const data = await response.json();
      
      if (data.success && data.paymentId && data.paymentUrl) {
        return {
          paymentId: data.paymentId,
          paymentUrl: data.paymentUrl
        };
      }
      
      throw new Error(data.error || 'Failed to create NowPayments order');
    } catch (error) {
      console.error('Error initializing NowPayments:', error);
      return null;
    }
  }

  // Check NowPayments status
  async checkNowPaymentsStatus(paymentId: string): Promise<{ status: string; } | null> {
    try {
      const response = await fetch(`https://beastbrowser.com/api/browser/payment/nowpayments/status/${paymentId}`, {
        method: 'GET',
        headers: {
          'X-API-Key': import.meta.env.VITE_BEAST_BROWSER_API_KEY || 'beast-browser-api-key-2024',
          'Authorization': `Bearer ${apiService.getToken() || ''}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        return {
          status: data.status
        };
      }
      
      throw new Error(data.error || 'Failed to check payment status');
    } catch (error) {
      console.error('Error checking NowPayments status:', error);
      return null;
    }
  }

  // Record payment in the system
  async recordPayment(paymentData: Partial<PaymentRecord>): Promise<PaymentRecord | null> {
    try {
      const response = await fetch('https://beastbrowser.com/api/browser/payment/record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': import.meta.env.VITE_BEAST_BROWSER_API_KEY || 'beast-browser-api-key-2024',
          'Authorization': `Bearer ${apiService.getToken() || ''}`
        },
        body: JSON.stringify(paymentData)
      });

      const data = await response.json();
      
      if (data.success && data.payment) {
        return data.payment;
      }
      
      throw new Error(data.error || 'Failed to record payment');
    } catch (error) {
      console.error('Error recording payment:', error);
      return null;
    }
  }

  // Activate premium for user after successful payment
  async activatePremiumForUser(userId: string, planId: string): Promise<UserSubscription | null> {
    try {
      const response = await fetch('https://beastbrowser.com/api/browser/subscription/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': import.meta.env.VITE_BEAST_BROWSER_API_KEY || 'beast-browser-api-key-2024',
          'Authorization': `Bearer ${apiService.getToken() || ''}`
        },
        body: JSON.stringify({
          userId,
          planId
        })
      });

      const data = await response.json();
      
      if (data.success && data.subscription) {
        return data.subscription;
      }
      
      throw new Error(data.error || 'Failed to activate premium');
    } catch (error) {
      console.error('Error activating premium:', error);
      return null;
    }
  }
}

export const paymentService = PaymentService.getInstance();