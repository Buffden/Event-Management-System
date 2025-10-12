'use client';

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, CheckCircle, XCircle, Eye, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLogger } from "@/lib/logger/LoggerProvider";
import { eventAPI } from "@/lib/api/event.api";
import { EventResponse, EventStatus } from "@/lib/api/types/event.types";
import { RejectionModal } from "@/components/admin/RejectionModal";

const COMPONENT_NAME = 'PendingEventsPage';

export default function PendingEventsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const logger = useLogger();

  // API state management
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Rejection modal state
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [eventToReject, setEventToReject] = useState<{ id: string; name: string } | null>(null);

  // Stats
  const [approvedToday, setApprovedToday] = useState(0);
  const [rejectedToday, setRejectedToday] = useState(0);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    } else if (!authLoading && user?.role !== 'ADMIN') {
      router.push('/dashboard');
    } else if (isAuthenticated && user?.role === 'ADMIN') {
      loadPendingEvents();
    }
  }, [isAuthenticated, authLoading, user, router]);

  const loadPendingEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      logger.debug(COMPONENT_NAME, 'Loading pending events');

      const response = await eventAPI.getAllEvents({
        status: EventStatus.PENDING_APPROVAL,
        page: 1,
        limit: 100
      });

      if (response.success) {
        setEvents(response.data.events);
        logger.debug(COMPONENT_NAME, 'Pending events loaded successfully', { 
          count: response.data.events.length 
        });
      } else {
        throw new Error('Failed to load pending events');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load pending events';
      setError(errorMessage);
      logger.error(COMPONENT_NAME, 'Failed to load pending events', 
        err instanceof Error ? err : new Error(String(err))
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (eventId: string) => {
    try {
      setActionLoading(eventId);
      logger.debug(COMPONENT_NAME, `Approving event ${eventId}`);

      const response = await eventAPI.approveEvent(eventId);

      if (response.success) {
        logger.info(COMPONENT_NAME, `Event ${eventId} approved successfully`);
        setApprovedToday(prev => prev + 1);
        // Reload events
        await loadPendingEvents();
      } else {
        throw new Error('Failed to approve event');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to approve event';
      setError(errorMessage);
      logger.error(COMPONENT_NAME, `Failed to approve event ${eventId}`, 
        err instanceof Error ? err : new Error(String(err))
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectClick = (event: EventResponse) => {
    setEventToReject({ id: event.id, name: event.name });
    setIsRejectionModalOpen(true);
  };

  const handleRejectConfirm = async (rejectionReason: string) => {
    if (!eventToReject) return;

    try {
      setActionLoading(eventToReject.id);
      logger.debug(COMPONENT_NAME, `Rejecting event ${eventToReject.id} with reason: ${rejectionReason}`);

      const response = await eventAPI.rejectEvent(eventToReject.id, { rejectionReason });

      if (response.success) {
        logger.info(COMPONENT_NAME, `Event ${eventToReject.id} rejected successfully`);
        setRejectedToday(prev => prev + 1);
        setIsRejectionModalOpen(false);
        setEventToReject(null);
        // Reload events
        await loadPendingEvents();
      } else {
        throw new Error('Failed to reject event');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reject event';
      setError(errorMessage);
      logger.error(COMPONENT_NAME, `Failed to reject event ${eventToReject.id}`, 
        err instanceof Error ? err : new Error(String(err))
      );
      throw err; // Re-throw to let modal handle the error
    } finally {
      setActionLoading(null);
    }
  };

  if (authLoading || loading) {
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

  // Error state
  if (error && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Error Loading Pending Events
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              {error}
            </p>
            <Button
              onClick={loadPendingEvents}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
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
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{events.length}</p>
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
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{approvedToday}</p>
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
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{rejectedToday}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Events */}
        <div className="space-y-6">
          {events.map((event) => (
            <Card key={event.id} className="border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                      {event.name}
                    </CardTitle>
                    <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                      PENDING REVIEW
                    </Badge>
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Submitted {new Date(event.createdAt).toLocaleDateString()}
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
                        <span className="font-medium text-slate-600 dark:text-slate-400">Category:</span>
                        <span className="ml-2 text-slate-900 dark:text-white">{event.category}</span>
                      </div>
                      <div>
                        <span className="font-medium text-slate-600 dark:text-slate-400">Venue:</span>
                        <span className="ml-2 text-slate-900 dark:text-white">{event.venue.name}</span>
                      </div>
                      <div>
                        <span className="font-medium text-slate-600 dark:text-slate-400">Date:</span>
                        <span className="ml-2 text-slate-900 dark:text-white">
                          {new Date(event.bookingStartDate).toLocaleDateString()} - {new Date(event.bookingEndDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-slate-600 dark:text-slate-400">Capacity:</span>
                        <span className="ml-2 text-slate-900 dark:text-white">{event.venue.capacity} attendees</span>
                      </div>
                    </div>
                  </div>

                  {/* Submission Info */}
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Submission Information</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-slate-600 dark:text-slate-400">Speaker ID:</span>
                        <span className="ml-2 text-slate-900 dark:text-white font-mono text-xs">{event.speakerId}</span>
                      </div>
                      <div>
                        <span className="font-medium text-slate-600 dark:text-slate-400">Created at:</span>
                        <span className="ml-2 text-slate-900 dark:text-white">
                          {new Date(event.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-slate-600 dark:text-slate-400">Last updated:</span>
                        <span className="ml-2 text-slate-900 dark:text-white">
                          {new Date(event.updatedAt).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-slate-600 dark:text-slate-400">Venue Address:</span>
                        <span className="ml-2 text-slate-900 dark:text-white">{event.venue.address}</span>
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
                      onClick={() => handleApprove(event.id)}
                      disabled={actionLoading === event.id}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {actionLoading === event.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Approving...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve Event
                        </>
                      )}
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRejectClick(event)}
                      disabled={actionLoading === event.id}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject Event
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/dashboard/admin/events/modify/${event.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {events.length === 0 && !loading && (
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

        {/* Rejection Modal */}
        <RejectionModal
          isOpen={isRejectionModalOpen}
          onClose={() => {
            setIsRejectionModalOpen(false);
            setEventToReject(null);
          }}
          onConfirm={handleRejectConfirm}
          eventName={eventToReject?.name}
          isLoading={!!eventToReject && actionLoading === eventToReject.id}
        />
      </main>
    </div>
  );
}
