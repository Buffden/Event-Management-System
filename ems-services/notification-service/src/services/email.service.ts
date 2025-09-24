import nodemailer from 'nodemailer';
// Import the new payload type, NOT the whole notification type
import { EmailPayload } from '../types/types';

class EmailService {
    private transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.GMAIL_HOST,
            port: Number(process.env.GMAIL_PORT) || 465,
            secure: true,
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_PASS,
            },
        });
    }

    /**
     * Sends an email.
     * @param payload The email payload containing to, subject, and body.
     */
    // ✅ THE FIX IS HERE: Changed EmailNotification to EmailPayload
    public async sendEmail(payload: EmailPayload): Promise<void> {
        try {
            // Now, we directly use the properties of the payload
            const mailOptions = {
                from: `YourApp <${process.env.GMAIL_USER}>`, // Best practice to use an env var for the "from" address
                to: payload.to,
                subject: payload.subject,
                html: payload.body,
            };

            await this.transporter.sendMail(mailOptions);
            console.log(`📧 Email sent successfully to ${payload.to}`);
        } catch (error) {
            console.error(`❌ Failed to send email to ${payload.to}:`, error);
            throw error;
        }
    }
}

export const emailService = new EmailService();