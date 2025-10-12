'use client';

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Save,
  Calendar,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useLogger } from "@/lib/logger/LoggerProvider";
import { eventAPI } from "@/lib/api/event.api";
import { UpdateEventRequest, VenueResponse, EventResponse, EventStatus } from "@/lib/api/types/event.types";
import { withSpeakerAuth } from "@/components/hoc/withAuth";

const LOGGER_COMPONENT_NAME = 'SpeakerEditEventPage';

const statusColors = {
  [EventStatus.DRAFT]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  [EventStatus.PENDING_APPROVAL]: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  [EventStatus.PUBLISHED]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  [EventStatus.REJECTED]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  [EventStatus.CANCELLED]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  [EventStatus.COMPLETED]: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
};

function SpeakerEditEventPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const logger = useLogger();
  const eventId = params.id as string;

  const [formData, setFormData] = useState<UpdateEventRequest>({
    name: '',
    description: '',
    category: '',
    bannerImageUrl: '',
    venueId: 0,
    bookingStartDate: '',
    bookingEndDate: '',
  });

  const [originalEvent, setOriginalEvent] = useState<EventResponse | null>(null);
  const [venues, setVenues] = useState<VenueResponse[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoadingVenues, setIsLoadingVenues] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    } else if (!authLoading && user?.role !== 'SPEAKER') {
      router.push('/dashboard');
      return;
    }

    if (isAuthenticated && user && eventId) {
      loadEvent();
      loadVenues();
    }
  }, [isAuthenticated, authLoading, user, router, eventId]);

  const loadEvent = async () => {
    try {
      setIsLoading(true);
      logger.debug(LOGGER_COMPONENT_NAME, 'Loading event', { eventId });
      
      const response = await eventAPI.getMyEventById(eventId);
      
      if (response.success) {
        const event = response.data;
        setOriginalEvent(event);
        
        // Pre-populate form
        const startDate = new Date(event.bookingStartDate);
        const endDate = new Date(event.bookingEndDate);
        
        setFormData({
          name: event.name,
          description: event.description,
          category: event.category,
          bannerImageUrl: event.bannerImageUrl || '',
          venueId: event.venueId,
          bookingStartDate: formatDateTimeLocal(startDate),
          bookingEndDate: formatDateTimeLocal(endDate),
        });
        
        logger.debug(LOGGER_COMPONENT_NAME, 'Event loaded successfully', { eventId: event.id });
      } else {
        throw new Error('Failed to load event');
      }
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to load event', error as Error);
      setErrors({ general: 'Failed to load event. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTimeLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const loadVenues = async () => {
    try {
      setIsLoadingVenues(true);
      const response = await eventAPI.getAllVenues();
      setVenues(response.data);
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to load venues', error as Error);
    } finally {
      setIsLoadingVenues(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.name !== undefined && !formData.name.trim()) {
      newErrors.name = 'Event name cannot be empty';
    }

    if (formData.description !== undefined && !formData.description.trim()) {
      newErrors.description = 'Event description cannot be empty';
    }

    if (formData.category !== undefined && !formData.category.trim()) {
      newErrors.category = 'Event category cannot be empty';
    }

    if (formData.venueId !== undefined && (!formData.venueId || formData.venueId === 0)) {
      newErrors.venueId = 'Please select a venue';
    }

    if (formData.bookingStartDate && formData.bookingEndDate) {
      const startDate = new Date(formData.bookingStartDate);
      const endDate = new Date(formData.bookingEndDate);

      if (startDate >= endDate) {
        newErrors.bookingEndDate = 'End date must be after start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof UpdateEventRequest, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

    // Check if event can be edited
    if (originalEvent && originalEvent.status !== EventStatus.DRAFT && originalEvent.status !== EventStatus.REJECTED) {
      setErrors({ general: 'Only DRAFT or REJECTED events can be edited' });
      return;
    }

    setIsSubmitting(true);
    logger.info(LOGGER_COMPONENT_NAME, 'Updating event', { eventId, eventName: formData.name });

    try {
      const response = await eventAPI.updateEvent(eventId, formData);
      
      if (!response.success) {
        throw new Error('Failed to update event');
      }

      logger.info(LOGGER_COMPONENT_NAME, 'Event updated successfully', { eventId });
      setShowSuccess(true);

      setTimeout(() => {
        router.push('/dashboard/speaker/events');
      }, 2000);
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to update event', error as Error);
      setErrors({ 
        general: error instanceof Error ? error.message : 'Failed to update event. Please try again.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-700 dark:text-slate-300 font-medium">Loading event...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'SPEAKER') {
    return null;
  }

  // Error state
  if (errors.general && !originalEvent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Error Loading Event
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              {errors.general}
            </p>
            <Button
              onClick={() => router.push('/dashboard/speaker/events')}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              Back to Events
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="text-center py-12">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">
              Event Updated Successfully!
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Your event changes have been saved.
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-500">
              Redirecting to events list...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if event can be edited
  const canEdit = originalEvent && (originalEvent.status === EventStatus.DRAFT || originalEvent.status === EventStatus.REJECTED);

  if (!canEdit && originalEvent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Cannot Edit Event
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Only DRAFT or REJECTED events can be edited. This event has status: <strong>{originalEvent.status}</strong>
            </p>
            <Button
              onClick={() => router.push('/dashboard/speaker/events')}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              Back to Events
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard/speaker/events')}
                className="text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Events
              </Button>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Edit Event
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {originalEvent && (
          <Card className="mb-6 border-slate-200 dark:border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Current Status</h3>
                  {originalEvent.rejectionReason && (
                    <p className="text-sm text-red-600 dark:text-red-400 mb-2">
                      <strong>Rejection Reason:</strong> {originalEvent.rejectionReason}
                    </p>
                  )}
                </div>
                <Badge className={statusColors[originalEvent.status]}>
                  {originalEvent.status.replace('_', ' ')}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">
              Edit Event
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              Update your event details. You can only edit DRAFT or REJECTED events.
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
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Basic Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Event Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className={errors.name ? 'border-red-500' : ''}
                    />
                    {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      className={errors.category ? 'border-red-500' : ''}
                    />
                    {errors.category && <p className="text-sm text-red-600">{errors.category}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-md ${errors.description ? 'border-red-500' : 'border-slate-300'}`}
                  />
                  {errors.description && <p className="text-sm text-red-600">{errors.description}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bannerImageUrl">Banner Image URL</Label>
                  <Input
                    id="bannerImageUrl"
                    type="url"
                    value={formData.bannerImageUrl}
                    onChange={(e) => handleInputChange('bannerImageUrl', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Venue Selection
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="venueId">Select Venue *</Label>
                  {isLoadingVenues ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <select
                      id="venueId"
                      value={formData.venueId}
                      onChange={(e) => handleInputChange('venueId', parseInt(e.target.value))}
                      className={`w-full px-3 py-2 border rounded-md ${errors.venueId ? 'border-red-500' : 'border-slate-300'}`}
                    >
                      <option value={0}>Select a venue</option>
                      {venues.map((venue) => (
                        <option key={venue.id} value={venue.id}>
                          {venue.name} - {venue.address} (Capacity: {venue.capacity})
                        </option>
                      ))}
                    </select>
                  )}
                  {errors.venueId && <p className="text-sm text-red-600">{errors.venueId}</p>}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Date and Time
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bookingStartDate">Start Date & Time *</Label>
                    <Input
                      id="bookingStartDate"
                      type="datetime-local"
                      value={formData.bookingStartDate}
                      onChange={(e) => handleInputChange('bookingStartDate', e.target.value)}
                      className={errors.bookingStartDate ? 'border-red-500' : ''}
                    />
                    {errors.bookingStartDate && <p className="text-sm text-red-600">{errors.bookingStartDate}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bookingEndDate">End Date & Time *</Label>
                    <Input
                      id="bookingEndDate"
                      type="datetime-local"
                      value={formData.bookingEndDate}
                      onChange={(e) => handleInputChange('bookingEndDate', e.target.value)}
                      className={errors.bookingEndDate ? 'border-red-500' : ''}
                    />
                    {errors.bookingEndDate && <p className="text-sm text-red-600">{errors.bookingEndDate}</p>}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-slate-200 dark:border-slate-700">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard/speaker/events')}
                  disabled={isSubmitting}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
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
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
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

export default withSpeakerAuth(SpeakerEditEventPage);

