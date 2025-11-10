import { Router, Request, Response } from 'express';
import { InvitationService } from '../services/invitation.service';
import { SpeakerService } from '../services/speaker.service';
import { logger } from '../utils/logger';
import { requireInternalService } from '../middleware/internal-service.middleware';

const router = Router();
const invitationService = new InvitationService();
const speakerService = new SpeakerService();

// Apply internal service middleware to all routes
router.use(requireInternalService);

/**
 * POST /internal/invitations - Create invitation (internal service only)
 * This endpoint is for internal services (e.g., event service) to create invitations
 * without requiring full user authentication.
 */
router.post('/invitations', async (req: Request, res: Response) => {
  try {
    const { speakerId, eventId, sessionId, message } = req.body;

    if (!speakerId || !eventId) {
      return res.status(400).json({
        success: false,
        error: 'Speaker ID and Event ID are required',
        timestamp: new Date().toISOString()
      });
    }

    const invitation = await invitationService.createInvitation({
      speakerId,
      eventId,
      sessionId,
      message
    });

    logger.info('Internal service created invitation', {
      invitationId: invitation.id,
      speakerId,
      eventId,
      sessionId,
      internalService: req.headers['x-internal-service']
    });

    return res.status(201).json({
      success: true,
      data: invitation,
      message: 'Invitation created successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error creating invitation', error as Error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create invitation';
    const statusCode = errorMessage.includes('already exists') ? 409 : 500;
    return res.status(statusCode).json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /internal/invitations/event/:eventId - Get all invitations for a specific event (internal service only)
 * This endpoint is for internal services (e.g., notification service) to fetch invitations
 * without requiring full user authentication.
 */
router.get('/invitations/event/:eventId', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        error: 'Event ID is required',
        timestamp: new Date().toISOString()
      });
    }

    const invitations = await invitationService.getEventInvitations(eventId);

    logger.info('Internal service fetching event invitations', {
      eventId,
      count: invitations.length,
      internalService: req.headers['x-internal-service']
    });

    return res.json({
      success: true,
      data: invitations,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error retrieving event invitations', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve event invitations',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /internal/invitations/session/:sessionId/speaker/:speakerId - Delete invitation by session and speaker (internal service only)
 * This endpoint is for internal services (e.g., event service) to delete invitations
 * without requiring full user authentication.
 */
router.delete('/invitations/session/:sessionId/speaker/:speakerId', async (req: Request, res: Response) => {
  try {
    const { sessionId, speakerId } = req.params;

    if (!sessionId || !speakerId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID and Speaker ID are required',
        timestamp: new Date().toISOString()
      });
    }

    await invitationService.deleteInvitationBySessionAndSpeaker(sessionId, speakerId);

    logger.info('Internal service deleted invitation by session and speaker', {
      sessionId,
      speakerId,
      internalService: req.headers['x-internal-service']
    });

    return res.json({
      success: true,
      message: 'Invitation deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error deleting invitation by session and speaker', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete invitation',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /internal/invitations/speaker/:speakerId/accepted-sessions - Get accepted invitations with sessions (internal service only)
 * This endpoint is for internal services (e.g., event service) to check for overlapping accepted invitations
 */
router.get('/invitations/speaker/:speakerId/accepted-sessions', async (req: Request, res: Response) => {
  try {
    const { speakerId } = req.params;

    if (!speakerId) {
      return res.status(400).json({
        success: false,
        error: 'Speaker ID is required',
        timestamp: new Date().toISOString()
      });
    }

    const invitations = await invitationService.getAcceptedInvitationsWithSessions(speakerId);

    logger.info('Internal service fetching accepted invitations with sessions', {
      speakerId,
      count: invitations.length,
      internalService: req.headers['x-internal-service']
    });

    return res.json({
      success: true,
      data: invitations,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error retrieving accepted invitations with sessions', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve accepted invitations',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /internal/invitations/event/:eventId - Delete all invitations for an event (internal service only)
 * This endpoint is for internal services (e.g., event service) to delete all invitations
 * (both session-specific and event-level) when an event is deleted.
 */
router.delete('/invitations/event/:eventId', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        error: 'Event ID is required',
        timestamp: new Date().toISOString()
      });
    }

    const deletedCount = await invitationService.deleteAllInvitationsByEvent(eventId);

    logger.info('Internal service deleted all invitations for event', {
      eventId,
      deletedCount,
      internalService: req.headers['x-internal-service']
    });

    return res.json({
      success: true,
      message: 'All invitations deleted successfully',
      deletedCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error deleting all invitations for event', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete invitations',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /internal/invitations/event/:eventId/speaker/:speakerId - Delete invitation by event and speaker (internal service only)
 * This endpoint is for internal services (e.g., event service) to delete invitations
 * without requiring full user authentication.
 * @deprecated Use /internal/invitations/session/:sessionId/speaker/:speakerId instead
 */
router.delete('/invitations/event/:eventId/speaker/:speakerId', async (req: Request, res: Response) => {
  try {
    const { eventId, speakerId } = req.params;

    if (!eventId || !speakerId) {
      return res.status(400).json({
        success: false,
        error: 'Event ID and Speaker ID are required',
        timestamp: new Date().toISOString()
      });
    }

    await invitationService.deleteInvitationByEventAndSpeaker(eventId, speakerId);

    logger.info('Internal service deleted invitation by event and speaker', {
      eventId,
      speakerId,
      internalService: req.headers['x-internal-service']
    });

    return res.json({
      success: true,
      message: 'Invitation deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error deleting invitation by event and speaker', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete invitation',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /internal/speakers/:speakerId - Get speaker profile by ID (internal service only)
 * This endpoint is for internal services (e.g., notification service) to fetch speaker profiles
 * without requiring full user authentication.
 */
router.get('/speakers/:speakerId', async (req: Request, res: Response) => {
  try {
    const { speakerId } = req.params;

    if (!speakerId) {
      return res.status(400).json({
        success: false,
        error: 'Speaker ID is required',
        timestamp: new Date().toISOString()
      });
    }

    const speaker = await speakerService.getSpeakerById(speakerId);

    if (!speaker) {
      return res.status(404).json({
        success: false,
        error: 'Speaker not found',
        timestamp: new Date().toISOString()
      });
    }

    logger.info('Internal service fetching speaker profile', {
      speakerId,
      internalService: req.headers['x-internal-service']
    });

    return res.json({
      success: true,
      data: speaker,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error retrieving speaker profile', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve speaker profile',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;

