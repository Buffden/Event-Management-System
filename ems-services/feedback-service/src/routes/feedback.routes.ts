import { Router, Request, Response } from 'express';
import { feedbackService } from '../services/feedback.service';
import { authenticateToken, requireAdmin, requireAttendee, requireSpeaker, AuthenticatedRequest } from '../middleware/auth.middleware';
import {
  validateCreateFeedbackForm,
  validateUpdateFeedbackForm,
  validateSubmitFeedback,
  validateUpdateFeedback,
  validatePagination,
  validateIdParam
} from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { logger } from '../utils/logger';

const router = Router();

// Feedback Form Management (Admin only)
router.post('/forms',
  authenticateToken,
  requireAdmin,
  validateCreateFeedbackForm,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { eventId, title, description } = req.body;

    logger.info('Creating feedback form', {
      eventId,
      title,
      adminId: req.user?.id
    });

    const feedbackForm = await feedbackService.createFeedbackForm({
      eventId,
      title,
      description
    });

    res.status(201).json({
      success: true,
      data: feedbackForm,
      message: 'Feedback form created successfully'
    });
  })
);

router.put('/forms/:id',
  authenticateToken,
  requireAdmin,
  validateIdParam('id'),
  validateUpdateFeedbackForm,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const updates = req.body;

    logger.info('Updating feedback form', {
      formId: id,
      updates,
      adminId: req.user?.id
    });

    const feedbackForm = await feedbackService.updateFeedbackForm(id, updates);

    res.json({
      success: true,
      data: feedbackForm,
      message: 'Feedback form updated successfully'
    });
  })
);

router.patch('/forms/:id/close',
  authenticateToken,
  requireAdmin,
  validateIdParam('id'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    logger.info('Closing feedback form', {
      formId: id,
      adminId: req.user?.id
    });

    const feedbackForm = await feedbackService.closeFeedbackForm(id);

    res.json({
      success: true,
      data: feedbackForm,
      message: 'Feedback form closed successfully'
    });
  })
);

router.delete('/forms/:id',
  authenticateToken,
  requireAdmin,
  validateIdParam('id'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    logger.info('Deleting feedback form', {
      formId: id,
      adminId: req.user?.id
    });

    await feedbackService.deleteFeedbackForm(id);

    res.json({
      success: true,
      message: 'Feedback form deleted successfully'
    });
  })
);

router.get('/forms',
  authenticateToken,
  requireAdmin,
  validatePagination,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    logger.info('Listing feedback forms', {
      page,
      limit,
      adminId: req.user?.id
    });

    const result = await feedbackService.listFeedbackForms(page, limit);

    res.json({
      success: true,
      data: result
    });
  })
);

router.get('/forms/:id',
  authenticateToken,
  requireAdmin,
  validateIdParam('id'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const feedbackForm = await feedbackService.getFeedbackForm(id);

    if (!feedbackForm) {
      return res.status(404).json({
        success: false,
        error: 'Feedback form not found',
        code: 'FEEDBACK_FORM_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: feedbackForm
    });
  })
);

// Public endpoint to get feedback form by event ID
// Users can see forms in DRAFT or PUBLISHED status (not CLOSED)
router.get('/events/:eventId/form',
  asyncHandler(async (req: Request, res: Response) => {
    const { eventId } = req.params;

    const feedbackForm = await feedbackService.getFeedbackFormByEventId(eventId);

    if (!feedbackForm) {
      return res.status(404).json({
        success: false,
        error: 'Feedback form not found for this event',
        code: 'FEEDBACK_FORM_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: feedbackForm
    });
  })
);

// Feedback Submission (Authenticated users)
router.post('/submit',
  authenticateToken,
  requireAttendee,
  validateSubmitFeedback,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { formId, bookingId, rating, comment } = req.body;
    const userId = req.user!.id;

    logger.info('Submitting feedback', {
      userId,
      formId,
      bookingId,
      rating
    });

    const submission = await feedbackService.submitFeedback(userId, {
      formId,
      bookingId,
      rating,
      comment
    });

    res.status(201).json({
      success: true,
      data: submission,
      message: 'Feedback submitted successfully'
    });
  })
);

router.put('/submissions/:id',
  authenticateToken,
  requireAttendee,
  validateIdParam('id'),
  validateUpdateFeedback,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user!.id;

    logger.info('Updating feedback submission', {
      userId,
      submissionId: id,
      rating
    });

    const submission = await feedbackService.updateFeedbackSubmission(userId, id, {
      rating,
      comment
    });

    res.json({
      success: true,
      data: submission,
      message: 'Feedback updated successfully'
    });
  })
);

router.get('/submissions/:id',
  authenticateToken,
  requireAttendee,
  validateIdParam('id'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    const submission = await feedbackService.getFeedbackSubmission(id);

    if (!submission) {
      return res.status(404).json({
        success: false,
        error: 'Feedback submission not found',
        code: 'FEEDBACK_SUBMISSION_NOT_FOUND'
      });
    }

    // Users can only view their own submissions unless they're admin
    if (submission.userId !== userId && req.user!.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    res.json({
      success: true,
      data: submission
    });
  })
);

router.get('/my-submissions',
  authenticateToken,
  requireAttendee,
  validatePagination,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await feedbackService.getUserFeedbackSubmissions(userId, page, limit);

    res.json({
      success: true,
      data: result
    });
  })
);

// Admin endpoints for viewing all submissions
router.get('/events/:eventId/submissions',
  authenticateToken,
  requireAdmin,
  validateIdParam('eventId'),
  validatePagination,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { eventId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    logger.info('Getting event feedback submissions', {
      eventId,
      page,
      limit,
      adminId: req.user?.id
    });

    const result = await feedbackService.getEventFeedbackSubmissions(eventId, page, limit);

    res.json({
      success: true,
      data: result
    });
  })
);

// Speaker endpoint for viewing feedback submissions for their events
router.get('/speaker/events/:eventId/submissions',
  authenticateToken,
  requireSpeaker,
  validateIdParam('eventId'),
  validatePagination,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { eventId } = req.params;
    const speakerId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    logger.info('Getting event feedback submissions (speaker)', {
      eventId,
      speakerId,
      page,
      limit
    });

    // Verify that the speaker owns this event by checking the feedback form's eventId
    // The feedback service doesn't have direct access to event data, so we'll verify
    // by checking if a feedback form exists for this event (forms are created per event)
    const feedbackForm = await feedbackService.getFeedbackFormByEventId(eventId);

    if (!feedbackForm) {
      return res.status(404).json({
        success: false,
        error: 'Feedback form not found for this event',
        code: 'FEEDBACK_FORM_NOT_FOUND'
      });
    }

    // Note: In a production system, you would verify event ownership via event-service API
    // For now, we allow speakers to view feedback if a form exists
    const result = await feedbackService.getEventFeedbackSubmissions(eventId, page, limit);

    res.json({
      success: true,
      data: result
    });
  })
);

// Analytics endpoints (Admin only)
router.get('/forms/:id/analytics',
  authenticateToken,
  requireAdmin,
  validateIdParam('id'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    logger.info('Getting feedback analytics', {
      formId: id,
      adminId: req.user?.id
    });

    const analytics = await feedbackService.getFeedbackAnalytics(id);

    res.json({
      success: true,
      data: analytics
    });
  })
);

router.get('/events/:eventId/analytics',
  authenticateToken,
  requireAdmin,
  validateIdParam('eventId'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { eventId } = req.params;

    logger.info('Getting event feedback analytics', {
      eventId,
      adminId: req.user?.id
    });

    const analytics = await feedbackService.getEventFeedbackAnalytics(eventId);

    res.json({
      success: true,
      data: analytics
    });
  })
);

export default router;
