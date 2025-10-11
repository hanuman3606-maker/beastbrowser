import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ProfileCreationWrapper } from '@/components/ProfileCreationWrapper';
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';

interface ProfileData {
  name: string;
  platform: string;
  proxy?: string;
}

export function ProfileCreatorWithLimits() {
  const { user, login } = useFirebaseAuth();
  const { toast } = useToast();
  const [profileData, setProfileData] = useState<ProfileData>({
    name: '',
    platform: 'windows'
  });

  const handleCreateProfile = async (props: any) => {
    const { canCreate, checking, checkProfileLimit, recordProfileCreation } = props;
    
    if (checking) {
      toast({
        title: 'Checking Limits',
        description: 'Please wait while we check your profile limits...',
      });
      return;
    }

    if (!canCreate) {
      const result = await checkProfileLimit();
      if (!result.allowed) {
        toast({
          title: 'Profile Creation Blocked',
          description: result.reason || 'You have reached your profile creation limit.',
          variant: 'destructive',
        });
        return;
      }
    }

    // Proceed with profile creation
    try {
      // This would call the Electron API to create the profile
      // For example: await window.electronAPI.openProfile(profileData);
      
      // Record the profile creation in Firebase
      const recordResult = await recordProfileCreation();
      
      if (recordResult.success) {
        toast({
          title: 'Success',
          description: 'Profile created successfully!',
        });
        // Reset form
        setProfileData({ name: '', platform: 'windows' });
      } else {
        toast({
          title: 'Error',
          description: recordResult.error || 'Failed to record profile creation',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create profile',
        variant: 'destructive',
      });
    }
  };

  if (!user) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">Create Profile</h2>
        <p className="mb-4">Please log in to create profiles.</p>
        {/* You would render the FirebaseLogin component here */}
      </div>
    );
  }

  return (
    <ProfileCreationWrapper>
      {(props) => (
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Create Profile</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Profile Name</label>
              <input
                type="text"
                value={profileData.name}
                onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Enter profile name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Platform</label>
              <select
                value={profileData.platform}
                onChange={(e) => setProfileData({...profileData, platform: e.target.value})}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="windows">Windows</option>
                <option value="macos">macOS</option>
                <option value="linux">Linux</option>
                <option value="android">Android</option>
                <option value="ios">iOS</option>
                <option value="tv">TV</option>
              </select>
            </div>
            
            <Button 
              onClick={() => handleCreateProfile(props)}
              disabled={props.checking || !profileData.name.trim()}
            >
              {props.checking ? 'Checking Limits...' : 'Create Profile'}
            </Button>
          </div>
        </div>
      )}
    </ProfileCreationWrapper>
  );
}