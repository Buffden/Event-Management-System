import {
    EmailNotification,
    EventApprovedNotification,
    EventCancelledNotification,
    EventUpdatedNotification,
    EventPublishedNotification,
    BookingConfirmedNotification,
    BookingCancelledNotification,
    TicketGeneratedNotification,
    EventReminderNotification,
    WelcomeEmail,
    MESSAGE_TYPE
} from '../types/types';

class EmailTemplateService {
    private readonly appName: string;
    private readonly baseUrl: string;

    constructor() {
        this.appName = process.env.APP_NAME || 'Event Management System';
        this.baseUrl = process.env.CLIENT_URL || 'http://localhost';
    }

    /**
     * Generate email content based on notification type
     */
    generateEmailContent(notification: any): { subject: string; body: string } {
        switch (notification.type) {
            case MESSAGE_TYPE.ACCOUNT_VERIFICATION_EMAIL:
            case MESSAGE_TYPE.PASSWORD_RESET_EMAIL:
                return this.generateEmailNotification(notification);
            case MESSAGE_TYPE.EVENT_APPROVED_NOTIFICATION:
                return this.generateEventApprovedEmail(notification);
            case MESSAGE_TYPE.EVENT_CANCELLED_NOTIFICATION:
                return this.generateEventCancelledEmail(notification);
            case MESSAGE_TYPE.EVENT_UPDATED_NOTIFICATION:
                return this.generateEventUpdatedEmail(notification);
            case MESSAGE_TYPE.EVENT_PUBLISHED_NOTIFICATION:
                return this.generateEventPublishedEmail(notification);
            case MESSAGE_TYPE.BOOKING_CONFIRMED_NOTIFICATION:
                return this.generateBookingConfirmedEmail(notification);
            case MESSAGE_TYPE.BOOKING_CANCELLED_NOTIFICATION:
                return this.generateBookingCancelledEmail(notification);
            case MESSAGE_TYPE.TICKET_GENERATED_NOTIFICATION:
                return this.generateTicketGeneratedEmail(notification);
            case MESSAGE_TYPE.EVENT_REMINDER_NOTIFICATION:
                return this.generateEventReminderEmail(notification);
            case MESSAGE_TYPE.WELCOME_EMAIL:
                return this.generateWelcomeEmail(notification);
            default:
                throw new Error(`Unsupported notification type: ${notification.type}`);
        }
    }

    private generateEmailNotification(notification: EmailNotification) {
        const { message, type } = notification;

        const isPasswordReset = type === MESSAGE_TYPE.PASSWORD_RESET_EMAIL;
        const title = isPasswordReset ? '🔐 Password Reset' : 'Welcome to ' + this.appName + '!';
        const headerColor = isPasswordReset ? 'linear-gradient(135deg, #607D8B 0%, #455A64 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        const buttonColor = isPasswordReset ? '#607D8B' : '#667eea';
        const buttonText = isPasswordReset ? 'Reset My Password' : 'Verify My Email';

        const mainText = isPasswordReset
            ? `We received a request to reset your password for your ${this.appName} account.`
            : `Thank you for registering with ${this.appName}. To complete your registration and start using our platform, please verify your email address by clicking the button below:`;

        const secondaryText = isPasswordReset
            ? `Click the button below to reset your password:`
            : '';

        const expiryText = isPasswordReset
            ? `This password reset link will expire at ${message.expiryTime} for security reasons.`
            : `This verification link will expire at ${message.expiryTime} for security reasons.`;

        const footerText = isPasswordReset
            ? `If you didn't request a password reset, please ignore this email. Your password will remain unchanged.`
            : `If you didn't create an account with us, please ignore this email.`;

        return {
            subject: message.subject,
            body: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>${isPasswordReset ? 'Password Reset' : 'Email Verification'}</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: ${headerColor}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                        .button { display: inline-block; background: ${buttonColor}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>${title}</h1>
                        </div>
                        <div class="content">
                            <h2>Hello ${message.userName}!</h2>
                            <p>${mainText}</p>
                            ${secondaryText ? `<p>${secondaryText}</p>` : ''}
                            <div style="text-align: center;">
                                <a href="${message.link}" class="button">${buttonText}</a>
                            </div>
                            <p><strong>Important:</strong> ${expiryText}</p>
                            <p>${footerText}</p>
                        </div>
                        <div class="footer">
                            <p>© 2024 ${this.appName}. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };
    }

    private generateEventApprovedEmail(notification: EventApprovedNotification) {
        const { message } = notification;
        return {
            subject: `${this.appName} - Your Event Has Been Approved!`,
            body: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Event Approved</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                        .event-details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #4CAF50; }
                        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🎉 Event Approved!</h1>
                        </div>
                        <div class="content">
                            <h2>Congratulations ${message.speakerName}!</h2>
                            <p>Great news! Your event "<strong>${message.eventName}</strong>" has been approved and is now live on our platform.</p>

                            <div class="event-details">
                                <h3>Event Details:</h3>
                                <ul>
                                    <li><strong>Event Name:</strong> ${message.eventName}</li>
                                    <li><strong>Description:</strong> ${message.eventDescription}</li>
                                    <li><strong>Venue:</strong> ${message.venueName}</li>
                                    <li><strong>Booking Period:</strong> ${new Date(message.bookingStartDate).toLocaleDateString()} to ${new Date(message.bookingEndDate).toLocaleDateString()}</li>
                                </ul>
                            </div>

                            <p>Your event is now visible to attendees and they can start registering. You can manage your event from your speaker dashboard.</p>
                            <p>Thank you for using ${this.appName}!</p>
                        </div>
                        <div class="footer">
                            <p>© 2024 ${this.appName}. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };
    }

    private generateEventCancelledEmail(notification: EventCancelledNotification) {
        const { message } = notification;
        return {
            subject: `${this.appName} - Event Cancelled: ${message.eventName}`,
            body: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Event Cancelled</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                        .event-details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f44336; }
                        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>⚠️ Event Cancelled</h1>
                        </div>
                        <div class="content">
                            <h2>Hello ${message.attendeeName},</h2>
                            <p>We regret to inform you that the event you registered for has been cancelled.</p>

                            <div class="event-details">
                                <h3>Cancelled Event Details:</h3>
                                <ul>
                                    <li><strong>Event Name:</strong> ${message.eventName}</li>
                                    <li><strong>Event Date:</strong> ${new Date(message.eventDate).toLocaleDateString()}</li>
                                    <li><strong>Venue:</strong> ${message.venueName}</li>
                                    ${message.cancellationReason ? `<li><strong>Reason:</strong> ${message.cancellationReason}</li>` : ''}
                                </ul>
                            </div>

                            <p>We apologize for any inconvenience this may cause. If you have any questions or concerns, please don't hesitate to contact our support team.</p>
                            <p>Thank you for your understanding.</p>
                        </div>
                        <div class="footer">
                            <p>© 2024 ${this.appName}. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };
    }

    private generateEventUpdatedEmail(notification: EventUpdatedNotification) {
        const { message } = notification;
        return {
            subject: `${this.appName} - Event Updated: ${message.eventName}`,
            body: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Event Updated</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                        .event-details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #2196F3; }
                        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>📝 Event Updated</h1>
                        </div>
                        <div class="content">
                            <h2>Hello ${message.attendeeName},</h2>
                            <p>The event you registered for has been updated. Here are the details:</p>

                            <div class="event-details">
                                <h3>Event Details:</h3>
                                <ul>
                                    <li><strong>Event Name:</strong> ${message.eventName}</li>
                                    <li><strong>Event Date:</strong> ${new Date(message.eventDate).toLocaleDateString()}</li>
                                    <li><strong>Venue:</strong> ${message.venueName}</li>
                                    <li><strong>Updated Fields:</strong> ${message.updatedFields.join(', ')}</li>
                                </ul>
                            </div>

                            <p>Please review the updated information. If you have any questions or if the changes affect your ability to attend, please contact us.</p>
                        </div>
                        <div class="footer">
                            <p>© 2024 ${this.appName}. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };
    }

    private generateEventPublishedEmail(notification: EventPublishedNotification) {
        const { message } = notification;
        return {
            subject: `${this.appName} - New Event Available: ${message.eventName}`,
            body: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>New Event Published</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                        .event-details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #9C27B0; }
                        .button { display: inline-block; background: #9C27B0; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🎉 New Event Available!</h1>
                        </div>
                        <div class="content">
                            <h2>Hello ${message.attendeeName},</h2>
                            <p>A new event has been published and is now available for registration!</p>

                            <div class="event-details">
                                <h3>Event Details:</h3>
                                <ul>
                                    <li><strong>Event Name:</strong> ${message.eventName}</li>
                                    <li><strong>Description:</strong> ${message.eventDescription}</li>
                                    <li><strong>Event Date:</strong> ${new Date(message.eventDate).toLocaleDateString()}</li>
                                    <li><strong>Venue:</strong> ${message.venueName}</li>
                                    <li><strong>Registration Period:</strong> ${new Date(message.bookingStartDate).toLocaleDateString()} to ${new Date(message.bookingEndDate).toLocaleDateString()}</li>
                                </ul>
                            </div>

                            <div style="text-align: center;">
                                <a href="${this.baseUrl}/dashboard/attendee/events" class="button">View All Events</a>
                            </div>

                            <p>Don't miss out on this exciting event! Register now to secure your spot.</p>
                        </div>
                        <div class="footer">
                            <p>© 2024 ${this.appName}. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };
    }

    private generateBookingConfirmedEmail(notification: BookingConfirmedNotification) {
        const { message } = notification;
        return {
            subject: `${this.appName} - Booking Confirmed: ${message.eventName}`,
            body: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Booking Confirmed</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                        .event-details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #4CAF50; }
                        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>✅ Booking Confirmed!</h1>
                        </div>
                        <div class="content">
                            <h2>Hello ${message.attendeeName},</h2>
                            <p>Your booking has been successfully confirmed! We're excited to see you at the event.</p>

                            <div class="event-details">
                                <h3>Booking Details:</h3>
                                <ul>
                                    <li><strong>Event Name:</strong> ${message.eventName}</li>
                                    <li><strong>Event Date:</strong> ${new Date(message.eventDate).toLocaleDateString()}</li>
                                    <li><strong>Venue:</strong> ${message.venueName}</li>
                                    <li><strong>Booking ID:</strong> ${message.bookingId}</li>
                                </ul>
                            </div>

                            <p>Please keep this email as confirmation of your registration. We'll send you a reminder closer to the event date.</p>
                            <p>If you need to make any changes or have questions, please contact our support team.</p>
                        </div>
                        <div class="footer">
                            <p>© 2024 ${this.appName}. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };
    }

    private generateBookingCancelledEmail(notification: BookingCancelledNotification) {
        const { message } = notification;
        return {
            subject: `${this.appName} - Booking Cancelled: ${message.eventName}`,
            body: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Booking Cancelled</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                        .event-details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f44336; }
                        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>❌ Booking Cancelled</h1>
                        </div>
                        <div class="content">
                            <h2>Hello ${message.attendeeName},</h2>
                            <p>Your booking has been cancelled as requested.</p>

                            <div class="event-details">
                                <h3>Cancelled Booking Details:</h3>
                                <ul>
                                    <li><strong>Event Name:</strong> ${message.eventName}</li>
                                    <li><strong>Event Date:</strong> ${new Date(message.eventDate).toLocaleDateString()}</li>
                                    <li><strong>Venue:</strong> ${message.venueName}</li>
                                    <li><strong>Booking ID:</strong> ${message.bookingId}</li>
                                    ${message.cancellationReason ? `<li><strong>Reason:</strong> ${message.cancellationReason}</li>` : ''}
                                </ul>
                            </div>

                            <p>We're sorry to see you go! If you change your mind, you can always register for this or other events in the future.</p>
                        </div>
                        <div class="footer">
                            <p>© 2024 ${this.appName}. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };
    }

    private generateTicketGeneratedEmail(notification: TicketGeneratedNotification) {
        const { message } = notification;
        const expiresAtDate = new Date(message.expiresAt);
        const expiresAtFormatted = expiresAtDate.toLocaleString();

        return {
            subject: `${this.appName} - Your Ticket: ${message.eventName}`,
            body: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Your Event Ticket</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                        .ticket-section { background: white; padding: 25px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #667eea; }
                        .qr-code { text-align: center; margin: 20px 0; }
                        .qr-code img { max-width: 200px; border: 2px solid #ddd; border-radius: 5px; padding: 10px; background: white; }
                        .ticket-info { background: #f0f0f0; padding: 15px; border-radius: 5px; margin: 15px 0; }
                        .ticket-info-item { margin: 10px 0; }
                        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
                        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🎫 Your Event Ticket</h1>
                        </div>
                        <div class="content">
                            <h2>Hello ${message.attendeeName},</h2>
                            <p>Your ticket has been generated! Here's everything you need for the event.</p>

                            <div class="ticket-section">
                                <h3>Event Details:</h3>
                                <div class="ticket-info">
                                    <div class="ticket-info-item"><strong>Event Name:</strong> ${message.eventName}</div>
                                    <div class="ticket-info-item"><strong>Event Date:</strong> ${new Date(message.eventDate).toLocaleDateString()}</div>
                                    <div class="ticket-info-item"><strong>Venue:</strong> ${message.venueName}</div>
                                    <div class="ticket-info-item"><strong>Ticket ID:</strong> ${message.ticketId}</div>
                                    <div class="ticket-info-item"><strong>Booking ID:</strong> ${message.bookingId}</div>
                                    <div class="ticket-info-item"><strong>Ticket Expires:</strong> ${expiresAtFormatted}</div>
                                </div>
                            </div>

                            ${message.qrCodeData ? `
                            <div class="ticket-section">
                                <h3>Your QR Code:</h3>
                                <div class="qr-code">
                                    <img src="data:image/png;base64,${message.qrCodeData}" alt="QR Code" />
                                </div>
                                <p style="text-align: center; font-size: 14px; color: #666;">
                                    Present this QR code at the event entrance for entry.
                                </p>
                            </div>
                            ` : `
                            <div class="ticket-section">
                                <h3>QR Code:</h3>
                                <p style="text-align: center; color: #666;">
                                    QR code will be available when you view your ticket online.
                                </p>
                            </div>
                            `}

                            <div class="warning">
                                <strong>⚠️ Important:</strong>
                                <ul style="margin: 10px 0; padding-left: 20px;">
                                    <li>Please arrive at least 15 minutes before the event starts</li>
                                    <li>Keep this ticket safe - you'll need it to enter the event</li>
                                    <li>The QR code will expire 2 hours after the event ends</li>
                                    <li>Make sure your device has sufficient battery to display the QR code</li>
                                </ul>
                            </div>

                            ${message.ticketDownloadUrl ? `
                            <div style="text-align: center;">
                                <a href="${message.ticketDownloadUrl}" class="button">View Ticket Online</a>
                            </div>
                            ` : ''}

                            <p>If you have any questions or need assistance, please contact our support team.</p>
                            <p>We look forward to seeing you at the event!</p>
                        </div>
                        <div class="footer">
                            <p>© 2024 ${this.appName}. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };
    }

    private generateEventReminderEmail(notification: EventReminderNotification) {
        const { message } = notification;
        const reminderText = {
            '24_HOURS': '24 hours',
            '1_HOUR': '1 hour',
            '30_MINUTES': '30 minutes'
        }[message.reminderType];

        return {
            subject: `${this.appName} - Event Reminder: ${message.eventName} (${reminderText} away)`,
            body: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Event Reminder</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                        .event-details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #FF9800; }
                        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>⏰ Event Reminder</h1>
                        </div>
                        <div class="content">
                            <h2>Hello ${message.attendeeName},</h2>
                            <p>This is a friendly reminder that your event is coming up in <strong>${reminderText}</strong>!</p>

                            <div class="event-details">
                                <h3>Event Details:</h3>
                                <ul>
                                    <li><strong>Event Name:</strong> ${message.eventName}</li>
                                    <li><strong>Event Date:</strong> ${new Date(message.eventDate).toLocaleDateString()}</li>
                                    <li><strong>Venue:</strong> ${message.venueName}</li>
                                </ul>
                            </div>

                            <p>We're looking forward to seeing you there! Please arrive a few minutes early to check in.</p>
                            <p>If you can no longer attend, please cancel your booking as soon as possible.</p>
                        </div>
                        <div class="footer">
                            <p>© 2024 ${this.appName}. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };
    }


    private generateWelcomeEmail(notification: WelcomeEmail) {
        const { message } = notification;
        return {
            subject: `Welcome to ${this.appName}!`,
            body: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Welcome</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🎉 Welcome to ${this.appName}!</h1>
                        </div>
                        <div class="content">
                            <h2>Hello ${message.userName}!</h2>
                            <p>Welcome to ${this.appName}! We're excited to have you join our community.</p>

                            <p>Your account has been created with the role: <strong>${message.userRole}</strong></p>

                            <div style="text-align: center;">
                                <a href="${message.dashboardLink}" class="button">Go to Dashboard</a>
                            </div>

                            <p>Here's what you can do next:</p>
                            <ul>
                                ${message.userRole === 'SPEAKER' ? '<li>Create and manage your events</li>' : ''}
                                ${message.userRole === 'USER' ? '<li>Browse and register for events</li>' : ''}
                                <li>Update your profile information</li>
                                <li>Explore our platform features</li>
                            </ul>

                            <p>If you have any questions, feel free to contact our support team.</p>
                        </div>
                        <div class="footer">
                            <p>© 2024 ${this.appName}. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };
    }
}

export { EmailTemplateService };
export const emailTemplateService = new EmailTemplateService();
