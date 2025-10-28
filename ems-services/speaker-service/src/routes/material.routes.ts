import { Router } from 'express';
import { Request, Response } from 'express';
import multer from 'multer';
import { MaterialService } from '../services/material.service';
import { logger } from '../utils/logger';

const router = Router();
const materialService = new MaterialService();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Upload material
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'File is required',
        timestamp: new Date().toISOString()
      });
    }

    const { speakerId, eventId } = req.body;
    
    if (!speakerId) {
      return res.status(400).json({
        success: false,
        error: 'Speaker ID is required',
        timestamp: new Date().toISOString()
      });
    }

    // Validate file
    const validation = materialService.validateFile(req.file);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error,
        timestamp: new Date().toISOString()
      });
    }

    const material = await materialService.uploadMaterial(req.file, {
      speakerId,
      eventId: eventId || undefined,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype
    });

    logger.info('Material uploaded', { 
      materialId: material.id, 
      speakerId,
      fileName: material.fileName
    });
    
    return res.status(201).json({
      success: true,
      data: material,
      message: 'Material uploaded successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error uploading material', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Failed to upload material',
      timestamp: new Date().toISOString()
    });
  }
});

// Get material by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Material ID is required',
        timestamp: new Date().toISOString()
      });
    }
    
    const material = await materialService.getMaterialById(id);
    
    if (!material) {
      return res.status(404).json({
        success: false,
        error: 'Material not found',
        timestamp: new Date().toISOString()
      });
    }

    logger.info('Material retrieved', { materialId: id });
    
    return res.json({
      success: true,
      data: material,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error retrieving material', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve material',
      timestamp: new Date().toISOString()
    });
  }
});

// Download material
router.get('/:id/download', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Material ID is required',
        timestamp: new Date().toISOString()
      });
    }

    const { material, fileBuffer } = await materialService.downloadMaterial(id);

    logger.info('Material downloaded', { materialId: id });
    
    // Set appropriate headers for file download
    res.setHeader('Content-Type', material.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${material.fileName}"`);
    res.setHeader('Content-Length', material.fileSize);
    
    return res.send(fileBuffer);
  } catch (error) {
    logger.error('Error downloading material', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Failed to download material',
      timestamp: new Date().toISOString()
    });
  }
});

// Get materials for a speaker
router.get('/speaker/:speakerId', async (req: Request, res: Response) => {
  try {
    const { speakerId } = req.params;
    
    if (!speakerId) {
      return res.status(400).json({
        success: false,
        error: 'Speaker ID is required',
        timestamp: new Date().toISOString()
      });
    }

    const materials = await materialService.getSpeakerMaterials(speakerId);

    logger.info('Speaker materials retrieved', { 
      speakerId, 
      count: materials.length 
    });
    
    return res.json({
      success: true,
      data: materials,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error retrieving speaker materials', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve speaker materials',
      timestamp: new Date().toISOString()
    });
  }
});

// Get materials for an event
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

    const materials = await materialService.getEventMaterials(eventId);

    logger.info('Event materials retrieved', { 
      eventId, 
      count: materials.length 
    });
    
    return res.json({
      success: true,
      data: materials,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error retrieving event materials', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve event materials',
      timestamp: new Date().toISOString()
    });
  }
});

// Get materials for a speaker and event
router.get('/speaker/:speakerId/event/:eventId', async (req: Request, res: Response) => {
  try {
    const { speakerId, eventId } = req.params;
    
    if (!speakerId || !eventId) {
      return res.status(400).json({
        success: false,
        error: 'Speaker ID and Event ID are required',
        timestamp: new Date().toISOString()
      });
    }

    const materials = await materialService.getSpeakerEventMaterials(speakerId, eventId);

    logger.info('Speaker event materials retrieved', { 
      speakerId, 
      eventId,
      count: materials.length 
    });
    
    return res.json({
      success: true,
      data: materials,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error retrieving speaker event materials', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve speaker event materials',
      timestamp: new Date().toISOString()
    });
  }
});

// Update material metadata
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { fileName, eventId } = req.body;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Material ID is required',
        timestamp: new Date().toISOString()
      });
    }

    const material = await materialService.updateMaterial(id, {
      fileName,
      eventId
    });

    logger.info('Material updated', { materialId: id });
    
    return res.json({
      success: true,
      data: material,
      message: 'Material updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error updating material', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update material',
      timestamp: new Date().toISOString()
    });
  }
});

// Get material statistics for a speaker
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

    const stats = await materialService.getSpeakerMaterialStats(speakerId);

    logger.info('Speaker material stats retrieved', { speakerId });
    
    return res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error retrieving speaker material stats', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve speaker material stats',
      timestamp: new Date().toISOString()
    });
  }
});

// Delete material
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Material ID is required',
        timestamp: new Date().toISOString()
      });
    }

    await materialService.deleteMaterial(id);

    logger.info('Material deleted', { materialId: id });
    
    return res.json({
      success: true,
      message: 'Material deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error deleting material', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete material',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;