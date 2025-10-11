import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Gift } from 'lucide-react';

const ReferralSystem: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Gift className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Referral Program</h2>
      </div>

      <Card className="text-center py-12">
        <CardHeader className="pb-4">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full bg-orange-100">
              <Clock className="h-12 w-12 text-orange-600" />
            </div>
          </div>
          <CardTitle className="text-2xl text-orange-900">Coming Soon!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            We're working hard to bring you an amazing referral program that will help you earn rewards by inviting your friends to join BeastBrowser.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className="space-y-2">
              <div className="text-2xl">🎁</div>
              <h3 className="font-semibold">Earn Rewards</h3>
              <p className="text-sm text-muted-foreground">
                Get bonus credits for every friend who signs up
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-2xl">🔗</div>
              <h3 className="font-semibold">Easy Sharing</h3>
              <p className="text-sm text-muted-foreground">
                Share your unique referral link with friends
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-2xl">🚀</div>
              <h3 className="font-semibold">Unlock Premium</h3>
              <p className="text-sm text-muted-foreground">
                Use referral credits to access premium features
              </p>
            </div>
          </div>

          <div className="pt-6">
            <Badge variant="outline" className="text-sm px-3 py-1">
              Coming in Future Update
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReferralSystem;