'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface EmptyStateProps {
  message: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export function EmptyState({ message, actionLabel, actionHref, onAction }: EmptyStateProps) {
  const router = useRouter();

  const handleAction = () => {
    if (onAction) {
      onAction();
    } else if (actionHref) {
      router.push(actionHref);
    }
  };

  return (
    <Card>
      <CardContent className="p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400 mb-4">{message}</p>
        {actionLabel && (actionHref || onAction) && (
          <Button onClick={handleAction}>
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

