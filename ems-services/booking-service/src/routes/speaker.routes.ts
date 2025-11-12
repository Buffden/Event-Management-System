import { Router, Response } from 'express';
import { bookingService } from '../services/booking.service';
import { logger } from '../utils/logger';
import { authenticateToken, requireSpeaker } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { validateUUID } from '../middleware/validation.middleware';
import { AuthRequest } from '../types';

const router = Router();

// Apply authentication and speaker role to all routes
router.use(authenticateToken);
router.use(requireSpeaker);

/**
 * GET /speaker/:eventId/num-registered - Get number of registered users for a specific event
 */
router.get('/:eventId/num-registered',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { eventId } = req.params;

    // Validate event ID format
    const uuidErrors = validateUUID(eventId, 'eventId');
    if (uuidErrors) {
      return res.status(400).json({
        success: false,
        error: 'Invalid event ID format',
        details: uuidErrors
      });
    }

    logger.info('Speaker requesting registered user count for event', {
      eventId,
      speakerId: req.user!.userId
    });

    const userCount = await bookingService.getNumberOfUsersForEvent(eventId);

    res.json({
      success: true,
      data: {
        eventId,
        ...userCount
      }
    });
  })
);

export default router;
