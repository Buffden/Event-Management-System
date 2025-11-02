'use client';

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
  Timer
} from 'lucide-react';

const LOGGER_COMPONENT_NAME = 'EventJoinButton';

interface EventJoinButtonProps {
  eventId: string;
  eventName: string;
  eventStartTime: string;
  eventEndTime: string;
  isBooked: boolean;
  onJoinSuccess?: () => void;
}

export function EventJoinButton({ 
  eventId, 
  eventName, 
  eventStartTime, 
  eventEndTime, 
  isBooked,
  onJoinSuccess 
}: EventJoinButtonProps) {
  const logger = useLogger();
  const [isJoining, setIsJoining] = useState(false);
  const [joinStatus, setJoinStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [joinMessage, setJoinMessage] = useState('');
  const [attendanceMetrics, setAttendanceMetrics] = useState<{
    totalAttended: number;
    totalRegistered: number;
    attendancePercentage: number;
  } | null>(null);
  const [canJoin, setCanJoin] = useState(false);
  const [timeUntilStart, setTimeUntilStart] = useState<string>('');

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
    const interval = setInterval(checkEventStatus, 1000); // Update every second

    return () => clearInterval(interval);
  }, [eventStartTime, eventEndTime]);

  // Load attendance metrics
  useEffect(() => {
    if (canJoin) {
      loadAttendanceMetrics();
    }
  }, [canJoin, eventId]);

  const loadAttendanceMetrics = async () => {
    try {
      const metrics = await attendanceApiClient.getAttendanceMetrics(eventId);
      setAttendanceMetrics(metrics);
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to load attendance metrics', error as Error);
    }
  };

  const handleJoinEvent = async () => {
    if (!isBooked) {
      setJoinMessage('You must be registered for this event to join');
      setJoinStatus('error');
      return;
    }

    setIsJoining(true);
    setJoinStatus('idle');

    try {
      const result = await attendanceApiClient.joinEvent(eventId);
      
      if (result.success) {
        setJoinStatus('success');
        setJoinMessage(result.message);
        logger.info(LOGGER_COMPONENT_NAME, 'Successfully joined event', { 
          eventId, 
          eventName,
          isFirstJoin: result.isFirstJoin 
        });
        
        // Refresh attendance metrics
        await loadAttendanceMetrics();
        
        // Notify parent component
        if (onJoinSuccess) {
          onJoinSuccess();
        }
      } else {
        setJoinStatus('error');
        setJoinMessage(result.message);
        logger.warn(LOGGER_COMPONENT_NAME, 'Failed to join event', { 
          eventId, 
          eventName,
          message: result.message 
        });
      }
    } catch (error) {
      setJoinStatus('error');
      setJoinMessage('Failed to join event. Please try again.');
      logger.error(LOGGER_COMPONENT_NAME, 'Error joining event', error as Error, { 
        eventId, 
        eventName 
      });
    } finally {
      setIsJoining(false);
    }
  };

  const formatEventTime = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    return `${formatLocalTime(start)} - ${formatLocalTime(end)}`;
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Play className="h-5 w-5" />
          Join Event
        </CardTitle>
        <CardDescription>
          {canJoin ? 'Event is live - you can join now!' : 'Event will start soon'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Event Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {canJoin ? (
              <Badge className="bg-green-600 text-white flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                LIVE
              </Badge>
            ) : (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {timeUntilStart}
              </Badge>
            )}
          </div>
          
          <div className="text-sm text-gray-600">
            {formatEventTime(eventStartTime, eventEndTime)}
          </div>
        </div>

        {/* Attendance Metrics */}
        {attendanceMetrics && canJoin && (
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium">Live Attendance</span>
            </div>
            <div className="text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Joined: {attendanceMetrics.totalAttended}</span>
                <span>Registered: {attendanceMetrics.totalRegistered}</span>
              </div>
              <div className="mt-1">
                <div className="flex justify-between text-xs">
                  <span>Attendance: {attendanceMetrics.attendancePercentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${attendanceMetrics.attendancePercentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Join Button */}
        <Button
          onClick={handleJoinEvent}
          disabled={!canJoin || !isBooked || isJoining}
          className={`w-full ${
            canJoin && isBooked 
              ? 'bg-green-600 hover:bg-green-700' 
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          {isJoining ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Joining...
            </>
          ) : !isBooked ? (
            <>
              <AlertCircle className="h-4 w-4 mr-2" />
              Register First
            </>
          ) : !canJoin ? (
            <>
              <Timer className="h-4 w-4 mr-2" />
              Event Not Started
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Join Event
            </>
          )}
        </Button>

        {/* Status Messages */}
        {joinMessage && (
          <div className={`text-sm p-2 rounded ${
            joinStatus === 'success' 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            {joinMessage}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
