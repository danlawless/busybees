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

/**
 * Send gift card to recipient
 */
export async function sendGiftCardEmail(data: {
  to: string;
  giftCard: {
    code: string;
    amount: number;
    recipientName: string;
    purchaserName: string;
    personalMessage?: string;
  };
}): Promise<EmailResult> {
  const { giftCard } = data;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://busybeesipc.com';

  const subject = `🎁 You've received a $${giftCard.amount.toFixed(2)} Busy Bees Gift Card!`;

  // Create a beautiful text email with the gift card details
  const text = `
═══════════════════════════════════════════════════════════
🎁 You've Received a Gift Card from Busy Bees! 🐝
═══════════════════════════════════════════════════════════

Hi ${giftCard.recipientName}!

${giftCard.purchaserName} sent you a Busy Bees Indoor Play Center gift card!

╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   GIFT CARD VALUE: $${giftCard.amount.toFixed(2).padStart(6, ' ')}                              ║
║                                                          ║
║   REDEMPTION CODE: ${giftCard.code}                     ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝

${giftCard.personalMessage ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Personal Message from ${giftCard.purchaserName}:

"${giftCard.personalMessage}"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
` : ''}

HOW TO REDEEM:
─────────────────────────────────────────────────────────────
1. Visit ${siteUrl}/gift-cards
2. Click "Redeem Gift Card"
3. Log in or create an account
4. Enter your code: ${giftCard.code}
5. Your credit will be added instantly!
─────────────────────────────────────────────────────────────

WHAT CAN I USE IT FOR?
• Day passes for open play
• Weekly or monthly memberships
• Birthday party bookings
• Snacks and merchandise

This gift card never expires. Valid for all purchases at
Busy Bees Indoor Play Center.

───────────────────────────────────────────────────────────
Busy Bees Indoor Play Center
📍 Visit us for a day of fun and play!
🌐 ${siteUrl}
───────────────────────────────────────────────────────────
`;

  return sendEmail({
    to: data.to,
    subject,
    text,
  });
}

/**
 * Send test/preview gift card email
 */
export async function sendTestGiftCardEmail(data: {
  to: string;
  amount: number;
  recipientName: string;
  purchaserName: string;
  personalMessage?: string;
}): Promise<EmailResult> {
  return sendGiftCardEmail({
    to: data.to,
    giftCard: {
      code: 'BBGC-TEST-XXXX-XXXX',
      amount: data.amount,
      recipientName: data.recipientName,
      purchaserName: data.purchaserName,
      personalMessage: data.personalMessage,
    },
  });
}

/**
 * Send welcome email to new customer after POS signup
 */
export async function sendWelcomeEmail(data: {
  to: string;
  name: string;
  phone: string;
}): Promise<EmailResult> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://busybeesipc.com';

  const subject = '🐝 Welcome to Busy Bees Indoor Play Center!';

  const text = `
═══════════════════════════════════════════════════════════
🐝 Welcome to the Busy Bees Family! 🐝
═══════════════════════════════════════════════════════════

Hi ${data.name}!

Thank you for creating an account with Busy Bees Indoor Play Center!
We're so excited to have you join our hive of happy families.

YOUR ACCOUNT DETAILS:
─────────────────────────────────────────────────────────────
Email: ${data.to}
Phone: ${data.phone}
─────────────────────────────────────────────────────────────

WHAT'S NEXT?
• Add your children to your account at the play center
• Purchase day passes, punch cards, or memberships
• Sign waivers for your little ones
• Book a birthday party!

ACCESS YOUR ACCOUNT ONLINE:
─────────────────────────────────────────────────────────────
Visit ${siteUrl}/customer/login to:
• View your passes and purchase history
• Manage your children's profiles
• Book birthday parties
• Purchase gift cards

Set up your web password at:
${siteUrl}/customer/set-password
─────────────────────────────────────────────────────────────

QUICK TIP: When you visit Busy Bees, just enter your phone
number at our check-in kiosk to access your account!

We can't wait to see you and your little ones buzz around
our play center soon! 🐝✨

───────────────────────────────────────────────────────────
Busy Bees Indoor Play Center
📍 Come play with us!
🌐 ${siteUrl}
📧 ${BUSINESS_EMAIL}
───────────────────────────────────────────────────────────
`;

  return sendEmail({
    to: data.to,
    subject,
    text,
  });
}

/**
 * Send purchase confirmation email
 */
export async function sendPurchaseConfirmationEmail(data: {
  to: string;
  customerName: string;
  purchaseName: string;
  purchasePrice: number;
  purchaseType: string;
  expiryDate?: string;
}): Promise<EmailResult> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://busybeesipc.com';

  const subject = `🐝 Purchase Confirmed - ${data.purchaseName}`;

  const expiryInfo = data.expiryDate
    ? `Valid Until: ${new Date(data.expiryDate).toLocaleDateString()}`
    : 'No Expiration';

  const text = `
═══════════════════════════════════════════════════════════
🐝 Thank You for Your Purchase! 🐝
═══════════════════════════════════════════════════════════

Hi ${data.customerName}!

Your purchase has been confirmed. Here are your details:

╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   ${data.purchaseName.padEnd(48, ' ')}║
║   Amount: $${data.purchasePrice.toFixed(2).padEnd(42, ' ')}║
║   ${expiryInfo.padEnd(48, ' ')}║
║                                                          ║
╚══════════════════════════════════════════════════════════╝

HOW TO USE YOUR PASS:
─────────────────────────────────────────────────────────────
1. Visit Busy Bees Indoor Play Center
2. Enter your phone number at the check-in kiosk
3. Select your pass and check in your children
4. Enjoy your play time!
─────────────────────────────────────────────────────────────

View your purchases anytime at:
${siteUrl}/customer/purchases

Thanks for being part of the Busy Bees family! 🐝

───────────────────────────────────────────────────────────
Busy Bees Indoor Play Center
🌐 ${siteUrl}
───────────────────────────────────────────────────────────
`;

  return sendEmail({
    to: data.to,
    subject,
    text,
  });
}
