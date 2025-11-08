import { prisma } from '../database';
import { logger } from '../utils/logger';
import {
  IFeedbackService,
  FeedbackForm,
  FeedbackResponse,
  CreateFeedbackFormRequest,
  UpdateFeedbackFormRequest,
  SubmitFeedbackRequest,
  FeedbackFormResponse,
  FeedbackSubmissionResponse,
  FeedbackAnalytics,
  FeedbackListResponse,
  FeedbackSubmissionsListResponse,
  FeedbackValidationResult,
  FeedbackFormNotFoundError,
  FeedbackSubmissionNotFoundError,
  DuplicateFeedbackSubmissionError,
  InvalidRatingError,
  FeedbackFormClosedError,
  FeedbackFormNotPublishedError
} from '../types/feedback.types';

export class FeedbackService implements IFeedbackService {

  // Feedback Form Management
  async createFeedbackForm(data: CreateFeedbackFormRequest): Promise<FeedbackForm> {
    try {
      logger.info('Creating feedback form', { eventId: data.eventId, title: data.title });

      // Check if feedback form already exists for this event
      const existingForm = await prisma.feedbackForm.findUnique({
        where: { eventId: data.eventId }
      });

      if (existingForm) {
        throw new Error(`Feedback form already exists for event ${data.eventId}`);
      }

      const feedbackForm = await prisma.feedbackForm.create({
        data: {
          eventId: data.eventId,
          title: data.title,
          description: data.description,
          status: 'DRAFT' // Start as DRAFT
        }
      });

      logger.info('Feedback form created successfully', { formId: feedbackForm.id });
      return {
        ...feedbackForm,
        description: feedbackForm.description || undefined
      };
    } catch (error) {
      logger.error('Failed to create feedback form', error as Error);
      throw error;
    }
  }

  async updateFeedbackForm(formId: string, data: UpdateFeedbackFormRequest): Promise<FeedbackForm> {
    try {
      logger.info('Updating feedback form', { formId, updates: data });

      const updateData: any = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.status !== undefined) updateData.status = data.status;

      const feedbackForm = await prisma.feedbackForm.update({
        where: { id: formId },
        data: updateData
      });

      logger.info('Feedback form updated successfully', { formId });
      return {
        ...feedbackForm,
        description: feedbackForm.description || undefined
      };
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new FeedbackFormNotFoundError(formId);
      }
      logger.error('Failed to update feedback form', error as Error);
      throw error;
    }
  }

  async closeFeedbackForm(formId: string): Promise<FeedbackForm> {
    try {
      logger.info('Closing feedback form', { formId });

      const feedbackForm = await prisma.feedbackForm.update({
        where: { id: formId },
        data: { status: 'CLOSED' }
      });

      logger.info('Feedback form closed successfully', { formId });
      return {
        ...feedbackForm,
        description: feedbackForm.description || undefined
      };
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new FeedbackFormNotFoundError(formId);
      }
      logger.error('Failed to close feedback form', error as Error);
      throw error;
    }
  }

  async deleteFeedbackForm(formId: string): Promise<void> {
    try {
      logger.info('Deleting feedback form', { formId });

      await prisma.feedbackForm.delete({
        where: { id: formId }
      });

      logger.info('Feedback form deleted successfully', { formId });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new FeedbackFormNotFoundError(formId);
      }
      logger.error('Failed to delete feedback form', error as Error);
      throw error;
    }
  }

  async getFeedbackForm(formId: string): Promise<FeedbackFormResponse | null> {
    try {
      const form = await prisma.feedbackForm.findUnique({
        where: { id: formId },
        include: {
          responses: {
            select: {
              rating: true
            }
          }
        }
      });

      if (!form) {
        return null;
      }

      const responseCount = form.responses.length;
      const averageRating = responseCount > 0
        ? form.responses.reduce((sum, response) => sum + response.rating, 0) / responseCount
        : undefined;

      return {
        id: form.id,
        eventId: form.eventId,
        title: form.title,
        description: form.description || undefined,
        status: form.status as 'DRAFT' | 'PUBLISHED' | 'CLOSED',
        responseCount,
        averageRating,
        createdAt: form.createdAt,
        updatedAt: form.updatedAt
      };
    } catch (error) {
      logger.error('Failed to get feedback form', error as Error);
      throw error;
    }
  }

  async getFeedbackFormByEventId(eventId: string): Promise<FeedbackFormResponse | null> {
    try {
      const form = await prisma.feedbackForm.findUnique({
        where: { eventId },
        include: {
          responses: {
            select: {
              rating: true
            }
          }
        }
      });

      if (!form) {
        return null;
      }

      // Users can see forms in DRAFT or PUBLISHED status, but not CLOSED
      if (form.status === 'CLOSED') {
        return null;
      }

      const responseCount = form.responses.length;
      const averageRating = responseCount > 0
        ? form.responses.reduce((sum, response) => sum + response.rating, 0) / responseCount
        : undefined;

      return {
        id: form.id,
        eventId: form.eventId,
        title: form.title,
        description: form.description || undefined,
        status: form.status as 'DRAFT' | 'PUBLISHED' | 'CLOSED',
        responseCount,
        averageRating,
        createdAt: form.createdAt,
        updatedAt: form.updatedAt
      };
    } catch (error) {
      logger.error('Failed to get feedback form by event ID', error as Error);
      throw error;
    }
  }

  async listFeedbackForms(page: number = 1, limit: number = 10): Promise<FeedbackListResponse> {
    try {
      const skip = (page - 1) * limit;

      const [forms, total] = await Promise.all([
        prisma.feedbackForm.findMany({
          skip,
          take: limit,
          include: {
            responses: {
              select: {
                rating: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.feedbackForm.count()
      ]);

      const formResponses = forms.map(form => {
        const responseCount = form.responses.length;
        const averageRating = responseCount > 0
          ? form.responses.reduce((sum, response) => sum + response.rating, 0) / responseCount
          : undefined;

        return {
          id: form.id,
          eventId: form.eventId,
          title: form.title,
          description: form.description || undefined,
          status: form.status as 'DRAFT' | 'PUBLISHED' | 'CLOSED',
          responseCount,
          averageRating,
          createdAt: form.createdAt,
          updatedAt: form.updatedAt
        };
      });

      return {
        forms: formResponses,
        total,
        page,
        limit
      };
    } catch (error) {
      logger.error('Failed to list feedback forms', error as Error);
      throw error;
    }
  }

  // Feedback Submission Management
  async submitFeedback(userId: string, data: SubmitFeedbackRequest): Promise<FeedbackSubmissionResponse> {
    try {
      logger.info('Submitting feedback', { userId, formId: data.formId, bookingId: data.bookingId });

      // Validate rating
      this.validateRating(data.rating);

      // Check if form exists and is not closed
      const form = await prisma.feedbackForm.findUnique({
        where: { id: data.formId }
      });

      if (!form) {
        throw new FeedbackFormNotFoundError(data.formId);
      }

      // Only PUBLISHED forms can accept submissions
      if (form.status === 'CLOSED') {
        throw new FeedbackFormClosedError(data.formId);
      }

      if (form.status === 'DRAFT') {
        throw new FeedbackFormNotPublishedError(data.formId);
      }

      if (form.status !== 'PUBLISHED') {
        throw new FeedbackFormNotPublishedError(data.formId);
      }

      // Check for duplicate submission
      const existingSubmission = await prisma.feedbackResponse.findUnique({
        where: { bookingId: data.bookingId }
      });

      if (existingSubmission) {
        throw new DuplicateFeedbackSubmissionError(data.bookingId);
      }

      const submission = await prisma.feedbackResponse.create({
        data: {
          formId: data.formId,
          userId,
          eventId: form.eventId,
          bookingId: data.bookingId,
          rating: data.rating,
          comment: data.comment
        }
      });

      logger.info('Feedback submitted successfully', { submissionId: submission.id });
      return {
        ...submission,
        comment: submission.comment || undefined
      };
    } catch (error) {
      logger.error('Failed to submit feedback', error as Error);
      throw error;
    }
  }

  async getFeedbackSubmission(submissionId: string): Promise<FeedbackSubmissionResponse | null> {
    try {
      const submission = await prisma.feedbackResponse.findUnique({
        where: { id: submissionId }
      });

      return submission ? {
        ...submission,
        comment: submission.comment || undefined
      } : null;
    } catch (error) {
      logger.error('Failed to get feedback submission', error as Error);
      throw error;
    }
  }

  async getUserFeedbackSubmissions(userId: string, page: number = 1, limit: number = 10): Promise<FeedbackSubmissionsListResponse> {
    try {
      const skip = (page - 1) * limit;

      const [submissions, total] = await Promise.all([
        prisma.feedbackResponse.findMany({
          where: { userId },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.feedbackResponse.count({
          where: { userId }
        })
      ]);

      return {
        submissions: submissions.map(submission => ({
          ...submission,
          comment: submission.comment || undefined
        })),
        total,
        page,
        limit
      };
    } catch (error) {
      logger.error('Failed to get user feedback submissions', error as Error);
      throw error;
    }
  }

  async getEventFeedbackSubmissions(eventId: string, page: number = 1, limit: number = 10): Promise<FeedbackSubmissionsListResponse> {
    try {
      const skip = (page - 1) * limit;

      const [submissions, total] = await Promise.all([
        prisma.feedbackResponse.findMany({
          where: { eventId },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.feedbackResponse.count({
          where: { eventId }
        })
      ]);

      return {
        submissions: submissions.map(submission => ({
          ...submission,
          comment: submission.comment || undefined
        })),
        total,
        page,
        limit
      };
    } catch (error) {
      logger.error('Failed to get event feedback submissions', error as Error);
      throw error;
    }
  }

  // Analytics
  async getFeedbackAnalytics(formId: string): Promise<FeedbackAnalytics> {
    try {
      const form = await prisma.feedbackForm.findUnique({
        where: { id: formId },
        include: {
          responses: true
        }
      });

      if (!form) {
        throw new FeedbackFormNotFoundError(formId);
      }

      const responses = form.responses;
      const totalResponses = responses.length;

      if (totalResponses === 0) {
        return {
          formId,
          eventId: form.eventId,
          totalResponses: 0,
          averageRating: 0,
          ratingDistribution: {},
          responseRate: 0,
          totalBookings: 0
        };
      }

      const averageRating = responses.reduce((sum, response) => sum + response.rating, 0) / totalResponses;

      const ratingDistribution = responses.reduce((dist, response) => {
        dist[response.rating] = (dist[response.rating] || 0) + 1;
        return dist;
      }, {} as { [rating: number]: number });

      // Note: totalBookings would need to be fetched from booking service
      // For now, we'll use totalResponses as a placeholder
      const totalBookings = totalResponses; // This should be fetched from booking service
      const responseRate = totalBookings > 0 ? (totalResponses / totalBookings) * 100 : 0;

      return {
        formId,
        eventId: form.eventId,
        totalResponses,
        averageRating,
        ratingDistribution,
        responseRate,
        totalBookings
      };
    } catch (error) {
      logger.error('Failed to get feedback analytics', error as Error);
      throw error;
    }
  }

  async getEventFeedbackAnalytics(eventId: string): Promise<FeedbackAnalytics> {
    try {
      const form = await this.getFeedbackFormByEventId(eventId);

      if (!form) {
        throw new FeedbackFormNotFoundError(eventId);
      }

      return this.getFeedbackAnalytics(form.id);
    } catch (error) {
      logger.error('Failed to get event feedback analytics', error as Error);
      throw error;
    }
  }

  // Validation helpers
  private validateRating(rating: number): void {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new InvalidRatingError(rating);
    }
  }

  validateFeedbackSubmission(data: SubmitFeedbackRequest): FeedbackValidationResult {
    const errors: string[] = [];

    if (!data.formId || data.formId.trim() === '') {
      errors.push('Form ID is required');
    }

    if (!data.bookingId || data.bookingId.trim() === '') {
      errors.push('Booking ID is required');
    }

    if (!Number.isInteger(data.rating) || data.rating < 1 || data.rating > 5) {
      errors.push('Rating must be an integer between 1 and 5');
    }

    if (data.comment && data.comment.length > 1000) {
      errors.push('Comment must be 1000 characters or less');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const feedbackService = new FeedbackService();
