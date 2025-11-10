/**
 * Venue Service Tests
 *
 * Tests for venue service including:
 * - Creating venues
 * - Updating venues
 * - Deleting venues
 * - Getting venues
 * - Error handling
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Import mocks from mocks-simple
import { mockPrisma, mockLogger } from '../../test/mocks-simple';

// Mock logger first
jest.mock('../../utils/logger', () => ({
  logger: mockLogger,
}));

// Mock database
jest.mock('../../database', () => ({
  prisma: mockPrisma,
}));

// Import after mocks
import { venueService } from '../venue.service';
import { createMockVenue } from '../../test/mocks-simple';

describe('VenueService', () => {
  beforeEach(() => {
    // Reset mock call history but keep implementations
    mockPrisma.venue.findUnique.mockClear();
    mockPrisma.venue.create.mockClear();
    mockPrisma.venue.update.mockClear();
    mockPrisma.venue.delete.mockClear();
    mockPrisma.venue.findMany.mockClear();
    mockPrisma.venue.count.mockClear();
  });

  describe('createVenue', () => {
    it('should create a new venue successfully', async () => {
      const venueData = {
        name: 'Test Venue',
        address: '123 Test St',
        capacity: 100,
        openingTime: '09:00',
        closingTime: '18:00',
      };

      const mockVenue = {
        id: 1,
        name: venueData.name,
        address: venueData.address,
        capacity: venueData.capacity,
        openingTime: venueData.openingTime,
        closingTime: venueData.closingTime,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      };

      // Set up mocks for this specific test
      (mockPrisma.venue.findUnique as jest.MockedFunction<any>).mockResolvedValueOnce(null); // No existing venue
      (mockPrisma.venue.create as jest.MockedFunction<any>).mockResolvedValueOnce(mockVenue);

      const result = await venueService.createVenue(venueData);

      expect(result).toBeDefined();
      expect(result.name).toBe(venueData.name);
      expect(result.id).toBe(1);
      expect(mockPrisma.venue.findUnique).toHaveBeenCalledWith({
        where: { name: venueData.name },
      });
      expect(mockPrisma.venue.create).toHaveBeenCalledWith({
        data: venueData,
      });
    });

    it('should throw error for invalid time format', async () => {
      const venueData = {
        name: 'Test Venue',
        address: '123 Test St',
        capacity: 100,
        openingTime: '25:00', // Invalid
        closingTime: '18:00',
      };

      await expect(venueService.createVenue(venueData)).rejects.toThrow(
        'Time must be in HH:mm format (24-hour)'
      );
    });

    it('should throw error for capacity <= 0', async () => {
      const venueData = {
        name: 'Test Venue',
        address: '123 Test St',
        capacity: 0,
        openingTime: '09:00',
        closingTime: '18:00',
      };

      await expect(venueService.createVenue(venueData)).rejects.toThrow(
        'Capacity must be greater than 0'
      );
    });

    it('should throw error if venue name already exists', async () => {
      const venueData = {
        name: 'Existing Venue',
        address: '123 Test St',
        capacity: 100,
        openingTime: '09:00',
        closingTime: '18:00',
      };

      const existingVenue = { id: 1, name: venueData.name, address: 'Old Address', capacity: 100, openingTime: '09:00', closingTime: '18:00', createdAt: new Date(), updatedAt: new Date() };
      mockPrisma.venue.findUnique.mockResolvedValue(existingVenue);

      await expect(venueService.createVenue(venueData)).rejects.toThrow(
        'Venue with this name already exists'
      );
    });

    it('should handle database errors', async () => {
      const venueData = {
        name: 'Test Venue',
        address: '123 Test St',
        capacity: 100,
        openingTime: '09:00',
        closingTime: '18:00',
      };

      const error = new Error('Database error');
      mockPrisma.venue.findUnique.mockRejectedValue(error);

      await expect(venueService.createVenue(venueData)).rejects.toThrow('Database error');
    });
  });

  describe('updateVenue', () => {
    it('should update venue successfully', async () => {
      const venueId = 1;
      const updateData = {
        name: 'Updated Venue',
      };

      const existingVenue = { id: venueId, name: 'Old Venue', address: 'Old Address', capacity: 100, openingTime: '09:00', closingTime: '18:00', createdAt: new Date(), updatedAt: new Date() };
      const updatedVenue = { id: venueId, ...updateData, address: 'Old Address', capacity: 100, openingTime: '09:00', closingTime: '18:00', createdAt: new Date(), updatedAt: new Date() };

      // First call: check if venue exists
      mockPrisma.venue.findUnique.mockResolvedValueOnce(existingVenue);
      // Second call: check if new name already exists (when name is being updated)
      mockPrisma.venue.findUnique.mockResolvedValueOnce(null);
      mockPrisma.venue.update.mockResolvedValue(updatedVenue);

      const result = await venueService.updateVenue(venueId, updateData);

      expect(result).toBeDefined();
      expect(result.name).toBe(updateData.name);
      expect(mockPrisma.venue.update).toHaveBeenCalledWith({
        where: { id: venueId },
        data: updateData,
      });
    });

    it('should throw error if venue not found', async () => {
      const venueId = 999;
      const updateData = { name: 'Updated Venue' };

      mockPrisma.venue.findUnique.mockResolvedValue(null);

      await expect(venueService.updateVenue(venueId, updateData)).rejects.toThrow(
        'Venue not found'
      );
    });

    it('should throw error for invalid opening time format', async () => {
      const venueId = 1;
      const updateData = {
        openingTime: '25:00', // Invalid
      };

      const existingVenue = { id: venueId, name: 'Test Venue', address: 'Test Address', capacity: 100, openingTime: '09:00', closingTime: '18:00', createdAt: new Date(), updatedAt: new Date() };
      mockPrisma.venue.findUnique.mockResolvedValue(existingVenue);

      await expect(venueService.updateVenue(venueId, updateData)).rejects.toThrow(
        'Opening time must be in HH:mm format (24-hour)'
      );
    });

    it('should throw error for invalid closing time format', async () => {
      const venueId = 1;
      const updateData = {
        closingTime: '25:00', // Invalid
      };

      const existingVenue = { id: venueId, name: 'Test Venue', address: 'Test Address', capacity: 100, openingTime: '09:00', closingTime: '18:00', createdAt: new Date(), updatedAt: new Date() };
      mockPrisma.venue.findUnique.mockResolvedValue(existingVenue);

      await expect(venueService.updateVenue(venueId, updateData)).rejects.toThrow(
        'Closing time must be in HH:mm format (24-hour)'
      );
    });

    it('should throw error for capacity <= 0', async () => {
      const venueId = 1;
      const updateData = {
        capacity: 0,
      };

      const existingVenue = { id: venueId, name: 'Test Venue', address: 'Test Address', capacity: 100, openingTime: '09:00', closingTime: '18:00', createdAt: new Date(), updatedAt: new Date() };
      mockPrisma.venue.findUnique.mockResolvedValue(existingVenue);

      await expect(venueService.updateVenue(venueId, updateData)).rejects.toThrow(
        'Capacity must be greater than 0'
      );
    });

    it('should throw error if new name already exists', async () => {
      const venueId = 1;
      const updateData = {
        name: 'Existing Name',
      };

      const existingVenue = { id: venueId, name: 'Old Name', address: 'Test Address', capacity: 100, openingTime: '09:00', closingTime: '18:00', createdAt: new Date(), updatedAt: new Date() };
      const venueWithNewName = { id: 2, name: updateData.name, address: 'Test Address', capacity: 100, openingTime: '09:00', closingTime: '18:00', createdAt: new Date(), updatedAt: new Date() };

      mockPrisma.venue.findUnique
        .mockResolvedValueOnce(existingVenue) // Existing venue
        .mockResolvedValueOnce(venueWithNewName); // Name already exists

      await expect(venueService.updateVenue(venueId, updateData)).rejects.toThrow(
        'Venue with this name already exists'
      );
    });
  });

  describe('deleteVenue', () => {
    it('should delete venue successfully', async () => {
      const venueId = 1;
      const existingVenue = { id: venueId, name: 'Test Venue', address: 'Test Address', capacity: 100, openingTime: '09:00', closingTime: '18:00', createdAt: new Date(), updatedAt: new Date(), events: [] };

      mockPrisma.venue.findUnique.mockResolvedValue(existingVenue);
      mockPrisma.venue.delete.mockResolvedValue(existingVenue);

      await venueService.deleteVenue(venueId);

      expect(mockPrisma.venue.delete).toHaveBeenCalledWith({
        where: { id: venueId },
      });
    });

    it('should throw error if venue not found', async () => {
      const venueId = 999;

      mockPrisma.venue.findUnique.mockResolvedValue(null);

      await expect(venueService.deleteVenue(venueId)).rejects.toThrow('Venue not found');
    });

    it('should throw error if venue has associated events', async () => {
      const venueId = 1;
      const existingVenue = {
        id: venueId,
        name: 'Test Venue',
        address: 'Test Address',
        capacity: 100,
        openingTime: '09:00',
        closingTime: '18:00',
        createdAt: new Date(),
        updatedAt: new Date(),
        events: [{ id: 'event-1' }], // Has events
      };

      mockPrisma.venue.findUnique.mockResolvedValue(existingVenue);

      await expect(venueService.deleteVenue(venueId)).rejects.toThrow(
        'Cannot delete venue that has associated events'
      );
      expect(mockPrisma.venue.delete).not.toHaveBeenCalled();
    });
  });

  describe('getVenueById', () => {
    it('should return venue by ID', async () => {
      const venueId = 1;
      const mockVenue = { id: venueId, name: 'Test Venue', address: 'Test Address', capacity: 100, openingTime: '09:00', closingTime: '18:00', createdAt: new Date('2024-01-01T00:00:00Z'), updatedAt: new Date('2024-01-01T00:00:00Z') };

      mockPrisma.venue.findUnique.mockResolvedValue(mockVenue);

      const result = await venueService.getVenueById(venueId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(venueId);
      expect(mockPrisma.venue.findUnique).toHaveBeenCalledWith({
        where: { id: venueId },
      });
    });

    it('should return null if venue not found', async () => {
      const venueId = 999;

      mockPrisma.venue.findUnique.mockResolvedValue(null);

      const result = await venueService.getVenueById(venueId);

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      const venueId = 1;
      const error = new Error('Database error');

      // Clear any previous mocks and set up the error
      mockPrisma.venue.findUnique.mockReset();
      mockPrisma.venue.findUnique.mockRejectedValue(error);

      await expect(venueService.getVenueById(venueId)).rejects.toThrow('Database error');
    });
  });

  describe('getVenues', () => {
    it('should return venues with pagination', async () => {
      const filters = {
        page: 1,
        limit: 10,
      };

      const mockVenues = [
        { id: 1, name: 'Venue 1', address: 'Address 1', capacity: 100, openingTime: '09:00', closingTime: '18:00', createdAt: new Date('2024-01-01T00:00:00Z'), updatedAt: new Date('2024-01-01T00:00:00Z') },
        { id: 2, name: 'Venue 2', address: 'Address 2', capacity: 200, openingTime: '09:00', closingTime: '18:00', createdAt: new Date('2024-01-01T00:00:00Z'), updatedAt: new Date('2024-01-01T00:00:00Z') }
      ];
      mockPrisma.venue.findMany.mockResolvedValue(mockVenues);
      mockPrisma.venue.count.mockResolvedValue(2);

      const result = await venueService.getVenues(filters);

      expect(result).toBeDefined();
      expect(result.venues).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('should filter venues by name', async () => {
      const filters = {
        name: 'Test',
        page: 1,
        limit: 10,
      };

      const mockVenues = [{ id: 1, name: 'Test Venue', address: 'Test Address', capacity: 100, openingTime: '09:00', closingTime: '18:00', createdAt: new Date('2024-01-01T00:00:00Z'), updatedAt: new Date('2024-01-01T00:00:00Z') }];
      mockPrisma.venue.findMany.mockResolvedValue(mockVenues);
      mockPrisma.venue.count.mockResolvedValue(1);

      const result = await venueService.getVenues(filters);

      expect(result.venues).toHaveLength(1);
      expect(mockPrisma.venue.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          name: {
            contains: 'Test',
            mode: 'insensitive',
          },
        }),
        orderBy: { name: 'asc' },
        skip: 0,
        take: 10,
      });
    });

    it('should filter venues by capacity', async () => {
      const filters = {
        capacity: 100,
        page: 1,
        limit: 10,
      };

      const mockVenues = [{ id: 1, name: 'Test Venue', address: 'Test Address', capacity: 150, openingTime: '09:00', closingTime: '18:00', createdAt: new Date('2024-01-01T00:00:00Z'), updatedAt: new Date('2024-01-01T00:00:00Z') }];
      mockPrisma.venue.findMany.mockResolvedValue(mockVenues);
      mockPrisma.venue.count.mockResolvedValue(1);

      const result = await venueService.getVenues(filters);

      expect(result.venues).toHaveLength(1);
      expect(mockPrisma.venue.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          capacity: {
            gte: 100,
          },
        }),
        orderBy: { name: 'asc' },
        skip: 0,
        take: 10,
      });
    });

    it('should handle database errors', async () => {
      const filters = { page: 1, limit: 10 };
      const error = new Error('Database error');

      // Set up error - Promise.all will fail on first rejection
      mockPrisma.venue.findMany.mockRejectedValue(error);

      await expect(venueService.getVenues(filters)).rejects.toThrow('Database error');
    });
  });

  describe('getAllVenues', () => {
    it('should return all venues', async () => {
      const mockVenues = [
        { id: 1, name: 'Venue 1', address: 'Address 1', capacity: 100, openingTime: '09:00', closingTime: '18:00', createdAt: new Date('2024-01-01T00:00:00Z'), updatedAt: new Date('2024-01-01T00:00:00Z') },
        { id: 2, name: 'Venue 2', address: 'Address 2', capacity: 200, openingTime: '09:00', closingTime: '18:00', createdAt: new Date('2024-01-01T00:00:00Z'), updatedAt: new Date('2024-01-01T00:00:00Z') },
        { id: 3, name: 'Venue 3', address: 'Address 3', capacity: 300, openingTime: '09:00', closingTime: '18:00', createdAt: new Date('2024-01-01T00:00:00Z'), updatedAt: new Date('2024-01-01T00:00:00Z') }
      ];

      (mockPrisma.venue.findMany as jest.MockedFunction<any>).mockResolvedValue(mockVenues);

      const result = await venueService.getAllVenues();

      expect(result).toHaveLength(3);
      expect(mockPrisma.venue.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      });
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');

      mockPrisma.venue.findMany.mockRejectedValue(error);

      await expect(venueService.getAllVenues()).rejects.toThrow('Database error');
    });
  });
});

