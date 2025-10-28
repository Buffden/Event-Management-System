import { prisma } from '../database';
import { logger } from '../utils/logger';
import {
  SpeakerProfile,
  CreateSpeakerProfileRequest,
  UpdateSpeakerProfileRequest,
  SpeakerSearchRequest
} from '../types';

export class SpeakerService {
  /**
   * Create a new speaker profile (during registration)
   */
  async createSpeakerProfile(data: CreateSpeakerProfileRequest): Promise<SpeakerProfile> {
    try {
      logger.info('Creating speaker profile', { userId: data.userId, name: data.name });

      // Check if speaker profile already exists for this user
      const existingProfile = await prisma.speakerProfile.findUnique({
        where: { userId: data.userId }
      });

      if (existingProfile) {
        throw new Error('Speaker profile already exists for this user');
      }

      const speakerProfile = await prisma.speakerProfile.create({
        data: {
          userId: data.userId,
          name: data.name,
          email: data.email,
          bio: data.bio || null,
          expertise: data.expertise || [],
          isAvailable: data.isAvailable ?? true
        }
      });

      logger.info('Speaker profile created successfully', { 
        speakerId: speakerProfile.id, 
        userId: data.userId,
        name: data.name
      });

      return speakerProfile;
    } catch (error) {
      logger.error('Error creating speaker profile', error as Error);
      throw error;
    }
  }

  /**
   * Get speaker profile by ID
   */
  async getSpeakerById(id: string): Promise<SpeakerProfile | null> {
    try {
      logger.debug('Retrieving speaker profile', { speakerId: id });

      const speaker = await prisma.speakerProfile.findUnique({
        where: { id }
      });

      return speaker;
    } catch (error) {
      logger.error('Error retrieving speaker profile', error as Error);
      throw error;
    }
  }

  /**
   * Get speaker profile by user ID
   */
  async getSpeakerByUserId(userId: string): Promise<SpeakerProfile | null> {
    try {
      logger.debug('Retrieving speaker profile by user ID', { userId });

      const speaker = await prisma.speakerProfile.findUnique({
        where: { userId }
      });

      return speaker;
    } catch (error) {
      logger.error('Error retrieving speaker profile by user ID', error as Error);
      throw error;
    }
  }

  /**
   * Update speaker profile
   */
  async updateSpeakerProfile(id: string, data: UpdateSpeakerProfileRequest): Promise<SpeakerProfile> {
    try {
      logger.info('Updating speaker profile', { speakerId: id });

      const updatedSpeaker = await prisma.speakerProfile.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.bio !== undefined && { bio: data.bio }),
          ...(data.expertise !== undefined && { expertise: data.expertise }),
          ...(data.isAvailable !== undefined && { isAvailable: data.isAvailable }),
          updatedAt: new Date()
        }
      });

      logger.info('Speaker profile updated successfully', { speakerId: id });

      return updatedSpeaker;
    } catch (error) {
      logger.error('Error updating speaker profile', error as Error);
      throw error;
    }
  }

  /**
   * Search speakers with filters
   */
  async searchSpeakers(filters: SpeakerSearchRequest): Promise<SpeakerProfile[]> {
    try {
      logger.debug('Searching speakers', filters);

      const where: any = {};

      // Filter by availability
      if (filters.isAvailable !== undefined) {
        where.isAvailable = filters.isAvailable;
      }

      // Filter by expertise
      if (filters.expertise && filters.expertise.length > 0) {
        where.expertise = {
          hasSome: filters.expertise
        };
      }

      // Text search in name and bio
      if (filters.query) {
        where.OR = [
          {
            name: {
              contains: filters.query,
              mode: 'insensitive'
            }
          },
          {
            bio: {
              contains: filters.query,
              mode: 'insensitive'
            }
          }
        ];
      }

      const speakers = await prisma.speakerProfile.findMany({
        where,
        take: filters.limit || 10,
        skip: filters.offset || 0,
        orderBy: {
          createdAt: 'desc'
        }
      });

      logger.debug('Speakers search completed', { 
        count: speakers.length,
        filters 
      });

      return speakers;
    } catch (error) {
      logger.error('Error searching speakers', error as Error);
      throw error;
    }
  }

  /**
   * Get all speakers (admin only)
   */
  async getAllSpeakers(limit: number = 50, offset: number = 0): Promise<SpeakerProfile[]> {
    try {
      logger.debug('Retrieving all speakers', { limit, offset });

      const speakers = await prisma.speakerProfile.findMany({
        take: limit,
        skip: offset,
        orderBy: {
          createdAt: 'desc'
        }
      });

      return speakers;
    } catch (error) {
      logger.error('Error retrieving all speakers', error as Error);
      throw error;
    }
  }

  /**
   * Delete speaker profile
   */
  async deleteSpeakerProfile(id: string): Promise<void> {
    try {
      logger.info('Deleting speaker profile', { speakerId: id });

      await prisma.speakerProfile.delete({
        where: { id }
      });

      logger.info('Speaker profile deleted successfully', { speakerId: id });
    } catch (error) {
      logger.error('Error deleting speaker profile', error as Error);
      throw error;
    }
  }

  /**
   * Update speaker availability
   */
  async updateAvailability(id: string, isAvailable: boolean): Promise<SpeakerProfile> {
    try {
      logger.info('Updating speaker availability', { speakerId: id, isAvailable });

      const updatedSpeaker = await prisma.speakerProfile.update({
        where: { id },
        data: {
          isAvailable,
          updatedAt: new Date()
        }
      });

      logger.info('Speaker availability updated successfully', { 
        speakerId: id, 
        isAvailable 
      });

      return updatedSpeaker;
    } catch (error) {
      logger.error('Error updating speaker availability', error as Error);
      throw error;
    }
  }
}
