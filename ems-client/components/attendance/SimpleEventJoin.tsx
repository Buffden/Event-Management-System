import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLogger } from '@/lib/logger/LoggerProvider';
import { attendanceApiClient } from '@/lib/api/attendance.api';
import { formatLocalTime, formatTimeDifference, getCurrentLocalTime } from '@/lib/utils/timezone';
import { useRouter } from 'next/navigation';
import {
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Play,
  CalendarDays,
  MapPin,
  Tag
} from 'lucide-react';

interface SimpleEventJoinProps {
  eventId: string;
  eventTitle: string;
  eventStartTime: string;
  eventEndTime: string;
  eventVenue: string;
  eventCategory: string;
  eventStatus: string;
  eventDescription: string;
  userRole: string;
}

const LOGGER_COMPONENT_NAME = 'SimpleEventJoin';

export const SimpleEventJoin: React.FC<SimpleEventJoinProps> = ({
  eventId,
  eventTitle,
  eventStartTime,
  eventEndTime,
  eventVenue,
  eventCategory,
  eventStatus,
  eventDescription,
  userRole,
}) => {
  const logger = useLogger();
  const router = useRouter();
  const [canJoin, setCanJoin] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [timeUntilStart, setTimeUntilStart] = useState<string>('');
  const [joinMessage, setJoinMessage] = useState('');

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

  // Fetch attendance count
  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const metrics = await attendanceApiClient.getAttendanceMetrics(eventId);
        setAttendanceCount(metrics.totalAttended);
      } catch (error) {
        logger.error(LOGGER_COMPONENT_NAME, 'Failed to fetch attendance metrics', error as Error);
      }
    };

    fetchAttendance();
    const interval = setInterval(fetchAttendance, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [eventId, logger]);

  const handleJoinEvent = async () => {
    setIsJoining(true);
    setJoinMessage('');
    
    try {
      let response;
      if (userRole === 'SPEAKER') {
        response = await attendanceApiClient.speakerJoinEvent(eventId);
      } else if (userRole === 'ADMIN') {
        response = await attendanceApiClient.adminJoinEvent(eventId);
      } else {
        response = await attendanceApiClient.joinEvent(eventId);
      }

      if (response.success) {
        setHasJoined(true);
        setJoinMessage(response.message);
        logger.info(LOGGER_COMPONENT_NAME, response.message, { eventId, userRole });
        
        // Refresh attendance count (don't let this fail the join)
        try {
          const metrics = await attendanceApiClient.getAttendanceMetrics(eventId);
          setAttendanceCount(metrics.totalAttended);
        } catch (metricsError) {
          logger.warn(LOGGER_COMPONENT_NAME, 'Failed to refresh attendance metrics, but join was successful', metricsError as Error);
          // Don't fail the join if metrics refresh fails
        }
        
        // Redirect to live auditorium after 2 seconds
        setTimeout(() => {
          if (userRole === 'ADMIN') {
            router.push(`/dashboard/admin/events/${eventId}/live`);
          } else if (userRole === 'SPEAKER') {
            router.push(`/dashboard/speaker/events/${eventId}/live`);
          } else {
            router.push(`/dashboard/attendee/events/${eventId}/live`);
          }
        }, 2000);
      } else {
        setJoinMessage(response.message);
        logger.warn(LOGGER_COMPONENT_NAME, `Failed to join event: ${response.message}`, { eventId, userRole });
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

  const getJoinButtonText = () => {
    if (hasJoined) return 'Joined ✓';
    if (userRole === 'SPEAKER') return 'Join as Speaker';
    if (userRole === 'ADMIN') return 'Join as Admin';
    return 'Join Event';
  };

  const getJoinButtonColor = () => {
    if (hasJoined) return 'bg-green-600 hover:bg-green-700';
    return 'bg-blue-600 hover:bg-blue-700';
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Play className="h-5 w-5 text-primary" />
          {eventTitle}
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
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Attendance Info */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{attendanceCount} people joined</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{timeUntilStart || 'Event active'}</span>
          </div>
        </div>

        {/* Event Description */}
        <div className="text-sm text-muted-foreground">
          <p>{eventDescription}</p>
        </div>

        {/* Join Button */}
        {eventStatus === 'PUBLISHED' && (
          <div className="space-y-2">
            {canJoin ? (
              <Button 
                onClick={handleJoinEvent} 
                disabled={isJoining || hasJoined} 
                className={`w-full ${getJoinButtonColor()} text-white`}
              >
                {isJoining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {getJoinButtonText()}
              </Button>
            ) : (
              <Button disabled className="w-full bg-gray-400 cursor-not-allowed">
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
            
            {/* Enter Auditorium Button */}
            {hasJoined && (
              <Button 
                onClick={() => {
                  if (userRole === 'ADMIN') {
                    router.push(`/dashboard/admin/events/${eventId}/live`);
                  } else if (userRole === 'SPEAKER') {
                    router.push(`/dashboard/speaker/events/${eventId}/live`);
                  } else {
                    router.push(`/dashboard/attendee/events/${eventId}/live`);
                  }
                }}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white mt-2"
              >
                🎭 Enter Auditorium
              </Button>
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
