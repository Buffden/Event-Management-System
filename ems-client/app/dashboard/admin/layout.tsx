'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';

export default function AdminLayout({
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
          label: 'Admin Panel',
          variant: 'secondary',
          className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        }}
      />
      {children}
    </>
  );
}

