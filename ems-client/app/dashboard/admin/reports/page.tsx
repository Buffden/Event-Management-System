'use client';

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BarChart3, TrendingUp, Users, Calendar, Download, Filter } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {logger} from "@/lib/logger";
import { adminApiClient } from "@/lib/api/admin.api";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useTheme } from 'next-themes';

const COMPONENT_NAME = 'ReportsPage';

// Custom tooltip component that supports dark mode
const CustomTooltip = ({ active, payload, label }: any) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (active && payload && payload.length) {
    return (
      <div
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3"
        style={{
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          borderColor: isDark ? '#334155' : '#e2e8f0',
        }}
      >
        <p className="font-semibold text-slate-900 dark:text-white mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {`${entry.name}: ${entry.value.toLocaleString()}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

interface ReportData {
  totalEvents: number;
  totalUsers: number;
  totalRegistrations: number;
  averageAttendance: number;
  topEvents: Array<{
    eventId: string;
    name?: string;
    registrations: number;
    attendance: number;
  }>;
  eventStats: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  userGrowth: Array<{
    month: string;
    users: number;
    newUsers: number;
  }>;
}

export default function ReportsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isDark = theme === 'dark';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    } else if (!isLoading && user?.role !== 'ADMIN') {
      router.push('/dashboard');
    } else if (isAuthenticated && user?.role === 'ADMIN') {
      loadReportsData();
    }
  }, [isAuthenticated, isLoading, user, router]);

  const loadReportsData = async () => {
    try {
      setLoading(true);
      setError(null);
      logger.info(COMPONENT_NAME, 'Loading reports data');
      const data = await adminApiClient.getReportsData();
      setReportData(data);
      logger.info(COMPONENT_NAME, 'Reports data loaded successfully');
    } catch (err) {
      logger.error(COMPONENT_NAME, 'Failed to load reports data', err as Error);
      setError('Failed to load reports data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = (type: string) => {
    // TODO: Implement report export functionality
    logger.debug(COMPONENT_NAME, `Exporting ${type} report`);
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-700 dark:text-slate-300 font-medium">Loading reports...</p>
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
          <Button onClick={loadReportsData}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return null;
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
                onClick={() => router.push('/dashboard/admin')}
                className="text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Reports & Analytics
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
            Reports & Analytics
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Overview of platform performance, user engagement, and event statistics.
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Events</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{reportData.totalEvents}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Users</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{reportData.totalUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Registrations</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{reportData.totalRegistrations}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Avg. Attendance</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{reportData.averageAttendance.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Report Actions */}
        <Card className="border-slate-200 dark:border-slate-700 mb-8">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
              Generate Reports
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              Export detailed reports for analysis and record-keeping
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center space-y-2"
                onClick={() => handleExportReport('events')}
              >
                <Calendar className="h-6 w-6" />
                <span>Event Report</span>
              </Button>

              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center space-y-2"
                onClick={() => handleExportReport('users')}
              >
                <Users className="h-6 w-6" />
                <span>User Report</span>
              </Button>

              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center space-y-2"
                onClick={() => handleExportReport('registrations')}
              >
                <BarChart3 className="h-6 w-6" />
                <span>Registration Report</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Events */}
          <Card className="border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                Top Performing Events
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Events with highest registration and attendance rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reportData.topEvents.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-600 dark:text-slate-400">No events with registrations yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reportData.topEvents.map((event, index) => (
                    <div key={event.eventId} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-900 dark:text-white">{event.name || `Event ${event.eventId.substring(0, 8)}`}</h4>
                        <div className="flex items-center space-x-4 text-sm text-slate-600 dark:text-slate-400">
                          <span>{event.registrations} registrations</span>
                          <span>{event.attendance}% attendance</span>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        #{index + 1}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Event Status Distribution */}
          <Card className="border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                Event Status Distribution
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Breakdown of events by status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reportData.eventStats.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-600 dark:text-slate-400">No events found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reportData.eventStats.map((stat, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{stat.status}</span>
                        <span className="text-sm text-slate-900 dark:text-white">{stat.count} events</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${stat.percentage.toFixed(1)}%` }}
                        ></div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-600 dark:text-slate-400">{stat.percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* User Growth Charts */}
        <div className="mt-8 space-y-8">
          {/* Monthly New User Signups - Bar Chart */}
          <Card className="border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                Monthly New User Signups
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Number of new users registered each month
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reportData.userGrowth.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-600 dark:text-slate-400">No user growth data available</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={reportData.userGrowth} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-300 dark:stroke-slate-700" />
                    <XAxis
                      dataKey="month"
                      className="text-xs fill-slate-600 dark:fill-slate-400"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis className="text-xs fill-slate-600 dark:fill-slate-400" />
                    <Tooltip content={<CustomTooltip />} />
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
            </CardContent>
          </Card>

          {/* Total Users Over Time - Line Chart */}
          <Card className="border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                Total Users Over Time
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Cumulative total of registered users by month
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reportData.userGrowth.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-600 dark:text-slate-400">No user growth data available</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={reportData.userGrowth} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-300 dark:stroke-slate-700" />
                    <XAxis
                      dataKey="month"
                      className="text-xs fill-slate-600 dark:fill-slate-400"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis className="text-xs fill-slate-600 dark:fill-slate-400" />
                    <Tooltip content={<CustomTooltip />} />
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
            </CardContent>
          </Card>

          {/* User Growth Trend - Area Chart */}
          <Card className="border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                User Growth Trend
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Combined view of new signups and total users over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reportData.userGrowth.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-600 dark:text-slate-400">No user growth data available</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={reportData.userGrowth} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorNewUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorTotalUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
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
                    <Tooltip content={<CustomTooltip />} />
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
            </CardContent>
          </Card>

          {/* User Growth Data Table */}
          <Card className="border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                Monthly User Growth Data
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Detailed breakdown of user registrations by month
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                    {reportData.userGrowth.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-600 dark:text-slate-400">
                          No user growth data available
                        </td>
                      </tr>
                    ) : (
                      reportData.userGrowth.map((data, index) => {
                        const previousMonth = index > 0 ? reportData.userGrowth[index - 1] : null;
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
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
