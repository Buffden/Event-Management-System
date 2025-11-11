'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Eye, AlertCircle, Play, Ticket, CheckCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { EventResponse } from '@/lib/api/types/event.types';
import { FeedbackFormResponse } from '@/lib/api/feedback.api';
import { EventFeedbackSection } from './EventFeedbackSection';

interface EventCardProps {
  event: EventResponse;
  isBooked: boolean;
  bookingStatus: 'loading' | 'success' | 'error' | 'idle';
  isExpired: boolean;
  isUpcoming: boolean;
  isRunning: boolean;
  isWithin10MinutesOfStart: boolean;
  feedbackForm?: FeedbackFormResponse | null;
  hasUserFeedbackSubmission: boolean;
  onBookEvent: (eventId: string) => void;
  onProvideFeedback: () => void;
  eventTime: {
    date: string;
    time: string;
  };
}

export function EventCard({
  event,
  isBooked,
  bookingStatus,
  isExpired,
  isUpcoming,
  isRunning,
  isWithin10MinutesOfStart,
  feedbackForm,
  hasUserFeedbackSubmission,
  onBookEvent,
  onProvideFeedback,
  eventTime
}: EventCardProps) {
  const router = useRouter();

  const getBookingButtonText = () => {
    if (isExpired) {
      return 'Event Ended';
    }
    if (isBooked) {
      return 'Already Booked ✓';
    }
    switch (bookingStatus) {
      case 'loading': return 'Booking...';
      case 'success': return 'Booked! ✓';
      case 'error': return 'Error - Try Again';
      default: return 'Book Event';
    }
  };

  const getBookingButtonVariant = () => {
    if (isExpired) {
      return 'secondary';
    }
    if (isBooked) {
      return 'secondary';
    }
    switch (bookingStatus) {
      case 'success': return 'default';
      case 'error': return 'destructive';
      default: return 'default';
    }
  };

  const isButtonDisabled = () => {
    return isExpired || isBooked || bookingStatus === 'loading';
  };

  return (
    <Card className={`border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow ${
      isExpired ? 'opacity-75' : ''
    }`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              {event.name}
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              {isBooked && (
                <Badge className={isExpired ? "bg-green-600 text-white" : "bg-green-600 text-white"}>
                  {isExpired ? 'ATTENDED' : 'BOOKED'}
                </Badge>
              )}
              {isExpired ? (
                <Badge variant="secondary" className="bg-gray-500 text-white">
                  ENDED
                </Badge>
              ) : isRunning ? (
                <Badge className="bg-orange-600 text-white">
                  LIVE
                </Badge>
              ) : isUpcoming ? (
                <Badge className="bg-blue-600 text-white">
                  UPCOMING
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 line-clamp-2">
          {event.description}
        </p>

        {/* Event Details */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
            <MapPin className="h-4 w-4 mr-2"/>
            <span>{event.venue.name}</span>
          </div>
          <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
            <Clock className="h-4 w-4 mr-2"/>
            <span>{eventTime.time}</span>
          </div>
        </div>

        {/* Feedback Form Section - Only show if user has booked the event */}
        {feedbackForm && feedbackForm.status === 'PUBLISHED' && isBooked && (
          <EventFeedbackSection
            feedbackForm={feedbackForm}
            hasUserSubmission={hasUserFeedbackSubmission}
            onProvideFeedback={onProvideFeedback}
            eventId={event.id}
          />
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push(`/dashboard/attendee/events/${event.id}`)}
          >
            <Eye className="h-4 w-4 mr-1"/>
            View Details
          </Button>

          {isExpired ? (
            <Button
              size="sm"
              disabled={true}
              variant="secondary"
            >
              <AlertCircle className="h-4 w-4 mr-1" />
              Event Ended
            </Button>
          ) : isBooked && isWithin10MinutesOfStart ? (
            <Button
              size="sm"
              variant="default"
              onClick={() => router.push(`/dashboard/attendee/events/${event.id}/live`)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <Play className="h-4 w-4 mr-1"/>
              Join Event
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => onBookEvent(event.id)}
              disabled={isButtonDisabled()}
              variant={getBookingButtonVariant()}
            >
              {bookingStatus === 'loading' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Booking...
                </>
              ) : bookingStatus === 'success' ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Booked! ✓
                </>
              ) : (
                <>
                  <Ticket className="h-4 w-4 mr-1" />
                  Book Event
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

