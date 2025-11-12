'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import {
  Mail,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageSquare,
  User,
  MapPin
} from 'lucide-react';
import { SpeakerInvitation } from '@/lib/api/speaker.api';
import { eventAPI } from '@/lib/api/event.api';
import { EventResponse } from '@/lib/api/types/event.types';
import { useLogger } from '@/lib/logger/LoggerProvider';

const LOGGER_COMPONENT_NAME = 'InvitationManagement';

interface InvitationManagementProps {
  invitations: SpeakerInvitation[];
  onRespond: (invitationId: string, status: 'ACCEPTED' | 'DECLINED', message?: string) => Promise<void>;
  loading?: boolean;
}

export function InvitationManagement({ invitations, onRespond, loading = false }: InvitationManagementProps) {
  const logger = useLogger();
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseMessage, setResponseMessage] = useState<string>('');
  const [showResponseForm, setShowResponseForm] = useState<string | null>(null);
  const [eventDetails, setEventDetails] = useState<Record<string, EventResponse>>({});
  const [loadingEventDetails, setLoadingEventDetails] = useState<Set<string>>(new Set());

  // Function to load event details
  const loadEventDetails = async (eventId: string) => {
    if (eventDetails[eventId] || loadingEventDetails.has(eventId)) {
      return; // Already loaded or loading
    }

    try {
      setLoadingEventDetails(prev => new Set(prev).add(eventId));
      logger.debug(LOGGER_COMPONENT_NAME, 'Loading event details', { eventId });

      // Try to get event by ID (works for all event statuses)
      try {
        const response = await eventAPI.getEventById(eventId);
        setEventDetails(prev => ({
          ...prev,
          [eventId]: response.data
        }));
        logger.info(LOGGER_COMPONENT_NAME, 'Event details loaded', { eventId, eventName: response.data.name });
      } catch (error) {
        // Fallback to published events if getEventById fails
        try {
          const response = await eventAPI.getPublishedEventById(eventId);
          setEventDetails(prev => ({
            ...prev,
            [eventId]: response.data
          }));
          logger.info(LOGGER_COMPONENT_NAME, 'Event details loaded (published)', { eventId, eventName: response.data.name });
        } catch (pubError) {
          logger.warn(LOGGER_COMPONENT_NAME, 'Failed to load event details (both methods)', { eventId });
        }
      }
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to load event details', error as Error, { eventId });
    } finally {
      setLoadingEventDetails(prev => {
        const newSet = new Set(prev);
        newSet.delete(eventId);
        return newSet;
      });
    }
  };

  // Automatically load event details for all invitations on mount
  useEffect(() => {
    if (invitations.length > 0) {
      const uniqueEventIds = [...new Set(invitations.map(inv => inv.eventId))];
      uniqueEventIds.forEach(eventId => {
        // Only load if not already loaded or loading
        if (!eventDetails[eventId] && !loadingEventDetails.has(eventId)) {
          loadEventDetails(eventId);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invitations]);

  // Calculate invitation statistics
  const stats = {
    total: invitations.length,
    pending: invitations.filter(inv => inv.status === 'PENDING').length,
    accepted: invitations.filter(inv => inv.status === 'ACCEPTED').length,
    declined: invitations.filter(inv => inv.status === 'DECLINED').length,
    expired: invitations.filter(inv => inv.status === 'EXPIRED').length,
  };

  const handleRespond = async (invitationId: string, status: 'ACCEPTED' | 'DECLINED') => {
    try {
      setRespondingTo(invitationId);
      logger.debug(LOGGER_COMPONENT_NAME, 'Responding to invitation', { invitationId, status });

      await onRespond(invitationId, status, responseMessage || undefined);

      setShowResponseForm(null);
      setResponseMessage('');

      logger.info(LOGGER_COMPONENT_NAME, 'Invitation response sent', { invitationId, status });
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to respond to invitation', error as Error, { invitationId, status });
    } finally {
      setRespondingTo(null);
    }
  };

  const getStatusBadge = (status: SpeakerInvitation['status']) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Pending</Badge>;
      case 'ACCEPTED':
        return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Accepted</Badge>;
      case 'DECLINED':
        return <Badge variant="destructive">Declined</Badge>;
      case 'EXPIRED':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: SpeakerInvitation['status']) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'ACCEPTED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'DECLINED':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'EXPIRED':
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <Mail className="h-4 w-4 text-gray-500" />;
    }
  };

  // Component to render invitation card with event details
  const InvitationCard = ({ invitation }: { invitation: SpeakerInvitation }) => {
    const event = eventDetails[invitation.eventId];
    const isLoadingEvent = loadingEventDetails.has(invitation.eventId);

    return (
      <Card className={`transition-all hover:shadow-md ${
        invitation.status === 'ACCEPTED'
          ? 'border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800'
          : invitation.status === 'DECLINED'
          ? 'border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800'
          : invitation.status === 'PENDING'
          ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800'
          : 'border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700'
      }`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div className={`p-2 rounded-full ${
                invitation.status === 'ACCEPTED'
                  ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300'
                  : invitation.status === 'DECLINED'
                  ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300'
                  : invitation.status === 'PENDING'
                  ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
              }`}>
                {getStatusIcon(invitation.status)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    {event ? event.name : `Event ${invitation.eventId.slice(-8)}`}
                  </h4>
                  {getStatusBadge(invitation.status)}
                </div>

                {event ? (
                  <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      <span>{event.category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3" />
                      <span>{event.venue.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span>
                        Booking: {new Date(event.bookingStartDate).toLocaleDateString()} - {new Date(event.bookingEndDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      <span>
                        Sent: {new Date(invitation.sentAt).toLocaleDateString()} at {new Date(invitation.sentAt).toLocaleTimeString()}
                      </span>
                    </div>
                    {invitation.respondedAt && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        <span>
                          Responded: {new Date(invitation.respondedAt).toLocaleDateString()} at {new Date(invitation.respondedAt).toLocaleTimeString()}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {invitation.message && (
                  <div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded border text-xs">
                    <strong>Message:</strong> {invitation.message}
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {!event && !isLoadingEvent && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => loadEventDetails(invitation.eventId)}
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  View Event
                </Button>
              )}
              {isLoadingEvent && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              )}
              {invitation.status === 'PENDING' && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowResponseForm(invitation.id)}
                    disabled={respondingTo === invitation.id}
                  >
                    <MessageSquare className="h-3 w-3 mr-1" />
                    Respond
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const pendingInvitations = invitations.filter(inv => inv.status === 'PENDING');
  const acceptedInvitations = invitations.filter(inv => inv.status === 'ACCEPTED');
  const declinedInvitations = invitations.filter(inv => inv.status === 'DECLINED');
  const expiredInvitations = invitations.filter(inv => inv.status === 'EXPIRED');

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invitation Management</CardTitle>
          <CardDescription>Loading your invitations...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Invitation Statistics */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Invitation Overview
              <Badge variant="outline" className="ml-2">
                {stats.total} total
              </Badge>
            </CardTitle>
            <CardDescription>
              Summary of your speaking invitations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <Clock className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">
                  {stats.pending}
                </div>
                <div className="text-sm text-yellow-600 dark:text-yellow-400">Pending</div>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-800 dark:text-green-200">
                  {stats.accepted}
                </div>
                <div className="text-sm text-green-600 dark:text-green-400">Accepted</div>
              </div>
              <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                <XCircle className="h-6 w-6 text-red-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-red-800 dark:text-red-200">
                  {stats.declined}
                </div>
                <div className="text-sm text-red-600 dark:text-red-400">Declined</div>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <AlertCircle className="h-6 w-6 text-gray-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                  {stats.expired}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Expired</div>
              </div>
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <Mail className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                  {stats.total}
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-400">Total</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Response Rate:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {stats.total > 0
                    ? Math.round((stats.accepted + stats.declined) / stats.total * 100)
                    : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-gray-600 dark:text-gray-400">Acceptance Rate:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {stats.accepted + stats.declined > 0
                    ? Math.round(stats.accepted / (stats.accepted + stats.declined) * 100)
                    : 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-yellow-500" />
              Pending Invitations ({pendingInvitations.length})
            </CardTitle>
            <CardDescription>
              You have {pendingInvitations.length} pending invitation{pendingInvitations.length > 1 ? 's' : ''} that require your response
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingInvitations.map((invitation) => {
              const event = eventDetails[invitation.eventId];
              const isLoadingEvent = loadingEventDetails.has(invitation.eventId);

              return (
              <div key={invitation.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-blue-500" />
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">
                        {event ? event.name : isLoadingEvent ? 'Loading event...' : `Event ${invitation.eventId.slice(-8)}`}
                      </h3>
                      {getStatusBadge(invitation.status)}
                    </div>

                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      {event ? (
                        <>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3" />
                            <span>{event.venue.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            <span>
                              {new Date(event.bookingStartDate).toLocaleDateString()} - {new Date(event.bookingEndDate).toLocaleDateString()}
                            </span>
                          </div>
                        </>
                      ) : (
                        <p><strong>Event ID:</strong> {invitation.eventId}</p>
                      )}
                      <p><strong>Sent:</strong> {formatDate(invitation.sentAt)}</p>
                      {invitation.message && (
                        <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                          <p className="text-sm"><strong>Message:</strong></p>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{invitation.message}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {showResponseForm === invitation.id ? (
                  <div className="space-y-3 pt-3 border-t">
                    <Textarea
                      placeholder="Optional message to include with your response..."
                      value={responseMessage}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setResponseMessage(e.target.value)}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleRespond(invitation.id, 'ACCEPTED')}
                        disabled={respondingTo === invitation.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRespond(invitation.id, 'DECLINED')}
                        disabled={respondingTo === invitation.id}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Decline
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowResponseForm(null);
                          setResponseMessage('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => setShowResponseForm(invitation.id)}
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Respond
                    </Button>
                  </div>
                )}
              </div>
            );
            })}
          </CardContent>
        </Card>
      )}

      {/* Other Invitations */}
      {(acceptedInvitations.length > 0 || declinedInvitations.length > 0 || expiredInvitations.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Invitation History ({acceptedInvitations.length + declinedInvitations.length + expiredInvitations.length})
            </CardTitle>
            <CardDescription>
              Your previous invitation responses
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[...acceptedInvitations, ...declinedInvitations, ...expiredInvitations].map((invitation) => {
              const event = eventDetails[invitation.eventId];
              const isLoadingEvent = loadingEventDetails.has(invitation.eventId);

              return (
              <div key={invitation.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(invitation.status)}
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {event ? event.name : isLoadingEvent ? 'Loading event...' : `Event ${invitation.eventId.slice(-8)}`}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Sent: {formatDate(invitation.sentAt)}
                      {invitation.respondedAt && (
                        <span> • Responded: {formatDate(invitation.respondedAt)}</span>
                      )}
                    </p>
                  </div>
                </div>
                {getStatusBadge(invitation.status)}
              </div>
            );
            })}
          </CardContent>
        </Card>
      )}

      {/* No Invitations */}
      {invitations.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Invitation Management
            </CardTitle>
            <CardDescription>
              Your event invitations will appear here
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You don't have any invitations yet. Event organizers will send you invitations for speaking opportunities.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
