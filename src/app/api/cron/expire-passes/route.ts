/**
 * Cron API Endpoint for Expiring Passes
 * Runs daily to mark passes past their expiry as 'expired' in the database.
 *
 * Protected by CRON_SECRET environment variable.
 *
 * Calls the auto_expire_passes() SQL function, which marks any active purchase
 * as expired when expiry_date or actual_expiry_date is in the past. This catches
 * passes that were never used (and thus have no actual_expiry_date) as well as
 * passes whose actual_expiry_date has lapsed.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (process.env.NODE_ENV === 'production' && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        console.log('Expire-passes cron: Unauthorized request');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const supabase = createAdminClient();

    const { error: rpcError } = await supabase.rpc('auto_expire_passes');

    if (rpcError) {
      console.error('Expire-passes cron: RPC error', rpcError);
      return NextResponse.json({
        success: false,
        error: 'Failed to execute pass expiration',
        details: rpcError.message,
      }, { status: 500 });
    }

    console.log('Expire-passes cron: Executed successfully');

    return NextResponse.json({
      success: true,
      message: 'Pass expiration executed',
      executed: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Expire-passes cron: Unexpected error', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
