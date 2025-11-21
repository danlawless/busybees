/**
 * Stripe Config API
 * GET - Return publishable key for client-side use
 */

import { NextResponse } from 'next/server';
import { getPublishableKey } from '@/lib/stripe/client';

export async function GET() {
  try {
    const publishableKey = await getPublishableKey();

    return NextResponse.json({
      publishableKey
    });
  } catch (error) {
    console.error('Error fetching Stripe config:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch Stripe configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

