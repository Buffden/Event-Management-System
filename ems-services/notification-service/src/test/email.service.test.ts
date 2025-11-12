/**
 * Comprehensive Test Suite for Email Service
 *
 * Tests all email sending functionality including:
 * - Successful email sending
 * - Error handling
 * - Email payload validation
 */

import { describe, it, beforeEach, afterEach, expect, jest } from '@jest/globals';
import {
  mockTransporter,
  createMockEmailPayload,
  setupSuccessfulEmailSending,
  setupEmailSendingFailure,
  resetAllMocks,
} from './mocks-simple';

// Mock nodemailer before importing the service
const mockCreateTransport = jest.fn(() => mockTransporter);
jest.mock('nodemailer', () => ({
  createTransport: (config: any) => mockCreateTransport(config),
  default: {
    createTransport: (config: any) => mockCreateTransport(config),
  },
}));

import { EmailService } from '../services/email.service';

describe('EmailService', () => {
  let emailService: EmailService;

  beforeEach(() => {
    resetAllMocks();
    // Ensure transporter is properly mocked
    mockCreateTransport.mockReturnValue(mockTransporter);
    emailService = new EmailService();
  });

  afterEach(() => {
    resetAllMocks();
  });

  describe('constructor()', () => {
    it('should create EmailService with transporter', () => {
      expect(emailService).toBeDefined();
      expect(mockCreateTransport).toHaveBeenCalled();
    });

    it('should use environment variables for transporter configuration', () => {
      expect(mockCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          host: process.env.GMAIL_HOST,
          port: Number(process.env.GMAIL_PORT) || 465,
          secure: true,
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASS,
          },
        })
      );
    });
  });

  describe('sendEmail()', () => {
    it('should send email successfully', async () => {
      setupSuccessfulEmailSending();
      const payload = createMockEmailPayload();

      await emailService.sendEmail(payload);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: `YourApp <${process.env.GMAIL_USER}>`,
        to: payload.to,
        subject: payload.subject,
        html: payload.body,
      });
    });

    it('should send email with correct from address', async () => {
      setupSuccessfulEmailSending();
      const payload = createMockEmailPayload({
        to: 'recipient@example.com',
      });

      await emailService.sendEmail(payload);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: `YourApp <${process.env.GMAIL_USER}>`,
        })
      );
    });

    it('should send email with correct recipient', async () => {
      setupSuccessfulEmailSending();
      const payload = createMockEmailPayload({
        to: 'test-recipient@example.com',
      });

      await emailService.sendEmail(payload);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test-recipient@example.com',
        })
      );
    });

    it('should send email with correct subject', async () => {
      setupSuccessfulEmailSending();
      const payload = createMockEmailPayload({
        subject: 'Test Subject Line',
      });

      await emailService.sendEmail(payload);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Test Subject Line',
        })
      );
    });

    it('should send email with HTML body', async () => {
      setupSuccessfulEmailSending();
      const htmlBody = '<h1>Test Email</h1><p>This is a test email body.</p>';
      const payload = createMockEmailPayload({
        body: htmlBody,
      });

      await emailService.sendEmail(payload);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: htmlBody,
        })
      );
    });

    it('should handle email sending failure', async () => {
      setupEmailSendingFailure();
      const payload = createMockEmailPayload();

      await expect(emailService.sendEmail(payload)).rejects.toThrow();

      expect(mockTransporter.sendMail).toHaveBeenCalled();
    });

    it('should throw error when transporter fails', async () => {
      const emailError = new Error('SMTP connection timeout');
      mockTransporter.sendMail.mockRejectedValue(emailError);
      const payload = createMockEmailPayload();

      await expect(emailService.sendEmail(payload)).rejects.toThrow('SMTP connection timeout');
    });

    it('should handle network errors during email sending', async () => {
      const networkError = new Error('Network error: ECONNREFUSED');
      mockTransporter.sendMail.mockRejectedValue(networkError);
      const payload = createMockEmailPayload();

      await expect(emailService.sendEmail(payload)).rejects.toThrow('Network error: ECONNREFUSED');
    });

    it('should handle invalid email address gracefully', async () => {
      setupEmailSendingFailure();
      const payload = createMockEmailPayload({
        to: 'invalid-email',
      });

      await expect(emailService.sendEmail(payload)).rejects.toThrow();
    });

    it('should send email with complex HTML content', async () => {
      setupSuccessfulEmailSending();
      const complexHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; }
            </style>
          </head>
          <body>
            <h1>Complex Email</h1>
            <p>This is a complex email with styles and structure.</p>
          </body>
        </html>
      `;
      const payload = createMockEmailPayload({
        body: complexHtml,
      });

      await emailService.sendEmail(payload);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: complexHtml,
        })
      );
    });
  });
});

