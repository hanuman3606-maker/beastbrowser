import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Zap, Star } from 'lucide-react';
import { toast } from 'sonner';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const pricingPlans = [
  {
    id: 'monthly',
    name: 'Monthly Premium',
    price: 30,
    duration: '28 days',
    description: 'Best for regular users',
    features: [
      'Unlimited profiles',
      'Premium access to all features',
      'Advanced fingerprint randomization',
      'Priority support',
      'All device types supported',
      'Advanced proxy configurations',
      'Bulk profile creation',
      'Export/Import profiles'
    ],
    buttonText: 'Get Monthly Plan',
    popular: true,
    icon: Crown
  },
  {
    id: 'yearly',
    name: 'Yearly Premium',
    price: 249,
    duration: '365 days',
    description: 'Best value for power users',
    features: [
      'Unlimited profiles',
      'Premium access to all features',
      'Advanced fingerprint randomization',
      'VIP support',
      'All device types supported',
      'Advanced proxy configurations',
      'Bulk profile creation',
      'Export/Import profiles',
      'API access',
      'Custom integrations',
      'Priority feature requests'
    ],
    buttonText: 'Get Yearly Plan',
    popular: false,
    icon: Star,
    savings: 'Save $111 per year'
  }
];

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSubscription = async (plan: typeof pricingPlans[0]) => {
    // Redirect to website for payment
    const websiteUrl = 'https://beastbrowser.com';
    const planParam = plan.id === 'monthly' ? 'Monthly%20Premium' : 'Yearly%20Premium';
    
    toast.info('Redirecting to website for payment...');
    window.open(`${websiteUrl}/purchase?plan=${planParam}`, '_blank');
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold">Choose Your Plan</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Select the perfect plan for your browser automation needs. Purchase on our website and start creating unlimited profiles.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {pricingPlans.map((plan) => {
          const Icon = plan.icon;
          return (
            <Card 
              key={plan.id} 
              className={`relative ${plan.popular ? 'border-primary shadow-lg' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-3 py-1">
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-2">
                <div className="flex justify-center mb-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                
                <div className="py-4">
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold">
                      ${plan.price.toLocaleString('en-US')}
                    </span>
                    <span className="text-muted-foreground ml-2">
                      /{plan.duration}
                    </span>
                  </div>
                  {plan.savings && (
                    <p className="text-green-600 text-sm mt-2 font-medium">
                      {plan.savings}
                    </p>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                
                <Button 
                  className="w-full mt-6" 
                  variant={plan.popular ? 'default' : 'outline'}
                  onClick={() => handleSubscription(plan)}
                  disabled={loading === plan.id}
                >
                  {loading === plan.id ? 'Processing...' : plan.buttonText}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="text-center space-y-4 pt-8 border-t">
        <h3 className="text-xl font-semibold">Need Help Choosing?</h3>
        <p className="text-muted-foreground">
          Choose monthly for flexibility or yearly for maximum savings. All plans include unlimited profiles.
        </p>
        <div className="flex justify-center space-x-4 text-sm text-muted-foreground">
          <span>✓ Unlimited profiles</span>
          <span>✓ Secure payments</span>
          <span>✓ 24/7 support</span>
        </div>
      </div>
    </div>
  );
}