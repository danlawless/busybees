/**
 * Admin API: After Dark Movie Schedule CRUD
 * GET - List all movies
 * POST - Create a new movie listing
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const CreateMovieSchema = z.object({
  title: z.string().min(1).max(200),
  show_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().max(500).optional(),
  poster_url: z.string().url().optional().or(z.literal('')),
  rating: z.string().optional().default('G'),
});

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('after_dark_movies')
      .select('*')
      .order('show_date', { ascending: false });

    if (error) {
      logger.error({ error }, 'Failed to fetch movies');
      return NextResponse.json({ error: 'Failed to fetch movies' }, { status: 500 });
    }

    return NextResponse.json({ movies: data || [] });
  } catch (error) {
    logger.error({ error }, 'Movies route error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateMovieSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('after_dark_movies')
      .insert({
        ...parsed.data,
        poster_url: parsed.data.poster_url || null,
        description: parsed.data.description || null,
      })
      .select()
      .single();

    if (error) {
      logger.error({ error }, 'Failed to create movie');
      return NextResponse.json({ error: 'Failed to create movie' }, { status: 500 });
    }

    return NextResponse.json({ movie: data }, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Movie create error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
