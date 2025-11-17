'use client';

import { AlertCircle } from 'lucide-react';

interface ErrorAlertProps {
  message: string;
}

export function ErrorAlert({ message }: ErrorAlertProps) {
  return (
    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
      <div className="flex items-center">
        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
        <p className="text-red-800 dark:text-red-200">{message}</p>
      </div>
    </div>
  );
}

