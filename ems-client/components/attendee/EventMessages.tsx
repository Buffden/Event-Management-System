'use client';

import { AlertCircle, CheckCircle } from 'lucide-react';

interface EventMessagesProps {
  errorMessage?: string;
  successMessage?: string;
}

export function EventMessages({ errorMessage, successMessage }: EventMessagesProps) {
  return (
    <>
      {errorMessage && (
        <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-400 rounded-r-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-red-700 font-medium">{errorMessage}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-400 rounded-r-lg">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
            <p className="text-green-700 font-medium">{successMessage}</p>
          </div>
        </div>
      )}
    </>
  );
}

