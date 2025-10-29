import { Router, Response, Request } from 'express';
import { speakerAttendanceService } from '../services/speaker-attendance.service';
import { asyncHandler } from '../middleware/error.middleware';
import { authMiddleware } from '../middleware/auth.middleware';

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
 * POST /speaker-attendance/join
 */
router.post('/speaker-attendance/join', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { eventId } = req.body;
  const speakerId = req.user?.id;

  if (!speakerId) {
    return res.status(401).json({ error: 'Speaker not authenticated' });
  }

  if (!eventId) {
    return res.status(400).json({ error: 'Event ID is required' });
  }

  try {
    const result = await speakerAttendanceService.speakerJoinEvent({
      speakerId,
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
 * Update materials selected for an event
 * PUT /speaker-attendance/materials/:invitationId
 */
router.put('/speaker-attendance/materials/:invitationId', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
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
 * Get speaker attendance data for an event
 * GET /speaker-attendance/:eventId
 */
router.get('/speaker-attendance/:eventId', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { eventId } = req.params;
  const userRole = req.user?.role;

  if (!eventId) {
    return res.status(400).json({ error: 'Event ID is required' });
  }

  // Only admins and speakers can view speaker attendance
  if (!['ADMIN', 'SPEAKER'].includes(userRole || '')) {
    return res.status(403).json({ error: 'Access denied. Admin or speaker role required.' });
  }

  try {
    const attendanceData = await speakerAttendanceService.getSpeakerAttendance(eventId);
    return res.status(200).json(attendanceData);
  } catch (error) {
    console.error('Error fetching speaker attendance:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}));

/**
 * Get available materials for selection
 * GET /speaker-attendance/materials/:invitationId
 */
router.get('/speaker-attendance/materials/:invitationId', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
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

export default router;
