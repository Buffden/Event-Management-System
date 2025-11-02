'use client';

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  Users,
  UserCheck,
  UserPlus,
  FileText,
  Crown,
  Download,
  Eye,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useLogger } from "@/lib/logger/LoggerProvider";
import { eventAPI } from "@/lib/api/event.api";
import { AttendanceApiClient } from "@/lib/api/attendance.api";
import { AdminApiClient, SpeakerInvitation } from "@/lib/api/admin.api";
import { EventResponse, EventStatus } from "@/lib/api/types/event.types";
import { LiveAttendanceResponse, AttendanceMetricsResponse } from "@/lib/api/attendance.api";
import { EventJoinInterface } from "@/components/attendance/EventJoinInterface";

const LOGGER_COMPONENT_NAME = 'EventDetailsPage';

const statusColors = {
  [EventStatus.DRAFT]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  [EventStatus.PENDING_APPROVAL]: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  [EventStatus.PUBLISHED]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  [EventStatus.REJECTED]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  [EventStatus.CANCELLED]: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  [EventStatus.COMPLETED]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
};

interface EventDetailsPageProps {
  userRole: 'ADMIN' | 'SPEAKER' | 'USER';
  showJoinInterface?: boolean;
  showAdminControls?: boolean;
  showSpeakerControls?: boolean;
}

export const EventDetailsPage = ({ 
  userRole, 
  showJoinInterface = true, 
  showAdminControls = false, 
  showSpeakerControls = false 
}: EventDetailsPageProps) => {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const logger = useLogger();
  
  const eventId = params.id as string;
  
  const [event, setEvent] = useState<EventResponse | null>(null);
  const [attendance, setAttendance] = useState<LiveAttendanceResponse | null>(null);
  const [metrics, setMetrics] = useState<AttendanceMetricsResponse | null>(null);
  interface SpeakerInvitationWithInfo extends SpeakerInvitation {
    speakerName?: string | null;
    speakerEmail?: string | null;
    isAttended?: boolean;
  }
  
  const [acceptedSpeakers, setAcceptedSpeakers] = useState<SpeakerInvitationWithInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Create API client instances
  const attendanceAPI = new AttendanceApiClient();
  const adminAPI = new AdminApiClient();

  const loadEvent = async () => {
    try {
      logger.info(LOGGER_COMPONENT_NAME, 'Loading event details', { eventId });
      const eventResponse = await eventAPI.getEventById(eventId);
      setEvent(eventResponse.data);
      setError(null);
    } catch (err) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to load event', err as Error);
      setError('Failed to load event details');
    }
  };

  const loadAcceptedSpeakers = async () => {
    if (!eventId) return;
    
    try {
      logger.info(LOGGER_COMPONENT_NAME, 'Loading accepted speakers for event', { eventId });
      
      // Fetch all invitations for this event
      const invitations = await adminAPI.getEventInvitations(eventId);
      
      // Filter to only show speakers who have ACCEPTED invitations
      const accepted = invitations.filter(inv => inv.status === 'ACCEPTED');
      
      // Fetch speaker profiles for accepted invitations
      const speakersWithInfo = await Promise.all(
        accepted.map(async (invitation) => {
          try {
            const speakerProfile = await adminAPI.getSpeakerProfile(invitation.speakerId);
            return {
              ...invitation,
              speakerName: speakerProfile.name,
              speakerEmail: speakerProfile.email
            };
          } catch (err) {
            logger.warn(LOGGER_COMPONENT_NAME, 'Failed to load speaker profile', {
              speakerId: invitation.speakerId,
              error: err
            });
            return {
              ...invitation,
              speakerName: null,
              speakerEmail: null
            };
          }
        })
      );
      
      setAcceptedSpeakers(speakersWithInfo);
      
      logger.info(LOGGER_COMPONENT_NAME, 'Accepted speakers loaded', { 
        eventId, 
        count: speakersWithInfo.length 
      });
    } catch (err) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to load accepted speakers', err as Error);
      // Don't set error - this is not critical, just show empty list
      setAcceptedSpeakers([]);
    }
  };

  const loadAttendance = async () => {
    if (!event) return;
    
    try {
      logger.info(LOGGER_COMPONENT_NAME, 'Loading attendance data', { eventId });
      
      // Load live attendance data
      const attendanceData = await attendanceAPI.getLiveAttendance(eventId);
      setAttendance(attendanceData);
      
      // Load metrics (for admins and speakers)
      if (userRole === 'ADMIN' || userRole === 'SPEAKER') {
        const metricsData = await attendanceAPI.getAttendanceMetrics(eventId);
        setMetrics(metricsData);
      }
    } catch (err) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to load attendance data', err as Error);
      // Don't set error for attendance - it's not critical
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([loadEvent(), loadAttendance(), loadAcceptedSpeakers()]);
    setRefreshing(false);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await loadEvent();
      await loadAcceptedSpeakers();
      setLoading(false);
    };
    
    loadData();
  }, [eventId]);

  useEffect(() => {
    if (event) {
      loadAttendance();
    }
  }, [event]);

  // Auto-refresh attendance data every 30 seconds
  useEffect(() => {
    if (!event) return;
    
    const interval = setInterval(() => {
      loadAttendance();
    }, 30000);

    return () => clearInterval(interval);
  }, [event]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="text-center py-8">
              <RefreshCw className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-semibold mb-2">Loading Event Details</h3>
              <p className="text-slate-600">Please wait...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Error Loading Event</h3>
              <p className="text-slate-600 mb-4">{error}</p>
              <Button onClick={() => router.back()} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Chicago'
    });
  };

  const isEventStarted = new Date(event.bookingStartDate) <= new Date();
  const isEventEnded = new Date(event.bookingEndDate) <= new Date();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => router.back()}
                variant="ghost"
                size="sm"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Event Details
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                  {event.name}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                onClick={refreshData}
                disabled={refreshing}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Event Overview Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2">{event.name}</CardTitle>
                <div className="flex items-center space-x-2 mb-2">
                  <Badge className={statusColors[event.status]}>
                    {event.status.replace('_', ' ')}
                  </Badge>
                  {isEventStarted && !isEventEnded && (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      Live
                    </Badge>
                  )}
                  {isEventEnded && (
                    <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                      Ended
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-3">Description</h3>
              <p className="text-slate-600 dark:text-slate-400">{event.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Category</h4>
                <p className="text-slate-600 dark:text-slate-400">{event.category}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2 flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  Venue
                </h4>
                <p className="text-slate-600 dark:text-slate-400">{event.venue.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-500">{event.venue.address}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2 flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Capacity
                </h4>
                <p className="text-slate-600 dark:text-slate-400">{event.venue.capacity} attendees</p>
              </div>

              <div className="col-span-2 lg:col-span-3">
                <h4 className="font-semibold mb-2 flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Event Schedule
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-500">Start Time</p>
                    <p className="text-slate-600 dark:text-slate-400">{formatDateTime(event.bookingStartDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-500">End Time</p>
                    <p className="text-slate-600 dark:text-slate-400">{formatDateTime(event.bookingEndDate)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Join Interface */}
            {showJoinInterface && (
              <div className="pt-6 border-t">
                <EventJoinInterface
                  eventId={event.id}
                  eventTitle={event.name}
                  eventStartTime={event.bookingStartDate}
                  eventEndTime={event.bookingEndDate}
                  eventVenue={event.venue.name}
                  eventCategory={event.category}
                  eventStatus={event.status}
                  eventDescription={event.description}
                  userRole={userRole}
                  speakerId={userRole === 'SPEAKER' ? user?.id : undefined}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detailed Information Tabs */}
        <Tabs defaultValue="attendance" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="speakers">Speakers</TabsTrigger>
            <TabsTrigger value="materials">Materials</TabsTrigger>
            <TabsTrigger value="info">Event Info</TabsTrigger>
          </TabsList>

          {/* Attendance Tab */}
          <TabsContent value="attendance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Live Attendance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {attendance ? (
                  <div className="space-y-6">
                    {/* Attendance Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <UserPlus className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-blue-600">{attendance.totalRegistered}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Registered</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <UserCheck className="h-8 w-8 text-green-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-green-600">{attendance.totalAttended}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Joined</p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <div className="h-8 w-8 text-purple-600 mx-auto mb-2 flex items-center justify-center">
                          <span className="text-lg font-bold">{attendance.attendancePercentage}%</span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Attendance Rate</p>
                      </div>
                    </div>

                    {/* Detailed Attendee List (for admins and speakers) */}
                    {(userRole === 'ADMIN' || userRole === 'SPEAKER') && attendance.attendees.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-3">Attendee Details</h4>
                        <div className="space-y-2">
                          {attendance.attendees.map((attendee) => (
                            <div key={attendee.userId} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                              <div>
                                <p className="font-medium">{attendee.userName}</p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">{attendee.userEmail}</p>
                              </div>
                              <div className="flex items-center space-x-2">
                                {attendee.isAttended ? (
                                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Joined
                                  </Badge>
                                ) : (
                                  <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Not Joined
                                  </Badge>
                                )}
                                {attendee.joinedAt && (
                                  <p className="text-xs text-slate-500">
                                    {new Date(attendee.joinedAt).toLocaleTimeString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600 dark:text-slate-400">No attendance data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Speakers Tab */}
          <TabsContent value="speakers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Crown className="h-5 w-5 mr-2" />
                  Event Speakers
                </CardTitle>
              </CardHeader>
              <CardContent>
                {acceptedSpeakers.length > 0 ? (
                  <div className="space-y-4">
                    {acceptedSpeakers.map((invitation) => (
                      <div key={invitation.id} className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                            {invitation.speakerName ? invitation.speakerName.charAt(0).toUpperCase() : 'S'}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">
                              {invitation.speakerName || `Speaker ${invitation.speakerId.substring(0, 8)}`}
                            </p>
                            {invitation.speakerEmail && (
                              <p className="text-sm text-slate-600 dark:text-slate-400">{invitation.speakerEmail}</p>
                            )}
                            {invitation.isAttended && (
                              <Badge className="mt-2 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Joined Event
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600 dark:text-slate-400 mb-2">No speakers have been invited yet</p>
                    <p className="text-sm text-slate-500 dark:text-slate-500">
                      Speakers must be invited and accept their invitation to appear here
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Materials Tab */}
          <TabsContent value="materials" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Event Materials
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEventStarted ? (
                  <div className="space-y-4">
                    {/* Materials would be displayed here */}
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-600 dark:text-slate-400">Materials will be available once the event starts</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600 dark:text-slate-400">Materials will be available when the event starts</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Event Info Tab */}
          <TabsContent value="info" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Event Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-2">Event ID</h4>
                    <p className="text-slate-600 dark:text-slate-400 font-mono text-sm">{event.id}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Created By</h4>
                    <p className="text-slate-600 dark:text-slate-400">Admin User</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Created At</h4>
                    <p className="text-slate-600 dark:text-slate-400">{formatDateTime(event.createdAt)}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Last Updated</h4>
                    <p className="text-slate-600 dark:text-slate-400">{formatDateTime(event.updatedAt)}</p>
                  </div>
                </div>

                {/* Additional metrics for admins */}
                {userRole === 'ADMIN' && metrics && (
                  <div className="pt-6 border-t">
                    <h4 className="font-semibold mb-4">Detailed Metrics</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <p className="text-sm text-slate-600 dark:text-slate-400">Total Registered</p>
                        <p className="text-xl font-bold">{metrics.totalRegistered}</p>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <p className="text-sm text-slate-600 dark:text-slate-400">Attendance Rate</p>
                        <p className="text-xl font-bold">{metrics.attendancePercentage}%</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};
