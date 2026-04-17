/**
 * Resend Email Service
 * Handles email sending for contact forms, newsletters, and party bookings
 */

import { Resend } from 'resend';
import * as Sentry from '@sentry/nextjs';
import { logger } from '@/lib/logger';
import { parseDateString } from '@/lib/utils';

// Business email addresses
const BUSINESS_EMAIL = 'info@busybeesipc.com';
const DEFAULT_FROM_EMAIL = 'Busy Bees Indoor Play Center <noreply@busybeesipc.com>';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || DEFAULT_FROM_EMAIL;

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
  html?: string;
  cc?: string | string[];
  replyTo?: string;
  headers?: Record<string, string>;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Check if the email service (Resend) is properly configured
 */
export function isEmailServiceConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

/**
 * Send an email using Resend
 */
export async function sendEmail(options: SendEmailOptions): Promise<EmailResult> {
  const { to, subject, text, html, cc, replyTo, headers } = options;

  // Get lazy-initialized client (returns null if API key is missing)
  const resend = getResendClient();

  // Check if API key is configured
  if (!resend) {
    logger.warn(
      { to, subject },
      'RESEND_API_KEY not configured - email not sent'
    );
    if (process.env.NODE_ENV === 'development') {
      logger.info({ to, subject }, '📧 Development mode - email would be sent (RESEND_API_KEY not set)');
    }
    return { success: false, error: 'Email service not configured. Set RESEND_API_KEY environment variable.' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      text,
      html,
      cc,
      replyTo,
      headers,
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
  // Defensively coerce amount - Supabase NUMERIC(10,2) may arrive as string
  const giftCard = { ...data.giftCard, amount: Number(data.giftCard.amount) };
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://busybeesipc.com';

  const subject = `🎁 You've received a $${giftCard.amount.toFixed(2)} Busy Bees Gift Card!`;

  // Plain text fallback
  const text = `
You've Received a Gift!

Hi ${giftCard.recipientName}!

${giftCard.purchaserName} sent you a Busy Bees gift card!

GIFT CARD VALUE: $${giftCard.amount.toFixed(2)}
REDEMPTION CODE: ${giftCard.code}

${giftCard.personalMessage ? `Personal Message:\n"${giftCard.personalMessage}"\n- ${giftCard.purchaserName}\n` : ''}

HOW TO REDEEM:
1. Visit ${siteUrl}/gift-cards
2. Click "Redeem Gift Card"
3. Enter your code: ${giftCard.code}
4. Credit will be added to your account instantly!

This gift card never expires. Valid for all purchases at Busy Bees.

Visit us at Busy Bees Indoor Play Center
${siteUrl}
`;

  // Beautiful HTML email matching the design
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You've Received a Gift Card!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header with gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); padding: 30px 20px; text-align: center;">
              <!-- Bee Logo -->
              <div style="width: 60px; height: 60px; background-color: #fef3c7; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 30px;">🐝</span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                You've Received a Gift!
              </h1>
            </td>
          </tr>

          <!-- Body content -->
          <tr>
            <td style="padding: 30px 25px;">

              <!-- Greeting -->
              <p style="text-align: center; margin: 0 0 5px; font-size: 18px; font-weight: 600; color: #1f2937;">
                Hi ${giftCard.recipientName}!
              </p>
              <p style="text-align: center; margin: 0 0 25px; font-size: 15px; color: #6b7280;">
                ${giftCard.purchaserName} sent you a Busy Bees gift card!
              </p>

              <!-- Gift Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); border-radius: 12px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 20px;">
                    <!-- Card Header -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="margin: 0 0 2px; font-size: 10px; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 1px;">Gift Card</p>
                          <p style="margin: 0; font-size: 16px; font-weight: 700; color: #ffffff;">🎁 BUSY BEES</p>
                        </td>
                        <td align="right">
                          <span style="font-size: 24px;">🐝</span>
                        </td>
                      </tr>
                    </table>

                    <!-- Value -->
                    <div style="margin: 20px 0;">
                      <p style="margin: 0 0 2px; font-size: 10px; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 1px;">Value</p>
                      <p style="margin: 0; font-size: 42px; font-weight: 700; color: #ffffff;">$${giftCard.amount.toFixed(2)}</p>
                    </div>

                    <!-- Code -->
                    <div>
                      <p style="margin: 0 0 2px; font-size: 10px; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 1px;">Redemption Code</p>
                      <p style="margin: 0; font-size: 18px; font-weight: 600; color: #ffffff; font-family: monospace; letter-spacing: 1px;">${giftCard.code}</p>
                    </div>
                  </td>
                </tr>
              </table>

              ${giftCard.personalMessage ? `
              <!-- Personal Message -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fefce8; border: 1px solid #fef08a; border-radius: 12px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 8px; font-size: 13px; color: #ca8a04; font-weight: 600;">Personal Message:</p>
                    <p style="margin: 0 0 10px; font-size: 15px; color: #1f2937; font-style: italic;">"${giftCard.personalMessage}"</p>
                    <p style="margin: 0; font-size: 14px; color: #6b7280; text-align: right;">- ${giftCard.purchaserName}</p>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- How to Redeem -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 12px; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 15px; font-size: 16px; font-weight: 600; color: #1f2937;">
                      🎁 How to Redeem
                    </p>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 4px 0; font-size: 14px; color: #4b5563;">
                          <span style="color: #f59e0b; font-weight: 600;">1.</span> Visit <a href="${siteUrl}/gift-cards" style="color: #f59e0b; text-decoration: underline;">busybeesipc.com/gift-cards</a>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-size: 14px; color: #4b5563;">
                          <span style="color: #f59e0b; font-weight: 600;">2.</span> Click "Redeem Gift Card"
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-size: 14px; color: #4b5563;">
                          <span style="color: #f59e0b; font-weight: 600;">3.</span> Enter your code: <strong>${giftCard.code}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-size: 14px; color: #4b5563;">
                          <span style="color: #f59e0b; font-weight: 600;">4.</span> Credit will be added to your account instantly!
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 25px;">
                    <a href="${siteUrl}/gift-cards/redeem" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 30px; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);">
                      Redeem Your Gift Card
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 5px; font-size: 14px; color: #6b7280;">
                      📍 Visit us at Busy Bees Indoor Play Center
                    </p>
                    <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">
                      🌐 <a href="${siteUrl}" style="color: #f59e0b; text-decoration: none;">busybeesipc.com</a>
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                      This gift card never expires. Valid for all purchases at Busy Bees.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  return sendEmail({
    to: data.to,
    subject,
    text,
    html,
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
 * Send purchase confirmation email to the gift card buyer
 */
export async function sendGiftCardPurchaseConfirmation(data: {
  to: string;
  purchaserName: string;
  recipientName: string;
  recipientEmail: string;
  amount: number;
  giftCardCode: string;
  deliveryMethod: 'email_recipient' | 'email_self';
}): Promise<EmailResult> {
  const amount = Number(data.amount);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://busybeesipc.com';

  const deliveredTo = data.deliveryMethod === 'email_self'
    ? `yourself at ${data.to}`
    : `${data.recipientName} at ${data.recipientEmail}`;

  const subject = `Order Confirmation — $${amount.toFixed(2)} Busy Bees Gift Card`;

  const text = `
Gift Card Purchase Confirmation

Hi ${data.purchaserName}!

Thank you for your gift card purchase at Busy Bees Indoor Play Center!

ORDER SUMMARY:
Gift Card Code: ${data.giftCardCode}
Gift Card Amount: $${amount.toFixed(2)}
Recipient: ${data.recipientName}
Delivered to: ${deliveredTo}

The gift card email has been sent and is ready to use. It never expires and is valid for all purchases at Busy Bees.

Thank you for sharing the fun!

Busy Bees Indoor Play Center
${siteUrl}
`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gift Card Purchase Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px 20px; text-align: center;">
              <div style="width: 60px; height: 60px; background-color: #d1fae5; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 30px;">✅</span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                Purchase Confirmed!
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 30px 25px;">
              <p style="text-align: center; margin: 0 0 5px; font-size: 18px; font-weight: 600; color: #1f2937;">
                Hi ${data.purchaserName}!
              </p>
              <p style="text-align: center; margin: 0 0 25px; font-size: 15px; color: #6b7280;">
                Thank you for your gift card purchase!
              </p>

              <!-- Order Summary -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 12px; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 15px; font-size: 16px; font-weight: 600; color: #1f2937;">
                      🧾 Order Summary
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6b7280; border-bottom: 1px solid #e5e7eb;">Gift Card Code</td>
                        <td align="right" style="padding: 8px 0; font-size: 14px; font-weight: 700; color: #059669; letter-spacing: 1px; border-bottom: 1px solid #e5e7eb;">${data.giftCardCode}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6b7280; border-bottom: 1px solid #e5e7eb;">Gift Card Amount</td>
                        <td align="right" style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #1f2937; border-bottom: 1px solid #e5e7eb;">$${amount.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6b7280; border-bottom: 1px solid #e5e7eb;">Recipient</td>
                        <td align="right" style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${data.recipientName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Delivered to</td>
                        <td align="right" style="padding: 8px 0; font-size: 14px; color: #1f2937;">${deliveredTo}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="text-align: center; margin: 0 0 25px; font-size: 14px; color: #6b7280;">
                The gift card has been sent and is ready to use. It never expires and is valid for all purchases at Busy Bees.
              </p>

              <!-- Footer -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 5px; font-size: 14px; color: #6b7280;">
                      Thank you for sharing the fun! 🐝
                    </p>
                    <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">
                      🌐 <a href="${siteUrl}" style="color: #f59e0b; text-decoration: none;">busybeesipc.com</a>
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  return sendEmail({
    to: data.to,
    subject,
    text,
    html,
  });
}

/**
 * Send welcome email to new customer after signup
 */
export async function sendWelcomeEmail(data: {
  to: string;
  name: string;
  phone: string;
}): Promise<EmailResult> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://busybeesipc.com';

  const subject = '🐝 Welcome to Busy Bees Indoor Play Center!';

  // Format phone for display
  const formattedPhone = data.phone.length === 10
    ? `(${data.phone.slice(0, 3)}) ${data.phone.slice(3, 6)}-${data.phone.slice(6)}`
    : data.phone;

  // Plain text fallback
  const text = `
Welcome to the Busy Bees Family!

Hi ${data.name}!

Thank you for creating an account with Busy Bees Indoor Play Center!
We're so excited to have you join our hive of happy families.

YOUR ACCOUNT DETAILS:
Email: ${data.to}
Phone: ${formattedPhone}

WHAT'S NEXT?
• Add your children to your account
• Purchase day passes, punch cards, or memberships
• Sign waivers for your little ones
• Book a birthday party!

QUICK TIP: When you visit Busy Bees, just enter your phone
number at our check-in kiosk to access your account!

Visit your dashboard: ${siteUrl}/customer/dashboard

We can't wait to see you soon! 🐝

Busy Bees Indoor Play Center
${siteUrl}
`;

  // Beautiful HTML email
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Busy Bees!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header with gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); padding: 30px 20px; text-align: center;">
              <!-- Bee Logo -->
              <div style="width: 70px; height: 70px; background-color: #fef3c7; border-radius: 50%; margin: 0 auto 15px; line-height: 70px;">
                <span style="font-size: 36px;">🐝</span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                Welcome to Busy Bees!
              </h1>
            </td>
          </tr>

          <!-- Body content -->
          <tr>
            <td style="padding: 30px 25px;">

              <!-- Greeting -->
              <p style="text-align: center; margin: 0 0 5px; font-size: 20px; font-weight: 600; color: #1f2937;">
                Hi ${data.name}! 👋
              </p>
              <p style="text-align: center; margin: 0 0 25px; font-size: 15px; color: #6b7280; line-height: 1.5;">
                Thank you for joining the Busy Bees family!<br>
                We're so excited to have you in our hive.
              </p>

              <!-- Account Details Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); border-radius: 12px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="margin: 0 0 2px; font-size: 10px; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 1px;">Your Account</p>
                          <p style="margin: 0; font-size: 16px; font-weight: 700; color: #ffffff;">🐝 BUSY BEES</p>
                        </td>
                        <td align="right">
                          <span style="font-size: 24px;">✨</span>
                        </td>
                      </tr>
                    </table>

                    <div style="margin: 20px 0 10px;">
                      <p style="margin: 0 0 2px; font-size: 10px; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 1px;">Email</p>
                      <p style="margin: 0; font-size: 16px; font-weight: 600; color: #ffffff;">${data.to}</p>
                    </div>

                    <div>
                      <p style="margin: 0 0 2px; font-size: 10px; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 1px;">Phone</p>
                      <p style="margin: 0; font-size: 16px; font-weight: 600; color: #ffffff;">${formattedPhone}</p>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- What's Next Section -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 12px; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 15px; font-size: 16px; font-weight: 600; color: #1f2937;">
                      🎉 What's Next?
                    </p>
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #4b5563;">
                          <span style="display: inline-block; width: 24px; height: 24px; background-color: #fef3c7; border-radius: 50%; text-align: center; line-height: 24px; margin-right: 10px; font-size: 12px;">👶</span>
                          Add your children to your account
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #4b5563;">
                          <span style="display: inline-block; width: 24px; height: 24px; background-color: #fef3c7; border-radius: 50%; text-align: center; line-height: 24px; margin-right: 10px; font-size: 12px;">🎟️</span>
                          Purchase day passes or memberships
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #4b5563;">
                          <span style="display: inline-block; width: 24px; height: 24px; background-color: #fef3c7; border-radius: 50%; text-align: center; line-height: 24px; margin-right: 10px; font-size: 12px;">📝</span>
                          Sign waivers for your little ones
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #4b5563;">
                          <span style="display: inline-block; width: 24px; height: 24px; background-color: #fef3c7; border-radius: 50%; text-align: center; line-height: 24px; margin-right: 10px; font-size: 12px;">🎂</span>
                          Book a birthday party!
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Quick Tip -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fefce8; border: 1px solid #fef08a; border-radius: 12px; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0; font-size: 14px; color: #854d0e;">
                      <strong>💡 Quick Tip:</strong> When you visit Busy Bees, just enter your phone number at our check-in kiosk to access your account!
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 25px;">
                    <a href="${siteUrl}/customer/dashboard" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 30px; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);">
                      Visit Your Dashboard
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 5px; font-size: 14px; color: #6b7280;">
                      📍 Visit us at Busy Bees Indoor Play Center
                    </p>
                    <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">
                      🌐 <a href="${siteUrl}" style="color: #f59e0b; text-decoration: none;">busybeesipc.com</a>
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                      We can't wait to see you and your little ones soon! 🐝✨
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  return sendEmail({
    to: data.to,
    subject,
    text,
    html,
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
    ? parseDateString(data.expiryDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : 'Never expires';

  // Plain text fallback
  const text = `
Purchase Confirmed!

Hi ${data.customerName}!

Your purchase has been confirmed:

${data.purchaseName}
Amount: $${data.purchasePrice.toFixed(2)}
Valid Until: ${expiryInfo}

HOW TO USE YOUR PASS:
1. Visit Busy Bees Indoor Play Center
2. Enter your phone number at the check-in kiosk
3. Select your pass and check in your children
4. Enjoy your play time!

View your purchases: ${siteUrl}/customer/dashboard

Thanks for being part of the Busy Bees family!

Busy Bees Indoor Play Center
${siteUrl}
`;

  // Beautiful HTML email
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Purchase Confirmed</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px 20px; text-align: center;">
              <div style="width: 60px; height: 60px; background-color: #d1fae5; border-radius: 50%; margin: 0 auto 15px; line-height: 60px;">
                <span style="font-size: 30px;">✓</span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700;">
                Purchase Confirmed!
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 30px 25px;">
              <p style="text-align: center; margin: 0 0 25px; font-size: 16px; color: #6b7280;">
                Hi ${data.customerName}! Thanks for your purchase.
              </p>

              <!-- Purchase Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); border-radius: 12px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="margin: 0 0 2px; font-size: 10px; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 1px;">Your Purchase</p>
                          <p style="margin: 0; font-size: 16px; font-weight: 700; color: #ffffff;">🐝 BUSY BEES</p>
                        </td>
                        <td align="right">
                          <span style="font-size: 24px;">🎟️</span>
                        </td>
                      </tr>
                    </table>

                    <div style="margin: 20px 0 10px;">
                      <p style="margin: 0 0 2px; font-size: 10px; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 1px;">Item</p>
                      <p style="margin: 0; font-size: 18px; font-weight: 600; color: #ffffff;">${data.purchaseName}</p>
                    </div>

                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="50%">
                          <p style="margin: 0 0 2px; font-size: 10px; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 1px;">Amount</p>
                          <p style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff;">$${data.purchasePrice.toFixed(2)}</p>
                        </td>
                        <td width="50%">
                          <p style="margin: 0 0 2px; font-size: 10px; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 1px;">Valid Until</p>
                          <p style="margin: 0; font-size: 14px; font-weight: 600; color: #ffffff;">${expiryInfo}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- How to Use -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 12px; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 15px; font-size: 16px; font-weight: 600; color: #1f2937;">
                      🎟️ How to Use Your Pass
                    </p>
                    <table cellpadding="0" cellspacing="0">
                      <tr><td style="padding: 4px 0; font-size: 14px; color: #4b5563;"><span style="color: #f59e0b; font-weight: 600;">1.</span> Visit Busy Bees Indoor Play Center</td></tr>
                      <tr><td style="padding: 4px 0; font-size: 14px; color: #4b5563;"><span style="color: #f59e0b; font-weight: 600;">2.</span> Enter your phone number at the kiosk</td></tr>
                      <tr><td style="padding: 4px 0; font-size: 14px; color: #4b5563;"><span style="color: #f59e0b; font-weight: 600;">3.</span> Select your pass and check in</td></tr>
                      <tr><td style="padding: 4px 0; font-size: 14px; color: #4b5563;"><span style="color: #f59e0b; font-weight: 600;">4.</span> Enjoy your play time! 🎉</td></tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 25px;">
                    <a href="${siteUrl}/customer/dashboard" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 30px; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);">
                      View My Passes
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 5px; font-size: 14px; color: #6b7280;">📍 Busy Bees Indoor Play Center</p>
                    <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">🌐 <a href="${siteUrl}" style="color: #f59e0b; text-decoration: none;">busybeesipc.com</a></p>
                    <p style="margin: 0; font-size: 12px; color: #9ca3af;">We can't wait to see you! 🐝</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  return sendEmail({
    to: data.to,
    subject,
    text,
    html,
  });
}

/**
 * Send party booking confirmation email
 */
/**
 * Get package-specific email content sections based on the booked package.
 * Returns both HTML sections and plain text for the confirmation email.
 */
function getPackageEmailContent(packageName: string): { html: string; text: string } {
  const sectionStyle = 'width: 100%; background-color: #fdf2f8; border: 1px solid #fbcfe8; border-radius: 12px; margin-bottom: 16px;';
  const sectionPadding = 'padding: 20px;';
  const headingStyle = 'margin: 0 0 12px; font-size: 16px; font-weight: 700; color: #1f2937;';
  const subheadingStyle = 'margin: 16px 0 8px; font-size: 14px; font-weight: 600; color: #374151;';
  const textStyle = 'margin: 0 0 10px; font-size: 14px; color: #4b5563; line-height: 1.6;';
  const bulletStyle = 'padding: 3px 0; font-size: 14px; color: #4b5563; line-height: 1.5;';
  const importantStyle = 'width: 100%; background-color: #fefce8; border: 1px solid #fef08a; border-radius: 12px; margin-bottom: 16px;';

  if (packageName === 'basic_bee') {
    const html = `
              <!-- Thank You -->
              <table cellpadding="0" cellspacing="0" style="${sectionStyle}">
                <tr>
                  <td style="${sectionPadding}">
                    <p style="${headingStyle}">Thank you for your Purchase!</p>
                    <p style="${textStyle}">We're excited to host your Basic Bee Party and look forward to celebrating with you and your guests! To help your party run smoothly and ensure every family enjoys their celebration, please review the important details below.</p>
                  </td>
                </tr>
              </table>

              <!-- Party Schedule -->
              <table cellpadding="0" cellspacing="0" style="${importantStyle}">
                <tr>
                  <td style="${sectionPadding}">
                    <p style="${headingStyle}">⏰ Party Schedule &amp; Timely Departure (Important)</p>
                    <p style="${textStyle}">To keep parties running smoothly throughout the day, we operate on a structured party schedule so our team has time to clean and prepare the space for the next celebration.</p>
                    <p style="${textStyle}">Your party will follow this timeline:</p>

                    <p style="${subheadingStyle}">🎪 Play Time &ndash; 1 Hour 40 Minutes</p>
                    <p style="${textStyle}">Children will enjoy full access to the play area, including the bounce house and music.</p>

                    <p style="${subheadingStyle}">🎉 Celebration Time &ndash; Final 20 Minutes</p>
                    <p style="${textStyle}">The last 20 minutes of your reservation will take place in the private party room for celebration time. You are welcome to bring in your own food, snacks, and drinks. All food and drinks must be consumed in the party room.</p>
                    <p style="${textStyle}">To help make the transition smooth for everyone, the bounce house and music will be turned off during these final 20 minutes while the kids are in the party room. This helps shift everyone toward the celebration portion of the party and ensures we can prepare the play area for the next group.</p>

                    <p style="${subheadingStyle}">👋 Departure</p>
                    <p style="${textStyle}">At the conclusion of celebration time, we kindly ask that children do not re-enter the play area. Please begin gathering belongings and escort guests toward the main lobby for departure so our staff can begin cleaning and preparing the space for the next party.</p>

                    <p style="${subheadingStyle}">🐝 Busy Bee Sticker Stop</p>
                    <p style="${textStyle}">Before heading out, kids are welcome to stop by the front desk near the shoe area to receive a custom Busy Bee sticker. This has become a fun tradition for many of our guests and helps make the transition out of the play area smooth and exciting for the kids.</p>

                    <p style="margin: 16px 0 0; font-size: 14px; color: #854d0e; font-weight: 600; line-height: 1.6;">Your cooperation with the schedule helps us ensure every family gets the same great party experience. Thank you for helping us keep the party flow organized and fun for everyone!</p>
                  </td>
                </tr>
              </table>

              <!-- Arrival & Set-Up -->
              <table cellpadding="0" cellspacing="0" style="${sectionStyle}">
                <tr>
                  <td style="${sectionPadding}">
                    <p style="${headingStyle}">🚪 Arrival &amp; Set-Up</p>
                    <p style="${textStyle}">You may arrive up to 20 minutes before your scheduled start time to begin setting up in the party room.</p>
                    <p style="${textStyle}">Please note that we must adhere to strict time blocks so our staff can properly clean and reset between parties.</p>
                  </td>
                </tr>
              </table>

              <!-- Supplies & Customization -->
              <table cellpadding="0" cellspacing="0" style="${sectionStyle}">
                <tr>
                  <td style="${sectionPadding}">
                    <p style="${headingStyle}">🎨 Supplies &amp; Customization</p>
                    <p style="${textStyle}">Your Basic Bee Party includes standard "Happy Birthday" themed paper goods (plates, napkins, and utensils).</p>
                    <p style="${textStyle}">If you prefer to bring your own themed tableware, please let us know in advance so we can plan accordingly.</p>
                  </td>
                </tr>
              </table>

              <!-- Food & Decorations -->
              <table cellpadding="0" cellspacing="0" style="${sectionStyle}">
                <tr>
                  <td style="${sectionPadding}">
                    <p style="${headingStyle}">🍽️ Food &amp; Decorations</p>

                    <p style="${subheadingStyle}">Outside Food</p>
                    <p style="${textStyle}">You are welcome to bring outside food to serve in the party room.</p>

                    <p style="${subheadingStyle}">Decorations</p>
                    <p style="${textStyle}">You may bring decorations with prior approval from management. Please note:</p>
                    <table cellpadding="0" cellspacing="0">
                      <tr><td style="${bulletStyle}">&bull; Tape, nails, or adhesives may not be used on walls</td></tr>
                      <tr><td style="${bulletStyle}">&bull; All decorations must be removed at the end of the party</td></tr>
                    </table>

                    <p style="${subheadingStyle}">Entertainment Vendors</p>
                    <p style="${textStyle}">Magicians, characters, or other vendors must be approved by our staff in advance.</p>
                  </td>
                </tr>
              </table>

              <!-- Safety & Facility Guidelines -->
              <table cellpadding="0" cellspacing="0" style="${sectionStyle}">
                <tr>
                  <td style="${sectionPadding}">
                    <p style="${headingStyle}">🛡️ Safety &amp; Facility Guidelines</p>

                    <p style="${subheadingStyle}">Waivers</p>
                    <p style="${textStyle}">All children participating in play must have a signed waiver completed by a parent or legal guardian. They can do this at check-in on the day of the birthday party. We don't require each guest to create an account anymore. We simply collect the guest name, age, and add them to the master waiver of the host.</p>

                    <p style="${subheadingStyle}">Play Rules</p>
                    <p style="${textStyle}">All guests must follow standard Busy Bee play rules during the event.</p>
                  </td>
                </tr>
              </table>

              <!-- Cancellation & Rescheduling Policy -->
              <table cellpadding="0" cellspacing="0" style="${importantStyle}">
                <tr>
                  <td style="${sectionPadding}">
                    <p style="${headingStyle}">📋 Birthday Party Cancellation &amp; Rescheduling Policy</p>
                    <p style="${textStyle}">To prepare properly for your celebration, staff and resources are scheduled in advance.</p>

                    <p style="${subheadingStyle}">Notice Period</p>
                    <p style="${textStyle}">Cancellations or rescheduling requests must be submitted via email at least 7 days prior to the event.</p>

                    <p style="${subheadingStyle}">Less Than 7 Days Notice</p>
                    <p style="${textStyle}">Cancellations made within 7 days of the party will result in the 50% deposit being forfeited.</p>

                    <p style="${subheadingStyle}">Rescheduling</p>
                    <p style="${textStyle}">One complimentary reschedule is allowed if requested at least 7 days prior (subject to availability).</p>
                    <p style="${textStyle}">Rescheduling within the 7-day window may incur a fee of 25% of the total package cost. This is to cover lost revenue on the birthday slot that otherwise would have been available to another family.</p>

                    <p style="${subheadingStyle}">Weather or Emergencies</p>
                    <p style="${textStyle}">In cases of extreme weather or documented emergencies, please contact us as soon as possible and we will do our best to accommodate a new date without penalty.</p>
                  </td>
                </tr>
              </table>

              <!-- Closing -->
              <table cellpadding="0" cellspacing="0" style="${sectionStyle}">
                <tr>
                  <td style="${sectionPadding}">
                    <p style="${textStyle}">Thank you again for choosing Busy Bee's for your celebration. We truly appreciate your business and look forward to hosting a fun and memorable party for your family!</p>
                    <p style="${textStyle}">If you have any questions before the weekend, please don't hesitate to reach out.</p>
                    <p style="margin: 0; font-size: 14px; color: #4b5563; line-height: 1.6;">Warm regards,<br><strong>Busy Bee's Party Team</strong></p>
                  </td>
                </tr>
              </table>`;

    const text = `Thank you for your Purchase!
We're excited to host your Basic Bee Party and look forward to celebrating with you and your guests! To help your party run smoothly and ensure every family enjoys their celebration, please review the important details below.

PARTY SCHEDULE & TIMELY DEPARTURE (Important)
To keep parties running smoothly throughout the day, we operate on a structured party schedule so our team has time to clean and prepare the space for the next celebration.

Your party will follow this timeline:

Play Time - 1 Hour 40 Minutes
Children will enjoy full access to the play area, including the bounce house and music.

Celebration Time - Final 20 Minutes
The last 20 minutes of your reservation will take place in the private party room for celebration time. You are welcome to bring in your own food, snacks, and drinks. All food and drinks must be consumed in the party room.
To help make the transition smooth for everyone, the bounce house and music will be turned off during these final 20 minutes while the kids are in the party room.

Departure
At the conclusion of celebration time, we kindly ask that children do not re-enter the play area. Please begin gathering belongings and escort guests toward the main lobby for departure.

Busy Bee Sticker Stop
Before heading out, kids are welcome to stop by the front desk near the shoe area to receive a custom Busy Bee sticker.

Your cooperation with the schedule helps us ensure every family gets the same great party experience!

ARRIVAL & SET-UP
You may arrive up to 20 minutes before your scheduled start time to begin setting up in the party room.
Please note that we must adhere to strict time blocks so our staff can properly clean and reset between parties.

SUPPLIES & CUSTOMIZATION
Your Basic Bee Party includes standard "Happy Birthday" themed paper goods (plates, napkins, and utensils).
If you prefer to bring your own themed tableware, please let us know in advance so we can plan accordingly.

FOOD & DECORATIONS
Outside Food: You are welcome to bring outside food to serve in the party room.
Decorations: You may bring decorations with prior approval from management.
  - Tape, nails, or adhesives may not be used on walls
  - All decorations must be removed at the end of the party
Entertainment Vendors: Magicians, characters, or other vendors must be approved by our staff in advance.

SAFETY & FACILITY GUIDELINES
Waivers: All children participating in play must have a signed waiver completed by a parent or legal guardian. They can do this at check-in on the day of the birthday party.
Play Rules: All guests must follow standard Busy Bee play rules during the event.

BIRTHDAY PARTY CANCELLATION & RESCHEDULING POLICY
Notice Period: Cancellations or rescheduling requests must be submitted via email at least 7 days prior to the event.
Less Than 7 Days Notice: Cancellations made within 7 days of the party will result in the 50% deposit being forfeited.
Rescheduling: One complimentary reschedule is allowed if requested at least 7 days prior (subject to availability). Rescheduling within the 7-day window may incur a fee of 25% of the total package cost. This is to cover lost revenue on the birthday slot that otherwise would have been available to another family.
Weather or Emergencies: In cases of extreme weather or documented emergencies, please contact us as soon as possible and we will do our best to accommodate a new date without penalty.

Thank you again for choosing Busy Bee's for your celebration. We truly appreciate your business and look forward to hosting a fun and memorable party for your family!
If you have any questions before the weekend, please don't hesitate to reach out.

Warm regards,
Busy Bee's Party Team`;

    return { html, text };
  }

  if (packageName === 'worker_bee') {
    const html = `
              <!-- Thank You -->
              <table cellpadding="0" cellspacing="0" style="${sectionStyle}">
                <tr>
                  <td style="${sectionPadding}">
                    <p style="${headingStyle}">Thank you for your Purchase!</p>
                    <p style="${textStyle}">We're excited to host your Worker Bee Party and look forward to celebrating with you and your guests! To help your party run smoothly and ensure every family enjoys their celebration, please review the important details below.</p>
                  </td>
                </tr>
              </table>

              <!-- Party Schedule -->
              <table cellpadding="0" cellspacing="0" style="${importantStyle}">
                <tr>
                  <td style="${sectionPadding}">
                    <p style="${headingStyle}">⏰ Party Schedule &amp; Timely Departure (Important)</p>
                    <p style="${textStyle}">To keep parties running smoothly throughout the day, we operate on a structured party schedule so our team has time to clean and prepare the space for the next celebration.</p>
                    <p style="${textStyle}">Your party will follow this timeline:</p>

                    <p style="${subheadingStyle}">🎪 Play Time &ndash; 1 Hour 40 Minutes</p>
                    <p style="${textStyle}">Children will enjoy full access to the play area, including the bounce house and music.</p>

                    <p style="${subheadingStyle}">🎉 Celebration Time &ndash; Final 20 Minutes</p>
                    <p style="${textStyle}">The last 20 minutes of your reservation will take place in the private party room for celebration time. You are welcome to bring in your own food, snacks, and drinks. All food and drinks must be consumed in the party room.</p>
                    <p style="${textStyle}">To help make the transition smooth for everyone, the bounce house and music will be turned off during these final 20 minutes while the kids are in the party room. This helps shift everyone toward the celebration portion of the party and ensures we can prepare the play area for the next group.</p>

                    <p style="${subheadingStyle}">👋 Departure</p>
                    <p style="${textStyle}">At the conclusion of celebration time, we kindly ask that children do not re-enter the play area. Please begin gathering belongings and escort guests toward the main lobby for departure so our staff can begin cleaning and preparing the space for the next party.</p>

                    <p style="${subheadingStyle}">🐝 Busy Bee Sticker Stop</p>
                    <p style="${textStyle}">Before heading out, kids are welcome to stop by the front desk near the shoe area to receive a custom Busy Bee sticker. This has become a fun tradition for many of our guests and helps make the transition out of the play area smooth and exciting for the kids.</p>

                    <p style="margin: 16px 0 0; font-size: 14px; color: #854d0e; font-weight: 600; line-height: 1.6;">Your cooperation with the schedule helps us ensure every family gets the same great party experience. Thank you for helping us keep the party flow organized and fun for everyone!</p>
                  </td>
                </tr>
              </table>

              <!-- Arrival & Set-Up -->
              <table cellpadding="0" cellspacing="0" style="${sectionStyle}">
                <tr>
                  <td style="${sectionPadding}">
                    <p style="${headingStyle}">🚪 Arrival &amp; Set-Up</p>
                    <p style="${textStyle}">You may arrive up to 20 minutes before your scheduled start time to begin setting up in the party room.</p>
                    <p style="${textStyle}">Please note that we must adhere to strict time blocks so our staff can properly clean and reset between parties.</p>
                  </td>
                </tr>
              </table>

              <!-- Supplies & Customization -->
              <table cellpadding="0" cellspacing="0" style="${sectionStyle}">
                <tr>
                  <td style="${sectionPadding}">
                    <p style="${headingStyle}">🎨 Supplies &amp; Customization</p>
                    <p style="${textStyle}">Your Worker Bee Party includes standard "Happy Birthday" themed paper goods (plates, napkins, and utensils).</p>
                    <p style="${textStyle}">If you prefer to bring your own themed tableware, please let us know in advance so we can plan accordingly.</p>
                  </td>
                </tr>
              </table>

              <!-- Food & Decorations -->
              <table cellpadding="0" cellspacing="0" style="${sectionStyle}">
                <tr>
                  <td style="${sectionPadding}">
                    <p style="${headingStyle}">🍽️ Food &amp; Decorations</p>

                    <p style="${subheadingStyle}">Outside Food</p>
                    <p style="${textStyle}">You are welcome to bring outside food to serve in the party room.</p>

                    <p style="${subheadingStyle}">Decorations</p>
                    <p style="${textStyle}">You may bring decorations with prior approval from management. Please note:</p>
                    <table cellpadding="0" cellspacing="0">
                      <tr><td style="${bulletStyle}">&bull; Tape, nails, or adhesives may not be used on walls</td></tr>
                      <tr><td style="${bulletStyle}">&bull; All decorations must be removed at the end of the party</td></tr>
                    </table>

                    <p style="${subheadingStyle}">Entertainment Vendors</p>
                    <p style="${textStyle}">Magicians, characters, or other vendors must be approved by our staff in advance.</p>
                  </td>
                </tr>
              </table>

              <!-- Safety & Facility Guidelines -->
              <table cellpadding="0" cellspacing="0" style="${sectionStyle}">
                <tr>
                  <td style="${sectionPadding}">
                    <p style="${headingStyle}">🛡️ Safety &amp; Facility Guidelines</p>

                    <p style="${subheadingStyle}">Waivers</p>
                    <p style="${textStyle}">All children participating in play must have a signed waiver completed by a parent or legal guardian. They can do this at check-in on the day of the birthday party. We don't require each guest to create an account anymore. We simply collect the guest name, age, and add them to the master waiver of the host.</p>

                    <p style="${subheadingStyle}">Play Rules</p>
                    <p style="${textStyle}">All guests must follow standard Busy Bee play rules during the event.</p>
                  </td>
                </tr>
              </table>

              <!-- Cancellation & Rescheduling Policy -->
              <table cellpadding="0" cellspacing="0" style="${importantStyle}">
                <tr>
                  <td style="${sectionPadding}">
                    <p style="${headingStyle}">📋 Birthday Party Cancellation &amp; Rescheduling Policy</p>
                    <p style="${textStyle}">To prepare properly for your celebration, staff and resources are scheduled in advance.</p>

                    <p style="${subheadingStyle}">Notice Period</p>
                    <p style="${textStyle}">Cancellations or rescheduling requests must be submitted via email at least 7 days prior to the event.</p>

                    <p style="${subheadingStyle}">Less Than 7 Days Notice</p>
                    <p style="${textStyle}">Cancellations made within 7 days of the party will result in the 50% deposit being forfeited.</p>

                    <p style="${subheadingStyle}">Rescheduling</p>
                    <p style="${textStyle}">One complimentary reschedule is allowed if requested at least 7 days prior (subject to availability).</p>
                    <p style="${textStyle}">Rescheduling within the 7-day window may incur a fee of 25% of the total package cost. This is to cover lost revenue on the birthday slot that otherwise would have been available to another family.</p>

                    <p style="${subheadingStyle}">Weather or Emergencies</p>
                    <p style="${textStyle}">In cases of extreme weather or documented emergencies, please contact us as soon as possible and we will do our best to accommodate a new date without penalty.</p>
                  </td>
                </tr>
              </table>

              <!-- Closing -->
              <table cellpadding="0" cellspacing="0" style="${sectionStyle}">
                <tr>
                  <td style="${sectionPadding}">
                    <p style="${textStyle}">Thank you again for choosing Busy Bee's for your celebration. We truly appreciate your business and look forward to hosting a fun and memorable party for your family!</p>
                    <p style="${textStyle}">If you have any questions before the weekend, please don't hesitate to reach out.</p>
                    <p style="margin: 0; font-size: 14px; color: #4b5563; line-height: 1.6;">Warm regards,<br><strong>Busy Bee's Party Team</strong></p>
                  </td>
                </tr>
              </table>`;

    const text = `Thank you for your Purchase!
We're excited to host your Worker Bee Party and look forward to celebrating with you and your guests! To help your party run smoothly and ensure every family enjoys their celebration, please review the important details below.

PARTY SCHEDULE & TIMELY DEPARTURE (Important)
To keep parties running smoothly throughout the day, we operate on a structured party schedule so our team has time to clean and prepare the space for the next celebration.

Your party will follow this timeline:

Play Time - 1 Hour 40 Minutes
Children will enjoy full access to the play area, including the bounce house and music.

Celebration Time - Final 20 Minutes
The last 20 minutes of your reservation will take place in the private party room for celebration time. You are welcome to bring in your own food, snacks, and drinks. All food and drinks must be consumed in the party room.
To help make the transition smooth for everyone, the bounce house and music will be turned off during these final 20 minutes while the kids are in the party room.

Departure
At the conclusion of celebration time, we kindly ask that children do not re-enter the play area. Please begin gathering belongings and escort guests toward the main lobby for departure.

Busy Bee Sticker Stop
Before heading out, kids are welcome to stop by the front desk near the shoe area to receive a custom Busy Bee sticker.

Your cooperation with the schedule helps us ensure every family gets the same great party experience!

ARRIVAL & SET-UP
You may arrive up to 20 minutes before your scheduled start time to begin setting up in the party room.
Please note that we must adhere to strict time blocks so our staff can properly clean and reset between parties.

SUPPLIES & CUSTOMIZATION
Your Worker Bee Party includes standard "Happy Birthday" themed paper goods (plates, napkins, and utensils).
If you prefer to bring your own themed tableware, please let us know in advance so we can plan accordingly.

FOOD & DECORATIONS
Outside Food: You are welcome to bring outside food to serve in the party room.
Decorations: You may bring decorations with prior approval from management.
  - Tape, nails, or adhesives may not be used on walls
  - All decorations must be removed at the end of the party
Entertainment Vendors: Magicians, characters, or other vendors must be approved by our staff in advance.

SAFETY & FACILITY GUIDELINES
Waivers: All children participating in play must have a signed waiver completed by a parent or legal guardian. They can do this at check-in on the day of the birthday party.
Play Rules: All guests must follow standard Busy Bee play rules during the event.

BIRTHDAY PARTY CANCELLATION & RESCHEDULING POLICY
Notice Period: Cancellations or rescheduling requests must be submitted via email at least 7 days prior to the event.
Less Than 7 Days Notice: Cancellations made within 7 days of the party will result in the 50% deposit being forfeited.
Rescheduling: One complimentary reschedule is allowed if requested at least 7 days prior (subject to availability). Rescheduling within the 7-day window may incur a fee of 25% of the total package cost. This is to cover lost revenue on the birthday slot that otherwise would have been available to another family.
Weather or Emergencies: In cases of extreme weather or documented emergencies, please contact us as soon as possible and we will do our best to accommodate a new date without penalty.

Thank you again for choosing Busy Bee's for your celebration. We truly appreciate your business and look forward to hosting a fun and memorable party for your family!
If you have any questions before the weekend, please don't hesitate to reach out.

Warm regards,
Busy Bee's Party Team`;

    return { html, text };
  }

  if (packageName === 'queen_bee') {
    const html = `
              <!-- Thank You -->
              <table cellpadding="0" cellspacing="0" style="${sectionStyle}">
                <tr>
                  <td style="${sectionPadding}">
                    <p style="${headingStyle}">Thank you for your Purchase!</p>
                    <p style="${textStyle}">We're excited to host your Queen Bee Party and look forward to celebrating with you and your guests! To help your party run smoothly and ensure every family enjoys their celebration, please review the important details below.</p>
                  </td>
                </tr>
              </table>

              <!-- Party Schedule -->
              <table cellpadding="0" cellspacing="0" style="${importantStyle}">
                <tr>
                  <td style="${sectionPadding}">
                    <p style="${headingStyle}">⏰ Party Schedule &amp; Timely Departure (Important)</p>
                    <p style="${textStyle}">To keep parties running smoothly throughout the day, we operate on a structured party schedule so our team has time to clean and prepare the space for the next celebration.</p>
                    <p style="${textStyle}">Your party will follow this timeline:</p>

                    <p style="${subheadingStyle}">🎪 Play Time &ndash; 1 Hour 40 Minutes</p>
                    <p style="${textStyle}">Children will enjoy full access to the play area, including the bounce house and music.</p>

                    <p style="${subheadingStyle}">🎉 Celebration Time &ndash; Final 20 Minutes</p>
                    <p style="${textStyle}">The last 20 minutes of your reservation will take place in the private party room for celebration time. You are welcome to bring in your own food, snacks, and drinks. All food and drinks must be consumed in the party room.</p>
                    <p style="${textStyle}">To help make the transition smooth for everyone, the bounce house and music will be turned off during these final 20 minutes while the kids are in the party room. This helps shift everyone toward the celebration portion of the party and ensures we can prepare the play area for the next group.</p>

                    <p style="${subheadingStyle}">👋 Departure</p>
                    <p style="${textStyle}">At the conclusion of celebration time, we kindly ask that children do not re-enter the play area. Please begin gathering belongings and escort guests toward the main lobby for departure so our staff can begin cleaning and preparing the space for the next party.</p>

                    <p style="${subheadingStyle}">🐝 Busy Bee Sticker Stop</p>
                    <p style="${textStyle}">Before heading out, kids are welcome to stop by the front desk near the shoe area to receive a custom Busy Bee sticker. This has become a fun tradition for many of our guests and helps make the transition out of the play area smooth and exciting for the kids.</p>

                    <p style="margin: 16px 0 0; font-size: 14px; color: #854d0e; font-weight: 600; line-height: 1.6;">Your cooperation with the schedule helps us ensure every family gets the same great party experience. Thank you for helping us keep the party flow organized and fun for everyone!</p>
                  </td>
                </tr>
              </table>

              <!-- Arrival & Set-Up -->
              <table cellpadding="0" cellspacing="0" style="${sectionStyle}">
                <tr>
                  <td style="${sectionPadding}">
                    <p style="${headingStyle}">🚪 Arrival &amp; Set-Up</p>
                    <p style="${textStyle}">You may arrive up to 20 minutes before your scheduled start time to begin setting up in the party room.</p>
                    <p style="${textStyle}">Please note that we must adhere to strict time blocks so our staff can properly clean and reset between parties.</p>
                  </td>
                </tr>
              </table>

              <!-- Supplies & Customization -->
              <table cellpadding="0" cellspacing="0" style="${sectionStyle}">
                <tr>
                  <td style="${sectionPadding}">
                    <p style="${headingStyle}">🎨 Supplies &amp; Customization</p>
                    <p style="${textStyle}">Your Queen Bee Party includes "Happy Birthday" themed paper goods (plates, napkins, and utensils).</p>
                    <p style="${textStyle}">If you prefer to bring your own themed tableware, please let us know in advance so we can plan accordingly.</p>
                  </td>
                </tr>
              </table>

              <!-- Food & Decorations -->
              <table cellpadding="0" cellspacing="0" style="${sectionStyle}">
                <tr>
                  <td style="${sectionPadding}">
                    <p style="${headingStyle}">🍽️ Food &amp; Decorations</p>

                    <p style="${subheadingStyle}">Outside Food</p>
                    <p style="${textStyle}">You are welcome to bring outside food to serve in the party room.</p>

                    <p style="${subheadingStyle}">Decorations</p>
                    <p style="${textStyle}">Your package includes decorations but you may also bring in additional decorations if you would like. All decorations must be approved by management. Please note that the use of tape or nails on walls is strictly prohibited. Please remove all decorations from the party room at the conclusion of your party.</p>
                    <table cellpadding="0" cellspacing="0">
                      <tr><td style="${bulletStyle}">&bull; Tape, nails, or adhesives may not be used on walls</td></tr>
                      <tr><td style="${bulletStyle}">&bull; All decorations must be removed at the end of the party</td></tr>
                    </table>

                    <p style="${subheadingStyle}">Entertainment Vendors</p>
                    <p style="${textStyle}">Magicians, characters, or other vendors must be approved by our staff in advance.</p>
                  </td>
                </tr>
              </table>

              <!-- Safety & Facility Guidelines -->
              <table cellpadding="0" cellspacing="0" style="${sectionStyle}">
                <tr>
                  <td style="${sectionPadding}">
                    <p style="${headingStyle}">🛡️ Safety &amp; Facility Guidelines</p>

                    <p style="${subheadingStyle}">Waivers</p>
                    <p style="${textStyle}">All children participating in play must have a signed waiver completed by a parent or legal guardian. They can do this at check-in on the day of the birthday party. We don't require each guest to create an account anymore. We simply collect the guest name, age, and add them to the master waiver of the host.</p>

                    <p style="${subheadingStyle}">Play Rules</p>
                    <p style="${textStyle}">All guests must follow standard Busy Bee play rules during the event.</p>
                  </td>
                </tr>
              </table>

              <!-- Cancellation & Rescheduling Policy -->
              <table cellpadding="0" cellspacing="0" style="${importantStyle}">
                <tr>
                  <td style="${sectionPadding}">
                    <p style="${headingStyle}">📋 Birthday Party Cancellation &amp; Rescheduling Policy</p>
                    <p style="${textStyle}">To prepare properly for your celebration, staff and resources are scheduled in advance.</p>

                    <p style="${subheadingStyle}">Notice Period</p>
                    <p style="${textStyle}">Cancellations or rescheduling requests must be submitted via email at least 7 days prior to the event.</p>

                    <p style="${subheadingStyle}">Less Than 7 Days Notice</p>
                    <p style="${textStyle}">Cancellations made within 7 days of the party will result in the 50% deposit being forfeited.</p>

                    <p style="${subheadingStyle}">Rescheduling</p>
                    <p style="${textStyle}">One complimentary reschedule is allowed if requested at least 7 days prior (subject to availability).</p>
                    <p style="${textStyle}">Rescheduling within the 7-day window may incur a fee of 25% of the total package cost. This is to cover lost revenue on the birthday slot that otherwise would have been available to another family.</p>

                    <p style="${subheadingStyle}">Weather or Emergencies</p>
                    <p style="${textStyle}">In cases of extreme weather or documented emergencies, please contact us as soon as possible and we will do our best to accommodate a new date without penalty.</p>
                  </td>
                </tr>
              </table>

              <!-- Closing -->
              <table cellpadding="0" cellspacing="0" style="${sectionStyle}">
                <tr>
                  <td style="${sectionPadding}">
                    <p style="${textStyle}">Thank you again for choosing Busy Bee's for your celebration. We truly appreciate your business and look forward to hosting a fun and memorable party for your family!</p>
                    <p style="${textStyle}">If you have any questions before the weekend, please don't hesitate to reach out.</p>
                    <p style="margin: 0; font-size: 14px; color: #4b5563; line-height: 1.6;">Warm regards,<br><strong>Busy Bee's Party Team</strong></p>
                  </td>
                </tr>
              </table>`;

    const text = `Thank you for your Purchase!
We're excited to host your Queen Bee Party and look forward to celebrating with you and your guests! To help your party run smoothly and ensure every family enjoys their celebration, please review the important details below.

PARTY SCHEDULE & TIMELY DEPARTURE (Important)
To keep parties running smoothly throughout the day, we operate on a structured party schedule so our team has time to clean and prepare the space for the next celebration.

Your party will follow this timeline:

Play Time - 1 Hour 40 Minutes
Children will enjoy full access to the play area, including the bounce house and music.

Celebration Time - Final 20 Minutes
The last 20 minutes of your reservation will take place in the private party room for celebration time. You are welcome to bring in your own food, snacks, and drinks. All food and drinks must be consumed in the party room.
To help make the transition smooth for everyone, the bounce house and music will be turned off during these final 20 minutes while the kids are in the party room.

Departure
At the conclusion of celebration time, we kindly ask that children do not re-enter the play area. Please begin gathering belongings and escort guests toward the main lobby for departure.

Busy Bee Sticker Stop
Before heading out, kids are welcome to stop by the front desk near the shoe area to receive a custom Busy Bee sticker.

Your cooperation with the schedule helps us ensure every family gets the same great party experience!

ARRIVAL & SET-UP
You may arrive up to 20 minutes before your scheduled start time to begin setting up in the party room.
Please note that we must adhere to strict time blocks so our staff can properly clean and reset between parties.

SUPPLIES & CUSTOMIZATION
Your Queen Bee Party includes "Happy Birthday" themed paper goods (plates, napkins, and utensils).
If you prefer to bring your own themed tableware, please let us know in advance so we can plan accordingly.

FOOD & DECORATIONS
Outside Food: You are welcome to bring outside food to serve in the party room.
Decorations: Your package includes decorations but you may also bring in additional decorations if you would like. All decorations must be approved by management. Please note that the use of tape or nails on walls is strictly prohibited. Please remove all decorations from the party room at the conclusion of your party.
  - Tape, nails, or adhesives may not be used on walls
  - All decorations must be removed at the end of the party
Entertainment Vendors: Magicians, characters, or other vendors must be approved by our staff in advance.

SAFETY & FACILITY GUIDELINES
Waivers: All children participating in play must have a signed waiver completed by a parent or legal guardian. They can do this at check-in on the day of the birthday party.
Play Rules: All guests must follow standard Busy Bee play rules during the event.

BIRTHDAY PARTY CANCELLATION & RESCHEDULING POLICY
Notice Period: Cancellations or rescheduling requests must be submitted via email at least 7 days prior to the event.
Less Than 7 Days Notice: Cancellations made within 7 days of the party will result in the 50% deposit being forfeited.
Rescheduling: One complimentary reschedule is allowed if requested at least 7 days prior (subject to availability). Rescheduling within the 7-day window may incur a fee of 25% of the total package cost. This is to cover lost revenue on the birthday slot that otherwise would have been available to another family.
Weather or Emergencies: In cases of extreme weather or documented emergencies, please contact us as soon as possible and we will do our best to accommodate a new date without penalty.

Thank you again for choosing Busy Bee's for your celebration. We truly appreciate your business and look forward to hosting a fun and memorable party for your family!
If you have any questions before the weekend, please don't hesitate to reach out.

Warm regards,
Busy Bee's Party Team`;

    return { html, text };
  }

  // Default content for group_rate (to be customized later)
  const packageDisplayName = 'Group Rate';

  const html = `
              <!-- What to Bring -->
              <table width="100%" cellpadding="0" cellspacing="0" style="${sectionStyle}">
                <tr>
                  <td style="${sectionPadding}">
                    <p style="${headingStyle}">🎁 What to Bring</p>
                    <table cellpadding="0" cellspacing="0">
                      <tr><td style="${bulletStyle}">✓ Your party guests (we'll handle the rest!)</td></tr>
                      <tr><td style="${bulletStyle}">✓ Any special decorations you'd like to add</td></tr>
                      <tr><td style="${bulletStyle}">✓ A camera for memories! 📸</td></tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Note -->
              <table width="100%" cellpadding="0" cellspacing="0" style="${importantStyle}">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0; font-size: 14px; color: #854d0e;">
                      <strong>📞 We'll call you!</strong> Our team will contact you before the party to confirm final details and answer any questions.
                    </p>
                  </td>
                </tr>
              </table>`;

  const text = `WHAT TO BRING:
• Your party guests (we'll handle the rest!)
• Any special decorations you'd like to add
• A camera for memories!

We'll have everything set up and ready for your ${packageDisplayName} party.
Our team will contact you before the event to confirm details.`;

  return { html, text };
}

export async function sendPartyBookingConfirmationEmail(data: {
  to: string;
  customerName: string;
  childName: string;
  partyDate: string;
  startTime: string;
  endTime: string;
  packageName: string;
  guestCount: number;
  totalPrice: number;
  bookingId: string;
}): Promise<EmailResult> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://busybeesipc.com';

  const subject = `🎂 Party Booking Confirmed - ${data.childName}'s Birthday!`;

  // Use parseDateString to avoid UTC timezone bug for date-only strings
  const formattedDate = parseDateString(data.partyDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Get package-specific content
  const packageContent = getPackageEmailContent(data.packageName);

  // Format package name for display
  const packageLabels: Record<string, string> = {
    queen_bee: 'Queen Bee',
    worker_bee: 'Worker Bee',
    basic_bee: 'Basic Bee',
  };
  const packageDisplay = packageLabels[data.packageName] || data.packageName;

  // Format time for display (convert HH:MM:SS to readable format)
  const formatEmailTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
  };
  const displayStartTime = formatEmailTime(data.startTime);
  const displayEndTime = formatEmailTime(data.endTime);

  // Plain text fallback
  const text = `
Party Booking Confirmed!

Hi ${data.customerName}!

Great news! ${data.childName}'s birthday party is confirmed!

PARTY DETAILS:
Date: ${formattedDate}
Time: ${displayStartTime} - ${displayEndTime}
Package: ${packageDisplay}
Guests: ${data.guestCount}
Total: $${data.totalPrice.toFixed(2)}

Booking Reference: ${data.bookingId}

${packageContent.text}

View your booking: ${siteUrl}/customer/parties

Questions? Reply to this email or call us.

Busy Bees Indoor Play Center
${siteUrl}
`;

  // Branded HTML email — Busy Bees honey/amber palette
  // Uses solid background-color (not gradients) for maximum email client compatibility
  // All colors are explicit hex values (no rgba) for dark mode resilience
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Party Booking Confirmed</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f0e1;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f0e1; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background-color: #d97706; padding: 30px 20px; text-align: center;">
              <div style="width: 70px; height: 70px; background-color: #fef3c7; border-radius: 50%; margin: 0 auto 15px; line-height: 70px; text-align: center;">
                <span style="font-size: 36px;">🎂</span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                Party Confirmed!
              </h1>
              <p style="margin: 10px 0 0; color: #fef3c7; font-size: 16px;">
                ${data.childName}'s Birthday Party
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 30px 25px; background-color: #ffffff;">
              <p style="text-align: center; margin: 0 0 25px; font-size: 16px; color: #4b5563;">
                Hi ${data.customerName}! We're so excited to celebrate with you!
              </p>

              <!-- Party Details Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fffbeb; border: 2px solid #f59e0b; border-radius: 12px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="margin: 0 0 2px; font-size: 10px; color: #92400e; text-transform: uppercase; letter-spacing: 1px;">Party Booking</p>
                          <p style="margin: 0; font-size: 18px; font-weight: 700; color: #78350f;">🐝 ${packageDisplay}</p>
                        </td>
                        <td align="right">
                          <span style="font-size: 24px;">🎉</span>
                        </td>
                      </tr>
                    </table>

                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 15px; background-color: #fef3c7; border-radius: 8px;">
                      <tr>
                        <td style="padding: 15px;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding: 6px 0;">
                                <span style="font-size: 12px; color: #92400e;">📅 Date</span><br>
                                <span style="font-size: 14px; font-weight: 600; color: #78350f;">${formattedDate}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 6px 0;">
                                <span style="font-size: 12px; color: #92400e;">⏰ Time</span><br>
                                <span style="font-size: 14px; font-weight: 600; color: #78350f;">${displayStartTime} - ${displayEndTime}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 6px 0;">
                                <span style="font-size: 12px; color: #92400e;">👥 Guests</span><br>
                                <span style="font-size: 14px; font-weight: 600; color: #78350f;">${data.guestCount} children</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 15px;">
                      <tr>
                        <td>
                          <p style="margin: 0 0 2px; font-size: 10px; color: #92400e; text-transform: uppercase;">Total Paid</p>
                          <p style="margin: 0; font-size: 28px; font-weight: 700; color: #78350f;">$${data.totalPrice.toFixed(2)}</p>
                        </td>
                        <td align="right" style="vertical-align: bottom;">
                          <p style="margin: 0; font-size: 11px; color: #b45309;">Ref: ${data.bookingId.slice(0, 8).toUpperCase()}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Package-specific content -->
${packageContent.html}

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 25px;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${siteUrl}/customer/parties" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="50%" fillcolor="#d97706">
                      <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:bold;">View My Booking</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="${siteUrl}/customer/parties" style="display: inline-block; background-color: #d97706; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 30px;">
                      View My Booking
                    </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #e5e7eb;">
                <tr>
                  <td align="center" style="padding-top: 20px;">
                    <p style="margin: 0 0 5px; font-size: 14px; color: #6b7280;">📍 Busy Bees Indoor Play Center</p>
                    <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">🌐 <a href="${siteUrl}" style="color: #d97706; text-decoration: none;">busybeesipc.com</a></p>
                    <p style="margin: 0; font-size: 12px; color: #9ca3af;">Let's make it a party to remember! 🎈🐝</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  return sendEmail({
    to: data.to,
    cc: BUSINESS_EMAIL,
    subject,
    text,
    html,
  });
}

/**
 * Send check-in confirmation email (when a pass is used)
 */
export async function sendCheckInConfirmationEmail(data: {
  to: string;
  customerName: string;
  childrenNames: string[];
  passName: string;
  checkInTime: string;
  remainingSessions?: number;
  expiryDate?: string;
}): Promise<EmailResult> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://busybeesipc.com';

  const childrenList = data.childrenNames.join(', ');
  const subject = `🐝 Checked In - Have fun, ${data.childrenNames[0]}!`;

  const checkInTimeFormatted = new Date(data.checkInTime).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const sessionInfo = data.remainingSessions !== undefined
    ? data.remainingSessions === 999 ? 'Unlimited visits' : `${data.remainingSessions} visits remaining`
    : '';

  // Plain text fallback
  const text = `
Checked In!

Hi ${data.customerName}!

You're all checked in at Busy Bees! Have a great time!

CHECK-IN DETAILS:
Children: ${childrenList}
Pass: ${data.passName}
Time: ${checkInTimeFormatted}
${sessionInfo ? `Remaining: ${sessionInfo}` : ''}

REMINDERS:
• Socks required in the play area
• Supervise children at all times
• No outside food in play areas
• Have fun! 🎉

See you next time!

Busy Bees Indoor Play Center
${siteUrl}
`;

  // Beautiful HTML email
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Checked In!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); padding: 30px 20px; text-align: center;">
              <div style="width: 70px; height: 70px; background-color: #fef3c7; border-radius: 50%; margin: 0 auto 15px; line-height: 70px;">
                <span style="font-size: 36px;">🐝</span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700;">
                You're Checked In!
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                Have a buzzing good time!
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 30px 25px;">
              <p style="text-align: center; margin: 0 0 25px; font-size: 16px; color: #6b7280;">
                Hi ${data.customerName}! You're all set to play.
              </p>

              <!-- Check-in Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); border-radius: 12px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="margin: 0 0 2px; font-size: 10px; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 1px;">Checked In</p>
                          <p style="margin: 0; font-size: 16px; font-weight: 700; color: #ffffff;">🎟️ ${data.passName}</p>
                        </td>
                        <td align="right">
                          <p style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff;">${checkInTimeFormatted}</p>
                        </td>
                      </tr>
                    </table>

                    <div style="margin: 15px 0 0; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.2);">
                      <p style="margin: 0 0 5px; font-size: 12px; color: rgba(255,255,255,0.8);">👶 Playing Today:</p>
                      <p style="margin: 0; font-size: 16px; font-weight: 600; color: #ffffff;">${childrenList}</p>
                    </div>

                    ${sessionInfo ? `
                    <div style="margin: 15px 0 0; padding: 10px; background-color: rgba(255,255,255,0.15); border-radius: 8px;">
                      <p style="margin: 0; font-size: 14px; color: #ffffff; text-align: center;">
                        📊 ${sessionInfo}
                      </p>
                    </div>
                    ` : ''}
                  </td>
                </tr>
              </table>

              <!-- Reminders -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fefce8; border: 1px solid #fef08a; border-radius: 12px; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 12px; font-size: 16px; font-weight: 600; color: #1f2937;">📋 Quick Reminders</p>
                    <table cellpadding="0" cellspacing="0">
                      <tr><td style="padding: 4px 0; font-size: 14px; color: #4b5563;">🧦 Socks required in the play area</td></tr>
                      <tr><td style="padding: 4px 0; font-size: 14px; color: #4b5563;">👀 Please supervise children at all times</td></tr>
                      <tr><td style="padding: 4px 0; font-size: 14px; color: #4b5563;">🍕 No outside food in play areas</td></tr>
                      <tr><td style="padding: 4px 0; font-size: 14px; color: #4b5563;">🎉 Most importantly - have fun!</td></tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 5px; font-size: 14px; color: #6b7280;">📍 Busy Bees Indoor Play Center</p>
                    <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">🌐 <a href="${siteUrl}" style="color: #f59e0b; text-decoration: none;">busybeesipc.com</a></p>
                    <p style="margin: 0; font-size: 12px; color: #9ca3af;">See you next time! 🐝✨</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  return sendEmail({
    to: data.to,
    subject,
    text,
    html,
  });
}

/**
 * Send refund confirmation email
 */
export async function sendRefundConfirmationEmail(data: {
  to: string;
  customerName: string;
  purchaseName: string;
  refundAmount: number;
  originalAmount: number;
  refundDate: string;
}): Promise<EmailResult> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://busybeesipc.com';

  const subject = `💳 Refund Processed - $${data.refundAmount.toFixed(2)}`;

  const formattedDate = parseDateString(data.refundDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Plain text fallback
  const text = `
Refund Processed

Hi ${data.customerName},

Your refund has been processed.

REFUND DETAILS:
Item: ${data.purchaseName}
Original Amount: $${data.originalAmount.toFixed(2)}
Refund Amount: $${data.refundAmount.toFixed(2)}
Date: ${formattedDate}

The refund will appear on your original payment method within 5-10 business days.

If you have any questions, please reply to this email.

Busy Bees Indoor Play Center
${siteUrl}
`;

  // Beautiful HTML email
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Refund Processed</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px 20px; text-align: center;">
              <div style="width: 60px; height: 60px; background-color: #e0e7ff; border-radius: 50%; margin: 0 auto 15px; line-height: 60px;">
                <span style="font-size: 30px;">💳</span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700;">
                Refund Processed
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 30px 25px;">
              <p style="text-align: center; margin: 0 0 25px; font-size: 16px; color: #6b7280;">
                Hi ${data.customerName}, your refund has been processed.
              </p>

              <!-- Refund Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #818cf8 0%, #6366f1 100%); border-radius: 12px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="margin: 0 0 2px; font-size: 10px; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 1px;">Refund</p>
                          <p style="margin: 0; font-size: 14px; font-weight: 600; color: #ffffff;">${data.purchaseName}</p>
                        </td>
                        <td align="right">
                          <span style="font-size: 24px;">↩️</span>
                        </td>
                      </tr>
                    </table>

                    <div style="margin: 20px 0;">
                      <p style="margin: 0 0 2px; font-size: 10px; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 1px;">Refund Amount</p>
                      <p style="margin: 0; font-size: 36px; font-weight: 700; color: #ffffff;">$${data.refundAmount.toFixed(2)}</p>
                    </div>

                    <div style="padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.2);">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td>
                            <p style="margin: 0; font-size: 12px; color: rgba(255,255,255,0.8);">Original: $${data.originalAmount.toFixed(2)}</p>
                          </td>
                          <td align="right">
                            <p style="margin: 0; font-size: 12px; color: rgba(255,255,255,0.8);">${formattedDate}</p>
                          </td>
                        </tr>
                      </table>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Note -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0; font-size: 14px; color: #0369a1;">
                      <strong>ℹ️ Note:</strong> The refund will appear on your original payment method within 5-10 business days, depending on your bank.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 5px; font-size: 14px; color: #6b7280;">Questions? Reply to this email.</p>
                    <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">🌐 <a href="${siteUrl}" style="color: #6366f1; text-decoration: none;">busybeesipc.com</a></p>
                    <p style="margin: 0; font-size: 12px; color: #9ca3af;">Busy Bees Indoor Play Center 🐝</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  return sendEmail({
    to: data.to,
    subject,
    text,
    html,
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(data: {
  to: string;
  name: string;
  resetToken: string;
}): Promise<EmailResult> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://busybeesipc.com';
  const resetUrl = `${siteUrl}/customer/reset-password?token=${data.resetToken}`;

  const subject = '🔐 Reset Your Busy Bees Password';

  // Plain text fallback
  const text = `
Password Reset Request

Hi ${data.name}!

We received a request to reset your Busy Bees account password.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request this password reset, you can safely ignore this email.
Your password will remain unchanged.

Busy Bees Indoor Play Center
${siteUrl}
`;

  // Beautiful HTML email
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); padding: 30px 20px; text-align: center;">
              <div style="width: 70px; height: 70px; background-color: #fef3c7; border-radius: 50%; margin: 0 auto 15px; line-height: 70px;">
                <span style="font-size: 36px;">🔐</span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                Reset Your Password
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 30px 25px;">
              <p style="text-align: center; margin: 0 0 5px; font-size: 18px; font-weight: 600; color: #1f2937;">
                Hi ${data.name}!
              </p>
              <p style="text-align: center; margin: 0 0 25px; font-size: 15px; color: #6b7280; line-height: 1.5;">
                We received a request to reset your password.<br>
                Click the button below to create a new password.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 10px 0 25px;">
                    <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 30px; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiry Warning -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fefce8; border: 1px solid #fef08a; border-radius: 12px; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0; font-size: 14px; color: #854d0e; text-align: center;">
                      <strong>This link expires in 1 hour.</strong>
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Security Note -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 12px; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0; font-size: 14px; color: #6b7280; text-align: center; line-height: 1.5;">
                      If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Alternative Link -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px;">
                <tr>
                  <td style="padding: 0;">
                    <p style="margin: 0 0 8px; font-size: 12px; color: #9ca3af; text-align: center;">
                      If the button doesn't work, copy and paste this link:
                    </p>
                    <p style="margin: 0; font-size: 11px; color: #6b7280; text-align: center; word-break: break-all;">
                      ${resetUrl}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 5px; font-size: 14px; color: #6b7280;">
                      Busy Bees Indoor Play Center
                    </p>
                    <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">
                      <a href="${siteUrl}" style="color: #f59e0b; text-decoration: none;">busybeesipc.com</a>
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  return sendEmail({
    to: data.to,
    subject,
    text,
    html,
  });
}

/**
 * Payload for a single email in a batch send
 */
export interface BatchEmailPayload {
  to: string;
  subject: string;
  text: string;
  html?: string;
  headers?: Record<string, string>;
}

/**
 * Build newsletter email payload without sending (for batch use)
 */
export function buildNewsletterEmailPayload(data: {
  to: string;
  subscriberName: string;
  subject: string;
  heading: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  subscriberEmail: string;
}): BatchEmailPayload {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://busybeesipc.com';
  const unsubscribeUrl = `${siteUrl}/newsletter/unsubscribe?email=${encodeURIComponent(data.subscriberEmail)}`;

  // Convert newlines in body to HTML paragraphs
  const bodyHtml = data.body
    .split('\n\n')
    .map(paragraph => paragraph.trim())
    .filter(paragraph => paragraph.length > 0)
    .map(paragraph => `<p style="margin: 0 0 16px; font-size: 15px; color: #4b5563; line-height: 1.7;">${paragraph.replace(/\n/g, '<br>')}</p>`)
    .join('');

  // Plain text fallback
  const text = `
${data.heading}

Hi ${data.subscriberName}!

${data.body}

${data.ctaText && data.ctaUrl ? `${data.ctaText}: ${data.ctaUrl}\n` : ''}
---
Busy Bees Indoor Play Center
${siteUrl}

To unsubscribe from our newsletter: ${unsubscribeUrl}
`;

  // Beautiful on-brand HTML newsletter template
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #fffdf7;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fffdf7; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);">

          <!-- Header with honeycomb gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #f59e0b 0%, #f97316 50%, #fbbf24 100%); padding: 40px 30px; text-align: center;">
              <!-- Decorative bees -->
              <div style="margin-bottom: 8px;">
                <span style="font-size: 18px; opacity: 0.7;">&#x2728;</span>
                <span style="font-size: 14px; opacity: 0.5;">&nbsp;</span>
                <span style="font-size: 22px; opacity: 0.8;">&#x2728;</span>
              </div>
              <!-- Bee Logo Circle -->
              <div style="width: 80px; height: 80px; background-color: rgba(255,255,255,0.25); border-radius: 50%; margin: 0 auto 18px; line-height: 80px; border: 3px solid rgba(255,255,255,0.4);">
                <span style="font-size: 40px;">&#x1F41D;</span>
              </div>
              <h1 style="margin: 0 0 8px; color: #ffffff; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.15); line-height: 1.3;">
                ${data.heading}
              </h1>
              <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 14px; letter-spacing: 0.5px;">
                Busy Bees Indoor Play Center
              </p>
            </td>
          </tr>

          <!-- Body content -->
          <tr>
            <td style="padding: 35px 30px 20px;">

              <!-- Greeting -->
              <p style="margin: 0 0 20px; font-size: 17px; font-weight: 600; color: #1f2937;">
                Hi ${data.subscriberName}! &#x1F44B;
              </p>

              <!-- Newsletter Body Content -->
              <div style="margin-bottom: 25px;">
                ${bodyHtml}
              </div>

              ${data.ctaText && data.ctaUrl ? `
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 10px 0 30px;">
                    <a href="${data.ctaUrl}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 36px; border-radius: 30px; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);">
                      ${data.ctaText}
                    </a>
                  </td>
                </tr>
              </table>
              ` : ''}

            </td>
          </tr>

          <!-- Honeycomb divider -->
          <tr>
            <td style="padding: 0 30px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-top: 2px solid #fef3c7;"></td>
                  <td style="width: 60px; text-align: center; padding: 0 10px;">
                    <span style="font-size: 20px;">&#x1F41D;</span>
                  </td>
                  <td style="border-top: 2px solid #fef3c7;"></td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 25px 30px 30px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280;">
                      &#x1F4CD; Busy Bees Indoor Play Center
                    </p>
                    <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280;">
                      &#x1F310; <a href="${siteUrl}" style="color: #f59e0b; text-decoration: none; font-weight: 500;">busybeesipc.com</a>
                    </p>
                    <p style="margin: 0 0 15px; font-size: 13px; color: #9ca3af;">
                      Thank you for being part of our Busy Bees family! &#x1F49B;
                    </p>
                    <p style="margin: 0; font-size: 11px; color: #d1d5db;">
                      <a href="${unsubscribeUrl}" style="color: #d1d5db; text-decoration: underline;">Unsubscribe</a> from our newsletter
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  return {
    to: data.to,
    subject: data.subject,
    text,
    html,
    headers: {
      'List-Unsubscribe': `<${unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  };
}

/**
 * Build a newsletter email payload from pre-built HTML (WYSIWYG editor)
 * Wraps the HTML content with unsubscribe footer
 */
export function buildHtmlNewsletterPayload(data: {
  to: string;
  subject: string;
  html: string;
  subscriberEmail: string;
}): BatchEmailPayload {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://busybeesipc.com';
  const unsubscribeUrl = `${siteUrl}/newsletter/unsubscribe?email=${encodeURIComponent(data.subscriberEmail)}`;

  // Strip text from HTML for plain text fallback
  const text = `${data.subject}\n\nView this email in your browser for the best experience.\n\n---\nBusy Bees Indoor Play Center\n${siteUrl}\n\nTo unsubscribe: ${unsubscribeUrl}`;

  // Inject unsubscribe footer before closing body tag
  const unsubscribeFooter = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
      <tr>
        <td align="center" style="padding: 15px 30px;">
          <p style="margin: 0 0 5px; font-size: 13px; color: #9ca3af; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            Busy Bees Indoor Play Center
          </p>
          <p style="margin: 0; font-size: 11px; color: #d1d5db; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <a href="${unsubscribeUrl}" style="color: #d1d5db; text-decoration: underline;">Unsubscribe</a> from our newsletter
          </p>
        </td>
      </tr>
    </table>`;

  const html = data.html.includes('</body>')
    ? data.html.replace('</body>', `${unsubscribeFooter}</body>`)
    : `${data.html}${unsubscribeFooter}`;

  return {
    to: data.to,
    subject: data.subject,
    text,
    html,
    headers: {
      'List-Unsubscribe': `<${unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  };
}

/**
 * Send a newsletter email to a single subscriber
 */
export async function sendNewsletterEmail(data: {
  to: string;
  subscriberName: string;
  subject: string;
  heading: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  subscriberEmail: string;
}): Promise<EmailResult> {
  const payload = buildNewsletterEmailPayload(data);
  return sendEmail({
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
    headers: payload.headers,
  });
}

/**
 * Send a newsletter email from pre-built HTML (WYSIWYG editor)
 */
export async function sendHtmlNewsletterEmail(data: {
  to: string;
  subject: string;
  html: string;
  subscriberEmail: string;
}): Promise<EmailResult> {
  const payload = buildHtmlNewsletterPayload(data);
  return sendEmail({
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
    headers: payload.headers,
  });
}

/**
 * Send gift card redeemed notification to purchaser
 */
export async function sendGiftCardRedeemedEmail(data: {
  to: string;
  purchaserName: string;
  recipientName: string;
  amount: number;
  redeemedAt: string;
}): Promise<EmailResult> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://busybeesipc.com';
  // Defensively coerce amount - Supabase NUMERIC(10,2) may arrive as string
  const amount = Number(data.amount);

  const subject = `🎁 Your gift card was redeemed!`;

  const formattedDate = parseDateString(data.redeemedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Plain text fallback
  const text = `
Gift Card Redeemed!

Hi ${data.purchaserName}!

Great news! The $${amount.toFixed(2)} gift card you sent to ${data.recipientName} has been redeemed!

Redeemed on: ${formattedDate}

Thank you for sharing the Busy Bees experience!

Busy Bees Indoor Play Center
${siteUrl}
`;

  // Beautiful HTML email
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gift Card Redeemed</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); padding: 30px 20px; text-align: center;">
              <div style="width: 60px; height: 60px; background-color: #fef3c7; border-radius: 50%; margin: 0 auto 15px; line-height: 60px;">
                <span style="font-size: 30px;">🎁</span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700;">
                Gift Card Redeemed!
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 30px 25px;">
              <p style="text-align: center; margin: 0 0 25px; font-size: 16px; color: #6b7280;">
                Hi ${data.purchaserName}! Great news!
              </p>

              <!-- Redeemed Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 12px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <div style="width: 50px; height: 50px; background-color: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 15px; line-height: 50px;">
                      <span style="font-size: 24px;">✓</span>
                    </div>
                    <p style="margin: 0 0 5px; font-size: 14px; color: rgba(255,255,255,0.9);">
                      Your gift card to <strong>${data.recipientName}</strong>
                    </p>
                    <p style="margin: 0; font-size: 32px; font-weight: 700; color: #ffffff;">
                      $${amount.toFixed(2)}
                    </p>
                    <p style="margin: 10px 0 0; font-size: 13px; color: rgba(255,255,255,0.8);">
                      was redeemed on ${formattedDate}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Thank you message -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fefce8; border: 1px solid #fef08a; border-radius: 12px; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 16px 20px; text-align: center;">
                    <p style="margin: 0; font-size: 14px; color: #854d0e;">
                      💛 Thank you for sharing the Busy Bees experience with ${data.recipientName}!
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 5px; font-size: 14px; color: #6b7280;">📍 Busy Bees Indoor Play Center</p>
                    <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">🌐 <a href="${siteUrl}" style="color: #f59e0b; text-decoration: none;">busybeesipc.com</a></p>
                    <p style="margin: 0; font-size: 12px; color: #9ca3af;">Thanks for spreading the buzz! 🐝</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  return sendEmail({
    to: data.to,
    subject,
    text,
    html,
  });
}

/**
 * Send gift card balance reminder to recipient
 */
export async function sendGiftCardReminderEmail(data: {
  to: string;
  giftCard: {
    code: string;
    amount: number;
    remainingAmount: number;
    recipientName: string;
  };
}): Promise<EmailResult> {
  const giftCard = {
    ...data.giftCard,
    amount: Number(data.giftCard.amount),
    remainingAmount: Number(data.giftCard.remainingAmount),
  };
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://busybeesipc.com';

  const subject = `🐝 You have a $${giftCard.remainingAmount.toFixed(2)} Busy Bees Gift Card waiting!`;

  const text = `
Hi ${giftCard.recipientName}!

Just a friendly reminder — you have a Busy Bees Gift Card with a remaining balance!

REMAINING BALANCE: $${giftCard.remainingAmount.toFixed(2)}
ORIGINAL VALUE: $${giftCard.amount.toFixed(2)}
REDEMPTION CODE: ${giftCard.code}

HOW TO REDEEM:
1. Create an account or log in at ${siteUrl}
2. Visit ${siteUrl}/gift-cards
3. Click "Redeem Gift Card"
4. Enter your code: ${giftCard.code}
5. Your credit will be added to your account instantly and can be used toward any purchase — open play sessions, memberships, birthday parties, and more!

This gift card never expires. We'd love to see you at Busy Bees!

Visit us at Busy Bees Indoor Play Center
${siteUrl}
`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Busy Bees Gift Card Reminder</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header with gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); padding: 30px 20px; text-align: center;">
              <div style="width: 60px; height: 60px; background-color: #fef3c7; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 30px;">🐝</span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                Don't Forget Your Gift Card!
              </h1>
            </td>
          </tr>

          <!-- Body content -->
          <tr>
            <td style="padding: 30px 25px;">

              <p style="text-align: center; margin: 0 0 5px; font-size: 18px; font-weight: 600; color: #1f2937;">
                Hi ${giftCard.recipientName}!
              </p>
              <p style="text-align: center; margin: 0 0 25px; font-size: 15px; color: #6b7280;">
                Just a friendly reminder — you have a Busy Bees Gift Card with a remaining balance!
              </p>

              <!-- Gift Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f59e0b; background-image: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); border-radius: 12px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="margin: 0 0 2px; font-size: 10px; color: #78350f; text-transform: uppercase; letter-spacing: 1px;">Gift Card</p>
                          <p style="margin: 0; font-size: 16px; font-weight: 700; color: #78350f;">🎁 BUSY BEES</p>
                        </td>
                        <td align="right">
                          <span style="font-size: 24px;">🐝</span>
                        </td>
                      </tr>
                    </table>

                    <!-- Remaining Balance -->
                    <div style="margin: 20px 0 5px;">
                      <p style="margin: 0 0 2px; font-size: 10px; color: #78350f; text-transform: uppercase; letter-spacing: 1px;">Remaining Balance</p>
                      <p style="margin: 0; font-size: 42px; font-weight: 700; color: #78350f;">$${giftCard.remainingAmount.toFixed(2)}</p>
                    </div>

                    ${giftCard.remainingAmount < giftCard.amount ? `
                    <div style="margin: 0 0 15px;">
                      <p style="margin: 0; font-size: 13px; color: #92400e;">Original value: $${giftCard.amount.toFixed(2)}</p>
                    </div>
                    ` : ''}

                    <!-- Code -->
                    <div>
                      <p style="margin: 0 0 2px; font-size: 10px; color: #78350f; text-transform: uppercase; letter-spacing: 1px;">Redemption Code</p>
                      <p style="margin: 0; font-size: 18px; font-weight: 600; color: #78350f; font-family: monospace; letter-spacing: 1px;">${giftCard.code}</p>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- How to Redeem -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 12px; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 15px; font-size: 16px; font-weight: 600; color: #1f2937;">
                      🎁 How to Redeem
                    </p>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 4px 0; font-size: 14px; color: #4b5563;">
                          <span style="color: #f59e0b; font-weight: 600;">1.</span> Create an account or log in at <a href="${siteUrl}" style="color: #f59e0b; text-decoration: underline;">busybeesipc.com</a>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-size: 14px; color: #4b5563;">
                          <span style="color: #f59e0b; font-weight: 600;">2.</span> Visit <a href="${siteUrl}/gift-cards" style="color: #f59e0b; text-decoration: underline;">busybeesipc.com/gift-cards</a>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-size: 14px; color: #4b5563;">
                          <span style="color: #f59e0b; font-weight: 600;">3.</span> Click "Redeem Gift Card"
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-size: 14px; color: #4b5563;">
                          <span style="color: #f59e0b; font-weight: 600;">4.</span> Enter your code: <strong>${giftCard.code}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-size: 14px; color: #4b5563;">
                          <span style="color: #f59e0b; font-weight: 600;">5.</span> Your credit will be added to your account instantly and can be used toward any purchase — open play sessions, memberships, birthday parties, and more!
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 25px;">
                    <a href="${siteUrl}/gift-cards" style="display: inline-block; background-color: #f59e0b; background-image: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); color: #78350f; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 30px; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);">
                      Redeem Your Gift Card
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 5px; font-size: 14px; color: #6b7280;">
                      📍 Visit us at Busy Bees Indoor Play Center
                    </p>
                    <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">
                      🌐 <a href="${siteUrl}" style="color: #f59e0b; text-decoration: none;">busybeesipc.com</a>
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                      This gift card never expires. Valid for all purchases at Busy Bees.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  return sendEmail({
    to: data.to,
    subject,
    text,
    html,
  });
}

/**
 * Send post-party thank you email with Google review CTA
 * Sent ~24 hours after the party ends
 */
export async function sendPostPartyThankYouEmail(data: {
  to: string;
  customerName: string;
  childName: string;
  packageName: string;
  partyDate?: string;
  startTime?: string;
  endTime?: string;
  basePrice?: number;
  includedKids?: number;
  guests?: Array<{ child_name: string; age: number | null }>;
  extraKidPrice?: number;
  overageCharged?: number;
}): Promise<EmailResult> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://busybeesipc.com';
  const googleReviewUrl = 'https://g.page/r/CbjlkAgAnnOKEBM/review';

  const packageDisplayName = data.packageName === 'queen_bee' ? 'Queen Bee'
    : data.packageName === 'worker_bee' ? 'Worker Bee'
    : data.packageName === 'basic_bee' ? 'Basic Bee'
    : 'Birthday';

  const subject = `🎉 Thanks for celebrating ${data.childName}'s birthday with us!`;

  // Build recap text if guest data is provided
  const hasRecap = data.guests && data.guests.length > 0;
  const includedKids = data.includedKids ?? 15;
  const extraKidPrice = data.extraKidPrice ?? 15;
  const overageKids = hasRecap ? Math.max(0, data.guests!.length - includedKids) : 0;
  const overageCharged = data.overageCharged ?? overageKids * extraKidPrice;
  const basePrice = data.basePrice ?? 0;
  const totalCharged = basePrice + overageCharged;

  const formatEmailTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
  };

  const formattedDate = data.partyDate
    ? parseDateString(data.partyDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  const guestListText = hasRecap
    ? data.guests!.map((g, i) => {
        const marker = i >= includedKids ? ` (+$${extraKidPrice})` : '';
        return `  ${i + 1}. ${g.child_name}${g.age != null ? ` (age ${g.age})` : ''}${marker}`;
      }).join('\n')
    : '';

  const recapText = hasRecap ? `
PARTY RECAP:
Date: ${formattedDate}
Time: ${data.startTime && data.endTime ? `${formatEmailTime(data.startTime)} - ${formatEmailTime(data.endTime)}` : ''}
Package: ${packageDisplayName}

ATTENDEES (${data.guests!.length}):
${guestListText}

RECEIPT:
Package (${packageDisplayName}, ${includedKids} kids included): $${basePrice.toFixed(2)}
${overageKids > 0 ? `Additional children (${overageKids} x $${extraKidPrice}): $${overageCharged.toFixed(2)}\n` : ''}Total Charged: $${totalCharged.toFixed(2)}
` : '';

  const text = `
Hi ${data.customerName}!

Thank you so much for celebrating ${data.childName}'s birthday with us at Busy Bee's! We hope everyone had a wonderful time at the ${packageDisplayName} Party!

It was such a joy having your family here, and we hope the kids had a blast in the play area and party room.
${recapText}
If you have a moment, we'd really appreciate it if you could leave us a quick Google review. Your feedback helps other families discover Busy Bee's and means the world to our small team!

Leave a review: ${googleReviewUrl}

We'd love to see you again — whether it's for open play, a membership, or another birthday celebration!

Warm regards,
Busy Bee's Party Team

Visit us: ${siteUrl}
`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thank You from Busy Bee's!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background-color: #d97706; background-image: linear-gradient(135deg, #d97706 0%, #b45309 100%); padding: 30px 20px; text-align: center;">
              <div style="width: 70px; height: 70px; background-color: #fef3c7; border-radius: 50%; margin: 0 auto 15px; line-height: 70px;">
                <span style="font-size: 36px;">🎉</span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                Thank You!
              </h1>
              <p style="margin: 10px 0 0; color: #fef3c7; font-size: 16px;">
                We loved celebrating with ${data.childName}!
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 30px 25px;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #374151; line-height: 1.6;">
                Hi ${data.customerName}!
              </p>
              <p style="margin: 0 0 20px; font-size: 15px; color: #4b5563; line-height: 1.6;">
                Thank you so much for celebrating ${data.childName}'s birthday with us at Busy Bee's! We hope everyone had a wonderful time at the ${packageDisplayName} Party!
              </p>
              <p style="margin: 0 0 25px; font-size: 15px; color: #4b5563; line-height: 1.6;">
                It was such a joy having your family here, and we hope the kids had a blast in the play area and party room.
              </p>

              ${hasRecap ? `
              <!-- Party Recap -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f3ff; border: 1px solid #e9d5ff; border-radius: 12px; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0 0 4px; font-size: 12px; color: #7c3aed; font-weight: 600; text-transform: uppercase;">Party Details</p>
                    ${formattedDate ? `<p style="margin: 4px 0; font-size: 14px; color: #374151;"><strong>Date:</strong> ${formattedDate}</p>` : ''}
                    ${data.startTime && data.endTime ? `<p style="margin: 4px 0; font-size: 14px; color: #374151;"><strong>Time:</strong> ${formatEmailTime(data.startTime)} - ${formatEmailTime(data.endTime)}</p>` : ''}
                    <p style="margin: 4px 0; font-size: 14px; color: #374151;"><strong>Package:</strong> ${packageDisplayName}</p>
                    <p style="margin: 4px 0; font-size: 14px; color: #374151;"><strong>Total Guests:</strong> ${data.guests!.length}</p>
                  </td>
                </tr>
              </table>

              <!-- Attendee List -->
              <p style="margin: 0 0 8px; font-size: 14px; font-weight: 700; color: #374151;">Attendees (${data.guests!.length})</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-radius: 8px; border: 1px solid #e5e7eb; overflow: hidden; margin-bottom: 20px;">
                <tr style="background-color: #f9fafb;">
                  <th style="padding: 8px 12px; font-size: 12px; color: #6b7280; text-align: left; font-weight: 600;">#</th>
                  <th style="padding: 8px 12px; font-size: 12px; color: #6b7280; text-align: left; font-weight: 600;">Name</th>
                  <th style="padding: 8px 12px; font-size: 12px; color: #6b7280; text-align: left; font-weight: 600;">Age</th>
                  <th style="padding: 8px 12px; font-size: 12px; color: #6b7280; text-align: left; font-weight: 600;">Status</th>
                </tr>
                ${data.guests!.map((g, i) => `
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 8px 12px; font-size: 14px; color: #374151;">${i + 1}</td>
                  <td style="padding: 8px 12px; font-size: 14px; color: #374151;">${g.child_name}</td>
                  <td style="padding: 8px 12px; font-size: 14px; color: #6b7280;">${g.age != null ? g.age : '-'}</td>
                  <td style="padding: 8px 12px; font-size: 14px; color: ${i >= includedKids ? '#dc2626' : '#16a34a'}; font-weight: 600;">${i >= includedKids ? `+$${extraKidPrice}` : 'Included'}</td>
                </tr>`).join('')}
              </table>

              <!-- Receipt -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fefce8; border-radius: 12px; border: 1px solid #fde68a; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0 0 12px; font-size: 12px; color: #92400e; font-weight: 600; text-transform: uppercase;">Receipt</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 4px 0; font-size: 14px; color: #374151;">${packageDisplayName} Package (${includedKids} kids included)</td>
                        <td style="padding: 4px 0; font-size: 14px; color: #374151; text-align: right;">$${basePrice.toFixed(2)}</td>
                      </tr>
                      ${overageKids > 0 ? `
                      <tr>
                        <td style="padding: 4px 0; font-size: 14px; color: #dc2626;">Additional children (${overageKids} × $${extraKidPrice})</td>
                        <td style="padding: 4px 0; font-size: 14px; color: #dc2626; text-align: right;">$${overageCharged.toFixed(2)}</td>
                      </tr>` : ''}
                      <tr><td colspan="2" style="border-top: 2px solid #d97706; padding-top: 8px;"></td></tr>
                      <tr>
                        <td style="padding: 4px 0; font-size: 18px; font-weight: 700; color: #374151;">Total Charged</td>
                        <td style="padding: 4px 0; font-size: 18px; font-weight: 700; color: #374151; text-align: right;">$${totalCharged.toFixed(2)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Google Review CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border: 2px solid #fbbf24; border-radius: 12px; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 25px; text-align: center;">
                    <div style="width: 50px; height: 50px; margin: 0 auto 12px; line-height: 50px;">
                      <span style="font-size: 28px;">⭐</span>
                    </div>
                    <p style="margin: 0 0 8px; font-size: 18px; font-weight: 700; color: #92400e;">
                      Loved your experience?
                    </p>
                    <p style="margin: 0 0 20px; font-size: 14px; color: #78350f; line-height: 1.5;">
                      If you have a moment, we'd really appreciate a quick Google review. Your feedback helps other families discover Busy Bee's and means the world to our small team!
                    </p>
                    <a href="${googleReviewUrl}" style="display: inline-block; background-color: #d97706; background-image: linear-gradient(135deg, #d97706 0%, #b45309 100%); color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 30px; box-shadow: 0 4px 12px rgba(217, 119, 6, 0.4);">
                      ⭐ Leave a Google Review
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Come Back -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fdf2f8; border: 1px solid #fbcfe8; border-radius: 12px; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <p style="margin: 0 0 8px; font-size: 16px; font-weight: 600; color: #1f2937;">
                      🐝 We'd love to see you again!
                    </p>
                    <p style="margin: 0; font-size: 14px; color: #4b5563; line-height: 1.5;">
                      Whether it's for open play, a membership, or another birthday celebration — we're always here for your family!
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 25px;">
                    <a href="${siteUrl}" style="display: inline-block; background-color: #ec4899; background-image: linear-gradient(135deg, #ec4899 0%, #db2777 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 30px; box-shadow: 0 4px 12px rgba(236, 72, 153, 0.4);">
                      Visit Busy Bee's
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 5px; font-size: 14px; color: #4b5563;">
                      Warm regards,
                    </p>
                    <p style="margin: 0 0 10px; font-size: 14px; font-weight: 600; color: #374151;">
                      Busy Bee's Party Team
                    </p>
                    <p style="margin: 0 0 5px; font-size: 14px; color: #6b7280;">📍 Busy Bees Indoor Play Center</p>
                    <p style="margin: 0; font-size: 14px; color: #6b7280;">🌐 <a href="${siteUrl}" style="color: #f59e0b; text-decoration: none;">busybeesipc.com</a></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  return sendEmail({
    to: data.to,
    subject,
    text,
    html,
    cc: BUSINESS_EMAIL,
  });
}

/**
 * Send emails in batches using Resend's batch API
 * Chunks into groups of 100 (Resend's max per batch call)
 */
export async function sendBatchEmails(
  emails: BatchEmailPayload[]
): Promise<{ sent: number; failed: number; errors: Array<{ email: string; error: string }> }> {
  const resend = getResendClient();

  if (!resend) {
    logger.warn('RESEND_API_KEY not configured - batch send skipped');
    return {
      sent: 0,
      failed: emails.length,
      errors: emails.map(e => ({ email: e.to, error: 'Email service not configured' })),
    };
  }

  const BATCH_SIZE = 100;
  let sent = 0;
  let failed = 0;
  const errors: Array<{ email: string; error: string }> = [];

  // Chunk emails into batches of 100
  const chunks: BatchEmailPayload[][] = [];
  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    chunks.push(emails.slice(i, i + BATCH_SIZE));
  }

  logger.info(
    { totalEmails: emails.length, batchCount: chunks.length },
    'Starting batch email send'
  );

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    try {
      const { error } = await resend.batch.send(
        chunk.map(email => ({
          from: FROM_EMAIL,
          to: email.to,
          subject: email.subject,
          text: email.text,
          html: email.html,
          headers: email.headers,
        }))
      );

      if (error) {
        logger.error(
          { error, batchIndex: i, batchSize: chunk.length },
          'Batch email send failed'
        );
        failed += chunk.length;
        chunk.forEach(email => errors.push({ email: email.to, error: error.message }));
      } else {
        sent += chunk.length;
        logger.info(
          { batchIndex: i, batchSize: chunk.length },
          'Batch email send succeeded'
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error, batchIndex: i }, 'Exception during batch email send');
      failed += chunk.length;
      chunk.forEach(email => errors.push({ email: email.to, error: errorMessage }));
      Sentry.captureException(error, {
        tags: { service: 'email', action: 'batch-send' },
        extra: { batchIndex: i, batchSize: chunk.length },
      });
    }

    // Delay between batches to respect rate limits
    if (i < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  logger.info({ sent, failed, total: emails.length }, 'Batch email send complete');

  return { sent, failed, errors };
}

/**
 * Send low stock alert email to business
 */
export async function sendLowStockAlertEmail(data: {
  productName: string;
  currentStock: number;
  threshold: number;
  category?: string;
}): Promise<EmailResult> {
  const { productName, currentStock, threshold, category } = data;

  const stockLabel = currentStock === 0 ? 'OUT OF STOCK' : `${currentStock} remaining`;
  const subject = currentStock === 0
    ? `Out of Stock: ${productName}`
    : `Low Stock Alert: ${productName} (${currentStock} remaining)`;

  const text = [
    `Low Stock Alert for Busy Bees Indoor Play Center`,
    ``,
    `Product: ${productName}`,
    category ? `Category: ${category}` : '',
    `Current Stock: ${stockLabel}`,
    `Alert Threshold: ${threshold}`,
    ``,
    currentStock === 0
      ? `This product is now OUT OF STOCK and has been automatically marked as unavailable.`
      : `Please restock this item soon.`,
    ``,
    `— Busy Bees Inventory System`,
  ].filter(Boolean).join('\n');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
      <div style="background: ${currentStock === 0 ? '#FEE2E2' : '#FEF3C7'}; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
        <h2 style="margin: 0 0 8px; color: ${currentStock === 0 ? '#991B1B' : '#92400E'}; font-size: 18px;">
          ${currentStock === 0 ? '🚨 Out of Stock' : '⚠️ Low Stock Alert'}
        </h2>
        <p style="margin: 0; color: #374151; font-size: 24px; font-weight: bold;">${productName}</p>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Current Stock</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold; color: ${currentStock === 0 ? '#DC2626' : '#D97706'}; font-size: 14px;">${stockLabel}</td>
        </tr>
        ${category ? `<tr><td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Category</td><td style="padding: 8px 0; text-align: right; font-size: 14px;">${category}</td></tr>` : ''}
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Alert Threshold</td>
          <td style="padding: 8px 0; text-align: right; font-size: 14px;">${threshold} units</td>
        </tr>
      </table>
      <p style="color: #6B7280; font-size: 13px; margin: 0;">
        ${currentStock === 0
          ? 'This product has been automatically marked as unavailable in the POS system.'
          : 'Please restock this item at your earliest convenience.'}
      </p>
    </div>
  `;

  return sendEmail({ to: BUSINESS_EMAIL, subject, text, html });
}

/**
 * Send party reminder email 1 week before the party
 */
export async function sendPartyReminderEmail(data: {
  to: string;
  customerName: string;
  childName: string;
  partyDate: string;
  startTime: string;
  endTime: string;
  packageName: string;
  guestCount: number;
}): Promise<EmailResult> {
  const formattedDate = parseDateString(data.partyDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const packageLabels: Record<string, string> = {
    queen_bee: 'Queen Bee',
    worker_bee: 'Worker Bee',
    basic_bee: 'Basic Bee',
  };
  const packageDisplay = packageLabels[data.packageName] || data.packageName;

  const subject = `🎉 ${data.childName}'s Birthday Party is 1 Week Away!`;

  const text = `
Party Reminder - 1 Week Away!

Hi ${data.customerName}!

Just a friendly reminder that ${data.childName}'s ${packageDisplay} birthday party is coming up in 1 week!

Party Details:
- Date: ${formattedDate}
- Time: ${data.startTime} - ${data.endTime}
- Package: ${packageDisplay}
- Guests: ${data.guestCount}

Quick Reminders:
- You may arrive up to 20 minutes before your start time to set up the party room
- Each guest will need to sign a quick waiver upon arrival — it takes less than 10 seconds and then they're all set!
- Socks are required for all children and adults in the play area
- Outside decorations are welcome but must be approved (no confetti, glitter, or loose small items)

If you need to make any changes, please contact us as soon as possible at info@busybeesipc.com or call us directly.

We can't wait to celebrate with you!

- The Busy Bees Team
Busy Bees Indoor Play Center
busybeesipc.com
`.trim();

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 32px 24px; text-align: center; border-radius: 12px 12px 0 0;">
        <p style="font-size: 48px; margin: 0;">🎂</p>
        <h1 style="color: #ffffff; font-size: 24px; margin: 8px 0 4px; font-weight: 700;">1 Week to Go!</h1>
        <p style="color: #fef3c7; font-size: 16px; margin: 0;">${data.childName}'s birthday party is almost here!</p>
      </div>

      <!-- Greeting -->
      <div style="padding: 24px;">
        <p style="font-size: 16px; color: #374151; line-height: 1.6; margin: 0 0 16px;">
          Hi ${data.customerName}! Just a friendly reminder that your ${packageDisplay} party is coming up in <strong>1 week</strong>. Here are your party details:
        </p>
      </div>

      <!-- Party Details Card -->
      <div style="margin: 0 24px 24px; background: #fffbeb; border: 2px solid #fbbf24; border-radius: 12px; padding: 20px;">
        <table cellpadding="0" cellspacing="0" style="width: 100%;">
          <tr>
            <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">📅 Date</td>
            <td style="padding: 8px 0; font-size: 14px; color: #111827; font-weight: 600; text-align: right;">${formattedDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">🕐 Time</td>
            <td style="padding: 8px 0; font-size: 14px; color: #111827; font-weight: 600; text-align: right;">${data.startTime} - ${data.endTime}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">🐝 Package</td>
            <td style="padding: 8px 0; font-size: 14px; color: #111827; font-weight: 600; text-align: right;">${packageDisplay}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">👧 Birthday Child</td>
            <td style="padding: 8px 0; font-size: 14px; color: #111827; font-weight: 600; text-align: right;">${data.childName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">👫 Expected Guests</td>
            <td style="padding: 8px 0; font-size: 14px; color: #111827; font-weight: 600; text-align: right;">${data.guestCount}</td>
          </tr>
        </table>
      </div>

      <!-- Quick Reminders -->
      <div style="margin: 0 24px 24px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px;">
        <p style="font-size: 16px; font-weight: 600; color: #166534; margin: 0 0 12px;">📋 Quick Reminders</p>
        <ul style="margin: 0; padding: 0 0 0 20px; color: #374151; font-size: 14px; line-height: 1.8;">
          <li>You may arrive <strong>30 minutes early</strong> to set up the party room</li>
          <li>Each guest will need to sign a quick <strong>waiver upon arrival</strong> — it takes less than 10 seconds and then they're all set!</li>
          <li><strong>Socks are required</strong> for all children and adults in the play area</li>
          <li>Outside decorations are welcome but must be approved (no confetti, glitter, or loose small items)</li>
          <li>You are welcome to bring your own food, snacks, and drinks for the party room</li>
        </ul>
      </div>

      <!-- Contact CTA -->
      <div style="margin: 0 24px 24px; text-align: center;">
        <p style="font-size: 14px; color: #6b7280; margin: 0 0 12px;">Need to make changes? Contact us as soon as possible.</p>
        <a href="mailto:info@busybeesipc.com" style="display: inline-block; background: #f59e0b; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Contact Us</a>
      </div>

      <!-- Footer -->
      <div style="padding: 20px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 14px; color: #9ca3af; margin: 0;">We can't wait to celebrate with you! 🎉</p>
        <p style="font-size: 12px; color: #d1d5db; margin: 8px 0 0;">Busy Bees Indoor Play Center</p>
      </div>
    </div>
  `;

  return sendEmail({ to: data.to, subject, text, html, cc: BUSINESS_EMAIL });
}

/**
 * Send a party recap email to the party host with attendee list and overage charges
 */
export async function sendPartyRecapEmail(data: {
  to: string;
  customerName: string;
  childName: string;
  partyDate: string;
  startTime: string;
  endTime: string;
  packageName: string;
  basePrice: number;
  includedKids: number;
  guests: Array<{ child_name: string; age: number | null }>;
  extraKidPrice: number;
  overageCharged: number;
}): Promise<EmailResult> {
  const formattedDate = parseDateString(data.partyDate).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const formatEmailTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
  };
  const displayStartTime = formatEmailTime(data.startTime);
  const displayEndTime = formatEmailTime(data.endTime);

  const packageLabels: Record<string, string> = {
    queen_bee: 'Queen Bee', worker_bee: 'Worker Bee', basic_bee: 'Basic Bee',
  };
  const packageDisplay = packageLabels[data.packageName] || data.packageName;

  const overageKids = Math.max(0, data.guests.length - data.includedKids);
  const totalCharged = data.basePrice + data.overageCharged;

  const subject = `🎂 Party Recap - ${data.childName}'s Birthday at Busy Bees`;

  const guestListText = data.guests.map((g, i) => {
    const overageMarker = i >= data.includedKids ? ` (+$${data.extraKidPrice})` : '';
    return `  ${i + 1}. ${g.child_name}${g.age != null ? ` (age ${g.age})` : ''}${overageMarker}`;
  }).join('\n');

  const text = `
Party Recap - ${data.childName}'s Birthday!

Hi ${data.customerName}!

Thank you for celebrating ${data.childName}'s birthday with us at Busy Bees!

PARTY DETAILS:
Date: ${formattedDate}
Time: ${displayStartTime} - ${displayEndTime}
Package: ${packageDisplay}

ATTENDEES (${data.guests.length} total):
${guestListText}

RECEIPT:
Package (${packageDisplay}, ${data.includedKids} kids included): $${data.basePrice.toFixed(2)}
${overageKids > 0 ? `Additional children (${overageKids} x $${data.extraKidPrice}): $${data.overageCharged.toFixed(2)}\n` : ''}Total Charged: $${totalCharged.toFixed(2)}

Thank you for choosing Busy Bees Indoor Play Center!
We hope everyone had a wonderful time! 🎉
`;

  const guestRowsHtml = data.guests.map((g, i) => {
    const isOverage = i >= data.includedKids;
    return `
      <tr style="border-bottom: 1px solid #f3f4f6;">
        <td style="padding: 8px 12px; font-size: 14px; color: #374151;">${i + 1}</td>
        <td style="padding: 8px 12px; font-size: 14px; color: #374151;">${g.child_name}</td>
        <td style="padding: 8px 12px; font-size: 14px; color: #6b7280;">${g.age != null ? g.age : '-'}</td>
        <td style="padding: 8px 12px; font-size: 14px; color: ${isOverage ? '#dc2626' : '#16a34a'}; font-weight: 600;">${isOverage ? `+$${data.extraKidPrice}` : 'Included'}</td>
      </tr>`;
  }).join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Party Recap</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f0e1;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f0e1; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background-color: #7c3aed; padding: 30px 20px; text-align: center;">
              <div style="width: 70px; height: 70px; background-color: #ede9fe; border-radius: 50%; margin: 0 auto 15px; line-height: 70px; text-align: center;">
                <span style="font-size: 36px;">🎂</span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                Party Recap
              </h1>
              <p style="margin: 8px 0 0; color: #e9d5ff; font-size: 16px;">
                ${data.childName}'s Birthday
              </p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 24px 24px 12px;">
              <p style="margin: 0; font-size: 16px; color: #374151;">
                Hi ${data.customerName}!
              </p>
              <p style="margin: 8px 0 0; font-size: 14px; color: #6b7280;">
                Thank you for celebrating ${data.childName}'s birthday with us at Busy Bees! Here's your party recap and receipt.
              </p>
            </td>
          </tr>

          <!-- Party Details -->
          <tr>
            <td style="padding: 12px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f3ff; border-radius: 12px; border: 1px solid #e9d5ff;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0 0 4px; font-size: 12px; color: #7c3aed; font-weight: 600; text-transform: uppercase;">Party Details</p>
                    <p style="margin: 4px 0; font-size: 14px; color: #374151;"><strong>Date:</strong> ${formattedDate}</p>
                    <p style="margin: 4px 0; font-size: 14px; color: #374151;"><strong>Time:</strong> ${displayStartTime} - ${displayEndTime}</p>
                    <p style="margin: 4px 0; font-size: 14px; color: #374151;"><strong>Package:</strong> ${packageDisplay}</p>
                    <p style="margin: 4px 0; font-size: 14px; color: #374151;"><strong>Total Guests:</strong> ${data.guests.length}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Attendee List -->
          <tr>
            <td style="padding: 12px 24px;">
              <p style="margin: 0 0 8px; font-size: 14px; font-weight: 700; color: #374151;">Attendees (${data.guests.length})</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-radius: 8px; border: 1px solid #e5e7eb; overflow: hidden;">
                <tr style="background-color: #f9fafb;">
                  <th style="padding: 8px 12px; font-size: 12px; color: #6b7280; text-align: left; font-weight: 600;">#</th>
                  <th style="padding: 8px 12px; font-size: 12px; color: #6b7280; text-align: left; font-weight: 600;">Name</th>
                  <th style="padding: 8px 12px; font-size: 12px; color: #6b7280; text-align: left; font-weight: 600;">Age</th>
                  <th style="padding: 8px 12px; font-size: 12px; color: #6b7280; text-align: left; font-weight: 600;">Status</th>
                </tr>
                ${guestRowsHtml}
              </table>
            </td>
          </tr>

          <!-- Receipt -->
          <tr>
            <td style="padding: 12px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fefce8; border-radius: 12px; border: 1px solid #fde68a;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0 0 12px; font-size: 12px; color: #92400e; font-weight: 600; text-transform: uppercase;">Receipt</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 4px 0; font-size: 14px; color: #374151;">${packageDisplay} Package (${data.includedKids} kids included)</td>
                        <td style="padding: 4px 0; font-size: 14px; color: #374151; text-align: right;">$${data.basePrice.toFixed(2)}</td>
                      </tr>
                      ${overageKids > 0 ? `
                      <tr>
                        <td style="padding: 4px 0; font-size: 14px; color: #dc2626;">Additional children (${overageKids} × $${data.extraKidPrice})</td>
                        <td style="padding: 4px 0; font-size: 14px; color: #dc2626; text-align: right;">$${data.overageCharged.toFixed(2)}</td>
                      </tr>` : ''}
                      <tr>
                        <td colspan="2" style="border-top: 2px solid #d97706; padding-top: 8px; margin-top: 8px;"></td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-size: 18px; font-weight: 700; color: #374151;">Total Charged</td>
                        <td style="padding: 4px 0; font-size: 18px; font-weight: 700; color: #374151; text-align: right;">$${totalCharged.toFixed(2)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="font-size: 14px; color: #6b7280; margin: 0;">We hope everyone had a wonderful time! 🎉</p>
              <p style="font-size: 12px; color: #9ca3af; margin: 8px 0 0;">Busy Bees Indoor Play Center</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return sendEmail({ to: data.to, subject, text, html, cc: BUSINESS_EMAIL });
}

/**
 * Send a birthday promo email to parents 45 days before their child's birthday
 */
export async function sendBirthdayPromoEmail(data: {
  to: string;
  parentName: string;
  childName: string;
  childAge: number;
}): Promise<EmailResult> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://busybeesipc.com';
  const bookPartyUrl = `${siteUrl}/customer/dashboard?tab=parties`;
  const turningAge = data.childAge + 1;

  const subject = `🎂 ${data.childName}'s birthday is coming up!`;

  const text = `
Hi ${data.parentName}!

${data.childName}'s birthday is right around the corner, and we'd love to be part of the celebration!

At Busy Bees Indoor Play Center, we take the stress out of party planning so you can focus on what matters most — celebrating your little one. From setup to cleanup, our dedicated party hosts handle everything while the kids have a blast in our play areas.

Our party packages include:
- 2 hours of private party fun
- Dedicated party host
- Up to 15-20 kids (depending on package)
- Play area, cafe, and party room access
- Paper goods and decorations (select packages)

Book ${data.childName}'s party today: ${bookPartyUrl}

We can't wait to help make ${data.childName}'s birthday unforgettable!

Warm regards,
The Busy Bees Party Team

Visit us: ${siteUrl}
`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.childName}'s Birthday is Coming!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f0e1;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f0e1; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background-color: #d97706; padding: 30px 20px; text-align: center;">
              <div style="width: 70px; height: 70px; background-color: #fef3c7; border-radius: 50%; margin: 0 auto 15px; line-height: 70px; text-align: center;">
                <span style="font-size: 36px;">🎂</span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                ${data.childName}'s Birthday is Coming!
              </h1>
              <p style="margin: 8px 0 0; color: #fef3c7; font-size: 16px;">
                ${turningAge > 0 ? `Turning ${turningAge} soon` : 'A special day is approaching'}
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 30px 25px;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #374151; line-height: 1.6;">
                Hi ${data.parentName}!
              </p>
              <p style="margin: 0 0 20px; font-size: 15px; color: #4b5563; line-height: 1.6;">
                ${data.childName}'s birthday is right around the corner, and we'd love to be considered for the celebration!
              </p>
              <p style="margin: 0 0 25px; font-size: 15px; color: #4b5563; line-height: 1.6;">
                At Busy Bees Indoor Play Center, we take the stress out of party planning so you can focus on what matters most — celebrating your little one. From setup to cleanup, our dedicated party hosts handle everything while the kids have a blast!
              </p>

              <!-- What's Included -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fefce8; border: 1px solid #fde68a; border-radius: 12px; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 12px; font-size: 16px; font-weight: 700; color: #92400e;">🐝 Our Party Packages Include:</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr><td style="padding: 4px 0 4px 8px; font-size: 14px; color: #374151;">✓ 2 hours of private party fun</td></tr>
                      <tr><td style="padding: 4px 0 4px 8px; font-size: 14px; color: #374151;">✓ Dedicated party host</td></tr>
                      <tr><td style="padding: 4px 0 4px 8px; font-size: 14px; color: #374151;">✓ Up to 15-20 kids (depending on package)</td></tr>
                      <tr><td style="padding: 4px 0 4px 8px; font-size: 14px; color: #374151;">✓ Play area, cafe & party room access</td></tr>
                      <tr><td style="padding: 4px 0 4px 8px; font-size: 14px; color: #374151;">✓ Paper goods & decorations (select packages)</td></tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px;">
                <tr>
                  <td align="center">
                    <a href="${bookPartyUrl}" style="display: inline-block; background-color: #d97706; color: #ffffff; font-size: 18px; font-weight: 700; text-decoration: none; padding: 16px 40px; border-radius: 30px;">
                      🎉 Book ${data.childName}'s Party
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 20px; font-size: 15px; color: #4b5563; line-height: 1.6; text-align: center;">
                We can't wait to help make ${data.childName}'s birthday unforgettable!
              </p>

              <!-- Footer -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 5px; font-size: 14px; color: #4b5563;">Warm regards,</p>
                    <p style="margin: 0 0 10px; font-size: 14px; font-weight: 600; color: #374151;">The Busy Bees Party Team</p>
                    <p style="margin: 0 0 5px; font-size: 14px; color: #6b7280;">📍 Busy Bees Indoor Play Center</p>
                    <p style="margin: 0; font-size: 14px; color: #6b7280;">🌐 <a href="${siteUrl}" style="color: #f59e0b; text-decoration: none;">busybeesipc.com</a></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return sendEmail({ to: data.to, subject, text, html, cc: BUSINESS_EMAIL });
}
