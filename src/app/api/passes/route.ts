/**
 * API Route: Passes
 * GET - List passes (active for public, all for admin panel)
 * POST - Create a new pass (POS admin panel)
 * PUT - Update an existing pass (POS admin panel)
 * DELETE - Delete a pass (POS admin panel)
 *
 * Note: POS staff access is controlled via PIN at the application level.
 * The admin panel is only accessible after PIN verification on a locked network.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getActivePasses, getAllPasses, createPass, updatePass, deletePass } from '@/lib/services/passes';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeAll = searchParams.get('all') === 'true';

    // Return all passes if requested (for admin panel), otherwise just active
    const passes = includeAll ? await getAllPasses() : await getActivePasses();
    return NextResponse.json({ passes });
  } catch (error) {
    console.error('Error fetching passes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch passes', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Note: POS staff access is controlled via PIN at the application level
    // The admin panel is only accessible after PIN verification
    const body = await request.json();

    // Transform camelCase from frontend to snake_case for database
    const dbData: Record<string, unknown> = {
      name: body.name,
      description: body.description,
      category: body.category,
      price: body.price,
      duration: body.duration,
      sessions_included: body.sessionsIncluded ?? body.sessions_included ?? 1,
      is_active: body.isActive ?? body.is_active ?? true,
      available: body.available ?? true,
    };

    const pass = await createPass(dbData);

    return NextResponse.json({ pass }, { status: 201 });
  } catch (error) {
    console.error('Error creating pass:', error);
    return NextResponse.json(
      { error: 'Failed to create pass', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Note: POS staff access is controlled via PIN at the application level
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Pass ID is required' }, { status: 400 });
    }

    // Transform camelCase from frontend to snake_case for database
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.duration !== undefined) dbUpdates.duration = updates.duration;
    if (updates.sessionsIncluded !== undefined) dbUpdates.sessions_included = updates.sessionsIncluded;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
    if (updates.available !== undefined) dbUpdates.available = updates.available;
    // Also accept snake_case directly (from internal calls)
    if (updates.sessions_included !== undefined) dbUpdates.sessions_included = updates.sessions_included;
    if (updates.is_active !== undefined) dbUpdates.is_active = updates.is_active;

    const pass = await updatePass(id, dbUpdates);
    return NextResponse.json({ pass }, { status: 200 });
  } catch (error) {
    console.error('Error updating pass:', error);
    return NextResponse.json(
      { error: 'Failed to update pass', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Note: POS staff access is controlled via PIN at the application level
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Pass ID is required' }, { status: 400 });
    }

    await deletePass(id);
    return NextResponse.json({ success: true, id }, { status: 200 });
  } catch (error) {
    console.error('Error deleting pass:', error);
    return NextResponse.json(
      { error: 'Failed to delete pass', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
