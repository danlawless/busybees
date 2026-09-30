/**
 * One-time admin access setup. Run locally against the target Supabase project:
 *   pnpm admin:setup
 * Reads NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STAFF_ACCOUNT_PASSWORD,
 * ADMIN_ACCOUNT_PASSWORD from .env.local. Prompts for the two PINs; they are never
 * written to disk or logged.
 */
import 'dotenv/config';
import { config } from 'dotenv';
import { createInterface } from 'node:readline/promises';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

config({ path: '.env.local' });

const env = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing ${k}`);
  return v;
};

const db = createClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });

async function findUserId(email: string): Promise<string | null> {
  for (let page = 1; page <= 100; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const hit = data.users.find(u => u.email === email);
    if (hit) return hit.id;
    if (data.users.length < 1000) return null;
  }
  return null;
}

async function ensureAccount(email: string, password: string, role: 'staff' | 'admin', name: string) {
  let id = await findUserId(email);
  if (id) {
    const { error } = await db.auth.admin.updateUserById(id, { password, email_confirm: true });
    if (error) throw error;
  } else {
    const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name, role } });
    if (error) throw error;
    id = data.user.id;
  }
  const { error } = await db.from('users').upsert({ id, email, name, role, phone: role === 'admin' ? '0000000001' : '0000000000' }, { onConflict: 'id' });
  if (error) throw error;
  console.log(`✓ ${email} is ${role}`);
}

async function main() {
  await ensureAccount('staff@busybees.internal', env('STAFF_ACCOUNT_PASSWORD'), 'staff', 'Staff (shared)');
  await ensureAccount('admin@busybees.internal', env('ADMIN_ACCOUNT_PASSWORD'), 'admin', 'Admin (shared)');

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ask = async (q: string) => {
    const a = (await rl.question(q)).trim();
    if (!/^\d{4}$/.test(a)) throw new Error('Codes are exactly 4 digits');
    return a;
  };
  const staff = await ask('Staff code (4 digits): ');
  const admin = await ask('Admin code (4 digits): ');
  rl.close();
  if (staff === admin) throw new Error('Staff and admin codes must differ');

  const rows = [
    { key: 'staff_pin_hash', value: bcrypt.hashSync(staff, 10), description: 'bcrypt hash of the staff PIN' },
    { key: 'admin_pin_hash', value: bcrypt.hashSync(admin, 10), description: 'bcrypt hash of the admin PIN' },
  ];
  const { error } = await db.from('settings').upsert(rows, { onConflict: 'key' });
  if (error) throw error;
  console.log('✓ PIN hashes saved');

  const { error: delErr } = await db.from('settings').delete().in('key', ['staff_pin', 'admin_pin']);
  if (delErr) throw delErr;
  console.log('✓ plaintext staff_pin and admin_pin removed');
}

main().catch(e => { console.error('✗', e.message); process.exit(1); });
