'use client';

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, CheckCircle, XCircle, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {logger} from "@/lib/logger";

const COMPONENT_NAME = 'PendingEventsPage';

// Mock data for pending events
const mockPendingEvents = [
  {
    id: '1',
    title: 'Blockchain Workshop',
    description: 'Learn about blockchain technology and cryptocurrency development.',
    submittedBy: 'john@example.com',
    submittedAt: '2024-01-20T10:30:00Z',
    venue: 'Tech Hub Conference Room',
    startDate: '2024-03-15T09:00:00Z',
    endDate: '2024-03-15T17:00:00Z',
    capacity: 50,
    estimatedAttendees: 35
  },
  {
    id: '2',
    title: 'Data Science Meetup',
    description: 'Monthly meetup for data science enthusiasts and professionals.',
    submittedBy: 'jane@example.com',
    submittedAt: '2024-01-19T14:15:00Z',
    venue: 'Innovation Center',
    startDate: '2024-03-20T18:00:00Z',
    endDate: '2024-03-20T21:00:00Z',
    capacity: 100,
    estimatedAttendees: 75
  }
];

export default function PendingEventsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    } else if (!isLoading && user?.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, user, router]);

  const handleEventAction = (eventId: string, action: 'approve' | 'reject') => {
    // TODO: Implement event approval/rejection API calls
    logger.debug(COMPONENT_NAME, `Event ${eventId} action: ${action}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-700 dark:text-slate-300 font-medium">Loading pending events...</p>
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
                onClick={() => router.push('/dashboard/admin/events')}
                className="text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Events
              </Button>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                Pending Event Reviews
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Pending Event Reviews
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Review and approve events submitted by users and speakers.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Pending Review</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{mockPendingEvents.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Approved Today</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">0</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center">
                <XCircle className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Rejected Today</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">0</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Events */}
        <div className="space-y-6">
          {mockPendingEvents.map((event) => (
            <Card key={event.id} className="border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                      {event.title}
                    </CardTitle>
                    <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                      PENDING REVIEW
                    </Badge>
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Submitted {new Date(event.submittedAt).toLocaleDateString()}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Event Details */}
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Event Details</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-slate-600 dark:text-slate-400">Description:</span>
                        <p className="text-slate-900 dark:text-white mt-1">{event.description}</p>
                      </div>
                      <div>
                        <span className="font-medium text-slate-600 dark:text-slate-400">Venue:</span>
                        <span className="ml-2 text-slate-900 dark:text-white">{event.venue}</span>
                      </div>
                      <div>
                        <span className="font-medium text-slate-600 dark:text-slate-400">Date:</span>
                        <span className="ml-2 text-slate-900 dark:text-white">
                          {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-slate-600 dark:text-slate-400">Capacity:</span>
                        <span className="ml-2 text-slate-900 dark:text-white">{event.capacity} attendees</span>
                      </div>
                    </div>
                  </div>

                  {/* Submission Info */}
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Submission Information</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-slate-600 dark:text-slate-400">Submitted by:</span>
                        <span className="ml-2 text-slate-900 dark:text-white">{event.submittedBy}</span>
                      </div>
                      <div>
                        <span className="font-medium text-slate-600 dark:text-slate-400">Submitted at:</span>
                        <span className="ml-2 text-slate-900 dark:text-white">
                          {new Date(event.submittedAt).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-slate-600 dark:text-slate-400">Estimated attendees:</span>
                        <span className="ml-2 text-slate-900 dark:text-white">{event.estimatedAttendees}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 pt-6 border-t border-orange-200 dark:border-orange-700">
                  <div className="flex flex-wrap gap-3">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleEventAction(event.id, 'approve')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve Event
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleEventAction(event.id, 'reject')}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject Event
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {mockPendingEvents.length === 0 && (
            <Card className="border-slate-200 dark:border-slate-700">
              <CardContent className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  No Pending Events
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  All events have been reviewed. Great job! 🎉
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
