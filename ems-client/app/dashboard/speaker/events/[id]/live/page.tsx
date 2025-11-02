'use client';

import { LiveEventAuditorium } from "@/components/events/LiveEventAuditorium";
import { withSpeakerAuth } from "@/components/hoc/withAuth";

const SpeakerLiveAuditoriumPage = () => {
  return (
    <LiveEventAuditorium userRole="SPEAKER" />
  );
};

export default withSpeakerAuth(SpeakerLiveAuditoriumPage);
