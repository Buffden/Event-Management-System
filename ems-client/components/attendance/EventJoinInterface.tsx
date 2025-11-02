import React from 'react';
import { SimpleEventJoin } from './SimpleEventJoin';
import { SimpleSpeakerJoin } from './SimpleSpeakerJoin';
import { SimpleAdminJoin } from './SimpleAdminJoin';

interface EventJoinInterfaceProps {
  eventId: string;
  eventTitle: string;
  eventStartTime: string;
  eventEndTime: string;
  eventVenue: string;
  eventCategory: string;
  eventStatus: string;
  eventDescription: string;
  userRole: string;
  speakerId?: string;
}

export const EventJoinInterface: React.FC<EventJoinInterfaceProps> = ({
  eventId,
  eventTitle,
  eventStartTime,
  eventEndTime,
  eventVenue,
  eventCategory,
  eventStatus,
  eventDescription,
  userRole,
  speakerId,
}) => {
  // Render appropriate UI based on user role
  if (userRole === 'ADMIN') {
    return (
      <SimpleAdminJoin
        eventId={eventId}
        eventTitle={eventTitle}
        eventStartTime={eventStartTime}
        eventEndTime={eventEndTime}
        eventVenue={eventVenue}
        eventCategory={eventCategory}
        eventStatus={eventStatus}
        eventDescription={eventDescription}
      />
    );
  }

  if (userRole === 'SPEAKER') {
    return (
      <SimpleSpeakerJoin
        eventId={eventId}
        eventTitle={eventTitle}
        eventStartTime={eventStartTime}
        eventEndTime={eventEndTime}
        eventVenue={eventVenue}
        eventCategory={eventCategory}
        eventStatus={eventStatus}
        eventDescription={eventDescription}
        speakerId={speakerId || ''}
      />
    );
  }

  // Default to attendee view for USER role
  return (
    <SimpleEventJoin
      eventId={eventId}
      eventTitle={eventTitle}
      eventStartTime={eventStartTime}
      eventEndTime={eventEndTime}
      eventVenue={eventVenue}
      eventCategory={eventCategory}
      eventStatus={eventStatus}
      eventDescription={eventDescription}
      userRole={userRole}
    />
  );
};
