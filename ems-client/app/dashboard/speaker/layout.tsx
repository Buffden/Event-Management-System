'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';

export default function SpeakerLayout({
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
          label: 'Speaker Panel',
          variant: 'secondary',
          className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
        }}
      />
      {children}
    </>
  );
}

