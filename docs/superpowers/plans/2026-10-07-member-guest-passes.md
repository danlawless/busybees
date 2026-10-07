# Member Guest Passes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Monthly members can check a new family's child in free, twice per membership period, from the POS member screen.

**Architecture:** A guest visit is a $0 "Guest Pass" `day_pass` purchase on the *friend's* account, tagged with `guest_of_purchase_id` = the member's current membership purchase. Counting and inserting happen together in one Postgres function (`issue_guest_pass`) that locks the membership row, so two simultaneous requests cannot both spend the last pass. TypeScript holds the pure rules (eligibility, caller, start date) and a thin service; one route family under `/api/guest-passes` does its own authorization because the POS is signed in *as the member* and must write to another account.

**Tech Stack:** Next.js 15 App Router route handlers, Supabase (admin client + `rpc`), Zod, Vitest, React 19 client components, Tailwind 4.

**Spec:** `docs/superpowers/specs/2026-10-07-member-guest-passes-design.md`

## Global Constraints

- Allowance: **2** guest passes per membership period (`GUEST_PASS_ALLOWANCE = 2`).
- Starts **1 November 2026, midnight Eastern** = `2026-11-01T00:00:00-04:00` (DST ends 2 a.m. that day, so midnight is still EDT).
- One pass = one child, any age (infants included).
- Eligible guest = no matching account, **or** a matching customer account with **zero purchases of any type or status**. Match = phone, OR email (case-insensitive), OR a child with the same normalized name and birthdate.
- Guest account details required for a new family: parent name, 10-digit phone, email, child name, child birthdate. Waiver must be agreed at the counter.
- Membership = latest `monthly_pass` purchase with `status = 'active'` and `COALESCE(actual_expiry_date, expiry_date)` null or in the future — same test as `isActiveMembership` in `src/lib/membership.ts`.
- Migrations are applied **by hand** in the Supabase SQL Editor (Supabase CLI does not work here). Next free number: **057**.
- No `any`. Zod on every request body. Commit messages: `emoji type: description`, never `--no-verify`.
- `tsc`/lint have pre-existing errors in this repo: measure that this branch adds **none**, do not chase zero.
- Customer-facing copy: "Bring a friend", "guest passes", "new to Busy Bees". Refusal copy: **"Already a Busy Bees customer — not eligible."**

## Review Focus

1. **Undo after the visit ended** — staff tap Undo on a guest who already checked out: must refuse ("This visit has already ended"), not delete the purchase and hand the pass back. Test in Task 1's SQL tests (T6) and Task 5's route mapping.
2. **Friend matched by email or child only, account has purchases** — phone is new but email belongs to a paying family: must be refused, not create a second account. Test in Task 2 (`decideGuestEligibility`) and SQL test T4.
3. **Friend's details match two different empty accounts** (phone → A, email → B): must refuse with a clear "matches more than one account" message rather than picking one. Test in Task 2.
4. **Member is also the friend** (member types their own phone): refused as not eligible (they have purchases); the SQL function independently refuses `same_account`. Test in Task 2 and SQL T5.
5. **Guest passes on reports** — $0 guest passes must not inflate "day passes sold" in the admin passes report. Test in Task 6 by reading the query (`.is('guest_of_purchase_id', null)`) and on the restored DB.

---

## File Structure

| File | Responsibility |
|---|---|
| `supabase/migrations/057_member_guest_passes.sql` (create) | column, index, Guest Pass product row, `issue_guest_pass`, `void_guest_pass` |
| `docs/GUEST_PASSES_RUNBOOK.md` (create) | how to apply 057 + the SQL tests to run on a restored copy |
| `src/lib/supabase/database.types.ts` (modify) | add the column and the two functions by hand |
| `src/lib/guestPasses/rules.ts` (create) | pure: allowance, start gate, name normalizing, eligibility, caller decision, refusal messages |
| `src/lib/guestPasses/__tests__/rules.test.ts` (create) | unit tests for the above |
| `src/lib/auth/createPosCustomer.ts` (create) | account creation pulled out of `pos-signup` (auth user + hidden password + `users` row + welcome email) |
| `src/lib/auth/__tests__/createPosCustomer.test.ts` (create) | tests for its input validation |
| `src/app/api/auth/pos-signup/route.ts` (modify) | use `createPosCustomer` |
| `src/lib/guestPasses/server.ts` (create) | DB reads (matches, status) and the two RPC calls |
| `src/lib/auth/throttle.ts` (modify) | add `'guest-lookup'` scope |
| `src/app/api/guest-passes/route.ts` (create) | `GET` status, `POST` issue |
| `src/app/api/guest-passes/check/route.ts` (create) | `POST` eligibility by phone |
| `src/app/api/guest-passes/[purchaseId]/route.ts` (create) | `DELETE` undo |
| `src/app/api/guest-passes/callerGuard.ts` (create) | gathers caller + device approval, runs `decideGuestPassCaller` |
| `src/app/api/admin/reports/passes/route.ts` (modify) | exclude guest passes from sales; add `guestPasses` KPIs |
| `src/hooks/useReportData.ts`, `src/components/admin/reports/PassSection.tsx` (modify) | show the KPIs |
| `src/components/pos/GuestPassPanel.tsx` (create) | the POS "Bring a friend" panel and its dialog |
| `src/components/pos/CheckIn.tsx` (modify) | mount the panel under the Active Member badge |
| `src/components/customer/GuestPassBanner.tsx` (create), `src/components/customer/WebMyAccount.tsx` (modify) | My Account line |

---

### Task 1: Migration 057 and database types

**Files:**
- Create: `supabase/migrations/057_member_guest_passes.sql`
- Create: `docs/GUEST_PASSES_RUNBOOK.md`
- Modify: `src/lib/supabase/database.types.ts` (the `purchases` Row/Insert/Update blocks near line 293/322/351, and the `Functions` section)

**Interfaces:**
- Produces: column `purchases.guest_of_purchase_id: string | null`; product row `passes.name = 'Guest Pass'`; RPC `issue_guest_pass(p_member_id uuid, p_guest_customer_id uuid, p_child_id uuid, p_auto_checkout_time timestamptz, p_allowance int) → jsonb` returning `{ ok: true, purchase_id, session_id, remaining }` or `{ ok: false, reason }` where reason ∈ `'same_account' | 'no_membership' | 'guest_not_found' | 'guest_not_customer' | 'child_not_found' | 'not_new' | 'none_left' | 'not_configured'`; RPC `void_guest_pass(p_purchase_id uuid) → jsonb` returning `{ ok: true }` or `{ ok: false, reason }` where reason ∈ `'not_found' | 'visit_ended'`.

- [ ] **Step 1: Write the migration**

```sql
-- 057_member_guest_passes.sql
--
-- Member guest passes: a monthly member brings a new family's child in free,
-- twice per membership period. A guest visit is a $0 "Guest Pass" day_pass
-- purchase on the FRIEND's account, pointing at the member's membership
-- purchase. Renewal inserts a new membership row, so the count starts again
-- at 0 by itself.
--
-- Counting and inserting live in one function that locks the membership row,
-- so two requests at once cannot both spend the last pass. Both functions are
-- service-role only: the API route authorizes the caller first.
--
-- Apply by hand in the Supabase SQL Editor. Safe to re-run.

ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS guest_of_purchase_id UUID
    REFERENCES public.purchases(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_purchases_guest_of
  ON public.purchases(guest_of_purchase_id)
  WHERE guest_of_purchase_id IS NOT NULL;

-- Never for sale: inactive, so shops, price lists, the /info FAQ and
-- verify-pricing.ts (all filter is_active) never show it.
INSERT INTO public.passes (name, category, price, duration, sessions_included, description, is_active)
SELECT 'Guest Pass', 'day', 0, 1, 1,
       'Member guest pass: one free visit for a family new to Busy Bees, brought by a monthly member.',
       false
WHERE NOT EXISTS (SELECT 1 FROM public.passes WHERE name = 'Guest Pass');

CREATE OR REPLACE FUNCTION public.issue_guest_pass(
  p_member_id UUID,
  p_guest_customer_id UUID,
  p_child_id UUID,
  p_auto_checkout_time TIMESTAMPTZ,
  p_allowance INT
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_membership_id UUID;
  v_guest_role TEXT;
  v_used INT;
  v_pass_id UUID;
  v_purchase_id UUID;
  v_session_id UUID;
BEGIN
  IF p_member_id = p_guest_customer_id THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'same_account');
  END IF;

  -- The member's current membership; the lock serializes every guest pass
  -- spent against it.
  SELECT id INTO v_membership_id
  FROM public.purchases
  WHERE customer_id = p_member_id
    AND type = 'monthly_pass'
    AND status = 'active'
    AND (COALESCE(actual_expiry_date, expiry_date) IS NULL
         OR COALESCE(actual_expiry_date, expiry_date) > NOW())
  ORDER BY purchase_date DESC
  LIMIT 1
  FOR UPDATE;

  IF v_membership_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_membership');
  END IF;

  -- Lock the friend too, so two members cannot both bring the same new
  -- family in at the same moment.
  SELECT role::TEXT INTO v_guest_role FROM public.users WHERE id = p_guest_customer_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'guest_not_found');
  END IF;
  IF v_guest_role IS DISTINCT FROM 'customer' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'guest_not_customer');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.children WHERE id = p_child_id AND customer_id = p_guest_customer_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'child_not_found');
  END IF;

  -- Net-new only: any purchase at all, of any status, disqualifies.
  IF EXISTS (SELECT 1 FROM public.purchases WHERE customer_id = p_guest_customer_id) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_new');
  END IF;

  SELECT COUNT(*) INTO v_used FROM public.purchases WHERE guest_of_purchase_id = v_membership_id;
  IF v_used >= p_allowance THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'none_left');
  END IF;

  SELECT id INTO v_pass_id FROM public.passes WHERE name = 'Guest Pass' LIMIT 1;
  IF v_pass_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_configured');
  END IF;

  INSERT INTO public.purchases (
    customer_id, child_id, type, product_id, name, price,
    purchase_date, expiry_date, used_sessions, total_sessions, status,
    guest_of_purchase_id
  ) VALUES (
    p_guest_customer_id, p_child_id, 'day_pass', v_pass_id, 'Guest Pass', 0,
    NOW(), p_auto_checkout_time, 0, 1, 'active',
    v_membership_id
  )
  RETURNING id INTO v_purchase_id;

  -- consume_session_on_checkin (migration 052) marks the purchase used.
  INSERT INTO public.sessions (customer_id, purchase_id, child_id, auto_checkout_time)
  VALUES (p_guest_customer_id, v_purchase_id, p_child_id, p_auto_checkout_time)
  RETURNING id INTO v_session_id;

  RETURN jsonb_build_object(
    'ok', true,
    'purchase_id', v_purchase_id,
    'session_id', v_session_id,
    'remaining', p_allowance - v_used - 1
  );
END;
$$;

-- Undo a guest check-in made by mistake: removes the $0 purchase (its open
-- session goes with it via ON DELETE CASCADE), which gives the member the pass
-- back and leaves the friend with no purchases, still eligible.
-- A finished visit is not a mis-tap and cannot be undone.
CREATE OR REPLACE FUNCTION public.void_guest_pass(p_purchase_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM 1 FROM public.purchases
  WHERE id = p_purchase_id AND guest_of_purchase_id IS NOT NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.sessions WHERE purchase_id = p_purchase_id AND end_time IS NOT NULL
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'visit_ended');
  END IF;

  DELETE FROM public.purchases WHERE id = p_purchase_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.issue_guest_pass(UUID, UUID, UUID, TIMESTAMPTZ, INT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.void_guest_pass(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_guest_pass(UUID, UUID, UUID, TIMESTAMPTZ, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.void_guest_pass(UUID) TO service_role;
```

- [ ] **Step 2: Write the runbook with the SQL tests**

Create `docs/GUEST_PASSES_RUNBOOK.md` with: (1) "Apply 057 to a restored copy first, then production, **before** deploying the branch — the code calls functions that do not exist until then"; (2) these tests, each run inside `BEGIN; … ROLLBACK;` against the restored copy, substituting real ids:

| # | Setup | Call | Expect |
|---|---|---|---|
| T1 | member M with active monthly row; new user G (role customer, no purchases) with child C | `issue_guest_pass(M, G, C, now()+'4h', 2)` | `ok:true, remaining:1`; G has one purchase `price 0, status 'used', guest_of_purchase_id = M's membership`; one open session |
| T2 | T1 twice more with two more fresh guests | third call | `reason:'none_left'` |
| T3 | M's membership `status='expired'` | issue | `reason:'no_membership'` |
| T4 | G has one `refunded` purchase | issue | `reason:'not_new'` |
| T5 | `p_guest_customer_id = M` | issue | `reason:'same_account'` |
| T6 | after T1, set the session's `end_time = now()` | `void_guest_pass(purchase)` | `reason:'visit_ended'`, purchase still there |
| T7 | after T1, session open | `void_guest_pass(purchase)` | `ok:true`; purchase and session gone; M's count back to 0 |
| T8 | renewal: insert a newer active monthly row for M | issue | counts against the new row: `remaining:1` |
| T9 | as `anon` role: `SET ROLE anon; SELECT issue_guest_pass(...)` | — | permission denied |

- [ ] **Step 3: Add the types by hand**

In `src/lib/supabase/database.types.ts`, in `purchases`: Row `guest_of_purchase_id: string | null`, Insert and Update `guest_of_purchase_id?: string | null` (next to `pass_scope`). In `public.Functions` add:

```ts
      issue_guest_pass: {
        Args: {
          p_member_id: string
          p_guest_customer_id: string
          p_child_id: string
          p_auto_checkout_time: string
          p_allowance: number
        }
        Returns: Json
      }
      void_guest_pass: {
        Args: { p_purchase_id: string }
        Returns: Json
      }
```

Match the file's existing formatting (semicolons or not) exactly.

- [ ] **Step 4: Check types still compile for the files you touched**

Run: `pnpm exec tsc --noEmit -p . 2>&1 | grep -c "error TS"` before and after the edit.
Expected: the count does not go up.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/057_member_guest_passes.sql docs/GUEST_PASSES_RUNBOOK.md src/lib/supabase/database.types.ts
git commit -m "🗄️ Add migration 057: member guest passes"
```

---

### Task 2: Pure guest-pass rules

**Files:**
- Create: `src/lib/guestPasses/rules.ts`
- Test: `src/lib/guestPasses/__tests__/rules.test.ts`

**Interfaces:**
- Consumes: `AccountCaller` from `src/app/api/sessions/accountAccess.ts`.
- Produces:
  - `GUEST_PASS_ALLOWANCE: 2`, `GUEST_PASSES_START: Date`
  - `guestPassesOpen(now?: Date): boolean`
  - `normalizeChildName(name: string): string`
  - `type GuestMatch = { userId: string; role: string | null; purchaseCount: number }`
  - `type GuestEligibility = { kind: 'new' } | { kind: 'existing'; userId: string } | { kind: 'not_eligible' } | { kind: 'conflict' }`
  - `decideGuestEligibility(matches: GuestMatch[]): GuestEligibility`
  - `type GuestPassCaller = { kind: 'allow'; memberId: string } | { kind: 'unauthenticated' } | { kind: 'forbidden' } | { kind: 'device_locked' } | { kind: 'member_required' }`
  - `decideGuestPassCaller(input: { caller: AccountCaller; deviceApproved: boolean; requestedMemberId: string | null }): GuestPassCaller`
  - `NOT_ELIGIBLE_MESSAGE`, `CONFLICT_MESSAGE`, `issueRefusalMessage(reason: string): string`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import {
  GUEST_PASS_ALLOWANCE,
  guestPassesOpen,
  normalizeChildName,
  decideGuestEligibility,
  decideGuestPassCaller,
  issueRefusalMessage,
  NOT_ELIGIBLE_MESSAGE,
} from '../rules';

describe('guestPassesOpen', () => {
  it('is closed one second before midnight Eastern on 1 Nov 2026', () => {
    expect(guestPassesOpen(new Date('2026-11-01T03:59:59Z'))).toBe(false);
  });
  it('opens at midnight Eastern on 1 Nov 2026 (still EDT, UTC-4)', () => {
    expect(guestPassesOpen(new Date('2026-11-01T04:00:00Z'))).toBe(true);
  });
});

describe('normalizeChildName', () => {
  it('ignores case, outer spaces and repeated inner spaces', () => {
    expect(normalizeChildName('  Mia   Rose ')).toBe(normalizeChildName('mia rose'));
  });
});

describe('decideGuestEligibility', () => {
  const empty = (userId: string) => ({ userId, role: 'customer', purchaseCount: 0 });

  it('no match is a new family', () => {
    expect(decideGuestEligibility([])).toEqual({ kind: 'new' });
  });
  it('an account with no purchases is eligible, matched however', () => {
    expect(decideGuestEligibility([empty('a'), empty('a')])).toEqual({ kind: 'existing', userId: 'a' });
  });
  it('any match with a purchase is not eligible, even if found only by email or child', () => {
    expect(
      decideGuestEligibility([empty('a'), { userId: 'b', role: 'customer', purchaseCount: 1 }])
    ).toEqual({ kind: 'not_eligible' });
  });
  it('a staff or admin account is never a guest', () => {
    expect(decideGuestEligibility([{ userId: 's', role: 'staff', purchaseCount: 0 }])).toEqual({
      kind: 'not_eligible',
    });
  });
  it('two different empty accounts is a conflict, not a guess', () => {
    expect(decideGuestEligibility([empty('a'), empty('b')])).toEqual({ kind: 'conflict' });
  });
});

describe('decideGuestPassCaller', () => {
  const member = { userId: 'm', role: 'customer' as const };
  const staff = { userId: 's', role: 'staff' as const };

  it('no session is unauthenticated', () => {
    expect(
      decideGuestPassCaller({ caller: { userId: null, role: null }, deviceApproved: true, requestedMemberId: null })
    ).toEqual({ kind: 'unauthenticated' });
  });
  it('a member on an approved POS device acts for themselves', () => {
    expect(decideGuestPassCaller({ caller: member, deviceApproved: true, requestedMemberId: null })).toEqual({
      kind: 'allow',
      memberId: 'm',
    });
  });
  it('a member at home (no approved device) is refused', () => {
    expect(decideGuestPassCaller({ caller: member, deviceApproved: false, requestedMemberId: null })).toEqual({
      kind: 'device_locked',
    });
  });
  it('a member cannot spend another member\'s passes', () => {
    expect(decideGuestPassCaller({ caller: member, deviceApproved: true, requestedMemberId: 'x' })).toEqual({
      kind: 'forbidden',
    });
  });
  it('staff must name the member', () => {
    expect(decideGuestPassCaller({ caller: staff, deviceApproved: false, requestedMemberId: null })).toEqual({
      kind: 'member_required',
    });
    expect(decideGuestPassCaller({ caller: staff, deviceApproved: false, requestedMemberId: 'm' })).toEqual({
      kind: 'allow',
      memberId: 'm',
    });
  });
});

describe('issueRefusalMessage', () => {
  it('maps not_new to the counter wording', () => {
    expect(issueRefusalMessage('not_new')).toBe(NOT_ELIGIBLE_MESSAGE);
  });
  it('mentions the allowance when none are left', () => {
    expect(issueRefusalMessage('none_left')).toContain(String(GUEST_PASS_ALLOWANCE));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/lib/guestPasses`
Expected: FAIL — cannot find module `../rules`.

- [ ] **Step 3: Implement**

```ts
/**
 * Member guest passes: the rules, with no database and no request.
 *
 * A monthly member may bring a family that is new to Busy Bees in free,
 * GUEST_PASS_ALLOWANCE times per membership period. "New" means no account
 * matches them, or the matching account has never bought anything. The route
 * gathers the facts; these functions decide. Spec:
 * docs/superpowers/specs/2026-10-07-member-guest-passes-design.md
 */

import type { AccountCaller } from '@/app/api/sessions/accountAccess';

export const GUEST_PASS_ALLOWANCE = 2;

/** Midnight Eastern, 1 Nov 2026. DST ends at 2 a.m. that day, so still UTC-4. */
export const GUEST_PASSES_START = new Date('2026-11-01T00:00:00-04:00');

export function guestPassesOpen(now: Date = new Date()): boolean {
  return now.getTime() >= GUEST_PASSES_START.getTime();
}

export function normalizeChildName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** One account that matched the friend's phone, email or child. */
export interface GuestMatch {
  userId: string;
  role: string | null;
  purchaseCount: number;
}

export type GuestEligibility =
  | { kind: 'new' }
  | { kind: 'existing'; userId: string }
  | { kind: 'not_eligible' }
  | { kind: 'conflict' };

/**
 * Any match that has bought something -- or is not a customer at all -- makes
 * the friend ineligible, however it matched. Matches that point at two
 * different empty accounts are refused rather than guessed between.
 */
export function decideGuestEligibility(matches: readonly GuestMatch[]): GuestEligibility {
  if (matches.length === 0) return { kind: 'new' };
  if (matches.some((m) => m.purchaseCount > 0 || m.role !== 'customer')) {
    return { kind: 'not_eligible' };
  }
  const ids = new Set(matches.map((m) => m.userId));
  if (ids.size > 1) return { kind: 'conflict' };
  return { kind: 'existing', userId: matches[0].userId };
}

export type GuestPassCaller =
  | { kind: 'allow'; memberId: string }
  | { kind: 'unauthenticated' }
  | { kind: 'forbidden' }
  | { kind: 'device_locked' }
  | { kind: 'member_required' };

/**
 * Who may spend (or undo) a member's guest pass. The front desk works signed
 * in as the member after a phone lookup, so the member's own session is
 * allowed -- but only on the store's approved POS device, or a member could
 * hand out passes from their phone at home. Staff may act for any member and
 * must say which.
 */
export function decideGuestPassCaller(input: {
  caller: AccountCaller;
  deviceApproved: boolean;
  requestedMemberId: string | null;
}): GuestPassCaller {
  const { caller, deviceApproved, requestedMemberId } = input;
  if (!caller.userId) return { kind: 'unauthenticated' };

  if (caller.role === 'staff' || caller.role === 'admin') {
    return requestedMemberId ? { kind: 'allow', memberId: requestedMemberId } : { kind: 'member_required' };
  }

  if (!deviceApproved) return { kind: 'device_locked' };
  if (requestedMemberId && requestedMemberId !== caller.userId) return { kind: 'forbidden' };
  return { kind: 'allow', memberId: caller.userId };
}

export const NOT_ELIGIBLE_MESSAGE = 'Already a Busy Bees customer — not eligible.';
export const CONFLICT_MESSAGE =
  'These details match more than one Busy Bees account. Ask a manager to merge them first.';

/** Counter wording for a refusal reason from issue_guest_pass. */
export function issueRefusalMessage(reason: string): string {
  switch (reason) {
    case 'not_new':
    case 'guest_not_customer':
    case 'same_account':
      return NOT_ELIGIBLE_MESSAGE;
    case 'none_left':
      return `This membership has used both of its ${GUEST_PASS_ALLOWANCE} guest passes. They reset when it renews.`;
    case 'no_membership':
      return 'Guest passes need an active monthly membership.';
    case 'child_not_found':
      return 'That child is not on the friend\'s account.';
    case 'not_configured':
      return 'Guest passes are not set up yet (missing Guest Pass product).';
    default:
      return 'Could not issue the guest pass. Please try again.';
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/lib/guestPasses`
Expected: PASS (all).

- [ ] **Step 5: Commit**

```bash
git add src/lib/guestPasses
git commit -m "✨ Guest pass rules: eligibility, caller and start date"
```

---

### Task 3: Pull POS account creation into `createPosCustomer`

The guest flow must create the friend's account without signing the POS in as them (it stays signed in as the member). `pos-signup` does both; split the creation out so the two can never drift.

**Files:**
- Create: `src/lib/auth/createPosCustomer.ts`
- Test: `src/lib/auth/__tests__/createPosCustomer.test.ts`
- Modify: `src/app/api/auth/pos-signup/route.ts` (lines ~20–160: validation through welcome email)

**Interfaces:**
- Produces:
  - `posCustomerSchema` (Zod) — `{ phone: string; name: string; email: string }`, transforms phone to 10 digits, trims name/email.
  - `type CreatePosCustomerResult = { ok: true; userId: string; phone: string } | { ok: false; status: 400 | 409 | 500; error: string }`
  - `createPosCustomer(input: unknown): Promise<CreatePosCustomerResult>` — validates, refuses a duplicate phone (409) or email (409), creates the auth user with the hidden password, inserts the `users` row (`role 'customer'`, `has_web_password false`), sends the welcome email without waiting.

- [ ] **Step 1: Write the failing test (validation only — the DB part is exercised on the restored copy)**

```ts
import { describe, it, expect } from 'vitest';
import { posCustomerSchema } from '../createPosCustomer';

describe('posCustomerSchema', () => {
  it('normalizes a formatted phone to 10 digits and trims', () => {
    const r = posCustomerSchema.parse({ phone: '(555) 123-4567', name: ' Ana ', email: ' a@b.co ' });
    expect(r).toEqual({ phone: '5551234567', name: 'Ana', email: 'a@b.co' });
  });
  it('refuses a short phone', () => {
    expect(posCustomerSchema.safeParse({ phone: '555-1234', name: 'A', email: 'a@b.co' }).success).toBe(false);
  });
  it('refuses a bad email', () => {
    expect(posCustomerSchema.safeParse({ phone: '5551234567', name: 'A', email: 'nope' }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/lib/auth/__tests__/createPosCustomer.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `createPosCustomer.ts`**

Move the body of `pos-signup`'s POST from "Validate required fields" through the welcome-email `.then/.catch` into this function, unchanged in behavior, with these exact edits:
- Replace the hand-written checks with `posCustomerSchema.safeParse(input)`; on failure return `{ ok: false, status: 400, error: firstIssueMessage }`.
- `posCustomerSchema`:

```ts
export const posCustomerSchema = z.object({
  phone: z
    .string()
    .transform((p) => p.replace(/[^\d]/g, ''))
    .refine((p) => p.length === 10, 'Invalid phone number format'),
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('Invalid email address').max(254),
});
```

- Each `return NextResponse.json({ error }, { status })` becomes `return { ok: false, status, error }` with the same error text.
- Use `.maybeSingle()` for the existing-phone lookup (`.single()` errors on zero rows).
- Success returns `{ ok: true, userId: authData.user.id, phone: cleanPhone }`.
- Keep the file header comment explaining it creates the account but does **not** sign anyone in.

- [ ] **Step 4: Make `pos-signup` call it**

In `src/app/api/auth/pos-signup/route.ts`, after `requireKioskDevice`, replace the moved block with:

```ts
    const created = await createPosCustomer(await request.json());
    if (!created.ok) {
      return NextResponse.json({ error: created.error }, { status: created.status });
    }
    const authPassword = hiddenPasswordFor(created.userId);
    const cleanPhone = created.phone;
```

and leave the sign-in code below it as it was (it uses `authPassword` and the email; read the email back from the parsed body: `const { email } = posCustomerSchema.parse(body)` before calling, passing the same `body`). Remove now-unused imports.

- [ ] **Step 5: Run tests and the type count**

Run: `pnpm vitest run src/lib/auth && pnpm exec tsc --noEmit -p . 2>&1 | grep -c "error TS"`
Expected: tests PASS; error count not above Task 1's number.

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth/createPosCustomer.ts src/lib/auth/__tests__/createPosCustomer.test.ts src/app/api/auth/pos-signup/route.ts
git commit -m "♻️ Extract POS account creation into createPosCustomer"
```

---

### Task 4: Guest-pass server service

**Files:**
- Create: `src/lib/guestPasses/server.ts`

**Interfaces:**
- Consumes: `createAdminClient` (`@/lib/supabase/server`), `isActiveMembership`/`fromPurchaseRow` (`@/lib/membership`), `GuestMatch`, `GUEST_PASS_ALLOWANCE`, `normalizeChildName` (Task 2).
- Produces:
  - `findGuestMatches(input: { phone: string; email?: string; child?: { name: string; birthdate: string } }): Promise<GuestMatch[]>`
  - `getGuestAccountChildren(userId: string): Promise<Array<{ id: string; name: string; birthdate: string; waiverSigned: boolean }>>`
  - `type GuestPassStatus = { open: boolean; hasMembership: boolean; allowance: number; used: number; remaining: number; guests: Array<{ purchaseId: string; childName: string; checkedInAt: string; visitOpen: boolean }> }`
  - `getGuestPassStatus(memberId: string, now?: Date): Promise<GuestPassStatus>`
  - `type IssueResult = { ok: true; purchaseId: string; sessionId: string; remaining: number } | { ok: false; reason: string }`
  - `issueGuestPassRpc(args: { memberId: string; guestId: string; childId: string; autoCheckoutTime: string }): Promise<IssueResult>`
  - `voidGuestPassRpc(purchaseId: string): Promise<{ ok: true } | { ok: false; reason: string }>`
  - `getGuestPassSponsor(purchaseId: string): Promise<string | null>` — the member (customer id) whose membership sponsored it.
  - `signChildWaiver(childId: string): Promise<void>`

- [ ] **Step 1: Implement**

```ts
/**
 * Database side of member guest passes. Everything here uses the admin
 * client: callers are authorized by the route first (callerGuard.ts), and the
 * friend's account is not the signed-in one.
 */

import { createAdminClient } from '@/lib/supabase/server';
import { fromPurchaseRow, isActiveMembership } from '@/lib/membership';
import { GUEST_PASS_ALLOWANCE, guestPassesOpen, normalizeChildName, type GuestMatch } from './rules';

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
    const wanted = normalizeChildName(input.child.name);
    const byChild = await db
      .from('children')
      .select('name, customer_id, users!inner(role)')
      .eq('birthdate', input.child.birthdate);
    if (byChild.error) throw byChild.error;
    for (const c of byChild.data ?? []) {
      if (normalizeChildName(c.name) !== wanted) continue;
      const owner = Array.isArray(c.users) ? c.users[0] : c.users;
      found.set(c.customer_id, owner?.role ?? null);
    }
  }

  const counts = await purchaseCounts([...found.keys()]);
  return [...found.entries()].map(([userId, role]) => ({
    userId,
    role,
    purchaseCount: counts.get(userId) ?? 0,
  }));
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

/** Latest live membership row, chosen exactly as issue_guest_pass chooses it. */
async function currentMembershipId(memberId: string, now: Date): Promise<string | null> {
  const { data, error } = await createAdminClient()
    .from('purchases')
    .select('id, type, status, expiry_date, actual_expiry_date, purchase_date')
    .eq('customer_id', memberId)
    .eq('type', 'monthly_pass')
    .eq('status', 'active')
    .order('purchase_date', { ascending: false });
  if (error) throw error;
  const live = (data ?? []).find((p) => isActiveMembership(fromPurchaseRow(p), now));
  return live?.id ?? null;
}

export async function getGuestPassStatus(memberId: string, now: Date = new Date()): Promise<GuestPassStatus> {
  const open = guestPassesOpen(now);
  const membershipId = await currentMembershipId(memberId, now);
  if (!membershipId) {
    return { open, hasMembership: false, allowance: GUEST_PASS_ALLOWANCE, used: 0, remaining: 0, guests: [] };
  }

  const { data, error } = await createAdminClient()
    .from('purchases')
    .select('id, purchase_date, children(name), sessions(end_time)')
    .eq('guest_of_purchase_id', membershipId)
    .order('purchase_date', { ascending: true });
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
```

If the `children(name)` / `sessions(end_time)` / `users!inner(role)` embeds give type errors, check the relationship names in `database.types.ts` (`Relationships`) and adjust the embed hint (e.g. `users!children_customer_id_fkey(role)`); do not cast to `any`.

- [ ] **Step 2: Type count**

Run: `pnpm exec tsc --noEmit -p . 2>&1 | grep -c "error TS"`
Expected: not above the baseline.

- [ ] **Step 3: Commit**

```bash
git add src/lib/guestPasses/server.ts
git commit -m "✨ Guest pass service: matches, status and RPC calls"
```

---

### Task 5: API routes

**Files:**
- Modify: `src/lib/auth/throttle.ts` (add scope)
- Create: `src/app/api/guest-passes/callerGuard.ts`
- Create: `src/app/api/guest-passes/route.ts`
- Create: `src/app/api/guest-passes/check/route.ts`
- Create: `src/app/api/guest-passes/[purchaseId]/route.ts`
- Test: `src/lib/auth/__tests__/throttle.test.ts` (extend)

**Interfaces:**
- Consumes: Task 2 rules, Task 3 `createPosCustomer`, Task 4 service, `requestHasApprovedDevice` (`@/lib/auth/posDevice`), `requireAccountAccess` (`@/app/api/sessions/requireAccountAccess`), `beginAttempt`/`clientAddress`/`TOO_MANY_ATTEMPTS` (`@/lib/auth/throttle`), `getNextClosingTime` (`@/lib/utils/timeUtils`), `createChild` (`@/lib/services/children`).
- Produces HTTP:
  - `GET /api/guest-passes?customer_id=<uuid>` → `200 GuestPassStatus`
  - `POST /api/guest-passes/check` body `{ member_id?: uuid, phone: string }` → `200 { kind: 'new' } | { kind: 'existing'; parentName: string; children: {id,name,birthdate,waiverSigned}[] } | { kind: 'not_eligible'; message } | { kind: 'conflict'; message }`
  - `POST /api/guest-passes` body `{ member_id?: uuid, phone, parent_name?, email?, child_id?: uuid, child?: { name, birthdate: 'YYYY-MM-DD' }, waiver_agreed: true }` → `201 { purchaseId, sessionId, remaining }` | `4xx { error }`
  - `DELETE /api/guest-passes/<purchaseId>` → `200 { voided: true }` | `4xx { error }`

- [ ] **Step 1: Add the throttle scope (test first)**

Append to `throttle.test.ts`:

```ts
it('limits guest-pass lookups per address without an overall cap', () => {
  expect(LIMITS['guest-lookup']).toEqual({ perKey: 30, overall: null, windowMinutes: 60 });
});
```

Run `pnpm vitest run src/lib/auth/__tests__/throttle.test.ts` → FAIL. Then in `throttle.ts` add `'guest-lookup'` to `ThrottleScope` and to `LIMITS`:

```ts
  // Guest-pass lookups say whether a phone number is a customer. Every lookup
  // counts; 30 an hour is far more than a counter needs.
  'guest-lookup': { perKey: 30, overall: null, windowMinutes: 60 },
```

Re-run → PASS. (Lookups are never `finishAttempt`-ed, so each one counts.)

- [ ] **Step 2: Caller guard**

```ts
/**
 * Gathers who is calling and whether this is the store's approved POS device,
 * then lets decideGuestPassCaller (src/lib/guestPasses/rules.ts) decide.
 * Returns the member to act for, or the response to send.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requestHasApprovedDevice, DEVICE_LOCKED_ERROR } from '@/lib/auth/posDevice';
import { decideGuestPassCaller } from '@/lib/guestPasses/rules';
import type { CallerRole } from '@/app/api/sessions/accountAccess';

export async function guestPassCaller(
  request: NextRequest,
  requestedMemberId: string | null
): Promise<{ memberId: string } | { response: NextResponse }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let role: CallerRole | null = null;
  if (user) {
    const { data } = await supabase.from('users').select('role').eq('id', user.id).single();
    role = data?.role ?? null;
  }

  const decision = decideGuestPassCaller({
    caller: { userId: user?.id ?? null, role },
    deviceApproved: user ? await requestHasApprovedDevice(request) : false,
    requestedMemberId,
  });

  switch (decision.kind) {
    case 'allow':
      return { memberId: decision.memberId };
    case 'unauthenticated':
      return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    case 'device_locked':
      return { response: NextResponse.json({ error: DEVICE_LOCKED_ERROR, code: 'device_locked' }, { status: 403 }) };
    case 'member_required':
      return { response: NextResponse.json({ error: 'member_id is required' }, { status: 400 }) };
    case 'forbidden':
      return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
}
```

- [ ] **Step 3: `GET` status and `POST` issue — `src/app/api/guest-passes/route.ts`**

```ts
/**
 * Member guest passes.
 * GET  - a member's allowance and today's guests (My Account, POS).
 * POST - check a new family's child in on a guest pass (POS only).
 *
 * The POS is signed in AS the member, and the guest pass is written to the
 * FRIEND's account, so this route cannot use the usual own-account gate. It
 * authorizes the caller (callerGuard), re-matches the friend from scratch on
 * the server, and leaves counting + inserting to issue_guest_pass, which locks
 * the membership row. The request never names a price, a membership, or an
 * existing friend account id.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAccountAccess } from '@/app/api/sessions/requireAccountAccess';
import { createAdminClient } from '@/lib/supabase/server';
import { beginAttempt, clientAddress, TOO_MANY_ATTEMPTS } from '@/lib/auth/throttle';
import { createPosCustomer } from '@/lib/auth/createPosCustomer';
import { createChild } from '@/lib/services/children';
import { getNextClosingTime } from '@/lib/utils/timeUtils';
import { logger } from '@/lib/logger';
import {
  CONFLICT_MESSAGE,
  NOT_ELIGIBLE_MESSAGE,
  decideGuestEligibility,
  guestPassesOpen,
  issueRefusalMessage,
  normalizeChildName,
} from '@/lib/guestPasses/rules';
import {
  findGuestMatches,
  getGuestAccountChildren,
  getGuestPassStatus,
  issueGuestPassRpc,
  signChildWaiver,
} from '@/lib/guestPasses/server';
import { guestPassCaller } from './callerGuard';

export async function GET(request: NextRequest) {
  const customerId = z.string().uuid().safeParse(request.nextUrl.searchParams.get('customer_id'));
  if (!customerId.success) return NextResponse.json({ error: 'customer_id is required' }, { status: 400 });
  const denied = await requireAccountAccess(customerId.data);
  if (denied) return denied;
  try {
    return NextResponse.json(await getGuestPassStatus(customerId.data));
  } catch (error) {
    logger.error({ error }, 'Guest pass status failed');
    return NextResponse.json({ error: 'Failed to load guest passes' }, { status: 500 });
  }
}

const phoneSchema = z
  .string()
  .transform((p) => p.replace(/[^\d]/g, ''))
  .refine((p) => p.length === 10, 'Enter a 10-digit phone number');

const issueSchema = z
  .object({
    member_id: z.string().uuid().optional(),
    phone: phoneSchema,
    parent_name: z.string().trim().min(1).max(100).optional(),
    email: z.string().trim().email().max(254).optional(),
    child_id: z.string().uuid().optional(),
    child: z
      .object({
        name: z.string().trim().min(1).max(100),
        birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Birthdate must be YYYY-MM-DD'),
      })
      .optional(),
    waiver_agreed: z.literal(true, { errorMap: () => ({ message: 'The waiver must be agreed first' }) }),
  })
  .refine((b) => Boolean(b.child_id) !== Boolean(b.child), 'Pick one child or add one');

async function autoCheckoutTime(): Promise<string> {
  const { data } = await createAdminClient()
    .from('settings')
    .select('key, value')
    .in('key', ['auto_checkout_timezone', 'auto_checkout_time']);
  const get = (k: string) => data?.find((r) => r.key === k)?.value;
  return getNextClosingTime(String(get('auto_checkout_timezone') ?? 'America/New_York'), String(get('auto_checkout_time') ?? '18:00'));
}

export async function POST(request: NextRequest) {
  const parsed = issueSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
  }
  const body = parsed.data;

  const who = await guestPassCaller(request, body.member_id ?? null);
  if ('response' in who) return who.response;

  if (!guestPassesOpen()) {
    return NextResponse.json({ error: 'Guest passes start on November 1st.' }, { status: 403 });
  }

  const attempt = await beginAttempt('guest-lookup', clientAddress(request), { skipOverall: true });
  if (!attempt.allowed) return NextResponse.json({ error: TOO_MANY_ATTEMPTS }, { status: 429 });

  try {
    const matches = await findGuestMatches({ phone: body.phone, email: body.email, child: body.child });
    const eligibility = decideGuestEligibility(matches);

    let guestId: string;
    switch (eligibility.kind) {
      case 'not_eligible':
        return NextResponse.json({ error: NOT_ELIGIBLE_MESSAGE }, { status: 409 });
      case 'conflict':
        return NextResponse.json({ error: CONFLICT_MESSAGE }, { status: 409 });
      case 'existing':
        guestId = eligibility.userId;
        break;
      case 'new': {
        if (!body.parent_name || !body.email || !body.child) {
          return NextResponse.json({ error: 'Parent name, email and child are required for a new family' }, { status: 400 });
        }
        const created = await createPosCustomer({ phone: body.phone, name: body.parent_name, email: body.email });
        if (!created.ok) return NextResponse.json({ error: created.error }, { status: created.status });
        guestId = created.userId;
        break;
      }
    }

    // The child: one already on the friend's account, matched by id or by
    // name + birthdate, or a new one.
    let childId = body.child_id;
    if (!childId && body.child) {
      const wanted = normalizeChildName(body.child.name);
      const existing = (await getGuestAccountChildren(guestId)).find(
        (c) => c.birthdate === body.child?.birthdate && normalizeChildName(c.name) === wanted
      );
      childId =
        existing?.id ??
        (await createChild({ customer_id: guestId, name: body.child.name, birthdate: body.child.birthdate, waiver_signed: false })).id;
    }
    if (!childId) return NextResponse.json({ error: 'Pick one child or add one' }, { status: 400 });

    // The parent agreed the waiver at the counter (waiver_agreed: true).
    await signChildWaiver(childId);

    const result = await issueGuestPassRpc({
      memberId: who.memberId,
      guestId,
      childId,
      autoCheckoutTime: await autoCheckoutTime(),
    });
    if (!result.ok) {
      const status = result.reason === 'not_configured' ? 500 : 409;
      return NextResponse.json({ error: issueRefusalMessage(result.reason), reason: result.reason }, { status });
    }

    logger.info({ memberId: who.memberId, guestId, purchaseId: result.purchaseId }, '🐝 Guest pass issued');
    return NextResponse.json(
      { purchaseId: result.purchaseId, sessionId: result.sessionId, remaining: result.remaining },
      { status: 201 }
    );
  } catch (error) {
    logger.error({ error }, 'Guest pass issue failed');
    return NextResponse.json({ error: 'Could not issue the guest pass. Please try again.' }, { status: 500 });
  }
}
```

**Before writing `autoCheckoutTime`:** open `src/components/pos/CheckIn.tsx` around line 265 (`autoCheckoutSettings`) and copy the exact settings keys and defaults it loads; replace `'auto_checkout_timezone'`, `'auto_checkout_time'`, `'America/New_York'` and `'18:00'` above with those. The guest must auto-check-out at the same time as everyone else.

- [ ] **Step 4: `POST /api/guest-passes/check` — `src/app/api/guest-passes/check/route.ts`**

```ts
/**
 * Is this phone number's family eligible for a guest pass? Answers for the
 * counter only (approved POS device or staff), throttled, because it reveals
 * whether a number belongs to a customer.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { beginAttempt, clientAddress, TOO_MANY_ATTEMPTS } from '@/lib/auth/throttle';
import { CONFLICT_MESSAGE, NOT_ELIGIBLE_MESSAGE, decideGuestEligibility } from '@/lib/guestPasses/rules';
import { findGuestMatches, getGuestAccountChildren } from '@/lib/guestPasses/server';
import { logger } from '@/lib/logger';
import { guestPassCaller } from '../callerGuard';

const checkSchema = z.object({
  member_id: z.string().uuid().optional(),
  phone: z
    .string()
    .transform((p) => p.replace(/[^\d]/g, ''))
    .refine((p) => p.length === 10, 'Enter a 10-digit phone number'),
});

export async function POST(request: NextRequest) {
  const parsed = checkSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
  }
  const who = await guestPassCaller(request, parsed.data.member_id ?? null);
  if ('response' in who) return who.response;

  const attempt = await beginAttempt('guest-lookup', clientAddress(request), { skipOverall: true });
  if (!attempt.allowed) return NextResponse.json({ error: TOO_MANY_ATTEMPTS }, { status: 429 });

  try {
    const eligibility = decideGuestEligibility(await findGuestMatches({ phone: parsed.data.phone }));
    switch (eligibility.kind) {
      case 'new':
        return NextResponse.json({ kind: 'new' });
      case 'not_eligible':
        return NextResponse.json({ kind: 'not_eligible', message: NOT_ELIGIBLE_MESSAGE });
      case 'conflict':
        return NextResponse.json({ kind: 'conflict', message: CONFLICT_MESSAGE });
      case 'existing': {
        const { data: user } = await createAdminClient()
          .from('users')
          .select('name')
          .eq('id', eligibility.userId)
          .single();
        return NextResponse.json({
          kind: 'existing',
          parentName: user?.name ?? '',
          children: await getGuestAccountChildren(eligibility.userId),
        });
      }
    }
  } catch (error) {
    logger.error({ error }, 'Guest pass check failed');
    return NextResponse.json({ error: 'Could not check that number. Please try again.' }, { status: 500 });
  }
}
```

- [ ] **Step 5: `DELETE /api/guest-passes/[purchaseId]`**

```ts
/**
 * Undo a guest check-in made by mistake: the $0 purchase and its open session
 * are removed, the member gets the pass back, and the friend stays eligible.
 * Same callers as issuing (the sponsoring member on the POS device, or staff).
 * A visit that has already ended cannot be undone.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getGuestPassSponsor, voidGuestPassRpc } from '@/lib/guestPasses/server';
import { logger } from '@/lib/logger';
import { guestPassCaller } from '../callerGuard';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ purchaseId: string }> }) {
  const id = z.string().uuid().safeParse((await params).purchaseId);
  if (!id.success) return NextResponse.json({ error: 'Invalid guest pass id' }, { status: 400 });

  try {
    const sponsor = await getGuestPassSponsor(id.data);
    if (!sponsor) return NextResponse.json({ error: 'Guest pass not found' }, { status: 404 });

    const who = await guestPassCaller(request, sponsor);
    if ('response' in who) return who.response;

    const result = await voidGuestPassRpc(id.data);
    if (!result.ok) {
      return result.reason === 'visit_ended'
        ? NextResponse.json({ error: 'This visit has already ended and cannot be undone.' }, { status: 400 })
        : NextResponse.json({ error: 'Guest pass not found' }, { status: 404 });
    }
    logger.info({ purchaseId: id.data, sponsor }, 'Guest pass voided');
    return NextResponse.json({ voided: true });
  } catch (error) {
    logger.error({ error }, 'Guest pass undo failed');
    return NextResponse.json({ error: 'Could not undo the guest pass.' }, { status: 500 });
  }
}
```

- [ ] **Step 6: Tests + type count**

Run: `pnpm vitest run && pnpm exec tsc --noEmit -p . 2>&1 | grep -c "error TS"`
Expected: all tests PASS; type-error count not above baseline.

- [ ] **Step 7: Commit**

```bash
git add src/lib/auth/throttle.ts src/lib/auth/__tests__/throttle.test.ts src/app/api/guest-passes
git commit -m "🔒 Guest pass API: status, eligibility check, issue and undo"
```

---

### Task 6: Keep guest passes out of pass sales; show them on the report

**Files:**
- Modify: `src/app/api/admin/reports/passes/route.ts`
- Modify: `src/hooks/useReportData.ts` (`PassData`, line ~108)
- Modify: `src/components/admin/reports/PassSection.tsx`

**Interfaces:**
- Produces: `PassData.guestPasses: { issued: number; families: number; returnedAndPaid: number }`

- [ ] **Step 1: Exclude guest passes from both purchase queries**

In both `fetchAllRows` queries add `.is('guest_of_purchase_id', null)` after `.in('type', [...])`, with a one-line comment: `// $0 member guest passes are not sales (see 057).`

- [ ] **Step 2: Add the guest-pass numbers**

After the two queries, fetch guest passes in range and whether each friend later paid:

```ts
    // Member guest passes in range, and how many of those families have since
    // bought something themselves -- the measure of whether the perk works.
    const guestRows = await fetchAllRows((from, to) =>
      supabase
        .from('purchases')
        .select('customer_id, purchase_date')
        .not('guest_of_purchase_id', 'is', null)
        .gte('purchase_date', range.startDate)
        .lte('purchase_date', range.endDate + 'T23:59:59')
        .range(from, to)
    );
    const guestFamilies = [...new Set(guestRows.map((g) => g.customer_id))];
    let returnedAndPaid = 0;
    if (guestFamilies.length > 0) {
      const { data: paid } = await supabase
        .from('purchases')
        .select('customer_id')
        .in('customer_id', guestFamilies)
        .is('guest_of_purchase_id', null)
        .gt('price', 0);
      returnedAndPaid = new Set((paid ?? []).map((p) => p.customer_id)).size;
    }
    const guestPasses = { issued: guestRows.length, families: guestFamilies.length, returnedAndPaid };
```

Add `guestPasses` to the object passed to the final `NextResponse.json(...)`.

- [ ] **Step 3: Type and UI**

In `PassData` add `guestPasses: { issued: number; families: number; returnedAndPaid: number };`. In `PassSection.tsx` import `ReportKpiCard` and, directly after `<ReportDateRangePicker … />`, add:

```tsx
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ReportKpiCard label="Guest passes used" value={data?.guestPasses.issued ?? 0} icon="🐝" loading={isLoading} />
        <ReportKpiCard label="New families brought in" value={data?.guestPasses.families ?? 0} icon="👋" loading={isLoading} />
        <ReportKpiCard label="…who have since paid" value={data?.guestPasses.returnedAndPaid ?? 0} icon="💳" loading={isLoading} />
      </div>
```

- [ ] **Step 4: Type count, then commit**

Run: `pnpm exec tsc --noEmit -p . 2>&1 | grep -c "error TS"` → not above baseline.

```bash
git add src/app/api/admin/reports/passes/route.ts src/hooks/useReportData.ts src/components/admin/reports/PassSection.tsx
git commit -m "📊 Report guest passes separately from pass sales"
```

---

### Task 7: POS "Bring a friend" panel

**Files:**
- Create: `src/components/pos/GuestPassPanel.tsx`
- Modify: `src/components/pos/CheckIn.tsx` (render it right after the `{isActiveMember && (… Active Member …)}` block, ~line 3007–3017)

**Interfaces:**
- Consumes: the four HTTP endpoints from Task 5; `WaiverModal` (`@/components/ui/WaiverModal`, props `isOpen, onClose, childName, signedDate?, onAgree?, isSubmitting?`).
- Produces: `<GuestPassPanel customerId={string} />` — renders nothing until the status says `open && hasMembership`.

- [ ] **Step 1: Build the panel**

Behavior (one file, client component, `'use client'`):
1. On mount and after every change: `GET /api/guest-passes?customer_id=…` → `GuestPassStatus`. Render nothing if `!open || !hasMembership`.
2. Header row: `🐝 Bring a friend — {remaining} of {allowance} left this membership` and a **Bring a friend** button (disabled at 0 remaining, with "Resets when the membership renews").
3. Under it, list `guests` from this period: child name, time, and an **Undo** button when `visitOpen`. Undo → `DELETE /api/guest-passes/{purchaseId}` after a `confirm()`; show the error text on failure; reload status.
4. Dialog (step state machine `'phone' | 'existing' | 'new' | 'waiver' | 'done'`):
   - `phone`: one input; Continue → `POST /api/guest-passes/check { phone }`.
     - `not_eligible`/`conflict` → show `message` in red, stay on `phone`.
     - `existing` → step `existing`: "Welcome back, {parentName}" + radio list of `children` + "Add a different child" (name + birthdate inputs).
     - `new` → step `new`: inputs parent name, email, child name, child birthdate (`type="date"`). Phone is carried over, read-only.
   - Then `waiver`: open `WaiverModal` with `childName`; its `onAgree` submits `POST /api/guest-passes` with `{ phone, parent_name?, email?, child_id? | child?, waiver_agreed: true }`.
   - `201` → step `done`: "{child} is checked in as {member}'s guest. {remaining} left." with Close; reload status.
   - Any `4xx` → show `error` in the current step; `409` with `reason: 'none_left'` closes the dialog after showing it.
5. Validate the form client-side with the same rules (10-digit phone, email, name, birthdate) before enabling submit — the server re-validates regardless.

Style: copy the amber member-badge look already in `CheckIn.tsx` (`rounded-lg bg-amber-100 border border-amber-400`), large touch targets (`py-3 text-lg`) to match the rest of the POS. Inline any opacity/arbitrary values per the Tailwind dropout issue in this repo (use `style={{ … }}` for anything critical).

- [ ] **Step 2: Mount it**

In `CheckIn.tsx`, after the Active Member badge block:

```tsx
                                {isActiveMember && displayCustomer && (
                                    <GuestPassPanel customerId={displayCustomer.id} />
                                )}
```

and `import { GuestPassPanel } from "./GuestPassPanel";` at the top.

- [ ] **Step 3: Type count, then run it**

Run: `pnpm exec tsc --noEmit -p . 2>&1 | grep -c "error TS"` → not above baseline. Then `pnpm dev`, open `/pos`, look up a member on a branch preview pointed at the **restored copy**, not production; confirm the panel renders (before 1 Nov it should *not* — temporarily test by setting the system clock or by passing a `now` override in a scratch, never committed, edit).

- [ ] **Step 4: Commit**

```bash
git add src/components/pos/GuestPassPanel.tsx src/components/pos/CheckIn.tsx
git commit -m "✨ POS: bring a friend on a member guest pass"
```

---

### Task 8: My Account line

**Files:**
- Create: `src/components/customer/GuestPassBanner.tsx`
- Modify: `src/components/customer/WebMyAccount.tsx` (near where `hasActiveMembership(purchases)` is used, ~line 2641)

**Interfaces:**
- Consumes: `GET /api/guest-passes?customer_id=`.
- Produces: `<GuestPassBanner customerId={string} />`.

- [ ] **Step 1: Build**

Client component: fetch status; render nothing unless `hasMembership`. Before 1 Nov (`!open`): "From November 1st, bring a friend who's new to Busy Bees — 2 free guest passes each membership." After: "You have {remaining} guest pass{remaining === 1 ? '' : 'es'} left this membership — bring a friend who's new to Busy Bees. Just tell the front desk." Same amber style as the POS badge.

- [ ] **Step 2: Mount** it in `WebMyAccount.tsx` next to the member-status UI, passing the profile's id. Then `pnpm exec tsc --noEmit -p . 2>&1 | grep -c "error TS"` → not above baseline.

- [ ] **Step 3: Commit**

```bash
git add src/components/customer/GuestPassBanner.tsx src/components/customer/WebMyAccount.tsx
git commit -m "✨ My Account: show remaining guest passes"
```

---

### Task 9: Verify end to end on a restored copy

- [ ] **Step 1:** `pnpm vitest run` → all PASS. `pnpm build` → succeeds (CLAUDE.md: never deploy without a local build).
- [ ] **Step 2:** Restore production into a scratch Supabase project (Pro plan backups), apply 057 there, run runbook tests T1–T9; record PASS/FAIL in `docs/GUEST_PASSES_RUNBOOK.md`.
- [ ] **Step 3:** Point a local `.env.local` at the scratch project (and **Stripe test keys** — local dev defaults to live keys) and walk the POS flow: new family; existing no-purchase account; paying family refused; matched only by email refused; third pass refused; undo open visit; undo after checkout refused; My Account counts.
- [ ] **Step 4:** Commit the runbook results; open a PR into `main` with the runbook's apply order in the description (057 in production **before** merge/deploy).

---

## Self-review notes

- Spec coverage: rules 1–6 → Tasks 1, 2, 5; counter flow → Task 7; data → Task 1; server/auth/race/rate-limit → Tasks 1, 4, 5; My Account → Task 8; admin report → Task 6. **Admin customer page "sponsored by" label is dropped** as low value for the deadline; the report and the `guest_of_purchase_id` column carry the same information. Flag to Tim.
- Known, out of scope: `PUT /api/sessions/[id]` (check-out) has no auth check at all; guests check out through it like everyone else. Separate security fix.
