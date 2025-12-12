import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

/**
 * GET /api/newsletter-subscribers/[id]
 * Get a single subscriber
 * Note: Using admin client to bypass RLS (accessed from POS admin panel)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { data: subscriber, error } = await supabase
      .from('newsletter_subscribers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 });
      }
      throw error;
    }

    // Transform to frontend format
    const formattedSubscriber = {
      id: subscriber.id,
      name: subscriber.name,
      email: subscriber.email,
      subscribedAt: subscriber.subscribed_at,
      isActive: subscriber.is_active,
      unsubscribedAt: subscriber.unsubscribed_at,
      source: subscriber.source,
      createdAt: subscriber.created_at,
    };

    return NextResponse.json({ subscriber: formattedSubscriber });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch subscriber');
    return NextResponse.json(
      { error: 'Failed to fetch subscriber' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/newsletter-subscribers/[id]
 * Update subscriber status (unsubscribe or reactivate)
 * Note: Using admin client to bypass RLS (accessed from POS admin panel)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    const supabase = createAdminClient();

    let updateData: Record<string, unknown>;
    if (action === 'unsubscribe') {
      updateData = {
        is_active: false,
        unsubscribed_at: new Date().toISOString(),
      };
    } else if (action === 'reactivate') {
      updateData = {
        is_active: true,
        unsubscribed_at: null,
        subscribed_at: new Date().toISOString(),
      };
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const { data: subscriber, error } = await supabase
      .from('newsletter_subscribers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    logger.info({ subscriberId: id, action }, `📧 Subscriber ${action}d by admin`);

    // Transform to frontend format
    const formattedSubscriber = {
      id: subscriber.id,
      name: subscriber.name,
      email: subscriber.email,
      subscribedAt: subscriber.subscribed_at,
      isActive: subscriber.is_active,
      unsubscribedAt: subscriber.unsubscribed_at,
      source: subscriber.source,
      createdAt: subscriber.created_at,
    };

    return NextResponse.json({ subscriber: formattedSubscriber });
  } catch (error) {
    logger.error({ error }, 'Failed to update subscriber');
    return NextResponse.json(
      { error: 'Failed to update subscriber' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/newsletter-subscribers/[id]
 * Permanently delete subscriber
 * Note: Using admin client to bypass RLS (accessed from POS admin panel)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { error } = await supabase
      .from('newsletter_subscribers')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    logger.info({ subscriberId: id }, '🗑️ Subscriber permanently deleted');

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to delete subscriber');
    return NextResponse.json(
      { error: 'Failed to delete subscriber' },
      { status: 500 }
    );
  }
}
