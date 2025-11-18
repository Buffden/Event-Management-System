'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
}

export function StatsCard({ title, value, subtitle, icon: Icon, iconColor = 'text-blue-600' }: StatsCardProps) {
  return (
    <Card className="border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
          {title}
        </CardTitle>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
        {subtitle && (
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

