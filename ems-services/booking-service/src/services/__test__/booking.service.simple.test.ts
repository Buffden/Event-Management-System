/**
 * Simple Booking Service Tests
 * 
 * This file contains basic tests for the BookingService class
 * that focus on testing the methods that actually exist.
 */

import { BookingService } from '../booking.service';
import '@jest/globals';

describe('BookingService (simple)', () => {
  let bookingService: BookingService;

  beforeEach(() => {
    bookingService = new BookingService();
  });

  describe('basic functionality', () => {
    it('should be able to instantiate BookingService', () => {
      expect(bookingService).toBeInstanceOf(BookingService);
    });

    it('should have required methods', () => {
      expect(typeof bookingService.createBooking).toBe('function');
      expect(typeof bookingService.getBookingById).toBe('function');
    });
  });

  describe('createBooking', () => {
    it('should be a function', () => {
      expect(typeof bookingService.createBooking).toBe('function');
    });
  });

  describe('getBookingById', () => {
    it('should be a function', () => {
      expect(typeof bookingService.getBookingById).toBe('function');
    });
  });
});
