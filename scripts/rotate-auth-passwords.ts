/**
 * One-off: replace every account's guessable Supabase Auth password.
 *
 * Until 5 Oct 2026 these were patterns -- `PHONE-<phone>`, `STAFF-<phone>-AUTH`,
 * `STAFF-PIN-<pin>-AUTH` -- and the anon key is public, so anyone who knew a
 * phone number could sign in to Supabase directly as that person. Login routes
 * now set an unguessable hidden password before every sign-in, but an account
 * that never logs in again would keep its old pattern password for ever. This
 * gives every auth user a random password; their next login sets the hidden one.
 *
 * No customer or staff member ever types this password, so nothing changes
 * for them. If Supabase ends existing sessions on a password change, people
 * simply sign in again as usual (run it at a quiet time, e.g. after close).
 *
 *   npx -y tsx scripts/rotate-auth-passwords.ts           # dry run: counts only
 *   npx -y tsx scripts/rotate-auth-passwords.ts --apply   # does it (ask Tim first)
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(resolve(__dirname, '../.env.local'), 'utf8')
    .split('\n')
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => [m[1], m[2].trim().replace(/^["']|["']$/g, '')])
);

const apply = process.argv.includes('--apply');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const ids: string[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    ids.push(...data.users.map((u) => u.id));
    if (data.users.length < 1000) break;
  }
  console.log(`${ids.length} auth users found (${apply ? 'APPLYING' : 'dry run, nothing changed'})`);
  if (!apply) return;

  let done = 0;
  const failed: string[] = [];
  // A few at a time, to stay well inside the Auth admin API's rate limits.
  for (let i = 0; i < ids.length; i += 5) {
    await Promise.all(
      ids.slice(i, i + 5).map(async (id) => {
        const { error } = await supabase.auth.admin.updateUserById(id, {
          password: randomBytes(32).toString('base64url'),
        });
        if (error) failed.push(`${id}: ${error.message}`);
        else done++;
      })
    );
    if ((i / 5) % 40 === 0) console.log(`  ${done} of ${ids.length}`);
  }
  console.log(`Done: ${done} rotated, ${failed.length} failed`);
  for (const f of failed) console.log('  failed', f);
  if (failed.length) process.exit(1);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
