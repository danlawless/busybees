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

    let purchases;

    // When filtering by type, authenticate user and use their ID
    if (type) {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      purchases = await getCustomerPurchasesByType(user.id, type);
    } else if (today) {
      purchases = await getTodayPurchases();
    } else if (customerId) {
      purchases = await getCustomerPurchases(customerId);
    } else {
      purchases = await getAllPurchases();
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
    // Note: POS staff access is controlled via PIN at the application level
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

