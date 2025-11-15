'use client';

import React from 'react';
import { DashboardHeader as SharedDashboardHeader } from '@/components/dashboard/DashboardHeader';

interface DashboardHeaderProps {
  user?: {
    name?: string;
    email?: string;
    image?: string | null;
  } | null;
  onLogout?: () => void;
  title?: string;
  showBackButton?: boolean;
  backHref?: string;
}

export function DashboardHeader({
  user,
  onLogout,
  title = 'EventManager',
  showBackButton = false,
  backHref = '/dashboard/attendee'
}: DashboardHeaderProps) {
  return (
    <SharedDashboardHeader
      user={user}
      onLogout={onLogout}
      title={title}
      badge={{
        label: 'Attendee Portal',
        variant: 'secondary',
        className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      }}
      showBackButton={showBackButton}
      backHref={backHref}
    />
  );
}

