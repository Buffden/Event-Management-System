'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLogger } from '@/lib/logger/LoggerProvider';
import { attendanceApiClient } from '@/lib/api/attendance.api';
import { 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  RefreshCw,
  User,
  Mail,
  Calendar
} from 'lucide-react';

const LOGGER_COMPONENT_NAME = 'LiveAttendanceDashboard';

interface LiveAttendanceDashboardProps {
  eventId: string;
  eventName: string;
  eventStartTime: string;
  eventEndTime: string;
  userRole: 'admin' | 'speaker' | 'attendee';
}

export function LiveAttendanceDashboard({ 
  eventId, 
  eventName, 
  eventStartTime, 
  eventEndTime,
  userRole 
}: LiveAttendanceDashboardProps) {
  const logger = useLogger();
  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [speakerAttendanceData, setSpeakerAttendanceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadAttendanceData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load attendee attendance data
      const attendeeData = await attendanceApiClient.getLiveAttendance(eventId);
      setAttendanceData(attendeeData);

      // Load speaker attendance data if user is admin or speaker
      if (userRole === 'admin' || userRole === 'speaker') {
        try {
          const speakerData = await attendanceApiClient.getSpeakerAttendance(eventId);
          setSpeakerAttendanceData(speakerData);
        } catch (speakerError) {
          logger.warn(LOGGER_COMPONENT_NAME, 'Failed to load speaker attendance data', speakerError as Error);
        }
      }

      setLastUpdated(new Date());
      logger.info(LOGGER_COMPONENT_NAME, 'Attendance data loaded successfully', { 
        eventId, 
        attendeeCount: attendeeData.totalAttended,
        speakerCount: speakerAttendanceData?.totalSpeakersJoined || 0
      });

    } catch (error) {
      setError('Failed to load attendance data');
      logger.error(LOGGER_COMPONENT_NAME, 'Error loading attendance data', error as Error, { eventId });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendanceData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadAttendanceData, 30000);
    
    return () => clearInterval(interval);
  }, [eventId, userRole]);

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const formatEventTime = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    const startTimeStr = start.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    const endTimeStr = end.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    
    return `${startTimeStr} - ${endTimeStr}`;
  };

  const getEventStatus = () => {
    const now = new Date();
    const startTime = new Date(eventStartTime);
    const endTime = new Date(eventEndTime);

    if (now < startTime) {
      return { status: 'upcoming', color: 'bg-yellow-100 text-yellow-800', icon: Clock };
    } else if (now >= startTime && now <= endTime) {
      return { status: 'live', color: 'bg-green-100 text-green-800', icon: CheckCircle };
    } else {
      return { status: 'ended', color: 'bg-gray-100 text-gray-800', icon: AlertCircle };
    }
  };

  const eventStatus = getEventStatus();
  const StatusIcon = eventStatus.icon;

  if (loading && !attendanceData) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading attendance data...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={loadAttendanceData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Event Status Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{eventName}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4" />
                {formatEventTime(eventStartTime, eventEndTime)}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={eventStatus.color}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {eventStatus.status.toUpperCase()}
              </Badge>
              <Button 
                onClick={loadAttendanceData} 
                size="sm" 
                variant="outline"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        </CardHeader>
      </Card>

      {/* Attendee Attendance */}
      {attendanceData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Attendee Attendance
            </CardTitle>
            <CardDescription>
              {attendanceData.totalAttended} of {attendanceData.totalRegistered} attendees joined
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Attendance Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span>Attendance Rate</span>
                <span>{attendanceData.attendancePercentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-green-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${attendanceData.attendancePercentage}%` }}
                ></div>
              </div>
            </div>

            {/* Attendee List (Admin/Speaker only) */}
            {(userRole === 'admin' || userRole === 'speaker') && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Attendees ({attendanceData.attendees.length})</h4>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {attendanceData.attendees.map((attendee: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-600" />
                        <div>
                          <div className="text-sm font-medium">{attendee.userName}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {attendee.userEmail}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        Joined: {formatTime(attendee.joinedAt)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Speaker Attendance (Admin/Speaker only) */}
      {speakerAttendanceData && (userRole === 'admin' || userRole === 'speaker') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Speaker Attendance
            </CardTitle>
            <CardDescription>
              {speakerAttendanceData.totalSpeakersJoined} of {speakerAttendanceData.totalSpeakersInvited} speakers joined
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Speakers ({speakerAttendanceData.speakers.length})</h4>
              <div className="space-y-2">
                {speakerAttendanceData.speakers.map((speaker: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-600" />
                      <div>
                        <div className="text-sm font-medium">{speaker.speakerName}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {speaker.speakerEmail}
                        </div>
                        {speaker.materialsSelected.length > 0 && (
                          <div className="text-xs text-blue-600">
                            {speaker.materialsSelected.length} materials selected
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {speaker.isAttended ? `Joined: ${formatTime(speaker.joinedAt)}` : 'Not joined'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
