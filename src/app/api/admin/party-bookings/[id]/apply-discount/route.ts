/**
 * API Route: Apply/Remove Staff Discount to Party Booking
 * POST - Apply a staff-only discount
 * DELETE - Remove the applied discount
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createCheckoutSession, expireCheckoutSession } from '@/lib/stripe/checkout';
import { logger } from '@/lib/logger';
import { parseDateString } from '@/lib/utils';
import { PACKAGE_PRICING } from '@/lib/validations/party-booking';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST - Apply a staff-only discount to a party booking
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: bookingId } = await context.params;
    const supabase = await createClient();

    // Verify user is staff/admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id, role, name')
      .eq('id', user.id)
      .single();

    if (!userData || !['staff', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { promo_id } = body;

    if (!promo_id) {
      return NextResponse.json({ error: 'promo_id is required' }, { status: 400 });
    }

    // Get the booking
    const { data: booking, error: bookingError } = await supabase
      .from('party_bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Validate booking is pending and unpaid
    if (booking.status !== 'pending') {
      return NextResponse.json(
        { error: 'Can only apply discounts to pending bookings' },
        { status: 400 }
      );
    }

    if (booking.payment_status === 'paid') {
      return NextResponse.json(
        { error: 'Cannot apply discount to a paid booking' },
        { status: 400 }
      );
    }

    // Get the promo/discount
    const { data: promo, error: promoError } = await supabase
      .from('promos')
      .select('*')
      .eq('id', promo_id)
      .eq('is_staff_only', true)
      .eq('is_active', true)
      .single();

    if (promoError || !promo) {
      return NextResponse.json({ error: 'Staff discount not found or inactive' }, { status: 404 });
    }

    // Calculate the discount
    const originalTotal = booking.total_price;
    const discountAmount = (originalTotal * promo.discount_percent) / 100;
    const discountedTotal = originalTotal - discountAmount;

    logger.info({
      bookingId,
      promoId: promo_id,
      originalTotal,
      discountPercent: promo.discount_percent,
      discountAmount,
      discountedTotal,
      staffUserId: user.id,
    }, 'Applying staff discount to booking');

    // Expire the old checkout session if it exists
    if (booking.stripe_checkout_session_id) {
      try {
        await expireCheckoutSession(booking.stripe_checkout_session_id);
        logger.info({ sessionId: booking.stripe_checkout_session_id }, 'Expired old checkout session');
      } catch {
        // Session may already be expired or completed - continue anyway
        logger.warn({ sessionId: booking.stripe_checkout_session_id }, 'Could not expire old session');
      }
    }

    // Build line items for the new checkout session
    const packageInfo = PACKAGE_PRICING[booking.package_name as keyof typeof PACKAGE_PRICING];

    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `${displayHour}:${minutes} ${ampm}`;
    };

    const partyDate = parseDateString(booking.party_date);
    const formattedDate = partyDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    const lineItems = [
      {
        price: booking.base_price,
        quantity: 1,
        name: `${packageInfo?.name || booking.package_name} Party Package`,
        description: `${booking.party_type === 'private' ? 'Private' : 'Semi-Private'} party on ${formattedDate} at ${formatTime(booking.start_time)}`,
      },
    ];

    // Add additional kids if any
    if (booking.additional_kids > 0) {
      lineItems.push({
        price: 15,
        quantity: booking.additional_kids,
        name: 'Additional Children',
        description: 'Extra children beyond the included 15',
      });
    }

    // Create new checkout session with the discount pre-applied
    const checkoutSession = await createCheckoutSession({
      customerId: booking.customer_id || `temp_${bookingId}`,
      customerEmail: booking.customer_email,
      customerName: booking.customer_name,
      customerPhone: booking.customer_phone,
      lineItems,
      metadata: {
        purchase_type: 'party_package',
        product_id: bookingId,
        booking_id: bookingId,
        party_date: booking.party_date,
        party_time: `${booking.start_time}-${booking.end_time}`,
        party_guests: booking.guest_count.toString(),
        party_notes: booking.notes || '',
        child_name: booking.child_name,
        package_name: booking.package_name,
        party_type: booking.party_type,
        staff_discount_applied: 'true',
        promo_id: promo_id,
        applied_by: user.id,
      },
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/parties/success?booking_id=${bookingId}&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/parties?cancelled=true`,
      discounts: [{ coupon: promo.stripe_coupon_id! }],
    });

    logger.info({ sessionId: checkoutSession.id }, 'Created new checkout session with discount');

    // Update the booking with discount info and new checkout session
    const { data: updatedBooking, error: updateError } = await supabase
      .from('party_bookings')
      .update({
        applied_promo_id: promo_id,
        discount_amount: discountAmount,
        discount_percent: promo.discount_percent,
        discount_applied_by: user.id,
        discount_applied_at: new Date().toISOString(),
        stripe_checkout_session_id: checkoutSession.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (updateError) {
      logger.error({ error: updateError, bookingId }, 'Failed to update booking with discount');
      throw updateError;
    }

    logger.info({
      bookingId,
      promoName: promo.name,
      discountPercent: promo.discount_percent,
      appliedBy: userData.name,
    }, 'Staff discount applied successfully');

    return NextResponse.json({
      success: true,
      booking: updatedBooking,
      checkoutUrl: checkoutSession.url,
      discount: {
        name: promo.name,
        percent: promo.discount_percent,
        amount: discountAmount,
        appliedBy: userData.name,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Error applying staff discount');
    return NextResponse.json(
      { error: 'Failed to apply discount', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove the applied discount from a party booking
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id: bookingId } = await context.params;
    const supabase = await createClient();

    // Verify user is staff/admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (!userData || !['staff', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the booking
    const { data: booking, error: bookingError } = await supabase
      .from('party_bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Validate booking has a discount and is still pending
    if (!booking.applied_promo_id) {
      return NextResponse.json(
        { error: 'No discount applied to this booking' },
        { status: 400 }
      );
    }

    if (booking.status !== 'pending') {
      return NextResponse.json(
        { error: 'Can only remove discounts from pending bookings' },
        { status: 400 }
      );
    }

    if (booking.payment_status === 'paid') {
      return NextResponse.json(
        { error: 'Cannot remove discount from a paid booking' },
        { status: 400 }
      );
    }

    logger.info({ bookingId, promoId: booking.applied_promo_id }, 'Removing staff discount from booking');

    // Expire the current checkout session
    if (booking.stripe_checkout_session_id) {
      try {
        await expireCheckoutSession(booking.stripe_checkout_session_id);
      } catch {
        logger.warn({ sessionId: booking.stripe_checkout_session_id }, 'Could not expire session');
      }
    }

    // Recreate checkout session without discount
    const packageInfo = PACKAGE_PRICING[booking.package_name as keyof typeof PACKAGE_PRICING];

    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `${displayHour}:${minutes} ${ampm}`;
    };

    const partyDate = parseDateString(booking.party_date);
    const formattedDate = partyDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    const lineItems = [
      {
        price: booking.base_price,
        quantity: 1,
        name: `${packageInfo?.name || booking.package_name} Party Package`,
        description: `${booking.party_type === 'private' ? 'Private' : 'Semi-Private'} party on ${formattedDate} at ${formatTime(booking.start_time)}`,
      },
    ];

    if (booking.additional_kids > 0) {
      lineItems.push({
        price: 15,
        quantity: booking.additional_kids,
        name: 'Additional Children',
        description: 'Extra children beyond the included 15',
      });
    }

    const checkoutSession = await createCheckoutSession({
      customerId: booking.customer_id || `temp_${bookingId}`,
      customerEmail: booking.customer_email,
      customerName: booking.customer_name,
      customerPhone: booking.customer_phone,
      lineItems,
      metadata: {
        purchase_type: 'party_package',
        product_id: bookingId,
        booking_id: bookingId,
        party_date: booking.party_date,
        party_time: `${booking.start_time}-${booking.end_time}`,
        party_guests: booking.guest_count.toString(),
        party_notes: booking.notes || '',
        child_name: booking.child_name,
        package_name: booking.package_name,
        party_type: booking.party_type,
      },
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/parties/success?booking_id=${bookingId}&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/parties?cancelled=true`,
    });

    // Update booking to remove discount info
    const { data: updatedBooking, error: updateError } = await supabase
      .from('party_bookings')
      .update({
        applied_promo_id: null,
        discount_amount: 0,
        discount_percent: 0,
        discount_applied_by: null,
        discount_applied_at: null,
        stripe_checkout_session_id: checkoutSession.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (updateError) {
      logger.error({ error: updateError, bookingId }, 'Failed to update booking');
      throw updateError;
    }

    logger.info({ bookingId }, 'Staff discount removed successfully');

    return NextResponse.json({
      success: true,
      booking: updatedBooking,
      checkoutUrl: checkoutSession.url,
    });
  } catch (error) {
    logger.error({ error }, 'Error removing staff discount');
    return NextResponse.json(
      { error: 'Failed to remove discount', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
