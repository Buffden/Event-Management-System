'use client';

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  Save,
  Calendar,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle,
  Users,
  UserPlus,
  Mail,
  CheckCircle2,
  XCircle,
  Clock3
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useLogger } from "@/lib/logger/LoggerProvider";
import { eventAPI } from "@/lib/api/event.api";
import { UpdateEventRequest, VenueResponse, EventResponse, EventStatus } from "@/lib/api/types/event.types";
import { adminApiClient, SpeakerInvitation } from "@/lib/api/admin.api";
import { SpeakerProfile } from "@/lib/api/speaker.api";
import { SpeakerSearchModal } from "@/components/admin/SpeakerSearchModal";
import { withAdminAuth } from "@/components/hoc/withAuth";

const LOGGER_COMPONENT_NAME = 'AdminModifyEventPage';

const statusColors = {
  [EventStatus.DRAFT]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  [EventStatus.PENDING_APPROVAL]: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  [EventStatus.PUBLISHED]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  [EventStatus.REJECTED]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  [EventStatus.CANCELLED]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  [EventStatus.COMPLETED]: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
};

function AdminModifyEventPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const logger = useLogger();
  const eventId = params.id as string;

  // Form state
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

  // Speaker invitation state
  const [showSpeakerSearchModal, setShowSpeakerSearchModal] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<SpeakerProfile | null>(null);
  const [eventInvitations, setEventInvitations] = useState<SpeakerInvitation[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [acceptedSpeakerFromInvitation, setAcceptedSpeakerFromInvitation] = useState<SpeakerProfile | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    } else if (!authLoading && user?.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }

    if (isAuthenticated && user && eventId) {
      loadEvent();
      loadVenues();
      loadSpeakerData();
      loadEventInvitations();
    }
  }, [isAuthenticated, authLoading, user, router, eventId]);

  // Load accepted speaker when invitations change
  useEffect(() => {
    if (eventInvitations.length > 0) {
      loadAcceptedSpeakerFromInvitations();
    }
  }, [eventInvitations]);

  const loadEvent = async () => {
    try {
      setIsLoading(true);
      logger.debug(LOGGER_COMPONENT_NAME, 'Loading event', { eventId });

      const response = await eventAPI.getEventById(eventId);

      if (response.success) {
        const event = response.data;
        setOriginalEvent(event);

        // Pre-populate form with existing data
        // Convert ISO dates to datetime-local format
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
      logger.debug(LOGGER_COMPONENT_NAME, 'Loading venues');
      const response = await eventAPI.getAllVenues();
      setVenues(response.data);
      logger.debug(LOGGER_COMPONENT_NAME, 'Venues loaded successfully', { count: response.data.length });
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to load venues', error as Error);
    } finally {
      setIsLoadingVenues(false);
    }
  };

  const loadSpeakerData = async () => {
    if (!originalEvent?.speakerId) return;

    try {
      logger.debug(LOGGER_COMPONENT_NAME, 'Loading speaker data', { speakerId: originalEvent.speakerId });

      const speaker = await adminApiClient.getSpeakerProfile(originalEvent.speakerId);
      setCurrentSpeaker(speaker);

      logger.info(LOGGER_COMPONENT_NAME, 'Speaker data loaded', { speakerId: originalEvent.speakerId });
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to load speaker data', error as Error);
      // Don't set error state - speaker might not exist yet
    }
  };

  const loadEventInvitations = async () => {
    try {
      setLoadingInvitations(true);
      logger.debug(LOGGER_COMPONENT_NAME, 'Loading event invitations', { eventId });

      const invitations = await adminApiClient.getEventInvitations(eventId);
      setEventInvitations(invitations);

      logger.info(LOGGER_COMPONENT_NAME, 'Event invitations loaded', {
        eventId,
        count: invitations.length
      });
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to load event invitations', error as Error);
      // Don't set error state - invitations might not exist yet
    } finally {
      setLoadingInvitations(false);
    }
  };

  const loadAcceptedSpeakerFromInvitations = async () => {
    try {
      const acceptedInvitation = eventInvitations.find(inv => inv.status === 'ACCEPTED');
      if (acceptedInvitation) {
        logger.debug(LOGGER_COMPONENT_NAME, 'Loading accepted speaker from invitation', {
          invitationId: acceptedInvitation.id,
          speakerId: acceptedInvitation.speakerId
        });
        const speaker = await adminApiClient.getSpeakerProfile(acceptedInvitation.speakerId);
        setAcceptedSpeakerFromInvitation(speaker);
        logger.info(LOGGER_COMPONENT_NAME, 'Accepted speaker loaded from invitation', {
          speakerId: acceptedInvitation.speakerId,
          speakerName: speaker.name
        });
      } else {
        setAcceptedSpeakerFromInvitation(null);
      }
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to load accepted speaker from invitation', error as Error);
      setAcceptedSpeakerFromInvitation(null);
    }
  };

  const handleInviteSpeaker = async (speakerId: string, message: string) => {
    try {
      logger.debug(LOGGER_COMPONENT_NAME, 'Sending speaker invitation', {
        speakerId,
        eventId,
        eventName: originalEvent?.name
      });

      const invitation = await adminApiClient.createInvitation({
        speakerId,
        eventId,
        message
      });

      logger.info(LOGGER_COMPONENT_NAME, 'Speaker invitation sent successfully', {
        invitationId: invitation.id,
        speakerId,
        eventId
      });

      // Reload invitations to show the new one
      await loadEventInvitations();

      // Close the modal
      setShowSpeakerSearchModal(false);

    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to send speaker invitation', error as Error);
      throw error; // Re-throw to let the modal handle the error
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
    logger.info(LOGGER_COMPONENT_NAME, 'Updating event', { eventId, eventName: formData.name });

    try {
      // Use admin endpoint which allows updating events in any status
      const response = await eventAPI.updateEventAsAdmin(eventId, formData);

      if (!response.success) {
        throw new Error('Failed to update event');
      }

      logger.info(LOGGER_COMPONENT_NAME, 'Event updated successfully', { eventId });

      // Show success message
      setShowSuccess(true);

      // Redirect after a short delay
      setTimeout(() => {
        router.push('/dashboard/admin/events');
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

  if (!isAuthenticated || user?.role !== 'ADMIN') {
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
              onClick={() => router.push('/dashboard/admin/events')}
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
              The event changes have been saved.
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
                Edit Event
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Event Info Banner */}
        {originalEvent && (
          <Card className="mb-6 border-slate-200 dark:border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                    Current Event Status
                  </h3>
                  <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                    <p><strong>Event ID:</strong> <span className="font-mono">{originalEvent.id}</span></p>
                    <p><strong>Speaker ID:</strong> <span className="font-mono">{originalEvent.speakerId}</span></p>
                    <p><strong>Created:</strong> {new Date(originalEvent.createdAt).toLocaleString()}</p>
                    <p><strong>Last Updated:</strong> {new Date(originalEvent.updatedAt).toLocaleString()}</p>
                    {originalEvent.rejectionReason && (
                      <p className="text-red-600 dark:text-red-400">
                        <strong>Rejection Reason:</strong> {originalEvent.rejectionReason}
                      </p>
                    )}
                  </div>
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
              Event Modification Form
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              Update the event details below. All fields can be modified.
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

              {/* Speaker Assignment */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Speaker Assignment
                </h3>

                {/* Current Speaker Display */}
                {(currentSpeaker || acceptedSpeakerFromInvitation) ? (
                  <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <UserPlus className="h-4 w-4 text-green-600" />
                            <h4 className="font-medium text-green-900 dark:text-green-100">
                              Current Speaker
                            </h4>
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              {currentSpeaker ? 'Assigned' : 'Accepted Invitation'}
                            </Badge>
                          </div>
                          <div className="space-y-1 text-sm">
                            <p className="text-green-800 dark:text-green-200">
                              <strong>Name:</strong> {(currentSpeaker || acceptedSpeakerFromInvitation)?.name}
                            </p>
                            <p className="text-green-700 dark:text-green-300">
                              <strong>Email:</strong> {(currentSpeaker || acceptedSpeakerFromInvitation)?.email}
                            </p>
                            {(currentSpeaker || acceptedSpeakerFromInvitation)?.expertise && (currentSpeaker || acceptedSpeakerFromInvitation)!.expertise.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {(currentSpeaker || acceptedSpeakerFromInvitation)!.expertise.slice(0, 3).map((exp) => (
                                  <Badge key={exp} variant="outline" className="text-xs bg-green-100 text-green-800 border-green-300">
                                    {exp}
                                  </Badge>
                                ))}
                                {(currentSpeaker || acceptedSpeakerFromInvitation)!.expertise.length > 3 && (
                                  <Badge variant="outline" className="text-xs bg-green-100 text-green-800 border-green-300">
                                    +{(currentSpeaker || acceptedSpeakerFromInvitation)!.expertise.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowSpeakerSearchModal(true)}
                          className="border-green-300 text-green-700 hover:bg-green-100"
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Change Speaker
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-500" />
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-gray-100">
                              No Speaker Assigned
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Invite a speaker to present at this event
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => setShowSpeakerSearchModal(true)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Invite Speaker
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Invitation History */}
                {eventInvitations.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        Invitation History
                        <Badge variant="outline" className="ml-2">
                          {eventInvitations.length} invitation{eventInvitations.length > 1 ? 's' : ''}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        Track all invitations sent for this event
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {loadingInvitations ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                          <span className="ml-2 text-gray-600 dark:text-gray-400">Loading invitations...</span>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {eventInvitations.map((invitation, index) => (
                            <div key={invitation.id} className={`p-4 border rounded-lg transition-all hover:shadow-md ${
                              invitation.status === 'ACCEPTED'
                                ? 'border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800'
                                : invitation.status === 'DECLINED'
                                ? 'border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800'
                                : invitation.status === 'PENDING'
                                ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800'
                                : 'border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700'
                            }`}>
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3 flex-1">
                                  <div className={`p-2 rounded-full ${
                                    invitation.status === 'ACCEPTED'
                                      ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300'
                                      : invitation.status === 'DECLINED'
                                      ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300'
                                      : invitation.status === 'PENDING'
                                      ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300'
                                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                                  }`}>
                                    {invitation.status === 'ACCEPTED' ? (
                                      <CheckCircle2 className="h-4 w-4" />
                                    ) : invitation.status === 'DECLINED' ? (
                                      <XCircle className="h-4 w-4" />
                                    ) : invitation.status === 'PENDING' ? (
                                      <Clock3 className="h-4 w-4" />
                                    ) : (
                                      <Mail className="h-4 w-4" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                        Invitation #{index + 1}
                                      </h4>
                                      <Badge variant="outline" className="text-xs">
                                        Speaker ID: {invitation.speakerId.slice(-8)}
                                      </Badge>
                                    </div>
                                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                      <div className="flex items-center gap-2">
                                        <Calendar className="h-3 w-3" />
                                        <span>
                                          Sent: {new Date(invitation.sentAt).toLocaleDateString()} at {new Date(invitation.sentAt).toLocaleTimeString()}
                                        </span>
                                      </div>
                                      {invitation.respondedAt && (
                                        <div className="flex items-center gap-2">
                                          <Clock className="h-3 w-3" />
                                          <span>
                                            Responded: {new Date(invitation.respondedAt).toLocaleDateString()} at {new Date(invitation.respondedAt).toLocaleTimeString()}
                                          </span>
                                        </div>
                                      )}
                                      {invitation.message && (
                                        <div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded border text-xs">
                                          <strong>Message:</strong> {invitation.message}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  {invitation.status === 'PENDING' && (
                                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-200">
                                      <Clock3 className="h-3 w-3 mr-1" />
                                      Pending Response
                                    </Badge>
                                  )}
                                  {invitation.status === 'ACCEPTED' && (
                                    <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Accepted
                                    </Badge>
                                  )}
                                  {invitation.status === 'DECLINED' && (
                                    <Badge variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                      <XCircle className="h-3 w-3 mr-1" />
                                      Declined
                                    </Badge>
                                  )}
                                  {invitation.status === 'EXPIRED' && (
                                    <Badge variant="secondary" className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                                      <Clock3 className="h-3 w-3 mr-1" />
                                      Expired
                                    </Badge>
                                  )}
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    ID: {invitation.id.slice(-8)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
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
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving Changes...
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

      {/* Speaker Search Modal */}
      <SpeakerSearchModal
        isOpen={showSpeakerSearchModal}
        onClose={() => setShowSpeakerSearchModal(false)}
        onInviteSpeaker={handleInviteSpeaker}
        eventId={eventId}
        eventName={originalEvent?.name || 'Event'}
        currentSpeakerId={originalEvent?.speakerId}
      />
    </div>
  );
}

export default withAdminAuth(AdminModifyEventPage);
