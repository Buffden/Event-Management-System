import { Router, Request, Response } from 'express';
import { ticketService } from '../services/ticket.service';
import { requireUser } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';
import { AuthRequest } from '../types';

const router = Router();

// Apply authentication middleware to all routes
router.use(requireUser);


/**
 * Get ticket details by ID
 */
router.get('/:ticketId', async (req: AuthRequest, res: Response) => {
  try {
    const { ticketId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const ticket = await ticketService.getTicketById(ticketId);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found'
      });
    }

    return res.json({
      success: true,
      data: ticket
    });
  } catch (error) {
    logger.error('Failed to get ticket', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Get user's tickets
 */
router.get('/user/my-tickets', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const tickets = await ticketService.getUserTickets(userId);

    return res.json({
      success: true,
      data: tickets
    });
  } catch (error) {
    logger.error('Failed to get user tickets', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export { router as ticketRoutes };