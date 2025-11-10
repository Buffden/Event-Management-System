'use client';

import { useEffect, useMemo, useState } from "react";
import { useLogger } from "@/lib/logger/LoggerProvider";
import { eventAPI } from "@/lib/api/event.api";
import {
  CreateSessionRequest,
  SessionResponse,
  SessionSpeakerAssignRequest,
  SessionSpeakerResponse,
  SessionSpeakerUpdateRequest,
  UpdateSessionRequest,
} from "@/lib/api/types/event.types";
import { adminApiClient, SpeakerInvitation } from "@/lib/api/admin.api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Calendar,
  Users,
  Clock,
  MapPin,
  Loader2,
  Pencil,
  Trash,
  UserPlus,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { SessionFormModal } from "./sessions/SessionFormModal";
import { SessionSpeakerModal } from "./sessions/SessionSpeakerModal";
import { ConfirmDialog } from "./sessions/ConfirmDialog";

interface SessionsPanelProps {
  eventId: string;
  disabled?: boolean;
}

type SessionModalMode = "create" | "edit";

export function SessionsPanel({ eventId, disabled }: SessionsPanelProps) {
  const logger = useLogger();

  const [sessions, setSessions] = useState<SessionResponse[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<SpeakerInvitation[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);

  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [sessionModalMode, setSessionModalMode] = useState<SessionModalMode>("create");
  const [sessionDraft, setSessionDraft] = useState<Partial<CreateSessionRequest & UpdateSessionRequest>>({});
  const [sessionEditingId, setSessionEditingId] = useState<string | null>(null);

  const [isSpeakerModalOpen, setIsSpeakerModalOpen] = useState(false);
  const [speakerModalSessionId, setSpeakerModalSessionId] = useState<string | null>(null);
  const [speakerAssignmentDraft, setSpeakerAssignmentDraft] = useState<Partial<SessionSpeakerAssignRequest & SessionSpeakerUpdateRequest>>({});
  const [speakerEditingId, setSpeakerEditingId] = useState<string | null>(null);

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<{
    sessionId?: string;
    speakerId?: string;
    title: string;
    description: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  const hasSessions = useMemo(() => sessions.length > 0, [sessions]);

  const loadSessions = async () => {
    try {
      setLoadingSessions(true);
      setSessionsError(null);
      logger.debug("SessionsPanel", "Loading sessions", { eventId });

      const response = await eventAPI.listSessions(eventId);
      setSessions(response.data);

      logger.info("SessionsPanel", "Sessions loaded", { count: response.data.length });
    } catch (error) {
      logger.error("SessionsPanel", "Failed to load sessions", error as Error);
      setSessionsError("Failed to load sessions. Please try again.");
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    if (!eventId) return;
    loadSessions();
    loadInvitations();
  }, [eventId]);

  const loadInvitations = async () => {
    try {
      setLoadingInvitations(true);
      logger.debug("SessionsPanel", "Loading invitations", { eventId });

      const eventInvitations = await adminApiClient.getEventInvitations(eventId);
      setInvitations(eventInvitations);

      logger.info("SessionsPanel", "Invitations loaded", { count: eventInvitations.length });
    } catch (error) {
      logger.error("SessionsPanel", "Failed to load invitations", error as Error);
      // Don't set error state - invitations might not exist yet
    } finally {
      setLoadingInvitations(false);
    }
  };

  // Create a lookup map for invitations by sessionId and speakerId
  const invitationLookup = useMemo(() => {
    const lookup = new Map<string, SpeakerInvitation>();
    invitations.forEach((invitation) => {
      if (invitation.sessionId) {
        const key = `${invitation.sessionId}:${invitation.speakerId}`;
        lookup.set(key, invitation);
      }
    });
    return lookup;
  }, [invitations]);

  const openCreateModal = () => {
    setSessionModalMode("create");
    setSessionDraft({
      title: "",
      description: "",
      startsAt: "",
      endsAt: "",
      stage: "",
    });
    setSessionEditingId(null);
    setIsSessionModalOpen(true);
  };

  const openEditModal = (session: SessionResponse) => {
    setSessionModalMode("edit");
    setSessionEditingId(session.id);
    setSessionDraft({
      title: session.title,
      description: session.description ?? "",
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      stage: session.stage ?? "",
    });
    setIsSessionModalOpen(true);
  };

  const handleSessionSubmit = async (payload: CreateSessionRequest | UpdateSessionRequest) => {
    if (sessionModalMode === "create") {
      await eventAPI.createSession(eventId, payload as CreateSessionRequest);
      logger.info("SessionsPanel", "Session created", { eventId });
    } else if (sessionEditingId) {
      await eventAPI.updateSession(eventId, sessionEditingId, payload as UpdateSessionRequest);
      logger.info("SessionsPanel", "Session updated", { eventId, sessionId: sessionEditingId });
    }
    await loadSessions();
    await loadInvitations();
    setIsSessionModalOpen(false);
  };

  const confirmRemoveSession = (sessionId: string, title: string) => {
    setConfirmDialogConfig({
      sessionId,
      title: "Delete session?",
      description: `Are you sure you want to remove "${title}"? This action cannot be undone.`,
      onConfirm: async () => {
        await eventAPI.deleteSession(eventId, sessionId);
        await loadSessions();
        await loadInvitations();
      },
    });
    setConfirmDialogOpen(true);
  };

  const openAssignSpeakerModal = (session: SessionResponse) => {
    setSpeakerModalSessionId(session.id);
    setSpeakerEditingId(null);
    setSpeakerAssignmentDraft({});
    setIsSpeakerModalOpen(true);
  };

  const openUpdateSpeakerModal = (session: SessionResponse, speaker: SessionSpeakerResponse) => {
    setSpeakerModalSessionId(session.id);
    setSpeakerEditingId(speaker.speakerId);
    setSpeakerAssignmentDraft({
      speakerId: speaker.speakerId,
      materialsStatus: speaker.materialsStatus,
      specialNotes: speaker.specialNotes ?? "",
    });
    setIsSpeakerModalOpen(true);
  };

  const handleSpeakerSubmit = async (
    payload: SessionSpeakerAssignRequest | SessionSpeakerUpdateRequest,
    mode: "create" | "update",
  ) => {
    if (!speakerModalSessionId) return;
    if (mode === "create") {
      await eventAPI.assignSessionSpeaker(eventId, speakerModalSessionId, payload as SessionSpeakerAssignRequest);
    } else if (speakerEditingId) {
      await eventAPI.updateSessionSpeaker(
        eventId,
        speakerModalSessionId,
        speakerEditingId,
        payload as SessionSpeakerUpdateRequest,
      );
    }
    await loadSessions();
    await loadInvitations();
    setIsSpeakerModalOpen(false);
  };

  const confirmRemoveSpeaker = (sessionId: string, speakerId: string) => {
    setConfirmDialogConfig({
      sessionId,
      speakerId,
      title: "Remove speaker?",
      description: "This will remove the speaker's assignment from this session.",
      onConfirm: async () => {
        await eventAPI.removeSessionSpeaker(eventId, sessionId, speakerId);
        await loadSessions();
        await loadInvitations();
      },
    });
    setConfirmDialogOpen(true);
  };

  return (
    <Card className="border-slate-200 dark:border-slate-700">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Sessions & Agenda
          </CardTitle>
          <CardDescription>
            Manage the event program, assign speakers, and track session readiness.
          </CardDescription>
        </div>
        <Button
          type="button"
          onClick={openCreateModal}
          disabled={disabled}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add session
        </Button>
      </CardHeader>
      <CardContent>
        {loadingSessions ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="ml-3 text-slate-600 dark:text-slate-300">Loading sessions...</span>
          </div>
        ) : sessionsError ? (
          <div className="rounded-md border border-red-200 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
            {sessionsError}
          </div>
        ) : !hasSessions ? (
          <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <Calendar className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
              No sessions scheduled yet
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Create sessions to define the agenda and assign speakers to each slot.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={openCreateModal}
              disabled={disabled}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create your first session
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 shadow-sm"
              >
                <div className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-lg font-semibold text-slate-900 dark:text-white">
                        {session.title}
                      </h4>
                      {session.stage && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {session.stage}
                        </Badge>
                      )}
                    </div>
                    {session.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {session.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-3 text-sm text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(session.startsAt).toLocaleString()} –{" "}
                        {new Date(session.endsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {session.speakers.length} speaker{session.speakers.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 md:flex-row">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(session)}
                      disabled={disabled}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openAssignSpeakerModal(session)}
                      disabled={disabled}
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add speaker
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => confirmRemoveSession(session.id, session.title)}
                      disabled={disabled}
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
                {session.speakers.length > 0 && (
                  <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 px-5 py-4">
                    <h5 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Assigned speakers
                    </h5>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      {session.speakers.map((speaker) => {
                        // Find invitation for this session speaker
                        const invitationKey = `${session.id}:${speaker.speakerId}`;
                        const invitation = invitationLookup.get(invitationKey);

                        // Determine invitation status badge
                        const getInvitationStatusBadge = () => {
                          if (!invitation) {
                            return (
                              <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-200">
                                No invitation
                              </Badge>
                            );
                          }

                          switch (invitation.status) {
                            case 'ACCEPTED':
                              return (
                                <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                                  <CheckCircle2 className="mr-1 h-3 w-3" />
                                  Accepted
                                </Badge>
                              );
                            case 'PENDING':
                              return (
                                <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200">
                                  Pending
                                </Badge>
                              );
                            case 'DECLINED':
                              return (
                                <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">
                                  <XCircle className="mr-1 h-3 w-3" />
                                  Declined
                                </Badge>
                              );
                            case 'EXPIRED':
                              return (
                                <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200">
                                  Expired
                                </Badge>
                              );
                            default:
                              return null;
                          }
                        };

                        return (
                          <div
                            key={speaker.id}
                            className="flex flex-col gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 p-4"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold uppercase text-blue-700">
                                {speaker.speakerId.slice(0, 2)}
                              </div>
                              <div className="flex flex-col text-sm">
                                <span className="font-medium text-slate-900 dark:text-slate-100">{speaker.speakerId}</span>
                                {speaker.specialNotes && (
                                  <span className="text-xs text-slate-500 dark:text-slate-400">{speaker.specialNotes}</span>
                                )}
                              </div>
                              {getInvitationStatusBadge()}
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => openUpdateSpeakerModal(session, speaker)}
                                disabled={disabled}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Update
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => confirmRemoveSpeaker(session.id, speaker.speakerId)}
                                disabled={disabled}
                              >
                                <Trash className="mr-2 h-4 w-4" />
                                Remove
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Session creation/edit modal */}
      <SessionFormModal
        isOpen={isSessionModalOpen}
        mode={sessionModalMode}
        sessionDraft={sessionDraft}
        onClose={() => setIsSessionModalOpen(false)}
        onSubmit={handleSessionSubmit}
        disabled={disabled}
      />

      {/* Speaker assignment modal */}
      <SessionSpeakerModal
        isOpen={isSpeakerModalOpen}
        mode={speakerEditingId ? "update" : "create"}
        draft={speakerAssignmentDraft}
        onClose={() => setIsSpeakerModalOpen(false)}
        onSubmit={handleSpeakerSubmit}
        disabled={disabled}
      />

      {/* Confirmation dialog */}
      <ConfirmDialog
        isOpen={confirmDialogOpen}
        title={confirmDialogConfig?.title ?? ""}
        description={confirmDialogConfig?.description ?? ""}
        onCancel={() => setConfirmDialogOpen(false)}
        onConfirm={async () => {
          if (!confirmDialogConfig) return;
          await confirmDialogConfig.onConfirm();
          setConfirmDialogOpen(false);
        }}
      />
    </Card>
  );
}

