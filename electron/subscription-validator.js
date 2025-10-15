// 🔐 SUPABASE SUBSCRIPTION VALIDATOR
// Validates user subscription from Supabase backend

const axios = require('axios');

// Supabase API endpoint (from your website)
const SUPABASE_API_URL = process.env.SUPABASE_API_URL || 'http://localhost:3001';

class SubscriptionValidator {
  constructor() {
    this.lastCheckTime = null;
    this.cachedStatus = null;
    this.cacheTimeout = 2 * 60 * 60 * 1000; // 2 hours cache (less API calls!)
    this.backgroundCheckInterval = null;
  }

  /**
   * Validate user subscription with Supabase
   * @param {string} userEmail - User's email address
   * @returns {Promise<Object>} Subscription status
   */
  async validateSubscription(userEmail) {
    try {
      console.log('🔐 SUBSCRIPTION: Validating for email:', userEmail);

      // Check cache first (avoid too many API calls)
      if (this.isCacheValid()) {
        console.log('✅ SUBSCRIPTION: Using cached status');
        return this.cachedStatus;
      }

      // Call Supabase API
      const response = await axios.post(`${SUPABASE_API_URL}/api/browser/validate-subscription`, {
        email: userEmail
      }, {
        timeout: 10000, // 10 second timeout
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = response.data;

      if (!data || !data.hasSubscription) {
        console.log('❌ SUBSCRIPTION: No active subscription found');
        return this.cacheAndReturn({
          valid: false,
          hasSubscription: false,
          message: 'No active subscription. Please purchase a plan.',
          plan: null,
          expiresAt: null,
          daysRemaining: 0
        });
      }

      console.log('✅ SUBSCRIPTION: Active subscription found');
      console.log(`📅 Plan: ${data.plan}`);
      console.log(`⏰ Expires: ${data.expiresAt}`);
      console.log(`📊 Days remaining: ${data.daysRemaining}`);

      return this.cacheAndReturn({
        valid: true,
        hasSubscription: true,
        plan: data.plan,
        subscriptionStatus: data.subscriptionStatus,
        expiresAt: data.expiresAt,
        daysRemaining: data.daysRemaining,
        message: `Active ${data.plan} subscription - ${data.daysRemaining} days remaining`
      });

    } catch (error) {
      console.error('❌ SUBSCRIPTION: Validation error:', error.message);

      // Network error - allow limited offline usage
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        console.log('⚠️ SUBSCRIPTION: Network error - allowing limited access');
        return {
          valid: false,
          hasSubscription: false,
          offline: true,
          message: 'Cannot connect to server. Limited offline access.',
          error: 'network_error'
        };
      }

      return {
        valid: false,
        hasSubscription: false,
        message: 'Subscription validation failed. Please check your internet connection.',
        error: error.message
      };
    }
  }

  /**
   * Quick validation (checks cache first, then validates)
   * @param {string} userEmail - User's email
   * @returns {Promise<boolean>} True if subscription is valid
   */
  async isSubscriptionValid(userEmail) {
    const status = await this.validateSubscription(userEmail);
    return status.valid === true && status.hasSubscription === true;
  }

  /**
   * Get detailed subscription info
   * @param {string} userEmail - User's email
   * @returns {Promise<Object>} Subscription details
   */
  async getSubscriptionDetails(userEmail) {
    return await this.validateSubscription(userEmail);
  }

  /**
   * Check if cache is still valid
   * @returns {boolean}
   */
  isCacheValid() {
    if (!this.lastCheckTime || !this.cachedStatus) {
      return false;
    }

    const now = Date.now();
    const elapsed = now - this.lastCheckTime;
    return elapsed < this.cacheTimeout;
  }

  /**
   * Cache subscription status and return it
   * @param {Object} status - Subscription status
   * @returns {Object} Same status object
   */
  cacheAndReturn(status) {
    this.cachedStatus = status;
    this.lastCheckTime = Date.now();
    return status;
  }

  /**
   * Clear cache (force revalidation on next check)
   */
  clearCache() {
    console.log('🗑️ SUBSCRIPTION: Cache cleared');
    this.lastCheckTime = null;
    this.cachedStatus = null;
  }

  /**
   * Smart validation - only checks if cache expired
   * Silent mode: doesn't log unless there's a status change
   * @param {string} userEmail - User's email
   * @param {boolean} silent - Silent mode (no console spam)
   * @returns {Promise<Object>} Subscription status
   */
  async smartValidation(userEmail, silent = true) {
    // Use cache if valid
    if (this.isCacheValid()) {
      if (!silent) {
        console.log('✅ SUBSCRIPTION: Using cached status (no API call)');
      }
      return this.cachedStatus;
    }

    // Cache expired - validate silently
    if (silent) {
      console.log('🔄 SUBSCRIPTION: Cache expired, validating silently...');
    }

    return await this.validateSubscription(userEmail);
  }

  /**
   * Check if subscription is about to expire (for warnings)
   * @param {string} userEmail - User's email
   * @returns {Promise<Object>} Expiry info
   */
  async checkExpiryWarning(userEmail) {
    const status = await this.smartValidation(userEmail, true);

    if (!status.valid || !status.hasSubscription) {
      return { shouldWarn: false };
    }

    const daysRemaining = status.daysRemaining || 0;

    // Warn if less than 6 hours for Starter Plan (24hr plan)
    // Or less than 7 days for Monthly/Yearly
    const isStarter = status.plan && status.plan.toLowerCase().includes('starter');
    const threshold = isStarter ? 0.25 : 7; // 6 hours (0.25 days) for Starter, 7 days for others

    if (daysRemaining <= threshold && daysRemaining > 0) {
      return {
        shouldWarn: true,
        daysRemaining,
        plan: status.plan,
        expiresAt: status.expiresAt,
        hoursRemaining: Math.round(daysRemaining * 24)
      };
    }

    return { shouldWarn: false };
  }

  /**
   * Set API URL (for testing or custom deployment)
   * @param {string} url - API base URL
   */
  setApiUrl(url) {
    SUPABASE_API_URL = url;
    console.log('🔗 SUBSCRIPTION: API URL set to:', url);
  }
}

// Export singleton instance
module.exports = new SubscriptionValidator();
