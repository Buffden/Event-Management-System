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
import { LiveAttendanceResponse, SpeakerAttendanceResponse } from "@/lib/api/attendance.api";
import { adminApiClient } from "@/lib/api/admin.api";
import { speakerApiClient, PresentationMaterial } from "@/lib/api/speaker.api";

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
  const [speakerAttendance, setSpeakerAttendance] = useState<SpeakerAttendanceResponse | null>(null);
  const [speakerInfo, setSpeakerInfo] = useState<{ name: string | null; email: string } | null>(null);
  const [selectedMaterials, setSelectedMaterials] = useState<PresentationMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Create API client instance
  const attendanceAPI = new AttendanceApiClient();

  const loadSpeakerInfo = async (eventId: string, speakerAttendanceData?: SpeakerAttendanceResponse | null) => {
    try {
      // Try to get speaker info from speaker attendance data first (for all roles)
      if (speakerAttendanceData && speakerAttendanceData.speakers.length > 0) {
        // Get the first joined speaker, or first speaker if none joined
        const speaker = speakerAttendanceData.speakers.find(s => s.isAttended) || speakerAttendanceData.speakers[0];
        setSpeakerInfo({
          name: speaker.speakerName || null,
          email: speaker.speakerEmail
        });
        logger.info(LOGGER_COMPONENT_NAME, 'Speaker info loaded from speaker attendance', {
          speakerId: speaker.speakerId,
          speakerName: speaker.speakerName
        });
        return;
      }

      // Fallback: Try to get speaker info from event (for all roles)
      // This is a last resort if speaker attendance data doesn't have the info
      if (!speakerInfo && event) {
        // Try using event speakerId if available
        if (event.speakerId) {
          // For non-admin users, we can't fetch speaker profile, so use a default
          if (userRole === 'ADMIN') {
            try {
              const invitations = await adminApiClient.getEventInvitations(eventId);
              const acceptedInvitation = invitations.find(inv => inv.status === 'ACCEPTED');
              
              if (acceptedInvitation) {
                const speakerProfile = await adminApiClient.getSpeakerProfile(acceptedInvitation.speakerId);
                setSpeakerInfo({
                  name: speakerProfile.name || null,
                  email: speakerProfile.email
                });
                logger.info(LOGGER_COMPONENT_NAME, 'Speaker info loaded from accepted invitation', {
                  speakerId: acceptedInvitation.speakerId,
                  speakerName: speakerProfile.name
                });
              }
            } catch (err) {
              logger.warn(LOGGER_COMPONENT_NAME, 'Failed to load speaker info from invitations', err as Error);
            }
          }
        }
      }
    } catch (err) {
      logger.warn(LOGGER_COMPONENT_NAME, 'Failed to load speaker info', err as Error);
      // Don't fail the whole page if speaker info fails
    }
  };

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

  const loadSpeakerAttendanceForAll = async () => {
    // Load speaker attendance for all roles (to show speaker join status)
    try {
      // Try to load speaker attendance - all authenticated users can now access it
      const speakerData = await attendanceAPI.getSpeakerAttendance(eventId).catch(() => null);
      setSpeakerAttendance(speakerData);
      
      // Update speaker info from speaker attendance data
      if (speakerData) {
        await loadSpeakerInfo(eventId, speakerData);
      }
      
      // Load selected materials if speaker has joined and selected materials
      if (speakerData && speakerData.speakers.length > 0) {
        const joinedSpeaker = speakerData.speakers.find(s => s.isAttended);
        if (joinedSpeaker && joinedSpeaker.materialsSelected.length > 0) {
          await loadMaterialDetails(joinedSpeaker.materialsSelected);
        } else {
          // Clear materials if no speaker joined or no materials selected
          setSelectedMaterials([]);
        }
      } else {
        setSelectedMaterials([]);
      }
    } catch (err) {
      logger.warn(LOGGER_COMPONENT_NAME, 'Failed to load speaker attendance data', err as Error);
      // Don't fail the whole page - clear materials and continue
      setSelectedMaterials([]);
    }
  };

  const loadAttendance = async () => {
    if (!event) return;
    
    // Load speaker attendance for all roles
    await loadSpeakerAttendanceForAll();
    
    // Load detailed attendance data only for ADMIN and SPEAKER roles
    if (userRole !== 'ADMIN' && userRole !== 'SPEAKER') return;
    
    try {
      logger.info(LOGGER_COMPONENT_NAME, 'Loading attendance data', { eventId });
      const attendanceData = await attendanceAPI.getLiveAttendance(eventId);
      setAttendance(attendanceData);
    } catch (err) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to load attendance data', err as Error);
    }
  };

  const loadMaterialDetails = async (materialIds: string[]) => {
    try {
      const token = attendanceAPI.getToken();
      const materialPromises = materialIds.map(async (materialId) => {
        try {
          const headers: HeadersInit = {
            'Content-Type': 'application/json'
          };
          // Only add auth header if token exists
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
          
          const response = await fetch(`/api/materials/${materialId}`, {
            headers
          });
          if (!response.ok) {
            logger.warn(LOGGER_COMPONENT_NAME, 'Failed to load material', { materialId, status: response.status });
            return null;
          }
          const result = await response.json();
          return result.data || null;
        } catch (err) {
          logger.warn(LOGGER_COMPONENT_NAME, 'Failed to load material', err as Error);
          return null;
        }
      });
      
      const materials = await Promise.all(materialPromises);
      setSelectedMaterials(materials.filter(m => m !== null) as PresentationMaterial[]);
    } catch (err) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to load material details', err as Error);
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
  }, [event, userRole]);

  // Auto-refresh attendance data every 15 seconds for live experience
  useEffect(() => {
    if (!event) return;
    
    const interval = setInterval(() => {
      loadAttendance();
    }, 15000);

    return () => clearInterval(interval);
  }, [event, userRole]);

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
  
  // Get speaker info from speaker attendance
  const speakerHasJoined = speakerAttendance?.speakers && speakerAttendance.speakers.length > 0 && speakerAttendance.speakers[0].isAttended;

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
                  {selectedMaterials.length > 0 && (
                    <Badge className="ml-2 bg-blue-600 text-white">
                      {selectedMaterials.length} {selectedMaterials.length === 1 ? 'file' : 'files'}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEventStarted ? (
                  selectedMaterials.length > 0 ? (
                    <div className="space-y-3">
                      {selectedMaterials.map((material) => (
                        <div
                          key={material.id}
                          className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg border border-slate-600 hover:bg-slate-700 transition-colors"
                        >
                          <div className="flex items-center space-x-3 flex-1">
                            <FileText className="h-5 w-5 text-blue-400" />
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-medium truncate">{material.fileName}</p>
                              <p className="text-slate-400 text-sm">
                                {material.fileSize ? `${(material.fileSize / 1024).toFixed(2)} KB` : 'Unknown size'} • {material.mimeType || 'Unknown type'}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-slate-600 text-slate-300 hover:bg-slate-600"
                            onClick={async () => {
                              try {
                                // Use the same download approach as the working dashboard implementation
                                const response = await fetch(`/api/materials/${material.id}/download`, {
                                  method: 'GET',
                                  headers: {
                                    'Authorization': `Bearer ${attendanceAPI.getToken()}`
                                  }
                                });
                                
                                if (!response.ok) {
                                  throw new Error(`Failed to download material: ${response.statusText}`);
                                }
                                
                                const blob = await response.blob();
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = material.fileName;
                                document.body.appendChild(a);
                                a.click();
                                window.URL.revokeObjectURL(url);
                                document.body.removeChild(a);
                              } catch (error) {
                                logger.error(LOGGER_COMPONENT_NAME, 'Failed to download material', error as Error);
                                alert('Failed to download material. Please try again.');
                              }
                            }}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                      <p className="text-slate-400">
                        {speakerAttendance && speakerAttendance.speakers.some(s => s.isAttended)
                          ? 'No materials selected by the speaker'
                          : 'Materials will be available when the speaker joins and selects materials'}
                      </p>
                    </div>
                  )
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
                  <CardTitle className="text-white flex items-center justify-between">
                    <div className="flex items-center">
                      <Crown className="h-5 w-5 mr-2 text-yellow-400" />
                      Speaker
                    </div>
                    {speakerAttendance && speakerAttendance.speakers.length > 0 && speakerAttendance.speakers.some(s => s.isAttended) && (
                      <Badge className="bg-green-600 text-white">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Joined
                      </Badge>
                    )}
                    {speakerAttendance && speakerAttendance.speakers.length > 0 && !speakerAttendance.speakers.some(s => s.isAttended) && (
                      <Badge className="bg-gray-600 text-white">
                        <XCircle className="h-3 w-3 mr-1" />
                        Not Joined
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {speakerInfo?.name ? speakerInfo.name.charAt(0).toUpperCase() : (event.speakerId ? event.speakerId.charAt(0).toUpperCase() : 'S')}
                    </div>
                    <div>
                      <p className="text-white font-medium">{speakerInfo?.name || 'Speaker'}</p>
                      <p className="text-slate-400 text-sm">{speakerInfo?.email || 'Main Speaker'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Attendance Stats - Show for ADMIN only */}
              {userRole === 'ADMIN' && (
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
              )}

              {/* People Who Joined - Show for ADMIN and SPEAKER only */}
              {(userRole === 'ADMIN' || userRole === 'SPEAKER') && (
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
              )}

              {/* Other Registered Attendees - Show for ADMIN and SPEAKER only */}
              {(userRole === 'ADMIN' || userRole === 'SPEAKER') && (
                <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <UserPlus className="h-5 w-5 mr-2 text-blue-400" />
                    Other Registered Attendees ({notJoinedAttendees.length})
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
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
