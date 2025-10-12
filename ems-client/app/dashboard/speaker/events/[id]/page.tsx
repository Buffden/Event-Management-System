'use client';

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  Users,
  AlertCircle,
  Edit,
  Send
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useLogger } from "@/lib/logger/LoggerProvider";
import { eventAPI } from "@/lib/api/event.api";
import { EventResponse, EventStatus } from "@/lib/api/types/event.types";
import { withSpeakerAuth } from "@/components/hoc/withAuth";

const LOGGER_COMPONENT_NAME = 'SpeakerEventDetailsPage';

const statusColors = {
  [EventStatus.DRAFT]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  [EventStatus.PENDING_APPROVAL]: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  [EventStatus.PUBLISHED]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  [EventStatus.REJECTED]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  [EventStatus.CANCELLED]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  [EventStatus.COMPLETED]: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
};

function SpeakerEventDetailsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const logger = useLogger();
  const eventId = params.id as string;

  const [event, setEvent] = useState<EventResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (eventId) {
      loadEvent();
    }
  }, [eventId]);

  const loadEvent = async () => {
    try {
      setIsLoading(true);
      logger.debug(LOGGER_COMPONENT_NAME, 'Loading event details', { eventId });
      
      const response = await eventAPI.getMyEventById(eventId);
      
      if (response.success) {
        setEvent(response.data);
        logger.debug(LOGGER_COMPONENT_NAME, 'Event loaded successfully');
      } else {
        throw new Error('Failed to load event');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load event';
      setError(errorMessage);
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to load event', err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Event</h3>
            <p className="text-slate-600 mb-4">{error}</p>
            <Button onClick={() => router.push('/dashboard/speaker/events')}>
              Back to Events
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canEdit = event.status === EventStatus.DRAFT || event.status === EventStatus.REJECTED;
  const canSubmit = event.status === EventStatus.DRAFT || event.status === EventStatus.REJECTED;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard/speaker/events')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Events
              </Button>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Event Details
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl mb-2">{event.name}</CardTitle>
                <Badge className={statusColors[event.status]}>
                  {event.status.replace('_', ' ')}
                </Badge>
              </div>
              <div className="flex gap-2">
                {canEdit && (
                  <Button
                    onClick={() => router.push(`/dashboard/speaker/events/edit/${event.id}`)}
                    variant="outline"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
                {canSubmit && (
                  <Button
                    onClick={async () => {
                      try {
                        await eventAPI.submitEvent(event.id);
                        router.push('/dashboard/speaker/events');
                      } catch (error) {
                        logger.error(LOGGER_COMPONENT_NAME, 'Failed to submit event', error as Error);
                      }
                    }}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Submit for Approval
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {event.rejectionReason && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <h4 className="font-semibold text-red-900 dark:text-red-100 mb-2">Rejection Reason:</h4>
                <p className="text-red-800 dark:text-red-200">{event.rejectionReason}</p>
              </div>
            )}

            <div>
              <h3 className="font-semibold text-lg mb-3">Description</h3>
              <p className="text-slate-600 dark:text-slate-400">{event.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Category</h4>
                <p className="text-slate-600">{event.category}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2 flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  Venue
                </h4>
                <p className="text-slate-600">{event.venue.name}</p>
                <p className="text-sm text-slate-500">{event.venue.address}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2 flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Event Dates
                </h4>
                <p className="text-slate-600">
                  {new Date(event.bookingStartDate).toLocaleString()} - <br />
                  {new Date(event.bookingEndDate).toLocaleString()}
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2 flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Capacity
                </h4>
                <p className="text-slate-600">{event.venue.capacity} attendees</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default withSpeakerAuth(SpeakerEventDetailsPage);

