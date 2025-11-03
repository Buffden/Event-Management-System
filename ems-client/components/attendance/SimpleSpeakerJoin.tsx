import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useLogger } from '@/lib/logger/LoggerProvider';
import { attendanceApiClient } from '@/lib/api/attendance.api';
import { speakerApiClient } from '@/lib/api/speaker.api';
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
  Upload,
  Search
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
  const router = useRouter();
  const [canJoin, setCanJoin] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [timeUntilStart, setTimeUntilStart] = useState<string>('');
  const [joinMessage, setJoinMessage] = useState('');
  const [hasAcceptedInvitation, setHasAcceptedInvitation] = useState(false);
  const [isCheckingInvitation, setIsCheckingInvitation] = useState(true);

  // Material selection state
  const [availableMaterials, setAvailableMaterials] = useState<any[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);
  const [materialsMessage, setMaterialsMessage] = useState('');
  const [invitationId, setInvitationId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

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

  // Check if speaker has accepted invitation for this event
  useEffect(() => {
    const checkAcceptedInvitation = async () => {
      if (!speakerId) {
        setIsCheckingInvitation(false);
        return;
      }

      try {
        setIsCheckingInvitation(true);
        // Get speaker profile from userId
        const speakerProfile = await speakerApiClient.getSpeakerProfile(speakerId);

        // Get all invitations for this speaker
        const invitations = await speakerApiClient.getSpeakerInvitations(speakerProfile.id);

        // Check if there's an accepted invitation for this event
        const acceptedInvitation = invitations.find(
          inv => inv.eventId === eventId && inv.status === 'ACCEPTED'
        );

        setHasAcceptedInvitation(!!acceptedInvitation);
        setProfileId(speakerProfile.id);
        if (acceptedInvitation) {
          setInvitationId(acceptedInvitation.id);
        }

        // Note: isAttended is not in the SpeakerInvitation type from the API
        // We'll check it separately if needed
      } catch (error) {
        logger.warn(LOGGER_COMPONENT_NAME, 'Failed to check accepted invitation', error as Error);
        setHasAcceptedInvitation(false);
      } finally {
        setIsCheckingInvitation(false);
      }
    };

    checkAcceptedInvitation();
  }, [eventId, speakerId, logger]);

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

  // Load available materials when profileId is available
  useEffect(() => {
    const loadMaterials = async () => {
      if (!profileId) return;

      setIsLoadingMaterials(true);
      try {
        // Get speaker materials
        const speakerMaterials = await speakerApiClient.getSpeakerMaterials(profileId);
        setAvailableMaterials(speakerMaterials);

        if (speakerMaterials.length === 0) {
          setMaterialsMessage('No materials available. Please upload materials first.');
        }
      } catch (error) {
        logger.error(LOGGER_COMPONENT_NAME, 'Failed to load materials', error as Error);
        setMaterialsMessage('Failed to load materials. Please try again.');
      } finally {
        setIsLoadingMaterials(false);
      }
    };

    loadMaterials();
  }, [profileId, logger]);

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
      // First, update materials if any are selected and we have invitationId
      if (selectedMaterials.length > 0 && invitationId) {
        try {
          await attendanceApiClient.updateMaterialsForEvent(invitationId, selectedMaterials);
          logger.info(LOGGER_COMPONENT_NAME, 'Materials updated for event', {
            eventId,
            invitationId,
            selectedMaterials
          });
        } catch (materialError) {
          logger.warn(LOGGER_COMPONENT_NAME, 'Failed to update materials, continuing with join', materialError as Error);
        }
      }

      // Join as speaker
      const response = await attendanceApiClient.speakerJoinEvent(eventId);

      logger.debug(LOGGER_COMPONENT_NAME, 'Join event response received', {
        response,
        hasSuccess: 'success' in response,
        successValue: response?.success,
        eventId
      });

      if (response && response.success === true) {
        setHasJoined(true);
        setJoinMessage(response.message || 'Successfully joined the event!');
        logger.info(LOGGER_COMPONENT_NAME, 'Speaker joined event successfully', {
          eventId,
          message: response.message
        });

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
          router.push(`/dashboard/speaker/events/${eventId}/live`);
        }, 2000);
      } else {
        const errorMsg = response?.message || 'Failed to join event. Please try again.';
        setJoinMessage(errorMsg);
        setHasJoined(false);
        logger.warn(LOGGER_COMPONENT_NAME, 'Failed to join event', {
          eventId,
          response,
          message: errorMsg
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while trying to join the event.';
      setJoinMessage(errorMessage);
      setHasJoined(false);
      logger.error(LOGGER_COMPONENT_NAME, 'Error joining event', error as Error, { eventId });
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
        {canJoin && !hasJoined && hasAcceptedInvitation && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Select Materials for This Event</span>
              </div>
            </div>

            {isLoadingMaterials ? (
              <div className="text-center py-4">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Loading materials...</p>
              </div>
            ) : availableMaterials.length === 0 ? (
              <div className="text-center p-4 border-2 border-dashed rounded-lg bg-yellow-50 dark:bg-yellow-950">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                  No materials available
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-3">
                  You must upload at least one material before joining an event
                </p>
                <Button
                  size="sm"
                  onClick={() => router.push('/dashboard/speaker?section=materials')}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Upload Materials
                </Button>
              </div>
            ) : (
              <>
                {/* Search Box */}
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search materials..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Materials List */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {availableMaterials
                    .filter(material =>
                      material.fileName.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((material) => (
                    <div key={material.id} className="flex items-center space-x-2 p-2 border rounded hover:bg-slate-50 dark:hover:bg-slate-800">
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

                {searchTerm && availableMaterials.filter(m => m.fileName.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                  <div className="text-center py-2 text-xs text-muted-foreground">
                    No materials found matching "{searchTerm}"
                  </div>
                )}

                {selectedMaterials.length > 0 && (
                  <div className="text-xs text-blue-600">
                    {selectedMaterials.length} material(s) selected
                  </div>
                )}
              </>
            )}

            {materialsMessage && !isLoadingMaterials && availableMaterials.length === 0 && (
              <div className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {materialsMessage}
              </div>
            )}
          </div>
        )}

        {/* Join Button - Only show if speaker has accepted invitation */}
        {eventStatus === 'PUBLISHED' && (
          <div className="space-y-2">
            {isCheckingInvitation ? (
              <Button disabled className="w-full bg-gray-400 cursor-not-allowed">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking invitation...
              </Button>
            ) : !hasAcceptedInvitation ? (
              <div className="text-center p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-950">
                <AlertCircle className="h-5 w-5 mx-auto mb-2 text-yellow-600" />
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  You must be invited and accept the invitation to join this event.
                </p>
              </div>
            ) : canJoin ? (
              <Button
                onClick={handleJoinEvent}
                disabled={isJoining || hasJoined || availableMaterials.length === 0 || (availableMaterials.length > 0 && selectedMaterials.length === 0)}
                className={`w-full ${
                  hasJoined
                    ? 'bg-green-600 hover:bg-green-700'
                    : (availableMaterials.length === 0 || (availableMaterials.length > 0 && selectedMaterials.length === 0))
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                } text-white`}
              >
                {isJoining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {hasJoined
                  ? 'Joined as Speaker ✓'
                  : availableMaterials.length === 0
                    ? 'Upload Materials First'
                    : (availableMaterials.length > 0 && selectedMaterials.length === 0)
                      ? 'Please Select Materials First'
                      : 'Join as Speaker'
                }
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

            {/* Material Selection Reminder */}
            {canJoin && !hasJoined && hasAcceptedInvitation && availableMaterials.length > 0 && selectedMaterials.length === 0 && (
              <div className="text-center text-xs text-orange-600 flex items-center justify-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Please select at least one material to join this event
              </div>
            )}

            {/* No Materials Warning */}
            {canJoin && !hasJoined && hasAcceptedInvitation && availableMaterials.length === 0 && !isLoadingMaterials && (
              <div className="text-center text-xs text-red-600 flex items-center justify-center gap-1">
                <AlertCircle className="h-3 w-3" />
                You must upload at least one presentation material before joining this event
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
