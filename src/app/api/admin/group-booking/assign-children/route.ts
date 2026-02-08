/**
 * API Route: Assign Children to Group Booking
 * POST - Save child assignments after group booking creation (staff/admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assignChildrenToBooking, getGroupBookingChildren } from '@/lib/services/group-bookings';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

const AssignChildrenSchema = z.object({
  booking_id: z.string().uuid('Invalid booking ID'),
  children: z.array(
    z.object({
      child_id: z.string().uuid('Invalid child ID'),
      waiver_signed_at_booking: z.boolean(),
      is_new_child: z.boolean().optional().default(false),
    })
  ).min(1, 'At least one child is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parsed = AssignChildrenSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { booking_id, children } = parsed.data;

    logger.info(
      { booking_id, childCount: children.length },
      'Assigning children to group booking'
    );

    // Verify booking exists and is a group rate
    const supabase = createAdminClient();
    const { data: booking, error: bookingError } = await supabase
      .from('party_bookings')
      .select('id, package_name, guest_count, status')
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    if (booking.package_name !== 'group_rate') {
      return NextResponse.json(
        { error: 'Only group rate bookings support child assignments' },
        { status: 400 }
      );
    }

    // Verify child count matches guest_count
    if (children.length !== booking.guest_count) {
      return NextResponse.json(
        {
          error: `Expected ${booking.guest_count} children, received ${children.length}`,
        },
        { status: 400 }
      );
    }

    // Verify all children have signed waivers
    const unsignedChildren = children.filter((c) => !c.waiver_signed_at_booking);
    if (unsignedChildren.length > 0) {
      // Check if those children already have waivers signed in the system
      const { data: childRecords } = await supabase
        .from('children')
        .select('id, waiver_signed')
        .in('id', unsignedChildren.map((c) => c.child_id));

      const trulyUnsigned = unsignedChildren.filter((c) => {
        const record = childRecords?.find((r) => r.id === c.child_id);
        return !record?.waiver_signed;
      });

      if (trulyUnsigned.length > 0) {
        return NextResponse.json(
          {
            error: `${trulyUnsigned.length} children still need waivers signed`,
            unsigned_child_ids: trulyUnsigned.map((c) => c.child_id),
          },
          { status: 400 }
        );
      }
    }

    await assignChildrenToBooking(booking_id, children);

    const assignedChildren = await getGroupBookingChildren(booking_id);

    logger.info(
      { booking_id, assignedCount: assignedChildren.length },
      'Children assigned to group booking successfully'
    );

    return NextResponse.json({
      success: true,
      assigned_children: assignedChildren,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to assign children to group booking');
    return NextResponse.json(
      { error: 'Failed to assign children to group booking' },
      { status: 500 }
    );
  }
}
