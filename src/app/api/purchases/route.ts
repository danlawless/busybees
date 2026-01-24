/**
 * API Route: Purchases
 * GET - List purchases (all, today, or for specific customer)
 * POST - Create a new purchase
 *
 * Note: POS staff access is controlled via PIN at the application level.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllPurchases, getCustomerPurchases, getCustomerPurchasesByType, getTodayPurchases, createPurchase } from '@/lib/services/purchases';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customer_id');
    const today = searchParams.get('today') === 'true';
    const type = searchParams.get('type');

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    let purchases;

    // When filtering by type, authenticate user and use their ID
    if (type) {
      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      purchases = await getCustomerPurchasesByType(user.id, type);
    } else if (today) {
      // Today's purchases - staff/admin only
      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!userData || !['staff', 'admin'].includes(userData.role)) {
        return NextResponse.json(
          { error: 'Forbidden - Staff only' },
          { status: 403 }
        );
      }

      purchases = await getTodayPurchases();
    } else if (customerId) {
      // Customer-specific purchases - must be authenticated
      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      // Check if user is accessing their own data OR is staff/admin
      if (user.id !== customerId) {
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        if (!userData || !['staff', 'admin'].includes(userData.role)) {
          return NextResponse.json(
            { error: 'Forbidden - Cannot access other customer data' },
            { status: 403 }
          );
        }
      }

      purchases = await getCustomerPurchases(customerId);
    } else {
      // All purchases - staff/admin only, or return user's own if authenticated
      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (userData && ['staff', 'admin'].includes(userData.role)) {
        purchases = await getAllPurchases();
      } else {
        // Non-staff users get their own purchases
        purchases = await getCustomerPurchases(user.id);
      }
    }

    return NextResponse.json({ purchases });
  } catch (error) {
    console.error('Error fetching purchases:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchases', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check staff/admin role for creating purchases via this endpoint
    // (Customer purchases go through /api/stripe/direct-payment)
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || !['staff', 'admin'].includes(userData.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Staff only' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const purchase = await createPurchase(body);

    return NextResponse.json({ purchase }, { status: 201 });
  } catch (error) {
    console.error('Error creating purchase:', error);
    return NextResponse.json(
      { error: 'Failed to create purchase', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

