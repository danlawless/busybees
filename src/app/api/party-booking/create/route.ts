/**
 * Party Booking Creation API Route
 * Creates a new party booking and returns a Stripe checkout URL
 */

import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createPartyBooking, updateBookingWithStripeSession } from '@/lib/services/party-bookings';
import { CompleteBookingSchema, calculateBookingPrice, PACKAGE_PRICING } from '@/lib/validations/party-booking';
import { createCheckoutSession } from '@/lib/stripe/checkout';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { parseDateString } from '@/lib/utils';

export async function POST(request: NextRequest) {
  let bookingId: string | undefined;
  let logContext: Record<string, unknown> = {};

  try {
    const body = await request.json();

    // Validate the request body
    const validationResult = CompleteBookingSchema.safeParse(body);
    if (!validationResult.success) {
      const validationErrors = validationResult.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      logger.warn(
        { validationErrors, bodyKeys: Object.keys(body) },
        '❌ Party booking validation failed'
      );

      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationErrors,
        },
        { status: 400 }
      );
    }

    const bookingData = validationResult.data;

    // Check if user is logged in
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const customerId = user?.id;
    const isGuestUser = !customerId;

    logContext = {
      customerEmail: bookingData.customerEmail,
      packageName: bookingData.packageName,
      partyDate: bookingData.partyDate,
      partyType: bookingData.partyType,
      guestCount: bookingData.guestCount,
      isGuestUser,
      userId: customerId,
    };

    logger.info(logContext, '🎉 Creating party booking');

    // Create the booking in the database
    try {
      const booking = await createPartyBooking(bookingData, customerId);
      bookingId = booking.id;
      logContext.bookingId = bookingId;

      logger.info(
        { ...logContext, bookingId },
        '💾 Party booking created in database'
      );
    } catch (bookingError) {
      logger.error(
        { ...logContext, error: bookingError },
        '❌ Failed to create party booking in database'
      );

      Sentry.captureException(bookingError, {
        tags: { operation: 'party_booking.create' },
        extra: logContext,
      });

      // Handle specific booking errors
      if (bookingError instanceof Error) {
        if (bookingError.message.includes('no longer available')) {
          return NextResponse.json(
            { error: 'This time slot is no longer available. Please select another time.' },
            { status: 409 }
          );
        }
        if (bookingError.message.includes('1 week in advance')) {
          return NextResponse.json(
            { error: 'Parties must be booked at least 1 week in advance.' },
            { status: 400 }
          );
        }
      }

      throw bookingError;
    }

    // Calculate pricing for Stripe
    const pricing = calculateBookingPrice(
      bookingData.packageName,
      bookingData.partyType,
      bookingData.guestCount
    );
    const packageInfo = PACKAGE_PRICING[bookingData.packageName];

    // Format date and time for display
    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `${displayHour}:${minutes} ${ampm}`;
    };

    const partyDate = parseDateString(bookingData.partyDate);
    const formattedDate = partyDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    // Build line items for Stripe
    const lineItems = [
      {
        price: pricing.basePrice,
        quantity: 1,
        name: `${packageInfo.name} Party Package`,
        description: `${bookingData.partyType === 'private' ? 'Private' : 'Semi-Private'} party on ${formattedDate} at ${formatTime(bookingData.startTime)}`,
      },
    ];

    // Add additional kids if any
    if (pricing.additionalKids > 0) {
      lineItems.push({
        price: 15, // $15 per additional kid
        quantity: pricing.additionalKids,
        name: 'Additional Children',
        description: `Extra children beyond the included 15`,
      });
    }

    // Get or create a temporary customer ID for non-logged-in users
    const tempCustomerId = customerId || `temp_${bookingId}`;

    logger.info(
      { ...logContext, tempCustomerId, totalAmount: pricing.totalPrice },
      '💳 Creating Stripe checkout session'
    );

    // Create Stripe checkout session
    let checkoutSession;
    try {
      checkoutSession = await createCheckoutSession({
        customerId: tempCustomerId,
        customerEmail: bookingData.customerEmail,
        customerName: bookingData.customerName,
        customerPhone: bookingData.customerPhone,
        lineItems,
        metadata: {
          purchase_type: 'party_package',
          product_id: bookingId,
          booking_id: bookingId,
          party_date: bookingData.partyDate,
          party_time: `${bookingData.startTime}-${bookingData.endTime}`,
          party_guests: bookingData.guestCount.toString(),
          party_notes: bookingData.notes || '',
          child_name: bookingData.childName,
          package_name: bookingData.packageName,
          party_type: bookingData.partyType,
        },
        successUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/parties/success?booking_id=${bookingId}&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/parties?cancelled=true`,
      });

      logger.info(
        { ...logContext, sessionId: checkoutSession.id },
        '✅ Stripe checkout session created'
      );
    } catch (checkoutError) {
      logger.error(
        { ...logContext, error: checkoutError },
        '❌ Failed to create Stripe checkout session'
      );

      Sentry.captureException(checkoutError, {
        tags: { operation: 'party_booking.checkout' },
        extra: { ...logContext, tempCustomerId },
      });

      // Return user-friendly error
      return NextResponse.json(
        { error: 'Unable to initiate payment. Please try again or contact support.' },
        { status: 500 }
      );
    }

    // Update booking with Stripe session ID
    try {
      await updateBookingWithStripeSession(bookingId, checkoutSession.id);

      logger.info(
        { ...logContext, sessionId: checkoutSession.id },
        '💾 Updated booking with Stripe session ID'
      );
    } catch (updateError) {
      // Log but don't fail - the checkout session is already created
      logger.warn(
        { ...logContext, sessionId: checkoutSession.id, error: updateError },
        '⚠️ Failed to update booking with session ID, but checkout created successfully'
      );

      Sentry.captureException(updateError, {
        level: 'warning',
        tags: { operation: 'party_booking.update_session' },
        extra: { ...logContext, sessionId: checkoutSession.id },
      });
    }

    logger.info(
      { ...logContext, sessionId: checkoutSession.id, checkoutUrl: checkoutSession.url },
      '🎊 Party booking flow completed successfully'
    );

    return NextResponse.json({
      success: true,
      bookingId,
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
  } catch (error) {
    logger.error(
      { ...logContext, error },
      '💥 Unexpected error in party booking creation'
    );

    Sentry.captureException(error, {
      tags: { operation: 'party_booking.create', critical: 'true' },
      extra: logContext,
    });

    return NextResponse.json(
      { error: 'Failed to create party booking. Please try again.' },
      { status: 500 }
    );
  }
}
