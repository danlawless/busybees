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

interface DbChild {
  id: string;
  customer_id: string;
  name: string;
  birthdate: string;
  waiver_signed: boolean;
  waiver_signed_date: string | null;
  created_at: string;
}

interface DbUser {
  id: string;
  phone: string;
  name: string;
  email: string | null;
  role: string;
  created_at: string;
  last_login: string | null;
}

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

    // Fetch all customers with their children
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: users, error: usersError } = await (supabase.from('users') as any)
      .select(`
        id,
        phone,
        name,
        email,
        role,
        created_at,
        last_login
      `)
      .eq('role', 'customer')
      .order('created_at', { ascending: false });

    if (usersError) {
      logger.error({ error: usersError }, 'Failed to fetch customers');
      return NextResponse.json(
        { error: 'Failed to fetch customers' },
        { status: 500 }
      );
    }

    const typedUsers = users as DbUser[];

    // Fetch all children for these customers
    const customerIds = typedUsers.map((u) => u.id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: children, error: childrenError } = await (supabase.from('children') as any)
      .select('*')
      .in('customer_id', customerIds);

    if (childrenError) {
      logger.error({ error: childrenError }, 'Failed to fetch children');
      // Continue without children rather than failing
    }

    const typedChildren = (children || []) as DbChild[];

    // Map children to their customers
    const childrenByCustomer = new Map<string, FormattedChild[]>();
    for (const child of typedChildren) {
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
    const customers = typedUsers.map((user) => {
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
