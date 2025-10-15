import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, AlertCircle, X, ExternalLink, RefreshCw } from 'lucide-react'

interface SubscriptionStatus {
  valid: boolean
  hasSubscription: boolean
  plan?: string
  expiresAt?: string
  daysRemaining?: number
  message: string
  offline?: boolean
  error?: string
}

interface SubscriptionGuardProps {
  userEmail: string | null
  children: React.ReactNode
}

export const SubscriptionGuard: React.FC<SubscriptionGuardProps> = ({ userEmail, children }) => {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    checkSubscription()
    
    // Check subscription every 30 minutes (not too frequent!)
    // Uses cached data if available, so no API spam
    const interval = setInterval(() => {
      checkSubscription(true) // Silent check
    }, 30 * 60 * 1000) // 30 minutes

    return () => clearInterval(interval)
  }, [userEmail])

  const checkSubscription = async (silent = false) => {
    if (!userEmail) {
      setSubscriptionStatus({
        valid: false,
        hasSubscription: false,
        message: 'Please log in to use BeastBrowser'
      })
      setLoading(false)
      return
    }

    if (!silent) setLoading(true)
    setChecking(true)

    try {
      console.log('🔐 Checking subscription for:', userEmail)
      
      const status = await window.electronAPI.validateSubscription(userEmail)
      
      console.log('📊 Subscription status:', status)
      setSubscriptionStatus(status)
      
      if (status.valid && status.hasSubscription) {
        console.log('✅ Valid subscription found')
      } else {
        console.log('❌ No valid subscription')
      }
    } catch (error) {
      console.error('❌ Subscription check error:', error)
      setSubscriptionStatus({
        valid: false,
        hasSubscription: false,
        message: 'Failed to verify subscription. Please check your internet connection.',
        error: String(error)
      })
    } finally {
      setLoading(false)
      setChecking(false)
    }
  }

  const handleRefresh = () => {
    window.electronAPI.clearSubscriptionCache()
    checkSubscription()
  }

  const openPurchasePage = () => {
    // Open website in default browser
    window.open('https://your-website.com/pricing', '_blank')
  }

  // Loading state
  if (loading && !subscriptionStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <div className="text-center">
          <Shield className="w-16 h-16 text-primary-orange mx-auto mb-4 animate-pulse" />
          <h2 className="text-2xl font-bold text-white mb-2">Verifying Subscription...</h2>
          <p className="text-gray-400">Please wait while we check your access</p>
          <div className="mt-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-orange mx-auto"></div>
          </div>
        </div>
      </div>
    )
  }

  // No subscription or invalid
  if (!subscriptionStatus?.valid || !subscriptionStatus?.hasSubscription) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900 p-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-2xl w-full"
        >
          {/* Main Card */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border-2 border-red-500/50 shadow-2xl">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-12 h-12 text-red-500" />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-white text-center mb-3">
              {subscriptionStatus?.offline ? 'Cannot Verify Subscription' : 'Subscription Required'}
            </h1>

            {/* Message */}
            <p className="text-gray-300 text-center text-lg mb-6">
              {subscriptionStatus?.message || 'Please purchase a subscription to use BeastBrowser'}
            </p>

            {/* Status Info */}
            {subscriptionStatus?.offline && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                <p className="text-yellow-400 text-sm">
                  ⚠️ Cannot connect to server. Please check your internet connection.
                </p>
              </div>
            )}

            {/* User Info */}
            <div className="bg-white/5 rounded-lg p-4 mb-6">
              <p className="text-gray-400 text-sm mb-1">Logged in as:</p>
              <p className="text-white font-semibold">{userEmail || 'Not logged in'}</p>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              {!subscriptionStatus?.offline && (
                <button
                  onClick={openPurchasePage}
                  className="w-full bg-gradient-to-r from-primary-orange to-primary-red text-white py-4 rounded-lg font-semibold hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-5 h-5" />
                  Purchase Subscription
                </button>
              )}

              <button
                onClick={handleRefresh}
                disabled={checking}
                className="w-full bg-white/10 hover:bg-white/20 text-white py-4 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-5 h-5 ${checking ? 'animate-spin' : ''}`} />
                {checking ? 'Checking...' : 'Refresh Status'}
              </button>
            </div>

            {/* Help Text */}
            <div className="mt-6 text-center">
              <p className="text-gray-500 text-sm">
                Already purchased? Click "Refresh Status" to update.
              </p>
            </div>
          </div>

          {/* Bottom Info */}
          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              Having issues? Contact support at{' '}
              <a href="mailto:support@beastbrowser.com" className="text-primary-orange hover:underline">
                support@beastbrowser.com
              </a>
            </p>
          </div>
        </motion.div>
      </div>
    )
  }

  // Valid subscription - show app with subscription banner
  return (
    <div className="relative">
      {/* Subscription Status Banner */}
      <AnimatePresence>
        {subscriptionStatus.valid && subscriptionStatus.hasSubscription && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-50"
          >
            <div className={`py-2 px-4 text-center text-sm font-medium ${
              subscriptionStatus.daysRemaining && subscriptionStatus.daysRemaining <= 7
                ? 'bg-yellow-500/20 text-yellow-300 border-b border-yellow-500/30'
                : 'bg-green-500/20 text-green-300 border-b border-green-500/30'
            }`}>
              <div className="flex items-center justify-center gap-2">
                <Shield className="w-4 h-4" />
                <span>
                  {subscriptionStatus.plan} Plan Active
                  {subscriptionStatus.daysRemaining && (
                    <span className="ml-2">
                      • {subscriptionStatus.daysRemaining} {subscriptionStatus.daysRemaining === 1 ? 'day' : 'days'} remaining
                      {subscriptionStatus.daysRemaining <= 7 && ' ⚠️'}
                    </span>
                  )}
                </span>
                <button
                  onClick={handleRefresh}
                  className="ml-auto p-1 hover:bg-white/10 rounded transition-colors"
                  title="Refresh subscription status"
                >
                  <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main App Content */}
      <div className={subscriptionStatus?.valid ? 'pt-10' : ''}>
        {children}
      </div>
    </div>
  )
}
