'use client';

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { logger } from "@/lib/logger";
import { adminApiClient } from "@/lib/api/admin.api";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ChartCard } from "@/components/reports/ChartCard";
import { ChartTooltip } from "@/components/reports/ChartTooltip";
import { EmptyChartState } from "@/components/reports/EmptyChartState";

const COMPONENT_NAME = 'EventReportPage';

interface EventStatusData {
  status: string;
  count: number;
  percentage: number;
}

interface TopEvent {
  eventId: string;
  name?: string;
  registrations: number;
  attendance: number;
}

interface EventStats {
  totalEvents: number;
  activeEvents: number;
  eventStats: EventStatusData[];
  topEvents: TopEvent[];
}

export default function EventReportPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [eventStats, setEventStats] = useState<EventStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    } else if (!isLoading && user?.role !== 'ADMIN') {
      router.push('/dashboard');
    } else if (isAuthenticated && user?.role === 'ADMIN') {
      loadEventReportData();
    }
  }, [isAuthenticated, isLoading, user, router]);

  const loadEventReportData = async () => {
    try {
      setLoading(true);
      setError(null);
      logger.info(COMPONENT_NAME, 'Loading event report data');

      // Fetch reports data
      const reportsData = await adminApiClient.getReportsData();

      setEventStats({
        totalEvents: reportsData.totalEvents,
        activeEvents: reportsData.totalEvents, // You might want to fetch this separately
        eventStats: reportsData.eventStats,
        topEvents: reportsData.topEvents,
      });

      logger.info(COMPONENT_NAME, 'Event report data loaded successfully');
    } catch (err) {
      logger.error(COMPONENT_NAME, 'Failed to load event report data', err as Error);
      setError('Failed to load event report data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-700 dark:text-slate-300 font-medium">Loading event report...</p>
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
          <Button onClick={loadEventReportData}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!eventStats) {
    return null;
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  // Prepare data for charts
  const eventStatusChartData = eventStats.eventStats.map(stat => ({
    name: stat.status,
    value: stat.count,
    percentage: stat.percentage,
  }));

  const topEventsChartData = eventStats.topEvents.slice(0, 10).map(event => ({
    name: event.name || `Event ${event.eventId.substring(0, 8)}`,
    registrations: event.registrations,
    attendance: event.attendance,
  }));

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
                Event Report
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
            Event Analytics Report
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Comprehensive analysis of event performance, status distribution, and top performers
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Total Events</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{eventStats.totalEvents.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Active Events</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{eventStats.activeEvents.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Event Statuses</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{eventStats.eventStats.length}</p>
          </div>
        </div>

        {/* Charts */}
        <div className="space-y-8">
          {/* Event Status Distribution - Pie Chart */}
          <ChartCard
            title="Event Status Distribution"
            description="Breakdown of events by status"
          >
            {eventStats.eventStats.length === 0 ? (
              <EmptyChartState message="No event status data available" />
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={eventStatusChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(1)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {eventStatusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Event Status Distribution - Bar Chart */}
          <ChartCard
            title="Event Status Count"
            description="Number of events by status"
          >
            {eventStats.eventStats.length === 0 ? (
              <EmptyChartState message="No event status data available" />
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={eventStatusChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-300 dark:stroke-slate-700" />
                  <XAxis
                    dataKey="name"
                    className="text-xs fill-slate-600 dark:fill-slate-400"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis className="text-xs fill-slate-600 dark:fill-slate-400" />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend />
                  <Bar
                    dataKey="value"
                    fill="#3b82f6"
                    name="Event Count"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Top Performing Events - Bar Chart */}
          <ChartCard
            title="Top Performing Events"
            description="Events with highest registration and attendance rates"
          >
            {eventStats.topEvents.length === 0 ? (
              <EmptyChartState message="No top events data available" />
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={topEventsChartData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-300 dark:stroke-slate-700" />
                  <XAxis
                    dataKey="name"
                    className="text-xs fill-slate-600 dark:fill-slate-400"
                    angle={-45}
                    textAnchor="end"
                    height={120}
                  />
                  <YAxis yAxisId="left" className="text-xs fill-slate-600 dark:fill-slate-400" />
                  <YAxis yAxisId="right" orientation="right" className="text-xs fill-slate-600 dark:fill-slate-400" />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey="registrations"
                    fill="#3b82f6"
                    name="Registrations"
                    radius={[8, 8, 0, 0]}
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="attendance"
                    fill="#10b981"
                    name="Attendance %"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Top Events List */}
          <ChartCard
            title="Top Performing Events Details"
            description="Detailed list of events with highest registration and attendance rates"
          >
            {eventStats.topEvents.length === 0 ? (
              <EmptyChartState message="No events with registrations yet" />
            ) : (
              <div className="space-y-4">
                {eventStats.topEvents.map((event, index) => (
                  <div key={event.eventId} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-900 dark:text-white mb-1">
                        {event.name || `Event ${event.eventId.substring(0, 8)}`}
                      </h4>
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
          </ChartCard>

          {/* Event Status Details Table */}
          <ChartCard
            title="Event Status Breakdown"
            description="Detailed breakdown of events by status"
          >
            <div className="space-y-4">
              {eventStats.eventStats.length === 0 ? (
                <EmptyChartState message="No events found" />
              ) : (
                eventStats.eventStats.map((stat, index) => (
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
          </ChartCard>
        </div>
      </main>
    </div>
  );
}

