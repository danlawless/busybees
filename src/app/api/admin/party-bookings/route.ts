/**
 * Admin Party Bookings API
 * GET /api/admin/party-bookings - List all bookings with filters
 * POST /api/admin/party-bookings - Create a manual booking (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { formatDateET } from '@/lib/services/report-aggregations';
import { isTimeSlotAvailable } from '@/lib/services/party-bookings';
import { calculateBookingPrice } from '@/lib/validations/party-booking';
import type { Database } from '@/lib/supabase/database.types';

type BookingStatus = Database['public']['Tables']['party_bookings']['Row']['status'];
type PartyType = Database['public']['Tables']['party_bookings']['Row']['party_type'];

const ManualBookingSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required').max(100),
  // Treat empty strings as "unset" so the default kicks in — the admin form
  // sends "" rather than omitting the field when left blank.
  customerEmail: z
    .preprocess((v) => (v === '' ? undefined : v), z.string().email().optional())
    .default('admin@busybees.com'),
  customerPhone: z.string().optional().default(''),
  partyType: z.enum(['private', 'semi_private']),
  packageName: z.enum(['queen_bee', 'worker_bee', 'basic_bee', 'group_rate']),
  partyDate: z.string().min(1, 'Party date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  childName: z.string().optional().default('TBD'),
  childAge: z.number().min(0).max(12).optional().nullable(),
  guestCount: z.number().min(1).max(30).optional().default(15),
  notes: z.string().max(500).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication and admin role
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || !['admin', 'staff'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const partyType = searchParams.get('partyType');
    const searchQuery = searchParams.get('search');

    // Build query
    let query = supabase
      .from('party_bookings')
      .select('*')
      .order('party_date', { ascending: true })
      .order('start_time', { ascending: true });

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status as BookingStatus);
    }

    if (startDate) {
      query = query.gte('party_date', startDate);
    }

    if (endDate) {
      query = query.lte('party_date', endDate);
    }

    if (partyType && partyType !== 'all') {
      query = query.eq('party_type', partyType as PartyType);
    }

    if (searchQuery) {
      query = query.or(
        `customer_name.ilike.%${searchQuery}%,customer_email.ilike.%${searchQuery}%,customer_phone.ilike.%${searchQuery}%,child_name.ilike.%${searchQuery}%`
      );
    }

    // Auto-mark confirmed bookings as done if party_date is more than 1 day ago
    const adminSupabase = createAdminClient();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDateET(yesterday);

    const { data: staleBookings, error: staleError } = await adminSupabase
      .from('party_bookings')
      .select('id')
      .eq('status', 'confirmed')
      .lt('party_date', yesterdayStr);

    if (!staleError && staleBookings && staleBookings.length > 0) {
      const staleIds = staleBookings.map(b => b.id);
      await adminSupabase
        .from('party_bookings')
        .update({ status: 'done', updated_at: new Date().toISOString() })
        .in('id', staleIds);
      logger.info({ count: staleIds.length }, 'Auto-marked past bookings as done');
    }

    const { data, error } = await query;

    if (error) {
      logger.error({ error }, 'Failed to fetch party bookings');
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    }

    logger.info({ count: data?.length || 0, filters: { status, startDate, endDate, partyType } }, 'Fetched party bookings');

    return NextResponse.json(data || []);
  } catch (error) {
    logger.error({ error }, 'Unexpected error fetching party bookings');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication and admin role
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || !['admin', 'staff'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const validated = ManualBookingSchema.parse(body);

    // Check slot availability (prevent double-booking)
    const available = await isTimeSlotAvailable(
      validated.partyDate,
      validated.startTime,
      validated.endTime
    );

    if (!available) {
      return NextResponse.json(
        { error: 'This time slot is already booked or blocked by an event' },
        { status: 409 }
      );
    }

    // Calculate pricing
    const pricing = calculateBookingPrice(
      validated.packageName,
      validated.partyType,
      validated.guestCount
    );

    const adminSupabase = createAdminClient();

    const { data, error } = await adminSupabase
      .from('party_bookings')
      .insert({
        customer_name: validated.customerName,
        customer_email: validated.customerEmail,
        customer_phone: validated.customerPhone,
        customer_address: null,
        party_type: validated.partyType,
        package_name: validated.packageName,
        party_date: validated.partyDate,
        start_time: validated.startTime,
        end_time: validated.endTime,
        child_name: validated.childName || 'TBD',
        child_age: validated.childAge ?? null,
        guest_count: validated.guestCount,
        additional_kids: pricing.additionalKids,
        base_price: pricing.basePrice,
        additional_kids_price: pricing.additionalKidsPrice,
        total_price: pricing.totalPrice,
        status: 'confirmed',
        payment_status: 'admin_manual',
        notes: validated.notes
          ? `[Admin booking by ${user.email}] ${validated.notes}`
          : `[Admin booking by ${user.email}]`,
      })
      .select()
      .single();

    if (error) {
      logger.error({ error }, 'Failed to create manual party booking');
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
    }

    logger.info(
      { bookingId: data.id, date: validated.partyDate, adminEmail: user.email },
      'Created manual party booking'
    );

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 });
    }

    logger.error({ error }, 'Unexpected error creating manual party booking');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
