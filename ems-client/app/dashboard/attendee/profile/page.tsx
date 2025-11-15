'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { authAPI } from '@/lib/api/auth.api';
import { useRouter } from 'next/navigation';
import { useLogger } from '@/lib/logger/LoggerProvider';
import { PageHeader } from '@/components/attendee/PageHeader';
import { LoadingSpinner } from '@/components/attendee/LoadingSpinner';
import { ErrorMessage } from '@/components/attendee/ErrorMessage';
import { SuccessMessage } from '@/components/attendee/SuccessMessage';
import { ProfileForm } from '@/components/attendee/ProfileForm';
import { PageLayout } from '@/components/attendee/PageLayout';

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
    return <LoadingSpinner message="Loading profile..." />;
  }

  return (
    <PageLayout maxWidth="4xl">
        <PageHeader
          title="Edit Profile"
          description="Update your profile information and preferences"
        />

        {error && <ErrorMessage message={error} />}
        {success && <SuccessMessage message={success} />}

        <ProfileForm
          formData={formData}
          userEmail={user?.email}
          saving={saving}
          onInputChange={handleInputChange}
          onSubmit={handleSubmit}
        />
    </PageLayout>
  );
}

