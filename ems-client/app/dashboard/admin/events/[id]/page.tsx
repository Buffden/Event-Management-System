'use client';

import { EventDetailsPage } from "@/components/events/EventDetailsPage";
import { withAdminAuth } from "@/components/hoc/withAuth";

const AdminEventDetailsPage = () => {
  return (
    <EventDetailsPage 
      userRole="ADMIN"
      showJoinInterface={true}
      showAdminControls={true}
      showSpeakerControls={false}
    />
  );
};

export default withAdminAuth(AdminEventDetailsPage);