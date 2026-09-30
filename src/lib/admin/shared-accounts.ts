import { createAdminClient } from '@/lib/supabase/server';
import type { Level } from './nav';

export const SHARED_ACCOUNTS: Record<Level, { email: string; passwordEnv: 'STAFF_ACCOUNT_PASSWORD' | 'ADMIN_ACCOUNT_PASSWORD' }> = {
  staff: { email: 'staff@busybees.internal', passwordEnv: 'STAFF_ACCOUNT_PASSWORD' },
  admin: { email: 'admin@busybees.internal', passwordEnv: 'ADMIN_ACCOUNT_PASSWORD' },
};

export async function loadPinHashes(): Promise<{ admin: string | null; staff: string | null }> {
  const db = createAdminClient();
  const { data } = await db.from('settings').select('key, value').in('key', ['admin_pin_hash', 'staff_pin_hash']);
  const byKey = new Map((data ?? []).map(r => [r.key, r.value || null]));
  return { admin: byKey.get('admin_pin_hash') ?? null, staff: byKey.get('staff_pin_hash') ?? null };
}
