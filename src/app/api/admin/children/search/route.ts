/**
 * API Route: Admin Child Search
 * GET - Search children by name across all accounts (staff/admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchChildrenByName } from '@/lib/services/group-bookings';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      );
    }

    const sanitizedQuery = query.trim().slice(0, 100);

    logger.info({ query: sanitizedQuery }, 'Searching children by name');

    const children = await searchChildrenByName(sanitizedQuery);

    return NextResponse.json({ children });
  } catch (error) {
    logger.error({ error }, 'Failed to search children');
    return NextResponse.json(
      { error: 'Failed to search children' },
      { status: 500 }
    );
  }
}
