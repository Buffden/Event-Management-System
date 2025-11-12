'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import { feedbackAPI, FeedbackFormResponse, SubmitFeedbackRequest } from '@/lib/api/feedback.api';
import { bookingAPI } from '@/lib/api/booking.api';
import { useLogger } from '@/lib/logger/LoggerProvider';
import { useAuth } from '@/lib/auth-context';

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feedbackForm: FeedbackFormResponse;
  eventId: string;
  eventName: string;
  onSuccess?: () => void;
}

const LOGGER_COMPONENT_NAME = 'FeedbackDialog';

export function FeedbackDialog({
  open,
  onOpenChange,
  feedbackForm,
  eventId,
  eventName,
  onSuccess
}: FeedbackDialogProps) {
  const logger = useLogger();
  const { user } = useAuth();
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [loadingBooking, setLoadingBooking] = useState(true);

  // Load booking ID when dialog opens
  useEffect(() => {
    if (open && eventId) {
      loadBookingId();
    } else {
      // Reset form when dialog closes
      setRating(0);
      setComment('');
      setError('');
      setHoveredRating(0);
    }
  }, [open, eventId]);

  const loadBookingId = async () => {
    try {
      setLoadingBooking(true);
      setError('');

      // Get user's bookings
      const bookingsResponse = await bookingAPI.getUserBookings();
      const bookings = bookingsResponse.data?.bookings || [];

      // Find booking for this event
      const booking = bookings.find((b: any) => b.eventId === eventId);

      if (booking) {
        setBookingId(booking.id);
      } else {
        setError('You must have a booking for this event to provide feedback.');
      }
    } catch (err) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to load booking', err as Error);
      setError('Failed to load booking information. Please try again.');
    } finally {
      setLoadingBooking(false);
    }
  };

  const handleSubmit = async () => {
    if (!bookingId) {
      setError('Booking ID is required to submit feedback.');
      return;
    }

    if (rating === 0) {
      setError('Please provide a rating.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const submitData: SubmitFeedbackRequest = {
        formId: feedbackForm.id,
        bookingId: bookingId,
        rating: rating,
        comment: comment.trim() || undefined
      };

      await feedbackAPI.submitFeedback(submitData);

      logger.info(LOGGER_COMPONENT_NAME, 'Feedback submitted successfully', {
        formId: feedbackForm.id,
        eventId,
        rating
      });

      // Reset form
      setRating(0);
      setComment('');
      setHoveredRating(0);

      // Close dialog and call success callback
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit feedback';
      setError(errorMessage);
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to submit feedback', err as Error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogClose onClick={() => onOpenChange(false)} />
        <DialogHeader>
          <DialogTitle>{feedbackForm.title}</DialogTitle>
          <DialogDescription>
            {feedbackForm.description || `Provide feedback for ${eventName}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {loadingBooking ? (
            <div className="text-center py-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">Loading...</p>
            </div>
          ) : error && !bookingId ? (
            <div className="text-center py-4">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          ) : (
            <>
              {/* Rating Section */}
              <div className="space-y-2">
                <Label htmlFor="rating">Rating *</Label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className="focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      disabled={submitting}
                    >
                      <Star
                        className={`h-8 w-8 transition-colors ${
                          star <= (hoveredRating || rating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-slate-300 dark:text-slate-600'
                        }`}
                      />
                    </button>
                  ))}
                  {rating > 0 && (
                    <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">
                      {rating} out of 5
                    </span>
                  )}
                </div>
              </div>

              {/* Comment Section */}
              <div className="space-y-2">
                <Label htmlFor="comment">Comment (Optional)</Label>
                <Textarea
                  id="comment"
                  placeholder="Share your thoughts about this event..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  maxLength={1000}
                  disabled={submitting}
                  className="resize-none"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {comment.length}/1000 characters
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !bookingId || rating === 0 || loadingBooking}
          >
            {submitting ? (
              <>
                <span className="mr-2">Submitting...</span>
              </>
            ) : (
              'Submit Feedback'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

