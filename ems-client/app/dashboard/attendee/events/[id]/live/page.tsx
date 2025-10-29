'use client';

import { LiveEventAuditorium } from "@/components/events/LiveEventAuditorium";
import { withUserAuth } from "@/components/hoc/withAuth";

const AttendeeLiveAuditoriumPage = () => {
  return (
    <LiveEventAuditorium userRole="USER" />
  );
};

export default withUserAuth(AttendeeLiveAuditoriumPage);
