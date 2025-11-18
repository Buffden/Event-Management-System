'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download } from 'lucide-react';

interface RecentRegistrationItemProps {
  registration: {
    id: string;
    event: string;
    ticketType?: string;
    date: string;
    status: string;
  };
  onDownload?: () => void;
}

export function RecentRegistrationItem({ registration, onDownload }: RecentRegistrationItemProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
      <div className="flex-1">
        <h4 className="font-medium text-slate-900 dark:text-white">{registration.event}</h4>
        <div className="flex items-center space-x-4 mt-1">
          {registration.ticketType && (
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {registration.ticketType}
            </span>
          )}
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Registered on {registration.date}
          </span>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Badge
          variant="default"
          className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
        >
          {registration.status}
        </Badge>
        {onDownload && (
          <Button size="sm" variant="outline" onClick={onDownload}>
            <Download className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

