'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { authAPI } from '@/lib/api/auth.api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { useLogger } from '@/lib/logger/LoggerProvider';
import { ArrowLeft, Save, User, Mail, Lock, Image as ImageIcon, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

const LOGGER_COMPONENT_NAME = 'AttendeeProfilePage';

interface ProfileFormData {
  name: string;
  image: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function AttendeeProfilePage() {
  const { user, checkAuth, isAuthenticated } = useAuth();
  const router = useRouter();
  const logger = useLogger();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    image: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    loadProfile();
  }, [isAuthenticated, user]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use user from context, or fetch if not available
      let profileData = user;
      if (!profileData) {
        logger.info(LOGGER_COMPONENT_NAME, 'Fetching user profile');
        profileData = await authAPI.getProfile();
      }

      if (profileData) {
        setFormData({
          name: profileData.name || '',
          image: profileData.image || '',
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });

        logger.info(LOGGER_COMPONENT_NAME, 'Profile loaded successfully');
      }
    } catch (err: any) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to load profile', err);
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear errors when user starts typing
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  const validateForm = (): boolean => {
    // Name is required
    if (!formData.name.trim()) {
      setError('Name is required');
      return false;
    }

    // If changing password, validate password fields
    if (formData.newPassword || formData.currentPassword || formData.confirmPassword) {
      if (!formData.currentPassword) {
        setError('Current password is required to change password');
        return false;
      }
      if (!formData.newPassword) {
        setError('New password is required');
        return false;
      }
      if (formData.newPassword.length < 8) {
        setError('New password must be at least 8 characters long');
        return false;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        setError('New password and confirm password do not match');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      logger.info(LOGGER_COMPONENT_NAME, 'Updating profile');

      // Prepare update data
      const updateData: {
        name?: string;
        image?: string | null;
        currentPassword?: string;
        newPassword?: string;
      } = {
        name: formData.name.trim(),
        image: formData.image.trim() || null
      };

      // Only include password fields if user is changing password
      if (formData.newPassword && formData.currentPassword) {
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
      }

      const response = await authAPI.updateProfile(updateData);

      // Refresh auth context to get updated user data
      await checkAuth();

      setSuccess('Profile updated successfully!');

      // Clear password fields after successful update
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));

      logger.info(LOGGER_COMPONENT_NAME, 'Profile updated successfully');
    } catch (err: any) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to update profile', err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/attendee')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Edit Profile</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Update your profile information and preferences
          </p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="h-5 w-5" />
                <p>{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {success && (
          <Card className="mb-6 border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                <p>{success}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Profile Form */}
        <Card className="border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white">
              Profile Information
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              Manage your account details and preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Profile Picture Preview */}
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={formData.image || undefined} alt={formData.name} />
                  <AvatarFallback className="text-lg">
                    {formData.name.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    Profile Picture
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Enter a URL to your profile image
                  </p>
                </div>
              </div>

              {/* Name Field */}
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Full Name *
                </Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  required
                  className="w-full"
                />
              </div>

              {/* Email Field (Read-only) */}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full bg-slate-100 dark:bg-slate-800 cursor-not-allowed"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Email cannot be changed
                </p>
              </div>

              {/* Image URL Field */}
              <div className="space-y-2">
                <Label htmlFor="image" className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Profile Image URL
                </Label>
                <Input
                  id="image"
                  name="image"
                  type="url"
                  value={formData.image}
                  onChange={handleInputChange}
                  placeholder="https://example.com/your-image.jpg"
                  className="w-full"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enter a URL to your profile picture
                </p>
              </div>

              {/* Password Change Section */}
              <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Change Password
                  </h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Leave blank if you don't want to change your password. Password change is not available for OAuth accounts.
                </p>

                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    value={formData.currentPassword}
                    onChange={handleInputChange}
                    placeholder="Enter current password"
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    placeholder="Enter new password (min. 8 characters)"
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Confirm new password"
                    className="w-full"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard/attendee')}
                  disabled={saving}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

