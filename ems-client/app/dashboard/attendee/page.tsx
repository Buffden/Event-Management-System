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
  Users
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {useLogger} from "@/lib/logger/LoggerProvider";
import {withUserAuth} from "@/components/hoc/withAuth";
import { bookingAPI, ticketAPI } from "@/lib/api/booking.api";
import { eventAPI } from "@/lib/api/event.api";

const LOGGER_COMPONENT_NAME = 'AttendeeDashboard';

interface DashboardStats {
  registeredEvents: number;
  upcomingEvents: number;
  attendedEvents: number;
  ticketsPurchased: number;
  activeTickets: number;
  usedTickets: number;
  upcomingThisWeek: number;
  nextWeekEvents: number;
}

interface UpcomingEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  status: string;
  ticketType: string | null;
}

interface RecentRegistration {
  id: string;
  event: string;
  date: string;
  status: string;
  ticketType: string | null;
}

function AttendeeDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const logger = useLogger();
  
  const [stats, setStats] = useState<DashboardStats>({
    registeredEvents: 0,
    upcomingEvents: 0,
    attendedEvents: 0,
    ticketsPurchased: 0,
    activeTickets: 0,
    usedTickets: 0,
    upcomingThisWeek: 0,
    nextWeekEvents: 0
  });
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [recentRegistrations, setRecentRegistrations] = useState<RecentRegistration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    logger.debug(LOGGER_COMPONENT_NAME, 'Attendee dashboard loaded', { userRole: user?.role });
    if (user?.id) {
      loadDashboardData();
    }
  }, [user, logger]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      logger.info(LOGGER_COMPONENT_NAME, 'Loading attendee dashboard data');

      // Fetch bookings and tickets in parallel
      const [bookingsResponse, ticketsResponse] = await Promise.all([
        bookingAPI.getUserBookings(),
        ticketAPI.getUserTickets().catch(() => ({ data: [], success: true }))
      ]);

      // Handle both response structures: {success, data: {bookings}} or {bookings}
      const bookings = (bookingsResponse as any).data?.bookings || (bookingsResponse as any).bookings || [];
      const tickets = ticketsResponse.data || [];

      // Calculate stats
      const now = new Date();
      const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

      const confirmedBookings = bookings.filter((b: any) => b.status === 'CONFIRMED');
      const attendedCount = bookings.filter((b: any) => b.isAttended === true).length;
      
      const upcomingBookings = confirmedBookings.filter((b: any) => {
        if (!b.event?.bookingStartDate) return false;
        const eventStart = new Date(b.event.bookingStartDate);
        return eventStart > now;
      });

      const thisWeekBookings = upcomingBookings.filter((b: any) => {
        if (!b.event?.bookingStartDate) return false;
        const eventStart = new Date(b.event.bookingStartDate);
        return eventStart <= oneWeekFromNow;
      });

      const nextWeekBookings = upcomingBookings.filter((b: any) => {
        if (!b.event?.bookingStartDate) return false;
        const eventStart = new Date(b.event.bookingStartDate);
        return eventStart > oneWeekFromNow && eventStart <= twoWeeksFromNow;
      });

      const activeTickets = tickets.filter(t => t.status === 'ISSUED' && new Date(t.expiresAt) > now).length;
      const usedTickets = tickets.filter(t => t.status === 'SCANNED').length;

      setStats({
        registeredEvents: confirmedBookings.length,
        upcomingEvents: upcomingBookings.length,
        attendedEvents: attendedCount,
        ticketsPurchased: tickets.length,
        activeTickets,
        usedTickets,
        upcomingThisWeek: thisWeekBookings.length,
        nextWeekEvents: nextWeekBookings.length
      });

      // Fetch upcoming events with event details
      // For events without full details, fetch them separately
      const upcomingEventsData: UpcomingEvent[] = [];
      for (const booking of upcomingBookings.slice(0, 3)) {
        if (booking.event?.name) {
          const eventStart = new Date(booking.event.bookingStartDate);
          upcomingEventsData.push({
            id: booking.event.id || booking.id,
            title: booking.event.name,
            date: eventStart.toLocaleDateString(),
            time: eventStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            location: booking.event.venue?.name || 'TBA',
            status: 'registered',
            ticketType: booking.ticketType || null
          });
        } else {
          // If event details not included, fetch them
          try {
            const eventResponse = await eventAPI.getEventById(booking.eventId);
            if (eventResponse.data) {
              const eventStart = new Date(eventResponse.data.bookingStartDate);
              upcomingEventsData.push({
                id: eventResponse.data.id,
                title: eventResponse.data.name,
                date: eventStart.toLocaleDateString(),
                time: eventStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                location: eventResponse.data.venue?.name || 'TBA',
                status: 'registered',
                ticketType: booking.ticketType || null
              });
            }
          } catch (err) {
            logger.warn(LOGGER_COMPONENT_NAME, 'Failed to fetch event details', { eventId: booking.eventId });
          }
        }
      }
      setUpcomingEvents(upcomingEventsData);

      // Fetch recent registrations (last 5 bookings, ordered by date)
      const recentBookings = bookings
        .filter((b: any) => b.status === 'CONFIRMED')
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

      const recentRegistrationsData: RecentRegistration[] = recentBookings.map((booking: any) => ({
        id: booking.id,
        event: booking.event?.name || 'Unknown Event',
        date: new Date(booking.createdAt).toLocaleDateString(),
        status: booking.status.toLowerCase(),
        ticketType: booking.ticketType || null
      }));
      setRecentRegistrations(recentRegistrationsData);

      logger.info(LOGGER_COMPONENT_NAME, 'Dashboard data loaded successfully', {
        stats,
        upcomingEventsCount: upcomingEventsData.length,
        recentRegistrationsCount: recentRegistrationsData.length
      });
    } catch (err) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to load dashboard data', err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  };

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
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {loading ? '...' : stats.registeredEvents}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {loading ? '...' : `${stats.upcomingEvents} upcoming`}
              </p>
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
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {loading ? '...' : stats.ticketsPurchased}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {loading ? '...' : `${stats.activeTickets} active`}
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Attended Events
              </CardTitle>
              <Award className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {loading ? '...' : stats.attendedEvents}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {loading ? '...' : `${stats.usedTickets} tickets used`}
              </p>
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
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {loading ? '...' : stats.upcomingThisWeek}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {loading ? '...' : `${stats.nextWeekEvents} next week`}
              </p>
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
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  Loading upcoming events...
                </div>
              ) : upcomingEvents.length === 0 ? (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  No upcoming events
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
                          onClick={() => router.push(`/dashboard/attendee/events/${event.id}`)}
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
            {loading ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                Loading recent registrations...
              </div>
            ) : recentRegistrations.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                No recent registrations
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
