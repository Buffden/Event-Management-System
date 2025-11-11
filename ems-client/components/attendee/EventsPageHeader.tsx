'use client';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface EventsPageHeaderProps {
  userName?: string | null;
  userEmail?: string | null;
  userImage?: string | null;
}

export function EventsPageHeader({ userName, userEmail, userImage }: EventsPageHeaderProps) {
  const router = useRouter();

  return (
    <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard/attendee')}
              className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Discover Events
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={userImage || `https://api.dicebear.com/7.x/initials/svg?seed=${userName || userEmail}`}
                  alt={userName || userEmail || 'User'}
                />
                <AvatarFallback className="text-xs">
                  {userName ? userName.split(' ').map(n => n[0]).join('') : userEmail?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {userName || userEmail}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

