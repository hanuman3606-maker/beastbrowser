import { apiService } from './apiService';
import { paymentService } from './paymentService';
import { 
  SubscriptionPlan, 
  UserSubscription, 
  UsageStats,
  CouponCode,
  PaymentRecord
} from '@/types/billing';

class BillingService {
  private static instance: BillingService;

  private constructor() {}

  static getInstance(): BillingService {
    if (!BillingService.instance) {
      BillingService.instance = new BillingService();
    }
    return BillingService.instance;
  }

  // Plan Management
  async getPlans(): Promise<SubscriptionPlan[]> {
    try {
      // In a real implementation, this would call the website API
      // For now, we'll return the default plans
      return this.getDefaultPlans();
    } catch (error) {
      console.error('Error getting plans:', error);
      return this.getDefaultPlans();
    }
  }

  async getPlan(planId: string): Promise<SubscriptionPlan | null> {
    try {
      const plans = await this.getPlans();
      return plans.find(plan => plan.id === planId) || null;
    } catch (error) {
      console.error('Error getting plan:', error);
      return null;
    }
  }

  // Subscription Management
  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    try {
      // This would call the website API to get user subscription
      // For now, we'll return null (no subscription)
      return null;
    } catch (error) {
      console.error('Error getting user subscription:', error);
      return null;
    }
  }

  async createSubscription(
    userId: string, 
    planId: string, 
    couponCode?: string,
    userEmail?: string
  ): Promise<{ subscription: UserSubscription; paymentOrder?: any }> {
    try {
      // Get the plan details
      const plan = await this.getPlan(planId);
      if (!plan) {
        throw new Error('Plan not found');
      }

      // For free plans, we don't need payment
      if (plan.price === 0) {
        // Create a free subscription directly
        const subscription: UserSubscription = {
          id: `sub_${Date.now()}`,
          userId,
          planId,
          status: 'trialing',
          currentPeriodStart: new Date().toISOString(),
          currentPeriodEnd: new Date(Date.now() + (plan.interval === 'year' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
          trialStart: new Date().toISOString(),
          trialEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          cancelAtPeriodEnd: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        return { subscription };
      }

      // For paid plans, initialize payment
      const amountInCents = plan.price;
      const currency = plan.currency || 'INR';
      
      // Initialize Razorpay payment
      const paymentResult = await paymentService.initializeRazorpayPayment(
        amountInCents,
        currency,
        userId,
        planId,
        userEmail || ''
      );

      if (!paymentResult) {
        throw new Error('Failed to initialize payment');
      }

      // Return payment order details for frontend to process
      return {
        subscription: {
          id: `sub_pending_${Date.now()}`,
          userId,
          planId,
          status: 'trialing',
          currentPeriodStart: new Date().toISOString(),
          currentPeriodEnd: new Date(Date.now() + (plan.interval === 'year' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
          cancelAtPeriodEnd: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        paymentOrder: {
          id: paymentResult.orderId,
          amount: amountInCents,
          currency: currency
        }
      };
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  }

  async cancelSubscription(userId: string, cancelAtPeriodEnd: boolean = true): Promise<UserSubscription> {
    try {
      // This would call the website API to cancel subscription
      // For now, we'll just log the action
      console.log(`Cancel subscription for user ${userId}, cancelAtPeriodEnd: ${cancelAtPeriodEnd}`);
      
      // Return a mock subscription
      const subscription: UserSubscription = {
        id: `sub_${Date.now()}`,
        userId,
        planId: 'free_plan',
        status: cancelAtPeriodEnd ? 'active' : 'cancelled',
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancelAtPeriodEnd: cancelAtPeriodEnd,
        cancelledAt: cancelAtPeriodEnd ? null : new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return subscription;
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  // Usage Tracking
  async recordUsage(userId: string, profilesCreated: number = 0, executionsRun: number = 0, profilesUsed: string[] = []): Promise<void> {
    try {
      // Record usage via API
      await apiService.recordUsage({
        userId,
        profilesCreated,
        executionsRun,
        profilesUsed
      });
    } catch (error) {
      console.error('Error recording usage:', error);
    }
  }

  async getUserUsageStats(userId: string): Promise<UsageStats> {
    try {
      // Get usage stats from API
      const response = await apiService.getUserUsage();
      
      if (response.success && response.usage) {
        return response.usage;
      }
      
      // Return default usage stats if API call fails
      const plan = await this.getFreePlan();
      
      if (!plan) {
        throw new Error('No plan found');
      }

      const today = new Date().toISOString().split('T')[0];
      
      return {
        userId,
        currentPeriod: {
          profilesCreated: 0,
          executionsRun: 0,
          profilesUsed: []
        },
        limits: plan.limits,
        remaining: {
          profiles: plan.limits.maxProfilesPerDay,
          executions: plan.limits.maxExecutionsPerDay
        },
        resetDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };
    } catch (error) {
      console.error('Error getting usage stats:', error);
      throw error;
    }
  }

  // Coupon Management
  async createCoupon(couponData: Omit<CouponCode, 'id' | 'redeemedCount' | 'createdAt' | 'updatedAt'>): Promise<CouponCode> {
    // This would call the website API to create a coupon
    // For now, we'll create a mock coupon
    const coupon: CouponCode = {
      id: `coupon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      code: couponData.code.toUpperCase(),
      name: couponData.name,
      description: couponData.description,
      type: couponData.type,
      value: couponData.value,
      currency: couponData.currency,
      maxRedemptions: couponData.maxRedemptions,
      redeemedCount: 0,
      validFrom: couponData.validFrom,
      validUntil: couponData.validUntil,
      applicablePlans: couponData.applicablePlans,
      isActive: couponData.isActive,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: couponData.createdBy
    };

    return coupon;
  }

  async validateCoupon(code: string, planId: string): Promise<CouponCode | null> {
    try {
      // This would call the website API to validate coupon
      // For now, we'll return null (no valid coupon)
      return null;
    } catch (error) {
      console.error('Error validating coupon:', error);
      return null;
    }
  }

  // Helper methods
  private async getFreePlan(): Promise<SubscriptionPlan | null> {
    const plans = await this.getPlans();
    return plans.find(plan => plan.name === 'Monthly Pro') || null;
  }

  private getDefaultPlans(): SubscriptionPlan[] {
    return [
      {
        id: 'monthly_plan',
        name: 'Monthly Pro',
        description: 'Unlimited profiles and executions for power users',
        price: 3000, // $30.00
        currency: 'USD',
        interval: 'month',
        intervalCount: 1,
        features: [
          { id: 'profiles', name: 'Unlimited Profiles', description: 'Unlimited browser profiles', included: true },
          { id: 'bulk', name: 'Bulk Profile Creation', description: 'Create multiple profiles at once', included: true },
          { id: 'executions', name: 'Unlimited Executions', description: 'Unlimited RPA executions', included: true },
          { id: 'concurrent', name: 'Concurrent Executions', description: 'Run up to 5 tasks simultaneously', included: true, limit: 5 },
          { id: 'support', name: 'Priority Support', description: 'Priority email support', included: true },
          { id: 'api', name: 'API Access', description: 'Full REST API access', included: true },
          { id: 'analytics', name: 'Advanced Analytics', description: 'Detailed execution analytics', included: true }
        ],
        limits: {
          maxProfiles: -1, // unlimited
          maxProfilesPerDay: -1,
          maxExecutionsPerDay: -1,
          maxConcurrentExecutions: 5,
          trialDays: 0,
          supportLevel: 'priority',
          apiAccess: true,
          customIntegrations: true,
          advancedAnalytics: true,
          whiteLabel: false
        },
        isPopular: true,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'yearly_plan',
        name: 'Yearly Pro',
        description: 'Best value - Save $111 per year + white-label options',
        price: 24900, // $249.00
        currency: 'USD',
        interval: 'year',
        intervalCount: 1,
        features: [
          { id: 'profiles', name: 'Unlimited Profiles', description: 'Unlimited browser profiles', included: true },
          { id: 'bulk', name: 'Bulk Profile Creation', description: 'Create multiple profiles at once', included: true },
          { id: 'executions', name: 'Unlimited Executions', description: 'Unlimited RPA executions', included: true },
          { id: 'concurrent', name: 'Concurrent Executions', description: 'Run up to 10 tasks simultaneously', included: true, limit: 10 },
          { id: 'support', name: 'Premium Support', description: '24/7 priority support', included: true },
          { id: 'api', name: 'API Access', description: 'Full REST API access', included: true },
          { id: 'analytics', name: 'Advanced Analytics', description: 'Detailed execution analytics', included: true },
          { id: 'whitelabel', name: 'White Label', description: 'Custom branding options', included: true },
          { id: 'integrations', name: 'Custom Integrations', description: 'Custom third-party integrations', included: true }
        ],
        limits: {
          maxProfiles: -1,
          maxProfilesPerDay: -1,
          maxExecutionsPerDay: -1,
          maxConcurrentExecutions: 10,
          trialDays: 0,
          supportLevel: 'premium',
          apiAccess: true,
          customIntegrations: true,
          advancedAnalytics: true,
          whiteLabel: true
        },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  }
}

export const billingService = BillingService.getInstance();