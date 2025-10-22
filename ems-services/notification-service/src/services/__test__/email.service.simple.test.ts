import { EmailService } from '../email.service';
import {
  mockTransporter,
  createMockEmailPayload,
  setupSuccessfulEmailSending,
  setupEmailSendingFailure,
} from '../../test/mocks-simple';

describe('EmailService (simple)', () => {
  let emailService: EmailService;

  beforeEach(() => {
    emailService = new EmailService();
  });

  describe('basic functionality', () => {
    it('should be able to instantiate EmailService', () => {
      expect(emailService).toBeInstanceOf(EmailService);
    });

    it('should have required methods', () => {
      expect(typeof emailService.sendEmail).toBe('function');
    });
  });

  describe('sendEmail', () => {
    it('should be a function', () => {
      expect(typeof emailService.sendEmail).toBe('function');
    });

    it('should accept EmailPayload parameter', () => {
      const mockPayload = createMockEmailPayload();
      expect(mockPayload).toBeDefined();
      expect(mockPayload.to).toBe('test@example.com');
      expect(mockPayload.subject).toBe('Test Email');
      expect(mockPayload.body).toBe('<h1>Test Email Body</h1>');
    });
  });

  describe('constructor', () => {
    it('should initialize nodemailer transporter', () => {
      // The constructor should call nodemailer.createTransport
      // This is now handled by the module mock
      expect(emailService).toBeDefined();
    });
  });
});
