'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

interface DashboardHeaderProps {
  user?: {
    name?: string;
    email?: string;
    image?: string | null;
  } | null;
  onLogout?: () => void;
  title?: string;
  badge?: {
    label: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
    className?: string;
  };
  showBackButton?: boolean;
  backHref?: string;
}

export function DashboardHeader({
  user,
  onLogout,
  title = 'EventManager',
  badge,
  showBackButton = false,
  backHref
}: DashboardHeaderProps) {
  const router = useRouter();

  return (
    <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            {showBackButton && backHref && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(backHref)}
                className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              >
                ← Back
              </Button>
            )}
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {title}
            </h1>
            {badge && !showBackButton && (
              <Badge variant={badge.variant || 'secondary'} className={badge.className}>
                {badge.label}
              </Badge>
            )}
          </div>

          {user && (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={user.image || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name || user.email}`}
                    alt={user.name || user.email}
                  />
                  <AvatarFallback className="text-xs">
                    {user.name ? user.name.split(' ').map(n => n[0]).join('') : user.email?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {user.name || user.email}
                </span>
              </div>

              <ThemeToggle />

              {onLogout && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onLogout}
                  className="text-slate-600 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

