/**
 * The Supabase Auth password behind every account.
 *
 * Customers and staff never see or type this: they prove who they are to our
 * own routes (web password, staff password, PIN, the POS device), and the
 * route then signs them in to Supabase with this. It used to be a pattern --
 * `PHONE-<phone>`, `STAFF-<phone>-AUTH`, `STAFF-PIN-<pin>-AUTH` -- and because
 * the anon key is public, anyone who knew the pattern and a phone number could
 * sign in to Supabase directly as that person, past every check we run.
 *
 * Now it is an HMAC of the account's auth id under a server-only key, so it
 * cannot be worked out from anything a caller knows. Server-only: never import
 * this from client code.
 */

import { createHmac, randomBytes } from 'node:crypto';
import { serverSecret } from './serverSecret';


/** The Supabase Auth password for this auth user id. */
export function hiddenPasswordFor(authUserId: string): string {
  return createHmac('sha256', serverSecret()).update(`supabase-auth-password:v1:${authUserId}`).digest('base64url');
}

/**
 * For creating a brand-new auth user, before its id exists: a random password
 * that nobody keeps. The caller must set hiddenPasswordFor(id) straight after.
 */
export function throwawayPassword(): string {
  return randomBytes(32).toString('base64url');
}
