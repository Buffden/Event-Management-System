'use client';

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BarChart3, TrendingUp, Users, Calendar, Download, Filter } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {logger} from "@/lib/logger";

const COMPONENT_NAME = 'ReportsPage';

// Mock data for reports
const mockReportData = {
  totalEvents: 8,
  totalUsers: 156,
  totalRegistrations: 342,
  averageAttendance: 78,
  topEvents: [
    { name: 'Tech Conference 2024', registrations: 156, attendance: 89 },
    { name: 'AI Summit', registrations: 142, attendance: 95 },
    { name: 'Design Workshop', registrations: 44, attendance: 67 }
  ],
  userGrowth: [
    { month: 'Oct 2023', users: 45 },
    { month: 'Nov 2023', users: 67 },
    { month: 'Dec 2023', users: 89 },
    { month: 'Jan 2024', users: 112 },
    { month: 'Feb 2024', users: 156 }
  ],
  eventStats: [
    { status: 'Published', count: 5, percentage: 62.5 },
    { status: 'Draft', count: 2, percentage: 25 },
    { status: 'Archived', count: 1, percentage: 12.5 }
  ]
};

export default function ReportsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    } else if (!isLoading && user?.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, user, router]);

  const handleExportReport = (type: string) => {
    // TODO: Implement report export functionality
    logger.debug(COMPONENT_NAME, `Exporting ${type} report`);
  };

  if (isLoading) {
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
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{mockReportData.totalEvents}</p>
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
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{mockReportData.totalUsers}</p>
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
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{mockReportData.totalRegistrations}</p>
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
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{mockReportData.averageAttendance}%</p>
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
                {mockReportData.topEvents.map((event, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-900 dark:text-white">{event.name}</h4>
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
                {mockReportData.eventStats.map((stat, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{stat.status}</span>
                      <span className="text-sm text-slate-900 dark:text-white">{stat.count} events</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${stat.percentage}%` }}
                      ></div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-600 dark:text-slate-400">{stat.percentage}%</span>
                    </div>
                  </div>
                ))}
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
              
              {/* Mock Data Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-2 px-4 font-medium text-slate-600 dark:text-slate-400">Month</th>
                      <th className="text-left py-2 px-4 font-medium text-slate-600 dark:text-slate-400">New Users</th>
                      <th className="text-left py-2 px-4 font-medium text-slate-600 dark:text-slate-400">Growth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockReportData.userGrowth.map((data, index) => (
                      <tr key={index} className="border-b border-slate-100 dark:border-slate-700">
                        <td className="py-2 px-4 text-slate-900 dark:text-white">{data.month}</td>
                        <td className="py-2 px-4 text-slate-900 dark:text-white">{data.users}</td>
                        <td className="py-2 px-4">
                          <Badge 
                            variant="default" 
                            className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          >
                            +{data.users - (index > 0 ? mockReportData.userGrowth[index - 1].users : 0)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
