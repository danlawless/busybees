import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

/**
 * GET /api/newsletter-subscribers
 * List all newsletter subscribers
 * Note: This endpoint is accessed from the POS admin panel which uses PIN authentication.
 * Using admin client to bypass RLS (consistent with other admin APIs like promos).
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();

    // Fetch all subscribers using admin client (bypasses RLS)
    const { data: subscribers, error: subscribersError } = await supabase
      .from('newsletter_subscribers')
      .select('*')
      .order('subscribed_at', { ascending: false });

    if (subscribersError) {
      logger.error({ error: subscribersError }, 'Failed to fetch newsletter subscribers');
      return NextResponse.json(
        { error: 'Failed to fetch newsletter subscribers' },
        { status: 500 }
      );
    }

    // Calculate stats
    const total = subscribers?.length || 0;
    const active = subscribers?.filter(s => s.is_active).length || 0;
    const unsubscribed = total - active;

    // Transform to frontend format
    const formattedSubscribers = (subscribers || []).map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      subscribedAt: row.subscribed_at,
      isActive: row.is_active,
      unsubscribedAt: row.unsubscribed_at,
      source: row.source,
      createdAt: row.created_at,
    }));

    logger.info(
      { count: formattedSubscribers.length },
      '📧 Newsletter subscribers fetched'
    );

    return NextResponse.json({
      subscribers: formattedSubscribers,
      stats: { total, active, unsubscribed }
    });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch newsletter subscribers');
    return NextResponse.json(
      { error: 'Failed to fetch newsletter subscribers' },
      { status: 500 }
    );
  }
}
