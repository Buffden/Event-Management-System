import { Router, Response } from 'express';
import { asyncHandler } from '../middleware/error.middleware';
import { requireAdmin } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';
import { prisma } from '../database';
import { AuthRequest } from '../types';

const router = Router();

// Apply admin authentication to all routes
router.use(requireAdmin);

/**
 * POST /admin/seed/update-booking-date - Update booking createdAt date (seeding-specific)
 */
router.post('/admin/seed/update-booking-date',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { bookingId, createdAt } = req.body;

    if (!bookingId || typeof bookingId !== 'string') {
      return res.status(400).json({ error: 'bookingId is required and must be a string' });
    }
    if (!createdAt || typeof createdAt !== 'string') {
      return res.status(400).json({ error: 'createdAt is required and must be an ISO date string' });
    }

    const createdAtDate = new Date(createdAt);
    if (isNaN(createdAtDate.getTime())) {
      return res.status(400).json({ error: 'createdAt must be a valid ISO date string' });
    }

    logger.info('Updating booking creation date (seeding)', {
      bookingId,
      adminId: req.user!.userId,
      createdAt: createdAtDate.toISOString()
    });

    try {
      const updateResult = await prisma.booking.updateMany({
        where: { id: bookingId },
        data: { createdAt: createdAtDate }
      });

      if (updateResult.count > 0) {
        logger.debug('Booking date updated (seeding)', { bookingId });
        res.json({
          success: true,
          message: `Booking ${bookingId} creation date updated successfully`
        });
      } else {
        res.status(404).json({
          success: false,
          error: `Booking with id ${bookingId} not found`
        });
      }
    } catch (error: any) {
      logger.error('Error updating booking date (seeding)', error, { bookingId });
      res.status(500).json({ error: 'Failed to update booking date' });
    }
  })
);

export default router;

