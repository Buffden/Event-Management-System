import { BaseApiClient } from './base-api.client';
import { logger } from '../logger';

const LOGGER_COMPONENT_NAME = 'FeedbackApiClient';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/api';

// Types
export type FeedbackFormStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';

export interface FeedbackForm {
  id: string;
  eventId: string;
  title: string;
  description?: string;
  status: FeedbackFormStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeedbackFormResponse extends FeedbackForm {
  responseCount: number;
  averageRating?: number;
}

export interface CreateFeedbackFormRequest {
  eventId: string;
  title: string;
  description?: string;
}

export interface UpdateFeedbackFormRequest {
  title?: string;
  description?: string;
  status?: FeedbackFormStatus;
}

export interface SubmitFeedbackRequest {
  formId: string;
  bookingId: string;
  rating: number;
  comment?: string;
}

export interface FeedbackSubmissionResponse {
  id: string;
  formId: string;
  userId: string;
  eventId: string;
  bookingId: string;
  rating: number;
  comment?: string;
  createdAt: Date;
}

// Feedback API client class
class FeedbackApiClient extends BaseApiClient {
  protected readonly LOGGER_COMPONENT_NAME = LOGGER_COMPONENT_NAME;

  constructor() {
    super(API_BASE_URL);
  }

  async createFeedbackForm(data: CreateFeedbackFormRequest): Promise<FeedbackForm> {
    try {
      logger.debug(LOGGER_COMPONENT_NAME, 'Creating feedback form', { eventId: data.eventId });

      const response = await fetch(`${this.baseURL}/feedback/forms`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      logger.info(LOGGER_COMPONENT_NAME, 'Feedback form created successfully', { formId: result.data.id });
      return result.data;
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to create feedback form', error as Error);
      throw error;
    }
  }

  async getFeedbackFormByEventId(eventId: string): Promise<FeedbackFormResponse | null> {
    try {
      logger.debug(LOGGER_COMPONENT_NAME, 'Getting feedback form by event ID', { eventId });

      const response = await fetch(`${this.baseURL}/feedback/events/${eventId}/form`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 404) {
        // 404 is expected when no feedback form exists - not an error
        logger.debug(LOGGER_COMPONENT_NAME, 'No feedback form found for event', { eventId });
        return null;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      // Only log as error if it's not a 404 (which is handled above)
      if (error instanceof Error && !error.message.includes('404')) {
        logger.error(LOGGER_COMPONENT_NAME, 'Failed to get feedback form by event ID', error as Error);
      }
      throw error;
    }
  }

  async getFeedbackForm(formId: string): Promise<FeedbackFormResponse> {
    try {
      logger.debug(LOGGER_COMPONENT_NAME, 'Getting feedback form', { formId });

      const response = await fetch(`${this.baseURL}/feedback/forms/${formId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to get feedback form', error as Error);
      throw error;
    }
  }

  async updateFeedbackForm(formId: string, data: UpdateFeedbackFormRequest): Promise<FeedbackForm> {
    try {
      logger.debug(LOGGER_COMPONENT_NAME, 'Updating feedback form', { formId, data });

      const response = await fetch(`${this.baseURL}/feedback/forms/${formId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      logger.info(LOGGER_COMPONENT_NAME, 'Feedback form updated successfully', { formId });
      return result.data;
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to update feedback form', error as Error);
      throw error;
    }
  }

  async closeFeedbackForm(formId: string): Promise<FeedbackForm> {
    try {
      logger.debug(LOGGER_COMPONENT_NAME, 'Closing feedback form', { formId });

      const response = await fetch(`${this.baseURL}/feedback/forms/${formId}/close`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      logger.info(LOGGER_COMPONENT_NAME, 'Feedback form closed successfully', { formId });
      return result.data;
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to close feedback form', error as Error);
      throw error;
    }
  }

  async deleteFeedbackForm(formId: string): Promise<void> {
    try {
      logger.debug(LOGGER_COMPONENT_NAME, 'Deleting feedback form', { formId });

      const response = await fetch(`${this.baseURL}/feedback/forms/${formId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      logger.info(LOGGER_COMPONENT_NAME, 'Feedback form deleted successfully', { formId });
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to delete feedback form', error as Error);
      throw error;
    }
  }

  async submitFeedback(data: SubmitFeedbackRequest): Promise<FeedbackSubmissionResponse> {
    try {
      logger.debug(LOGGER_COMPONENT_NAME, 'Submitting feedback', { formId: data.formId, bookingId: data.bookingId });

      const response = await fetch(`${this.baseURL}/feedback/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      logger.info(LOGGER_COMPONENT_NAME, 'Feedback submitted successfully', { submissionId: result.data.id });
      return result.data;
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to submit feedback', error as Error);
      throw error;
    }
  }
}

// Create and export the Feedback API client instance
export const feedbackApiClient = new FeedbackApiClient();

// Convenience exports for feedback methods
export const feedbackAPI = {
  createFeedbackForm: (data: CreateFeedbackFormRequest) => feedbackApiClient.createFeedbackForm(data),
  getFeedbackFormByEventId: (eventId: string) => feedbackApiClient.getFeedbackFormByEventId(eventId),
  getFeedbackForm: (formId: string) => feedbackApiClient.getFeedbackForm(formId),
  updateFeedbackForm: (formId: string, data: UpdateFeedbackFormRequest) => feedbackApiClient.updateFeedbackForm(formId, data),
  closeFeedbackForm: (formId: string) => feedbackApiClient.closeFeedbackForm(formId),
  deleteFeedbackForm: (formId: string) => feedbackApiClient.deleteFeedbackForm(formId),
  submitFeedback: (data: SubmitFeedbackRequest) => feedbackApiClient.submitFeedback(data),
};

