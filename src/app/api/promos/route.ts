/**
 * API Route: Promos
 * GET - List promos (active for public, all for staff)
 * POST - Create a new promo (staff only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActivePromos, getAllPromos, createPromo } from '@/lib/services/promos';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeAll = searchParams.get('all') === 'true';

    if (includeAll) {
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
          const promos = await getAllPromos();
          return NextResponse.json(promos);
        }
      }
    }

    // Default: return only active promos
    const promos = await getActivePromos();
    return NextResponse.json(promos);
  } catch (error) {
    console.error('Error fetching promos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch promos', details: error instanceof Error ? error.message : 'Unknown error' },
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

    // Only staff can create promos
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || !['staff', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const promo = await createPromo(body);

    return NextResponse.json(promo);
  } catch (error) {
    console.error('Error creating promo:', error);
    return NextResponse.json(
      { error: 'Failed to create promo', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
