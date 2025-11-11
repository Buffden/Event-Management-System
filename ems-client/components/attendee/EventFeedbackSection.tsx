'use client';

import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { FeedbackFormResponse } from '@/lib/api/feedback.api';
import { useRouter } from 'next/navigation';

interface EventFeedbackSectionProps {
  feedbackForm: FeedbackFormResponse;
  hasUserSubmission: boolean;
  onProvideFeedback: () => void;
  eventId: string;
}

export function EventFeedbackSection({
  feedbackForm,
  hasUserSubmission,
  onProvideFeedback,
  eventId
}: EventFeedbackSectionProps) {
  const router = useRouter();

  return (
    <div className={`mb-4 p-3 border rounded-lg ${
      hasUserSubmission
        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
        : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className={`h-4 w-4 ${
            hasUserSubmission
              ? 'text-green-600 dark:text-green-400'
              : 'text-blue-600 dark:text-blue-400'
          }`} />
          <span className={`text-sm font-medium ${
            hasUserSubmission
              ? 'text-green-900 dark:text-green-100'
              : 'text-blue-900 dark:text-blue-100'
          }`}>
            {hasUserSubmission
              ? 'Feedback Form Filled'
              : 'Feedback Form Available'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {hasUserSubmission ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                router.push(`/dashboard/attendee/events/${eventId}/feedback`);
              }}
              className="text-green-700 dark:text-green-300 border-green-300 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/40"
            >
              View Response
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={onProvideFeedback}
              className="text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/40"
            >
              Provide Feedback
            </Button>
          )}
        </div>
      </div>
      {feedbackForm.description && (
        <p className={`text-xs mt-2 ${
          hasUserSubmission
            ? 'text-green-700 dark:text-green-300'
            : 'text-blue-700 dark:text-blue-300'
        }`}>
          {feedbackForm.description}
        </p>
      )}
    </div>
  );
}

