'use client';

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { logger } from "@/lib/logger";
import { adminApiClient } from "@/lib/api/admin.api";
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ChartCard } from "@/components/reports/ChartCard";
import { ChartTooltip } from "@/components/reports/ChartTooltip";
import { EmptyChartState } from "@/components/reports/EmptyChartState";

const COMPONENT_NAME = 'UserReportPage';

interface UserGrowthData {
  month: string;
  users: number;
  newUsers: number;
}

interface UserRoleData {
  role: string;
  count: number;
}

export default function UserReportPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [userGrowth, setUserGrowth] = useState<UserGrowthData[]>([]);
  const [userRoles, setUserRoles] = useState<UserRoleData[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    } else if (!isLoading && user?.role !== 'ADMIN') {
      router.push('/dashboard');
    } else if (isAuthenticated && user?.role === 'ADMIN') {
      loadUserReportData();
    }
  }, [isAuthenticated, isLoading, user, router]);

  const loadUserReportData = async () => {
    try {
      setLoading(true);
      setError(null);
      logger.info(COMPONENT_NAME, 'Loading user report data');

      // Fetch user growth data
      const userGrowthResponse = await fetch('/api/auth/admin/reports/user-growth', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (userGrowthResponse.ok) {
        const userGrowthData = await userGrowthResponse.json();
        setUserGrowth(userGrowthData.data || []);
      }

      // Fetch user statistics
      const statsResponse = await adminApiClient.getDashboardStats();
      setTotalUsers(statsResponse.totalUsers);

      // Fetch users by role
      const usersResponse = await adminApiClient.getAllUsers({ limit: 10000 });
      const roleCounts: Record<string, number> = {};
      usersResponse.data.forEach((u) => {
        roleCounts[u.role] = (roleCounts[u.role] || 0) + 1;
      });
      setUserRoles(
        Object.entries(roleCounts).map(([role, count]) => ({ role, count }))
      );

      logger.info(COMPONENT_NAME, 'User report data loaded successfully');
    } catch (err) {
      logger.error(COMPONENT_NAME, 'Failed to load user report data', err as Error);
      setError('Failed to load user report data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-700 dark:text-slate-300 font-medium">Loading user report...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'ADMIN') {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <Button onClick={loadUserReportData}>Retry</Button>
        </div>
      </div>
    );
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

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
                onClick={() => router.push('/dashboard/admin/reports')}
                className="text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Reports
              </Button>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                User Report
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            User Analytics Report
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Comprehensive analysis of user growth, distribution, and engagement
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Total Users</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{totalUsers.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">New Users This Month</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              {userGrowth.length > 0 ? userGrowth[userGrowth.length - 1]?.newUsers || 0 : 0}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">User Roles</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{userRoles.length}</p>
          </div>
        </div>

        {/* Charts */}
        <div className="space-y-8">
          {/* Monthly New User Signups - Bar Chart */}
          <ChartCard
            title="Monthly New User Signups"
            description="Number of new users registered each month"
          >
            {userGrowth.length === 0 ? (
              <EmptyChartState message="No user growth data available" />
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={userGrowth} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-300 dark:stroke-slate-700" />
                  <XAxis
                    dataKey="month"
                    className="text-xs fill-slate-600 dark:fill-slate-400"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis className="text-xs fill-slate-600 dark:fill-slate-400" />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend />
                  <Bar
                    dataKey="newUsers"
                    fill="#3b82f6"
                    name="New Users"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Total Users Over Time - Line Chart */}
          <ChartCard
            title="Total Users Over Time"
            description="Cumulative total of registered users by month"
          >
            {userGrowth.length === 0 ? (
              <EmptyChartState message="No user growth data available" />
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={userGrowth} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-300 dark:stroke-slate-700" />
                  <XAxis
                    dataKey="month"
                    className="text-xs fill-slate-600 dark:fill-slate-400"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis className="text-xs fill-slate-600 dark:fill-slate-400" />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="users"
                    stroke="#10b981"
                    strokeWidth={3}
                    name="Total Users"
                    dot={{ fill: '#10b981', r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* User Growth Trend - Area Chart */}
          <ChartCard
            title="User Growth Trend"
            description="Combined view of new signups and total users over time"
          >
            {userGrowth.length === 0 ? (
              <EmptyChartState message="No user growth data available" />
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={userGrowth} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorNewUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="colorTotalUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-300 dark:stroke-slate-700" />
                  <XAxis
                    dataKey="month"
                    className="text-xs fill-slate-600 dark:fill-slate-400"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis yAxisId="left" className="text-xs fill-slate-600 dark:fill-slate-400" />
                  <YAxis yAxisId="right" orientation="right" className="text-xs fill-slate-600 dark:fill-slate-400" />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="newUsers"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#colorNewUsers)"
                    name="New Users"
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="users"
                    stroke="#10b981"
                    fillOpacity={1}
                    fill="url(#colorTotalUsers)"
                    name="Total Users"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* User Role Distribution - Pie Chart */}
          <ChartCard
            title="User Role Distribution"
            description="Breakdown of users by role"
          >
            {userRoles.length === 0 ? (
              <EmptyChartState message="No user role data available" />
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={userRoles.map(role => ({ name: role.role, value: role.count }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {userRoles.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* User Growth Data Table */}
          <ChartCard
            title="Monthly User Growth Data"
            description="Detailed breakdown of user registrations by month"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-2 px-4 font-medium text-slate-600 dark:text-slate-400">Month</th>
                    <th className="text-right py-2 px-4 font-medium text-slate-600 dark:text-slate-400">New Users</th>
                    <th className="text-right py-2 px-4 font-medium text-slate-600 dark:text-slate-400">Total Users</th>
                    <th className="text-right py-2 px-4 font-medium text-slate-600 dark:text-slate-400">Growth Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {userGrowth.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-600 dark:text-slate-400">
                        No user growth data available
                      </td>
                    </tr>
                  ) : (
                    userGrowth.map((data, index) => {
                      const previousMonth = index > 0 ? userGrowth[index - 1] : null;
                      const growthRate = previousMonth && previousMonth.newUsers > 0
                        ? ((data.newUsers - previousMonth.newUsers) / previousMonth.newUsers * 100).toFixed(1)
                        : data.newUsers > 0 ? '100.0' : '0.0';
                      const isPositive = parseFloat(growthRate) >= 0;

                      return (
                        <tr key={index} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-3 px-4 text-slate-900 dark:text-white font-medium">{data.month}</td>
                          <td className="py-3 px-4 text-right">
                            <Badge
                              variant="default"
                              className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            >
                              +{data.newUsers}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right text-slate-900 dark:text-white font-semibold">{data.users.toLocaleString()}</td>
                          <td className="py-3 px-4 text-right">
                            <span className={`font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {isPositive ? '+' : ''}{growthRate}%
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </div>
      </main>
    </div>
  );
}

