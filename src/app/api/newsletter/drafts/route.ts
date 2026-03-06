/**
 * API Route: Newsletter Drafts
 * GET - List all drafts
 * POST - Create or update a draft
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const draftSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, 'Title is required').max(200),
  subject: z.string().max(200).default(''),
  designJson: z.record(z.unknown()),
  html: z.string(),
});

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('newsletter_drafts')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      logger.error({ error }, 'Failed to fetch newsletter drafts');
      return NextResponse.json({ error: 'Failed to fetch drafts' }, { status: 500 });
    }

    return NextResponse.json({ drafts: data || [] });
  } catch (error) {
    logger.error({ error }, 'Newsletter drafts fetch error');
    return NextResponse.json({ error: 'Failed to fetch drafts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = draftSchema.safeParse(body);

    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues.map((i) => i.message).join(', ');
      return NextResponse.json({ error: errorMessages }, { status: 400 });
    }

    const { id, title, subject, designJson, html } = validationResult.data;
    const supabase = createAdminClient();

    if (id) {
      // Update existing draft
      const { data, error } = await supabase
        .from('newsletter_drafts')
        .update({
          title,
          subject,
          design_json: designJson,
          html,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error({ error, id }, 'Failed to update newsletter draft');
        return NextResponse.json({ error: 'Failed to update draft' }, { status: 500 });
      }

      return NextResponse.json({ draft: data });
    }

    // Create new draft
    const { data, error } = await supabase
      .from('newsletter_drafts')
      .insert({
        title,
        subject,
        design_json: designJson,
        html,
      })
      .select()
      .single();

    if (error) {
      logger.error({ error }, 'Failed to create newsletter draft');
      return NextResponse.json({ error: 'Failed to create draft' }, { status: 500 });
    }

    return NextResponse.json({ draft: data });
  } catch (error) {
    logger.error({ error }, 'Newsletter draft save error');
    return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 });
  }
}
