'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

interface QuickActionButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'outline';
  className?: string;
}

export function QuickActionButton({
  icon: Icon,
  label,
  onClick,
  variant = 'outline',
  className = ''
}: QuickActionButtonProps) {
  const baseClasses = variant === 'default'
    ? 'h-20 flex flex-col items-center justify-center space-y-2 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700'
    : 'h-20 flex flex-col items-center justify-center space-y-2 border-slate-200 dark:border-slate-700';

  return (
    <Button
      variant={variant}
      onClick={onClick}
      className={`${baseClasses} ${className}`}
    >
      <Icon className="h-5 w-5" />
      <span className="text-sm">{label}</span>
    </Button>
  );
}

