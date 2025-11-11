import { Router, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /seed/update-material-date - Update material uploadDate (seeding-specific, admin only)
 * This route requires admin authentication
 */
router.post('/seed/update-material-date', authMiddleware, async (req: any, res: Response) => {
  try {
    // Check if user is admin
    const user = req.user;
    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Access denied: Admin only',
        timestamp: new Date().toISOString()
      });
    }

    const { materialId, uploadDate } = req.body;

    if (!materialId || typeof materialId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'materialId is required and must be a string',
        timestamp: new Date().toISOString()
      });
    }
    if (!uploadDate || typeof uploadDate !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'uploadDate is required and must be an ISO date string',
        timestamp: new Date().toISOString()
      });
    }

    const uploadDateObj = new Date(uploadDate);
    if (isNaN(uploadDateObj.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'uploadDate must be a valid ISO date string',
        timestamp: new Date().toISOString()
      });
    }

    logger.info('Updating material upload date (seeding)', {
      materialId,
      uploadDate: uploadDateObj.toISOString()
    });

    const { prisma } = await import('../database');

    try {
      const updateResult = await prisma.presentationMaterial.updateMany({
        where: { id: materialId },
        data: { uploadDate: uploadDateObj }
      });

      if (updateResult.count > 0) {
        logger.debug('Material date updated (seeding)', { materialId });
        return res.json({
          success: true,
          message: `Material ${materialId} upload date updated successfully`,
          timestamp: new Date().toISOString()
        });
      } else {
        return res.status(404).json({
          success: false,
          error: `Material with id ${materialId} not found`,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error: any) {
      logger.error('Error updating material date (seeding)', error, { materialId });
      return res.status(500).json({
        success: false,
        error: 'Failed to update material date',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error: any) {
    logger.error('Error in update material date route (seeding)', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update material date',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;

