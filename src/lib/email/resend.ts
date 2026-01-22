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
  html?: string;
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
  const { to, subject, text, html, replyTo } = options;

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
      html,
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
    ? new Date(data.expiryDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
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

  const formattedDate = new Date(data.partyDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Plain text fallback
  const text = `
Party Booking Confirmed!

Hi ${data.customerName}!

Great news! ${data.childName}'s birthday party is confirmed!

PARTY DETAILS:
Date: ${formattedDate}
Time: ${data.startTime} - ${data.endTime}
Package: ${data.packageName}
Guests: ${data.guestCount}
Total: $${data.totalPrice.toFixed(2)}

Booking Reference: ${data.bookingId}

WHAT TO BRING:
• Your party guests (we'll handle the rest!)
• Any special decorations you'd like to add
• A camera for memories!

We'll have everything set up and ready for your party.
Our team will contact you before the event to confirm details.

View your booking: ${siteUrl}/customer/parties

Questions? Reply to this email or call us.

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
  <title>Party Booking Confirmed</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ec4899 0%, #db2777 100%); padding: 30px 20px; text-align: center;">
              <div style="width: 70px; height: 70px; background-color: #fce7f3; border-radius: 50%; margin: 0 auto 15px; line-height: 70px;">
                <span style="font-size: 36px;">🎂</span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                Party Confirmed!
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                ${data.childName}'s Birthday Party
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 30px 25px;">
              <p style="text-align: center; margin: 0 0 25px; font-size: 16px; color: #6b7280;">
                Hi ${data.customerName}! We're so excited to celebrate with you!
              </p>

              <!-- Party Details Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #f472b6 0%, #ec4899 100%); border-radius: 12px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="margin: 0 0 2px; font-size: 10px; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 1px;">Party Booking</p>
                          <p style="margin: 0; font-size: 16px; font-weight: 700; color: #ffffff;">🎈 ${data.packageName}</p>
                        </td>
                        <td align="right">
                          <span style="font-size: 24px;">🎉</span>
                        </td>
                      </tr>
                    </table>

                    <div style="margin: 15px 0; padding: 15px; background-color: rgba(255,255,255,0.15); border-radius: 8px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding: 5px 0;">
                            <span style="font-size: 12px; color: rgba(255,255,255,0.8);">📅 Date</span><br>
                            <span style="font-size: 14px; font-weight: 600; color: #ffffff;">${formattedDate}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 5px 0;">
                            <span style="font-size: 12px; color: rgba(255,255,255,0.8);">⏰ Time</span><br>
                            <span style="font-size: 14px; font-weight: 600; color: #ffffff;">${data.startTime} - ${data.endTime}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 5px 0;">
                            <span style="font-size: 12px; color: rgba(255,255,255,0.8);">👥 Guests</span><br>
                            <span style="font-size: 14px; font-weight: 600; color: #ffffff;">${data.guestCount} children</span>
                          </td>
                        </tr>
                      </table>
                    </div>

                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="margin: 0 0 2px; font-size: 10px; color: rgba(255,255,255,0.8); text-transform: uppercase;">Total Paid</p>
                          <p style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">$${data.totalPrice.toFixed(2)}</p>
                        </td>
                        <td align="right" style="vertical-align: bottom;">
                          <p style="margin: 0; font-size: 11px; color: rgba(255,255,255,0.7);">Ref: ${data.bookingId.slice(0, 8).toUpperCase()}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- What to Bring -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fdf2f8; border: 1px solid #fbcfe8; border-radius: 12px; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 12px; font-size: 16px; font-weight: 600; color: #1f2937;">🎁 What to Bring</p>
                    <table cellpadding="0" cellspacing="0">
                      <tr><td style="padding: 4px 0; font-size: 14px; color: #4b5563;">✓ Your party guests (we'll handle the rest!)</td></tr>
                      <tr><td style="padding: 4px 0; font-size: 14px; color: #4b5563;">✓ Any special decorations you'd like to add</td></tr>
                      <tr><td style="padding: 4px 0; font-size: 14px; color: #4b5563;">✓ A camera for memories! 📸</td></tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Note -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fefce8; border: 1px solid #fef08a; border-radius: 12px; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0; font-size: 14px; color: #854d0e;">
                      <strong>📞 We'll call you!</strong> Our team will contact you before the party to confirm final details and answer any questions.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 25px;">
                    <a href="${siteUrl}/customer/parties" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #db2777 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 30px; box-shadow: 0 4px 12px rgba(236, 72, 153, 0.4);">
                      View My Booking
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 5px; font-size: 14px; color: #6b7280;">📍 Busy Bees Indoor Play Center</p>
                    <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">🌐 <a href="${siteUrl}" style="color: #ec4899; text-decoration: none;">busybeesipc.com</a></p>
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

  const formattedDate = new Date(data.refundDate).toLocaleDateString('en-US', {
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

  const subject = `🎁 Your gift card was redeemed!`;

  const formattedDate = new Date(data.redeemedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Plain text fallback
  const text = `
Gift Card Redeemed!

Hi ${data.purchaserName}!

Great news! The $${data.amount.toFixed(2)} gift card you sent to ${data.recipientName} has been redeemed!

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
                      $${data.amount.toFixed(2)}
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
