'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { bookingAPI, ticketAPI } from '@/lib/api/booking.api';
import { eventAPI } from '@/lib/api/event.api';
import { feedbackAPI, FeedbackFormResponse } from '@/lib/api/feedback.api';
import { FeedbackDialog } from '@/components/feedback/FeedbackDialog';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLogger } from '@/lib/logger/LoggerProvider';
import { EventsPageHeader } from '@/components/attendee/EventsPageHeader';
import { EventsPageSubHeader } from '@/components/attendee/EventsPageSubHeader';
import { EventMessages } from '@/components/attendee/EventMessages';
import { EventFiltersComponent } from '@/components/attendee/EventFilters';
import { EventsList } from '@/components/attendee/EventsList';
import { EmptyEventsState } from '@/components/attendee/EmptyEventsState';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

const LOGGER_COMPONENT_NAME = 'AttendeeEventsPage';

import { EventResponse } from '@/lib/api/types/event.types';

interface Event extends EventResponse {}

interface BookingStatus {
  [eventId: string]: 'loading' | 'success' | 'error' | 'idle';
}

interface EventFilters {
  searchTerm: string;
  category: string;
  dateRange: string;
  venue: string;
}

export default function AttendeeEventsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const logger = useLogger();

  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingStatus, setBookingStatus] = useState<BookingStatus>({});
  const [userBookings, setUserBookings] = useState<{ [eventId: string]: boolean }>({});
  const [feedbackForms, setFeedbackForms] = useState<{ [eventId: string]: FeedbackFormResponse | null }>({});
  const [userFeedbackSubmissions, setUserFeedbackSubmissions] = useState<{ [eventId: string]: boolean }>({});
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [selectedEventForFeedback, setSelectedEventForFeedback] = useState<{ eventId: string; eventName: string; form: FeedbackFormResponse } | null>(null);
  const [filters, setFilters] = useState<EventFilters>({
    searchTerm: '',
    category: '',
    dateRange: '',
    venue: ''
  });

  useEffect(() => {
    // Wait for auth check to complete before redirecting
    if (authLoading) {
      logger.debug(LOGGER_COMPONENT_NAME, 'Auth still loading, waiting...');
      return;
    }

    // Only redirect if auth check is complete and user is not authenticated
    if (!isAuthenticated) {
      logger.debug(LOGGER_COMPONENT_NAME, 'User not authenticated, redirecting to login');
      router.push('/login');
      return;
    }

    logger.info(LOGGER_COMPONENT_NAME, 'User authenticated, loading initial data', {
      userId: user?.id,
      isAuthenticated,
      authLoading
    });
    loadEvents();
    loadUserBookings();
  }, [isAuthenticated, authLoading, router, logger, user?.id]);

  // Update current time every minute to show/hide Join Event button based on 10-minute window
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    loadUserFeedbackSubmissions();
    return () => clearInterval(interval);
  }, []);

  // Filter events when filters or events change
  useEffect(() => {
    let filtered = [...events];

    // Filter by search term
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(event =>
        event.name.toLowerCase().includes(searchLower) ||
        event.description.toLowerCase().includes(searchLower) ||
        event.category.toLowerCase().includes(searchLower) ||
        event.venue.name.toLowerCase().includes(searchLower)
      );
    }

    // Filter by category
    if (filters.category) {
      filtered = filtered.filter(event => event.category === filters.category);
    }

    // Filter by venue
    if (filters.venue) {
      filtered = filtered.filter(event => event.venue.name === filters.venue);
    }

    // Filter by date range
    if (filters.dateRange) {
      const now = new Date();
      const filterDate = new Date();

      switch (filters.dateRange) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(event => new Date(event.bookingStartDate) >= filterDate);
          break;
        case 'week':
          filterDate.setDate(now.getDate() + 7);
          filtered = filtered.filter(event => new Date(event.bookingStartDate) <= filterDate);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() + 1);
          filtered = filtered.filter(event => new Date(event.bookingStartDate) <= filterDate);
          break;
      }
    }

    setFilteredEvents(filtered);
  }, [events, filters]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      logger.info(LOGGER_COMPONENT_NAME, 'Loading published events', {
        isAuthenticated,
        authLoading,
        userId: user?.id
      });

      const response = await eventAPI.getPublishedEvents();
      const loadedEvents = response.data?.events || [];
      setEvents(loadedEvents);

      logger.info(LOGGER_COMPONENT_NAME, 'Events loaded successfully', {
        eventsCount: loadedEvents.length,
        eventIds: loadedEvents.map(e => e.id)
      });
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to load events', error as Error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserBookings = async () => {
    try {
      logger.info(LOGGER_COMPONENT_NAME, 'Loading user bookings');

      // Load both bookings and tickets to get complete picture
      const [bookingsResponse, ticketsResponse] = await Promise.all([
        bookingAPI.getUserBookings(),
        ticketAPI.getUserTickets()
      ]);

      const bookings = bookingsResponse.data?.bookings || [];
      const tickets = ticketsResponse.data || [];

      // Create a map of eventId -> true for events the user has booked
      const bookingMap: { [eventId: string]: boolean } = {};

      // Add bookings
      bookings.forEach((booking: any) => {
        bookingMap[booking.eventId] = true;
      });

      // Add tickets (in case bookings API doesn't return all data)
      tickets.forEach((ticket: any) => {
        if (ticket.eventId) {
          bookingMap[ticket.eventId] = true;
        }
      });

      setUserBookings(bookingMap);
      logger.info(LOGGER_COMPONENT_NAME, 'User bookings loaded successfully', {
        bookingsCount: bookings.length,
        ticketsCount: tickets.length,
        uniqueEvents: Object.keys(bookingMap).length
      });
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to load user bookings', error as Error);
    }
  };

  const loadFeedbackForms = useCallback(async () => {
    try {
      logger.info(LOGGER_COMPONENT_NAME, '=== START: Loading feedback forms for events ===', {
        eventsCount: events.length,
        eventIds: events.map(e => e.id),
        isAuthenticated,
        userId: user?.id
      });

      if (events.length === 0) {
        logger.warn(LOGGER_COMPONENT_NAME, 'No events to load feedback forms for');
        return;
      }

      const forms: { [eventId: string]: FeedbackFormResponse | null } = {};

      // Load feedback forms for all events in parallel
      logger.info(LOGGER_COMPONENT_NAME, 'Starting parallel feedback form requests', {
        eventCount: events.length
      });

      const formPromises = events.map(async (event) => {
        try {
          logger.debug(LOGGER_COMPONENT_NAME, `Fetching feedback form for event ${event.id}`, {
            eventId: event.id,
            eventName: event.name
          });
          const form = await feedbackAPI.getFeedbackFormByEventId(event.id);
          // Only store if form exists and is published
          if (form && form.status === 'PUBLISHED') {
            forms[event.id] = form;
            logger.debug(LOGGER_COMPONENT_NAME, `Found published feedback form for event ${event.id}`, {
              formId: form.id,
              eventId: event.id
            });
          } else {
            forms[event.id] = null;
            logger.debug(LOGGER_COMPONENT_NAME, `No published feedback form for event ${event.id}`, {
              hasForm: !!form,
              formStatus: form?.status
            });
          }
        } catch (error) {
          logger.debug(LOGGER_COMPONENT_NAME, `No feedback form for event ${event.id}`, {
            eventId: event.id,
            error: error instanceof Error ? error.message : String(error)
          });
          forms[event.id] = null;
        }
      });

      await Promise.all(formPromises);
      setFeedbackForms(forms);

      const publishedFormsCount = Object.values(forms).filter(f => f !== null).length;
      logger.info(LOGGER_COMPONENT_NAME, '=== END: Feedback forms loaded successfully ===', {
        totalForms: publishedFormsCount,
        totalEvents: events.length,
        formsByEventId: Object.keys(forms).reduce((acc, eventId) => {
          acc[eventId] = forms[eventId] ? 'published' : 'none';
          return acc;
        }, {} as Record<string, string>)
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorData: any = {
        eventsCount: events.length,
        errorMessage
      };
      if (error instanceof Error) {
        errorData.error = {
          message: error.message,
          stack: error.stack,
          name: error.name
        };
      } else {
        errorData.error = String(error);
      }
      logger.error(LOGGER_COMPONENT_NAME, `=== ERROR: Failed to load feedback forms === ${errorMessage}`, errorData);
    }
  }, [events, logger, isAuthenticated, user?.id]);

  const loadUserFeedbackSubmissions = useCallback(async () => {
    try {
      logger.info(LOGGER_COMPONENT_NAME, '=== START: Loading user feedback submissions ===', {
        isAuthenticated,
        userId: user?.id,
        userEmail: user?.email,
        timestamp: new Date().toISOString()
      });

      if (!isAuthenticated || !user) {
        logger.warn(LOGGER_COMPONENT_NAME, 'Cannot load feedback submissions - user not authenticated', {
          isAuthenticated,
          hasUser: !!user,
          userId: user?.id
        });
        return;
      }

      logger.info(LOGGER_COMPONENT_NAME, 'Making API call to getMyFeedbackSubmissions', {
        userId: user.id,
        page: 1,
        limit: 100
      });

      const result = await feedbackAPI.getMyFeedbackSubmissions(1, 100); // Get submissions (max 100 per page)
      const submissionsMap: { [eventId: string]: boolean } = {};

      logger.info(LOGGER_COMPONENT_NAME, 'API response received - Total feedback submissions retrieved', {
        submissionsLength: result.submissions.length,
        total: result.total,
        page: result.page,
        limit: result.limit,
        submissions: result.submissions.map(s => ({
          id: s.id,
          eventId: s.eventId,
          formId: s.formId,
          rating: s.rating
        }))
      });

      // Create a map of eventId -> true for events the user has submitted feedback for
      result.submissions.forEach((submission) => {
        submissionsMap[submission.eventId] = true;
        logger.debug(LOGGER_COMPONENT_NAME, `Mapping submission to event`, {
          submissionId: submission.id,
          eventId: submission.eventId
        });
      });

      setUserFeedbackSubmissions(submissionsMap);

      logger.info(LOGGER_COMPONENT_NAME, '=== END: User feedback submissions loaded successfully ===', {
        totalSubmissions: result.submissions.length,
        uniqueEvents: Object.keys(submissionsMap).length,
        eventIds: Object.keys(submissionsMap),
        submissionsMap
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorData: any = {
        isAuthenticated,
        userId: user?.id,
        errorMessage,
        timestamp: new Date().toISOString()
      };
      if (error instanceof Error) {
        errorData.error = {
          message: error.message,
          stack: error.stack,
          name: error.name
        };
        errorData.errorStack = error.stack;
      } else {
        errorData.error = String(error);
      }
      logger.error(LOGGER_COMPONENT_NAME, `=== ERROR: Failed to load user feedback submissions === ${errorMessage}`, errorData);
      // Set empty map on error to prevent UI issues
      setUserFeedbackSubmissions({});
    }
  }, [isAuthenticated, user, logger]);

  // Load feedback forms and user submissions when events change
  useEffect(() => {
    logger.info(LOGGER_COMPONENT_NAME, '=== useEffect: Feedback data loading triggered ===', {
      eventsCount: events.length,
      isAuthenticated,
      authLoading,
      hasLoadFeedbackForms: typeof loadFeedbackForms === 'function',
      hasLoadUserFeedbackSubmissions: typeof loadUserFeedbackSubmissions === 'function',
      timestamp: new Date().toISOString()
    });

    // Only load if authenticated and events are available
    if (!isAuthenticated || authLoading || events.length === 0) {
      logger.warn(LOGGER_COMPONENT_NAME, 'Skipping feedback data load - conditions not met', {
        isAuthenticated,
        authLoading,
        eventsCount: events.length
      });
      return;
    }

    // WORKAROUND: Use a small delay to ensure state is fully updated
    const timeoutId = setTimeout(() => {
      // Wrap async calls in an IIFE to handle them properly
      (async () => {
        try {
          logger.info(LOGGER_COMPONENT_NAME, '=== useEffect: Starting feedback data load (delayed) ===', {
            eventsCount: events.length,
            isAuthenticated,
            authLoading,
            timestamp: new Date().toISOString()
          });
          await Promise.all([
            loadFeedbackForms(),
            loadUserFeedbackSubmissions()
          ]);
          logger.info(LOGGER_COMPONENT_NAME, '=== useEffect: Feedback data load completed ===');
        } catch (error) {
          logger.error(LOGGER_COMPONENT_NAME, '=== useEffect: Error loading feedback data ===', error as Error);
        }
      })();
    }, 200); // Small delay to ensure events state is updated

    return () => clearTimeout(timeoutId);
  }, [events, isAuthenticated, authLoading, loadFeedbackForms, loadUserFeedbackSubmissions, logger]);

  const handleBookEvent = async (eventId: string) => {
    if (!user) return;

    // Prevent booking if already booked
    if (userBookings[eventId]) {
      logger.info(LOGGER_COMPONENT_NAME, 'User already has booking for this event');
      return;
    }

    try {
      setBookingStatus(prev => ({ ...prev, [eventId]: 'loading' }));
      logger.info(LOGGER_COMPONENT_NAME, 'Creating booking for event');

      const booking = await bookingAPI.createBooking({
        userId: user.id,
        eventId: eventId
      });

      setBookingStatus(prev => ({ ...prev, [eventId]: 'success' }));
      setSuccessMessage('🎉 Booking successful! Your ticket is being generated...');
      logger.info('Booking created successfully, ticket should be generated', LOGGER_COMPONENT_NAME);

      // Refresh user bookings to update the UI
      loadUserBookings();

      // Clear success message and redirect to tickets page
      setTimeout(() => {
        setSuccessMessage('');
        router.push('/dashboard/attendee/tickets');
      }, 3000);

    } catch (error: any) {
      setBookingStatus(prev => ({ ...prev, [eventId]: 'error' }));

      // Handle specific error cases
      if (error?.response?.status === 409) {
        logger.info(LOGGER_COMPONENT_NAME, 'User already has booking for this event (409)');
        setErrorMessage('You have already booked this event!');
        // Refresh bookings to sync state
        loadUserBookings();
        // Clear error message after 3 seconds
        setTimeout(() => setErrorMessage(''), 3000);
      } else if (error?.response?.status === 400) {
        setErrorMessage('Invalid event data. Please try again.');
        setTimeout(() => setErrorMessage(''), 3000);
      } else {
        logger.error(LOGGER_COMPONENT_NAME, 'Failed to create booking', error as Error);
        setErrorMessage('Failed to book event. Please try again.');
        setTimeout(() => setErrorMessage(''), 3000);
      }
    }
  };


  const getBookingButtonText = (eventId: string, event: Event) => {
    // Check if event is expired
    if (isEventExpired(event)) {
      return 'Event Ended';
    }

    // Check if user already has a booking for this event
    if (userBookings[eventId]) {
      return 'Already Booked ✓';
    }

    const status = bookingStatus[eventId];
    switch (status) {
      case 'loading': return 'Booking...';
      case 'success': return 'Booked! ✓';
      case 'error': return 'Error - Try Again';
      default: return 'Book Event';
    }
  };

  const getBookingButtonVariant = (eventId: string, event: Event) => {
    // Check if event is expired
    if (isEventExpired(event)) {
      return 'secondary';
    }

    // Check if user already has a booking for this event
    if (userBookings[eventId]) {
      return 'secondary';
    }

    const status = bookingStatus[eventId];
    switch (status) {
      case 'success': return 'default';
      case 'error': return 'destructive';
      default: return 'default';
    }
  };

  const isEventBooked = (eventId: string) => {
    // Primary check: userBookings (persistent state from API)
    if (userBookings[eventId]) {
      return true;
    }

    // Secondary check: bookingStatus (temporary UI state)
    // Only consider 'success' if we don't have userBookings data yet
    return bookingStatus[eventId] === 'success';
  };

  const isButtonDisabled = (eventId: string, event: Event) => {
    return isEventExpired(event) || isEventBooked(eventId) || bookingStatus[eventId] === 'loading';
  };

  const handleFilterChange = (key: keyof EventFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      category: '',
      dateRange: '',
      venue: ''
    });
  };

  const getUniqueCategories = () => {
    return [...new Set(events.map(event => event.category))];
  };

  const getUniqueVenues = () => {
    return [...new Set(events.map(event => event.venue.name))];
  };

  const formatEventTime = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return {
      date: start.toLocaleDateString(),
      time: `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    };
  };

  // Utility function to check if event is expired/ended
  const isEventExpired = (event: Event) => {
    const now = new Date();
    const eventEndDate = new Date(event.bookingEndDate);
    return eventEndDate < now || event.status === 'COMPLETED' || event.status === 'CANCELLED';
  };

  // Utility function to check if event is upcoming
  const isEventUpcoming = (event: Event) => {
    const now = new Date();
    const eventStartDate = new Date(event.bookingStartDate);
    return eventStartDate > now && event.status === 'PUBLISHED';
  };

  // Utility function to check if event is currently running
  const isEventRunning = (event: Event) => {
    const now = new Date();
    const eventStartDate = new Date(event.bookingStartDate);
    const eventEndDate = new Date(event.bookingEndDate);
    return eventStartDate <= now && eventEndDate >= now && event.status === 'PUBLISHED';
  };

  // Utility function to check if event is within 10 minutes of start time
  const isWithin10MinutesOfStart = (event: Event) => {
    const now = currentTime; // Use currentTime state for real-time updates
    const eventStartDate = new Date(event.bookingStartDate);
    const tenMinutesInMs = 10 * 60 * 1000; // 10 minutes in milliseconds
    const timeUntilStart = eventStartDate.getTime() - now.getTime();

    // Return true if:
    // 1. Event has already started (timeUntilStart <= 0)
    // 2. OR event starts within 10 minutes (0 <= timeUntilStart <= 10 minutes)
    return timeUntilStart <= tenMinutesInMs && !isEventExpired(event);
  };


  // Show loading state while auth is being checked
  if (authLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-slate-700 dark:text-slate-300">Verifying authentication...</p>
          </div>
        </div>
      </div>
    );
  }

  // Don't render content if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Available Events</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const availableEvents = filteredEvents.filter(event => !isEventExpired(event));
  const pastEvents = filteredEvents.filter(event => isEventExpired(event));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <EventsPageHeader
        userName={user?.name}
        userEmail={user?.email}
        userImage={user?.image}
      />

      <div className="container mx-auto p-6">
        <EventsPageSubHeader />

        <EventMessages
          errorMessage={errorMessage}
          successMessage={successMessage}
        />

        <EventFiltersComponent
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
          categories={getUniqueCategories()}
          venues={getUniqueVenues()}
        />

        {/* Results Summary */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-gray-600">
            Showing {filteredEvents.length} of {events.length} events
            {(filters.searchTerm || filters.category || filters.venue || filters.dateRange) && ' (filtered)'}
          </p>
        </div>

        {/* Events Grid */}
        {filteredEvents.length === 0 ? (
          <EmptyEventsState
            totalEvents={events.length}
            onClearFilters={clearFilters}
          />
        ) : (
          <EventsList
            availableEvents={availableEvents}
            pastEvents={pastEvents}
            userBookings={userBookings}
            bookingStatus={bookingStatus}
            feedbackForms={feedbackForms}
            userFeedbackSubmissions={userFeedbackSubmissions}
            isEventExpired={isEventExpired}
            isEventUpcoming={isEventUpcoming}
            isEventRunning={isEventRunning}
            isWithin10MinutesOfStart={isWithin10MinutesOfStart}
            formatEventTime={formatEventTime}
            onBookEvent={handleBookEvent}
            onProvideFeedback={(eventId, eventName, form) => {
              setSelectedEventForFeedback({
                eventId,
                eventName,
                form
              });
              setFeedbackDialogOpen(true);
            }}
          />
        )}
      </div>

      {/* Feedback Dialog */}
      {selectedEventForFeedback && (
        <FeedbackDialog
          open={feedbackDialogOpen}
          onOpenChange={setFeedbackDialogOpen}
          feedbackForm={selectedEventForFeedback.form}
          eventId={selectedEventForFeedback.eventId}
          eventName={selectedEventForFeedback.eventName}
          onSuccess={() => {
            // Reload user feedback submissions to show "My Responses" button
            loadUserFeedbackSubmissions();
            setSuccessMessage('Feedback submitted successfully!');
            setTimeout(() => setSuccessMessage(''), 3000);
          }}
        />
      )}
    </div>
  );
}
