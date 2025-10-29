import { Router, Response } from 'express';
import { attendanceService } from '../services/attendance.service';
import { asyncHandler } from '../middleware/error.middleware';
import { authenticateToken } from '../middleware/auth.middleware';
import { AuthRequest } from '../types';

const router = Router();

// ==================== ATTENDANCE ROUTES ====================

/**
 * Join an event
 * POST /attendance/join
 */
router.post('/attendance/join', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { eventId } = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  if (!eventId) {
    return res.status(400).json({ error: 'Event ID is required' });
  }

  try {
    const result = await attendanceService.joinEvent({
      userId,
      eventId
    });

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error joining event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}));

/**
 * Join an event as admin (no booking required)
 * POST /attendance/admin/join
 */
router.post('/attendance/admin/join', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { eventId } = req.body;
  const userId = req.user?.userId;
  const userRole = req.user?.role;

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  if (userRole !== 'ADMIN') {
    return res.status(403).json({ error: 'Only admins can use this endpoint' });
  }

  if (!eventId) {
    return res.status(400).json({ error: 'Event ID is required' });
  }

  try {
    const result = await attendanceService.adminJoinEvent({
      userId,
      eventId
    });

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error admin joining event:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      isFirstJoin: false 
    });
  }
}));

/**
 * Get live attendance data for an event
 * GET /attendance/live/:eventId
 */
router.get('/attendance/live/:eventId', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { eventId } = req.params;
  const userRole = req.user?.role;

  // Only admins and speakers can view live attendance
  if (!['ADMIN', 'SPEAKER'].includes(userRole || '')) {
    return res.status(403).json({ error: 'Access denied. Admin or speaker role required.' });
  }

  try {
    const attendanceData = await attendanceService.getLiveAttendance(eventId);
    res.status(200).json(attendanceData);
  } catch (error) {
    console.error('Error fetching live attendance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}));

/**
 * Get attendance summary for reporting
 * GET /attendance/summary/:eventId
 */
router.get('/attendance/summary/:eventId', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { eventId } = req.params;
  const userRole = req.user?.role;

  // Only admins and speakers can view attendance summary
  if (!['ADMIN', 'SPEAKER'].includes(userRole || '')) {
    return res.status(403).json({ error: 'Access denied. Admin or speaker role required.' });
  }

  try {
    const summary = await attendanceService.getAttendanceSummary(eventId);
    res.status(200).json(summary);
  } catch (error) {
    console.error('Error fetching attendance summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}));

/**
 * Get basic attendance metrics for attendees
 * GET /attendance/metrics/:eventId
 */
router.get('/attendance/metrics/:eventId', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { eventId } = req.params;

  try {
    const attendanceData = await attendanceService.getLiveAttendance(eventId);
    
    // Return only basic metrics for attendees
    res.status(200).json({
      eventId: attendanceData.eventId,
      totalAttended: attendanceData.totalAttended,
      totalRegistered: attendanceData.totalRegistered,
      attendancePercentage: attendanceData.attendancePercentage
    });
  } catch (error) {
    console.error('Error fetching attendance metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}));

export default router;
