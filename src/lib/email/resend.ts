/**
 * Resend Email Service
 * Handles email sending for contact forms, newsletters, and party bookings
 */

import { Resend } from 'resend';
import * as Sentry from '@sentry/nextjs';
import { logger } from '@/lib/logger';

// Business email addresses
const BUSINESS_EMAIL = 'info@busybeesipc.com';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@busybeesipc.com';

// Lazy-initialize Resend client to prevent crashes when API key is missing
let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an email using Resend
 */
export async function sendEmail(options: SendEmailOptions): Promise<EmailResult> {
  const { to, subject, text, replyTo } = options;

  // Get lazy-initialized client (returns null if API key is missing)
  const resend = getResendClient();

  // Check if API key is configured
  if (!resend) {
    logger.warn(
      { to, subject },
      'RESEND_API_KEY not configured - email not sent'
    );
    // Return success in development to allow form testing
    if (process.env.NODE_ENV === 'development') {
      logger.info({ to, subject, text }, '📧 Development mode - email would be sent');
      return { success: true, messageId: 'dev-mode' };
    }
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      text,
      replyTo,
    });

    if (error) {
      logger.error(
        { error, to, subject },
        'Failed to send email via Resend'
      );
      Sentry.captureMessage('Email send failed', {
        level: 'error',
        extra: { to, subject, error: error.message },
      });
      return { success: false, error: error.message };
    }

    logger.info(
      { messageId: data?.id, to, subject },
      '📧 Email sent successfully'
    );

    return { success: true, messageId: data?.id };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(
      { error, to, subject },
      'Exception while sending email'
    );
    Sentry.captureException(error, {
      tags: { service: 'email', action: 'send' },
      extra: { to, subject },
    });
    return { success: false, error: errorMessage };
  }
}

/**
 * Send contact form submission to business email
 */
export async function sendContactFormEmail(data: {
  name: string;
  email: string;
  phone?: string;
  userType: string;
  message: string;
}): Promise<EmailResult> {
  const subject = `New Contact Form Submission - ${data.userType}`;
  const text = `
New contact form submission from Busy Bees website:

Name: ${data.name}
Email: ${data.email}
Phone: ${data.phone || 'Not provided'}
Inquiry Type: ${data.userType}

Message:
${data.message}

---
Sent from Busy Bees Indoor Play Center website
Submitted at: ${new Date().toLocaleString()}
`;

  return sendEmail({
    to: BUSINESS_EMAIL,
    subject,
    text,
    replyTo: data.email,
  });
}

/**
 * Send newsletter signup notification to business email
 */
export async function sendNewsletterSignupEmail(data: {
  name: string;
  email: string;
}): Promise<EmailResult> {
  const subject = 'New Newsletter Signup - Busy Bees';
  const text = `
New newsletter signup from Busy Bees website:

Name: ${data.name}
Email: ${data.email}

---
Please add this contact to the Busy Bees newsletter list.
Signed up at: ${new Date().toLocaleString()}
`;

  return sendEmail({
    to: BUSINESS_EMAIL,
    subject,
    text,
    replyTo: data.email,
  });
}

/**
 * Send party booking request to business email
 */
export async function sendPartyBookingEmail(data: {
  contactName: string;
  email: string;
  phone: string;
  childName: string;
  childAge: number;
  selectedDate: string;
  selectedTimeSlot: string;
  partyPackage: string;
  guestCount: number;
  additionalInfo?: string;
  dietaryRestrictions?: string;
}): Promise<EmailResult> {
  const subject = `New Party Booking Request - ${data.childName}'s Birthday`;
  const text = `
New party booking request from Busy Bees website:

PARTY DETAILS:
Child's Name: ${data.childName}
Child's Age: ${data.childAge}
Party Date: ${data.selectedDate}
Time Slot: ${data.selectedTimeSlot}
Package: ${data.partyPackage}
Number of Guests: ${data.guestCount}

CONTACT INFORMATION:
Contact Name: ${data.contactName}
Email: ${data.email}
Phone: ${data.phone}

ADDITIONAL INFORMATION:
${data.additionalInfo || 'None provided'}

DIETARY RESTRICTIONS:
${data.dietaryRestrictions || 'None provided'}

---
Please follow up with party booking confirmation and payment details.
Submitted at: ${new Date().toLocaleString()}
`;

  return sendEmail({
    to: BUSINESS_EMAIL,
    subject,
    text,
    replyTo: data.email,
  });
}
