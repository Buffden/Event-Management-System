import { Router } from 'express';
import { Request, Response } from 'express';
import { SpeakerService } from '../services/speaker.service';
// Note: Auth middleware will be added per route as needed
import { logger } from '../utils/logger';

const router = Router();
const speakerService = new SpeakerService();

// Get all speakers with search functionality
router.get('/', async (req: Request, res: Response) => {
  try {
    const { query, expertise, isAvailable, limit = 10, offset = 0 } = req.query;
    
    const searchParams: any = {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    };
    
    if (query) searchParams.query = query as string;
    if (expertise) searchParams.expertise = (expertise as string).split(',');
    if (isAvailable !== undefined) searchParams.isAvailable = isAvailable === 'true';
    
    const speakers = await speakerService.searchSpeakers(searchParams);

    logger.info('Speakers retrieved', { count: speakers.length });
    
    return res.json({
      success: true,
      data: speakers,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error retrieving speakers', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve speakers',
      timestamp: new Date().toISOString()
    });
  }
});

// Get speaker by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Speaker ID is required',
        timestamp: new Date().toISOString()
      });
    }
    
    const speaker = await speakerService.getSpeakerById(id);
    
    if (!speaker) {
      return res.status(404).json({
        success: false,
        error: 'Speaker not found',
        timestamp: new Date().toISOString()
      });
    }

    logger.info('Speaker retrieved', { speakerId: id });
    
    return res.json({
      success: true,
      data: speaker,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error retrieving speaker', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve speaker',
      timestamp: new Date().toISOString()
    });
  }
});

// Create speaker profile (during registration)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, name, email, bio, expertise, isAvailable } = req.body;
    
    if (!userId || !name || !email) {
      return res.status(400).json({
        success: false,
        error: 'User ID, name, and email are required',
        timestamp: new Date().toISOString()
      });
    }

    const speakerProfile = await speakerService.createSpeakerProfile({
      userId,
      name,
      email,
      bio,
      expertise: expertise || [],
      isAvailable
    });

    logger.info('Speaker profile created', { speakerId: speakerProfile.id, userId, name });
    
    return res.status(201).json({
      success: true,
      data: speakerProfile,
      message: 'Speaker profile created successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error creating speaker profile', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create speaker profile',
      timestamp: new Date().toISOString()
    });
  }
});

// Update speaker profile
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, bio, expertise, isAvailable } = req.body;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Speaker ID is required',
        timestamp: new Date().toISOString()
      });
    }
    
    // Check if speaker exists
    const existingSpeaker = await speakerService.getSpeakerById(id);
    if (!existingSpeaker) {
      return res.status(404).json({
        success: false,
        error: 'Speaker profile not found',
        timestamp: new Date().toISOString()
      });
    }

    const updatedSpeaker = await speakerService.updateSpeakerProfile(id, {
      name,
      bio,
      expertise,
      isAvailable
    });

    logger.info('Speaker profile updated', { speakerId: id });
    
    return res.json({
      success: true,
      data: updatedSpeaker,
      message: 'Speaker profile updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error updating speaker profile', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update speaker profile',
      timestamp: new Date().toISOString()
    });
  }
});

// Get speaker's own profile
router.get('/profile/me', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
        timestamp: new Date().toISOString()
      });
    }
    
    const speaker = await speakerService.getSpeakerByUserId(userId as string);
    
    if (!speaker) {
      return res.status(404).json({
        success: false,
        error: 'Speaker profile not found',
        timestamp: new Date().toISOString()
      });
    }

    logger.info('Speaker profile retrieved', { speakerId: speaker.id, userId });
    
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
