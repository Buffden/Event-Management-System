import { prisma } from '../database';
import { logger } from '../utils/logger';
import {
  CreateVenueRequest,
  UpdateVenueRequest,
  VenueResponse,
  VenueListResponse,
  VenueFilters
} from '../types';

class VenueService {
  /**
   * Create a new venue
   */
  async createVenue(data: CreateVenueRequest): Promise<VenueResponse> {
    try {
      logger.info('Creating new venue', { venueName: data.name });

      // Validate time format (HH:mm)
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(data.openingTime) || !timeRegex.test(data.closingTime)) {
        throw new Error('Time must be in HH:mm format (24-hour)');
      }

      // Validate capacity
      if (data.capacity <= 0) {
        throw new Error('Capacity must be greater than 0');
      }

      // Check if venue name already exists
      const existingVenue = await prisma.venue.findUnique({
        where: { name: data.name }
      });

      if (existingVenue) {
        throw new Error('Venue with this name already exists');
      }

      const venue = await prisma.venue.create({
        data: {
          name: data.name,
          address: data.address,
          capacity: data.capacity,
          openingTime: data.openingTime,
          closingTime: data.closingTime
        }
      });

      logger.info('Venue created successfully', { venueId: venue.id, venueName: venue.name });

      return this.mapVenueToResponse(venue);
    } catch (error) {
      logger.error('Failed to create venue', error as Error, { venueData: data });
      throw error;
    }
  }

  /**
   * Update an existing venue
   */
  async updateVenue(venueId: number, data: UpdateVenueRequest): Promise<VenueResponse> {
    try {
      logger.info('Updating venue', { venueId });

      const existingVenue = await prisma.venue.findUnique({
        where: { id: venueId }
      });

      if (!existingVenue) {
        throw new Error('Venue not found');
      }

      // Validate time format if provided
      if (data.openingTime || data.closingTime) {
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (data.openingTime && !timeRegex.test(data.openingTime)) {
          throw new Error('Opening time must be in HH:mm format (24-hour)');
        }
        if (data.closingTime && !timeRegex.test(data.closingTime)) {
          throw new Error('Closing time must be in HH:mm format (24-hour)');
        }
      }

      // Validate capacity if provided
      if (data.capacity !== undefined && data.capacity <= 0) {
        throw new Error('Capacity must be greater than 0');
      }

      // Check if venue name already exists (if name is being updated)
      if (data.name && data.name !== existingVenue.name) {
        const existingVenueWithName = await prisma.venue.findUnique({
          where: { name: data.name }
        });

        if (existingVenueWithName) {
          throw new Error('Venue with this name already exists');
        }
      }

      const venue = await prisma.venue.update({
        where: { id: venueId },
        data
      });

      logger.info('Venue updated successfully', { venueId, venueName: venue.name });

      return this.mapVenueToResponse(venue);
    } catch (error) {
      logger.error('Failed to update venue', error as Error, { venueId, updateData: data });
      throw error;
    }
  }

  /**
   * Delete a venue
   */
  async deleteVenue(venueId: number): Promise<void> {
    try {
      logger.info('Deleting venue', { venueId });

      const existingVenue = await prisma.venue.findUnique({
        where: { id: venueId },
        include: { events: true }
      });

      if (!existingVenue) {
        throw new Error('Venue not found');
      }

      // Check if venue has any events
      if (existingVenue.events.length > 0) {
        throw new Error('Cannot delete venue that has associated events');
      }

      await prisma.venue.delete({
        where: { id: venueId }
      });

      logger.info('Venue deleted successfully', { venueId });
    } catch (error) {
      logger.error('Failed to delete venue', error as Error, { venueId });
      throw error;
    }
  }

  /**
   * Get venue by ID
   */
  async getVenueById(venueId: number): Promise<VenueResponse | null> {
    try {
      const venue = await prisma.venue.findUnique({
        where: { id: venueId }
      });

      if (!venue) {
        return null;
      }

      return this.mapVenueToResponse(venue);
    } catch (error) {
      logger.error('Failed to get venue by ID', error as Error, { venueId });
      throw error;
    }
  }

  /**
   * Get all venues with filtering and pagination
   */
  async getVenues(filters: VenueFilters = {}): Promise<VenueListResponse> {
    try {
      const {
        name,
        capacity,
        page = 1,
        limit = 10
      } = filters;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};

      if (name) {
        where.name = {
          contains: name,
          mode: 'insensitive'
        };
      }

      if (capacity) {
        where.capacity = {
          gte: capacity
        };
      }

      const [venues, total] = await Promise.all([
        prisma.venue.findMany({
          where,
          orderBy: { name: 'asc' },
          skip,
          take: limit
        }),
        prisma.venue.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        venues: venues.map(venue => this.mapVenueToResponse(venue)),
        total,
        page,
        limit,
        totalPages
      };
    } catch (error) {
      logger.error('Failed to get venues', error as Error, { filters });
      throw error;
    }
  }

  /**
   * Get all venues (for dropdowns, etc.)
   */
  async getAllVenues(): Promise<VenueResponse[]> {
    try {
      const venues = await prisma.venue.findMany({
        orderBy: { name: 'asc' }
      });

      return venues.map(venue => this.mapVenueToResponse(venue));
    } catch (error) {
      logger.error('Failed to get all venues', error as Error);
      throw error;
    }
  }

  /**
   * Map Prisma venue to response format
   */
  private mapVenueToResponse(venue: any): VenueResponse {
    return {
      id: venue.id,
      name: venue.name,
      address: venue.address,
      capacity: venue.capacity,
      openingTime: venue.openingTime,
      closingTime: venue.closingTime,
      createdAt: venue.createdAt.toISOString(),
      updatedAt: venue.updatedAt.toISOString()
    };
  }
}

export const venueService = new VenueService();
