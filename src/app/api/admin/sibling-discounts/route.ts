/**
 * API Route: Sibling Discounts
 * GET - List all sibling discounts (staff/admin)
 * POST - Create or update a sibling discount (admin only)
 * DELETE - Remove a sibling discount (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import {
  getAllSiblingDiscounts,
  upsertSiblingDiscount,
  deleteSiblingDiscount,
} from '@/lib/services/sibling-discounts';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is staff or admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || !['staff', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden - Staff or admin access required' }, { status: 403 });
    }

    const discounts = await getAllSiblingDiscounts();
    return NextResponse.json(discounts);
  } catch (error) {
    logger.error({ error }, 'Error fetching sibling discounts');
    return NextResponse.json(
      { error: 'Failed to fetch sibling discounts', details: error instanceof Error ? error.message : 'Unknown error' },
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

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { child_position, discount_percent, is_active, applies_to_monthly_only } = body;

    // Validate input
    if (typeof child_position !== 'number' || child_position < 2 || child_position > 10) {
      return NextResponse.json(
        { error: 'child_position must be a number between 2 and 10' },
        { status: 400 }
      );
    }

    if (typeof discount_percent !== 'number' || discount_percent < 0 || discount_percent > 100) {
      return NextResponse.json(
        { error: 'discount_percent must be a number between 0 and 100' },
        { status: 400 }
      );
    }

    const discount = await upsertSiblingDiscount({
      child_position,
      discount_percent,
      is_active: is_active ?? true,
      applies_to_monthly_only: applies_to_monthly_only ?? true,
    });

    logger.info({ discount }, 'Sibling discount created/updated');
    return NextResponse.json(discount);
  } catch (error) {
    logger.error({ error }, 'Error creating/updating sibling discount');
    return NextResponse.json(
      { error: 'Failed to create/update sibling discount', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await deleteSiblingDiscount(id);
    logger.info({ id }, 'Sibling discount deleted');
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Error deleting sibling discount');
    return NextResponse.json(
      { error: 'Failed to delete sibling discount', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
