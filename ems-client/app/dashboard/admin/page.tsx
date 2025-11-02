'use client';

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  LogOut,
  Users,
  Calendar,
  Settings,
  UserCheck,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Plus,
  Eye,
  Edit,
  Trash2,
  Ticket,
  Loader2
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {useLogger} from "@/lib/logger/LoggerProvider";
import {withAdminAuth} from "@/components/hoc/withAuth";
import { eventAPI } from "@/lib/api/event.api";
import { authAPI } from "@/lib/api/auth.api";
import { bookingAPI } from "@/lib/api/booking.api";
import { EventResponse, EventStatus } from "@/lib/api/types/event.types";

const LOGGER_COMPONENT_NAME = 'AdminDashboard';

// Interface for recent events display
interface RecentEvent {
  id: string;
  title: string;
  status: string;
  registrations?: number;
  capacity?: number;
  startDate: string;
  endDate: string;
}

// Interface for flagged users
interface FlaggedUser {
  id: string;
  name: string;
  email: string;
  reason: string;
  flaggedAt: string;
}

// Interface for dashboard stats
interface DashboardStats {
  totalUsers: number | null;
  totalEvents: number;
  activeEvents: number;
  flaggedUsers: number;
  totalRegistrations: number | null;
  upcomingEvents: number;
}

// TODO: Flagged users feature requires backend implementation
// This mock data should be replaced with an API call once the backend endpoint is available
// Expected endpoint: GET /api/admin/users/flagged
const mockFlaggedUsers: FlaggedUser[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    reason: 'Spam registrations',
    flaggedAt: '2024-01-15'
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    reason: 'Inappropriate behavior',
    flaggedAt: '2024-01-20'
  }
];

function AdminDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const logger = useLogger();
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [flaggedUsers] = useState<FlaggedUser[]>(mockFlaggedUsers); // TODO: Replace with API call
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: null,
    totalEvents: 0,
    activeEvents: 0,
    flaggedUsers: mockFlaggedUsers.length,
    totalRegistrations: null,
    upcomingEvents: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Fetch dashboard stats
  const fetchDashboardStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      logger.debug(LOGGER_COMPONENT_NAME, 'Fetching dashboard stats');

      // Fetch all events to get stats
      // Note: API limit is 100, so we fetch with max limit and use total from response
      const eventsResponse = await eventAPI.getAllEvents({
        limit: 100, // Max allowed limit
        page: 1
      });

      if (eventsResponse.success && eventsResponse.data) {
        const allEvents = eventsResponse.data.events;
        // Use total from API response, which represents total across all pages
        const totalEvents = eventsResponse.data.total || allEvents.length;
        const activeEvents = allEvents.filter(e => e.status === EventStatus.PUBLISHED).length;

        // Count upcoming events (events with bookingStartDate in the future)
        const now = new Date();
        const upcomingEvents = allEvents.filter(e => {
          const startDate = new Date(e.bookingStartDate);
          return startDate > now && e.status === EventStatus.PUBLISHED;
        }).length;

        console.log("Getting Total Registrations");

        // Total registrations: Get from booking service admin endpoint
        let totalRegistrations: number | null = null;
        try {
          const registrationsResponse = await bookingAPI.getTotalRegistrations();
          if (registrationsResponse.success && registrationsResponse.data) {
            totalRegistrations = registrationsResponse.data.totalRegistrations;
          }
        } catch (error) {
          logger.error(LOGGER_COMPONENT_NAME, 'Failed to fetch total registrations', error as Error);
          // Leave as null to show "N/A"
        }

        // Total users: Get from auth service admin endpoint
        let totalUsers: number | null = null;
        try {
          const usersResponse = await authAPI.getTotalUsers();
          if (usersResponse.success && usersResponse.data) {
            totalUsers = usersResponse.data.totalUsers;
          }
        } catch (error) {
          logger.error(LOGGER_COMPONENT_NAME, 'Failed to fetch total users', error as Error);
          // Leave as null to show "N/A"
        }

        setStats({
          totalUsers,
          totalEvents,
          activeEvents,
          flaggedUsers: mockFlaggedUsers.length,
          totalRegistrations,
          upcomingEvents
        });

        logger.info(LOGGER_COMPONENT_NAME, 'Dashboard stats fetched successfully', {
          totalUsers,
          totalEvents,
          activeEvents,
          upcomingEvents,
          totalRegistrations
        });
      }
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to fetch dashboard stats', error as Error);
    } finally {
      setStatsLoading(false);
    }
  }, [logger]);

  // Fetch recent events function
  const fetchRecentEvents = useCallback(async () => {
    try {
      setEventsLoading(true);
      setEventsError(null);
      logger.debug(LOGGER_COMPONENT_NAME, 'Fetching recent events');

      // Fetch all events, sorted by creation date (most recent first)
      // Limit to 3 most recent events for dashboard
      const response = await eventAPI.getAllEvents({
        limit: 3,
        page: 1
      });

      if (response.success && response.data) {
        // Sort by createdAt descending (most recent first) and take first 3
        const sortedEvents = [...response.data.events]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 3)
          .map((event: EventResponse): RecentEvent => ({
            id: event.id,
            title: event.name,
            status: event.status.toLowerCase(),
            capacity: event.venue?.capacity,
            startDate: event.bookingStartDate,
            endDate: event.bookingEndDate
          }));

        setRecentEvents(sortedEvents);
        logger.info(LOGGER_COMPONENT_NAME, 'Recent events fetched successfully', { count: sortedEvents.length });
      }
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to fetch recent events', error as Error);
      setEventsError('Failed to load recent events');
    } finally {
      setEventsLoading(false);
    }
  }, [logger]);

  useEffect(() => {
    logger.debug(LOGGER_COMPONENT_NAME, 'Admin dashboard loaded', { userRole: user?.role });
    fetchDashboardStats();
    fetchRecentEvents();
  }, [user, logger, fetchDashboardStats, fetchRecentEvents]);

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
              <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                Admin Panel
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
                Admin Dashboard 👑
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                Manage users, events, and system operations from here.
              </p>
            </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Total Users
              </CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
                  <span className="text-sm text-slate-600">Loading...</span>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {stats.totalUsers !== null ? stats.totalUsers : 'N/A'}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {stats.totalUsers !== null ? `${stats.flaggedUsers} flagged` : 'API endpoint needed'}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Total Events
              </CardTitle>
              <Calendar className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
                  <span className="text-sm text-slate-600">Loading...</span>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalEvents}</div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {stats.activeEvents} active
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Registrations
              </CardTitle>
              <UserCheck className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
                  <span className="text-sm text-slate-600">Loading...</span>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {stats.totalRegistrations !== null ? stats.totalRegistrations : 'N/A'}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Across all events
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
              <Calendar className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
                  <span className="text-sm text-slate-600">Loading...</span>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.upcomingEvents}</div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Scheduled soon
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
                Common administrative tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  className="h-20 flex flex-col items-center justify-center space-y-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  onClick={() => router.push('/dashboard/admin/events')}
                >
                  <Calendar className="h-5 w-5" />
                  <span className="text-sm">Manage Events</span>
                </Button>

                <Button
                  className="h-20 flex flex-col items-center justify-center space-y-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  onClick={() => router.push('/dashboard/admin/events/create')}
                >
                  <Plus className="h-5 w-5" />
                  <span className="text-sm">Create Event</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2 border-orange-200 bg-orange-50 hover:bg-orange-100 dark:border-orange-700 dark:bg-orange-900/20"
                  onClick={() => router.push('/dashboard/admin/events/pending')}
                >
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <span className="text-sm">Pending Approvals</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2 border-slate-200 dark:border-slate-700"
                  onClick={() => router.push('/dashboard/admin/users')}
                >
                  <Users className="h-5 w-5" />
                  <span className="text-sm">Manage Users</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2 border-slate-200 dark:border-slate-700"
                  onClick={() => router.push('/dashboard/admin/users/flagged')}
                >
                  <AlertTriangle className="h-5 w-5" />
                  <span className="text-sm">Review Flags</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2 border-slate-200 dark:border-slate-700"
                  onClick={() => router.push('/dashboard/admin/reports')}
                >
                  <BarChart3 className="h-5 w-5" />
                  <span className="text-sm">View Reports</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2 border-slate-200 dark:border-slate-700"
                  onClick={() => router.push('/dashboard/admin/tickets')}
                >
                  <Ticket className="h-5 w-5" />
                  <span className="text-sm">Manage Tickets</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Events Card */}
          <Card className="border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white">
                Recent Events
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Latest events requiring attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">Loading events...</span>
                </div>
              ) : eventsError ? (
                <div className="text-center py-8">
                  <p className="text-sm text-red-600 dark:text-red-400">{eventsError}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => {
                      setEventsError(null);
                      setEventsLoading(true);
                      fetchRecentEvents();
                    }}
                  >
                    Retry
                  </Button>
                </div>
              ) : recentEvents.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-slate-600 dark:text-slate-400">No recent events found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentEvents.map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-900 dark:text-white">{event.title}</h4>
                        <div className="flex items-center space-x-4 text-sm text-slate-600 dark:text-slate-400 mt-1">
                          {event.capacity && (
                            <span>Capacity: {event.capacity}</span>
                          )}
                          <Badge
                            variant={event.status === 'published' ? 'default' : 'secondary'}
                            className={
                              event.status === 'published'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : event.status === 'pending_approval'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                            }
                          >
                            {event.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                          {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/dashboard/admin/events/${event.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/dashboard/admin/events/modify/${event.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Flagged Users Alert */}
        {/* TODO: Replace with real API call once backend endpoint is available */}
        {flaggedUsers.length > 0 && (
          <Card className="border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-orange-900 dark:text-orange-100 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Flagged Users Requiring Review
              </CardTitle>
              <CardDescription className="text-orange-700 dark:text-orange-300">
                {/* Note: Currently using mock data. Backend API endpoint needed. */}
                {flaggedUsers.length} user{flaggedUsers.length !== 1 ? 's' : ''} flagged
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {flaggedUsers.map((flaggedUser) => (
                  <div key={flaggedUser.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-orange-200 dark:border-orange-700">
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-white">{flaggedUser.name}</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{flaggedUser.email}</p>
                      <p className="text-sm text-orange-600 dark:text-orange-400">Reason: {flaggedUser.reason}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                        Flagged: {new Date(flaggedUser.flaggedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/dashboard/admin/users/flagged`)}
                      >
                        Review
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          // TODO: Implement delete/remove flag functionality
                          logger.debug(LOGGER_COMPONENT_NAME, 'Remove flag clicked', { userId: flaggedUser.id });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

export default withAdminAuth(AdminDashboard);
