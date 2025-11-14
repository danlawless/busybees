/**
 * API Route: Party Packages
 * GET - List party packages
 * POST - Create a new party package (staff only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAllPartyPackages, getActivePartyPackages, createPartyPackage } from '@/lib/services/parties';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';
    const includeAll = searchParams.get('all') === 'true';

    if (includeAll && !activeOnly) {
      // Check if user is staff
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        if (userData && ['staff', 'admin'].includes(userData.role)) {
          const parties = await getAllPartyPackages();
          return NextResponse.json({ parties }, { status: 200 });
        }
      }
    }

    // Default: return only active parties
    const parties = await getActivePartyPackages();
    return NextResponse.json({ parties }, { status: 200 });
  } catch (error) {
    console.error('Error fetching parties:', error);
    return NextResponse.json(
      { error: 'Failed to fetch parties', details: error instanceof Error ? error.message : 'Unknown error' },
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

    // Only staff can create party packages
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || !['staff', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // Convert data to match database schema
    const partyData = {
      name: body.name,
      base_price: body.basePrice || body.base_price,
      capacity: body.capacity,
      duration: body.duration,
      included_items: body.includedItems || body.included_items || [],
      add_ons: body.addOns || body.add_ons || [],
      description: body.description || '',
      stripe_product_id: body.stripeProductId || body.stripe_product_id || null,
      stripe_price_id: body.stripePriceId || body.stripe_price_id || null,
      stripe_purchase_link: body.stripePurchaseLink || body.stripe_purchase_link || '',
      is_active: body.isActive ?? body.is_active ?? true,
    };

    const party = await createPartyPackage(partyData);
    return NextResponse.json({ party }, { status: 201 });
  } catch (error) {
    console.error('Error creating party:', error);
    return NextResponse.json(
      { error: 'Failed to create party', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
