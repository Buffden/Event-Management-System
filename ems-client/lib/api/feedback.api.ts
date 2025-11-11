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

export interface UpdateFeedbackRequest {
  rating: number;
  comment?: string;
}

export interface FeedbackSubmissionResponse {
  id: string;
  formId: string;
  userId: string;
  username?: string; // User's name from auth service
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
        // Return null silently without throwing
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
      // Handle 404 gracefully - don't throw, just return null
      if (error instanceof Error && error.message.includes('404')) {
        logger.debug(LOGGER_COMPONENT_NAME, 'No feedback form found for event (404)', { eventId });
        return null;
      }
      // Only log as error for non-404 errors
      if (error instanceof Error && !error.message.includes('404')) {
        logger.error(LOGGER_COMPONENT_NAME, 'Failed to get feedback form by event ID', error as Error);
      }
      // Re-throw non-404 errors
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

  async getEventFeedbackSubmissions(eventId: string, page: number = 1, limit: number = 100): Promise<{
    submissions: FeedbackSubmissionResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      logger.debug(LOGGER_COMPONENT_NAME, 'Getting event feedback submissions', { eventId, page, limit });

      const response = await fetch(`${this.baseURL}/feedback/events/${eventId}/submissions?page=${page}&limit=${limit}`, {
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
      logger.info(LOGGER_COMPONENT_NAME, 'Event feedback submissions retrieved', { count: result.data.submissions.length });
      return result.data;
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to get event feedback submissions', error as Error);
      throw error;
    }
  }

  async getSpeakerEventFeedbackSubmissions(eventId: string, page: number = 1, limit: number = 100): Promise<{
    submissions: FeedbackSubmissionResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      logger.debug(LOGGER_COMPONENT_NAME, 'Getting event feedback submissions (speaker)', { eventId, page, limit });

      const response = await fetch(`${this.baseURL}/feedback/speaker/events/${eventId}/submissions?page=${page}&limit=${limit}`, {
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
      logger.info(LOGGER_COMPONENT_NAME, 'Event feedback submissions retrieved (speaker)', { count: result.data.submissions.length });
      return result.data;
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to get event feedback submissions (speaker)', error as Error);
      throw error;
    }
  }

  async getMyFeedbackSubmissions(page: number = 1, limit: number = 100): Promise<{
    submissions: FeedbackSubmissionResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const token = this.getToken();
      const url = `${this.baseURL}/feedback/my-submissions?page=${page}&limit=${limit}`;

      logger.info(LOGGER_COMPONENT_NAME, '=== API CLIENT: Getting user feedback submissions ===', {
        page,
        limit,
        url,
        hasToken: !!token,
        tokenLength: token?.length || 0,
        timestamp: new Date().toISOString()
      });

      logger.debug(LOGGER_COMPONENT_NAME, 'Making fetch request', {
        method: 'GET',
        url,
        headers: {
          'Authorization': token ? `Bearer ${token.substring(0, 20)}...` : 'NO TOKEN',
          'Content-Type': 'application/json'
        }
      });

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      logger.info(LOGGER_COMPONENT_NAME, 'API response received', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error(LOGGER_COMPONENT_NAME, 'API request failed', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      logger.info(LOGGER_COMPONENT_NAME, '=== API CLIENT: User feedback submissions retrieved successfully ===', {
        count: result.data?.submissions?.length || 0,
        total: result.data?.total || 0,
        page: result.data?.page || 0,
        limit: result.data?.limit || 0,
        submissions: result.data?.submissions?.map((s: any) => ({
          id: s.id,
          eventId: s.eventId,
          formId: s.formId
        })) || []
      });
      return result.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(LOGGER_COMPONENT_NAME, `=== API CLIENT: Failed to get user feedback submissions === ${errorMessage}`, {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : String(error),
        errorMessage,
        errorStack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  async updateFeedback(submissionId: string, data: UpdateFeedbackRequest): Promise<FeedbackSubmissionResponse> {
    try {
      logger.debug(LOGGER_COMPONENT_NAME, 'Updating feedback', { submissionId, rating: data.rating });

      const response = await fetch(`${this.baseURL}/feedback/submissions/${submissionId}`, {
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
      logger.info(LOGGER_COMPONENT_NAME, 'Feedback updated successfully', { submissionId });
      return result.data;
    } catch (error) {
      logger.error(LOGGER_COMPONENT_NAME, 'Failed to update feedback', error as Error);
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
  getEventFeedbackSubmissions: (eventId: string, page?: number, limit?: number) => feedbackApiClient.getEventFeedbackSubmissions(eventId, page, limit),
  getSpeakerEventFeedbackSubmissions: (eventId: string, page?: number, limit?: number) => feedbackApiClient.getSpeakerEventFeedbackSubmissions(eventId, page, limit),
  getMyFeedbackSubmissions: (page?: number, limit?: number) => feedbackApiClient.getMyFeedbackSubmissions(page, limit),
  updateFeedback: (submissionId: string, data: UpdateFeedbackRequest) => feedbackApiClient.updateFeedback(submissionId, data),
};

