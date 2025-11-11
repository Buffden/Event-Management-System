'use client';

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  MessageSquare,
  Star,
  User,
  Calendar,
  Loader2
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useLogger } from "@/lib/logger/LoggerProvider";
import { withSpeakerAuth } from "@/components/hoc/withAuth";
import { feedbackAPI, FeedbackSubmissionResponse } from "@/lib/api/feedback.api";
import { eventAPI } from "@/lib/api/event.api";

const LOGGER_COMPONENT_NAME = 'SpeakerEventFeedbackPage';

function SpeakerEventFeedbackPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const logger = useLogger();
  const eventId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<FeedbackSubmissionResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [eventName, setEventName] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      if (!eventId) return;

      try {
        setLoading(true);
        setError(null);

        // Load event details
        try {
          const eventResponse = await eventAPI.getEventById(eventId);
          setEventName(eventResponse.data.name);
        } catch (err) {
          logger.warn(LOGGER_COMPONENT_NAME, 'Failed to load event details', { eventId });
        }

        // Load feedback submissions
        const result = await feedbackAPI.getSpeakerEventFeedbackSubmissions(eventId, 1, 100);
        setSubmissions(result.submissions);
        setTotal(result.total);

        logger.info(LOGGER_COMPONENT_NAME, 'Feedback submissions loaded', {
          eventId,
          count: result.submissions.length,
          submissions: result.submissions.map(s => ({
            id: s.id,
            userId: s.userId,
            username: s.username,
            hasUsername: !!s.username
          }))
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load feedback submissions';
        logger.error(LOGGER_COMPONENT_NAME, 'Failed to load feedback submissions', err instanceof Error ? err : new Error(String(err)));
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [eventId, logger]);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating
            ? 'fill-yellow-400 text-yellow-400'
            : 'text-gray-300 dark:text-gray-600'
        }`}
      />
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
        <div className="max-w-6xl mx-auto">
          <Card className="border-red-200 dark:border-red-800">
            <CardContent className="pt-6">
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <Button
                variant="outline"
                onClick={() => router.back()}
                className="mt-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Button>
          <div className="flex items-center gap-3">
            <MessageSquare className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                Event Feedback
              </h1>
              {eventName && (
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                  {eventName}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Summary Card */}
        <Card className="mb-6 border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Feedback Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {total}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {total === 1 ? 'Response' : 'Responses'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feedback Responses */}
        {total === 0 ? (
          <Card className="border-slate-200 dark:border-slate-700">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 mx-auto text-slate-400 dark:text-slate-600 mb-4" />
                <p className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  0 responses
                </p>
                <p className="text-slate-600 dark:text-slate-400">
                  No feedback has been submitted for this event yet.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <Card
                key={submission.id}
                className="border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {submission.username || 'Anonymous User'}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(submission.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {submission.rating}/5
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <div className="flex items-center gap-1">
                      {renderStars(submission.rating)}
                    </div>
                  </div>
                  {submission.comment && (
                    <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                        {submission.comment}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default withSpeakerAuth(SpeakerEventFeedbackPage);

