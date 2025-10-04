'use client';

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  LogOut, 
  Calendar, 
  Users, 
  Star,
  Clock,
  Plus,
  Eye,
  MessageSquare,
  Settings,
  TrendingUp,
  Award,
  Mic
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {logger} from "@/lib/logger";

// Mock data for development
const mockStats = {
  totalEvents: 12,
  upcomingEvents: 3,
  completedEvents: 9,
  totalAttendees: 450,
  averageRating: 4.8,
  totalReviews: 89,
  upcomingSessions: 5,
  thisWeekSessions: 2
};

const mockUpcomingSessions = [
  {
    id: '1',
    title: 'Advanced React Patterns',
    event: 'TechConf 2024',
    date: '2024-01-15',
    time: '10:00 AM',
    attendees: 120,
    status: 'confirmed'
  },
  {
    id: '2',
    title: 'Building Scalable APIs',
    event: 'DevSummit 2024',
    date: '2024-01-18',
    time: '2:00 PM',
    attendees: 85,
    status: 'confirmed'
  },
  {
    id: '3',
    title: 'Microservices Architecture',
    event: 'CloudExpo 2024',
    date: '2024-01-22',
    time: '11:30 AM',
    attendees: 200,
    status: 'pending'
  }
];

const mockRecentFeedback = [
  {
    id: '1',
    event: 'React Workshop 2024',
    rating: 5,
    comment: 'Excellent presentation! Very clear explanations.',
    date: '2024-01-10'
  },
  {
    id: '2',
    event: 'API Design Masterclass',
    rating: 4,
    comment: 'Great content, would love more examples.',
    date: '2024-01-08'
  }
];

const LOGGER_COMPONENT_NAME = 'SpeakerDashboard';

export default function SpeakerDashboard() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    logger.debug(LOGGER_COMPONENT_NAME, 'Speaker dashboard - Auth state:', { isLoading, isAuthenticated, userRole: user?.role }); // Debug log
    if (!isLoading && !isAuthenticated) {
      logger.info(LOGGER_COMPONENT_NAME, 'Speaker dashboard - Not authenticated, redirecting to login'); // Debug log
      router.push('/login');
    } else if (!isLoading && user?.role !== 'SPEAKER') {
      logger.info(LOGGER_COMPONENT_NAME, 'Speaker dashboard - Not speaker user, redirecting to dashboard'); // Debug log
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-700 dark:text-slate-300 font-medium">Loading speaker dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'SPEAKER') {
    return null; // Will redirect
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
              <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                Speaker Panel
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
            Speaker Dashboard 🎤
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Manage your speaking engagements and track your impact.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                My Events
              </CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{mockStats.totalEvents}</div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {mockStats.upcomingEvents} upcoming
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Total Attendees
              </CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{mockStats.totalAttendees}</div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Across all events
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Average Rating
              </CardTitle>
              <Star className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{mockStats.averageRating}</div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {mockStats.totalReviews} reviews
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Upcoming Sessions
              </CardTitle>
              <Clock className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{mockStats.upcomingSessions}</div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {mockStats.thisWeekSessions} this week
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
                Manage your speaking engagements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  className="h-20 flex flex-col items-center justify-center space-y-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                  onClick={() => router.push('/dashboard/speaker/sessions/create')}
                >
                  <Plus className="h-5 w-5" />
                  <span className="text-sm">Create Session</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center justify-center space-y-2 border-slate-200 dark:border-slate-700"
                  onClick={() => router.push('/dashboard/speaker/events')}
                >
                  <Calendar className="h-5 w-5" />
                  <span className="text-sm">My Events</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center justify-center space-y-2 border-slate-200 dark:border-slate-700"
                  onClick={() => router.push('/dashboard/speaker/feedback')}
                >
                  <MessageSquare className="h-5 w-5" />
                  <span className="text-sm">View Feedback</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center justify-center space-y-2 border-slate-200 dark:border-slate-700"
                  onClick={() => router.push('/dashboard/speaker/profile')}
                >
                  <Settings className="h-5 w-5" />
                  <span className="text-sm">Update Profile</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Sessions Card */}
          <Card className="border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white">
                Upcoming Sessions
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Your next speaking engagements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockUpcomingSessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-900 dark:text-white">{session.title}</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{session.event}</p>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {session.date} at {session.time}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {session.attendees} attendees
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={session.status === 'confirmed' ? 'default' : 'secondary'}
                        className={session.status === 'confirmed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : ''}
                      >
                        {session.status}
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

        {/* Recent Feedback */}
        <Card className="border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white">
              Recent Feedback
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              Latest reviews from your sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockRecentFeedback.map((feedback) => (
                <div key={feedback.id} className="flex items-start space-x-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="flex items-center space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`h-4 w-4 ${i < feedback.rating ? 'text-yellow-400 fill-current' : 'text-slate-300'}`} 
                      />
                    ))}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-900 dark:text-white">{feedback.event}</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{feedback.comment}</p>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{feedback.date}</span>
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
