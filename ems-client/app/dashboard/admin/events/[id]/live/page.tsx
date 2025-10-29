'use client';

import { LiveEventAuditorium } from "@/components/events/LiveEventAuditorium";
import { withAdminAuth } from "@/components/hoc/withAuth";

const AdminLiveAuditoriumPage = () => {
  return (
    <LiveEventAuditorium userRole="ADMIN" />
  );
};

export default withAdminAuth(AdminLiveAuditoriumPage);
