'use client';

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Save,
  Eye,
  Calendar,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLogger } from "@/lib/logger/LoggerProvider";
import { eventAPI } from "@/lib/api/event.api";
import { CreateEventRequest, VenueResponse } from "@/lib/api/types/event.types";
import { withAdminAuth } from "@/components/hoc/withAuth";

const LOGGER_COMPONENT_NAME = 'AdminCreateEventPage';

function AdminCreateEventPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const logger = useLogger();

  // Form state
  type AdminCreateEventForm = Omit<CreateEventRequest, 'userId'>;

  const [formData, setFormData] = useState<AdminCreateEventForm>({
    name: '',
    description: '',
    category: '',
    bannerImageUrl: '',
    venueId: 0,
    bookingStartDate: '',
    bookingEndDate: ''
  });

  const [venues, setVenues] = useState<VenueResponse[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoadingVenues, setIsLoadingVenues] = useState(true);
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

    if (isAuthenticated && user) {
      loadVenues();
    }
  }, [isAuthenticated, isLoading, user, router]);

  const loadVenues = async () => {
    try {
      setIsLoadingVenues(true);
      logger.debug(LOGGER_COMPONENT_NAME, 'Loading venues');
      const response = await eventAPI.getAllVenues();
      setVenues(response.data);
      logger.debug(LOGGER_COMPONENT_NAME, 'Venues loaded successfully', { count: response.data.length });
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to load venues', error as Error);
      setErrors({ general: 'Failed to load venues. Please try again.' });
    } finally {
      setIsLoadingVenues(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Event name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Event description is required';
    }

    if (!formData.category.trim()) {
      newErrors.category = 'Event category is required';
    }

    if (!formData.venueId || formData.venueId === 0) {
      newErrors.venueId = 'Please select a venue';
    }

    if (!formData.bookingStartDate) {
      newErrors.bookingStartDate = 'Start date is required';
    }

    if (!formData.bookingEndDate) {
      newErrors.bookingEndDate = 'End date is required';
    }

    if (formData.bookingStartDate && formData.bookingEndDate) {
      const startDate = new Date(formData.bookingStartDate);
      const endDate = new Date(formData.bookingEndDate);

      if (startDate >= endDate) {
        newErrors.bookingEndDate = 'End date must be after start date';
      }

      if (startDate < new Date()) {
        newErrors.bookingStartDate = 'Start date cannot be in the past';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof AdminCreateEventForm, value: string | number) => {
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
    logger.info(LOGGER_COMPONENT_NAME, 'Admin creating event (auto-published)', { eventName: formData.name });

    try {
      // Create event - backend auto-publishes for admin users
      const createResponse = await eventAPI.createEventAsAdmin(formData);
      
      if (!createResponse.success) {
        throw new Error('Failed to create event');
      }

      logger.info(LOGGER_COMPONENT_NAME, 'Event created and auto-published successfully', { 
        eventId: createResponse.data.id,
        status: createResponse.data.status 
      });

      // Show success message
      setShowSuccess(true);

      // Redirect after a short delay
      setTimeout(() => {
        router.push('/dashboard/admin/events');
      }, 2000);
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to create event', error as Error);
      setErrors({ 
        general: error instanceof Error ? error.message : 'Failed to create event. Please try again.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePreview = () => {
    logger.info(LOGGER_COMPONENT_NAME, 'Preview event clicked');
    // TODO: Implement preview functionality
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-700 dark:text-slate-300 font-medium">Loading...</p>
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="text-center py-12">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">
              Event Created & Published!
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              The event has been successfully created and published. It's now visible to all users.
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-500">
              Redirecting to events list...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard/admin/events')}
                className="text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Events
              </Button>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Create New Event (Admin)
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Banner */}
        <Card className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  Admin Event Creation
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Events created by admins are <strong>automatically published</strong> and will be immediately visible to all users. 
                  They bypass the approval workflow that speaker-created events go through.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">
              Event Creation Form
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              Fill out the form below to create and publish a new event. All fields are required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {errors.general && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
                  <p className="text-red-800 dark:text-red-200">{errors.general}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Basic Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Event Name *
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Enter event name"
                      className={errors.name ? 'border-red-500' : ''}
                    />
                    {errors.name && (
                      <p className="text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Category *
                    </Label>
                    <Input
                      id="category"
                      type="text"
                      value={formData.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      placeholder="e.g., Technology, Business, Education"
                      className={errors.category ? 'border-red-500' : ''}
                    />
                    {errors.category && (
                      <p className="text-sm text-red-600 dark:text-red-400">{errors.category}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Description *
                  </Label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Describe your event in detail..."
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.description ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'
                    }`}
                  />
                  {errors.description && (
                    <p className="text-sm text-red-600 dark:text-red-400">{errors.description}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bannerImageUrl" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Banner Image URL
                  </Label>
                  <Input
                    id="bannerImageUrl"
                    type="url"
                    value={formData.bannerImageUrl}
                    onChange={(e) => handleInputChange('bannerImageUrl', e.target.value)}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>

              {/* Venue Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Venue Selection
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="venueId" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Select Venue *
                  </Label>
                  {isLoadingVenues ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-slate-600 dark:text-slate-400">Loading venues...</span>
                    </div>
                  ) : (
                    <select
                      id="venueId"
                      value={formData.venueId}
                      onChange={(e) => handleInputChange('venueId', parseInt(e.target.value))}
                      className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.venueId ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      <option value={0}>Select a venue</option>
                      {venues.map((venue) => (
                        <option key={venue.id} value={venue.id}>
                          {venue.name} - {venue.address} (Capacity: {venue.capacity})
                        </option>
                      ))}
                    </select>
                  )}
                  {errors.venueId && (
                    <p className="text-sm text-red-600 dark:text-red-400">{errors.venueId}</p>
                  )}
                </div>
              </div>

              {/* Date and Time */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Date and Time
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bookingStartDate" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Start Date & Time *
                    </Label>
                    <Input
                      id="bookingStartDate"
                      type="datetime-local"
                      value={formData.bookingStartDate}
                      onChange={(e) => handleInputChange('bookingStartDate', e.target.value)}
                      className={errors.bookingStartDate ? 'border-red-500' : ''}
                    />
                    {errors.bookingStartDate && (
                      <p className="text-sm text-red-600 dark:text-red-400">{errors.bookingStartDate}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bookingEndDate" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      End Date & Time *
                    </Label>
                    <Input
                      id="bookingEndDate"
                      type="datetime-local"
                      value={formData.bookingEndDate}
                      onChange={(e) => handleInputChange('bookingEndDate', e.target.value)}
                      className={errors.bookingEndDate ? 'border-red-500' : ''}
                    />
                    {errors.bookingEndDate && (
                      <p className="text-sm text-red-600 dark:text-red-400">{errors.bookingEndDate}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-slate-200 dark:border-slate-700">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard/admin/events')}
                  className="flex-1 sm:flex-none"
                  disabled={isSubmitting}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Cancel
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePreview}
                  className="flex-1 sm:flex-none"
                  disabled={isSubmitting}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating & Publishing...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Create & Publish Event
                    </>
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

export default withAdminAuth(AdminCreateEventPage);
