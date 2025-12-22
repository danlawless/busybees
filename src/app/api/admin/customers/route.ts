/**
 * API Route: Admin Customers
 * GET - List all customers with their children, purchases, and sessions
 * Note: This endpoint is accessed from the POS admin panel which uses PIN authentication.
 * Using admin client to bypass RLS (consistent with other admin APIs like newsletter-subscribers).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { Database } from '@/lib/supabase/database.types';

// Database row types
type DbUser = Database['public']['Tables']['users']['Row'];
type DbChild = Database['public']['Tables']['children']['Row'];
type DbPurchase = Database['public']['Tables']['purchases']['Row'];
type DbSession = Database['public']['Tables']['sessions']['Row'];
type DbSavedCard = Database['public']['Tables']['saved_cards']['Row'];

interface ChildData {
  id: string;
  name: string;
  birthdate: string;
  waiverSigned: boolean;
  waiverSignedDate: string | null;
  createdAt: string;
}

interface PurchaseData {
  id: string;
  type: string;
  name: string;
  price: number;
  purchaseDate: string;
  expiryDate: string | null;
  firstUseDate: string | null;
  actualExpiryDate: string | null;
  usedSessions: number;
  totalSessions: number;
  status: string;
}

interface SessionData {
  id: string;
  customerId: string;
  purchaseId: string;
  startTime: string;
  endTime: string | null;
  duration: number | null;
  autoCheckoutTime: string;
}

interface SavedCardData {
  id: string;
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
}

interface CustomerData {
  id: string;
  phone: string;
  name: string;
  email: string | null;
  children: ChildData[];
  purchases: PurchaseData[];
  activeSessions: SessionData[];
  savedCards: SavedCardData[];
  createdAt: string;
  lastVisit: string | null;
}

/**
 * Calculate age from birthdate
 */
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    logger.info({}, '📊 Admin customers API called');
    const supabase = createAdminClient();

    // Fetch all customers with role 'customer'
    // Using explicit type cast to ensure proper type inference
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'customer' as const)
      .order('created_at', { ascending: false });

    if (usersError) {
      logger.error(
        { error: usersError, code: usersError.code, details: usersError.details },
        'Failed to fetch customers from database'
      );
      return NextResponse.json(
        { error: 'Failed to fetch customers', details: usersError.message },
        { status: 500 }
      );
    }

    // Type assertion and null check
    const users = (usersData || []) as DbUser[];

    if (users.length === 0) {
      logger.info({}, '📊 No customers found');
      return NextResponse.json({
        customers: [],
        stats: { total: 0, withPurchases: 0, active: 0 }
      });
    }

    logger.info({ count: users.length }, '📊 Found customers in database');

    // Get all customer IDs for batch queries
    const customerIds = users.map(u => u.id);

    // Batch fetch children for all customers
    const { data: childrenData, error: childrenError } = await supabase
      .from('children')
      .select('*')
      .in('customer_id', customerIds);

    if (childrenError) {
      logger.warn({ error: childrenError }, 'Failed to fetch children');
    }
    const allChildren = (childrenData || []) as DbChild[];

    // Batch fetch purchases for all customers
    const { data: purchasesData, error: purchasesError } = await supabase
      .from('purchases')
      .select('*')
      .in('customer_id', customerIds)
      .order('purchase_date', { ascending: false });

    if (purchasesError) {
      logger.warn({ error: purchasesError }, 'Failed to fetch purchases');
    }
    const allPurchases = (purchasesData || []) as DbPurchase[];

    // Batch fetch active sessions (no end_time means still active)
    const { data: sessionsData, error: sessionsError } = await supabase
      .from('sessions')
      .select('*')
      .in('customer_id', customerIds)
      .is('end_time', null);

    if (sessionsError) {
      logger.warn({ error: sessionsError }, 'Failed to fetch sessions');
    }
    const allSessions = (sessionsData || []) as DbSession[];

    // Batch fetch saved cards
    const { data: cardsData, error: cardsError } = await supabase
      .from('saved_cards')
      .select('*')
      .in('customer_id', customerIds);

    if (cardsError) {
      logger.warn({ error: cardsError }, 'Failed to fetch saved cards');
    }
    const allCards = (cardsData || []) as DbSavedCard[];

    // Group data by customer ID with proper types
    const childrenByCustomer = new Map<string, DbChild[]>();
    for (const child of allChildren) {
      const existing = childrenByCustomer.get(child.customer_id) || [];
      existing.push(child);
      childrenByCustomer.set(child.customer_id, existing);
    }

    const purchasesByCustomer = new Map<string, DbPurchase[]>();
    for (const purchase of allPurchases) {
      const existing = purchasesByCustomer.get(purchase.customer_id) || [];
      existing.push(purchase);
      purchasesByCustomer.set(purchase.customer_id, existing);
    }

    const sessionsByCustomer = new Map<string, DbSession[]>();
    for (const session of allSessions) {
      const existing = sessionsByCustomer.get(session.customer_id) || [];
      existing.push(session);
      sessionsByCustomer.set(session.customer_id, existing);
    }

    const cardsByCustomer = new Map<string, DbSavedCard[]>();
    for (const card of allCards) {
      const existing = cardsByCustomer.get(card.customer_id) || [];
      existing.push(card);
      cardsByCustomer.set(card.customer_id, existing);
    }

    // Transform to frontend format
    const customers: CustomerData[] = users.map(user => {
      const children = (childrenByCustomer.get(user.id) || []).map(child => ({
        id: child.id,
        name: child.name,
        birthdate: child.birthdate,
        age: calculateAge(child.birthdate),
        waiverSigned: child.waiver_signed,
        waiverSignedDate: child.waiver_signed_date,
        createdAt: child.created_at,
      }));

      const purchases = (purchasesByCustomer.get(user.id) || []).map(purchase => ({
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
      }));

      const activeSessions = (sessionsByCustomer.get(user.id) || []).map(session => ({
        id: session.id,
        customerId: session.customer_id,
        purchaseId: session.purchase_id,
        startTime: session.start_time,
        endTime: session.end_time,
        duration: session.duration,
        autoCheckoutTime: session.auto_checkout_time,
      }));

      const savedCards = (cardsByCustomer.get(user.id) || []).map(card => ({
        id: card.id,
        last4: card.last4,
        brand: card.brand,
        expiryMonth: card.expiry_month,
        expiryYear: card.expiry_year,
        isDefault: card.is_default,
      }));

      // Get last visit from most recent purchase or session
      const lastPurchaseDate = purchases.length > 0 ? purchases[0].purchaseDate : null;
      const lastSessionDate = activeSessions.length > 0 ? activeSessions[0].startTime : null;
      const lastVisit = lastPurchaseDate && lastSessionDate
        ? (new Date(lastPurchaseDate) > new Date(lastSessionDate) ? lastPurchaseDate : lastSessionDate)
        : (lastPurchaseDate || lastSessionDate);

      return {
        id: user.id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        children,
        purchases,
        activeSessions,
        savedCards,
        createdAt: user.created_at,
        lastVisit,
      };
    });

    // Calculate stats
    const stats = {
      total: customers.length,
      withPurchases: customers.filter(c => c.purchases.length > 0).length,
      active: customers.filter(c => c.activeSessions.length > 0).length,
    };

    logger.info(
      { count: customers.length, stats },
      '📊 Admin customers fetched'
    );

    return NextResponse.json({ customers, stats });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch admin customers');
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}
