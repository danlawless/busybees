/**
 * API Route: Newsletter Draft by ID
 * GET - Get a single draft
 * DELETE - Delete a draft
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('newsletter_drafts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
      }
      logger.error({ error, id }, 'Failed to fetch newsletter draft');
      return NextResponse.json({ error: 'Failed to fetch draft' }, { status: 500 });
    }

    return NextResponse.json({ draft: data });
  } catch (error) {
    logger.error({ error }, 'Newsletter draft fetch error');
    return NextResponse.json({ error: 'Failed to fetch draft' }, { status: 500 });
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
      .from('newsletter_drafts')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error({ error, id }, 'Failed to delete newsletter draft');
      return NextResponse.json({ error: 'Failed to delete draft' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Newsletter draft delete error');
    return NextResponse.json({ error: 'Failed to delete draft' }, { status: 500 });
  }
}
