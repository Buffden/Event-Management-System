'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, MapPin } from 'lucide-react';
import { SessionResponse } from '@/lib/api/types/event.types';

export interface ScheduleItem {
  id: string;
  eventId: string;
  eventName: string;
  venue: string;
  startTime: Date;
  endTime: Date;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  sessions?: SessionResponse[];
}

interface GanttChartProps {
  items: ScheduleItem[];
  dateRange: {
    start: Date;
    end: Date;
    days: number;
  };
}

export function GanttChart({ items, dateRange }: GanttChartProps) {
  // Calculate position and width for each item
  const getItemPosition = (item: ScheduleItem) => {
    const totalMs = dateRange.end.getTime() - dateRange.start.getTime();
    const itemStartMs = item.startTime.getTime() - dateRange.start.getTime();
    const itemDurationMs = item.endTime.getTime() - item.startTime.getTime();

    const leftPercent = (itemStartMs / totalMs) * 100;
    const widthPercent = (itemDurationMs / totalMs) * 100;

    return { left: leftPercent, width: widthPercent };
  };

  // Generate time labels for x-axis
  const timeLabels = useMemo(() => {
    const labels: { date: Date; label: string }[] = [];
    const days = dateRange.days;
    const interval = days <= 7 ? 1 : days <= 30 ? Math.ceil(days / 7) : Math.ceil(days / 10);

    for (let i = 0; i <= days; i += interval) {
      const date = new Date(dateRange.start);
      date.setDate(date.getDate() + i);
      labels.push({
        date,
        label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      });
    }

    // Always include the end date
    if (labels[labels.length - 1]?.date.getTime() !== dateRange.end.getTime()) {
      labels.push({
        date: dateRange.end,
        label: dateRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      });
    }

    return labels;
  }, [dateRange]);

  if (items.length === 0) {
    return (
      <Card className="border-slate-200 dark:border-slate-700">
        <CardContent className="pt-6">
          <p className="text-center text-slate-600 dark:text-slate-400">
            No bookings found for the selected date range
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 dark:border-slate-700">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
          Schedule Timeline
        </CardTitle>
        <CardDescription className="text-slate-600 dark:text-slate-400">
          {items.length} {items.length === 1 ? 'event' : 'events'} scheduled
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* X-Axis Labels */}
        <div className="mb-4 relative" style={{ height: '30px' }}>
          {timeLabels.map((label, index) => {
            const position = ((label.date.getTime() - dateRange.start.getTime()) /
              (dateRange.end.getTime() - dateRange.start.getTime())) * 100;
            return (
              <div
                key={index}
                className="absolute text-xs text-slate-600 dark:text-slate-400"
                style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
              >
                {label.label}
              </div>
            );
          })}
        </div>

        {/* Timeline Grid */}
        <div className="relative border-t border-slate-300 dark:border-slate-600 overflow-x-auto" style={{ minHeight: `${Math.max(items.length * 80, 200)}px` }}>
          <div className="relative" style={{ minWidth: '100%', width: '100%' }}>
            {/* Grid Lines */}
            {timeLabels.map((label, index) => {
              const position = ((label.date.getTime() - dateRange.start.getTime()) /
                (dateRange.end.getTime() - dateRange.start.getTime())) * 100;
              return (
                <div
                  key={`grid-${index}`}
                  className="absolute top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700"
                  style={{ left: `${position}%` }}
                />
              );
            })}

            {/* Schedule Items */}
            {items.map((item, index) => {
              const { left, width } = getItemPosition(item);
              const statusColor = item.status === 'CONFIRMED'
                ? 'bg-blue-500'
                : item.status === 'PENDING'
                ? 'bg-yellow-500'
                : 'bg-gray-400';

              // Ensure minimum width for visibility
              const displayWidth = Math.max(width, 2);

              return (
                <div
                  key={item.id}
                  className="absolute"
                  style={{
                    top: `${index * 80}px`,
                    left: `${left}%`,
                    width: `${displayWidth}%`,
                    minWidth: displayWidth < 5 ? '150px' : 'auto'
                  }}
                >
                  <div className={`${statusColor} text-white rounded-lg p-3 shadow-md hover:shadow-lg transition-shadow h-16 flex flex-col justify-between`}>
                    <div className="font-semibold text-sm truncate">{item.eventName}</div>
                    <div className="text-xs opacity-90 space-y-1">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">
                          {item.startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} -
                          {item.endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{item.venue}</span>
                      </div>
                      {item.sessions && item.sessions[0] && (
                        <div className="text-xs opacity-75 truncate">
                          {item.sessions[0].title}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 flex gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-sm text-slate-600 dark:text-slate-400">Confirmed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span className="text-sm text-slate-600 dark:text-slate-400">Pending</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

