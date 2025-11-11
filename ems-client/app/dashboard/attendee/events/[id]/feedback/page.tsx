'use client';

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  MessageSquare,
  Star,
  Calendar,
  Loader2,
  Edit,
  Save,
  X
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useLogger } from "@/lib/logger/LoggerProvider";
import { withUserAuth } from "@/components/hoc/withAuth";
import { feedbackAPI, FeedbackSubmissionResponse, UpdateFeedbackRequest } from "@/lib/api/feedback.api";
import { eventAPI } from "@/lib/api/event.api";

const LOGGER_COMPONENT_NAME = 'AttendeeEventFeedbackPage';

function AttendeeEventFeedbackPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const logger = useLogger();
  const eventId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<FeedbackSubmissionResponse[]>([]);
  const [eventName, setEventName] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState<number>(0);
  const [editComment, setEditComment] = useState<string>('');
  const [editHoveredRating, setEditHoveredRating] = useState<number>(0);
  const [saving, setSaving] = useState(false);

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

        // Load user's feedback submissions for this event
        const result = await feedbackAPI.getMyFeedbackSubmissions(1, 1000);
        const eventSubmissions = result.submissions.filter(
          (submission) => submission.eventId === eventId
        );
        setSubmissions(eventSubmissions);

        logger.info(LOGGER_COMPONENT_NAME, 'User feedback submissions loaded', {
          eventId,
          count: eventSubmissions.length
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

  const renderStars = (rating: number, interactive: boolean = false, onStarClick?: (star: number) => void, onStarHover?: (star: number) => void, onStarLeave?: () => void) => {
    return Array.from({ length: 5 }, (_, i) => {
      const starValue = i + 1;
      const isFilled = starValue <= (interactive ? (editHoveredRating || editRating) : rating);

      if (interactive) {
        return (
          <button
            key={i}
            type="button"
            className="focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            onClick={() => onStarClick?.(starValue)}
            onMouseEnter={() => onStarHover?.(starValue)}
            onMouseLeave={() => onStarLeave?.()}
            disabled={saving}
          >
            <Star
              className={`h-6 w-6 transition-colors ${
                isFilled
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300 dark:text-gray-600'
              }`}
            />
          </button>
        );
      }

      return (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < rating
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-gray-300 dark:text-gray-600'
          }`}
        />
      );
    });
  };

  const handleEdit = (submission: FeedbackSubmissionResponse) => {
    setEditingId(submission.id);
    setEditRating(submission.rating);
    setEditComment(submission.comment || '');
    setEditHoveredRating(0);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditRating(0);
    setEditComment('');
    setEditHoveredRating(0);
  };

  const handleSaveEdit = async (submissionId: string) => {
    if (editRating === 0) {
      setError('Please provide a rating.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const updateData: UpdateFeedbackRequest = {
        rating: editRating,
        comment: editComment.trim() || undefined
      };

      await feedbackAPI.updateFeedback(submissionId, updateData);

      // Reload submissions
      const result = await feedbackAPI.getMyFeedbackSubmissions(1, 1000);
      const eventSubmissions = result.submissions.filter(
        (submission) => submission.eventId === eventId
      );
      setSubmissions(eventSubmissions);

      setEditingId(null);
      setEditRating(0);
      setEditComment('');
      setEditHoveredRating(0);

      logger.info(LOGGER_COMPONENT_NAME, 'Feedback updated successfully', { submissionId });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update feedback';
      setError(errorMessage);
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to update feedback', err instanceof Error ? err : new Error(String(err)));
    } finally {
      setSaving(false);
    }
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
                My Feedback Responses
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
              Response Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {submissions.length}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {submissions.length === 1 ? 'Response' : 'Responses'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feedback Responses */}
        {submissions.length === 0 ? (
          <Card className="border-slate-200 dark:border-slate-700">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 mx-auto text-slate-400 dark:text-slate-600 mb-4" />
                <p className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  No responses found
                </p>
                <p className="text-slate-600 dark:text-slate-400">
                  You haven't submitted any feedback for this event yet.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {error && (
              <Card className="border-red-200 dark:border-red-800">
                <CardContent className="pt-6">
                  <p className="text-red-600 dark:text-red-400">{error}</p>
                </CardContent>
              </Card>
            )}
            {submissions.map((submission) => (
              <Card
                key={submission.id}
                className="border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        Your Feedback
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
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {editingId === submission.id ? editRating : submission.rating}/5
                      </Badge>
                      {editingId !== submission.id && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(submission)}
                          className="flex items-center gap-1"
                        >
                          <Edit className="h-3 w-3" />
                          Edit
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {editingId === submission.id ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Rating *</Label>
                        <div className="flex items-center gap-2">
                          {renderStars(
                            editRating,
                            true,
                            (star) => setEditRating(star),
                            (star) => setEditHoveredRating(star),
                            () => setEditHoveredRating(0)
                          )}
                          {editRating > 0 && (
                            <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">
                              {editRating} out of 5
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Comment (Optional)</Label>
                        <Textarea
                          value={editComment}
                          onChange={(e) => setEditComment(e.target.value)}
                          rows={4}
                          maxLength={1000}
                          disabled={saving}
                          className="resize-none"
                          placeholder="Share your thoughts about this event..."
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {editComment.length}/1000 characters
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSaveEdit(submission.id)}
                          disabled={saving || editRating === 0}
                          className="flex items-center gap-1"
                        >
                          <Save className="h-3 w-3" />
                          {saving ? 'Saving...' : 'Save'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                          disabled={saving}
                          className="flex items-center gap-1"
                        >
                          <X className="h-3 w-3" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
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
                    </>
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

export default withUserAuth(AttendeeEventFeedbackPage);

