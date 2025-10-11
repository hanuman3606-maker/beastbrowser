import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/services/apiService';
import { User, Settings, CreditCard, Shield, Calendar, Crown, Check, X, AlertCircle } from 'lucide-react';
import PricingPage from '@/components/pricing/PricingPage';
import { toast } from 'sonner';
import { supabaseSubscriptionService } from '@/services/supabaseSubscriptionService';

export default function UserAccount() {
  const { currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    displayName: currentUser?.displayName || '',
    email: currentUser?.email || '',
    phone: '',
    company: ''
  });
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [usageData, setUsageData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Load subscription and usage data from Supabase
  useEffect(() => {
    const loadData = async () => {
      if (!currentUser?.email) {
        return;
      }

      try {
        console.log('📊 Loading subscription data for:', currentUser.email);
        
        // Get subscription stats from Supabase
        const stats = await supabaseSubscriptionService.getSubscriptionStats(currentUser.email);
        
        if (stats.activeSubscription) {
          const sub = stats.activeSubscription;
          const planName = sub.plan_type === 'monthly' ? 'Monthly Premium (28 Days)' : 'Yearly Premium (365 Days)';
          const totalDays = sub.plan_type === 'monthly' ? 28 : 365;
          
          setSubscriptionData({
            plan: planName,
            status: sub.status,
            planType: sub.plan_type,
            totalDays: totalDays,
            daysRemaining: stats.daysRemaining,
            expiresAt: new Date(sub.expires_at),
            amount: sub.amount,
            currency: sub.currency
          });
          
          toast.success(`✅ ${planName} Active - ${stats.daysRemaining} days remaining`);
        } else {
          // No active subscription
          setSubscriptionData({
            plan: 'No Active Plan',
            status: 'inactive',
            planType: null,
            totalDays: 0,
            daysRemaining: 0,
            expiresAt: null
          });
          
          toast.error('❌ No active subscription found. Please purchase a plan.');
        }
        
        setUsageData({
          profilesUsedToday: stats.totalProfiles,
          totalProfiles: stats.totalProfiles,
          totalSpent: stats.totalSpent
        });
        
      } catch (error) {
        console.error('Error loading subscription data:', error);
        toast.error('Failed to load subscription data');
        
        // Set default data on error
        setSubscriptionData({
          plan: 'Error Loading',
          status: 'unknown',
          profilesUsedToday: 0,
          profilesLimit: 0,
          daysRemaining: 0
        });
      }
    };

    loadData();
  }, [currentUser]);

  const handleSaveProfile = () => {
    // In a real app, you would update the user profile here via API
    toast.success('Profile updated successfully');
    setIsEditing(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  const handleUpgradeClick = () => {
    // Redirect to the website for payment
    window.open('https://beastbrowser.com/pricing', '_blank');
  };

  const getSubscriptionBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'expired':
        return 'destructive';
      case 'trial':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  // Removed loading state - show data immediately

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Account Settings</h2>
          <p className="text-muted-foreground">Manage your account and subscription</p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          Logout
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>Profile</span>
          </TabsTrigger>
          <TabsTrigger value="subscription" className="flex items-center space-x-2">
            <Crown className="h-4 w-4" />
            <span>Subscription</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center space-x-2">
            <CreditCard className="h-4 w-4" />
            <span>Billing</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Security</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={currentUser?.photoURL || ''} />
                  <AvatarFallback className="text-lg">
                    {currentUser?.displayName?.charAt(0) || currentUser?.email?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-medium">{currentUser?.displayName || 'User'}</h3>
                  <p className="text-muted-foreground">{currentUser?.email}</p>
                  <Button variant="outline" size="sm" className="mt-2">
                    Change Avatar
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={profileData.displayName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, displayName: e.target.value }))}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={profileData.phone}
                    onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={profileData.company}
                    onChange={(e) => setProfileData(prev => ({ ...prev, company: e.target.value }))}
                    disabled={!isEditing}
                  />
                </div>
              </div>

              <div className="flex space-x-2">
                {isEditing ? (
                  <>
                    <Button onClick={handleSaveProfile}>Save Changes</Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                  </>
                ) : (
                  <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Subscription</CardTitle>
              <CardDescription>Manage your subscription plan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {subscriptionData ? (
                <>
                  {/* Plan Header */}
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Crown className="h-8 w-8 text-purple-600" />
                      <div>
                        <h3 className="text-xl font-bold">{subscriptionData.plan}</h3>
                        <p className="text-sm text-muted-foreground">
                          {subscriptionData.planType === 'monthly' ? '$30/month' : '$249/year'}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant={getSubscriptionBadgeVariant(subscriptionData.status)}
                      className="text-sm px-3 py-1"
                    >
                      {subscriptionData.status === 'active' ? (
                        <><Check className="h-3 w-3 mr-1" /> Active</>
                      ) : subscriptionData.status === 'expired' ? (
                        <><X className="h-3 w-3 mr-1" /> Expired</>
                      ) : (
                        <><AlertCircle className="h-3 w-3 mr-1" /> Inactive</>
                      )}
                    </Badge>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-2">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-green-600">
                            {subscriptionData.daysRemaining}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">Days Left</p>
                          {subscriptionData.expiresAt && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Expires: {new Date(subscriptionData.expiresAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-2">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-blue-600">
                            ∞
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">Unlimited Profiles</p>
                          <p className="text-xs text-muted-foreground mt-1">No daily limits</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-2">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-orange-600">
                            {subscriptionData.planType === 'monthly' ? '$30' : '$249'}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">Plan Value</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {subscriptionData.planType === 'monthly' ? '28 Days' : '365 Days'}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Expiry Warning */}
                  {subscriptionData.status === 'active' && subscriptionData.daysRemaining <= 7 && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="h-5 w-5 text-yellow-600" />
                        <p className="text-yellow-800 font-medium">Subscription expiring soon!</p>
                      </div>
                      <p className="text-yellow-700 text-sm mt-1">
                        Your subscription expires in {subscriptionData.daysRemaining} days. Renew now to avoid interruption.
                      </p>
                      <Button className="mt-2" onClick={handleUpgradeClick}>
                        Renew Now
                      </Button>
                    </div>
                  )}

                  {/* No Active Plan */}
                  {subscriptionData.status !== 'active' && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <X className="h-5 w-5 text-red-600" />
                        <p className="text-red-800 font-medium">No Active Subscription</p>
                      </div>
                      <p className="text-red-700 text-sm mt-1">
                        You need an active subscription to create browser profiles. Purchase a plan to continue.
                      </p>
                      <Button className="mt-2" onClick={handleUpgradeClick}>
                        Purchase Plan
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Loading subscription...</h3>
                  <p className="text-muted-foreground text-sm">
                    Fetching your subscription details from database.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <PricingPage />
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Billing History</CardTitle>
              <CardDescription>View your payment history and invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No billing history</h3>
                <p className="text-muted-foreground">
                  Your billing history will appear here after your first payment.
                </p>
                <Button className="mt-4" onClick={handleUpgradeClick}>
                  View Pricing Plans
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage your account security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Password</h4>
                    <p className="text-sm text-muted-foreground">Last changed 30 days ago</p>
                  </div>
                  <Button variant="outline">Change Password</Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Two-Factor Authentication</h4>
                    <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                  </div>
                  <Button variant="outline">Enable 2FA</Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Login Sessions</h4>
                    <p className="text-sm text-muted-foreground">Manage your active sessions</p>
                  </div>
                  <Button variant="outline">View Sessions</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}