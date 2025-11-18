'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft, Eye, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ActionButtonsProps {
  isSubmitting: boolean;
  onPreview: () => void;
}

export function ActionButtons({ isSubmitting, onPreview }: ActionButtonsProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-slate-200 dark:border-slate-700">
      <Button
        type="button"
        variant="outline"
        onClick={() => router.push('/dashboard/admin/events')}
        className="flex-1 sm:flex-none"
        disabled={isSubmitting}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Cancel
      </Button>

      <Button
        type="button"
        variant="outline"
        onClick={onPreview}
        className="flex-1 sm:flex-none"
        disabled={isSubmitting}
      >
        <Eye className="h-4 w-4 mr-2" />
        Preview
      </Button>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="flex-1 sm:flex-none bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
      >
        {isSubmitting ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Creating & Publishing...
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            Create & Publish Event
          </>
        )}
      </Button>
    </div>
  );
}

