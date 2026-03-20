/**
 * API Route: Purchases
 * GET - List purchases (all, today, or for specific customer)
 * POST - Create a new purchase
 *
 * Note: POS staff access is controlled via PIN at the application level.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllPurchases, getCustomerPurchases, getCustomerPurchasesByType, getTodayPurchases, createPurchase, updatePurchase } from '@/lib/services/purchases';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { decrementInventoryAfterPurchase } from '@/lib/services/products';

/**
 * Auto-expire passes that are past their actual_expiry_date.
 * Uses "lazy expiration" — updates DB status when passes are fetched.
 */
async function expireStalePassesInPlace(purchases: any[]): Promise<any[]> {
  const now = new Date();
  const updates: Promise<any>[] = [];

  for (const purchase of purchases) {
    if (
      purchase.status === 'active' &&
      purchase.actual_expiry_date &&
      new Date(purchase.actual_expiry_date) < now
    ) {
      purchase.status = 'expired';
      updates.push(
        updatePurchase(purchase.id, { status: 'expired' }).catch((err) =>
          console.error(`Failed to expire purchase ${purchase.id}:`, err)
        )
      );
    }
  }

  if (updates.length > 0) {
    await Promise.all(updates);
  }

  return purchases;
}

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

    // Auto-expire any stale passes before returning
    await expireStalePassesInPlace(purchases);

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

    // Decrement inventory for food/beverage purchases
    const adminSupabase = createAdminClient();
    await decrementInventoryAfterPurchase(
      adminSupabase,
      body.product_id,
      body.name || 'Product',
      body.quantity || 1,
      body.type,
    );

    return NextResponse.json({ purchase }, { status: 201 });
  } catch (error) {
    console.error('Error creating purchase:', error);
    return NextResponse.json(
      { error: 'Failed to create purchase', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

