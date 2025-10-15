import { useState } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import AuthPage from '@/components/auth/AuthPage';
import Sidebar from '@/components/layout/Sidebar';
import { ProfileCreationFlow } from '@/components/profiles/ProfileCreationFlow'; // Updated import
import ProxyManager from '@/components/proxies/ProxyManager';
import { RPADashboard } from '@/components/rpa';
import SettingsPanel from '@/components/settings/SettingsPanel';
import UserAccount from '@/components/auth/UserAccount';
import ReferralSystem from '@/components/ReferralSystem';
import SupportTeam from '@/components/SupportTeam';
import { useProfileStorage } from '@/hooks/useProfileStorage';

function AppContent() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profiles');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Use the new profile storage hook for persistent storage
  const { profiles, setProfiles } = useProfileStorage();

  // Show auth page if user is not logged in
  if (!currentUser) {
    return <AuthPage />;
  }

  const handleProfilesChange = (newProfiles: any[]) => {
    setProfiles(newProfiles);
  };

  const renderContent = () => {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-auto p-6">
          {(() => {
            switch (activeTab) {
              case 'profiles':
                return (
                  <ProfileCreationFlow profiles={profiles} onProfilesChange={handleProfilesChange} />
                );
              case 'proxies':
                return <ProxyManager />;
              case 'rpa':
                return <RPADashboard />;
              case 'settings':
                return <SettingsPanel />;
              case 'user':
                return <UserAccount />;
              case 'referral':
                return <ReferralSystem />;
              case 'support':
                return <SupportTeam />;
              default:
                return <ProfileCreationFlow profiles={profiles} onProfilesChange={handleProfilesChange} />;
            }
          })()}
        </div>
      </div>
    );
  };

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isCollapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        
        <main className="flex-1 overflow-auto bg-white/80 backdrop-blur-sm">
          <div className="container mx-auto p-6">
            {renderContent()}
          </div>
        </main>
        
        <Toaster />
      </div>
    </TooltipProvider>
  );
}

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;