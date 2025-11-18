'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { usePathname } from 'next/navigation';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  // Only show layout on root dashboard page (/dashboard/admin)
  const isRootDashboard = pathname === '/dashboard/admin';

  return (
    <>
      {isRootDashboard && (
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
      )}
      {children}
    </>
  );
}

