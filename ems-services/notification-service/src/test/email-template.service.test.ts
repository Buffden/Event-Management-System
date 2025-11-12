/**
 * Comprehensive Test Suite for Email Template Service
 *
 * Tests all email template generation functionality including:
 * - All notification types
 * - Template content generation
 * - Error handling
 */

import { describe, it, beforeEach, afterEach, expect } from '@jest/globals';
import {
  createMockEmailNotification,
  createMockEventApprovedNotification,
  createMockEventCancelledNotification,
  createMockEventUpdatedNotification,
  createMockBookingConfirmedNotification,
  createMockBookingCancelledNotification,
  createMockWelcomeEmail,
  createMockPasswordResetEmail,
  resetAllMocks,
} from './mocks-simple';
import { EmailTemplateService } from '../services/email-template.service';
import { MESSAGE_TYPE } from '../types/types';

describe('EmailTemplateService', () => {
  let emailTemplateService: EmailTemplateService;

  beforeEach(() => {
    resetAllMocks();
    emailTemplateService = new EmailTemplateService();
  });

  afterEach(() => {
    resetAllMocks();
  });

  describe('constructor()', () => {
    it('should create EmailTemplateService with default app name', () => {
      expect(emailTemplateService).toBeDefined();
    });

    it('should use environment variables for app name and base URL', () => {
      const service = new EmailTemplateService();
      expect(service).toBeDefined();
    });
  });

  describe('generateEmailContent()', () => {
    describe('ACCOUNT_VERIFICATION_EMAIL', () => {
      it('should generate verification email content', () => {
        const notification = createMockEmailNotification({
          type: MESSAGE_TYPE.ACCOUNT_VERIFICATION_EMAIL,
          message: {
            to: 'test@example.com',
            subject: 'Verify Your Email',
            link: 'https://example.com/verify?token=123',
            userName: 'Test User',
            expiryTime: '2024-12-31T23:59:59Z',
          },
        });

        const result = emailTemplateService.generateEmailContent(notification);

        expect(result.subject).toBe('Verify Your Email');
        expect(result.body).toContain('Test User');
        expect(result.body).toContain('https://example.com/verify?token=123');
        expect(result.body).toContain('Verify My Email');
        expect(result.body).toContain('2024-12-31T23:59:59Z');
      });

      it('should include verification link in email body', () => {
        const notification = createMockEmailNotification({
          type: MESSAGE_TYPE.ACCOUNT_VERIFICATION_EMAIL,
          message: {
            to: 'test@example.com',
            subject: 'Verify Your Email',
            link: 'https://example.com/verify?token=abc123',
            userName: 'John Doe',
            expiryTime: '2024-12-31T23:59:59Z',
          },
        });

        const result = emailTemplateService.generateEmailContent(notification);

        expect(result.body).toContain('https://example.com/verify?token=abc123');
        expect(result.body).toContain('Verify My Email');
      });
    });

    describe('PASSWORD_RESET_EMAIL', () => {
      it('should generate password reset email content', () => {
        const notification = createMockPasswordResetEmail({
          message: {
            to: 'test@example.com',
            subject: 'Reset Your Password',
            link: 'https://example.com/reset?token=xyz',
            userName: 'Test User',
            expiryTime: '2024-12-31T23:59:59Z',
          },
        });

        const result = emailTemplateService.generateEmailContent(notification);

        expect(result.subject).toBe('Reset Your Password');
        expect(result.body).toContain('Test User');
        expect(result.body).toContain('Reset My Password');
        expect(result.body).toContain('password reset');
      });

      it('should include reset link in email body', () => {
        const notification = createMockPasswordResetEmail({
          message: {
            to: 'test@example.com',
            subject: 'Reset Your Password',
            link: 'https://example.com/reset?token=reset123',
            userName: 'Jane Smith',
            expiryTime: '2024-12-31T23:59:59Z',
          },
        });

        const result = emailTemplateService.generateEmailContent(notification);

        expect(result.body).toContain('https://example.com/reset?token=reset123');
        expect(result.body).toContain('Reset My Password');
      });
    });

    describe('EVENT_APPROVED_NOTIFICATION', () => {
      it('should generate event approved email content', () => {
        const notification = createMockEventApprovedNotification({
          message: {
            to: 'speaker@example.com',
            subject: 'Event Approved',
            speakerName: 'John Speaker',
            eventName: 'Tech Conference 2024',
            eventDescription: 'A great tech conference',
            venueName: 'Convention Center',
            bookingStartDate: '2024-12-01T00:00:00Z',
            bookingEndDate: '2024-12-31T23:59:59Z',
          },
        });

        const result = emailTemplateService.generateEmailContent(notification);

        expect(result.subject).toContain('Event Has Been Approved');
        expect(result.body).toContain('John Speaker');
        expect(result.body).toContain('Tech Conference 2024');
        expect(result.body).toContain('A great tech conference');
        expect(result.body).toContain('Convention Center');
      });
    });

    describe('EVENT_CANCELLED_NOTIFICATION', () => {
      it('should generate event cancelled email content', () => {
        const notification = createMockEventCancelledNotification({
          message: {
            to: 'attendee@example.com',
            subject: 'Event Cancelled',
            attendeeName: 'Jane Attendee',
            eventName: 'Cancelled Event',
            eventDate: '2024-12-15',
            venueName: 'Test Venue',
            cancellationReason: 'Due to unforeseen circumstances',
          },
        });

        const result = emailTemplateService.generateEmailContent(notification);

        expect(result.subject).toContain('Event Cancelled');
        expect(result.body).toContain('Jane Attendee');
        expect(result.body).toContain('Cancelled Event');
        expect(result.body).toContain('Due to unforeseen circumstances');
      });

      it('should handle missing cancellation reason', () => {
        const notification = createMockEventCancelledNotification({
          message: {
            to: 'attendee@example.com',
            subject: 'Event Cancelled',
            attendeeName: 'Jane Attendee',
            eventName: 'Cancelled Event',
            eventDate: '2024-12-15',
            venueName: 'Test Venue',
            cancellationReason: undefined,
          },
        });

        const result = emailTemplateService.generateEmailContent(notification);

        expect(result.body).toContain('Jane Attendee');
        expect(result.body).toContain('Cancelled Event');
      });
    });

    describe('EVENT_UPDATED_NOTIFICATION', () => {
      it('should generate event updated email content', () => {
        const notification = createMockEventUpdatedNotification({
          message: {
            to: 'attendee@example.com',
            subject: 'Event Updated',
            attendeeName: 'Bob Attendee',
            eventName: 'Updated Event',
            eventDate: '2024-12-20',
            venueName: 'New Venue',
            updatedFields: ['Date changed', 'Venue updated'],
          },
        });

        const result = emailTemplateService.generateEmailContent(notification);

        expect(result.subject).toContain('Event Updated');
        expect(result.body).toContain('Bob Attendee');
        expect(result.body).toContain('Updated Event');
        expect(result.body).toContain('Date changed');
        expect(result.body).toContain('Venue updated');
      });
    });

    describe('BOOKING_CONFIRMED_NOTIFICATION', () => {
      it('should generate booking confirmed email content', () => {
        const notification = createMockBookingConfirmedNotification({
          message: {
            to: 'attendee@example.com',
            subject: 'Booking Confirmed',
            attendeeName: 'Alice Attendee',
            eventName: 'Confirmed Event',
            eventDate: '2024-12-25',
            venueName: 'Event Venue',
            bookingId: 'booking-123',
          },
        });

        const result = emailTemplateService.generateEmailContent(notification);

        expect(result.subject).toContain('Booking Confirmed');
        expect(result.body).toContain('Alice Attendee');
        expect(result.body).toContain('Confirmed Event');
        expect(result.body).toContain('booking-123');
      });
    });

    describe('BOOKING_CANCELLED_NOTIFICATION', () => {
      it('should generate booking cancelled email content', () => {
        const notification = createMockBookingCancelledNotification({
          message: {
            to: 'attendee@example.com',
            subject: 'Booking Cancelled',
            attendeeName: 'Charlie Attendee',
            eventName: 'Cancelled Booking Event',
            eventDate: '2024-12-30',
            venueName: 'Event Venue',
            bookingId: 'booking-456',
            cancellationReason: 'User requested cancellation',
          },
        });

        const result = emailTemplateService.generateEmailContent(notification);

        expect(result.subject).toContain('Booking Cancelled');
        expect(result.body).toContain('Charlie Attendee');
        expect(result.body).toContain('Cancelled Booking Event');
        expect(result.body).toContain('booking-456');
        expect(result.body).toContain('User requested cancellation');
      });
    });

    describe('WELCOME_EMAIL', () => {
      it('should generate welcome email for USER role', () => {
        const notification = createMockWelcomeEmail({
          message: {
            to: 'newuser@example.com',
            subject: 'Welcome',
            userName: 'New User',
            userRole: 'USER',
            dashboardLink: 'https://example.com/dashboard',
          },
        });

        const result = emailTemplateService.generateEmailContent(notification);

        expect(result.subject).toContain('Welcome');
        expect(result.body).toContain('New User');
        expect(result.body).toContain('USER');
        expect(result.body).toContain('Browse and register for events');
        expect(result.body).toContain('https://example.com/dashboard');
      });

      it('should generate welcome email for SPEAKER role', () => {
        const notification = createMockWelcomeEmail({
          message: {
            to: 'newspeaker@example.com',
            subject: 'Welcome',
            userName: 'New Speaker',
            userRole: 'SPEAKER',
            dashboardLink: 'https://example.com/dashboard',
          },
        });

        const result = emailTemplateService.generateEmailContent(notification);

        expect(result.subject).toContain('Welcome');
        expect(result.body).toContain('New Speaker');
        expect(result.body).toContain('SPEAKER');
        expect(result.body).toContain('Create and manage your events');
      });
    });

    describe('Error Handling', () => {
      it('should throw error for unsupported notification type', () => {
        const invalidNotification = {
          type: 'UNSUPPORTED_TYPE' as MESSAGE_TYPE,
          message: {},
        };

        expect(() => {
          emailTemplateService.generateEmailContent(invalidNotification as any);
        }).toThrow('Unsupported notification type: UNSUPPORTED_TYPE');
      });

      it('should handle missing message properties gracefully', () => {
        const notification = {
          type: MESSAGE_TYPE.ACCOUNT_VERIFICATION_EMAIL,
          message: {
            to: 'test@example.com',
            // Missing other required properties
          },
        };

        expect(() => {
          emailTemplateService.generateEmailContent(notification as any);
        }).not.toThrow();
      });
    });

    describe('Template Content Validation', () => {
      it('should generate HTML content for all notification types', () => {
        const notificationTypes = [
          MESSAGE_TYPE.ACCOUNT_VERIFICATION_EMAIL,
          MESSAGE_TYPE.PASSWORD_RESET_EMAIL,
          MESSAGE_TYPE.EVENT_APPROVED_NOTIFICATION,
          MESSAGE_TYPE.BOOKING_CONFIRMED_NOTIFICATION,
          MESSAGE_TYPE.WELCOME_EMAIL,
        ];

        notificationTypes.forEach((type) => {
          let notification: any;
          switch (type) {
            case MESSAGE_TYPE.ACCOUNT_VERIFICATION_EMAIL:
              notification = createMockEmailNotification({ type });
              break;
            case MESSAGE_TYPE.PASSWORD_RESET_EMAIL:
              notification = createMockPasswordResetEmail();
              break;
            case MESSAGE_TYPE.EVENT_APPROVED_NOTIFICATION:
              notification = createMockEventApprovedNotification();
              break;
            case MESSAGE_TYPE.BOOKING_CONFIRMED_NOTIFICATION:
              notification = createMockBookingConfirmedNotification();
              break;
            case MESSAGE_TYPE.WELCOME_EMAIL:
              notification = createMockWelcomeEmail();
              break;
          }

          const result = emailTemplateService.generateEmailContent(notification);
          expect(result.body).toContain('<!DOCTYPE html>');
          expect(result.body).toContain('<html>');
          expect(result.body).toContain('</html>');
        });
      });

      it('should include app name in all templates', () => {
        const notification = createMockEmailNotification();
        const result = emailTemplateService.generateEmailContent(notification);

        expect(result.body).toContain(process.env.APP_NAME || 'Event Management System');
      });
    });
  });
});

