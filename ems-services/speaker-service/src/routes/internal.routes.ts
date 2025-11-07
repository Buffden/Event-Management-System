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

