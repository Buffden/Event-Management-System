'use client';

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, User, Calendar, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-700 dark:text-slate-300 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

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
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                Dashboard
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
            Welcome back, {user?.name?.split(' ')[0]}! 👋
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Here&apos;s what&apos;s happening with your events today.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Total Events
              </CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">0</div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                No events yet
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Upcoming Events
              </CardTitle>
              <Calendar className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">0</div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                None scheduled
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Attendees
              </CardTitle>
              <User className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">0</div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Total registered
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Revenue
              </CardTitle>
              <Settings className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">$0</div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Total earnings
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white">
              Quick Actions
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              Get started with your event management journey
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button className="h-24 flex flex-col items-center justify-center space-y-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                <Calendar className="h-6 w-6" />
                <span>Create Event</span>
              </Button>
              
              <Button variant="outline" className="h-24 flex flex-col items-center justify-center space-y-2 border-slate-200 dark:border-slate-700">
                <User className="h-6 w-6" />
                <span>Manage Speakers</span>
              </Button>
              
              <Button variant="outline" className="h-24 flex flex-col items-center justify-center space-y-2 border-slate-200 dark:border-slate-700">
                <Settings className="h-6 w-6" />
                <span>Settings</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* User Info */}
        <Card className="mt-8 border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4 mb-6">
              <Avatar className="h-16 w-16">
                <AvatarImage 
                  src={user?.image || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name || user?.email}`} 
                  alt={user?.name || user?.email} 
                />
                <AvatarFallback className="text-lg">
                  {user?.name ? user.name.split(' ').map(n => n[0]).join('') : user?.email?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-lg font-medium text-slate-900 dark:text-white">{user?.name}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">{user?.email}</p>
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 mt-1">
                  Active
                </Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Role</label>
                <p className="text-slate-900 dark:text-white capitalize">{user?.role?.toLowerCase()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">User ID</label>
                <p className="text-slate-900 dark:text-white font-mono text-sm">{user?.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Email Verified</label>
                <p className="text-slate-900 dark:text-white">
                  {user?.emailVerified ? new Date(user.emailVerified).toLocaleDateString() : 'Yes'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Member Since</label>
                <p className="text-slate-900 dark:text-white">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
