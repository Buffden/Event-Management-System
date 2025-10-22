import { EmailTemplateService } from '../email-template.service';
import {
  createMockEmailNotification,
  createMockEventApprovedNotification,
  createMockBookingConfirmedNotification,
  createMockWelcomeEmail,
} from '../../test/mocks-simple';
import { MESSAGE_TYPE } from '../../types/types';

describe('EmailTemplateService (simple)', () => {
  let emailTemplateService: EmailTemplateService;

  beforeEach(() => {
    emailTemplateService = new EmailTemplateService();
  });

  describe('basic functionality', () => {
    it('should be able to instantiate EmailTemplateService', () => {
      expect(emailTemplateService).toBeInstanceOf(EmailTemplateService);
    });

    it('should have required methods', () => {
      expect(typeof emailTemplateService.generateEmailContent).toBe('function');
    });
  });

  describe('generateEmailContent', () => {
    it('should be a function', () => {
      expect(typeof emailTemplateService.generateEmailContent).toBe('function');
    });

    it('should handle ACCOUNT_VERIFICATION_EMAIL type', () => {
      const mockNotification = createMockEmailNotification({
        type: MESSAGE_TYPE.ACCOUNT_VERIFICATION_EMAIL,
      });

      const result = emailTemplateService.generateEmailContent(mockNotification);

      expect(result).toBeDefined();
      expect(result.subject).toBeDefined();
      expect(result.body).toBeDefined();
      expect(result.body).toContainHTML('<html>');
      expect(result.body).toContainHTML('<h1>');
    });

    it('should handle EVENT_APPROVED_NOTIFICATION type', () => {
      const mockNotification = createMockEventApprovedNotification();

      const result = emailTemplateService.generateEmailContent(mockNotification);

      expect(result).toBeDefined();
      expect(result.subject).toBeDefined();
      expect(result.body).toBeDefined();
      expect(result.body).toContainHTML('<html>');
      expect(result.body).toContainHTML('Event Approved');
    });

    it('should handle BOOKING_CONFIRMED_NOTIFICATION type', () => {
      const mockNotification = createMockBookingConfirmedNotification();

      const result = emailTemplateService.generateEmailContent(mockNotification);

      expect(result).toBeDefined();
      expect(result.subject).toBeDefined();
      expect(result.body).toBeDefined();
      expect(result.body).toContainHTML('<html>');
      expect(result.body).toContainHTML('Booking Confirmed');
    });

    it('should handle WELCOME_EMAIL type', () => {
      const mockNotification = createMockWelcomeEmail();

      const result = emailTemplateService.generateEmailContent(mockNotification);

      expect(result).toBeDefined();
      expect(result.subject).toBeDefined();
      expect(result.body).toBeDefined();
      expect(result.body).toContainHTML('<html>');
      expect(result.body).toContainHTML('Welcome');
    });

    it('should throw error for unsupported notification type', () => {
      const mockNotification = {
        type: 'UNSUPPORTED_TYPE',
        message: {},
      };

      expect(() => {
        emailTemplateService.generateEmailContent(mockNotification);
      }).toThrow('Unsupported notification type: UNSUPPORTED_TYPE');
    });
  });
});
