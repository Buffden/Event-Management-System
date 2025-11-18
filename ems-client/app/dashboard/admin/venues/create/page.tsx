'use client';

import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLogger } from "@/lib/logger/LoggerProvider";
import { eventAPI } from "@/lib/api/event.api";
import { CreateVenueRequest } from "@/lib/api/types/event.types";
import { withAdminAuth } from "@/components/hoc/withAuth";
import { ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const LOGGER_COMPONENT_NAME = 'AdminCreateVenuePage';

function AdminCreateVenuePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const logger = useLogger();

  const [formData, setFormData] = useState<CreateVenueRequest>({
    name: '',
    address: '',
    capacity: 0,
    openingTime: '09:00',
    closingTime: '17:00'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    logger.debug(LOGGER_COMPONENT_NAME, 'Auth state changed', { isAuthenticated, isLoading, user });

    if (!isLoading && !isAuthenticated) {
      logger.debug(LOGGER_COMPONENT_NAME, 'User not authenticated, redirecting to login');
      router.push('/login');
      return;
    } else if (!isLoading && user?.role !== 'ADMIN') {
      logger.debug(LOGGER_COMPONENT_NAME, 'User does not have permissions', { role: user?.role });
      router.push('/dashboard');
      return;
    }
  }, [isAuthenticated, isLoading, user, router]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Venue name is required';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Venue address is required';
    }

    if (!formData.capacity || formData.capacity <= 0) {
      newErrors.capacity = 'Capacity must be greater than 0';
    }

    // Validate time format (HH:mm)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(formData.openingTime)) {
      newErrors.openingTime = 'Opening time must be in HH:mm format (24-hour)';
    }

    if (!timeRegex.test(formData.closingTime)) {
      newErrors.closingTime = 'Closing time must be in HH:mm format (24-hour)';
    }

    // Validate that closing time is after opening time
    const [openHour, openMin] = formData.openingTime.split(':').map(Number);
    const [closeHour, closeMin] = formData.closingTime.split(':').map(Number);
    const openMinutes = openHour * 60 + openMin;
    const closeMinutes = closeHour * 60 + closeMin;

    if (closeMinutes <= openMinutes) {
      newErrors.closingTime = 'Closing time must be after opening time';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof CreateVenueRequest, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      logger.warn(LOGGER_COMPONENT_NAME, 'Form validation failed', { errors });
      return;
    }

    setIsSubmitting(true);
    logger.info(LOGGER_COMPONENT_NAME, 'Creating new venue', { venueName: formData.name });

    try {
      const createResponse = await eventAPI.createVenue(formData);

      if (!createResponse.success) {
        throw new Error('Failed to create venue');
      }

      logger.info(LOGGER_COMPONENT_NAME, 'Venue created successfully', {
        venueId: createResponse.data.id,
        venueName: createResponse.data.name
      });

      // Show success message
      setShowSuccess(true);

      // Redirect after a short delay
      setTimeout(() => {
        router.push('/dashboard/admin');
      }, 2000);
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to create venue', error as Error);
      setErrors({
        general: error instanceof Error ? error.message : 'Failed to create venue. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'ADMIN') {
    return null;
  }

  // Success state
  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <Card className="max-w-md w-full border-slate-200 dark:border-slate-700">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Venue Created Successfully!
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                The venue has been created and is now available for use.
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-500">
                Redirecting to dashboard...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard/admin')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Create New Venue
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Add a new venue to the system. All fields are required.
          </p>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <Card className="border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">
              Venue Information
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              Fill out the form below to create a new venue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {errors.general && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.general}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Venue Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-900 dark:text-white">
                  Venue Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Grand Ballroom"
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name}</p>
                )}
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address" className="text-slate-900 dark:text-white">
                  Address <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Enter the full address of the venue"
                  rows={3}
                  className={errors.address ? 'border-red-500' : ''}
                />
                {errors.address && (
                  <p className="text-sm text-red-500">{errors.address}</p>
                )}
              </div>

              {/* Capacity */}
              <div className="space-y-2">
                <Label htmlFor="capacity" className="text-slate-900 dark:text-white">
                  Capacity <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  value={formData.capacity || ''}
                  onChange={(e) => handleInputChange('capacity', parseInt(e.target.value) || 0)}
                  placeholder="e.g., 500"
                  className={errors.capacity ? 'border-red-500' : ''}
                />
                {errors.capacity && (
                  <p className="text-sm text-red-500">{errors.capacity}</p>
                )}
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Maximum number of attendees the venue can accommodate
                </p>
              </div>

              {/* Opening and Closing Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="openingTime" className="text-slate-900 dark:text-white">
                    Opening Time <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="openingTime"
                    type="text"
                    value={formData.openingTime}
                    onChange={(e) => handleInputChange('openingTime', e.target.value)}
                    placeholder="HH:mm (e.g., 09:00)"
                    pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
                    className={errors.openingTime ? 'border-red-500' : ''}
                  />
                  {errors.openingTime && (
                    <p className="text-sm text-red-500">{errors.openingTime}</p>
                  )}
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    24-hour format (HH:mm)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="closingTime" className="text-slate-900 dark:text-white">
                    Closing Time <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="closingTime"
                    type="text"
                    value={formData.closingTime}
                    onChange={(e) => handleInputChange('closingTime', e.target.value)}
                    placeholder="HH:mm (e.g., 17:00)"
                    pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
                    className={errors.closingTime ? 'border-red-500' : ''}
                  />
                  {errors.closingTime && (
                    <p className="text-sm text-red-500">{errors.closingTime}</p>
                  )}
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    24-hour format (HH:mm)
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard/admin')}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    'Create Venue'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default withAdminAuth(AdminCreateVenuePage);

