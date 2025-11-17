'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { usePathname } from 'next/navigation';

export default function AttendeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  // Only show layout on root dashboard page (/dashboard/attendee)
  const isRootDashboard = pathname === '/dashboard/attendee';

  return (
    <>
      {isRootDashboard && (
        <DashboardHeader
          user={user}
          onLogout={logout}
          title="EventManager"
          badge={{
            label: 'Attendee Portal',
            variant: 'secondary',
            className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
          }}
        />
      )}
      {children}
    </>
  );
}

