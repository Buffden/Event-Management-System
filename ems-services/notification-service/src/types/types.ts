export enum MESSAGE_TYPE {
    ACCOUNT_VERIFICATION_EMAIL = 'ACCOUNT_VERIFICATION_EMAIL',
    EVENT_APPROVED_NOTIFICATION = 'EVENT_APPROVED_NOTIFICATION',
    EVENT_CANCELLED_NOTIFICATION = 'EVENT_CANCELLED_NOTIFICATION',
    EVENT_UPDATED_NOTIFICATION = 'EVENT_UPDATED_NOTIFICATION',
    EVENT_PUBLISHED_NOTIFICATION = 'EVENT_PUBLISHED_NOTIFICATION',
    BOOKING_CONFIRMED_NOTIFICATION = 'BOOKING_CONFIRMED_NOTIFICATION',
    BOOKING_CANCELLED_NOTIFICATION = 'BOOKING_CANCELLED_NOTIFICATION',
    EVENT_REMINDER_NOTIFICATION = 'EVENT_REMINDER_NOTIFICATION',
    PASSWORD_RESET_EMAIL = 'PASSWORD_RESET_EMAIL',
    WELCOME_EMAIL = 'WELCOME_EMAIL',
}

// Base email payload interface
export interface EmailPayload {
    to: string;
    subject: string;
    body: string;
}

// Base notification interface
export interface Notification {
    type: MESSAGE_TYPE;
    message: unknown;
}

// Account Verification Email
export interface AccountVerificationEmail extends Notification {
    type: MESSAGE_TYPE.ACCOUNT_VERIFICATION_EMAIL;
    message: {
        to: string;
        subject: string;
        verificationLink: string;
        userName: string;
    };
}

// Event Approved Notification
export interface EventApprovedNotification extends Notification {
    type: MESSAGE_TYPE.EVENT_APPROVED_NOTIFICATION;
    message: {
        to: string;
        subject: string;
        body: string;
        speakerName: string;
        eventName: string;
        eventDescription: string;
        venueName: string;
        bookingStartDate: string;
        bookingEndDate: string;
        eventId: string;
    };
}

// Event Cancelled Notification
export interface EventCancelledNotification extends Notification {
    type: MESSAGE_TYPE.EVENT_CANCELLED_NOTIFICATION;
    message: {
        to: string;
        subject: string;
        body: string;
        attendeeName: string;
        eventName: string;
        eventDate: string;
        venueName: string;
        cancellationReason?: string;
        eventId: string;
    };
}

// Event Updated Notification
export interface EventUpdatedNotification extends Notification {
    type: MESSAGE_TYPE.EVENT_UPDATED_NOTIFICATION;
    message: {
        to: string;
        subject: string;
        body: string;
        attendeeName: string;
        eventName: string;
        updatedFields: string[];
        eventDate: string;
        venueName: string;
        eventId: string;
    };
}

// Event Published Notification
export interface EventPublishedNotification extends Notification {
    type: MESSAGE_TYPE.EVENT_PUBLISHED_NOTIFICATION;
    message: {
        to: string;
        subject: string;
        body: string;
        attendeeName: string;
        eventName: string;
        eventDescription: string;
        eventDate: string;
        venueName: string;
        bookingStartDate: string;
        bookingEndDate: string;
        eventId: string;
    };
}

// Booking Confirmed Notification
export interface BookingConfirmedNotification extends Notification {
    type: MESSAGE_TYPE.BOOKING_CONFIRMED_NOTIFICATION;
    message: {
        to: string;
        subject: string;
        body: string;
        attendeeName: string;
        eventName: string;
        eventDate: string;
        venueName: string;
        bookingId: string;
        eventId: string;
    };
}

// Booking Cancelled Notification
export interface BookingCancelledNotification extends Notification {
    type: MESSAGE_TYPE.BOOKING_CANCELLED_NOTIFICATION;
    message: {
        to: string;
        subject: string;
        body: string;
        attendeeName: string;
        eventName: string;
        eventDate: string;
        venueName: string;
        cancellationReason?: string;
        bookingId: string;
        eventId: string;
    };
}

// Event Reminder Notification
export interface EventReminderNotification extends Notification {
    type: MESSAGE_TYPE.EVENT_REMINDER_NOTIFICATION;
    message: {
        to: string;
        subject: string;
        body: string;
        attendeeName: string;
        eventName: string;
        eventDate: string;
        venueName: string;
        reminderType: '24_HOURS' | '1_HOUR' | '30_MINUTES';
        eventId: string;
    };
}

// Password Reset Email
export interface PasswordResetEmail extends Notification {
    type: MESSAGE_TYPE.PASSWORD_RESET_EMAIL;
    message: {
        to: string;
        subject: string;
        body: string;
        resetLink: string;
        userName: string;
        expiryTime: string;
    };
}

// Welcome Email
export interface WelcomeEmail extends Notification {
    type: MESSAGE_TYPE.WELCOME_EMAIL;
    message: {
        to: string;
        subject: string;
        body: string;
        userName: string;
        userRole: string;
        dashboardLink: string;
    };
}

// Union type for all notification types
export type AnyNotification =
    | AccountVerificationEmail
    | EventApprovedNotification
    | EventCancelledNotification
    | EventUpdatedNotification
    | EventPublishedNotification
    | BookingConfirmedNotification
    | BookingCancelledNotification
    | EventReminderNotification
    | PasswordResetEmail
    | WelcomeEmail;