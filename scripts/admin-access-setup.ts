/**
 * One-time admin access setup. Run locally against the target Supabase project:
 *   pnpm admin:setup
 * Loads ONLY .env.local (override: true, so a stray .env can never win) and reads
 * NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STAFF_ACCOUNT_PASSWORD,
 * ADMIN_ACCOUNT_PASSWORD from it. Prints the target Supabase host and requires it
 * typed back exactly before anything changes. Prompts for the two PINs first; they
 * are never written to disk or logged.
 *
 * The two emails duplicate SHARED_ACCOUNTS in src/lib/admin/shared-accounts.ts and the
 * bcrypt cost (10) matches src/lib/auth/pin.ts; scripts cannot import Next server modules.
 */
import { config } from 'dotenv';
import { createInterface } from 'node:readline';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

config({ path: '.env.local', override: true });

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

function promptAll(questions: string[], validate: (answers: string[]) => void): Promise<string[]> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise<string[]>((resolve, reject) => {
    const answers: string[] = [];
    let settled = false;
    const done = (fn: () => void) => { if (!settled) { settled = true; fn(); } };
    rl.on('close', () => done(() => reject(new Error('Input closed before all answers were given'))));
    const next = () => {
      if (answers.length === questions.length) {
        try { validate(answers); done(() => resolve(answers)); } catch (e) { done(() => reject(e)); }
        return;
      }
      rl.question(questions[answers.length], a => { answers.push(a.trim()); next(); });
    };
    next();
  }).finally(() => rl.close());
}

async function main() {
  const host = new URL(env('NEXT_PUBLIC_SUPABASE_URL')).host;
  console.log(`Target Supabase project: ${host}`);
  const [typedHost] = await promptAll(['Type the host above exactly to continue: '], () => {});
  if (typedHost !== host) throw new Error('Host did not match; nothing was changed');

  const [staff, admin] = await promptAll(['Staff code (4 digits): ', 'Admin code (4 digits): '], ([s, a]) => {
    if (!/^\d{4}$/.test(s) || !/^\d{4}$/.test(a)) throw new Error('Codes are exactly 4 digits');
    if (s === a) throw new Error('Staff and admin codes must differ');
  });

  await ensureAccount('staff@busybees.internal', env('STAFF_ACCOUNT_PASSWORD'), 'staff', 'Staff (shared)');
  await ensureAccount('admin@busybees.internal', env('ADMIN_ACCOUNT_PASSWORD'), 'admin', 'Admin (shared)');

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
