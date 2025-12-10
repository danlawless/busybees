import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSubscriber, unsubscribe, deleteSubscriber, reactivateSubscriber } from '@/lib/services/newsletter';
import { logger } from '@/lib/logger';

/**
 * GET /api/newsletter-subscribers/[id]
 * Get a single subscriber (staff/admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || !['staff', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const subscriber = await getSubscriber(id);

    if (!subscriber) {
      return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 });
    }

    return NextResponse.json({ subscriber });
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
 * Update subscriber status (staff/admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || !['staff', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    let subscriber;
    if (action === 'unsubscribe') {
      subscriber = await unsubscribe(id);
      logger.info({ subscriberId: id, userId: user.id }, 'Subscriber unsubscribed by admin');
    } else if (action === 'reactivate') {
      subscriber = await reactivateSubscriber(id);
      logger.info({ subscriberId: id, userId: user.id }, 'Subscriber reactivated by admin');
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ subscriber });
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
 * Permanently delete subscriber (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    // Only admin can permanently delete
    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    await deleteSubscriber(id);

    logger.info({ subscriberId: id, userId: user.id }, 'Subscriber permanently deleted');

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to delete subscriber');
    return NextResponse.json(
      { error: 'Failed to delete subscriber' },
      { status: 500 }
    );
  }
}
