/**
 * Comprehensive Test Suite for Speaker Service
 *
 * Tests all speaker profile management functionality including:
 * - Profile creation
 * - Profile retrieval
 * - Profile updates
 * - Speaker search
 * - Availability management
 * - Profile deletion
 */

import { describe, it, beforeEach, afterEach, expect } from '@jest/globals';
import {
  mockPrisma,
  mockLogger,
  createMockSpeakerProfile,
  resetAllMocks,
} from './mocks-simple';
import { SpeakerService } from '../services/speaker.service';

describe('SpeakerService', () => {
  let speakerService: SpeakerService;

  beforeEach(() => {
    resetAllMocks();
    speakerService = new SpeakerService();
  });

  afterEach(() => {
    resetAllMocks();
  });

  describe('createSpeakerProfile()', () => {
    it('should create a new speaker profile successfully', async () => {
      const mockProfile = createMockSpeakerProfile();
      mockPrisma.speakerProfile.findUnique.mockResolvedValue(null);
      mockPrisma.speakerProfile.create.mockResolvedValue(mockProfile);

      const result = await speakerService.createSpeakerProfile({
        userId: 'user-123',
        name: 'Test Speaker',
        email: 'speaker@example.com',
        bio: 'Test bio',
        expertise: ['Technology'],
        isAvailable: true,
      });

      expect(mockPrisma.speakerProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
      expect(mockPrisma.speakerProfile.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          name: 'Test Speaker',
          email: 'speaker@example.com',
          bio: 'Test bio',
          expertise: ['Technology'],
          isAvailable: true,
        },
      });
      expect(result).toEqual(mockProfile);
    });

    it('should throw error if profile already exists', async () => {
      const existingProfile = createMockSpeakerProfile();
      mockPrisma.speakerProfile.findUnique.mockResolvedValue(existingProfile);

      await expect(
        speakerService.createSpeakerProfile({
          userId: 'user-123',
          name: 'Test Speaker',
          email: 'speaker@example.com',
        })
      ).rejects.toThrow('Speaker profile already exists for this user');
    });

    it('should handle optional fields with defaults', async () => {
      const mockProfile = createMockSpeakerProfile({
        bio: null,
        expertise: [],
        isAvailable: true,
      });
      mockPrisma.speakerProfile.findUnique.mockResolvedValue(null);
      mockPrisma.speakerProfile.create.mockResolvedValue(mockProfile);

      const result = await speakerService.createSpeakerProfile({
        userId: 'user-123',
        name: 'Test Speaker',
        email: 'speaker@example.com',
      });

      expect(mockPrisma.speakerProfile.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          name: 'Test Speaker',
          email: 'speaker@example.com',
          bio: null,
          expertise: [],
          isAvailable: true,
        },
      });
      expect(result).toEqual(mockProfile);
    });

    it('should handle database errors', async () => {
      mockPrisma.speakerProfile.findUnique.mockResolvedValue(null);
      const dbError = new Error('Database connection failed');
      mockPrisma.speakerProfile.create.mockRejectedValue(dbError);

      await expect(
        speakerService.createSpeakerProfile({
          userId: 'user-123',
          name: 'Test Speaker',
          email: 'speaker@example.com',
        })
      ).rejects.toThrow('Database connection failed');

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getSpeakerById()', () => {
    it('should retrieve speaker profile by ID', async () => {
      const mockProfile = createMockSpeakerProfile();
      mockPrisma.speakerProfile.findUnique.mockResolvedValue(mockProfile);

      const result = await speakerService.getSpeakerById('speaker-123');

      expect(mockPrisma.speakerProfile.findUnique).toHaveBeenCalledWith({
        where: { id: 'speaker-123' },
      });
      expect(result).toEqual(mockProfile);
    });

    it('should return null if speaker not found', async () => {
      mockPrisma.speakerProfile.findUnique.mockResolvedValue(null);

      const result = await speakerService.getSpeakerById('non-existent');

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockPrisma.speakerProfile.findUnique.mockRejectedValue(dbError);

      await expect(speakerService.getSpeakerById('speaker-123')).rejects.toThrow('Database error');
    });
  });

  describe('getSpeakerByUserId()', () => {
    it('should retrieve speaker profile by user ID', async () => {
      const mockProfile = createMockSpeakerProfile();
      mockPrisma.speakerProfile.findUnique.mockResolvedValue(mockProfile);

      const result = await speakerService.getSpeakerByUserId('user-123');

      expect(mockPrisma.speakerProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
      expect(result).toEqual(mockProfile);
    });

    it('should return null if speaker not found', async () => {
      mockPrisma.speakerProfile.findUnique.mockResolvedValue(null);

      const result = await speakerService.getSpeakerByUserId('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('updateSpeakerProfile()', () => {
    it('should update speaker profile successfully', async () => {
      const updatedProfile = createMockSpeakerProfile({
        name: 'Updated Name',
        bio: 'Updated bio',
      });
      mockPrisma.speakerProfile.update.mockResolvedValue(updatedProfile);

      const result = await speakerService.updateSpeakerProfile('speaker-123', {
        name: 'Updated Name',
        bio: 'Updated bio',
      });

      expect(mockPrisma.speakerProfile.update).toHaveBeenCalledWith({
        where: { id: 'speaker-123' },
        data: {
          name: 'Updated Name',
          bio: 'Updated bio',
          updatedAt: expect.any(Date),
        },
      });
      expect(result).toEqual(updatedProfile);
    });

    it('should only update provided fields', async () => {
      const updatedProfile = createMockSpeakerProfile({ name: 'Updated Name' });
      mockPrisma.speakerProfile.update.mockResolvedValue(updatedProfile);

      await speakerService.updateSpeakerProfile('speaker-123', {
        name: 'Updated Name',
      });

      expect(mockPrisma.speakerProfile.update).toHaveBeenCalledWith({
        where: { id: 'speaker-123' },
        data: {
          name: 'Updated Name',
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should handle undefined fields correctly', async () => {
      const updatedProfile = createMockSpeakerProfile();
      mockPrisma.speakerProfile.update.mockResolvedValue(updatedProfile);

      await speakerService.updateSpeakerProfile('speaker-123', {
        name: 'Updated Name',
        bio: undefined,
      });

      expect(mockPrisma.speakerProfile.update).toHaveBeenCalledWith({
        where: { id: 'speaker-123' },
        data: {
          name: 'Updated Name',
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockPrisma.speakerProfile.update.mockRejectedValue(dbError);

      await expect(
        speakerService.updateSpeakerProfile('speaker-123', {
          name: 'Updated Name',
        })
      ).rejects.toThrow('Database error');
    });
  });

  describe('searchSpeakers()', () => {
    it('should search speakers without filters', async () => {
      const mockSpeakers = [createMockSpeakerProfile()];
      mockPrisma.speakerProfile.findMany.mockResolvedValue(mockSpeakers);

      const result = await speakerService.searchSpeakers({
        limit: 10,
        offset: 0,
      });

      expect(mockPrisma.speakerProfile.findMany).toHaveBeenCalledWith({
        where: {},
        take: 10,
        skip: 0,
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockSpeakers);
    });

    it('should filter by availability', async () => {
      const mockSpeakers = [createMockSpeakerProfile({ isAvailable: true })];
      mockPrisma.speakerProfile.findMany.mockResolvedValue(mockSpeakers);

      await speakerService.searchSpeakers({
        isAvailable: true,
        limit: 10,
        offset: 0,
      });

      expect(mockPrisma.speakerProfile.findMany).toHaveBeenCalledWith({
        where: { isAvailable: true },
        take: 10,
        skip: 0,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by expertise', async () => {
      const mockSpeakers = [createMockSpeakerProfile()];
      mockPrisma.speakerProfile.findMany.mockResolvedValue(mockSpeakers);

      await speakerService.searchSpeakers({
        expertise: ['Technology', 'AI'],
        limit: 10,
        offset: 0,
      });

      expect(mockPrisma.speakerProfile.findMany).toHaveBeenCalledWith({
        where: {
          expertise: {
            hasSome: ['Technology', 'AI'],
          },
        },
        take: 10,
        skip: 0,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should search by query in name and bio', async () => {
      const mockSpeakers = [createMockSpeakerProfile()];
      mockPrisma.speakerProfile.findMany.mockResolvedValue(mockSpeakers);

      await speakerService.searchSpeakers({
        query: 'test',
        limit: 10,
        offset: 0,
      });

      expect(mockPrisma.speakerProfile.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            {
              name: {
                contains: 'test',
                mode: 'insensitive',
              },
            },
            {
              bio: {
                contains: 'test',
                mode: 'insensitive',
              },
            },
          ],
        },
        take: 10,
        skip: 0,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should combine multiple filters', async () => {
      const mockSpeakers = [createMockSpeakerProfile()];
      mockPrisma.speakerProfile.findMany.mockResolvedValue(mockSpeakers);

      await speakerService.searchSpeakers({
        query: 'test',
        expertise: ['Technology'],
        isAvailable: true,
        limit: 20,
        offset: 10,
      });

      expect(mockPrisma.speakerProfile.findMany).toHaveBeenCalledWith({
        where: {
          isAvailable: true,
          expertise: {
            hasSome: ['Technology'],
          },
          OR: [
            {
              name: {
                contains: 'test',
                mode: 'insensitive',
              },
            },
            {
              bio: {
                contains: 'test',
                mode: 'insensitive',
              },
            },
          ],
        },
        take: 20,
        skip: 10,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockPrisma.speakerProfile.findMany.mockRejectedValue(dbError);

      await expect(
        speakerService.searchSpeakers({
          limit: 10,
          offset: 0,
        })
      ).rejects.toThrow('Database error');
    });
  });

  describe('getAllSpeakers()', () => {
    it('should retrieve all speakers with default pagination', async () => {
      const mockSpeakers = [createMockSpeakerProfile()];
      mockPrisma.speakerProfile.findMany.mockResolvedValue(mockSpeakers);

      const result = await speakerService.getAllSpeakers();

      expect(mockPrisma.speakerProfile.findMany).toHaveBeenCalledWith({
        take: 50,
        skip: 0,
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockSpeakers);
    });

    it('should retrieve all speakers with custom pagination', async () => {
      const mockSpeakers = [createMockSpeakerProfile()];
      mockPrisma.speakerProfile.findMany.mockResolvedValue(mockSpeakers);

      await speakerService.getAllSpeakers(20, 10);

      expect(mockPrisma.speakerProfile.findMany).toHaveBeenCalledWith({
        take: 20,
        skip: 10,
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('deleteSpeakerProfile()', () => {
    it('should delete speaker profile successfully', async () => {
      mockPrisma.speakerProfile.delete.mockResolvedValue(createMockSpeakerProfile());

      await speakerService.deleteSpeakerProfile('speaker-123');

      expect(mockPrisma.speakerProfile.delete).toHaveBeenCalledWith({
        where: { id: 'speaker-123' },
      });
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockPrisma.speakerProfile.delete.mockRejectedValue(dbError);

      await expect(speakerService.deleteSpeakerProfile('speaker-123')).rejects.toThrow('Database error');
    });
  });

  describe('updateAvailability()', () => {
    it('should update speaker availability to true', async () => {
      const updatedProfile = createMockSpeakerProfile({ isAvailable: true });
      mockPrisma.speakerProfile.update.mockResolvedValue(updatedProfile);

      const result = await speakerService.updateAvailability('speaker-123', true);

      expect(mockPrisma.speakerProfile.update).toHaveBeenCalledWith({
        where: { id: 'speaker-123' },
        data: {
          isAvailable: true,
          updatedAt: expect.any(Date),
        },
      });
      expect(result).toEqual(updatedProfile);
    });

    it('should update speaker availability to false', async () => {
      const updatedProfile = createMockSpeakerProfile({ isAvailable: false });
      mockPrisma.speakerProfile.update.mockResolvedValue(updatedProfile);

      const result = await speakerService.updateAvailability('speaker-123', false);

      expect(mockPrisma.speakerProfile.update).toHaveBeenCalledWith({
        where: { id: 'speaker-123' },
        data: {
          isAvailable: false,
          updatedAt: expect.any(Date),
        },
      });
      expect(result).toEqual(updatedProfile);
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockPrisma.speakerProfile.update.mockRejectedValue(dbError);

      await expect(speakerService.updateAvailability('speaker-123', true)).rejects.toThrow('Database error');
    });
  });
});

