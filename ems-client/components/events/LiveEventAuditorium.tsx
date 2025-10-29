'use client';

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Users,
  UserCheck,
  UserPlus,
  FileText,
  Download,
  Clock,
  MapPin,
  Calendar,
  RefreshCw,
  Crown,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useLogger } from "@/lib/logger/LoggerProvider";
import { eventAPI } from "@/lib/api/event.api";
import { AttendanceApiClient } from "@/lib/api/attendance.api";
import { EventResponse, EventStatus } from "@/lib/api/types/event.types";
import { LiveAttendanceResponse } from "@/lib/api/attendance.api";

const LOGGER_COMPONENT_NAME = 'LiveEventAuditorium';

const statusColors = {
  [EventStatus.DRAFT]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  [EventStatus.PENDING_APPROVAL]: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  [EventStatus.PUBLISHED]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  [EventStatus.REJECTED]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  [EventStatus.CANCELLED]: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  [EventStatus.COMPLETED]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
};

interface LiveEventAuditoriumProps {
  userRole: 'ADMIN' | 'SPEAKER' | 'USER';
}

export const LiveEventAuditorium = ({ userRole }: LiveEventAuditoriumProps) => {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const logger = useLogger();
  
  const eventId = params.id as string;
  
  const [event, setEvent] = useState<EventResponse | null>(null);
  const [attendance, setAttendance] = useState<LiveAttendanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Create API client instance
  const attendanceAPI = new AttendanceApiClient();

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

  const loadAttendance = async () => {
    if (!event) return;
    
    try {
      logger.info(LOGGER_COMPONENT_NAME, 'Loading attendance data', { eventId });
      const attendanceData = await attendanceAPI.getLiveAttendance(eventId);
      setAttendance(attendanceData);
    } catch (err) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to load attendance data', err as Error);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([loadEvent(), loadAttendance()]);
    setRefreshing(false);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await loadEvent();
      setLoading(false);
    };
    
    loadData();
  }, [eventId]);

  useEffect(() => {
    if (event) {
      loadAttendance();
    }
  }, [event]);

  // Auto-refresh attendance data every 15 seconds for live experience
  useEffect(() => {
    if (!event) return;
    
    const interval = setInterval(() => {
      loadAttendance();
    }, 15000);

    return () => clearInterval(interval);
  }, [event]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="max-w-md mx-auto bg-slate-800 border-slate-700">
            <CardContent className="text-center py-8">
              <RefreshCw className="h-12 w-12 text-blue-400 mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-semibold mb-2 text-white">Entering Auditorium...</h3>
              <p className="text-slate-400">Please wait...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="max-w-md mx-auto bg-slate-800 border-slate-700">
            <CardContent className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-white">Error Loading Event</h3>
              <p className="text-slate-400 mb-4">{error}</p>
              <Button onClick={() => router.back()} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Exit Auditorium
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

  // Separate attendees into joined and not joined
  const joinedAttendees = attendance?.attendees.filter(attendee => attendee.isAttended) || [];
  const notJoinedAttendees = attendance?.attendees.filter(attendee => !attendee.isAttended) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => router.back()}
                variant="ghost"
                size="sm"
                className="text-slate-300 hover:text-white hover:bg-slate-700"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Exit Auditorium
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  🎭 Live Event Auditorium
                </h1>
                <p className="text-slate-400">
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
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Badge className="bg-green-600 text-white">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                LIVE
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Event Status Banner */}
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-2">{event.name}</h2>
                    <div className="flex items-center space-x-4 text-slate-400">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        {formatDateTime(event.bookingStartDate)}
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2" />
                        {event.venue.name}
                      </div>
                    </div>
                  </div>
                  <Badge className={statusColors[event.status]}>
                    {event.status.replace('_', ' ')}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Event Description */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Event Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-300 leading-relaxed">{event.description}</p>
              </CardContent>
            </Card>

            {/* Materials Section */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Event Materials
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEventStarted ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                    <p className="text-slate-400">Materials will be available when the speaker uploads them</p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                    <p className="text-slate-400">Materials will be available when the event starts</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar - Attendance Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-6">
              {/* Speaker Info */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Crown className="h-5 w-5 mr-2 text-yellow-400" />
                    Speaker
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {event.speakerId ? event.speakerId.charAt(0).toUpperCase() : 'S'}
                    </div>
                    <div>
                      <p className="text-white font-medium">Speaker</p>
                      <p className="text-slate-400 text-sm">Main Speaker</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Attendance Stats */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Attendance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {attendance ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-green-900/30 rounded-lg border border-green-700">
                          <UserCheck className="h-6 w-6 text-green-400 mx-auto mb-1" />
                          <p className="text-lg font-bold text-green-400">{attendance.totalAttended}</p>
                          <p className="text-xs text-slate-400">Joined</p>
                        </div>
                        <div className="text-center p-3 bg-blue-900/30 rounded-lg border border-blue-700">
                          <UserPlus className="h-6 w-6 text-blue-400 mx-auto mb-1" />
                          <p className="text-lg font-bold text-blue-400">{attendance.totalRegistered}</p>
                          <p className="text-xs text-slate-400">Registered</p>
                        </div>
                      </div>
                      
                      <div className="text-center p-3 bg-purple-900/30 rounded-lg border border-purple-700">
                        <p className="text-2xl font-bold text-purple-400">{attendance.attendancePercentage}%</p>
                        <p className="text-xs text-slate-400">Attendance Rate</p>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <Users className="h-8 w-8 text-slate-500 mx-auto mb-2" />
                      <p className="text-slate-400 text-sm">Loading attendance...</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* People Who Joined */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <UserCheck className="h-5 w-5 mr-2 text-green-400" />
                    In Auditorium ({joinedAttendees.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {joinedAttendees.length > 0 ? (
                        joinedAttendees.map((attendee) => (
                          <div key={attendee.userId} className="flex items-center space-x-3 p-2 bg-green-900/20 rounded-lg border border-green-700/30">
                            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                              {attendee.userName.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm font-medium truncate">{attendee.userName}</p>
                              <p className="text-slate-400 text-xs truncate">{attendee.userEmail}</p>
                            </div>
                            <CheckCircle className="h-4 w-4 text-green-400" />
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4">
                          <UserCheck className="h-8 w-8 text-slate-500 mx-auto mb-2" />
                          <p className="text-slate-400 text-sm">No one has joined yet</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* People Registered But Not Joined */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <UserPlus className="h-5 w-5 mr-2 text-blue-400" />
                    Waiting Outside ({notJoinedAttendees.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {notJoinedAttendees.length > 0 ? (
                        notJoinedAttendees.map((attendee) => (
                          <div key={attendee.userId} className="flex items-center space-x-3 p-2 bg-blue-900/20 rounded-lg border border-blue-700/30">
                            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                              {attendee.userName.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm font-medium truncate">{attendee.userName}</p>
                              <p className="text-slate-400 text-xs truncate">{attendee.userEmail}</p>
                            </div>
                            <XCircle className="h-4 w-4 text-blue-400" />
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4">
                          <UserPlus className="h-8 w-8 text-slate-500 mx-auto mb-2" />
                          <p className="text-slate-400 text-sm">Everyone has joined!</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
