/**
 * API Route: Public Sibling Discounts
 * GET - Fetch active sibling discounts for checkout flow (no auth required)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const supabase = await createClient();

    // Fetch active sibling discounts - no auth required for public display
    const { data, error } = await supabase
      .from('sibling_discounts')
      .select('*')
      .eq('is_active', true)
      .order('child_position', { ascending: true });

    if (error) {
      logger.error({ error }, 'Error fetching active sibling discounts');
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error({ error }, 'Error in sibling discounts API');
    return NextResponse.json(
      { error: 'Failed to fetch sibling discounts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
