'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Eye } from 'lucide-react';

interface UpcomingEventItemProps {
  event: {
    id: string;
    title: string;
    date: string;
    time: string;
    location: string;
    ticketType?: string;
    status: string;
  };
  onView: (eventId: string) => void;
}

export function UpcomingEventItem({ event, onView }: UpcomingEventItemProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
      <div className="flex-1">
        <h4 className="font-medium text-slate-900 dark:text-white">{event.title}</h4>
        <div className="flex items-center space-x-4 mt-1">
          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center">
            <Calendar className="h-3 w-3 mr-1" />
            {event.date} at {event.time}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center">
            <MapPin className="h-3 w-3 mr-1" />
            {event.location}
          </span>
        </div>
        {event.ticketType && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {event.ticketType}
          </span>
        )}
      </div>
      <div className="flex items-center space-x-2">
        <Badge
          variant={event.status === 'registered' ? 'default' : 'secondary'}
          className={
            event.status === 'registered'
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
          }
        >
          {event.status}
        </Badge>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onView(event.id)}
        >
          <Eye className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

