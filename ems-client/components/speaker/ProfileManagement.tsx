'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  User, 
  Mail, 
  Briefcase, 
  MapPin, 
  Calendar,
  Save,
  Edit,
  CheckCircle,
  AlertCircle,
  Plus,
  X
} from 'lucide-react';
import { SpeakerProfile, UpdateSpeakerProfileRequest } from '@/lib/api/speaker.api';
import { useLogger } from '@/lib/logger/LoggerProvider';

const LOGGER_COMPONENT_NAME = 'ProfileManagement';

interface ProfileManagementProps {
  profile: SpeakerProfile | null;
  onUpdate: (data: UpdateSpeakerProfileRequest) => Promise<void>;
  loading?: boolean;
  isSetup?: boolean;
}

export function ProfileManagement({ profile, onUpdate, loading = false, isSetup = false }: ProfileManagementProps) {
  const logger = useLogger();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    expertise: [] as string[],
    isAvailable: true,
  });
  const [newExpertise, setNewExpertise] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Initialize form data when profile loads or in setup mode
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        bio: profile.bio || '',
        expertise: profile.expertise || [],
        isAvailable: profile.isAvailable,
      });
    } else if (isSetup) {
      // In setup mode, start with editing enabled
      setIsEditing(true);
    }
  }, [profile, isSetup]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      if (isSetup) {
        logger.debug(LOGGER_COMPONENT_NAME, 'Creating speaker profile', { 
          changes: formData 
        });
      } else if (profile) {
        logger.debug(LOGGER_COMPONENT_NAME, 'Updating speaker profile', { 
          speakerId: profile.id,
          changes: formData 
        });
      } else {
        throw new Error('No profile available for update');
      }

      await onUpdate(formData);
      
      setIsEditing(false);
      setSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
      
      logger.info(LOGGER_COMPONENT_NAME, isSetup ? 'Speaker profile created successfully' : 'Speaker profile updated successfully', 
        isSetup ? {} : { speakerId: profile?.id });
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, isSetup ? 'Failed to create speaker profile' : 'Failed to update speaker profile', error as Error, 
        isSetup ? {} : { speakerId: profile?.id });
      setError(error instanceof Error ? error.message : (isSetup ? 'Failed to create profile' : 'Failed to update profile'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        bio: profile.bio || '',
        expertise: profile.expertise || [],
        isAvailable: profile.isAvailable,
      });
    } else if (isSetup) {
      // In setup mode, reset to default values
      setFormData({
        name: '',
        bio: '',
        expertise: [],
        isAvailable: true,
      });
    }
    setIsEditing(false);
    setError(null);
    setNewExpertise('');
  };

  const addExpertise = () => {
    if (newExpertise.trim() && !formData.expertise.includes(newExpertise.trim())) {
      setFormData(prev => ({
        ...prev,
        expertise: [...prev.expertise, newExpertise.trim()]
      }));
      setNewExpertise('');
    }
  };

  const removeExpertise = (expertise: string) => {
    setFormData(prev => ({
      ...prev,
      expertise: prev.expertise.filter(e => e !== expertise)
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addExpertise();
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profile Management</CardTitle>
          <CardDescription>Loading your profile...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profile Management</CardTitle>
          <CardDescription>Unable to load your profile</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your speaker profile could not be loaded. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {isSetup ? 'Create Your Speaker Profile' : 'Profile Management'}
            </CardTitle>
            <CardDescription>
              {isSetup 
                ? 'Set up your speaker profile to start receiving invitations and managing your speaking engagements'
                : 'Manage your speaker profile and availability'
              }
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? (isSetup ? 'Creating...' : 'Saving...') : (isSetup ? 'Create Profile' : 'Save Changes')}
                </Button>
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Success/Error Messages */}
        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              {isSetup ? 'Profile created successfully!' : 'Profile updated successfully!'}
            </AlertDescription>
          </Alert>
        )}
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Basic Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                disabled={!isEditing}
                placeholder="Enter your full name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                value={profile.email}
                disabled
                className="bg-gray-50 dark:bg-gray-800"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Email cannot be changed here. Contact support if needed.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
              disabled={!isEditing}
              placeholder="Tell us about yourself, your background, and speaking experience..."
              rows={4}
            />
          </div>
        </div>

        {/* Expertise Areas */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Areas of Expertise</h3>
          
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={newExpertise}
                onChange={(e) => setNewExpertise(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={!isEditing}
                placeholder="Add an area of expertise..."
              />
              <Button 
                onClick={addExpertise} 
                disabled={!isEditing || !newExpertise.trim()}
                size="sm"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {formData.expertise.map((expertise, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {expertise}
                  {isEditing && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => removeExpertise(expertise)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </Badge>
              ))}
            </div>
            
            {formData.expertise.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No expertise areas added yet. Add some to help event organizers find you.
              </p>
            )}
          </div>
        </div>

        {/* Availability */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Availability</h3>
          
          <div className="flex items-center space-x-3">
            <Switch
              id="isAvailable"
              checked={formData.isAvailable}
              onCheckedChange={(checked: boolean) => setFormData(prev => ({ ...prev, isAvailable: checked }))}
              disabled={!isEditing}
            />
            <Label htmlFor="isAvailable" className="text-sm font-medium">
              Available for speaking opportunities
            </Label>
          </div>
          
          <p className="text-sm text-gray-500 dark:text-gray-400">
            When enabled, event organizers can find and invite you to speak at their events.
          </p>
        </div>

        {/* Profile Stats */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Profile Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Calendar className="h-4 w-4" />
              <span>Member since: {new Date(profile.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Mail className="h-4 w-4" />
              <span>Profile ID: {profile.id}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
