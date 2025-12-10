import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAllSubscribers, getSubscriberStats } from '@/lib/services/newsletter';
import { logger } from '@/lib/logger';

/**
 * GET /api/newsletter-subscribers
 * List all newsletter subscribers (staff/admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user role - only staff and admin can view subscribers
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || !['staff', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const subscribers = await getAllSubscribers();
    const stats = await getSubscriberStats();

    logger.info(
      { userId: user.id, count: subscribers.length },
      'Newsletter subscribers fetched'
    );

    return NextResponse.json({ subscribers, stats });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch newsletter subscribers');
    return NextResponse.json(
      { error: 'Failed to fetch newsletter subscribers' },
      { status: 500 }
    );
  }
}
