/**
 * Promos API Route
 * Handles CRUD operations for promotional campaigns
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
  getAllPromos,
  getActivePromos,
  createPromo,
  updatePromo,
  deletePromo,
} from '@/lib/services/promos';
import { Database } from '@/lib/supabase/database.types';

type PromoInsert = Database['public']['Tables']['promos']['Insert'];
type PromoUpdate = Database['public']['Tables']['promos']['Update'];

/**
 * GET /api/promos
 * Fetch all promos or just active ones
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const activeOnly = searchParams.get('active') === 'true';

    logger.info({ activeOnly }, '📋 Fetching promos');

    const promos = activeOnly ? await getActivePromos() : await getAllPromos();

    logger.info({ count: promos.length, activeOnly }, '✅ Promos fetched successfully');

    return NextResponse.json({ promos });
  } catch (error) {
    logger.error({ error }, '❌ Failed to fetch promos');

    return NextResponse.json(
      { error: 'Failed to fetch promos' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/promos
 * Create a new promo
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    logger.info({ promoName: body.name }, '📝 Creating new promo');

    // Validate required fields
    if (!body.name || !body.start_date || !body.end_date || !body.discount_percent || !body.stripe_coupon_code) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate discount percentage
    if (body.discount_percent < 1 || body.discount_percent > 100) {
      return NextResponse.json(
        { error: 'Discount percent must be between 1 and 100' },
        { status: 400 }
      );
    }

    // Create promo insert object
    const promoInsert: PromoInsert = {
      name: body.name,
      start_date: body.start_date,
      end_date: body.end_date,
      discount_percent: body.discount_percent,
      description: body.description || '',
      stripe_coupon_code: body.stripe_coupon_code.toUpperCase(),
      banner_style: body.banner_style || 'honeycomb',
      is_active: body.is_active ?? true,
    };

    const promo = await createPromo(promoInsert);

    logger.info(
      { promoId: promo.id, promoName: promo.name },
      '✅ Promo created successfully'
    );

    return NextResponse.json({ promo }, { status: 201 });
  } catch (error) {
    logger.error({ error }, '❌ Failed to create promo');

    return NextResponse.json(
      { error: 'Failed to create promo' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/promos
 * Update an existing promo
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: 'Promo ID is required' },
        { status: 400 }
      );
    }

    logger.info({ promoId: body.id }, '📝 Updating promo');

    // Create update object (only include fields that are present)
    const promoUpdate: PromoUpdate = {};

    if (body.name !== undefined) promoUpdate.name = body.name;
    if (body.start_date !== undefined) promoUpdate.start_date = body.start_date;
    if (body.end_date !== undefined) promoUpdate.end_date = body.end_date;
    if (body.discount_percent !== undefined) {
      if (body.discount_percent < 1 || body.discount_percent > 100) {
        return NextResponse.json(
          { error: 'Discount percent must be between 1 and 100' },
          { status: 400 }
        );
      }
      promoUpdate.discount_percent = body.discount_percent;
    }
    if (body.description !== undefined) promoUpdate.description = body.description;
    if (body.stripe_coupon_code !== undefined) {
      promoUpdate.stripe_coupon_code = body.stripe_coupon_code.toUpperCase();
    }
    if (body.banner_style !== undefined) promoUpdate.banner_style = body.banner_style;
    if (body.is_active !== undefined) promoUpdate.is_active = body.is_active;

    // Always update the updated_at timestamp
    promoUpdate.updated_at = new Date().toISOString();

    const promo = await updatePromo(body.id, promoUpdate);

    logger.info(
      { promoId: promo.id, promoName: promo.name },
      '✅ Promo updated successfully'
    );

    return NextResponse.json({ promo });
  } catch (error) {
    logger.error({ error }, '❌ Failed to update promo');

    return NextResponse.json(
      { error: 'Failed to update promo' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/promos
 * Delete a promo
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Promo ID is required' },
        { status: 400 }
      );
    }

    logger.info({ promoId: id }, '🗑️ Deleting promo');

    await deletePromo(id);

    logger.info({ promoId: id }, '✅ Promo deleted successfully');

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, '❌ Failed to delete promo');

    return NextResponse.json(
      { error: 'Failed to delete promo' },
      { status: 500 }
    );
  }
}
