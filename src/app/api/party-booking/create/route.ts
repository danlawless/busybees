/**
 * Party Booking Creation API Route
 * Creates a new party booking and returns a Stripe checkout URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPartyBooking, updateBookingWithStripeSession } from '@/lib/services/party-bookings';
import { CompleteBookingSchema, calculateBookingPrice, PACKAGE_PRICING } from '@/lib/validations/party-booking';
import { createCheckoutSession } from '@/lib/stripe/checkout';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate the request body
    const validationResult = CompleteBookingSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    const bookingData = validationResult.data;

    // Check if user is logged in
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const customerId = user?.id;

    // Create the booking in the database
    const booking = await createPartyBooking(bookingData, customerId);

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

    const partyDate = new Date(bookingData.partyDate + 'T00:00:00');
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
    const tempCustomerId = customerId || `temp_${booking.id}`;

    // Create Stripe checkout session
    const checkoutSession = await createCheckoutSession({
      customerId: tempCustomerId,
      customerEmail: bookingData.customerEmail,
      customerName: bookingData.customerName,
      customerPhone: bookingData.customerPhone,
      lineItems,
      metadata: {
        purchase_type: 'party_package',
        product_id: booking.id,
        booking_id: booking.id,
        party_date: bookingData.partyDate,
        party_time: `${bookingData.startTime}-${bookingData.endTime}`,
        party_guests: bookingData.guestCount.toString(),
        party_notes: bookingData.notes || '',
        child_name: bookingData.childName,
        package_name: bookingData.packageName,
        party_type: bookingData.partyType,
      },
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/parties/success?booking_id=${booking.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/parties?cancelled=true`,
    });

    // Update booking with Stripe session ID
    await updateBookingWithStripeSession(booking.id, checkoutSession.id);

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
  } catch (error) {
    console.error('Party booking creation error:', error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('no longer available')) {
        return NextResponse.json(
          { error: 'This time slot is no longer available. Please select another time.' },
          { status: 409 }
        );
      }
      if (error.message.includes('1 week in advance')) {
        return NextResponse.json(
          { error: 'Parties must be booked at least 1 week in advance.' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to create party booking. Please try again.' },
      { status: 500 }
    );
  }
}
