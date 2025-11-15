'use client';

import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Ticket,
  Clock,
  Search,
  Settings,
  Award
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLogger } from "@/lib/logger/LoggerProvider";
import { withUserAuth } from "@/components/hoc/withAuth";
import { attendeeDashboardAPI } from "@/lib/api/booking.api";
import { DashboardHeader } from "@/components/attendee/DashboardHeader";
import { LoadingSpinner } from "@/components/attendee/LoadingSpinner";
import { ErrorMessage } from "@/components/attendee/ErrorMessage";
import { StatsCard } from "@/components/attendee/StatsCard";
import { QuickActionButton } from "@/components/attendee/QuickActionButton";
import { UpcomingEventItem } from "@/components/attendee/UpcomingEventItem";
import { RecentRegistrationItem } from "@/components/attendee/RecentRegistrationItem";

const LOGGER_COMPONENT_NAME = 'AttendeeDashboard';

function AttendeeDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const logger = useLogger();

  const [stats, setStats] = useState({
    registeredEvents: 0,
    upcomingEvents: 0,
    attendedEvents: 0,
    ticketsPurchased: 0,
    activeTickets: 0,
    usedTickets: 0,
    upcomingThisWeek: 0,
    nextWeekEvents: 0
  });
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [recentRegistrations, setRecentRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    logger.debug(LOGGER_COMPONENT_NAME, 'Attendee dashboard loaded', { userRole: user?.role });
    loadDashboardData();
  }, [user, logger]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsData, upcomingData, recentData] = await Promise.all([
        attendeeDashboardAPI.getDashboardStats(),
        attendeeDashboardAPI.getUpcomingEvents(5),
        attendeeDashboardAPI.getRecentRegistrations(5)
      ]);

      setStats(statsData);
      setUpcomingEvents(upcomingData);
      setRecentRegistrations(recentData);
    } catch (err: any) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to load dashboard data', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Loading and auth checks are handled by the HOC

  if (loading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              Error Loading Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 dark:text-slate-400 mb-4">{error}</p>
            <Button onClick={loadDashboardData}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <DashboardHeader user={user} onLogout={logout} />

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
          <StatsCard
            title="Registered Events"
            value={stats.registeredEvents}
            subtitle={`${stats.upcomingEvents} upcoming`}
            icon={Calendar}
            iconColor="text-blue-600"
          />
          <StatsCard
            title="My Tickets"
            value={stats.ticketsPurchased}
            subtitle={`${stats.activeTickets} active`}
            icon={Ticket}
            iconColor="text-green-600"
          />
          <StatsCard
            title="Attended Events"
            value={stats.attendedEvents}
            subtitle={`${stats.usedTickets} tickets used`}
            icon={Award}
            iconColor="text-yellow-600"
          />
          <StatsCard
            title="Upcoming Events"
            value={stats.upcomingThisWeek}
            subtitle={`${stats.nextWeekEvents} next week`}
            icon={Clock}
            iconColor="text-purple-600"
          />
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
                <QuickActionButton
                  icon={Search}
                  label="Browse Events"
                  onClick={() => router.push('/dashboard/attendee/events')}
                  variant="default"
                />
                <QuickActionButton
                  icon={Ticket}
                  label="My Tickets"
                  onClick={() => router.push('/dashboard/attendee/tickets')}
                />
                <QuickActionButton
                  icon={Calendar}
                  label="My Schedule"
                  onClick={() => router.push('/dashboard/attendee/schedule')}
                />
                <QuickActionButton
                  icon={Settings}
                  label="Update Profile"
                  onClick={() => router.push('/dashboard/attendee/profile')}
                />
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
              <div className="space-y-4">
                {upcomingEvents.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No upcoming events</p>
                ) : (
                  upcomingEvents.map((event) => (
                    <UpcomingEventItem
                      key={event.id}
                      event={event}
                      onView={(eventId) => router.push(`/dashboard/attendee/events/${eventId}`)}
                    />
                  ))
                )}
              </div>
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
            <div className="space-y-4">
              {recentRegistrations.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No recent registrations</p>
              ) : (
                recentRegistrations.map((registration) => (
                  <RecentRegistrationItem
                    key={registration.id}
                    registration={registration}
                  />
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default withUserAuth(AttendeeDashboard);
