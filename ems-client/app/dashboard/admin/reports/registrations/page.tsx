'use client';

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { logger } from "@/lib/logger";
import { adminApiClient } from "@/lib/api/admin.api";
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { ChartCard } from "@/components/reports/ChartCard";
import { ChartTooltip } from "@/components/reports/ChartTooltip";
import { EmptyChartState } from "@/components/reports/EmptyChartState";

const COMPONENT_NAME = 'RegistrationReportPage';

interface AttendanceStats {
  totalRegistrations: number;
  totalAttended: number;
  attendancePercentage: number;
}

interface TopEvent {
  eventId: string;
  name?: string;
  registrations: number;
  attendance: number;
}

interface RegistrationData {
  attendanceStats: AttendanceStats;
  topEvents: TopEvent[];
  totalRegistrations: number;
}

export default function RegistrationReportPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [registrationData, setRegistrationData] = useState<RegistrationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    } else if (!isLoading && user?.role !== 'ADMIN') {
      router.push('/dashboard');
    } else if (isAuthenticated && user?.role === 'ADMIN') {
      loadRegistrationReportData();
    }
  }, [isAuthenticated, isLoading, user, router]);

  const loadRegistrationReportData = async () => {
    try {
      setLoading(true);
      setError(null);
      logger.info(COMPONENT_NAME, 'Loading registration report data');

      // Fetch reports data and attendance stats
      const [reportsData, attendanceStats] = await Promise.all([
        adminApiClient.getReportsData(),
        adminApiClient.getAttendanceStats(),
      ]);

      setRegistrationData({
        attendanceStats,
        topEvents: reportsData.topEvents,
        totalRegistrations: reportsData.totalRegistrations,
      });

      logger.info(COMPONENT_NAME, 'Registration report data loaded successfully');
    } catch (err) {
      logger.error(COMPONENT_NAME, 'Failed to load registration report data', err as Error);
      setError('Failed to load registration report data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-700 dark:text-slate-300 font-medium">Loading registration report...</p>
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
          <Button onClick={loadRegistrationReportData}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!registrationData) {
    return null;
  }

  // Prepare data for charts
  const attendanceComparisonData = [
    {
      name: 'Attended',
      value: registrationData.attendanceStats.totalAttended,
      fill: '#10b981',
    },
    {
      name: 'Registered (Not Attended)',
      value: registrationData.attendanceStats.totalRegistrations - registrationData.attendanceStats.totalAttended,
      fill: '#f59e0b',
    },
  ];

  const topEventsChartData = registrationData.topEvents.slice(0, 10).map(event => ({
    name: event.name || `Event ${event.eventId.substring(0, 8)}`,
    registrations: event.registrations,
    attendance: event.attendance,
    attendanceCount: Math.round((event.registrations * event.attendance) / 100),
  }));

  const attendanceTrendData = registrationData.topEvents.map((event, index) => ({
    event: `Event ${index + 1}`,
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
                Registration Report
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
            Registration & Attendance Analytics
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Comprehensive analysis of event registrations, attendance rates, and engagement metrics
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Total Registrations</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              {registrationData.totalRegistrations.toLocaleString()}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Total Attended</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              {registrationData.attendanceStats.totalAttended.toLocaleString()}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Average Attendance Rate</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              {registrationData.attendanceStats.attendancePercentage.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Charts */}
        <div className="space-y-8">
          {/* Attendance Overview - Bar Chart */}
          <ChartCard
            title="Attendance Overview"
            description="Comparison of attended vs registered users"
          >
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={attendanceComparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-300 dark:stroke-slate-700" />
                <XAxis
                  dataKey="name"
                  className="text-xs fill-slate-600 dark:fill-slate-400"
                />
                <YAxis className="text-xs fill-slate-600 dark:fill-slate-400" />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <Bar
                  dataKey="value"
                  name="Count"
                  radius={[8, 8, 0, 0]}
                >
                  {attendanceComparisonData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Top Events by Registrations - Bar Chart */}
          <ChartCard
            title="Top Events by Registrations"
            description="Events with highest number of registrations"
          >
            {topEventsChartData.length === 0 ? (
              <EmptyChartState message="No registration data available" />
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
                  <YAxis className="text-xs fill-slate-600 dark:fill-slate-400" />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend />
                  <Bar
                    dataKey="registrations"
                    fill="#3b82f6"
                    name="Registrations"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Attendance Rates by Event - Line Chart */}
          <ChartCard
            title="Attendance Rates by Event"
            description="Attendance percentage for top performing events"
          >
            {attendanceTrendData.length === 0 ? (
              <EmptyChartState message="No attendance data available" />
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={attendanceTrendData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-300 dark:stroke-slate-700" />
                  <XAxis
                    dataKey="name"
                    className="text-xs fill-slate-600 dark:fill-slate-400"
                    angle={-45}
                    textAnchor="end"
                    height={120}
                  />
                  <YAxis className="text-xs fill-slate-600 dark:fill-slate-400" />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="attendance"
                    stroke="#10b981"
                    strokeWidth={3}
                    name="Attendance %"
                    dot={{ fill: '#10b981', r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Registrations vs Attendance - Area Chart */}
          <ChartCard
            title="Registrations vs Attendance"
            description="Comparison of registrations and actual attendance for top events"
          >
            {topEventsChartData.length === 0 ? (
              <EmptyChartState message="No registration data available" />
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={topEventsChartData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
                  <defs>
                    <linearGradient id="colorRegistrations" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
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
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="registrations"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#colorRegistrations)"
                    name="Registrations"
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="attendanceCount"
                    stroke="#10b981"
                    fillOpacity={1}
                    fill="url(#colorAttendance)"
                    name="Attended"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Top Events Details Table */}
          <ChartCard
            title="Top Events Registration Details"
            description="Detailed breakdown of registrations and attendance for top performing events"
          >
            {registrationData.topEvents.length === 0 ? (
              <EmptyChartState message="No events with registrations yet" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-2 px-4 font-medium text-slate-600 dark:text-slate-400">Event</th>
                      <th className="text-right py-2 px-4 font-medium text-slate-600 dark:text-slate-400">Registrations</th>
                      <th className="text-right py-2 px-4 font-medium text-slate-600 dark:text-slate-400">Attendance %</th>
                      <th className="text-right py-2 px-4 font-medium text-slate-600 dark:text-slate-400">Attended</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrationData.topEvents.map((event, index) => {
                      const attendedCount = Math.round((event.registrations * event.attendance) / 100);
                      return (
                        <tr key={event.eventId} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-3 px-4 text-slate-900 dark:text-white font-medium">
                            {event.name || `Event ${event.eventId.substring(0, 8)}`}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-900 dark:text-white">
                            {event.registrations.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="font-medium text-green-600 dark:text-green-400">
                              {event.attendance.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-slate-900 dark:text-white">
                            {attendedCount.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </ChartCard>
        </div>
      </main>
    </div>
  );
}

