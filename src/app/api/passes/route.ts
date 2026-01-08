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
import { logger } from '@/lib/logger';
import { z } from 'zod';

// Schema for creating a pass
const createPassSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().min(1, 'Description is required'),
  category: z.enum(['day', 'weekly', 'monthly']),
  price: z.number().positive('Price must be positive'),
  duration: z.number().int().positive('Duration must be a positive integer'),
  sessionsIncluded: z.number().int().positive('Sessions must be a positive integer').optional(),
  sessions_included: z.number().int().positive('Sessions must be a positive integer').optional(),
  isActive: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

// Schema for updating a pass
const updatePassSchema = z.object({
  id: z.string().uuid('Invalid pass ID'),
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  description: z.string().min(1, 'Description is required').optional(),
  category: z.enum(['day', 'weekly', 'monthly']).optional(),
  price: z.number().positive('Price must be positive').optional(),
  duration: z.number().int().positive('Duration must be a positive integer').optional(),
  sessionsIncluded: z.number().int().positive('Sessions must be a positive integer').optional(),
  sessions_included: z.number().int().positive('Sessions must be a positive integer').optional(),
  isActive: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeAll = searchParams.get('all') === 'true';

    // Return all passes if requested (for admin panel), otherwise just active
    const passes = includeAll ? await getAllPasses() : await getActivePasses();
    return NextResponse.json({ passes });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch passes');
    return NextResponse.json(
      { error: 'Failed to fetch passes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Note: POS staff access is controlled via PIN at the application level
    // The admin panel is only accessible after PIN verification
    const body = await request.json();

    // Validate input
    const validation = createPassSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Transform camelCase from frontend to snake_case for database
    const dbData = {
      name: data.name,
      description: data.description,
      category: data.category,
      price: data.price,
      duration: data.duration,
      sessions_included: data.sessionsIncluded ?? data.sessions_included ?? 1,
      is_active: data.isActive ?? data.is_active ?? true,
    };

    const pass = await createPass(dbData);

    logger.info({ passId: pass.id, name: pass.name }, '✅ Pass created via API');
    return NextResponse.json({ pass }, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to create pass');
    return NextResponse.json(
      { error: 'Failed to create pass' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Note: POS staff access is controlled via PIN at the application level
    const body = await request.json();

    // Validate input
    const validation = updatePassSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { id, ...updates } = validation.data;

    // Transform camelCase from frontend to snake_case for database
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.duration !== undefined) dbUpdates.duration = updates.duration;
    if (updates.sessionsIncluded !== undefined) dbUpdates.sessions_included = updates.sessionsIncluded;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
    // Also accept snake_case directly (from internal calls)
    if (updates.sessions_included !== undefined) dbUpdates.sessions_included = updates.sessions_included;
    if (updates.is_active !== undefined) dbUpdates.is_active = updates.is_active;

    const pass = await updatePass(id, dbUpdates);

    logger.info({ passId: id }, '✅ Pass updated via API');
    return NextResponse.json({ pass }, { status: 200 });
  } catch (error) {
    logger.error({ error }, 'Failed to update pass');
    return NextResponse.json(
      { error: 'Failed to update pass' },
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

    logger.info({ passId: id }, '✅ Pass deleted via API');
    return NextResponse.json({ success: true, id }, { status: 200 });
  } catch (error) {
    logger.error({ error }, 'Failed to delete pass');
    return NextResponse.json(
      { error: 'Failed to delete pass' },
      { status: 500 }
    );
  }
}
