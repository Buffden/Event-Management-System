'use client';

import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

export function SuccessState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Card className="max-w-md w-full mx-4">
        <CardContent className="text-center py-12">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">
            Event Created & Published!
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            The event has been successfully created and published. It's now visible to all users.
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-500">
            Redirecting to events list...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

