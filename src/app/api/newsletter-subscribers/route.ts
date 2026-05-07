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

    // Fetch all subscribers (paginated to bypass Supabase 1000-row cap)
    type SubscriberRow = {
      id: string;
      name: string | null;
      email: string;
      subscribed_at: string;
      is_active: boolean;
      unsubscribed_at: string | null;
      source: string | null;
      created_at: string;
    };
    const PAGE_SIZE = 1000;
    const subscribers: SubscriberRow[] = [];
    let from = 0;
    while (true) {
      const { data: pageData, error: subscribersError } = await supabase
        .from('newsletter_subscribers')
        .select('*')
        .order('subscribed_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      if (subscribersError) {
        logger.error({ error: subscribersError }, 'Failed to fetch newsletter subscribers');
        return NextResponse.json(
          { error: 'Failed to fetch newsletter subscribers' },
          { status: 500 }
        );
      }

      const rows = pageData || [];
      subscribers.push(...rows);
      if (rows.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }

    // Calculate stats
    const total = subscribers.length;
    const active = subscribers.filter(s => s.is_active).length;
    const unsubscribed = total - active;

    // Transform to frontend format
    const formattedSubscribers = subscribers.map(row => ({
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
