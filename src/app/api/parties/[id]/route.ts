/**
 * API Route: Party Package by ID
 * GET - Get party package details
 * PUT - Update party package (POS staff operations)
 * DELETE - Delete party package (POS staff operations)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPartyPackage, updatePartyPackage, deletePartyPackage } from '@/lib/services/parties';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const party = await getPartyPackage(id);

    if (!party) {
      return NextResponse.json({ error: 'Party package not found' }, { status: 404 });
    }

    return NextResponse.json({ party });
  } catch (error) {
    console.error('Error fetching party:', error);
    return NextResponse.json(
      { error: 'Failed to fetch party', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Note: POS staff access is controlled via PIN at the application level
    // The admin panel is only accessible after PIN verification
    const { id } = await params;
    const body = await request.json();

    // Convert data to match database schema
    const updates: Record<string, unknown> = {};
    if (body.name) updates.name = body.name;
    if (body.basePrice !== undefined) updates.base_price = body.basePrice;
    if (body.base_price !== undefined) updates.base_price = body.base_price;
    if (body.capacity !== undefined) updates.capacity = body.capacity;
    if (body.duration !== undefined) updates.duration = body.duration;
    if (body.includedItems) updates.included_items = body.includedItems;
    if (body.included_items) updates.included_items = body.included_items;
    if (body.addOns) updates.add_ons = body.addOns;
    if (body.add_ons) updates.add_ons = body.add_ons;
    if (body.description !== undefined) updates.description = body.description;
    if (body.stripePurchaseLink !== undefined) updates.stripe_purchase_link = body.stripePurchaseLink;
    if (body.stripe_purchase_link !== undefined) updates.stripe_purchase_link = body.stripe_purchase_link;
    if (body.isActive !== undefined) updates.is_active = body.isActive;
    if (body.is_active !== undefined) updates.is_active = body.is_active;

    const party = await updatePartyPackage(id, updates);
    return NextResponse.json({ party });
  } catch (error) {
    console.error('Error updating party:', error);
    return NextResponse.json(
      { error: 'Failed to update party', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Note: POS staff access is controlled via PIN at the application level
    const { id } = await params;
    await deletePartyPackage(id);

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Error deleting party:', error);
    return NextResponse.json(
      { error: 'Failed to delete party', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


