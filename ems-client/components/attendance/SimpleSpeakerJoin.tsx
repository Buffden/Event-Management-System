import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  FileText,
  Upload
} from 'lucide-react';

interface SimpleSpeakerJoinProps {
  eventId: string;
  eventTitle: string;
  eventStartTime: string;
  eventEndTime: string;
  eventVenue: string;
  eventCategory: string;
  eventStatus: string;
  eventDescription: string;
  speakerId: string;
}

const LOGGER_COMPONENT_NAME = 'SimpleSpeakerJoin';

export const SimpleSpeakerJoin: React.FC<SimpleSpeakerJoinProps> = ({
  eventId,
  eventTitle,
  eventStartTime,
  eventEndTime,
  eventVenue,
  eventCategory,
  eventStatus,
  eventDescription,
  speakerId,
}) => {
  const logger = useLogger();
  const [canJoin, setCanJoin] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [timeUntilStart, setTimeUntilStart] = useState<string>('');
  const [joinMessage, setJoinMessage] = useState('');
  
  // Material selection state
  const [availableMaterials, setAvailableMaterials] = useState<any[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);
  const [materialsMessage, setMaterialsMessage] = useState('');

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
    const interval = setInterval(fetchAttendance, 5000);

    return () => clearInterval(interval);
  }, [eventId, logger]);

  // Load available materials (simplified - we'll implement this later)
  useEffect(() => {
    // For now, just show a placeholder
    setAvailableMaterials([
      { id: '1', fileName: 'Presentation Slides.pdf', fileSize: 2048000 },
      { id: '2', fileName: 'Handout.docx', fileSize: 512000 },
      { id: '3', fileName: 'Video Demo.mp4', fileSize: 15728640 }
    ]);
  }, []);

  const handleMaterialToggle = (materialId: string) => {
    setSelectedMaterials(prev => 
      prev.includes(materialId) 
        ? prev.filter(id => id !== materialId)
        : [...prev, materialId]
    );
  };

  const handleJoinEvent = async () => {
    setIsJoining(true);
    setJoinMessage('');
    
    try {
      // First, update materials if any are selected
      if (selectedMaterials.length > 0) {
        // For now, we'll skip material update since we need invitation ID
        // This will be implemented when we integrate with speaker invitations
        logger.info(LOGGER_COMPONENT_NAME, 'Materials selected for event', { 
          eventId, 
          selectedMaterials 
        });
      }

      // Join as speaker
      const response = await attendanceApiClient.speakerJoinEvent(eventId);

      if (response.success) {
        setHasJoined(true);
        setJoinMessage(response.message);
        logger.info(LOGGER_COMPONENT_NAME, response.message, { eventId });
        
        // Refresh attendance count
        const metrics = await attendanceApiClient.getAttendanceMetrics(eventId);
        setAttendanceCount(metrics.totalAttended);
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Play className="h-5 w-5 text-primary" />
          {eventTitle} - Speaker View
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

        {/* Material Selection */}
        {canJoin && !hasJoined && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Select Materials for This Event</span>
            </div>
            
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {availableMaterials.map((material) => (
                <div key={material.id} className="flex items-center space-x-2 p-2 border rounded">
                  <Checkbox
                    id={material.id}
                    checked={selectedMaterials.includes(material.id)}
                    onCheckedChange={() => handleMaterialToggle(material.id)}
                  />
                  <label 
                    htmlFor={material.id}
                    className="text-sm flex-1 cursor-pointer"
                  >
                    <div className="font-medium">{material.fileName}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatFileSize(material.fileSize)}
                    </div>
                  </label>
                </div>
              ))}
            </div>
            
            {selectedMaterials.length > 0 && (
              <div className="text-xs text-blue-600">
                {selectedMaterials.length} material(s) selected
              </div>
            )}
          </div>
        )}

        {/* Join Button */}
        {eventStatus === 'PUBLISHED' && (
          <div className="space-y-2">
            {canJoin ? (
              <Button 
                onClick={handleJoinEvent} 
                disabled={isJoining || hasJoined} 
                className={`w-full ${hasJoined ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
              >
                {isJoining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {hasJoined ? 'Joined as Speaker ✓' : 'Join as Speaker'}
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
