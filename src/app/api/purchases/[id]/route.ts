/**
 * API Route: Individual Purchase Operations
 * PUT/PATCH - Update a purchase (party scheduling)
 * GET - Get a single purchase
 *
 * Supports scheduling party packages from customer dashboard.
 * When a party is scheduled, this also syncs to party_bookings table
 * so the booking appears in the admin POS module.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getPurchase, updatePurchase } from '@/lib/services/purchases';
import { createOrUpdateBookingFromPurchase } from '@/lib/services/party-bookings';
import { sendPartyBookingConfirmationEmail } from '@/lib/email/resend';
import { logger } from '@/lib/logger';

// Validation schema for party scheduling updates
const partyScheduleSchema = z.object({
  party_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (expected YYYY-MM-DD)'),
  party_start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format (expected HH:MM or HH:MM:SS)'),
  party_end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format (expected HH:MM or HH:MM:SS)'),
  party_guests: z.number().int().min(1).max(100),
  party_notes: z.string().max(500).optional().nullable(),
  child_name: z.string().min(1, 'Birthday child\'s name is required').max(50),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const purchase = await getPurchase(id);

    if (!purchase) {
      return NextResponse.json(
        { error: 'Purchase not found' },
        { status: 404 }
      );
    }

    // Verify user owns this purchase
    if (purchase.customer_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - purchase does not belong to user' },
        { status: 403 }
      );
    }

    return NextResponse.json({ purchase });
  } catch (error) {
    console.error('Error fetching purchase:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase' },
      { status: 500 }
    );
  }
}

// Handler for both PUT and PATCH - they do the same thing
async function handleUpdate(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the purchase first to verify ownership
    const purchase = await getPurchase(id);

    if (!purchase) {
      return NextResponse.json(
        { error: 'Purchase not found' },
        { status: 404 }
      );
    }

    // Verify user owns this purchase
    if (purchase.customer_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - purchase does not belong to user' },
        { status: 403 }
      );
    }

    // Only allow scheduling for party packages
    if (purchase.type !== 'party_package') {
      return NextResponse.json(
        { error: 'Only party packages can be scheduled' },
        { status: 400 }
      );
    }

    // Only allow scheduling for active purchases
    if (purchase.status !== 'active') {
      return NextResponse.json(
        { error: 'Only active party packages can be scheduled' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = partyScheduleSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const partyData = validationResult.data;

    // Validate party date is in the future
    const partyDate = new Date(partyData.party_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (partyDate < today) {
      return NextResponse.json(
        { error: 'Party date must be in the future' },
        { status: 400 }
      );
    }

    // Update the purchase with party scheduling data
    const updatedPurchase = await updatePurchase(id, {
      party_date: partyData.party_date,
      party_start_time: partyData.party_start_time,
      party_end_time: partyData.party_end_time,
      party_guests: partyData.party_guests,
      party_notes: partyData.party_notes || null,
    });

    // Get user profile for party booking
    const { data: profile } = await supabase
      .from('users')
      .select('name, email, phone')
      .eq('id', user.id)
      .single();

    if (!profile) {
      console.warn('User profile not found, party booking sync may be incomplete');
    }

    // Sync to party_bookings table so it shows in admin POS
    try {
      await createOrUpdateBookingFromPurchase({
        purchaseId: id,
        customerId: user.id,
        customerName: profile?.name || 'Customer',
        customerEmail: profile?.email || user.email || 'N/A',
        customerPhone: profile?.phone || 'N/A',
        packageName: purchase.name,
        price: purchase.price,
        partyDate: partyData.party_date,
        startTime: partyData.party_start_time,
        endTime: partyData.party_end_time,
        guestCount: partyData.party_guests,
        notes: partyData.party_notes || undefined,
        childName: partyData.child_name,
      });
    } catch (syncError) {
      const errorMessage = syncError instanceof Error
        ? syncError.message
        : 'Unknown error';

      console.error('Party booking sync failed:', {
        error: errorMessage,
        purchaseId: id,
        partyDate: partyData.party_date,
        customerId: user.id,
      });

      return NextResponse.json({
        error: `Booking sync failed: ${errorMessage}`,
        purchaseId: id,
      }, { status: 500 });
    }

    // Send party booking confirmation email
    try {
      const recipientEmail = profile?.email || user.email;
      if (recipientEmail) {
        // Read party_type from the just-synced booking so the email branches
        // to semi-private copy when applicable.
        const { data: syncedBooking } = await supabase
          .from('party_bookings')
          .select('party_type')
          .eq('purchase_id', id)
          .maybeSingle();

        const emailResult = await sendPartyBookingConfirmationEmail({
          to: recipientEmail,
          customerName: profile?.name || 'Valued Customer',
          customerPhone: profile?.phone,
          childName: partyData.child_name,
          partyDate: partyData.party_date,
          startTime: partyData.party_start_time,
          endTime: partyData.party_end_time,
          packageName: purchase.name,
          guestCount: partyData.party_guests,
          totalPrice: Number(purchase.price),
          bookingId: id,
          partyType: syncedBooking?.party_type,
        });
        if (emailResult.success) {
          logger.info({ to: recipientEmail, purchaseId: id }, '🎂 Party confirmation email sent');
        } else {
          logger.error({ purchaseId: id, error: emailResult.error }, 'Failed to send party confirmation email');
        }
      }
    } catch (emailError) {
      logger.error({ error: emailError, purchaseId: id }, 'Error sending party confirmation email');
    }

    return NextResponse.json({
      success: true,
      purchase: updatedPurchase,
      message: 'Party scheduled successfully',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating purchase:', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: `Failed to schedule party: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// Support both PUT and PATCH methods
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleUpdate(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleUpdate(request, context);
}
