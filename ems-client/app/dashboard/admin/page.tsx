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
  Clock
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {useLogger} from "@/lib/logger/LoggerProvider";
import {withAdminAuth} from "@/components/hoc/withAuth";
import { adminApiClient } from "@/lib/api/admin.api";

// Dashboard stats interface
interface DashboardStats {
  totalUsers: number;
  totalEvents: number;
  activeEvents: number;
  totalRegistrations: number;
  upcomingEvents: number;
}

const mockRecentEvents = [
  {
    id: '1',
    title: 'Tech Conference 2024',
    status: 'published',
    registrations: 45,
    capacity: 100,
    startDate: '2024-02-15',
    endDate: '2024-02-17'
  },
  {
    id: '2',
    title: 'Design Workshop',
    status: 'draft',
    registrations: 12,
    capacity: 50,
    startDate: '2024-02-20',
    endDate: '2024-02-21'
  },
  {
    id: '3',
    title: 'AI Summit',
    status: 'published',
    registrations: 89,
    capacity: 150,
    startDate: '2024-03-01',
    endDate: '2024-03-03'
  }
];

const LOGGER_COMPONENT_NAME = 'AdminDashboard';

function AdminDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const logger = useLogger();
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      logger.debug(LOGGER_COMPONENT_NAME, 'Loading dashboard stats');
      
      const dashboardStats = await adminApiClient.getDashboardStats();
      setStats(dashboardStats);
      
      logger.info(LOGGER_COMPONENT_NAME, 'Dashboard stats loaded successfully', dashboardStats);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard stats';
      setError(errorMessage);
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to load dashboard stats', err as Error);
      
      // Set default values on error so UI doesn't break
      setStats({
        totalUsers: 0,
        totalEvents: 0,
        activeEvents: 0,
        totalRegistrations: 0,
        upcomingEvents: 0
      });
    } finally {
      setLoading(false);
    }
  }, [logger]);

  useEffect(() => {
    logger.debug(LOGGER_COMPONENT_NAME, 'Admin dashboard loaded', { userRole: user?.role });
    loadDashboardStats();
  }, [user, logger, loadDashboardStats]);

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

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200 text-sm">
              {error}
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadDashboardStats}
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        )}

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
              {loading ? (
                <div className="animate-pulse">
                  <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
                  <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.totalUsers ?? 0}</div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Active users
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
              {loading ? (
                <div className="animate-pulse">
                  <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
                  <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.totalEvents ?? 0}</div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {stats?.activeEvents ?? 0} active
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
              {loading ? (
                <div className="animate-pulse">
                  <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
                  <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.totalRegistrations ?? 0}</div>
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
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse">
                  <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
                  <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.upcomingEvents ?? 0}</div>
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
              <div className="space-y-4">
                {mockRecentEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-900 dark:text-white">{event.title}</h4>
                      <div className="flex items-center space-x-4 text-sm text-slate-600 dark:text-slate-400">
                        <span>{event.registrations}/{event.capacity} registrations</span>
                        <Badge
                          variant={event.status === 'published' ? 'default' : 'secondary'}
                          className={event.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}
                        >
                          {event.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default withAdminAuth(AdminDashboard);
