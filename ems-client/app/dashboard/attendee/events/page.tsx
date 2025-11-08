'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { bookingAPI, ticketAPI } from '@/lib/api/booking.api';
import { eventAPI } from '@/lib/api/event.api';
import { feedbackAPI, FeedbackFormResponse } from '@/lib/api/feedback.api';
import { FeedbackDialog } from '@/components/feedback/FeedbackDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { useLogger } from '@/lib/logger/LoggerProvider';
import {
  Search,
  Filter,
  Calendar,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Eye,
  Ticket,
  Play,
  ArrowLeft,
  MessageSquare
} from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

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
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const logger = useLogger();

  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingStatus, setBookingStatus] = useState<BookingStatus>({});
  const [userBookings, setUserBookings] = useState<{ [eventId: string]: boolean }>({});
  const [feedbackForms, setFeedbackForms] = useState<{ [eventId: string]: FeedbackFormResponse | null }>({});
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
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    loadEvents();
    loadUserBookings();
  }, [isAuthenticated, router]);

  // Load feedback forms when events change
  useEffect(() => {
    if (events.length > 0) {
      loadFeedbackForms();
    }
  }, [events]);

  // Update current time every minute to show/hide Join Event button based on 10-minute window
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

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
      logger.info(LOGGER_COMPONENT_NAME, 'Loading published events');

      const response = await eventAPI.getPublishedEvents();
      setEvents(response.data?.events || []);

      logger.info(LOGGER_COMPONENT_NAME, 'Events loaded successfully');
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

  const loadFeedbackForms = async () => {
    try {
      logger.debug(LOGGER_COMPONENT_NAME, 'Loading feedback forms for events');

      const forms: { [eventId: string]: FeedbackFormResponse | null } = {};

      // Load feedback forms for all events in parallel
      const formPromises = events.map(async (event) => {
        try {
          const form = await feedbackAPI.getFeedbackFormByEventId(event.id);
          // Only store if form exists and is published
          if (form && form.status === 'PUBLISHED') {
            forms[event.id] = form;
          } else {
            forms[event.id] = null;
          }
        } catch (error) {
          logger.debug(LOGGER_COMPONENT_NAME, `No feedback form for event ${event.id}`);
          forms[event.id] = null;
        }
      });

      await Promise.all(formPromises);
      setFeedbackForms(forms);

      logger.debug(LOGGER_COMPONENT_NAME, 'Feedback forms loaded', {
        totalForms: Object.values(forms).filter(f => f !== null).length
      });
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to load feedback forms', error as Error);
    }
  };

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
                onClick={() => router.push('/dashboard/attendee')}
                className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Discover Events
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={user?.image || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name || user?.email}`}
                    alt={user?.name || user?.email}
                  />
                  <AvatarFallback className="text-xs">
                    {user?.name ? user.name.split(' ').map(n => n[0]).join('') : user?.email?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {user?.name || user?.email}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-6">
        {/* Sub Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Find and book amazing events happening around you</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => router.push('/dashboard/attendee/tickets')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Ticket className="h-4 w-4" />
              My Tickets
            </Button>
          </div>
        </div>

      {/* Messages */}
      {errorMessage && (
        <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-400 rounded-r-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-red-700 font-medium">{errorMessage}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-400 rounded-r-lg">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
            <p className="text-green-700 font-medium">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Events
          </CardTitle>
          <CardDescription>
            Narrow down your search to find the perfect event
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search events..."
                  value={filters.searchTerm}
                  onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">All Categories</option>
                {getUniqueCategories().map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Venue */}
            <div>
              <Label htmlFor="venue">Venue</Label>
              <select
                id="venue"
                value={filters.venue}
                onChange={(e) => handleFilterChange('venue', e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">All Venues</option>
                {getUniqueVenues().map(venue => (
                  <option key={venue} value={venue}>{venue}</option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div>
              <Label htmlFor="dateRange">When</Label>
              <select
                id="dateRange"
                value={filters.dateRange}
                onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Any Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <Button onClick={clearFilters} variant="outline" className="w-full">
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-gray-600">
          Showing {filteredEvents.length} of {events.length} events
          {(filters.searchTerm || filters.category || filters.venue || filters.dateRange) && ' (filtered)'}
        </p>
      </div>

      {/* Events Grid */}
      {filteredEvents.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="flex flex-col items-center">
              <Calendar className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                {events.length === 0 ? 'No Events Available' : 'No Events Match Your Filters'}
              </h3>
              <p className="text-gray-500 mb-4">
                {events.length === 0
                  ? 'Check back later for new events!'
                  : 'Try adjusting your filters to see more events.'
                }
              </p>
              {events.length > 0 && (
                <Button onClick={clearFilters} variant="outline">
                  Clear All Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Upcoming and Running Events */}
          {filteredEvents.filter(event => !isEventExpired(event)).length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Available Events ({filteredEvents.filter(event => !isEventExpired(event)).length})
              </h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.filter(event => !isEventExpired(event)).map((event) => {
            const eventTime = formatEventTime(event.bookingStartDate, event.bookingEndDate);
            const isBooked = userBookings[event.id];
            const isBooking = bookingStatus[event.id] === 'loading';
            const isBookedSuccess = bookingStatus[event.id] === 'success';

            return (
              <Card key={event.id} className="border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        {event.name}
                      </CardTitle>
                      <div className="flex flex-wrap gap-2">
                        {isBooked && (
                          <Badge className="bg-green-600 text-white">
                            BOOKED
                          </Badge>
                        )}
                        {isEventExpired(event) ? (
                          <Badge variant="secondary" className="bg-gray-500 text-white">
                            ENDED
                          </Badge>
                        ) : isEventRunning(event) ? (
                          <Badge className="bg-orange-600 text-white">
                            LIVE
                          </Badge>
                        ) : isEventUpcoming(event) ? (
                          <Badge className="bg-blue-600 text-white">
                            UPCOMING
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 line-clamp-2">
                    {event.description}
                  </p>

                  {/* Event Details */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                      <MapPin className="h-4 w-4 mr-2"/>
                      <span>{event.venue.name}</span>
                    </div>
                    <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                      <Clock className="h-4 w-4 mr-2"/>
                      <span>{eventTime.time}</span>
                    </div>
                  </div>

                  {/* Feedback Form Section - Only show if published */}
                  {feedbackForms[event.id] && feedbackForms[event.id]?.status === 'PUBLISHED' && (
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                            Feedback Form Available
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedEventForFeedback({
                              eventId: event.id,
                              eventName: event.name,
                              form: feedbackForms[event.id]!
                            });
                            setFeedbackDialogOpen(true);
                          }}
                          className="text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                        >
                          Provide Feedback
                        </Button>
                      </div>
                      {feedbackForms[event.id]?.description && (
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                          {feedbackForms[event.id]?.description}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/dashboard/attendee/events/${event.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-1"/>
                      View Details
                    </Button>

                    {isEventExpired(event) ? (
                      <Button
                        size="sm"
                        disabled={true}
                        variant="secondary"
                      >
                        <AlertCircle className="h-4 w-4 mr-1" />
                        Event Ended
                      </Button>
                    ) : isBooked && isWithin10MinutesOfStart(event) ? (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => router.push(`/dashboard/attendee/events/${event.id}/live`)}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                      >
                        <Play className="h-4 w-4 mr-1"/>
                        Join Event
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleBookEvent(event.id)}
                        disabled={isButtonDisabled(event.id, event)}
                        variant={getBookingButtonVariant(event.id, event)}
                      >
                        {isBooking ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            Booking...
                          </>
                        ) : isBookedSuccess ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Booked! ✓
                          </>
                        ) : (
                          <>
                            <Ticket className="h-4 w-4 mr-1" />
                            Book Event
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
              </div>
            </div>
          )}

          {/* Expired Events */}
          {filteredEvents.filter(event => isEventExpired(event)).length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-gray-500" />
                Past Events ({filteredEvents.filter(event => isEventExpired(event)).length})
              </h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredEvents.filter(event => isEventExpired(event)).map((event) => {
                  const eventTime = formatEventTime(event.bookingStartDate, event.bookingEndDate);
                  const isBooked = userBookings[event.id];

                  return (

<Card key={event.id} className="border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow opacity-75">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                              {event.name}
                            </CardTitle>
                            <div className="flex flex-wrap gap-2">
                              {isBooked && (
                                <Badge className="bg-green-600 text-white">
                                  ATTENDED
                                </Badge>
                              )}
                              <Badge variant="secondary" className="bg-gray-500 text-white">
                                ENDED
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent>
                        <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 line-clamp-2">
                          {event.description}
                        </p>

                        {/* Event Details */}
                        <div className="space-y-3 mb-4">
                          <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                            <MapPin className="h-4 w-4 mr-2"/>
                            <span>{event.venue.name}</span>
                          </div>
                          <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                            <Clock className="h-4 w-4 mr-2"/>
                            <span>{eventTime.time}</span>
                          </div>
                        </div>

                        {/* Feedback Form Section - Only show if published (for past events) */}
                        {feedbackForms[event.id] && feedbackForms[event.id]?.status === 'PUBLISHED' && (
                          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                  Feedback Form Available
                                </span>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => router.push(`/dashboard/attendee/events/${event.id}`)}
                                className="text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                              >
                                Provide Feedback
                              </Button>
                            </div>
                            {feedbackForms[event.id]?.description && (
                              <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                                {feedbackForms[event.id]?.description}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/dashboard/attendee/events/${event.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1"/>
                            View Details
                          </Button>
                          <Button
                            disabled={true}
                            variant="secondary"
                            size="sm"
                          >
                            <AlertCircle className="h-4 w-4 mr-1" />
                            Event Ended
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
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
            // Optionally reload feedback forms or show success message
            setSuccessMessage('Feedback submitted successfully!');
            setTimeout(() => setSuccessMessage(''), 3000);
          }}
        />
      )}
    </div>
  );
}
