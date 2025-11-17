'use client';

import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export function InfoBanner() {
  return (
    <Card className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
      <CardContent className="p-4">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
              Admin Event Creation
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Events created by admins are <strong>automatically published</strong> and will be immediately visible to all users.
              They bypass the approval workflow that speaker-created events go through.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

