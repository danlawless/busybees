/**
 * POS Customers API Route
 * GET - List all customers with details (requires POS PIN)
 *
 * This endpoint is specifically for the POS terminal which uses PIN-based
 * staff authentication rather than user session authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { Database } from '@/lib/supabase/database.types';

// POS staff PIN - should match the PIN used in the POS page
const POS_STAFF_PIN = process.env.POS_STAFF_PIN || '1234';

function calculateAge(birthdate: string): number {
  const birth = new Date(birthdate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export async function GET(request: NextRequest) {
  try {
    // Validate POS PIN from header
    const posPin = request.headers.get('x-pos-pin');

    if (!posPin || posPin !== POS_STAFF_PIN) {
      logger.warn({ providedPin: !!posPin }, 'Unauthorized POS customers access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role to bypass RLS for admin operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      logger.error({}, 'Missing Supabase configuration');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient<Database>(supabaseUrl, serviceRoleKey);

    // Fetch all customers with related data
    const { data: customers, error: customersError } = await supabase
      .from('users')
      .select(`
        id,
        phone,
        name,
        email,
        created_at,
        last_login,
        children (
          id,
          name,
          birthdate,
          waiver_signed,
          waiver_signed_date,
          created_at
        ),
        purchases (
          id,
          type,
          name,
          price,
          purchase_date,
          expiry_date,
          first_use_date,
          actual_expiry_date,
          used_sessions,
          total_sessions,
          status,
          auto_renew,
          next_renewal_date,
          child_id
        ),
        sessions (
          id,
          customer_id,
          purchase_id,
          start_time,
          end_time,
          duration,
          auto_checkout_time
        ),
        saved_cards (
          id,
          last4,
          brand,
          expiry_month,
          expiry_year,
          is_default
        )
      `)
      .eq('role', 'customer')
      .order('created_at', { ascending: false });

    if (customersError) {
      logger.error({ error: customersError }, 'Failed to fetch customers');
      return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
    }

    // Transform the data to match the AdminPanel's expected format
    const transformedCustomers = (customers || []).map((customer) => ({
      id: customer.id,
      phone: customer.phone,
      name: customer.name,
      email: customer.email || undefined,
      createdAt: customer.created_at,
      lastVisit: customer.last_login || undefined,
      children: (customer.children || []).map((child) => ({
        id: child.id,
        name: child.name,
        birthdate: child.birthdate,
        age: calculateAge(child.birthdate),
        waiverSigned: child.waiver_signed,
        waiverSignedDate: child.waiver_signed_date || undefined,
        createdAt: child.created_at,
      })),
      purchases: (customer.purchases || []).map((purchase) => ({
        id: purchase.id,
        type: purchase.type,
        name: purchase.name,
        price: purchase.price,
        purchaseDate: purchase.purchase_date,
        expiryDate: purchase.expiry_date || undefined,
        firstUseDate: purchase.first_use_date || undefined,
        actualExpiryDate: purchase.actual_expiry_date || undefined,
        usedSessions: purchase.used_sessions,
        totalSessions: purchase.total_sessions,
        status: purchase.status,
        autoRenew: purchase.auto_renew,
        nextRenewalDate: purchase.next_renewal_date || undefined,
        childId: purchase.child_id || undefined,
      })),
      activeSessions: (customer.sessions || [])
        .filter((session) => !session.end_time)
        .map((session) => ({
          id: session.id,
          customerId: session.customer_id,
          purchaseId: session.purchase_id,
          startTime: session.start_time,
          endTime: session.end_time || undefined,
          duration: session.duration || undefined,
          autoCheckoutTime: session.auto_checkout_time,
        })),
      savedCards: (customer.saved_cards || []).map((card) => ({
        id: card.id,
        last4: card.last4,
        brand: card.brand,
        expiryMonth: card.expiry_month,
        expiryYear: card.expiry_year,
        isDefault: card.is_default,
      })),
    }));

    logger.info({ customerCount: transformedCustomers.length }, 'POS customers fetched successfully');

    return NextResponse.json(transformedCustomers);
  } catch (error) {
    logger.error({ error }, 'Error in POS customers endpoint');
    return NextResponse.json(
      { error: 'Failed to fetch customers', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
