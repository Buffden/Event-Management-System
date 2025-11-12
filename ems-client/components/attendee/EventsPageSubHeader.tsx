'use client';

import { Button } from '@/components/ui/button';
import { Ticket } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function EventsPageSubHeader() {
  const router = useRouter();

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
      <div>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Find and book amazing events happening around you
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          onClick={() => router.push('/dashboard/attendee/tickets')}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Ticket className="h-4 w-4" />
          My Tickets
        </Button>
      </div>
    </div>
  );
}

