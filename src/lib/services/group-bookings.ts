/**
 * Group Bookings Service Layer
 * Handles child search, assignment, and retrieval for group rate bookings
 */

import { createAdminClient } from '../supabase/server';

interface ChildSearchResult {
  id: string;
  name: string;
  birthdate: string;
  waiver_signed: boolean;
  waiver_signed_date: string | null;
  customer_id: string;
  parent_name: string;
  parent_phone: string;
}

interface AssignChildInput {
  child_id: string;
  waiver_signed_at_booking: boolean;
  is_new_child?: boolean;
}

interface GroupBookingChild {
  id: string;
  booking_id: string;
  child_id: string;
  added_by_user_id: string | null;
  is_new_child: boolean;
  waiver_signed_at_booking: boolean;
  created_at: string;
  child: {
    id: string;
    name: string;
    birthdate: string;
    waiver_signed: boolean;
    waiver_signed_date: string | null;
    customer_id: string;
  };
}

/**
 * Search children by name across all accounts (staff/admin only)
 * Returns child info with parent context for POS display
 */
export async function searchChildrenByName(query: string): Promise<ChildSearchResult[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('children')
    .select(`
      id,
      name,
      birthdate,
      waiver_signed,
      waiver_signed_date,
      customer_id,
      users!children_customer_id_fkey (
        name,
        phone
      )
    `)
    .ilike('name', `%${query}%`)
    .limit(20);

  if (error) {
    console.error('Error searching children:', error);
    throw error;
  }

  return (data || []).map((child: Record<string, unknown>) => {
    const user = child.users as { name: string; phone: string } | null;
    return {
      id: child.id as string,
      name: child.name as string,
      birthdate: child.birthdate as string,
      waiver_signed: child.waiver_signed as boolean,
      waiver_signed_date: child.waiver_signed_date as string | null,
      customer_id: child.customer_id as string,
      parent_name: user?.name || 'Unknown',
      parent_phone: user?.phone || '',
    };
  });
}

/**
 * Assign children to a group booking (bulk insert)
 */
export async function assignChildrenToBooking(
  bookingId: string,
  children: AssignChildInput[],
  addedByUserId?: string
): Promise<void> {
  const supabase = createAdminClient();

  const rows = children.map((child) => ({
    booking_id: bookingId,
    child_id: child.child_id,
    added_by_user_id: addedByUserId || null,
    is_new_child: child.is_new_child || false,
    waiver_signed_at_booking: child.waiver_signed_at_booking,
  }));

  const { error } = await supabase
    .from('group_booking_children')
    .insert(rows);

  if (error) {
    console.error('Error assigning children to booking:', error);
    throw error;
  }
}

/**
 * Get all children assigned to a group booking
 */
export async function getGroupBookingChildren(bookingId: string): Promise<GroupBookingChild[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('group_booking_children')
    .select(`
      id,
      booking_id,
      child_id,
      added_by_user_id,
      is_new_child,
      waiver_signed_at_booking,
      created_at,
      children!group_booking_children_child_id_fkey (
        id,
        name,
        birthdate,
        waiver_signed,
        waiver_signed_date,
        customer_id
      )
    `)
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching group booking children:', error);
    throw error;
  }

  return (data || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    booking_id: row.booking_id as string,
    child_id: row.child_id as string,
    added_by_user_id: row.added_by_user_id as string | null,
    is_new_child: row.is_new_child as boolean,
    waiver_signed_at_booking: row.waiver_signed_at_booking as boolean,
    created_at: row.created_at as string,
    child: row.children as GroupBookingChild['child'],
  }));
}
