/**
 * API Route: Customer Saved Cards
 * GET - Get saved payment cards for a customer (POS use)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: customerId } = await params;

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Verify the customer exists
    const { data: customer, error: customerError } = await supabase
      .from('users')
      .select('id')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      logger.warn({ customerId }, 'Customer not found when fetching cards');
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Fetch saved cards for this customer
    const { data: savedCards, error: cardsError } = await supabase
      .from('saved_cards')
      .select('id, last4, brand, expiry_month, expiry_year, is_default')
      .eq('customer_id', customerId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (cardsError) {
      logger.error({ error: cardsError, customerId }, 'Failed to fetch saved cards');
      throw cardsError;
    }

    // Return cards array (empty array if no cards)
    return NextResponse.json(savedCards || []);
  } catch (error) {
    logger.error({ error }, 'Error fetching customer cards');
    return NextResponse.json(
      {
        error: 'Failed to fetch customer cards',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
