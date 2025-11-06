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
  UserCheck,
  BarChart3,
  Plus,
  Eye,
  Ticket,
  MessageSquare
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {useLogger} from "@/lib/logger/LoggerProvider";
import {withAdminAuth} from "@/components/hoc/withAuth";
import { adminApiClient, DashboardStats } from "@/lib/api/admin.api";

const LOGGER_COMPONENT_NAME = 'AdminDashboard';

function AdminDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const logger = useLogger();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    logger.debug(LOGGER_COMPONENT_NAME, 'Admin dashboard loaded', { userRole: user?.role });
    loadDashboardStats();
  }, [user, logger]);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);
      logger.info(LOGGER_COMPONENT_NAME, 'Loading dashboard statistics');
      const dashboardStats = await adminApiClient.getDashboardStats();
      setStats(dashboardStats);
      logger.info(LOGGER_COMPONENT_NAME, 'Dashboard statistics loaded successfully', dashboardStats);
    } catch (err) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to load dashboard statistics', err as Error);
      setError('Failed to load dashboard statistics. Please try again later.');
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
              {loading ? (
                <div className="text-2xl font-bold text-slate-900 dark:text-white">...</div>
              ) : error ? (
                <div className="text-sm text-red-600 dark:text-red-400">Error</div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {stats?.totalUsers ?? 0}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Total registered
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
                <div className="text-2xl font-bold text-slate-900 dark:text-white">...</div>
              ) : error ? (
                <div className="text-sm text-red-600 dark:text-red-400">Error</div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {stats?.totalEvents ?? 0}
                  </div>
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
                <div className="text-2xl font-bold text-slate-900 dark:text-white">...</div>
              ) : error ? (
                <div className="text-sm text-red-600 dark:text-red-400">Error</div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {stats?.totalRegistrations ?? 0}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Across all events
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

                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2 border-slate-200 dark:border-slate-700"
                  onClick={() => router.push('/dashboard/admin/messages')}
                >
                  <MessageSquare className="h-5 w-5" />
                  <span className="text-sm">Messages</span>
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
              <div className="p-4 text-center">
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  View all events to see the latest updates
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push('/dashboard/admin/events')}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View All Events
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

      </main>
    </div>
  );
}

export default withAdminAuth(AdminDashboard);
