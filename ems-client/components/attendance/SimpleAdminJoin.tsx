import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLogger } from '@/lib/logger/LoggerProvider';
import { attendanceApiClient } from '@/lib/api/attendance.api';
import { formatLocalTime, formatTimeDifference, getCurrentLocalTime } from '@/lib/utils/timezone';
import {
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Play,
  CalendarDays,
  MapPin,
  Tag,
  BarChart3,
  Eye,
  RefreshCw
} from 'lucide-react';

interface SimpleAdminJoinProps {
  eventId: string;
  eventTitle: string;
  eventStartTime: string;
  eventEndTime: string;
  eventVenue: string;
  eventCategory: string;
  eventStatus: string;
  eventDescription: string;
}

const LOGGER_COMPONENT_NAME = 'SimpleAdminJoin';

export const SimpleAdminJoin: React.FC<SimpleAdminJoinProps> = ({
  eventId,
  eventTitle,
  eventStartTime,
  eventEndTime,
  eventVenue,
  eventCategory,
  eventStatus,
  eventDescription,
}) => {
  const logger = useLogger();
  const [canJoin, setCanJoin] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [timeUntilStart, setTimeUntilStart] = useState<string>('');
  const [joinMessage, setJoinMessage] = useState('');
  // Admin-only component; default to compact rendering to avoid duplication in parent card
  const compact = true;
  
  // Attendance overview state
  const [attendanceData, setAttendanceData] = useState({
    totalRegistered: 0,
    totalAttended: 0,
    attendancePercentage: 0,
    attendees: [] as any[]
  });
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);

  // Check if event has started and update join button state
  useEffect(() => {
    const checkEventStatus = () => {
      const now = getCurrentLocalTime();
      const startTime = new Date(eventStartTime);
      const endTime = new Date(eventEndTime);

      if (now >= startTime && now <= endTime) {
        setCanJoin(true);
        setTimeUntilStart('');
      } else if (now < startTime) {
        setCanJoin(false);
        setTimeUntilStart(formatTimeDifference(now, startTime));
      } else {
        setCanJoin(false);
        setTimeUntilStart('Event ended');
      }
    };

    checkEventStatus();
    const interval = setInterval(checkEventStatus, 1000);

    return () => clearInterval(interval);
  }, [eventStartTime, eventEndTime]);

  // Fetch attendance data
  const fetchAttendanceData = async () => {
    setIsLoadingAttendance(true);
    try {
      const data = await attendanceApiClient.getLiveAttendance(eventId);
      setAttendanceData(data);
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to fetch attendance data', error as Error);
    } finally {
      setIsLoadingAttendance(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
    const interval = setInterval(fetchAttendanceData, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [eventId, logger]);

  const handleJoinEvent = async () => {
    setIsJoining(true);
    setJoinMessage('');
    
    try {
      // Join as admin using admin-specific endpoint
      const response = await attendanceApiClient.adminJoinEvent(eventId);

      if (response.success) {
        setHasJoined(true);
        setJoinMessage(response.message);
        logger.info(LOGGER_COMPONENT_NAME, response.message, { eventId });
        
        // Refresh attendance data
        await fetchAttendanceData();
      } else {
        setJoinMessage(response.message);
        logger.warn(LOGGER_COMPONENT_NAME, `Failed to join event: ${response.message}`, { eventId });
      }
    } catch (error) {
      setJoinMessage('An error occurred while trying to join the event.');
      logger.error(LOGGER_COMPONENT_NAME, 'Error joining event', error as Error);
    } finally {
      setIsJoining(false);
    }
  };

  const formatEventTime = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    return `${formatLocalTime(start)} - ${formatLocalTime(end)}`;
  };

  const formatJoinTime = (joinTime: string) => {
    return formatLocalTime(new Date(joinTime));
  };

  return (
    <Card className={`w-full ${compact ? '' : 'max-w-2xl mx-auto'}`}>
      <CardHeader className={compact ? 'pb-2 pt-3' : 'pb-3'}>
        {!compact && (
          <>
            <CardTitle className="text-lg flex items-center gap-2">
              <Play className="h-5 w-5 text-primary" />
              {eventTitle} - Admin View
            </CardTitle>
            <CardDescription className="flex items-center gap-1">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              {formatEventTime(eventStartTime, eventEndTime)}
            </CardDescription>
            <CardDescription className="flex items-center gap-1">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              {eventVenue}
            </CardDescription>
            <CardDescription className="flex items-center gap-1">
              <Tag className="h-4 w-4 text-muted-foreground" />
              {eventCategory}
            </CardDescription>
          </>
        )}
        {compact && (
          <CardTitle className="text-base flex items-center gap-2">
            <Play className="h-4 w-4 text-primary" />
            Live Event - Admin View
          </CardTitle>
        )}
      </CardHeader>
      
      <CardContent className={compact ? 'space-y-3 pt-0' : 'space-y-4'}>
        {/* Event Description - Only show in full view */}
        {!compact && (
          <div className="text-sm text-muted-foreground">
            <p>{eventDescription}</p>
          </div>
        )}

        {/* Attendance Overview */}
        <div className={compact ? 'space-y-2' : 'space-y-3'}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} text-muted-foreground`} />
              <span className={`${compact ? 'text-xs' : 'text-sm'} font-medium`}>Attendance Overview</span>
            </div>
            <Button
              variant="outline"
              size={compact ? 'sm' : 'sm'}
              onClick={fetchAttendanceData}
              disabled={isLoadingAttendance}
              className={compact ? 'h-7 px-2' : ''}
            >
              {isLoadingAttendance ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
            </Button>
          </div>

          <div className={`grid grid-cols-3 gap-4 p-3 bg-gray-50 rounded-lg ${compact ? 'p-2 gap-2' : ''}`}>
            <div className="text-center">
              <div className={`${compact ? 'text-xl' : 'text-2xl'} font-bold text-blue-600`}>
                {attendanceData.totalRegistered}
              </div>
              <div className="text-xs text-muted-foreground">Registered</div>
            </div>
            <div className="text-center">
              <div className={`${compact ? 'text-xl' : 'text-2xl'} font-bold text-green-600`}>
                {attendanceData.totalAttended}
              </div>
              <div className="text-xs text-muted-foreground">Attended</div>
            </div>
            <div className="text-center">
              <div className={`${compact ? 'text-xl' : 'text-2xl'} font-bold text-purple-600`}>
                {attendanceData.attendancePercentage.toFixed(0)}%
              </div>
              <div className="text-xs text-muted-foreground">Rate</div>
            </div>
          </div>

          {/* Recent Attendees - Hide in compact mode or show fewer */}
          {attendanceData.attendees.length > 0 && !compact && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Recent Attendees</span>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {attendanceData.attendees.slice(0, 5).map((attendee, index) => (
                  <div key={index} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span className="font-medium">{attendee.userName || 'User'}</span>
                    </div>
                    <span className="text-muted-foreground">
                      {formatJoinTime(attendee.joinedAt)}
                    </span>
                  </div>
                ))}
                {attendanceData.attendees.length > 5 && (
                  <div className="text-xs text-muted-foreground text-center py-1">
                    +{attendanceData.attendees.length - 5} more attendees
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Join Button */}
        {eventStatus === 'PUBLISHED' && (
          <div className={compact ? 'space-y-1' : 'space-y-2'}>
            {canJoin ? (
              <Button 
                onClick={handleJoinEvent} 
                disabled={isJoining || hasJoined} 
                size={compact ? 'sm' : 'default'}
                className={`w-full ${hasJoined ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
              >
                {isJoining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {hasJoined ? 'Joined as Admin ✓' : 'Join as Admin'}
              </Button>
            ) : (
              <Button disabled size={compact ? 'sm' : 'default'} className="w-full bg-gray-400 cursor-not-allowed">
                {timeUntilStart || 'Event Not Started'}
              </Button>
            )}
            
            {/* Join Status Message */}
            {joinMessage && (
              <div className={`text-center text-sm flex items-center justify-center gap-1 ${
                hasJoined ? 'text-green-600' : 'text-red-600'
              }`}>
                {hasJoined ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                {joinMessage}
              </div>
            )}
          </div>
        )}

        {/* Event Status Badge */}
        {eventStatus !== 'PUBLISHED' && (
          <Badge variant="secondary" className="w-fit px-3 py-1 text-sm">
            Event Status: {eventStatus.replace(/_/g, ' ')}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
};
