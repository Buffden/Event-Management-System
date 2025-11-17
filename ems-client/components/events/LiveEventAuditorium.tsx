'use client';

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
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
import { useEffect, useState, useCallback, useRef } from "react";
import { useLogger } from "@/lib/logger/LoggerProvider";
import { eventAPI } from "@/lib/api/event.api";
import { AttendanceApiClient } from "@/lib/api/attendance.api";
import { EventResponse, EventStatus, SessionResponse } from "@/lib/api/types/event.types";
import { LiveAttendanceResponse, SpeakerAttendanceResponse } from "@/lib/api/attendance.api";
import { adminApiClient, SpeakerInvitation } from "@/lib/api/admin.api";
import { speakerApiClient, PresentationMaterial, SpeakerProfile } from "@/lib/api/speaker.api";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Mail, Clock as ClockIcon } from "lucide-react";

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
  const [selectedMaterials, setSelectedMaterials] = useState<Array<{
    material: PresentationMaterial;
    speakerId: string;
    speakerName: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Sessions and speakers state
  const [sessions, setSessions] = useState<SessionResponse[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [eventInvitations, setEventInvitations] = useState<SpeakerInvitation[]>([]);
  const [allSpeakers, setAllSpeakers] = useState<Array<{
    speaker: SpeakerProfile;
    session?: SessionResponse;
    invitation?: SpeakerInvitation;
    hasJoined?: boolean;
  }>>([]);
  const hasAttemptedAutoJoinRef = useRef(false);
  const previousMaterialIdsRef = useRef<Set<string>>(new Set());
  const loadedSessionsHashRef = useRef<string>('');
  const speakerAttendanceRef = useRef<SpeakerAttendanceResponse | null>(null);
  const loadedAttendanceEventIdRef = useRef<string>('');

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

  const loadEvent = useCallback(async () => {
    try {
      logger.info(LOGGER_COMPONENT_NAME, 'Loading event details', { eventId });
      const eventResponse = await eventAPI.getEventById(eventId);
      const event = eventResponse.data;

      // Check if event has expired
      const now = new Date();
      const eventEndDate = new Date(event.bookingEndDate);

      if (now > eventEndDate) {
        logger.warn(LOGGER_COMPONENT_NAME, 'Event has expired', {
          eventId,
          eventEndDate: event.bookingEndDate,
          currentTime: now.toISOString()
        });
        setError('This event has already ended. Live access is no longer available.');
        setEvent(event); // Still set event to show details
        return;
      }

      setEvent(event);
      setError(null);
    } catch (err) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to load event', err as Error);
      setError('Failed to load event details');
    }
  }, [eventId, logger]);

  const loadSessions = useCallback(async () => {
    try {
      setLoadingSessions(true);
      logger.debug(LOGGER_COMPONENT_NAME, 'Loading sessions', { eventId });

      const response = await eventAPI.listSessions(eventId);
      setSessions(response.data);

      logger.info(LOGGER_COMPONENT_NAME, 'Sessions loaded', { count: response.data.length });
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to load sessions', error as Error);
      // Don't set error state - sessions might not exist yet
    } finally {
      setLoadingSessions(false);
    }
  }, [eventId, logger]);

  const loadEventInvitations = useCallback(async () => {
    try {
      logger.debug(LOGGER_COMPONENT_NAME, 'Loading event invitations', { eventId });

      // Only load invitations if user is admin (for other roles, we'll use speakerAttendance data)
      if (userRole === 'ADMIN') {
        const invitations = await adminApiClient.getEventInvitations(eventId);
        setEventInvitations(invitations);
        logger.info(LOGGER_COMPONENT_NAME, 'Event invitations loaded', {
          eventId,
          count: invitations.length
        });
      }
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to load event invitations', error as Error);
      // Don't set error state - invitations might not exist yet
    }
  }, [eventId, userRole, logger]);

  const loadAllSpeakers = useCallback(async (currentSpeakerAttendance?: SpeakerAttendanceResponse | null) => {
    try {
      logger.debug(LOGGER_COMPONENT_NAME, 'Loading all speakers for sessions', { eventId });

      // Get all session speakers from all sessions
      const allSessionSpeakers: Array<{ speakerId: string; session: SessionResponse }> = [];
      sessions.forEach(session => {
        session.speakers.forEach(speaker => {
          allSessionSpeakers.push({
            speakerId: speaker.speakerId,
            session,
          });
        });
      });

      // Create invitation lookup map by sessionId and speakerId
      const invitationMap = new Map<string, SpeakerInvitation>();
      eventInvitations.forEach(invitation => {
        const key = invitation.sessionId
          ? `${invitation.sessionId}:${invitation.speakerId}`
          : `event-level:${invitation.speakerId}`;
        invitationMap.set(key, invitation);
      });

      // Create a map to track all session-speaker combinations
      const sessionSpeakerMap = new Map<string, { speakerId: string; session?: SessionResponse; invitation?: SpeakerInvitation }>();

      // Process all session speakers
      allSessionSpeakers.forEach(({ speakerId, session }) => {
        const key = session ? `${session.id}:${speakerId}` : `event-level:${speakerId}`;
        const invitation = invitationMap.get(key);
        sessionSpeakerMap.set(key, { speakerId, session, invitation });
      });

      // Also include event-level speakers (invited to event but not assigned to a session)
      eventInvitations.forEach(invitation => {
        if (!invitation.sessionId) {
          // This is an event-level invitation
          const key = `event-level:${invitation.speakerId}`;
          // Only add if not already in the map (to avoid duplicates)
          if (!sessionSpeakerMap.has(key)) {
            sessionSpeakerMap.set(key, {
              speakerId: invitation.speakerId,
              session: undefined,
              invitation
            });
          }
        }
      });

      // Also include speakers from currentSpeakerAttendance who have joined (even if not in sessions or invitations)
      if (currentSpeakerAttendance && currentSpeakerAttendance.speakers) {
        currentSpeakerAttendance.speakers.forEach(speaker => {
          const key = `event-level:${speaker.speakerId}`;
          // Only add if not already in the map
          if (!sessionSpeakerMap.has(key)) {
            sessionSpeakerMap.set(key, {
              speakerId: speaker.speakerId,
              session: undefined,
              invitation: undefined
            });
          }
        });
      }

      // If no speakers found at all, return empty array
      if (sessionSpeakerMap.size === 0) {
        setAllSpeakers([]);
        return;
      }

      // Create a map of joined speaker IDs from current speaker attendance (if available)
      const joinedSpeakerIds = new Set<string>();
      if (currentSpeakerAttendance && currentSpeakerAttendance.speakers) {
        currentSpeakerAttendance.speakers.forEach(speaker => {
          if (speaker.isAttended) {
            joinedSpeakerIds.add(speaker.speakerId);
          }
        });
      }

      // Fetch speaker profiles for all session-speaker combinations
      const speakersWithInfo = await Promise.all(
        Array.from(sessionSpeakerMap.values()).map(async ({ speakerId, session, invitation }) => {
          try {
            let speaker: SpeakerProfile;
            if (userRole === 'ADMIN') {
              speaker = await adminApiClient.getSpeakerProfile(speakerId);
            } else {
              // For non-admin users, try to get speaker info from speakerAttendance
              const speakerData = currentSpeakerAttendance?.speakers.find(s => s.speakerId === speakerId);
              if (speakerData) {
                speaker = {
                  id: speakerId,
                  userId: '',
                  name: speakerData.speakerName || 'Speaker',
                  email: speakerData.speakerEmail,
                  bio: null,
                  expertise: [],
                  isAvailable: true,
                  createdAt: '',
                  updatedAt: '',
                } as SpeakerProfile;
              } else {
                // Fallback: create a minimal speaker profile
                speaker = {
                  id: speakerId,
                  userId: '',
                  name: 'Speaker',
                  email: '',
                  bio: null,
                  expertise: [],
                  isAvailable: true,
                  createdAt: '',
                  updatedAt: '',
                } as SpeakerProfile;
              }
            }

            // Check join status from current speaker attendance data
            const hasJoined = joinedSpeakerIds.has(speakerId);

            return {
              speaker,
              session: session || undefined,
              invitation: invitation || undefined,
              hasJoined, // Set join status immediately from current speaker attendance
            };
          } catch (error) {
            logger.warn(LOGGER_COMPONENT_NAME, 'Failed to load speaker profile', {
              speakerId,
              error
            });
            return null;
          }
        })
      );

      // Filter out any null results
      const validSpeakers = speakersWithInfo.filter((item): item is NonNullable<typeof item> => item !== null);

      // Log join status for debugging
      const joinedCount = validSpeakers.filter(s => s.hasJoined).length;
      logger.info(LOGGER_COMPONENT_NAME, 'All speakers loaded for sessions', {
        eventId,
        count: validSpeakers.length,
        joinedCount,
        sessionsCount: sessions.length,
        hasSpeakerAttendance: !!currentSpeakerAttendance,
        speakerAttendanceCount: currentSpeakerAttendance?.speakers?.length || 0
      });

      setAllSpeakers(validSpeakers);
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to load all speakers for sessions', error as Error);
      setAllSpeakers([]);
    }
  }, [sessions, eventInvitations, userRole, eventId, logger]);

  // Update join status for speakers without re-fetching profiles
  const updateSpeakerJoinStatus = useCallback(() => {
    if (!speakerAttendance || !speakerAttendance.speakers) {
      return;
    }

    setAllSpeakers(prevSpeakers => {
      // Create a map of joined speaker IDs
      const joinedSpeakerIds = new Set<string>();
      speakerAttendance.speakers.forEach(speaker => {
        if (speaker.isAttended) {
          joinedSpeakerIds.add(speaker.speakerId);
        }
      });

      logger.debug(LOGGER_COMPONENT_NAME, 'Updating speaker join status', {
        joinedSpeakerIds: Array.from(joinedSpeakerIds),
        prevSpeakersCount: prevSpeakers.length,
        speakerAttendanceCount: speakerAttendance.speakers.length
      });

      // Only update if join status has changed
      const hasChanges = prevSpeakers.some(speaker =>
        speaker.hasJoined !== joinedSpeakerIds.has(speaker.speaker.id)
      );

      if (!hasChanges) {
        logger.debug(LOGGER_COMPONENT_NAME, 'No join status changes detected');
        return prevSpeakers; // No changes, return same reference
      }

      // Update join status
      const updatedSpeakers = prevSpeakers.map(speaker => {
        const hasJoined = joinedSpeakerIds.has(speaker.speaker.id);
        return {
          ...speaker,
          hasJoined
        };
      });

      const updatedJoinedCount = updatedSpeakers.filter(s => s.hasJoined).length;
      logger.info(LOGGER_COMPONENT_NAME, 'Speaker join status updated', {
        totalSpeakers: updatedSpeakers.length,
        joinedCount: updatedJoinedCount,
        joinedSpeakerIds: Array.from(joinedSpeakerIds)
      });

      return updatedSpeakers;
    });
  }, [speakerAttendance, logger]);

  const loadAllSpeakerMaterials = useCallback(async (joinedSpeakers: Array<{
    speakerId: string;
    speakerName: string;
    speakerEmail: string;
    materialsSelected: string[];
    isAttended: boolean;
    joinedAt?: string;
  }>) => {
    try {
      const token = attendanceAPI.getToken();

      // Collect all unique material IDs with their speaker information
      const materialSpeakerMap = new Map<string, Array<{ speakerId: string; speakerName: string }>>();

      joinedSpeakers.forEach(speaker => {
        speaker.materialsSelected.forEach(materialId => {
          if (!materialSpeakerMap.has(materialId)) {
            materialSpeakerMap.set(materialId, []);
          }
          materialSpeakerMap.get(materialId)!.push({
            speakerId: speaker.speakerId,
            speakerName: speaker.speakerName || 'Speaker'
          });
        });
      });

      // Get all unique material IDs
      const allMaterialIds = Array.from(materialSpeakerMap.keys());
      const currentMaterialIdsSet = new Set(allMaterialIds);

      // Check if material IDs have changed - if not, skip fetching
      const previousIds = previousMaterialIdsRef.current;
      const idsChanged =
        previousIds.size !== currentMaterialIdsSet.size ||
        !Array.from(currentMaterialIdsSet).every(id => previousIds.has(id));

      if (!idsChanged && previousIds.size > 0) {
        // Material IDs haven't changed, no need to re-fetch
        logger.debug(LOGGER_COMPONENT_NAME, 'Material IDs unchanged, skipping fetch', {
          materialCount: allMaterialIds.length
        });
        return;
      }

      // Update the ref with current material IDs
      previousMaterialIdsRef.current = currentMaterialIdsSet;

      if (allMaterialIds.length === 0) {
        setSelectedMaterials([]);
        previousMaterialIdsRef.current = new Set();
        return;
      }

      // Load all materials
      const materialPromises = allMaterialIds.map(async (materialId) => {
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
          const material = result.data || null;

          if (material) {
            // Get speaker info for this material
            const speakers = materialSpeakerMap.get(materialId) || [];
            // For each speaker that selected this material, create an entry
            return speakers.map(speaker => ({
              material,
              speakerId: speaker.speakerId,
              speakerName: speaker.speakerName
            }));
          }

          return null;
        } catch (err) {
          logger.warn(LOGGER_COMPONENT_NAME, 'Failed to load material', err as Error);
          return null;
        }
      });

      const materialResults = await Promise.all(materialPromises);

      // Flatten the results (each material might be associated with multiple speakers)
      const allMaterials: Array<{
        material: PresentationMaterial;
        speakerId: string;
        speakerName: string;
      }> = [];

      materialResults.forEach(result => {
        if (result && Array.isArray(result)) {
          allMaterials.push(...result);
        }
      });

      // Deduplicate: if same material is selected by multiple speakers, we show it once per speaker
      // Deduplicate by material ID + speaker ID to avoid duplicates
      const uniqueMaterials = new Map<string, {
        material: PresentationMaterial;
        speakerId: string;
        speakerName: string;
      }>();

      allMaterials.forEach(item => {
        const key = `${item.material.id}-${item.speakerId}`;
        if (!uniqueMaterials.has(key)) {
          uniqueMaterials.set(key, item);
        }
      });

      setSelectedMaterials(Array.from(uniqueMaterials.values()));

      logger.info(LOGGER_COMPONENT_NAME, 'All speaker materials loaded', {
        eventId,
        totalMaterials: uniqueMaterials.size,
        joinedSpeakersCount: joinedSpeakers.length
      });
    } catch (err) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to load all speaker materials', err as Error);
      setSelectedMaterials([]);
      previousMaterialIdsRef.current = new Set();
    }
  }, [eventId, logger, attendanceAPI]);

  const loadSpeakerAttendanceForAll = useCallback(async () => {
    // Load speaker attendance for all roles (to show speaker join status)
    try {
      // Try to load speaker attendance - all authenticated users can now access it
      const speakerData = await attendanceAPI.getSpeakerAttendance(eventId).catch(() => null);
      setSpeakerAttendance(speakerData);
      // Also update the ref for use in loadAllSpeakers
      speakerAttendanceRef.current = speakerData;

      // Update speaker info from speaker attendance data
      if (speakerData) {
        await loadSpeakerInfo(eventId, speakerData);
      }

      // Load selected materials from ALL joined speakers
      if (speakerData && speakerData.speakers.length > 0) {
        const joinedSpeakers = speakerData.speakers.filter(s => s.isAttended);
        if (joinedSpeakers.length > 0) {
          await loadAllSpeakerMaterials(joinedSpeakers);
        } else {
          // Clear materials if no speaker joined or no materials selected
          setSelectedMaterials([]);
          previousMaterialIdsRef.current = new Set();
        }
      } else {
        setSelectedMaterials([]);
        previousMaterialIdsRef.current = new Set();
      }
    } catch (err) {
      logger.warn(LOGGER_COMPONENT_NAME, 'Failed to load speaker attendance data', err as Error);
      // Don't fail the whole page - clear materials and continue
      setSelectedMaterials([]);
      previousMaterialIdsRef.current = new Set();
      speakerAttendanceRef.current = null;
    }
  }, [eventId, logger, attendanceAPI, loadAllSpeakerMaterials]);

  const loadAttendance = useCallback(async () => {
    if (!event) return;

    // Load speaker attendance for all roles
    await loadSpeakerAttendanceForAll();

    // Load detailed attendance data only for ADMIN and SPEAKER roles
    if (userRole !== 'ADMIN' && userRole !== 'SPEAKER') return;

    try {
      logger.debug(LOGGER_COMPONENT_NAME, 'Loading attendance data', { eventId });
      const attendanceData = await attendanceAPI.getLiveAttendance(eventId);
      setAttendance(attendanceData);
      logger.debug(LOGGER_COMPONENT_NAME, 'Attendance data updated', {
        totalAttended: attendanceData.totalAttended,
        totalRegistered: attendanceData.totalRegistered,
        attendeesCount: attendanceData.attendees.length
      });
    } catch (err) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to load attendance data', err as Error);
    }
  }, [event, userRole, eventId, logger, attendanceAPI, loadSpeakerAttendanceForAll]);

  const refreshData = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadEvent(),
        loadAttendance(),
        loadSessions(),
        loadEventInvitations()
      ]);
      // Note: updateSpeakerJoinStatus will be called automatically via useEffect
      // when speakerAttendance state updates from loadAttendance
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Error refreshing data', error as Error);
    } finally {
      setRefreshing(false);
    }
  }, [loadEvent, loadAttendance, loadSessions, loadEventInvitations, logger]);

  // Auto-join attendees when they enter the auditorium
  const autoJoinEvent = useCallback(async () => {
    // Only auto-join for attendees (USER role)
    if (userRole !== 'USER' || hasAttemptedAutoJoinRef.current || !eventId) {
      return;
    }

    // Mark that we've attempted to join (even if it fails, don't retry immediately)
    hasAttemptedAutoJoinRef.current = true;

    try {
      logger.info(LOGGER_COMPONENT_NAME, 'Attempting to auto-join attendee to event', { eventId });

      const result = await attendanceAPI.joinEvent(eventId);

      if (result.success) {
        logger.info(LOGGER_COMPONENT_NAME, 'Attendee auto-joined event successfully', {
          eventId,
          isFirstJoin: result.isFirstJoin
        });
        // The auto-refresh interval (every 5 seconds) will pick up the change
        // for admins and speakers viewing the event
      } else {
        logger.warn(LOGGER_COMPONENT_NAME, 'Failed to auto-join attendee', {
          eventId,
          message: result.message
        });
        // Don't show error to user - they might have already joined or event hasn't started
      }
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Error auto-joining attendee to event', error as Error, { eventId });
      // Don't show error to user - they can still view the event
    }
  }, [userRole, eventId, logger, attendanceAPI]);

  useEffect(() => {
    // Reset refs when eventId changes
    loadedAttendanceEventIdRef.current = '';
    loadedSessionsHashRef.current = '';
    previousMaterialIdsRef.current = new Set();
    speakerAttendanceRef.current = null;
    hasAttemptedAutoJoinRef.current = false;

    const loadData = async () => {
      setLoading(true);
      await loadEvent();
      await loadSessions();
      await loadEventInvitations();
      setLoading(false);
    };

    loadData();
  }, [eventId, userRole, loadEvent, loadSessions, loadEventInvitations]);

  useEffect(() => {
    // Only load attendance if event is loaded and we haven't loaded it for this event yet
    if (event && event.id !== loadedAttendanceEventIdRef.current) {
      loadedAttendanceEventIdRef.current = event.id;

      // Auto-join attendees when they enter the auditorium
      // The backend will validate if the event has started
      if (userRole === 'USER') {
        autoJoinEvent();
      }
      loadAttendance();
    }
  }, [event, userRole, autoJoinEvent, loadAttendance]);

  // Load speakers only when sessions or invitations change (not when attendance changes)
  // Use a hash to track if sessions/invitations have actually changed
  useEffect(() => {
    // Create a hash from sessions and invitations to detect changes
    const sessionsHash = JSON.stringify({
      sessionIds: sessions.map(s => s.id).sort(),
      invitationIds: eventInvitations.map(i => i.id).sort()
    });

    // Only load speakers if the hash has changed (sessions or invitations changed)
    if (sessionsHash !== loadedSessionsHashRef.current) {
      if (sessions.length > 0) {
        // Use ref to get latest speakerAttendance without triggering re-runs
        loadAllSpeakers(speakerAttendanceRef.current);
        loadedSessionsHashRef.current = sessionsHash;
      } else {
        // Clear speakers if no sessions
        setAllSpeakers([]);
        loadedSessionsHashRef.current = '';
      }
    }
  }, [sessions, eventInvitations, loadAllSpeakers]);

  // Update speaker join status when attendance changes (without re-fetching profiles)
  // This ensures join status is updated even if speakerAttendance loads after speakers are loaded
  useEffect(() => {
    if (!speakerAttendance || !speakerAttendance.speakers || allSpeakers.length === 0) {
      return;
    }

    // Update join status for already-loaded speakers
    updateSpeakerJoinStatus();
  }, [speakerAttendance, allSpeakers.length, updateSpeakerJoinStatus]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="max-w-md mx-auto bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardContent className="text-center py-8">
              <RefreshCw className="h-12 w-12 text-blue-600 dark:text-blue-400 mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-semibold mb-2 text-slate-900 dark:text-white">Entering Auditorium...</h3>
              <p className="text-slate-600 dark:text-slate-400">Please wait...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="max-w-md mx-auto bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardContent className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-slate-900 dark:text-white">Error Loading Event</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">{error}</p>
              <Button
                onClick={() => {
                  if (userRole === 'ADMIN') {
                    router.push(`/dashboard/admin/events/${eventId}`);
                  } else if (userRole === 'SPEAKER') {
                    router.push(`/dashboard/speaker/events/${eventId}`);
                  } else {
                    router.push(`/dashboard/attendee/events/${eventId}`);
                  }
                }}
                variant="outline"
                className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
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

  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'just now';
    } else if (diffMins < 60) {
      return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    } else {
      // For longer periods, show the actual date
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const isEventStarted = new Date(event.bookingStartDate) <= new Date();
  const isEventEnded = new Date(event.bookingEndDate) <= new Date();

  // Separate attendees into joined and not joined
  const joinedAttendees = attendance?.attendees.filter(attendee => attendee.isAttended) || [];
  const notJoinedAttendees = attendance?.attendees.filter(attendee => !attendee.isAttended) || [];

  // Get speaker info from speaker attendance
  const speakerHasJoined = speakerAttendance?.speakers && speakerAttendance.speakers.length > 0 && speakerAttendance.speakers[0].isAttended;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                onClick={async () => {
                  // If speaker, call leave endpoint before navigating
                  if (userRole === 'SPEAKER') {
                    try {
                      await attendanceAPI.speakerLeaveEvent(eventId);
                      logger.info(LOGGER_COMPONENT_NAME, 'Speaker left event', { eventId });
                    } catch (error) {
                      logger.error(LOGGER_COMPONENT_NAME, 'Failed to leave event', error as Error, { eventId });
                      // Continue with navigation even if leave fails
                    }
                  }

                  // Navigate based on role
                  if (userRole === 'ADMIN') {
                    router.push(`/dashboard/admin/events/${eventId}`);
                  } else if (userRole === 'SPEAKER') {
                    router.push(`/dashboard/speaker/events/${eventId}`);
                  } else {
                    router.push(`/dashboard/attendee/events/${eventId}`);
                  }
                }}
                variant="ghost"
                size="sm"
                className="text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Exit Auditorium
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  🎭 Live Event Auditorium
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                  {event.name}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <ThemeToggle />
              <Button
                onClick={() => {
                  refreshData();
                }}
                disabled={refreshing}
                variant="outline"
                size="sm"
                className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                title="Refresh auditorium data"
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
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{event.name}</h2>
                    <div className="flex items-center space-x-4 text-slate-600 dark:text-slate-400">
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
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white">Event Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{event.description}</p>
              </CardContent>
            </Card>

            {/* Materials Section */}
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Event Materials
                  {selectedMaterials.length > 0 && (
                    <Badge className="ml-2 bg-blue-600 text-white">
                      {selectedMaterials.length} {selectedMaterials.length === 1 ? 'file' : 'files'}
                    </Badge>
                  )}
                </CardTitle>
                {selectedMaterials.length > 0 && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Materials from {new Set(selectedMaterials.map(m => m.speakerId)).size} {new Set(selectedMaterials.map(m => m.speakerId)).size === 1 ? 'speaker' : 'speakers'}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {isEventStarted ? (
                  selectedMaterials.length > 0 ? (
                    <div className="space-y-4">
                      {/* Group materials by speaker for better organization */}
                      {Array.from(new Set(selectedMaterials.map(m => m.speakerId))).map(speakerId => {
                        const speakerMaterials = selectedMaterials.filter(m => m.speakerId === speakerId);
                        const speakerName = speakerMaterials[0]?.speakerName || 'Speaker';
                        const uniqueSpeakers = new Set(selectedMaterials.map(m => m.speakerId)).size;
                        const showSpeakerHeader = uniqueSpeakers > 1;

                        return (
                          <div key={speakerId} className="space-y-2">
                            {showSpeakerHeader && (
                              <div className="flex items-center gap-2 mb-2">
                                <Crown className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                  {speakerName}
                                </p>
                                <Badge variant="outline" className="text-xs">
                                  {speakerMaterials.length} {speakerMaterials.length === 1 ? 'file' : 'files'}
                                </Badge>
                              </div>
                            )}
                            <div className={`space-y-2 ${showSpeakerHeader ? 'pl-4 border-l-2 border-slate-200 dark:border-slate-600' : ''}`}>
                              {speakerMaterials.map(({ material }) => (
                        <div
                                  key={`${material.id}-${speakerId}`}
                          className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                          <div className="flex items-center space-x-3 flex-1">
                            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            <div className="flex-1 min-w-0">
                              <p className="text-slate-900 dark:text-white font-medium truncate">{material.fileName}</p>
                              <p className="text-slate-600 dark:text-slate-400 text-sm">
                                {material.fileSize ? `${(material.fileSize / 1024).toFixed(2)} KB` : 'Unknown size'} • {material.mimeType || 'Unknown type'}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600"
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
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                      <p className="text-slate-400">
                        {speakerAttendance && speakerAttendance.speakers.some(s => s.isAttended)
                          ? 'No materials selected by speakers'
                          : 'Materials will be available when speakers join and select materials'}
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
              {/* Speakers List */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="text-slate-900 dark:text-white flex items-center justify-between">
                    <div className="flex items-center">
                      <Crown className="h-5 w-5 mr-2 text-yellow-500 dark:text-yellow-400" />
                      Speakers
                    </div>
                    {allSpeakers.length > 0 && (
                      <Badge variant="outline" className="ml-2">
                        {allSpeakers.length} {allSpeakers.length === 1 ? 'speaker' : 'speakers'}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingSessions ? (
                    <div className="text-center py-4">
                      <RefreshCw className="h-6 w-6 text-slate-400 dark:text-slate-500 mx-auto mb-2 animate-spin" />
                      <p className="text-slate-600 dark:text-slate-400 text-sm">Loading speakers...</p>
                    </div>
                  ) : allSpeakers.length > 0 ? (
                    <ScrollArea className="h-96">
                      <div className="space-y-3">
                        {allSpeakers.map(({ speaker, session, invitation, hasJoined }, index) => (
                          <div
                            key={invitation?.id || `${speaker.id}-${session?.id || 'event-level'}-${index}`}
                            className={`p-3 rounded-lg border ${
                              hasJoined
                                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700/30'
                                : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600'
                            }`}
                          >
                            <div className="flex items-start space-x-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white text-sm font-semibold">
                                  {speaker.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <p className="text-slate-900 dark:text-white font-medium text-sm truncate">
                                    {speaker.name}
                                  </p>
                                  {hasJoined && (
                                    <Badge className="bg-green-600 text-white text-xs">
                                      <CheckCircle className="h-2.5 w-2.5 mr-1" />
                        Joined
                      </Badge>
                    )}
                                  {!hasJoined && (
                                    <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300 text-xs">
                                      <XCircle className="h-2.5 w-2.5 mr-1" />
                        Not Joined
                      </Badge>
                    )}
                    </div>
                                <div className="space-y-1">
                                  <p className="text-slate-600 dark:text-slate-400 text-xs flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    <span className="truncate">{speaker.email}</span>
                                  </p>
                                  {session && (
                                    <div className="space-y-0.5">
                                      <p className="text-slate-700 dark:text-slate-300 text-xs font-medium truncate">
                                        {session.title}
                                      </p>
                                      <p className="text-slate-500 dark:text-slate-400 text-xs flex items-center gap-1">
                                        <ClockIcon className="h-3 w-3" />
                                        {new Date(session.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {new Date(session.endsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                      </p>
                    </div>
                                  )}
                                  {invitation && invitation.status === 'ACCEPTED' && !hasJoined && (
                                    <p className="text-xs text-yellow-600 dark:text-yellow-400">
                                      Accepted invitation
                                    </p>
                                  )}
                  </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-8">
                      <Crown className="h-12 w-12 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
                      <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">No speakers assigned</p>
                      <p className="text-xs text-slate-500 dark:text-slate-500">
                        Speakers assigned to sessions will appear here
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Attendance Stats - Show for ADMIN only */}
              {userRole === 'ADMIN' && (
                <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="text-slate-900 dark:text-white flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Attendance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {attendance ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700">
                          <UserCheck className="h-6 w-6 text-green-600 dark:text-green-400 mx-auto mb-1" />
                          <p className="text-lg font-bold text-green-600 dark:text-green-400">{attendance.totalAttended}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">Joined</p>
                        </div>
                        <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
                          <UserPlus className="h-6 w-6 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{attendance.totalRegistered}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">Registered</p>
                        </div>
                      </div>

                      <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-700">
                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{attendance.attendancePercentage}%</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">Attendance Rate</p>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <Users className="h-8 w-8 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
                      <p className="text-slate-600 dark:text-slate-400 text-sm">Loading attendance...</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              )}

              {/* People Who Joined - Show for ADMIN and SPEAKER only */}
              {(userRole === 'ADMIN' || userRole === 'SPEAKER') && (
                <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="text-slate-900 dark:text-white flex items-center justify-between">
                    <div className="flex items-center">
                      <UserCheck className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" />
                      Joined Attendees ({joinedAttendees.length})
                    </div>
                    <div
                      className="text-xs text-slate-500 dark:text-slate-400 cursor-help"
                      title="Shows attendees who joined the event. They may have left the page but are still counted as having joined."
                    >
                      <AlertCircle className="h-4 w-4" />
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {joinedAttendees.length > 0 ? (
                        joinedAttendees.map((attendee) => {
                          const joinedAt = attendee.joinedAt ? new Date(attendee.joinedAt) : null;
                          const timeAgo = joinedAt ? getTimeAgo(joinedAt) : null;

                          return (
                            <div key={attendee.userId} className="flex items-center space-x-3 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700/30">
                              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                {attendee.userName.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-slate-900 dark:text-white text-sm font-medium truncate">{attendee.userName}</p>
                                <p className="text-slate-600 dark:text-slate-400 text-xs truncate">{attendee.userEmail}</p>
                                {timeAgo && (
                                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                                    Joined {timeAgo}
                                  </p>
                                )}
                              </div>
                              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-4">
                          <UserCheck className="h-8 w-8 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
                          <p className="text-slate-600 dark:text-slate-400 text-sm">No one has joined yet</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
              )}

              {/* Other Registered Attendees - Show for ADMIN and SPEAKER only */}
              {(userRole === 'ADMIN' || userRole === 'SPEAKER') && (
                <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="text-slate-900 dark:text-white flex items-center">
                    <UserPlus className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                    Other Registered Attendees ({notJoinedAttendees.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {notJoinedAttendees.length > 0 ? (
                        notJoinedAttendees.map((attendee) => (
                          <div key={attendee.userId} className="flex items-center space-x-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700/30">
                            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                              {attendee.userName.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-slate-900 dark:text-white text-sm font-medium truncate">{attendee.userName}</p>
                              <p className="text-slate-600 dark:text-slate-400 text-xs truncate">{attendee.userEmail}</p>
                            </div>
                            <XCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4">
                          <UserPlus className="h-8 w-8 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
                          <p className="text-slate-600 dark:text-slate-400 text-sm">Everyone has joined!</p>
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
