'use client';

import { EventDetailsPage } from "@/components/events/EventDetailsPage";
import { withUserAuth } from "@/components/hoc/withAuth";

const AttendeeEventDetailsPage = () => {
  return (
    <EventDetailsPage 
      userRole="USER"
      showJoinInterface={true}
      showAdminControls={false}
      showSpeakerControls={false}
    />
  );
};

export default withUserAuth(AttendeeEventDetailsPage);
