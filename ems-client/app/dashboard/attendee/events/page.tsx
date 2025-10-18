'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { bookingAPI, ticketAPI } from '@/lib/api/booking.api';
import { eventAPI } from '@/lib/api/event.api';
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
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Star,
  Eye,
  Ticket
} from 'lucide-react';

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
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
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


  const getBookingButtonText = (eventId: string) => {
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

  const getBookingButtonVariant = (eventId: string) => {
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

  const isButtonDisabled = (eventId: string) => {
    return isEventBooked(eventId) || bookingStatus[eventId] === 'loading';
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
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Discover Events
          </h1>
          <p className="text-gray-600 mt-1">Find and book amazing events happening around you</p>
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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map((event) => {
            const eventTime = formatEventTime(event.bookingStartDate, event.bookingEndDate);
            const isBooked = userBookings[event.id];
            const isBooking = bookingStatus[event.id] === 'loading';
            const isBookedSuccess = bookingStatus[event.id] === 'success';
            
            return (
              <Card key={event.id} className={`hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${
                isBooked ? 'ring-2 ring-green-200 bg-green-50/30' : ''
              }`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-lg leading-tight pr-2">{event.name}</CardTitle>
                    <div className="flex flex-col gap-1">
                      {isBooked && (
                        <Badge className="bg-green-600 text-white flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          BOOKED
                        </Badge>
                      )}
                      <Badge variant={event.status === 'PUBLISHED' ? 'default' : 'secondary'}>
                        {event.status}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {eventTime.date}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Description */}
                  <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
                    {event.description}
                  </p>
                  
                  {/* Event Details */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">Time:</span>
                      <span>{eventTime.time}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-red-500" />
                      <span className="font-medium">Venue:</span>
                      <span>{event.venue.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-green-500" />
                      <span className="font-medium">Capacity:</span>
                      <span>{event.venue.capacity} people</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="font-medium">Category:</span>
                      <Badge variant="outline" className="text-xs">{event.category}</Badge>
                    </div>
                  </div>

                  {/* Booking Status */}
                  {isBooked && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">You have a ticket for this event!</span>
                      </div>
                    </div>
                  )}

                  {/* Booking Button */}
                  <Button
                    onClick={() => handleBookEvent(event.id)}
                    disabled={isButtonDisabled(event.id)}
                    variant={getBookingButtonVariant(event.id)}
                    className={`w-full transition-all duration-200 ${
                      isBooked ? 'opacity-60' : 'hover:scale-105'
                    }`}
                  >
                    {isBooking ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Booking...
                      </>
                    ) : isBookedSuccess ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Booked! ✓
                      </>
                    ) : isBooked ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Already Booked ✓
                      </>
                    ) : (
                      <>
                        <Ticket className="h-4 w-4 mr-2" />
                        Book Event
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
