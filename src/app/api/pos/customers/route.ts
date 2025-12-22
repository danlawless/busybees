/**
 * API Route: POS Customers
 * GET - List all customers with children for POS admin panel
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

interface FormattedChild {
  id: string;
  name: string;
  birthdate: string;
  waiver_signed: boolean;
  waiver_signed_date: string | null;
  created_at: string;
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
    const supabase = createAdminClient();

    // Fetch all customers with role 'customer'
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'customer')
      .order('created_at', { ascending: false });

    if (usersError) {
      logger.error({ error: usersError }, 'Failed to fetch customers');
      return NextResponse.json(
        { error: 'Failed to fetch customers' },
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

    // Format response to match the AdminPanel expected structure
    const customers = users.map((user) => {
      const userChildren = childrenByCustomer.get(user.id) || [];
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
        activeSessions: [], // Sessions would need a separate fetch if needed
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
