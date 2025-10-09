'use client';

import { useAuth } from "@/lib/auth-context";
import { useLogger } from "@/lib/logger/LoggerProvider";
import { useEffect } from "react";
import { withAuth } from "@/components/hoc/withAuth";

const LOGGER_COMPONENT_NAME = 'DashboardPage';

function DashboardPage() {
  const { user } = useAuth();
  const logger = useLogger();

  useEffect(() => {
    if (user) {
      logger.debug(LOGGER_COMPONENT_NAME, 'Dashboard routing - User role:', user.role);

      switch (user.role) {
        case 'ADMIN':
          logger.info(LOGGER_COMPONENT_NAME, 'Redirecting admin to /dashboard/admin');
          window.location.href = '/dashboard/admin';
          break;
        case 'SPEAKER':
          logger.info(LOGGER_COMPONENT_NAME, 'Redirecting speaker to /dashboard/speaker');
          window.location.href = '/dashboard/speaker';
          break;
        case 'USER':
        default:
          logger.info(LOGGER_COMPONENT_NAME, 'Redirecting user to /dashboard/attendee');
          window.location.href = '/dashboard/attendee';
          break;
      }
    }
  }, [user, logger]);

  // Loading state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-slate-700 dark:text-slate-300 font-medium">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}

export default withAuth(DashboardPage);
