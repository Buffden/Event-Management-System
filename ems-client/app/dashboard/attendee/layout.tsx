'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';

export default function AttendeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();

  return (
    <>
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
      {children}
    </>
  );
}

