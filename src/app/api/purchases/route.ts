/**
 * API Route: Purchases
 * GET - List purchases (all for staff, own for customers)
 * POST - Create a new purchase
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAllPurchases, getCustomerPurchases, getTodayPurchases, createPurchase } from '@/lib/services/purchases';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customer_id');
    const today = searchParams.get('today') === 'true';

    // Get user role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isStaff = userData?.role === 'staff' || userData?.role === 'admin';

    let purchases;

    if (today && isStaff) {
      purchases = await getTodayPurchases();
    } else if (customerId && isStaff) {
      purchases = await getCustomerPurchases(customerId);
    } else if (isStaff) {
      purchases = await getAllPurchases();
    } else {
      // Regular customers can only see their own purchases
      purchases = await getCustomerPurchases(user.id);
    }

    return NextResponse.json(purchases);
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
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only staff can create purchases
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || !['staff', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const purchase = await createPurchase(body);

    return NextResponse.json(purchase);
  } catch (error) {
    console.error('Error creating purchase:', error);
    return NextResponse.json(
      { error: 'Failed to create purchase', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

