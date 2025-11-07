import { Router } from 'express';
import { Request, Response } from 'express';
import { InvitationService } from '../services/invitation.service';
import { logger } from '../utils/logger';
import { InvitationStatus } from '../types';

const router = Router();
const invitationService = new InvitationService();

// Create invitation (Admin only)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { speakerId, eventId, message } = req.body;

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
      message
    });

    logger.info('Invitation created', {
      invitationId: invitation.id,
      speakerId,
      eventId
    });

    return res.status(201).json({
      success: true,
      data: invitation,
      message: 'Invitation created successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error creating invitation', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create invitation',
      timestamp: new Date().toISOString()
    });
  }
});

// Get invitation by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Invitation ID is required',
        timestamp: new Date().toISOString()
      });
    }

    const invitation = await invitationService.getInvitationById(id);

    if (!invitation) {
      return res.status(404).json({
        success: false,
        error: 'Invitation not found',
        timestamp: new Date().toISOString()
      });
    }

    logger.info('Invitation retrieved', { invitationId: id });

    return res.json({
      success: true,
      data: invitation,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error retrieving invitation', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve invitation',
      timestamp: new Date().toISOString()
    });
  }
});

// Get invitations for a speaker with search, filters, and pagination
router.get('/speaker/:speakerId', async (req: Request, res: Response) => {
  try {
    const { speakerId } = req.params;
    const {
      status,
      search,
      page = 1,
      limit = 20
    } = req.query;

    if (!speakerId) {
      return res.status(400).json({
        success: false,
        error: 'Speaker ID is required',
        timestamp: new Date().toISOString()
      });
    }

    const result = await invitationService.getSpeakerInvitations(speakerId, {
      search: search as string,
      status: status as string,
      page: Number(page),
      limit: Number(limit)
    });

    logger.info('Speaker invitations retrieved', {
      speakerId,
      count: result.invitations.length,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages
    });

    return res.json({
      success: true,
      data: result.invitations,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
        hasNextPage: result.page < result.totalPages,
        hasPreviousPage: result.page > 1
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error retrieving speaker invitations', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve speaker invitations',
      timestamp: new Date().toISOString()
    });
  }
});

// Get invitations for an event
router.get('/event/:eventId', async (req: Request, res: Response) => {
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

    logger.info('Event invitations retrieved', {
      eventId,
      count: invitations.length
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

// Respond to invitation
router.put('/:id/respond', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, message } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Invitation ID is required',
        timestamp: new Date().toISOString()
      });
    }

    if (!status || !Object.values(InvitationStatus).includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Valid status is required (PENDING, ACCEPTED, DECLINED, EXPIRED)',
        timestamp: new Date().toISOString()
      });
    }

    const invitation = await invitationService.respondToInvitation(id, {
      status,
      message
    });

    logger.info('Invitation response recorded', {
      invitationId: id,
      status
    });

    return res.json({
      success: true,
      data: invitation,
      message: 'Invitation response recorded successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error responding to invitation', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Failed to respond to invitation',
      timestamp: new Date().toISOString()
    });
  }
});

// Get invitation statistics for a speaker
router.get('/speaker/:speakerId/stats', async (req: Request, res: Response) => {
  try {
    const { speakerId } = req.params;

    if (!speakerId) {
      return res.status(400).json({
        success: false,
        error: 'Speaker ID is required',
        timestamp: new Date().toISOString()
      });
    }

    const stats = await invitationService.getSpeakerInvitationStats(speakerId);

    logger.info('Speaker invitation stats retrieved', { speakerId });

    return res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error retrieving speaker invitation stats', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve speaker invitation stats',
      timestamp: new Date().toISOString()
    });
  }
});

// Delete invitation
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Invitation ID is required',
        timestamp: new Date().toISOString()
      });
    }

    await invitationService.deleteInvitation(id);

    logger.info('Invitation deleted', { invitationId: id });

    return res.json({
      success: true,
      message: 'Invitation deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error deleting invitation', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete invitation',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;