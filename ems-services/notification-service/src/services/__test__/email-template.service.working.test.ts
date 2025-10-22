/**
 * Working Email Template Service Tests
 * 
 * This file contains comprehensive tests for the EmailTemplateService class
 * using the actual method names and functionality that exist in the service.
 */

import { EmailTemplateService } from '../email-template.service';
import {
  createMockEventApprovedNotification,
  createMockBookingConfirmedNotification,
  createMockWelcomeEmail,
  createMockEventCancelledNotification,
  createMockEventUpdatedNotification,
  createMockEventReminderNotification,
  setupSuccessfulTemplateGeneration,
} from '../../test/mocks-simple';
import { MESSAGE_TYPE } from '../../types/types';

describe('EmailTemplateService (working)', () => {
  let emailTemplateService: EmailTemplateService;

  beforeEach(() => {
    emailTemplateService = new EmailTemplateService();
  });

  describe('generateEmailContent', () => {
    it('should generate event approved notification email', () => {
      const mockNotification = createMockEventApprovedNotification({
        message: {
          speakerName: 'John Doe',
          eventName: 'Tech Conference 2024',
          eventDescription: 'A tech conference event',
          venueName: 'Convention Center',
          bookingStartDate: '2024-12-15T09:00:00Z',
          bookingEndDate: '2024-12-15T18:00:00Z',
        }
      });

      setupSuccessfulTemplateGeneration();

      const result = emailTemplateService.generateEmailContent(mockNotification);

      expect(result).toBeDefined();
      expect(result.subject).toContain('Your Event Has Been Approved');
      expect(result.body).toContain('Tech Conference 2024');
      expect(result.body).toContain('Convention Center');
      expect(result.body).toContain('John Doe');
    });

    it('should generate booking confirmed notification email', () => {
      const mockNotification = createMockBookingConfirmedNotification({
        message: {
          attendeeName: 'Jane Smith',
          eventName: 'Workshop Series',
          eventDate: '2024-11-20T14:00:00Z',
          venueName: 'Training Center',
          bookingId: 'booking-456',
        }
      });

      setupSuccessfulTemplateGeneration();

      const result = emailTemplateService.generateEmailContent(mockNotification);

      expect(result).toBeDefined();
      expect(result.subject).toContain('Booking Confirmed');
      expect(result.subject).toContain('Workshop Series');
      expect(result.body).toContain('Jane Smith');
      expect(result.body).toContain('Workshop Series');
      expect(result.body).toContain('Training Center');
      expect(result.body).toContain('booking-456');
    });

    it('should generate welcome email', () => {
      const mockWelcomeEmail = createMockWelcomeEmail({
        message: {
          userName: 'Alice Johnson',
          userRole: 'USER',
          dashboardLink: 'https://example.com/dashboard',
        }
      });

      setupSuccessfulTemplateGeneration();

      const result = emailTemplateService.generateEmailContent(mockWelcomeEmail);

      expect(result).toBeDefined();
      expect(result.subject).toContain('Welcome');
      expect(result.body).toContain('Alice Johnson');
      expect(result.body).toContain('USER');
      expect(result.body).toContain('https://example.com/dashboard');
    });

    it('should handle all supported message types', () => {
      const messageTypes = [
        MESSAGE_TYPE.ACCOUNT_VERIFICATION_EMAIL,
        MESSAGE_TYPE.PASSWORD_RESET_EMAIL,
        MESSAGE_TYPE.EVENT_APPROVED_NOTIFICATION,
        MESSAGE_TYPE.EVENT_CANCELLED_NOTIFICATION,
        MESSAGE_TYPE.EVENT_UPDATED_NOTIFICATION,
        MESSAGE_TYPE.EVENT_PUBLISHED_NOTIFICATION,
        MESSAGE_TYPE.BOOKING_CONFIRMED_NOTIFICATION,
        MESSAGE_TYPE.BOOKING_CANCELLED_NOTIFICATION,
        MESSAGE_TYPE.EVENT_REMINDER_NOTIFICATION,
        MESSAGE_TYPE.WELCOME_EMAIL,
      ];

      setupSuccessfulTemplateGeneration();

      messageTypes.forEach((messageType) => {
        let mockNotification;
        
        switch (messageType) {
          case MESSAGE_TYPE.ACCOUNT_VERIFICATION_EMAIL:
          case MESSAGE_TYPE.PASSWORD_RESET_EMAIL:
            mockNotification = {
              type: messageType,
              message: {
                userName: 'Test User',
                expiryTime: '2024-12-31T23:59:59Z',
                link: 'https://example.com/verify?token=123',
              },
            };
            break;
          case MESSAGE_TYPE.EVENT_APPROVED_NOTIFICATION:
            mockNotification = createMockEventApprovedNotification();
            break;
          case MESSAGE_TYPE.BOOKING_CONFIRMED_NOTIFICATION:
            mockNotification = createMockBookingConfirmedNotification();
            break;
          case MESSAGE_TYPE.WELCOME_EMAIL:
            mockNotification = createMockWelcomeEmail();
            break;
          default:
            mockNotification = {
              type: messageType,
              message: {
                eventName: 'Test Event',
                recipientName: 'Test User',
                updatedFields: ['Test field'],
                reason: 'Test reason',
                reminderType: '1_HOUR',
              },
            };
        }

        expect(() => {
          emailTemplateService.generateEmailContent(mockNotification);
        }).not.toThrow();
      });
    });

    it('should throw error for unsupported message type', () => {
      const unsupportedNotification = {
        type: 'UNSUPPORTED_TYPE',
        recipientEmail: 'test@example.com',
      };

      expect(() => {
        emailTemplateService.generateEmailContent(unsupportedNotification);
      }).toThrow('Unsupported notification type: UNSUPPORTED_TYPE');
    });

    it('should use correct app name and base URL from environment', () => {
      const mockNotification = createMockEventApprovedNotification();
      setupSuccessfulTemplateGeneration();

      const result = emailTemplateService.generateEmailContent(mockNotification);

      expect(result.body).toContain(process.env.APP_NAME || 'Event Management System');
    });

    it('should handle missing environment variables gracefully', () => {
      const originalAppName = process.env.APP_NAME;
      const originalBaseUrl = process.env.CLIENT_URL;

      delete process.env.APP_NAME;
      delete process.env.CLIENT_URL;

      const newEmailTemplateService = new EmailTemplateService();
      const mockNotification = createMockEventApprovedNotification();
      setupSuccessfulTemplateGeneration();

      const result = newEmailTemplateService.generateEmailContent(mockNotification);

      expect(result).toBeDefined();
      expect(result.body).toContain('Event Management System'); // Default app name

      // Restore original values
      if (originalAppName) process.env.APP_NAME = originalAppName;
      if (originalBaseUrl) process.env.CLIENT_URL = originalBaseUrl;
    });
  });

  describe('specific email template methods', () => {
    it('should generate event cancelled email with correct information', () => {
      const mockNotification = createMockEventCancelledNotification();

      setupSuccessfulTemplateGeneration();

      const result = emailTemplateService.generateEmailContent(mockNotification);

      expect(result.subject).toContain('Event Cancelled');
      expect(result.body).toContain('Cancelled Event');
      expect(result.body).toContain('Due to unforeseen circumstances');
    });

    it('should generate event updated email with change details', () => {
      const mockNotification = createMockEventUpdatedNotification();

      setupSuccessfulTemplateGeneration();

      const result = emailTemplateService.generateEmailContent(mockNotification);

      expect(result.subject).toContain('Event Updated');
      expect(result.body).toContain('Updated Event');
      expect(result.body).toContain('Date changed');
      expect(result.body).toContain('Venue updated');
    });

    it('should generate event reminder email with event details', () => {
      const mockNotification = createMockEventReminderNotification();

      setupSuccessfulTemplateGeneration();

      const result = emailTemplateService.generateEmailContent(mockNotification);

      expect(result.subject).toContain('Event Reminder');
      expect(result.body).toContain('Upcoming Event');
      expect(result.body).toContain('Main Hall');
    });
  });

  describe('HTML content validation', () => {
    it('should generate valid HTML content', () => {
      const mockNotification = createMockEventApprovedNotification();
      setupSuccessfulTemplateGeneration();

      const result = emailTemplateService.generateEmailContent(mockNotification);

      expect(result.body).toMatch(/<html>/i);
      expect(result.body).toMatch(/<body>/i);
      expect(result.body).toMatch(/<\/body>/i);
      expect(result.body).toMatch(/<\/html>/i);
    });

    it('should include proper email styling', () => {
      const mockNotification = createMockBookingConfirmedNotification();
      setupSuccessfulTemplateGeneration();

      const result = emailTemplateService.generateEmailContent(mockNotification);

      expect(result.body).toContain('<style>');
      expect(result.body).toContain('font-family');
      expect(result.body).toContain('color');
    });

    it('should include clickable links where appropriate', () => {
      const mockNotification = createMockWelcomeEmail({
        message: {
          userName: 'Test User',
          userRole: 'USER',
          dashboardLink: 'https://example.com/verify?token=xyz789',
        }
      });
      setupSuccessfulTemplateGeneration();

      const result = emailTemplateService.generateEmailContent(mockNotification);

      expect(result.body).toContain('<a href=');
      expect(result.body).toContain('https://example.com/verify?token=xyz789');
    });
  });

  describe('basic functionality', () => {
    it('should be able to instantiate EmailTemplateService', () => {
      expect(emailTemplateService).toBeInstanceOf(EmailTemplateService);
    });

    it('should have required methods', () => {
      expect(typeof emailTemplateService.generateEmailContent).toBe('function');
    });
  });
});
