import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabaseSubscriptionService } from '@/services/supabaseSubscriptionService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Crown, ExternalLink, AlertCircle, CreditCard, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface ProfileCreationGuardProps {
  children: React.ReactNode;
  onValidationComplete?: (isValid: boolean) => void;
  mode: 'single' | 'bulk';
}

/**
 * ProfileCreationGuard Component
 * Validates subscription before allowing profile creation
 * Shows upgrade prompt if no active subscription
 */
export default function ProfileCreationGuard({ 
  children, 
  onValidationComplete,
  mode 
}: ProfileCreationGuardProps) {
  const { currentUser } = useAuth();
  const [isValidating, setIsValidating] = useState(true);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [subscriptionMessage, setSubscriptionMessage] = useState<string | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasValidated, setHasValidated] = useState(false);

  useEffect(() => {
    // Only validate once when component first mounts
    if (!hasValidated && currentUser) {
      validateSubscription();
    }
  }, [currentUser, hasValidated]);

  const validateSubscription = async () => {
    if (!currentUser || !currentUser.email) {
      setIsValidating(false);
      setHasActiveSubscription(false);
      setSubscriptionMessage('Please log in to create profiles');
      onValidationComplete?.(false);
      return;
    }

    try {
      setIsValidating(true);

      // Validate profile creation permission
      const validation = await supabaseSubscriptionService.validateProfileCreation(currentUser.email);

      if (validation.allowed && validation.subscription) {
        // Calculate days remaining
        const endDate = new Date(validation.subscription.expires_at);
        const now = new Date();
        const diffTime = endDate.getTime() - now.getTime();
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        setHasActiveSubscription(true);
        setDaysRemaining(Math.max(0, days));
        setSubscriptionMessage(null);
        setHasValidated(true); // Mark as validated
        onValidationComplete?.(true);
        
        // Show subscription status (only on first validation, not on tab switch)
        if (!hasValidated) {
          toast.success(`Active ${validation.subscription.plan_type} - ${days} days remaining`);
        }
      } else {
        setHasActiveSubscription(false);
        setSubscriptionMessage(validation.reason || 'No active subscription found');
        setHasValidated(true); // Mark as validated even if failed
        onValidationComplete?.(false);
      }
    } catch (error) {
      console.error('Error validating subscription:', error);
      setHasActiveSubscription(false);
      setSubscriptionMessage('Error validating subscription. Please try again.');
      setHasValidated(true); // Mark as validated even on error
      onValidationComplete?.(false);
    } finally {
      setIsValidating(false);
    }
  };

  const handleUpgradePlan = () => {
    // Open pricing page (localhost for development)
    const pricingUrl = import.meta.env.VITE_WEBSITE_API_URL || 'http://localhost:3001';
    window.open(`${pricingUrl}/purchase?plan=Monthly%20Premium`, '_blank');
    
    toast.info('Please purchase a plan and return to the app. Your subscription will be automatically activated.');
  };

  const handleRefreshSubscription = async () => {
    setIsRefreshing(true);
    setHasValidated(false); // Reset validation flag to allow re-validation
    toast.info('Checking subscription status...');
    await validateSubscription();
    setIsRefreshing(false);
  };

  // Loading state
  if (isValidating) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-blue-800">Validating subscription...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No active subscription - show upgrade prompt
  if (!hasActiveSubscription) {
    return (
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <AlertTriangle className="w-6 h-6" />
            Subscription Required
          </CardTitle>
          <CardDescription className="text-blue-800">
            {mode === 'bulk' 
              ? 'Bulk profile creation requires an active subscription'
              : 'Profile creation requires an active subscription'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-blue-300 bg-blue-100">
            <AlertTriangle className="h-4 w-4 text-blue-700" />
            <AlertTitle className="text-blue-900">No Active Plan</AlertTitle>
            <AlertDescription className="text-blue-800">
              {subscriptionMessage || 'Please update your plan to continue creating profiles.'}
            </AlertDescription>
          </Alert>

          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Crown className="w-5 h-5 text-indigo-600" />
              Available Plans
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded border border-purple-200">
                <div>
                  <p className="font-semibold text-purple-900">Monthly Pro</p>
                  <p className="text-sm text-purple-700">Unlimited profiles & executions</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-purple-900">$30</p>
                  <p className="text-xs text-purple-700">/month</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded border border-blue-200">
                <div>
                  <p className="font-semibold text-blue-900">Yearly Pro</p>
                  <p className="text-sm text-blue-700">Save 30% - Best value!</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-900">$249</p>
                  <p className="text-xs text-blue-700">/year</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button 
              onClick={handleUpgradePlan}
              className="flex-1"
              variant="default"
            >
              <Crown className="w-4 h-4 mr-2" />
              Upgrade Now
            </Button>
            <Button 
              onClick={handleRefreshSubscription}
              variant="outline"
            >
              Refresh Status
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Active subscription - show content with subscription info
  return (
    <div className="space-y-4">
      {daysRemaining <= 7 && daysRemaining > 0 && (
        <Alert className="border-yellow-300 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-700" />
          <AlertTitle className="text-yellow-900">Subscription Expiring Soon</AlertTitle>
          <AlertDescription className="text-yellow-800">
            Your subscription expires in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}. 
            <Button 
              variant="link" 
              className="text-yellow-900 underline pl-1 h-auto p-0"
              onClick={handleUpgradePlan}
            >
              Renew now
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {children}
    </div>
  );
}
