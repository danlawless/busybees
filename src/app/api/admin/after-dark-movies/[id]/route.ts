/**
 * Admin API: After Dark Movie by ID
 * PUT - Update a movie
 * DELETE - Remove a movie
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const UpdateMovieSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  show_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  description: z.string().max(500).nullable().optional(),
  poster_url: z.string().url().nullable().optional().or(z.literal('')),
  rating: z.string().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = UpdateMovieSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const updateData = { ...parsed.data, updated_at: new Date().toISOString() };
    if (updateData.poster_url === '') updateData.poster_url = null;

    const { data, error } = await supabase
      .from('after_dark_movies')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error({ error }, 'Failed to update movie');
      return NextResponse.json({ error: 'Failed to update movie' }, { status: 500 });
    }

    return NextResponse.json({ movie: data });
  } catch (error) {
    logger.error({ error }, 'Movie update error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { error } = await supabase
      .from('after_dark_movies')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error({ error }, 'Failed to delete movie');
      return NextResponse.json({ error: 'Failed to delete movie' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Movie delete error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
