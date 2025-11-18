'use client';

import React from 'react';

interface TicketSectionHeaderProps {
  title: string;
  count: number;
  color?: 'green' | 'gray' | 'blue' | 'yellow';
}

export function TicketSectionHeader({ title, count, color = 'green' }: TicketSectionHeaderProps) {
  const colorClasses = {
    green: 'bg-green-500',
    gray: 'bg-gray-500',
    blue: 'bg-blue-500',
    yellow: 'bg-yellow-500'
  };

  return (
    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
      <div className={`h-5 w-5 ${colorClasses[color]} rounded-full`}></div>
      {title} ({count})
    </h2>
  );
}

