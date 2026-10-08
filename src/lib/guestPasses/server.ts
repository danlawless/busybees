/**
 * Database side of member guest passes. Everything here uses the admin
 * client: callers are authorized by the route first (callerGuard.ts), and the
 * friend's account is not the signed-in one.
 */

import { createAdminClient } from '@/lib/supabase/server';
import { fromPurchaseRow, isActiveMembership } from '@/lib/membership';
import {
  GUEST_PASS_ALLOWANCE,
  decideGuestEligibility,
  guestPassesOpen,
  mergeGuestMatches,
  normalizeChildName,
  type GuestEligibility,
  type GuestMatch,
} from './rules';

/** Escape % and _ so an email is matched literally by ILIKE. */
function likeLiteral(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

async function purchaseCounts(userIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>(userIds.map((id) => [id, 0]));
  if (userIds.length === 0) return counts;
  const { data, error } = await createAdminClient()
    .from('purchases')
    .select('customer_id')
    .in('customer_id', userIds);
  if (error) throw error;
  for (const row of data ?? []) counts.set(row.customer_id, (counts.get(row.customer_id) ?? 0) + 1);
  return counts;
}

export async function findGuestMatches(input: {
  phone: string;
  email?: string;
  child?: { name: string; birthdate: string };
}): Promise<GuestMatch[]> {
  const db = createAdminClient();
  const found = new Map<string, string | null>(); // userId -> role

  const byPhone = await db.from('users').select('id, role').eq('phone', input.phone);
  if (byPhone.error) throw byPhone.error;
  for (const u of byPhone.data ?? []) found.set(u.id, u.role);

  if (input.email) {
    const byEmail = await db.from('users').select('id, role').ilike('email', likeLiteral(input.email.trim()));
    if (byEmail.error) throw byEmail.error;
    for (const u of byEmail.data ?? []) found.set(u.id, u.role);
  }

  if (input.child) {
    for (const [userId, role] of await childOwners([input.child])) found.set(userId, role);
  }

  return withPurchaseCounts(found);
}

type ChildKey = { name: string; birthdate: string };

/** Every account holding a child with one of these name + birthdate pairs. */
async function childOwners(children: readonly ChildKey[]): Promise<Map<string, string | null>> {
  const owners = new Map<string, string | null>(); // userId -> role
  if (children.length === 0) return owners;
  const wanted = new Set(children.map((c) => `${c.birthdate}|${normalizeChildName(c.name)}`));
  const { data, error } = await createAdminClient()
    .from('children')
    .select('name, birthdate, customer_id, users!inner(role)')
    .in('birthdate', [...new Set(children.map((c) => c.birthdate))]);
  if (error) throw error;
  for (const c of data ?? []) {
    if (!wanted.has(`${c.birthdate}|${normalizeChildName(c.name)}`)) continue;
    const owner = Array.isArray(c.users) ? c.users[0] : c.users;
    owners.set(c.customer_id, owner?.role ?? null);
  }
  return owners;
}

async function withPurchaseCounts(found: Map<string, string | null>): Promise<GuestMatch[]> {
  const counts = await purchaseCounts([...found.keys()]);
  return [...found.entries()].map(([userId, role]) => ({
    userId,
    role,
    purchaseCount: counts.get(userId) ?? 0,
  }));
}

/**
 * Is the friend eligible? Matches their phone, email and child, and -- when
 * that lands on an empty account -- also matches every child already on that
 * account, so an empty account (Dad's phone) cannot hide a child who is on a
 * paying one (Mum's). Both /check and issuing decide through this.
 */
export async function resolveGuestEligibility(input: {
  phone: string;
  email?: string;
  child?: ChildKey;
}): Promise<GuestEligibility> {
  const matches = await findGuestMatches(input);
  const first = decideGuestEligibility(matches);
  if (first.kind !== 'existing') return first;

  const accountChildren = await getGuestAccountChildren(first.userId);
  const childMatches = await withPurchaseCounts(await childOwners(accountChildren));
  return decideGuestEligibility(mergeGuestMatches([matches, childMatches]));
}

export async function getGuestAccountChildren(userId: string) {
  const { data, error } = await createAdminClient()
    .from('children')
    .select('id, name, birthdate, waiver_signed')
    .eq('customer_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    birthdate: c.birthdate,
    waiverSigned: c.waiver_signed ?? false,
  }));
}

export interface GuestPassStatus {
  open: boolean;
  hasMembership: boolean;
  allowance: number;
  used: number;
  remaining: number;
  guests: Array<{ purchaseId: string; childName: string; checkedInAt: string; visitOpen: boolean }>;
}

/**
 * Latest live membership row, chosen exactly as issue_guest_pass chooses it,
 * with its purchase_date: guest passes count from there, because legacy
 * subscriptions renew in place (the webhook moves purchase_date forward on
 * the same row).
 */
async function currentMembership(
  memberId: string,
  now: Date
): Promise<{ id: string; purchaseDate: string | null } | null> {
  const { data, error } = await createAdminClient()
    .from('purchases')
    .select('id, type, status, expiry_date, actual_expiry_date, purchase_date')
    .eq('customer_id', memberId)
    .eq('type', 'monthly_pass')
    .eq('status', 'active')
    .order('purchase_date', { ascending: false });
  if (error) throw error;
  const live = (data ?? []).find((p) => isActiveMembership(fromPurchaseRow(p), now));
  return live ? { id: live.id, purchaseDate: live.purchase_date ?? null } : null;
}

export async function getGuestPassStatus(memberId: string, now: Date = new Date()): Promise<GuestPassStatus> {
  const open = guestPassesOpen(now);
  const membership = await currentMembership(memberId, now);
  if (!membership) {
    return { open, hasMembership: false, allowance: GUEST_PASS_ALLOWANCE, used: 0, remaining: 0, guests: [] };
  }

  // This period only, as issue_guest_pass counts: an in-place renewal moves
  // the membership's purchase_date forward, and older guests stop counting.
  let guestQuery = createAdminClient()
    .from('purchases')
    .select('id, purchase_date, children(name), sessions(end_time)')
    .eq('guest_of_purchase_id', membership.id);
  if (membership.purchaseDate) guestQuery = guestQuery.gte('purchase_date', membership.purchaseDate);
  const { data, error } = await guestQuery.order('purchase_date', { ascending: true });
  if (error) throw error;

  const guests = (data ?? []).map((p) => {
    const child = Array.isArray(p.children) ? p.children[0] : p.children;
    const sessions = Array.isArray(p.sessions) ? p.sessions : [];
    return {
      purchaseId: p.id,
      childName: child?.name ?? 'Guest',
      checkedInAt: p.purchase_date ?? '',
      visitOpen: sessions.some((s) => s.end_time === null),
    };
  });
  const used = guests.length;
  return {
    open,
    hasMembership: true,
    allowance: GUEST_PASS_ALLOWANCE,
    used,
    remaining: Math.max(0, GUEST_PASS_ALLOWANCE - used),
    guests,
  };
}

type RpcJson = { ok?: boolean; reason?: string; purchase_id?: string; session_id?: string; remaining?: number };

export type IssueResult =
  | { ok: true; purchaseId: string; sessionId: string; remaining: number }
  | { ok: false; reason: string };

export async function issueGuestPassRpc(args: {
  memberId: string;
  guestId: string;
  childId: string;
  autoCheckoutTime: string;
}): Promise<IssueResult> {
  const { data, error } = await createAdminClient().rpc('issue_guest_pass', {
    p_member_id: args.memberId,
    p_guest_customer_id: args.guestId,
    p_child_id: args.childId,
    p_auto_checkout_time: args.autoCheckoutTime,
    p_allowance: GUEST_PASS_ALLOWANCE,
  });
  if (error) throw error;
  const r = (data ?? {}) as RpcJson;
  if (r.ok && r.purchase_id && r.session_id && typeof r.remaining === 'number') {
    return { ok: true, purchaseId: r.purchase_id, sessionId: r.session_id, remaining: r.remaining };
  }
  return { ok: false, reason: r.reason ?? 'unknown' };
}

export async function voidGuestPassRpc(purchaseId: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const { data, error } = await createAdminClient().rpc('void_guest_pass', { p_purchase_id: purchaseId });
  if (error) throw error;
  const r = (data ?? {}) as RpcJson;
  return r.ok ? { ok: true } : { ok: false, reason: r.reason ?? 'unknown' };
}

export async function getGuestPassSponsor(purchaseId: string): Promise<string | null> {
  const db = createAdminClient();
  const { data: guest, error } = await db
    .from('purchases')
    .select('guest_of_purchase_id')
    .eq('id', purchaseId)
    .maybeSingle();
  if (error) throw error;
  if (!guest?.guest_of_purchase_id) return null;
  const { data: membership, error: mError } = await db
    .from('purchases')
    .select('customer_id')
    .eq('id', guest.guest_of_purchase_id)
    .maybeSingle();
  if (mError) throw mError;
  return membership?.customer_id ?? null;
}

export async function signChildWaiver(childId: string): Promise<void> {
  const { error } = await createAdminClient()
    .from('children')
    .update({ waiver_signed: true, waiver_signed_date: new Date().toISOString() })
    .eq('id', childId)
    .eq('waiver_signed', false);
  if (error) throw error;
}
