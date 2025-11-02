'use client';

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  LogOut,
  Calendar,
  Ticket,
  Star,
  Clock,
  Search,
  Eye,
  Download,
  Settings,
  TrendingUp,
  Award,
  MapPin,
  Users,
  Loader2
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {useLogger} from "@/lib/logger/LoggerProvider";
import {withUserAuth} from "@/components/hoc/withAuth";
import { bookingAPI, ticketAPI } from "@/lib/api/booking.api";
import { eventAPI } from "@/lib/api/event.api";
import { BookingResponse, TicketResponse } from "@/lib/api/types/booking.types";
import { EventResponse } from "@/lib/api/types/event.types";

// Interface for display data
interface UpcomingEventDisplay {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  attendees?: number;
  status: 'registered' | 'interested';
  ticketType?: string | null;
  eventId: string;
}

interface RecentRegistrationDisplay {
  id: string;
  event: string;
  date: string;
  status: string;
  ticketType?: string;
  bookingId: string;
}

const LOGGER_COMPONENT_NAME = 'AttendeeDashboard';

function AttendeeDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const logger = useLogger();

  // State for real data
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    registeredEvents: 0,
    upcomingEvents: 0,
    attendedEvents: 0,
    ticketsPurchased: 0,
    activeTickets: 0,
    usedTickets: 0,
    pointsEarned: 0,
    pointsThisMonth: 0,
    upcomingThisWeek: 0,
    nextWeekEvents: 0
  });
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEventDisplay[]>([]);
  const [recentRegistrations, setRecentRegistrations] = useState<RecentRegistrationDisplay[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Helper function to format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Helper function to format time
  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  // Helper function to check if event is upcoming
  const isUpcoming = (dateString: string): boolean => {
    return new Date(dateString) > new Date();
  };

  // Helper function to check if event is this week
  const isThisWeek = (dateString: string): boolean => {
    const eventDate = new Date(dateString);
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return eventDate >= now && eventDate <= weekFromNow;
  };

  // Helper function to check if event is next week
  const isNextWeek = (dateString: string): boolean => {
    const eventDate = new Date(dateString);
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    return eventDate >= weekFromNow && eventDate <= twoWeeksFromNow;
  };

  // Fetch all dashboard data
  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);
      logger.debug(LOGGER_COMPONENT_NAME, 'Fetching dashboard data', { userId: user.id });

      // Fetch bookings, tickets, and published events in parallel
      const [bookingsResponse, ticketsResponse, publishedEventsResponse] = await Promise.all([
        bookingAPI.getUserBookings(),
        ticketAPI.getUserTickets(),
        eventAPI.getPublishedEvents()
      ]);

      const bookings = bookingsResponse.success ? bookingsResponse.data.bookings : [];
      const tickets = ticketsResponse.success ? ticketsResponse.data : [];
      const publishedEvents = publishedEventsResponse.success ? publishedEventsResponse.data.events : [];

      logger.debug(LOGGER_COMPONENT_NAME, 'Data fetched', {
        bookings: bookings.length,
        tickets: tickets.length,
        events: publishedEvents.length
      });

      // Calculate stats
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const upcomingBookings = bookings.filter(booking => {
        const event = publishedEvents.find(e => e.id === booking.eventId);
        return event && isUpcoming(event.bookingStartDate);
      });

      const upcomingThisWeek = upcomingBookings.filter(booking => {
        const event = publishedEvents.find(e => e.id === booking.eventId);
        return event && isThisWeek(event.bookingStartDate);
      });

      const nextWeekBookings = upcomingBookings.filter(booking => {
        const event = publishedEvents.find(e => e.id === booking.eventId);
        return event && isNextWeek(event.bookingStartDate);
      });

      const activeTickets = tickets.filter(t => t.status === 'ISSUED');
      const usedTickets = tickets.filter(t => t.status === 'SCANNED');

      // Calculate points (simple calculation: 100 points per booking, 50 per ticket)
      const pointsEarned = (bookings.length * 100) + (tickets.length * 50);
      const bookingsThisMonth = bookings.filter(b => {
        const bookingDate = new Date(b.createdAt);
        return bookingDate.getMonth() === currentMonth && bookingDate.getFullYear() === currentYear;
      });
      const pointsThisMonth = (bookingsThisMonth.length * 100) + (bookingsThisMonth.length * 50);

      setStats({
        registeredEvents: bookings.length,
        upcomingEvents: upcomingBookings.length,
        attendedEvents: usedTickets.length,
        ticketsPurchased: tickets.length,
        activeTickets: activeTickets.length,
        usedTickets: usedTickets.length,
        pointsEarned,
        pointsThisMonth,
        upcomingThisWeek: upcomingThisWeek.length,
        nextWeekEvents: nextWeekBookings.length
      });

      // Build upcoming events display
      const upcomingEventsDisplay: UpcomingEventDisplay[] = upcomingBookings
        .slice(0, 3)
        .reduce<UpcomingEventDisplay[]>((acc, booking) => {
          const event = publishedEvents.find(e => e.id === booking.eventId);
          if (!event) return acc;

          acc.push({
            id: booking.id,
            eventId: event.id,
            title: event.name,
            date: formatDate(event.bookingStartDate),
            time: formatTime(event.bookingStartDate),
            location: event.venue.name,
            attendees: event.venue.capacity,
            status: 'registered' as const,
            ticketType: 'Standard' // Default, could be enhanced with ticket type from booking
          });
          return acc;
        }, []);

      setUpcomingEvents(upcomingEventsDisplay);

      // Build recent registrations display
      const recentBookings = bookings
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

      const recentRegistrationsDisplay: RecentRegistrationDisplay[] = recentBookings.map(booking => {
        const event = publishedEvents.find(e => e.id === booking.eventId);
        const ticket = tickets.find(t => t.bookingId === booking.id);

        return {
          id: booking.id,
          bookingId: booking.id,
          event: event?.name || 'Unknown Event',
          date: formatDate(booking.createdAt),
          status: booking.status.toLowerCase(),
          ticketType: ticket ? 'Standard' : undefined
        };
      });

      setRecentRegistrations(recentRegistrationsDisplay);

      logger.info(LOGGER_COMPONENT_NAME, 'Dashboard data loaded successfully');
    } catch (err) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to load dashboard data', err as Error);
      setError('Failed to load dashboard data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, [user, logger]);

  useEffect(() => {
    logger.debug(LOGGER_COMPONENT_NAME, 'Attendee dashboard loaded', { userRole: user?.role });
    if (user?.id) {
      fetchDashboardData();
    }
  }, [user, logger, fetchDashboardData]);

  // Loading and auth checks are handled by the HOC

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                EventManager
              </h1>
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                Attendee Portal
              </Badge>
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
                  {user?.name}
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="text-slate-600 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Welcome Back! 👋
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Discover amazing events and manage your registrations.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Registered Events
              </CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-slate-500">Loading...</span>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.registeredEvents}</div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {stats.upcomingEvents} upcoming
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                My Tickets
              </CardTitle>
              <Ticket className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-slate-500">Loading...</span>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.ticketsPurchased}</div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {stats.activeTickets} active
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Points Earned
              </CardTitle>
              <Award className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-slate-500">Loading...</span>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.pointsEarned}</div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {stats.pointsThisMonth} this month
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Upcoming Events
              </CardTitle>
              <Clock className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-slate-500">Loading...</span>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.upcomingThisWeek}</div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {stats.nextWeekEvents} next week
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Quick Actions Card */}
          <Card className="border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white">
                Quick Actions
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Explore and manage your events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  className="h-20 flex flex-col items-center justify-center space-y-2 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                  onClick={() => router.push('/dashboard/attendee/events')}
                >
                  <Search className="h-5 w-5" />
                  <span className="text-sm">Browse Events</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2 border-slate-200 dark:border-slate-700"
                  onClick={() => router.push('/dashboard/attendee/tickets')}
                >
                  <Ticket className="h-5 w-5" />
                  <span className="text-sm">My Tickets</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2 border-slate-200 dark:border-slate-700"
                  onClick={() => router.push('/dashboard/attendee/schedule')}
                >
                  <Calendar className="h-5 w-5" />
                  <span className="text-sm">My Schedule</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2 border-slate-200 dark:border-slate-700"
                  onClick={() => router.push('/dashboard/attendee/profile')}
                >
                  <Settings className="h-5 w-5" />
                  <span className="text-sm">Update Profile</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Events Card */}
          <Card className="border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white">
                Upcoming Events
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Your next event experiences
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : upcomingEvents.length === 0 ? (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No upcoming events</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingEvents.map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-900 dark:text-white">{event.title}</h4>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {event.date} at {event.time}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {event.location}
                          </span>
                        </div>
                        {event.ticketType && (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {event.ticketType}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant={event.status === 'registered' ? 'default' : 'secondary'}
                          className={event.status === 'registered' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}
                        >
                          {event.status}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/dashboard/attendee/events`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Registrations */}
        <Card className="border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white">
              Recent Registrations
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              Your latest event registrations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : recentRegistrations.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                <Ticket className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent registrations</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentRegistrations.map((registration) => (
                  <div key={registration.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-900 dark:text-white">{registration.event}</h4>
                      <div className="flex items-center space-x-4 mt-1">
                        {registration.ticketType && (
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            {registration.ticketType}
                          </span>
                        )}
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Registered on {registration.date}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant="default"
                        className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      >
                        {registration.status}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/dashboard/attendee/tickets`)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default withUserAuth(AttendeeDashboard);
