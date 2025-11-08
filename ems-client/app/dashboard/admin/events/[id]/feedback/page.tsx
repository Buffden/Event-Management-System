'use client';

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Settings,
  Trash2,
  Save,
  X,
  MessageSquare,
  BarChart3,
  Eye,
  Star,
  User,
  Calendar
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useLogger } from "@/lib/logger/LoggerProvider";
import { feedbackAPI, FeedbackFormResponse, FeedbackFormStatus, FeedbackSubmissionResponse } from "@/lib/api/feedback.api";
import { eventAPI } from "@/lib/api/event.api";
import { withAdminAuth } from "@/components/hoc/withAuth";

const COMPONENT_NAME = 'FeedbackManagementPage';

const statusColors = {
  DRAFT: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  PUBLISHED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  CLOSED: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

function FeedbackManagementPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const logger = useLogger();
  const eventId = params.id as string;

  const [event, setEvent] = useState<any>(null);
  const [feedbackForm, setFeedbackForm] = useState<FeedbackFormResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<FeedbackFormStatus>('DRAFT');

  // Responses modal state
  const [showResponsesModal, setShowResponsesModal] = useState(false);
  const [responses, setResponses] = useState<FeedbackSubmissionResponse[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);

  useEffect(() => {
    loadData();
  }, [eventId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load event
      const eventResponse = await eventAPI.getEventById(eventId);
      if (eventResponse.success) {
        setEvent(eventResponse.data);
      }

      // Load feedback form
      const form = await feedbackAPI.getFeedbackFormByEventId(eventId);
      if (form) {
        setFeedbackForm(form);
        setTitle(form.title);
        setDescription(form.description || '');
        setStatus(form.status);
      } else {
        setError('Feedback form not found for this event');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      setError(errorMessage);
      logger.error(COMPONENT_NAME, 'Failed to load data', err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!feedbackForm) return;

    try {
      setSaving(true);
      await feedbackAPI.updateFeedbackForm(feedbackForm.id, {
        title,
        description: description || undefined,
        status,
      });

      logger.info(COMPONENT_NAME, 'Feedback form updated successfully');
      await loadData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update feedback form';
      setError(errorMessage);
      logger.error(COMPONENT_NAME, 'Failed to update feedback form', err instanceof Error ? err : new Error(String(err)));
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async () => {
    if (!feedbackForm) return;

    try {
      setSaving(true);
      await feedbackAPI.closeFeedbackForm(feedbackForm.id);
      logger.info(COMPONENT_NAME, 'Feedback form closed successfully');
      await loadData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to close feedback form';
      setError(errorMessage);
      logger.error(COMPONENT_NAME, 'Failed to close feedback form', err instanceof Error ? err : new Error(String(err)));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!feedbackForm) return;
    if (!confirm('Are you sure you want to delete this feedback form? This will also delete all feedback responses.')) {
      return;
    }

    try {
      setDeleting(true);
      await feedbackAPI.deleteFeedbackForm(feedbackForm.id);
      logger.info(COMPONENT_NAME, 'Feedback form deleted successfully');
      router.push(`/dashboard/admin/events/${eventId}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete feedback form';
      setError(errorMessage);
      logger.error(COMPONENT_NAME, 'Failed to delete feedback form', err instanceof Error ? err : new Error(String(err)));
    } finally {
      setDeleting(false);
    }
  };

  const handleViewResponses = async () => {
    try {
      setLoadingResponses(true);
      setShowResponsesModal(true);
      
      const result = await feedbackAPI.getEventFeedbackSubmissions(eventId, 1, 100);
      setResponses(result.submissions);
      
      logger.info(COMPONENT_NAME, 'Feedback responses loaded', { count: result.submissions.length });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load responses';
      setError(errorMessage);
      logger.error(COMPONENT_NAME, 'Failed to load responses', err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoadingResponses(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating
            ? 'fill-yellow-400 text-yellow-400'
            : 'fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700'
        }`}
      />
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-700 dark:text-slate-300 font-medium">Loading feedback form...</p>
        </div>
      </div>
    );
  }

  if (error && !feedbackForm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              {error}
            </h3>
            <Button
              onClick={() => router.push(`/dashboard/admin/events/${eventId}`)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 mt-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Event
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/dashboard/admin/events/${eventId}`)}
                className="text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Event
              </Button>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Feedback Form Management
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Card className="mb-6 border-red-200 dark:border-red-800">
            <CardContent className="p-4">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </CardContent>
          </Card>
        )}

        {event && (
          <Card className="mb-6 border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-lg">Event: {event.name}</CardTitle>
            </CardHeader>
          </Card>
        )}

        {feedbackForm && (
          <Card className="border-slate-200 dark:border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl mb-2">Feedback Form</CardTitle>
                  <Badge className={statusColors[feedbackForm.status]}>
                    {feedbackForm.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {feedbackForm.responseCount}
                    </span> responses
                  </div>
                  {feedbackForm.averageRating && (
                    <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {feedbackForm.averageRating.toFixed(1)}
                      </span>
                    </div>
                  )}
                  {feedbackForm.responseCount > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleViewResponses}
                      className="border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Responses
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Feedback form title"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Feedback form description"
                    rows={4}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as FeedbackFormStatus)}
                    className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>

                  {feedbackForm.status !== 'CLOSED' && (
                    <Button
                      variant="outline"
                      onClick={handleClose}
                      disabled={saving}
                      className="border-orange-200 text-orange-600 hover:bg-orange-50"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Close Form
                    </Button>
                  )}

                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {deleting ? 'Deleting...' : 'Delete Form'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Responses Modal */}
      {showResponsesModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[80vh] flex flex-col">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Feedback Responses</CardTitle>
                  <CardDescription className="mt-1">
                    {responses.length} total responses
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowResponsesModal(false)}
                  className="hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-y-auto flex-1 p-6">
              {loadingResponses ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-600 dark:text-slate-400">Loading responses...</p>
                  </div>
                </div>
              ) : responses.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 dark:text-slate-400">No responses yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {responses.map((response, index) => (
                    <Card key={response.id} className="border border-slate-200 dark:border-slate-700">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              Response #{index + 1}
                            </Badge>
                            <div className="flex items-center gap-1">
                              {renderStars(response.rating)}
                            </div>
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">
                              {response.rating}/5
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <Calendar className="h-3 w-3" />
                            {new Date(response.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-2 mb-3">
                          <User className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                          <div className="text-sm">
                            <span className="text-slate-600 dark:text-slate-400">User ID:</span>{' '}
                            <span className="font-mono text-xs text-slate-900 dark:text-white">
                              {response.userId.substring(0, 8)}...
                            </span>
                          </div>
                        </div>

                        <div className="flex items-start gap-2 mb-3">
                          <MessageSquare className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                          <div className="text-sm">
                            <span className="text-slate-600 dark:text-slate-400">Booking ID:</span>{' '}
                            <span className="font-mono text-xs text-slate-900 dark:text-white">
                              {response.bookingId.substring(0, 8)}...
                            </span>
                          </div>
                        </div>

                        {response.comment && (
                          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                              Comment:
                            </p>
                            <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                              {response.comment}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default withAdminAuth(FeedbackManagementPage);

