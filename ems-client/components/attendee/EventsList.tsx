'use client';

import { Calendar, AlertCircle } from 'lucide-react';
import { EventResponse } from '@/lib/api/types/event.types';
import { FeedbackFormResponse } from '@/lib/api/feedback.api';
import { EventCard } from './EventCard';

interface EventsListProps {
  availableEvents: EventResponse[];
  pastEvents: EventResponse[];
  userBookings: { [eventId: string]: boolean };
  bookingStatus: { [eventId: string]: 'loading' | 'success' | 'error' | 'idle' };
  feedbackForms: { [eventId: string]: FeedbackFormResponse | null };
  userFeedbackSubmissions: { [eventId: string]: boolean };
  isEventExpired: (event: EventResponse) => boolean;
  isEventUpcoming: (event: EventResponse) => boolean;
  isEventRunning: (event: EventResponse) => boolean;
  isWithin10MinutesOfStart: (event: EventResponse) => boolean;
  formatEventTime: (startDate: string, endDate: string) => { date: string; time: string };
  onBookEvent: (eventId: string) => void;
  onProvideFeedback: (eventId: string, eventName: string, form: FeedbackFormResponse) => void;
}

export function EventsList({
  availableEvents,
  pastEvents,
  userBookings,
  bookingStatus,
  feedbackForms,
  userFeedbackSubmissions,
  isEventExpired,
  isEventUpcoming,
  isEventRunning,
  isWithin10MinutesOfStart,
  formatEventTime,
  onBookEvent,
  onProvideFeedback
}: EventsListProps) {
  return (
    <div className="space-y-8">
      {/* Upcoming and Running Events */}
      {availableEvents.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Available Events ({availableEvents.length})
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {availableEvents.map((event) => {
              const eventTime = formatEventTime(event.bookingStartDate, event.bookingEndDate);
              const isBooked = userBookings[event.id];
              const feedbackForm = feedbackForms[event.id];
              const hasUserFeedbackSubmission = userFeedbackSubmissions[event.id] === true;

              return (
                <EventCard
                  key={event.id}
                  event={event}
                  isBooked={isBooked}
                  bookingStatus={bookingStatus[event.id] || 'idle'}
                  isExpired={isEventExpired(event)}
                  isUpcoming={isEventUpcoming(event)}
                  isRunning={isEventRunning(event)}
                  isWithin10MinutesOfStart={isWithin10MinutesOfStart(event)}
                  feedbackForm={feedbackForm || undefined}
                  hasUserFeedbackSubmission={hasUserFeedbackSubmission}
                  onBookEvent={onBookEvent}
                  onProvideFeedback={() => {
                    if (feedbackForm) {
                      onProvideFeedback(event.id, event.name, feedbackForm);
                    }
                  }}
                  eventTime={eventTime}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Expired Events */}
      {pastEvents.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-gray-500" />
            Past Events ({pastEvents.length})
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {pastEvents.map((event) => {
              const eventTime = formatEventTime(event.bookingStartDate, event.bookingEndDate);
              const isBooked = userBookings[event.id];
              const feedbackForm = feedbackForms[event.id];
              const hasUserFeedbackSubmission = userFeedbackSubmissions[event.id] === true;

              return (
                <EventCard
                  key={event.id}
                  event={event}
                  isBooked={isBooked}
                  bookingStatus={bookingStatus[event.id] || 'idle'}
                  isExpired={true}
                  isUpcoming={false}
                  isRunning={false}
                  isWithin10MinutesOfStart={false}
                  feedbackForm={feedbackForm || undefined}
                  hasUserFeedbackSubmission={hasUserFeedbackSubmission}
                  onBookEvent={onBookEvent}
                  onProvideFeedback={() => {
                    if (feedbackForm) {
                      onProvideFeedback(event.id, event.name, feedbackForm);
                    }
                  }}
                  eventTime={eventTime}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

