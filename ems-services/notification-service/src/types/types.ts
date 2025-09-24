export enum MESSAGE_TYPE {
    EMAIL = 'EMAIL',
}

export interface EmailPayload {
    to: string;
    subject: string;
    body: string;
}

export interface Notification {
    type: MESSAGE_TYPE;
    message: unknown;
}

export interface EmailNotification extends Notification {
    type: MESSAGE_TYPE.EMAIL;
    message: EmailPayload; // Use the new type here
}

export type AnyNotification = EmailNotification;