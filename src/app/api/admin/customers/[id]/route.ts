/**
 * API Route: Admin Customer by ID
 * GET - Fetch single customer with full details
 * PATCH - Update customer profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { Database } from '@/lib/supabase/database.types';

type DbChild = Database['public']['Tables']['children']['Row'];
type DbPurchase = Database['public']['Tables']['purchases']['Row'];
type DbSession = Database['public']['Tables']['sessions']['Row'];
type DbSavedCard = Database['public']['Tables']['saved_cards']['Row'];

function calculateAge(birthdate: string): number {
  const today = new Date();
  const birth = new Date(birthdate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    logger.info({ customerId: id }, '📊 Fetching customer details');
    const supabase = createAdminClient();

    // Fetch customer
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (userError || !user) {
      logger.warn({ customerId: id, error: userError }, 'Customer not found');
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Fetch related data in parallel
    const [childrenResult, purchasesResult, sessionsResult, cardsResult] = await Promise.all([
      supabase.from('children').select('*').eq('customer_id', id),
      supabase.from('purchases').select('*').eq('customer_id', id).order('purchase_date', { ascending: false }),
      supabase.from('sessions').select('*').eq('customer_id', id).is('end_time', null),
      supabase.from('saved_cards').select('*').eq('customer_id', id),
    ]);

    const children = ((childrenResult.data || []) as DbChild[]).map(child => ({
      id: child.id,
      name: child.name,
      birthdate: child.birthdate,
      age: calculateAge(child.birthdate),
      waiverSigned: child.waiver_signed,
      waiverSignedDate: child.waiver_signed_date,
      createdAt: child.created_at,
    }));

    const purchases = ((purchasesResult.data || []) as DbPurchase[]).map(purchase => ({
      id: purchase.id,
      type: purchase.type,
      name: purchase.name,
      price: purchase.price,
      purchaseDate: purchase.purchase_date,
      expiryDate: purchase.expiry_date,
      firstUseDate: purchase.first_use_date,
      actualExpiryDate: purchase.actual_expiry_date,
      usedSessions: purchase.used_sessions,
      totalSessions: purchase.total_sessions,
      status: purchase.status,
      autoRenew: purchase.auto_renew,
      nextRenewalDate: purchase.next_renewal_date,
      childId: purchase.child_id,
    }));

    const activeSessions = ((sessionsResult.data || []) as DbSession[]).map(session => ({
      id: session.id,
      customerId: session.customer_id,
      purchaseId: session.purchase_id,
      startTime: session.start_time,
      endTime: session.end_time,
      duration: session.duration,
      autoCheckoutTime: session.auto_checkout_time,
    }));

    const savedCards = ((cardsResult.data || []) as DbSavedCard[]).map(card => ({
      id: card.id,
      last4: card.last4,
      brand: card.brand,
      expiryMonth: card.expiry_month,
      expiryYear: card.expiry_year,
      isDefault: card.is_default,
    }));

    const customer = {
      id: user.id,
      phone: user.phone,
      name: user.name,
      email: user.email,
      children,
      purchases,
      activeSessions,
      savedCards,
      createdAt: user.created_at,
      lastVisit: user.last_visit,
      giftCardBalance: user.gift_card_balance,
    };

    return NextResponse.json({ customer });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch customer');
    return NextResponse.json({ error: 'Failed to fetch customer' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    logger.info({ customerId: id, updates: body }, '📝 Updating customer profile');

    const supabase = createAdminClient();

    // Validate input
    const allowedFields = ['name', 'email', 'phone'];
    const updates: Record<string, string | null> = {};

    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Update customer
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error({ error, customerId: id }, 'Failed to update customer');
      return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
    }

    logger.info({ customerId: id }, '✅ Customer updated successfully');
    return NextResponse.json({ customer: data });
  } catch (error) {
    logger.error({ error }, 'Failed to update customer');
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
  }
}
