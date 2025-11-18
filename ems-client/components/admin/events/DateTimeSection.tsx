'use client';

import { Clock } from 'lucide-react';
import DateTimeSelector from '@/components/functional/DateTimeSelector';

interface DateTimeSectionProps {
  startDate: Date;
  endDate: Date;
  errors: Record<string, string>;
  onStartDateChange: (date: Date) => void;
  onEndDateChange: (date: Date) => void;
}

export function DateTimeSection({
  startDate,
  endDate,
  errors,
  onStartDateChange,
  onEndDateChange
}: DateTimeSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
        <Clock className="h-5 w-5 mr-2" />
        Date and Time
      </h3>

      <DateTimeSelector
        start={startDate}
        end={endDate}
        setStartDate={onStartDateChange}
        setEndDate={onEndDateChange}
        showTimeSelectors={true}
      />

      {errors.bookingStartDate && (
        <p className="text-sm text-red-600 dark:text-red-400">{errors.bookingStartDate}</p>
      )}
      {errors.bookingEndDate && (
        <p className="text-sm text-red-600 dark:text-red-400">{errors.bookingEndDate}</p>
      )}
    </div>
  );
}

