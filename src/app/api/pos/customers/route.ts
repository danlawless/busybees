/**
 * API Route: POS Customers
 * GET - List all customers with children and active sessions for POS admin panel
 *
 * Uses admin client (service role) to bypass RLS since POS staff
 * authentication is PIN-based rather than Supabase session-based.
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { Database } from '@/lib/supabase/database.types';

// Use database types directly for consistency
type DbUser = Database['public']['Tables']['users']['Row'];
type DbChild = Database['public']['Tables']['children']['Row'];
type DbSession = Database['public']['Tables']['sessions']['Row'];

interface FormattedChild {
  id: string;
  name: string;
  birthdate: string;
  waiver_signed: boolean;
  waiver_signed_date: string | null;
  created_at: string;
}

interface FormattedSession {
  id: string;
  customerId: string;
  purchaseId: string;
  startTime: string;
  endTime: string | null;
  duration: number | null;
  autoCheckoutTime: string;
}

/**
 * Calculate age from birthdate
 */
function calculateAge(birthdate: string): number {
  const birth = new Date(birthdate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export async function GET() {
  try {
    logger.info({}, '📊 POS customers API called');
    const supabase = createAdminClient();

    // Fetch all customers with role 'customer'
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'customer')
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

    // Type assertion with null handling
    const users = (usersData || []) as DbUser[];

    if (users.length === 0) {
      logger.info({}, 'POS customers: No customers found');
      return NextResponse.json({ customers: [] });
    }

    // Fetch all children for these customers
    const customerIds = users.map((u) => u.id);

    const { data: childrenData, error: childrenError } = await supabase
      .from('children')
      .select('*')
      .in('customer_id', customerIds);

    if (childrenError) {
      logger.warn({ error: childrenError }, 'Failed to fetch children');
      // Continue without children rather than failing
    }

    const allChildren = (childrenData || []) as DbChild[];

    // Map children to their customers
    const childrenByCustomer = new Map<string, FormattedChild[]>();
    for (const child of allChildren) {
      const customerId = child.customer_id;
      if (!childrenByCustomer.has(customerId)) {
        childrenByCustomer.set(customerId, []);
      }
      childrenByCustomer.get(customerId)!.push({
        id: child.id,
        name: child.name,
        birthdate: child.birthdate,
        waiver_signed: child.waiver_signed,
        waiver_signed_date: child.waiver_signed_date,
        created_at: child.created_at,
      });
    }

    // Fetch active sessions for all customers (where end_time is null)
    const { data: sessionsData, error: sessionsError } = await supabase
      .from('sessions')
      .select('*')
      .in('customer_id', customerIds)
      .is('end_time', null);

    if (sessionsError) {
      logger.warn({ error: sessionsError }, 'Failed to fetch sessions');
      // Continue without sessions rather than failing
    }

    const allSessions = (sessionsData || []) as DbSession[];

    // Map sessions to their customers
    const sessionsByCustomer = new Map<string, FormattedSession[]>();
    for (const session of allSessions) {
      const customerId = session.customer_id;
      if (!sessionsByCustomer.has(customerId)) {
        sessionsByCustomer.set(customerId, []);
      }
      sessionsByCustomer.get(customerId)!.push({
        id: session.id,
        customerId: session.customer_id,
        purchaseId: session.purchase_id,
        startTime: session.start_time,
        endTime: session.end_time,
        duration: session.duration,
        autoCheckoutTime: session.auto_checkout_time,
      });
    }

    // Format response to match the AdminPanel expected structure
    const customers = users.map((user) => {
      const userChildren = childrenByCustomer.get(user.id) || [];
      const userSessions = sessionsByCustomer.get(user.id) || [];
      return {
        id: user.id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        children: userChildren.map((child) => ({
          id: child.id,
          name: child.name,
          birthdate: child.birthdate,
          age: calculateAge(child.birthdate),
          waiverSigned: child.waiver_signed,
          waiverSignedDate: child.waiver_signed_date,
          createdAt: child.created_at,
        })),
        purchases: [], // Purchases would need a separate fetch if needed
        activeSessions: userSessions,
        savedCards: [], // Payment methods would need a separate fetch if needed
        createdAt: user.created_at,
        lastVisit: user.last_login,
      };
    });

    logger.info(
      { customerCount: customers.length },
      'POS customers fetched successfully'
    );

    return NextResponse.json({ customers });
  } catch (error) {
    logger.error({ error }, 'POS customers fetch error');
    return NextResponse.json(
      {
        error: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
