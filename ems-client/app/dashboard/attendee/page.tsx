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
import { useEffect } from "react";
import {useLogger} from "@/lib/logger/LoggerProvider";
import {withUserAuth} from "@/components/hoc/withAuth";

// Mock data for development
const mockStats = {
  registeredEvents: 8,
  upcomingEvents: 3,
  attendedEvents: 5,
  ticketsPurchased: 12,
  activeTickets: 4,
  usedTickets: 8,
  pointsEarned: 1250,
  pointsThisMonth: 300,
  upcomingThisWeek: 2,
  nextWeekEvents: 1
};

const mockUpcomingEvents = [
  {
    id: '1',
    title: 'TechConf 2024',
    date: '2024-01-15',
    time: '9:00 AM',
    location: 'Convention Center',
    attendees: 500,
    status: 'registered',
    ticketType: 'VIP Pass'
  },
  {
    id: '2',
    title: 'React Workshop',
    date: '2024-01-18',
    time: '2:00 PM',
    location: 'Tech Hub',
    attendees: 50,
    status: 'registered',
    ticketType: 'Standard'
  },
  {
    id: '3',
    title: 'Design Thinking Summit',
    date: '2024-01-22',
    time: '10:00 AM',
    location: 'Innovation Lab',
    attendees: 200,
    status: 'interested',
    ticketType: null
  }
];

const mockRecentRegistrations = [
  {
    id: '1',
    event: 'DevSummit 2024',
    date: '2024-01-10',
    status: 'confirmed',
    ticketType: 'Early Bird'
  },
  {
    id: '2',
    event: 'UX Conference',
    date: '2024-01-08',
    status: 'confirmed',
    ticketType: 'Standard'
  }
];

const LOGGER_COMPONENT_NAME = 'AttendeeDashboard';

function AttendeeDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const logger = useLogger();

  useEffect(() => {
    logger.debug(LOGGER_COMPONENT_NAME, 'Attendee dashboard loaded', { userRole: user?.role });
  }, [user, logger]);

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
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{mockStats.registeredEvents}</div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {mockStats.upcomingEvents} upcoming
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
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{mockStats.ticketsPurchased}</div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {mockStats.activeTickets} active
              </p>
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
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{mockStats.pointsEarned}</div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {mockStats.pointsThisMonth} this month
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
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{mockStats.upcomingThisWeek}</div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {mockStats.nextWeekEvents} next week
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
                  onClick={() => router.push('/events')}
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
              <div className="space-y-4">
                {mockUpcomingEvents.map((event) => (
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
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
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
              {mockRecentRegistrations.map((registration) => (
                <div key={registration.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-900 dark:text-white">{registration.event}</h4>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {registration.ticketType}
                      </span>
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
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default withUserAuth(AttendeeDashboard);
