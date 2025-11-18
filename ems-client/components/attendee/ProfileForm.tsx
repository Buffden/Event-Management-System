'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Save, User, Mail, Lock, Image as ImageIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ProfileFormData {
  name: string;
  image: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ProfileFormProps {
  formData: ProfileFormData;
  userEmail?: string;
  saving: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function ProfileForm({
  formData,
  userEmail,
  saving,
  onInputChange,
  onSubmit
}: ProfileFormProps) {
  const router = useRouter();

  return (
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
        <form onSubmit={onSubmit} className="space-y-6">
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
              onChange={onInputChange}
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
              value={userEmail || ''}
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
              onChange={onInputChange}
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
                onChange={onInputChange}
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
                onChange={onInputChange}
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
                onChange={onInputChange}
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
  );
}

