import { NextRequest, NextResponse } from 'next/server';
import { PromoSpecial, getActivePromo, validatePromoCode, validatePromoDates } from '@/lib/utils/promoHelpers';

/**
 * GET /api/promos
 * Fetch all promos or just the active one
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    // In production, this would query a database
    // For now, we'll return mock data that matches the POS state
    // The actual data will be stored in localStorage and synced via the POS

    // Return empty array - the client will use localStorage
    const promos: PromoSpecial[] = [];

    if (activeOnly) {
      const active = getActivePromo(promos);
      return NextResponse.json({ promo: active }, { status: 200 });
    }

    return NextResponse.json({ promos }, { status: 200 });
  } catch (error) {
    console.error('Error fetching promos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch promos' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/promos
 * Create a new promo (staff only)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const { name, startDate, endDate, discountPercent, description, stripeCouponCode } = body;

    if (!name || !startDate || !endDate || !discountPercent || !description || !stripeCouponCode) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate promo code
    const codeValidation = validatePromoCode(stripeCouponCode);
    if (!codeValidation.valid) {
      return NextResponse.json(
        { error: codeValidation.error },
        { status: 400 }
      );
    }

    // Validate dates
    const dateValidation = validatePromoDates(startDate, endDate);
    if (!dateValidation.valid) {
      return NextResponse.json(
        { error: dateValidation.error },
        { status: 400 }
      );
    }

    // Validate discount percent
    if (typeof discountPercent !== 'number' || discountPercent <= 0 || discountPercent > 100) {
      return NextResponse.json(
        { error: 'Discount percent must be between 1 and 100' },
        { status: 400 }
      );
    }

    // Create new promo
    const newPromo: PromoSpecial = {
      id: `promo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      startDate,
      endDate,
      discountPercent,
      description,
      stripeCouponCode: stripeCouponCode.toUpperCase(),
      isActive: body.isActive ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // In production, save to database
    // For now, return the new promo for client-side storage

    return NextResponse.json({ promo: newPromo }, { status: 201 });
  } catch (error) {
    console.error('Error creating promo:', error);
    return NextResponse.json(
      { error: 'Failed to create promo' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/promos
 * Update an existing promo (staff only)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const { id, name, startDate, endDate, discountPercent, description, stripeCouponCode } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Promo ID is required' },
        { status: 400 }
      );
    }

    if (!name || !startDate || !endDate || !discountPercent || !description || !stripeCouponCode) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate promo code
    const codeValidation = validatePromoCode(stripeCouponCode);
    if (!codeValidation.valid) {
      return NextResponse.json(
        { error: codeValidation.error },
        { status: 400 }
      );
    }

    // Validate dates
    const dateValidation = validatePromoDates(startDate, endDate);
    if (!dateValidation.valid) {
      return NextResponse.json(
        { error: dateValidation.error },
        { status: 400 }
      );
    }

    // Validate discount percent
    if (typeof discountPercent !== 'number' || discountPercent <= 0 || discountPercent > 100) {
      return NextResponse.json(
        { error: 'Discount percent must be between 1 and 100' },
        { status: 400 }
      );
    }

    // Update promo
    const updatedPromo: PromoSpecial = {
      ...body,
      stripeCouponCode: stripeCouponCode.toUpperCase(),
      updatedAt: new Date().toISOString(),
    };

    // In production, update in database
    // For now, return the updated promo for client-side storage

    return NextResponse.json({ promo: updatedPromo }, { status: 200 });
  } catch (error) {
    console.error('Error updating promo:', error);
    return NextResponse.json(
      { error: 'Failed to update promo' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/promos
 * Delete a promo (staff only)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Promo ID is required' },
        { status: 400 }
      );
    }

    // In production, delete from database
    // For now, just return success

    return NextResponse.json({ success: true, id }, { status: 200 });
  } catch (error) {
    console.error('Error deleting promo:', error);
    return NextResponse.json(
      { error: 'Failed to delete promo' },
      { status: 500 }
    );
  }
}

