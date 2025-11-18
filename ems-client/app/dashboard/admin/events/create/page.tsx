'use client';

import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLogger } from "@/lib/logger/LoggerProvider";
import { eventAPI } from "@/lib/api/event.api";
import { CreateEventRequest, VenueResponse } from "@/lib/api/types/event.types";
import { withAdminAuth } from "@/components/hoc/withAuth";
import { PageHeader } from "@/components/admin/events/PageHeader";
import { InfoBanner } from "@/components/admin/events/InfoBanner";
import { ErrorAlert } from "@/components/admin/events/ErrorAlert";
import { BasicInfoSection } from "@/components/admin/events/BasicInfoSection";
import { VenueSection } from "@/components/admin/events/VenueSection";
import { DateTimeSection } from "@/components/admin/events/DateTimeSection";
import { ActionButtons } from "@/components/admin/events/ActionButtons";
import { SuccessState } from "@/components/admin/events/SuccessState";
import { LoadingState } from "@/components/admin/events/LoadingState";

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

  // Date state for DateTimeSelector (uses Date objects)
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date(Date.now() + 24 * 60 * 60 * 1000)); // Tomorrow

  const [venues, setVenues] = useState<VenueResponse[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoadingVenues, setIsLoadingVenues] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);

  // Sync date state with form data
  useEffect(() => {
    const formatDateForAPI = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    setFormData(prev => ({
      ...prev,
      bookingStartDate: formatDateForAPI(startDate),
      bookingEndDate: formatDateForAPI(endDate)
    }));
  }, [startDate, endDate]);

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

    // Validate date range using Date objects
    if (startDate >= endDate) {
      newErrors.bookingEndDate = 'End date must be after start date';
    }

    if (startDate < new Date()) {
      newErrors.bookingStartDate = 'Start date cannot be in the past';
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
    return <LoadingState />;
  }

  if (!isAuthenticated || user?.role !== 'ADMIN') {
    return null;
  }

  // Success state
  if (showSuccess) {
    return <SuccessState />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <PageHeader />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <InfoBanner />

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
            {errors.general && <ErrorAlert message={errors.general} />}

            <form onSubmit={handleSubmit} className="space-y-6">
              <BasicInfoSection
                name={formData.name}
                category={formData.category}
                description={formData.description}
                bannerImageUrl={formData.bannerImageUrl}
                errors={errors}
                onNameChange={(value) => handleInputChange('name', value)}
                onCategoryChange={(value) => handleInputChange('category', value)}
                onDescriptionChange={(value) => handleInputChange('description', value)}
                onBannerImageUrlChange={(value) => handleInputChange('bannerImageUrl', value)}
              />

              <VenueSection
                venueId={formData.venueId}
                venues={venues}
                isLoadingVenues={isLoadingVenues}
                error={errors.venueId}
                onVenueChange={(value) => handleInputChange('venueId', value)}
              />

              <DateTimeSection
                startDate={startDate}
                endDate={endDate}
                errors={errors}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
              />

              <ActionButtons isSubmitting={isSubmitting} onPreview={handlePreview} />
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default withAdminAuth(AdminCreateEventPage);
