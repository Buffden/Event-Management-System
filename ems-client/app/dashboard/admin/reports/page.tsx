'use client';

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BarChart3, TrendingUp, Users, Calendar, Download, Filter, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {logger} from "@/lib/logger";
import { eventAPI } from "@/lib/api/event.api";
import { bookingAPI } from "@/lib/api/booking.api";
import { authAPI } from "@/lib/api/auth.api";

const COMPONENT_NAME = 'ReportsPage';

interface ReportData {
  totalEvents: number;
  totalUsers: number;
  totalRegistrations: number;
  averageAttendance: number;
  topEvents: Array<{ eventId: string; name: string; registrations: number; attendance: number }>;
  userGrowth: Array<{ month: string; users: number }>;
  eventStats: Array<{ status: string; count: number; percentage: number }>;
}

export default function ReportsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    } else if (!isLoading && user?.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, user, router]);

  const fetchReportData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all analytics data in parallel
      const [totalEventsRes, totalUsersRes, totalRegistrationsRes, averageAttendanceRes, topEventsRes, userGrowthRes, eventStatsRes] = await Promise.all([
        eventAPI.getTotalEvents(),
        authAPI.getTotalUsers(),
        bookingAPI.getTotalRegistrations(),
        bookingAPI.getAverageAttendance(),
        bookingAPI.getTopEvents(10),
        authAPI.getUserGrowth(),
        eventAPI.getEventStatsByStatus()
      ]);

      // Fetch event names for top events
      const topEventsWithNames = await Promise.all(
        topEventsRes.data.map(async (event: any) => {
          try {
            const eventRes = await eventAPI.getEventById(event.eventId);
            return {
              ...event,
              name: eventRes.data.name || 'Unknown Event'
            };
          } catch (err) {
            logger.error(COMPONENT_NAME, 'Failed to fetch event name', err as Error);
            return {
              ...event,
              name: 'Unknown Event'
            };
          }
        })
      );

      setReportData({
        totalEvents: totalEventsRes.data.totalEvents,
        totalUsers: totalUsersRes.data.totalUsers,
        totalRegistrations: totalRegistrationsRes.data.totalRegistrations,
        averageAttendance: averageAttendanceRes.data.averageAttendance,
        topEvents: topEventsWithNames,
        userGrowth: userGrowthRes.data,
        eventStats: eventStatsRes.data.map((stat: any) => ({
          status: stat.status,
          count: stat.count,
          percentage: stat.percentage
        }))
      });
    } catch (err) {
      logger.error(COMPONENT_NAME, 'Failed to fetch report data', err as Error);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'ADMIN') {
      fetchReportData();
    }
  }, [isAuthenticated, user, fetchReportData]);

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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
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
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="border-red-200 dark:border-red-800">
            <CardContent className="p-6 text-center">
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <Button onClick={fetchReportData} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </CardContent>
          </Card>
        </main>
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
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Reports & Analytics
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Overview of platform performance, user engagement, and event statistics.
            </p>
          </div>
          <Button onClick={fetchReportData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
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
              <div className="space-y-4">
                {reportData.topEvents.length === 0 ? (
                  <p className="text-slate-600 dark:text-slate-400 text-center py-4">No events data available</p>
                ) : (
                  reportData.topEvents.map((event, index) => (
                    <div key={event.eventId} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-900 dark:text-white">{event.name}</h4>
                        <div className="flex items-center space-x-4 text-sm text-slate-600 dark:text-slate-400">
                          <span>{event.registrations} registrations</span>
                          <span>{event.attendance.toFixed(1)}% attendance</span>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        #{index + 1}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
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
              <div className="space-y-4">
                {reportData.eventStats.length === 0 ? (
                  <p className="text-slate-600 dark:text-slate-400 text-center py-4">No event statistics available</p>
                ) : (
                  reportData.eventStats.map((stat, index) => (
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
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Growth Chart Placeholder */}
        <Card className="border-slate-200 dark:border-slate-700 mt-8">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
              User Growth Trend
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              Monthly user registration growth over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <BarChart3 className="h-16 w-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Interactive Charts Coming Soon
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Advanced analytics and interactive charts will be implemented in Phase 3.
              </p>

              {/* User Growth Table */}
              <div className="overflow-x-auto">
                {reportData.userGrowth.length === 0 ? (
                  <p className="text-slate-600 dark:text-slate-400 text-center py-4">No user growth data available</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-2 px-4 font-medium text-slate-600 dark:text-slate-400">Month</th>
                        <th className="text-left py-2 px-4 font-medium text-slate-600 dark:text-slate-400">Total Users</th>
                        <th className="text-left py-2 px-4 font-medium text-slate-600 dark:text-slate-400">Growth</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.userGrowth.map((data, index) => {
                        const previousCount = index > 0 ? reportData.userGrowth[index - 1].users : 0;
                        const growth = data.users - previousCount;
                        return (
                          <tr key={index} className="border-b border-slate-100 dark:border-slate-700">
                            <td className="py-2 px-4 text-slate-900 dark:text-white">{data.month}</td>
                            <td className="py-2 px-4 text-slate-900 dark:text-white">{data.users}</td>
                            <td className="py-2 px-4">
                              {growth > 0 && (
                                <Badge
                                  variant="default"
                                  className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                >
                                  +{growth}
                                </Badge>
                              )}
                              {growth === 0 && (
                                <span className="text-slate-600 dark:text-slate-400">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
