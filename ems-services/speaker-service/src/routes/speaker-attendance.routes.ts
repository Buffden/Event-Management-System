import { Router, Response, Request } from 'express';
import { speakerAttendanceService } from '../services/speaker-attendance.service';
import { SpeakerService } from '../services/speaker.service';
import { asyncHandler } from '../middleware/error.middleware';
import { authMiddleware } from '../middleware/auth.middleware';

const speakerService = new SpeakerService();

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

const router = Router();

// ==================== SPEAKER ATTENDANCE ROUTES ====================

/**
 * Speaker joins an event
 * POST /join (mounted at /api/speaker-attendance, so full path is /api/speaker-attendance/join)
 */
router.post('/join', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { eventId } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Speaker not authenticated' });
  }

  if (!eventId) {
    return res.status(400).json({ error: 'Event ID is required' });
  }

  try {
    // Get speaker profile ID from userId
    // The speakerInvitation table uses speaker profile ID, not userId
    const speakerProfile = await speakerService.getSpeakerByUserId(userId);
    if (!speakerProfile) {
      return res.status(404).json({ error: 'Speaker profile not found' });
    }

    const result = await speakerAttendanceService.speakerJoinEvent({
      speakerId: speakerProfile.id, // Use speaker profile ID, not userId
      eventId
    });

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error speaker joining event:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}));

/**
 * Speaker leaves an event
 * POST /leave (mounted at /api/speaker-attendance, so full path is /api/speaker-attendance/leave)
 */
router.post('/leave', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { eventId } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Speaker not authenticated' });
  }

  if (!eventId) {
    return res.status(400).json({ error: 'Event ID is required' });
  }

  try {
    // Get speaker profile ID from userId
    const speakerProfile = await speakerService.getSpeakerByUserId(userId);
    if (!speakerProfile) {
      return res.status(404).json({ error: 'Speaker profile not found' });
    }

    const result = await speakerAttendanceService.speakerLeaveEvent({
      speakerId: speakerProfile.id, // Use speaker profile ID, not userId
      eventId
    });

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error speaker leaving event:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}));

/**
 * Update materials selected for an event
 * PUT /materials/:invitationId (mounted at /api/speaker-attendance, so full path is /api/speaker-attendance/materials/:invitationId)
 */
router.put('/materials/:invitationId', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { invitationId } = req.params;
  const { materialIds } = req.body;
  const speakerId = req.user?.id;

  if (!speakerId) {
    return res.status(401).json({ error: 'Speaker not authenticated' });
  }

  if (!invitationId) {
    return res.status(400).json({ error: 'Invitation ID is required' });
  }

  if (!Array.isArray(materialIds)) {
    return res.status(400).json({ error: 'Material IDs must be an array' });
  }

  try {
    const result = await speakerAttendanceService.updateMaterialsForEvent({
      invitationId,
      materialIds
    });

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error updating materials:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}));

/**
 * Get available materials for selection
 * GET /materials/:invitationId (mounted at /api/speaker-attendance, so full path is /api/speaker-attendance/materials/:invitationId)
 * MUST be defined before /:eventId to avoid route conflicts
 */
router.get('/materials/:invitationId', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { invitationId } = req.params;
  const speakerId = req.user?.id;

  if (!speakerId) {
    return res.status(401).json({ error: 'Speaker not authenticated' });
  }

  if (!invitationId) {
    return res.status(400).json({ error: 'Invitation ID is required' });
  }

  try {
    const materialsData = await speakerAttendanceService.getAvailableMaterials(invitationId);

    // Verify that the invitation belongs to the authenticated speaker
    if (materialsData.speakerId !== speakerId) {
      return res.status(403).json({ error: 'Access denied. Invitation does not belong to this speaker.' });
    }

    return res.status(200).json(materialsData);
  } catch (error) {
    console.error('Error fetching available materials:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}));

/**
 * Get speaker attendance data for an event
 * GET /:eventId (mounted at /api/speaker-attendance, so full path is /api/speaker-attendance/:eventId)
 * MUST be defined after /materials/:invitationId to avoid route conflicts
 */
router.get('/:eventId', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { eventId } = req.params;

  if (!eventId) {
    return res.status(400).json({ error: 'Event ID is required' });
  }

  // Allow all authenticated users (ADMIN, SPEAKER, USER) to view basic speaker attendance info
  // This allows attendees to see if speakers have joined and their selected materials
  try {
    const attendanceData = await speakerAttendanceService.getSpeakerAttendance(eventId);
    return res.status(200).json(attendanceData);
  } catch (error) {
    console.error('Error fetching speaker attendance:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}));

export default router;
