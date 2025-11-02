'use client';

import { EventDetailsPage } from "@/components/events/EventDetailsPage";
import { withSpeakerAuth } from "@/components/hoc/withAuth";

const SpeakerEventDetailsPage = () => {
  return (
    <EventDetailsPage 
      userRole="SPEAKER"
      showJoinInterface={true}
      showAdminControls={false}
      showSpeakerControls={true}
    />
  );
};

export default withSpeakerAuth(SpeakerEventDetailsPage);