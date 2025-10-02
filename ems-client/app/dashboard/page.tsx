'use client';

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    // Role-based routing
    if (!isLoading && isAuthenticated && user) {
      console.log('Dashboard routing - User role:', user.role); // Debug log
      switch (user.role) {
        case 'ADMIN':
          console.log('Redirecting admin to /dashboard/admin'); // Debug log
          router.push('/dashboard/admin');
          break;
        case 'SPEAKER':
          router.push('/dashboard/speaker');
          break;
        case 'USER':
        default:
          router.push('/dashboard/attendee');
          break;
      }
    }
  }, [isAuthenticated, isLoading, user, router]);

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
