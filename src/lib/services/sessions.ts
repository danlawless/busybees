/**
 * Session Service Layer
 * CRUD operations for play sessions
 */

import { createClient, createAdminClient } from '../supabase/server';
import { Database } from '../supabase/database.types';

type Session = Database['public']['Tables']['sessions']['Row'];
type SessionInsert = Database['public']['Tables']['sessions']['Insert'];
type SessionUpdate = Database['public']['Tables']['sessions']['Update'];

/**
 * Get session by ID
 */
export async function getSession(id: string): Promise<Session | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching session:', error);
    throw error;
  }

  return data;
}

/**
 * Get active sessions for a customer
 */
export async function getActiveSessions(customerId: string): Promise<Session[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('customer_id', customerId)
    .is('end_time', null)
    .order('start_time', { ascending: false });

  if (error) {
    console.error('Error fetching active sessions:', error);
    throw error;
  }

  return data;
}

/**
 * Get all active sessions (staff only)
 */
export async function getAllActiveSessions(): Promise<Session[]> {
  const supabase = await createClient();

  // Paginated to bypass Supabase 1000-row cap
  const PAGE_SIZE = 1000;
  const all: Session[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        *,
        customer:users!sessions_customer_id_fkey (id, name, phone),
        purchase:purchases (id, name, type)
      `)
      .is('end_time', null)
      .order('start_time', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error('Error fetching all active sessions:', error);
      throw error;
    }

    const rows = data || [];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all;
}

/**
 * Create a new session (check-in)
 */
export async function createSession(session: SessionInsert): Promise<Session> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('sessions')
    .insert(session)
    .select()
    .single();

  if (error) {
    console.error('Error creating session:', error);
    throw error;
  }

  return data;
}

/**
 * End a session (check-out)
 */
export async function endSession(id: string): Promise<Session> {
  const supabase = createAdminClient();

  const now = new Date().toISOString();

  // Get the session first to calculate duration
  const session = await getSession(id);
  if (!session) {
    throw new Error('Session not found');
  }

  const startTime = new Date(session.start_time);
  const endTime = new Date(now);
  const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000 / 60); // minutes

  const { data, error } = await supabase
    .from('sessions')
    .update({
      end_time: now,
      duration,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error ending session:', error);
    throw error;
  }

  return data;
}

/**
 * End all sessions for a customer (force checkout)
 */
export async function endAllCustomerSessions(customerId: string): Promise<void> {
  const supabase = createAdminClient();

  const activeSessions = await getActiveSessions(customerId);

  for (const session of activeSessions) {
    await endSession(session.id);
  }
}

/**
 * Get session history for a customer
 */
export async function getSessionHistory(customerId: string): Promise<Session[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('customer_id', customerId)
    .not('end_time', 'is', null)
    .order('start_time', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching session history:', error);
    throw error;
  }

  return data;
}

