/**
 * Cron API Endpoint for Auto-Checkout
 * Runs daily to execute auto-checkout for sessions past their auto_checkout_time
 *
 * Protected by CRON_SECRET environment variable
 *
 * Note: The SQL function auto_checkout_sessions() handles the time check by comparing
 * each session's auto_checkout_time against NOW(). This is more reliable than checking
 * if we're "past closing time" since it handles timezone edge cases correctly.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // In development, allow without secret for testing
    if (process.env.NODE_ENV === 'production' && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        console.log('Auto-checkout cron: Unauthorized request');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Execute auto-checkout
    // The SQL function checks auto_checkout_time < NOW() for each session,
    // which correctly handles all timezone and day-boundary cases
    const supabase = createAdminClient();

    // Call the auto_checkout_sessions function
    const { error: rpcError } = await supabase.rpc('auto_checkout_sessions');

    if (rpcError) {
      console.error('Auto-checkout cron: RPC error', rpcError);
      return NextResponse.json({
        success: false,
        error: 'Failed to execute auto-checkout',
        details: rpcError.message
      }, { status: 500 });
    }

    console.log('Auto-checkout cron: Executed successfully');

    return NextResponse.json({
      success: true,
      message: 'Auto-checkout executed',
      executed: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Auto-checkout cron: Unexpected error', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
