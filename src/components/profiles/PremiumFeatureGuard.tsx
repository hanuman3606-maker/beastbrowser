import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';

interface PremiumFeatureGuardProps {
  featureName: string;
  children: React.ReactNode;
  onCheckPermission?: () => Promise<boolean>;
}

export function PremiumFeatureGuard({ 
  featureName, 
  children, 
  onCheckPermission 
}: PremiumFeatureGuardProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const checkPermission = async () => {
      setChecking(true);
      try {
        if (onCheckPermission) {
          const allowed = await onCheckPermission();
          setHasPermission(allowed);
        } else {
          // Default check for bulk creation permission
          try {
            const result = await (window as any).firebaseAPI?.canUseBulkCreation?.();
            setHasPermission(result?.allowed || false);
          } catch (error) {
            console.error('Error checking permission:', error);
            setHasPermission(false);
          }
        }
      } catch (error) {
        console.error('Error checking permission:', error);
        setHasPermission(false);
      } finally {
        setChecking(false);
      }
    };

    checkPermission();
  }, [onCheckPermission]);

  if (checking) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (hasPermission === false) {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>{featureName} - Premium Feature</CardTitle>
            <CardDescription>
              This feature is only available for premium users
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertTitle>Upgrade Required</AlertTitle>
              <AlertDescription>
                {featureName} is a premium feature that requires a paid subscription.
                Free users can create up to 7 profiles in total manually; bulk creation is disabled on the free plan.
              </AlertDescription>
            </Alert>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button onClick={() => {
                const email = (window as any).firebaseAPI?.getUser ? undefined : undefined;
                window.location.href = 'https://beastbrowser.com/pricing/';
              }}>
                Upgrade to Premium
              </Button>
              <Button variant="outline" onClick={() => {
                toast.info('You can manually create up to 7 profiles per day with the free plan.');
              }}>
                Back to Manual Creation
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}