// Feedback Service Types

export interface FeedbackForm {
  id: string;
  eventId: string;
  title: string;
  description?: string;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeedbackResponse {
  id: string;
  formId: string;
  userId: string;
  eventId: string;
  bookingId: string;
  rating: number;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Request/Response DTOs
export interface CreateFeedbackFormRequest {
  eventId: string;
  title: string;
  description?: string;
}

export interface UpdateFeedbackFormRequest {
  title?: string;
  description?: string;
  isPublished?: boolean;
}

export interface SubmitFeedbackRequest {
  formId: string;
  bookingId: string;
  rating: number;
  comment?: string;
}

export interface FeedbackFormResponse {
  id: string;
  eventId: string;
  title: string;
  description?: string;
  isPublished: boolean;
  responseCount: number;
  averageRating?: number;
  createdAt: Date;
  updatedAt: Date;
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

export interface FeedbackAnalytics {
  formId: string;
  eventId: string;
  totalResponses: number;
  averageRating: number;
  ratingDistribution: {
    [rating: number]: number;
  };
  responseRate: number;
  totalBookings: number;
}

export interface FeedbackListResponse {
  forms: FeedbackFormResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface FeedbackSubmissionsListResponse {
  submissions: FeedbackSubmissionResponse[];
  total: number;
  page: number;
  limit: number;
}

// Validation types
export interface FeedbackValidationResult {
  isValid: boolean;
  errors: string[];
}

// Service interfaces
export interface IFeedbackService {
  createFeedbackForm(data: CreateFeedbackFormRequest): Promise<FeedbackForm>;
  updateFeedbackForm(formId: string, data: UpdateFeedbackFormRequest): Promise<FeedbackForm>;
  deleteFeedbackForm(formId: string): Promise<void>;
  getFeedbackForm(formId: string): Promise<FeedbackFormResponse | null>;
  getFeedbackFormByEventId(eventId: string): Promise<FeedbackFormResponse | null>;
  listFeedbackForms(page?: number, limit?: number): Promise<FeedbackListResponse>;

  submitFeedback(userId: string, data: SubmitFeedbackRequest): Promise<FeedbackSubmissionResponse>;
  getFeedbackSubmission(submissionId: string): Promise<FeedbackSubmissionResponse | null>;
  getUserFeedbackSubmissions(userId: string, page?: number, limit?: number): Promise<FeedbackSubmissionsListResponse>;
  getEventFeedbackSubmissions(eventId: string, page?: number, limit?: number): Promise<FeedbackSubmissionsListResponse>;

  getFeedbackAnalytics(formId: string): Promise<FeedbackAnalytics>;
  getEventFeedbackAnalytics(eventId: string): Promise<FeedbackAnalytics>;
}

// Error types
export class FeedbackError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'FeedbackError';
  }
}

export class FeedbackFormNotFoundError extends FeedbackError {
  constructor(formId: string) {
    super(`Feedback form with ID ${formId} not found`, 'FEEDBACK_FORM_NOT_FOUND', 404);
  }
}

export class FeedbackSubmissionNotFoundError extends FeedbackError {
  constructor(submissionId: string) {
    super(`Feedback submission with ID ${submissionId} not found`, 'FEEDBACK_SUBMISSION_NOT_FOUND', 404);
  }
}

export class DuplicateFeedbackSubmissionError extends FeedbackError {
  constructor(bookingId: string) {
    super(`Feedback already submitted for booking ${bookingId}`, 'DUPLICATE_FEEDBACK_SUBMISSION', 409);
  }
}

export class InvalidRatingError extends FeedbackError {
  constructor(rating: number) {
    super(`Invalid rating ${rating}. Rating must be between 1 and 5`, 'INVALID_RATING', 400);
  }
}

export class FeedbackFormNotPublishedError extends FeedbackError {
  constructor(formId: string) {
    super(`Feedback form ${formId} is not published`, 'FEEDBACK_FORM_NOT_PUBLISHED', 400);
  }
}
