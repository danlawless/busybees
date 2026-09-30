# Account-Wide Punch Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a punch card belong to the account rather than one named child, so any child on the account can spend its punches.

**Architecture:** An explicit `purchases.pass_scope` column marks a card as `'account'`; `sessions.child_id` records which child actually played, making three concurrent check-ins on one card distinguishable. The punch is deducted at check-in rather than check-out so `total_sessions - used_sessions` stays truthful on every reporting surface. Allocation logic lives in a pure module, not in the 6,202-line `CheckIn.tsx`.

**Tech Stack:** Next.js 15.5.7 App Router, TypeScript 5 strict, Supabase (Postgres + RLS), Vitest (added by Task 1), pnpm.

**Spec:** `docs/superpowers/specs/2026-09-03-account-wide-punch-cards-design.md`

## Global Constraints

- **Ships on the night of 1 October 2026**, as step 3 of the existing pricing runbook — the same deploy that carries `PACKAGE_PRICING` and `TODDLER_AGE_THRESHOLD`. Do not add date-gating anywhere.
- **Migrations are applied by hand** through the Supabase Dashboard SQL Editor. The Supabase CLI does not work on this machine. Never edit an existing migration file.
- **TypeScript strict mode. No `any` types.**
- **Never use `--no-verify` on commits.** Pre-commit hooks are security checks.
- **Commit format:** `emoji type: description` (✨ feature, 🐛 fix, 🔒 security, 💳 payment, ♻️ refactor, ✍️ docs, ✅ tests).
- **Prices are never hardcoded.** Read them from the `passes` table via `src/lib/pricing/catalog.ts` or `resolvePassForChild`. After any pricing-adjacent change run `npx tsx scripts/verify-pricing.ts`.
- **Punch card rates from 1 October:** 10 for $170, 5 for $90. One card, no age tiers, no sibling discount on the card itself.
- Package manager is **pnpm**.

---

### Task 1: Add a test runner

The repo has no test framework — no Vitest, no Jest, zero test files. Every following task is test-first, so this comes first.

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/lib/pos/__tests__/smoke.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `pnpm test` (single run) and `pnpm test:watch`. Tests live in `__tests__` folders beside the module under test and are named `*.test.ts`. The `@/` alias resolves to `src/`.

- [ ] **Step 1: Install Vitest**

```bash
cd /Users/tim/Documents/BusyBees
pnpm add -D vitest@^3 vite-tsconfig-paths@^5
```

- [ ] **Step 2: Create the config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

`vite-tsconfig-paths` is what makes `@/lib/...` imports resolve; without it every test fails on import.

- [ ] **Step 3: Add the scripts**

In `package.json`, inside `"scripts"`, add:

```json
    "test": "vitest run",
    "test:watch": "vitest",
```

- [ ] **Step 4: Write a smoke test**

Create `src/lib/pos/__tests__/smoke.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { getPassKind } from '@/lib/pos/passSelection';

describe('test harness', () => {
  it('resolves the @/ alias and imports project code', () => {
    expect(getPassKind({ id: '1', name: 'Punch Card (10 passes)', price: 170 })).toBe('punch');
  });
});
```

- [ ] **Step 5: Run it**

Run: `pnpm test`
Expected: PASS, 1 test. If it fails on `Cannot find module '@/lib/pos/passSelection'`, `vite-tsconfig-paths` is not wired into `plugins`.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts src/lib/pos/__tests__/smoke.test.ts
git commit -m "✅ Add Vitest so pass logic can be tested"
```

---

### Task 2: Narrow per-child resolution so punch cards can't be sold per child

Today `quotePasses(children, 'punch', ...)` emits one line per child, so a family of three is sold three cards. Rather than a runtime guard, narrow the type: punch cards are account-scoped and have no child, so they must not be reachable through the per-child functions at all.

**Files:**
- Modify: `src/lib/pos/passSelection.ts`
- Create: `src/lib/pos/__tests__/passSelection.test.ts`

**Interfaces:**
- Consumes: `getPassKind`, `SelectablePass` from Task 1's smoke test import path.
- Produces:
  - `export type PerChildPassKind = Exclude<PassKind, 'punch'>` — `'day' | 'monthly'`
  - `resolvePassOptions(child: ChildLike, kind: PerChildPassKind, passes): SelectablePass[]`
  - `resolvePassForChild(child: ChildLike, kind: PerChildPassKind, passes): SelectablePass | null`
  - `quotePasses(children, kind: PerChildPassKind, passes, siblingRules, qualifiesForMemberPricing): PassQuote`
  - `punchCardOptions(passes: readonly SelectablePass[]): SelectablePass[]` — account punch cards, most sessions first.

  `PassKind`, `PASS_KINDS`, `PASS_KIND_LABEL`, `getPassKind`, `SIBLING_PRICED_KINDS`, `PricedLine`, `PassQuote`, `QuoteGroup`, `groupQuoteByProduct`, `isMultiChildPass` all keep their current names and shapes.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/pos/__tests__/passSelection.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { punchCardOptions, type SelectablePass } from '@/lib/pos/passSelection';

const CARDS: SelectablePass[] = [
  { id: 'p5', name: 'Punch Card (5 passes)', price: 90, category: 'weekly', sessions_included: 5 },
  { id: 'p10', name: 'Punch Card (10 passes)', price: 170, category: 'weekly', sessions_included: 10 },
  { id: 'd1', name: 'Day Pass', price: 20, category: 'day', sessions_included: 1 },
  { id: 'm1', name: 'Monthly Membership', price: 65, category: 'monthly', sessions_included: 999 },
];

describe('punchCardOptions', () => {
  it('returns only punch cards, most sessions first', () => {
    expect(punchCardOptions(CARDS).map((p) => p.id)).toEqual(['p10', 'p5']);
  });

  it('excludes day passes and memberships', () => {
    expect(punchCardOptions(CARDS).some((p) => p.id === 'd1' || p.id === 'm1')).toBe(false);
  });

  it('returns an empty list when the catalogue carries no punch card', () => {
    expect(punchCardOptions(CARDS.filter((p) => !p.name.includes('Punch')))).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/lib/pos/__tests__/passSelection.test.ts`
Expected: FAIL — `punchCardOptions is not a function` / no matching export.

- [ ] **Step 3: Add `punchCardOptions` and narrow the types**

In `src/lib/pos/passSelection.ts`, after the `PassKind` declaration add:

```ts
/**
 * The kinds still bought per child. Punch cards became account-scoped on
 * 1 October 2026 — they have no child, so resolving one against a child's age
 * is meaningless and used to sell a family of three, three cards.
 */
export type PerChildPassKind = Exclude<PassKind, 'punch'>;
```

Change the `kind` parameter type from `PassKind` to `PerChildPassKind` on `resolvePassOptions`, `resolvePassForChild` and `quotePasses`. Inside `quotePasses`, the line `const combo = kind === 'day' ? findComboPass(passes) : null;` needs no change.

Then add, next to `resolvePassOptions`:

```ts
/**
 * The punch cards on offer, most sessions first.
 *
 * Account-scoped, so no child and no age band comes into it — after
 * 1 October there is one flat card and any child on the account may spend it.
 */
export function punchCardOptions(
  passes: readonly SelectablePass[]
): SelectablePass[] {
  return passes
    .filter((p) => getPassKind(p) === 'punch' && !isMultiChildPass(p.name))
    .sort(
      (a, b) =>
        (b.sessions_included ?? 0) - (a.sessions_included ?? 0) || a.price - b.price
    );
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test src/lib/pos/__tests__/passSelection.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Verify the narrowing actually bites**

Run: `npx tsc --noEmit`
Expected: errors in `src/components/pos/CheckIn.tsx` where `passKind` (a `PassKind`) is passed to `quotePasses`. **This is the point of the task** — it proves punch can no longer reach the per-child path. Task 7 fixes the call sites. Leave the errors for now and note them.

- [ ] **Step 6: Commit**

```bash
git add src/lib/pos/passSelection.ts src/lib/pos/__tests__/passSelection.test.ts
git commit -m "♻️ Punch cards leave the per-child pass resolution"
```

**Deviation from the spec, deliberate.** The spec says `resolvePassOptions` stops
age-band filtering punch products. Narrowing the type instead makes punch
unreachable from every per-child function, which is the same end enforced by the
compiler rather than by a runtime branch. There is therefore no test for "punch
is no longer age-filtered" — `npx tsc --noEmit` is the test.

---

### Task 3: Punch allocation

The pure function behind the "who is playing" screen: decide who spends a punch and who buys a day pass, and price the day passes.

**Files:**
- Create: `src/lib/pos/punchAllocation.ts`
- Create: `src/lib/pos/__tests__/punchAllocation.test.ts`

**Interfaces:**
- Consumes: `ChildLike`, `SelectablePass`, `SiblingRule`, `quotePasses`, `PricedLine` from `@/lib/pos/passSelection`; `getAgeGroupFromBirthdate` from `@/lib/utils/ageUtils`.
- Produces:

```ts
export interface AllocationCandidate {
  child: ChildLike;
  preferPunch?: boolean;
}
export type AllocationMethod = 'punch' | 'day_pass';
export interface AllocationLine {
  child: ChildLike;
  method: AllocationMethod;
  price: number;
  pass: SelectablePass | null;
}
export interface PunchAllocation {
  lines: AllocationLine[];
  punchesSpent: number;
  punchesRemainingAfter: number;
  total: number;
  unresolved: ChildLike[];
}
export function allocatePunches(
  candidates: readonly AllocationCandidate[],
  punchesRemaining: number,
  passes: readonly SelectablePass[],
  siblingRules: readonly SiblingRule[],
  qualifiesForMemberPricing: boolean
): PunchAllocation;
```

**The two rules that carry the money:**

1. An under-1 defaults to a day pass, because a punch is worth $17 and the under-1 day rate is $10 — spending a punch on a baby costs the family $7. `preferPunch: true` overrides.
2. Day passes are priced by `quotePasses` over **every** child in the visit, punch-payers included as position-holders. One family on one visit is one sibling ladder; the day-pass children's prices are then read out of that quote. Check-in never forms a second opinion about day pass pricing.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/pos/__tests__/punchAllocation.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { allocatePunches } from '@/lib/pos/punchAllocation';
import type { ChildLike, SelectablePass, SiblingRule } from '@/lib/pos/passSelection';

// October 2026 catalogue: one flat day pass, one under-1 rate, no combo.
const PASSES: SelectablePass[] = [
  { id: 'day', name: 'Day Pass', price: 20, category: 'day', sessions_included: 1 },
  { id: 'baby', name: 'Day Pass - Infant', price: 10, category: 'day', sessions_included: 1 },
];

// 50% for everyone from the second child, per the October restructure.
const SIBLING_RULES: SiblingRule[] = [
  { child_position: 2, discount_percent: 50, is_active: true, applies_to_monthly_only: false },
  { child_position: 3, discount_percent: 50, is_active: true, applies_to_monthly_only: false },
];

// Ages are relative to the run, not fixed dates. A hardcoded birthdate makes a
// child a year older every year, so "Mia is under 1" would quietly stop being
// true and these tests would start asserting something else.
const monthsAgo = (months: number): string => {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
};

// TODDLER_AGE_THRESHOLD is 2 today and 1 from October. These ages sit clear of
// both boundaries, so the tests mean the same thing either side of the change.
const ava: ChildLike = { id: 'a', name: 'Ava', birthdate: monthsAgo(52), waiverSigned: true };
const noah: ChildLike = { id: 'n', name: 'Noah', birthdate: monthsAgo(40), waiverSigned: true };
const mia: ChildLike = { id: 'm', name: 'Mia', birthdate: monthsAgo(8), waiverSigned: true };

const alloc = (
  candidates: { child: ChildLike; preferPunch?: boolean }[],
  punches: number
) => allocatePunches(candidates, punches, PASSES, SIBLING_RULES, false);

describe('allocatePunches', () => {
  it('spends a punch for each full-rate child when the card is deep enough', () => {
    const result = alloc([{ child: ava }, { child: noah }], 7);
    expect(result.lines.map((l) => l.method)).toEqual(['punch', 'punch']);
    expect(result.punchesSpent).toBe(2);
    expect(result.punchesRemainingAfter).toBe(5);
    expect(result.total).toBe(0);
  });

  it('defaults an under-1 to the day rate rather than a punch', () => {
    const result = alloc([{ child: ava }, { child: mia }], 7);
    const miaLine = result.lines.find((l) => l.child.id === 'm');
    expect(miaLine?.method).toBe('day_pass');
    expect(result.punchesSpent).toBe(1);
  });

  it('spends a punch on an under-1 when staff override', () => {
    const result = alloc([{ child: ava }, { child: mia, preferPunch: true }], 7);
    expect(result.lines.every((l) => l.method === 'punch')).toBe(true);
    expect(result.punchesSpent).toBe(2);
    expect(result.total).toBe(0);
  });

  it('sells a day pass for the shortfall when the card runs out', () => {
    const result = alloc([{ child: ava }, { child: noah }, { child: mia }], 2);
    expect(result.punchesSpent).toBe(2);
    expect(result.punchesRemainingAfter).toBe(0);
    const miaLine = result.lines.find((l) => l.child.id === 'm');
    expect(miaLine?.method).toBe('day_pass');
  });

  it('gives the shortfall child a sibling position behind the punch payers', () => {
    // Ava and Noah hold positions 1 and 2 on punches, so Mia is position 3 and
    // takes the 50% sibling rate off the $10 under-1 pass.
    const result = alloc([{ child: ava }, { child: noah }, { child: mia }], 2);
    expect(result.total).toBe(5);
  });

  it('spends nothing and charges everyone when the card is empty', () => {
    const result = alloc([{ child: ava }, { child: noah }], 0);
    expect(result.punchesSpent).toBe(0);
    expect(result.lines.every((l) => l.method === 'day_pass')).toBe(true);
    // Ava $20 at position 1, Noah 50% off $20 at position 2.
    expect(result.total).toBe(30);
  });

  it('never spends more punches than the card holds', () => {
    const result = alloc([{ child: ava }, { child: noah }, { child: mia, preferPunch: true }], 1);
    expect(result.punchesSpent).toBe(1);
    expect(result.punchesRemainingAfter).toBe(0);
  });

  it('reports a child with no day pass for their age as unresolved', () => {
    const result = allocatePunches([{ child: ava }], 0, [], SIBLING_RULES, false);
    expect(result.unresolved.map((c) => c.id)).toEqual(['a']);
    expect(result.lines).toEqual([]);
  });

  it('returns an empty allocation for an empty selection', () => {
    const result = alloc([], 10);
    expect(result.lines).toEqual([]);
    expect(result.punchesSpent).toBe(0);
    expect(result.total).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/lib/pos/__tests__/punchAllocation.test.ts`
Expected: FAIL — cannot resolve `@/lib/pos/punchAllocation`.

- [ ] **Step 3: Implement**

Create `src/lib/pos/punchAllocation.ts`:

```ts
/**
 * Who spends a punch, and what the rest pay.
 *
 * A punch card belongs to the account from 1 October 2026, so a visit is a set
 * of children drawing on one shared balance. Two things here carry money:
 *
 *   - An under-1 defaults to the under-1 day rate rather than a punch. A punch
 *     is worth $17 and the under-1 rate is $10, so spending one on a baby costs
 *     the family $7 without telling them. Staff can override per child.
 *   - Day passes for a shortfall are priced by quotePasses over the whole
 *     visit, punch payers included as position-holders that raise no charge.
 *     One family on one visit is one sibling ladder, and check-in never forms
 *     its own opinion about day pass pricing.
 */

import { getAgeGroupFromBirthdate } from '@/lib/utils/ageUtils';
import {
  quotePasses,
  type ChildLike,
  type SelectablePass,
  type SiblingRule,
} from '@/lib/pos/passSelection';

export interface AllocationCandidate {
  child: ChildLike;
  /** Staff chose to spend a punch on this under-1 anyway. */
  preferPunch?: boolean;
}

export type AllocationMethod = 'punch' | 'day_pass';

export interface AllocationLine {
  child: ChildLike;
  method: AllocationMethod;
  /** Charged now. Always 0 for a punch — the card was paid for already. */
  price: number;
  /** The day pass to buy, or null when a punch covers this child. */
  pass: SelectablePass | null;
}

export interface PunchAllocation {
  lines: AllocationLine[];
  punchesSpent: number;
  punchesRemainingAfter: number;
  /** Total to charge now, for the day passes only. */
  total: number;
  /** Children with no day pass in the catalogue for their age. */
  unresolved: ChildLike[];
}

export function allocatePunches(
  candidates: readonly AllocationCandidate[],
  punchesRemaining: number,
  passes: readonly SelectablePass[],
  siblingRules: readonly SiblingRule[],
  qualifiesForMemberPricing: boolean
): PunchAllocation {
  // An under-1 takes the cheaper day rate unless staff say otherwise.
  const wantsPunch = (c: AllocationCandidate): boolean =>
    c.preferPunch === true || getAgeGroupFromBirthdate(c.child.birthdate) !== 'infant';

  // Punches go out in display order, so the screen and the charge agree.
  let budget = Math.max(0, punchesRemaining);
  const punchIds = new Set<string>();
  for (const candidate of candidates) {
    if (budget === 0) break;
    if (!wantsPunch(candidate)) continue;
    punchIds.add(candidate.child.id);
    budget -= 1;
  }

  // Every child in the visit holds a sibling position, punch payers included.
  const quote = quotePasses(
    candidates.map((c) => c.child),
    'day',
    passes,
    siblingRules,
    qualifiesForMemberPricing
  );
  const quoted = new Map(quote.lines.map((l) => [l.child.id, l]));
  const unresolvedIds = new Set(quote.unresolved.map((c) => c.id));

  const lines: AllocationLine[] = [];
  const unresolved: ChildLike[] = [];

  for (const { child } of candidates) {
    if (punchIds.has(child.id)) {
      lines.push({ child, method: 'punch', price: 0, pass: null });
      continue;
    }
    const line = quoted.get(child.id);
    if (!line || unresolvedIds.has(child.id)) {
      unresolved.push(child);
      continue;
    }
    lines.push({ child, method: 'day_pass', price: line.price, pass: line.pass });
  }

  return {
    lines,
    punchesSpent: punchIds.size,
    punchesRemainingAfter: Math.max(0, punchesRemaining) - punchIds.size,
    total: round2(lines.reduce((sum, l) => sum + l.price, 0)),
    unresolved,
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test src/lib/pos/__tests__/punchAllocation.test.ts`
Expected: PASS, 9 tests.

If `gives the shortfall child a sibling position behind the punch payers` fails with `20` instead of `5`, `quotePasses` is being called with only the day-pass children — it must receive every child in the visit.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pos/punchAllocation.ts src/lib/pos/__tests__/punchAllocation.test.ts
git commit -m "✨ Decide who spends a punch and what the rest pay"
```

---

### Task 4: Migration — scope, session child, and check-in deduction

**Files:**
- Create: `supabase/migrations/052_punch_cards_account_scope.sql`

**Interfaces:**
- Consumes: nothing
- Produces: `purchases.pass_scope` (`'child' | 'account'`, default `'child'`), `sessions.child_id`, triggers `consume_session_on_checkin` (AFTER INSERT) and `restore_session_on_void` (AFTER DELETE). The AFTER UPDATE trigger `update_purchase_sessions` is gone.

**The step that is easy to get wrong:** sessions open at migration time have *not* been counted, because today a punch is spent on check-out. Swapping the triggers without counting them first leaves those visits free forever. That count must happen before the old trigger is dropped, in the same transaction.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/052_punch_cards_account_scope.sql`:

```sql
-- Migration 052: Punch cards belong to the account, not one child
--
-- A punch card is bought for the account from 1 October 2026, and any child on
-- that account may spend a punch. Two things follow:
--
--   1. Scope has to be explicit. `child_id IS NULL` will not do the job:
--      purchases.child_id is ON DELETE SET NULL, so deleting a child would
--      silently convert their old locked cards to account-wide.
--   2. Sessions have to record the child. Three children inside on one card are
--      otherwise indistinguishable, and "who is in the building?" becomes
--      unanswerable.
--
-- The punch also moves from check-out to check-in, so that
-- total_sessions - used_sessions stays truthful while children are inside.

BEGIN;

-- ==================== Scope ====================
-- Everything already sold takes 'child', so tiered cards sold before
-- 1 October keep working exactly as they do now until they age out.

ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS pass_scope TEXT NOT NULL DEFAULT 'child';

ALTER TABLE public.purchases
  DROP CONSTRAINT IF EXISTS purchases_pass_scope_check;

ALTER TABLE public.purchases
  ADD CONSTRAINT purchases_pass_scope_check
  CHECK (pass_scope IN ('child', 'account'));

-- ==================== Sessions record the child ====================

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS child_id UUID REFERENCES public.children(id) ON DELETE SET NULL;

UPDATE public.sessions s
SET child_id = p.child_id
FROM public.purchases p
WHERE s.purchase_id = p.id
  AND s.child_id IS NULL
  AND p.child_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_child ON public.sessions(child_id);

-- ==================== Count the open sessions ====================
-- These have not been counted yet: today a punch is spent on check-out. Once
-- the trigger moves to check-in they never would be. Count them once, here,
-- before the old trigger goes.

WITH open_counts AS (
  SELECT purchase_id, COUNT(*) AS n
  FROM public.sessions
  WHERE end_time IS NULL
  GROUP BY purchase_id
)
UPDATE public.purchases p
SET
  used_sessions = p.used_sessions + oc.n,
  status = CASE
    WHEN p.status = 'active' AND p.used_sessions + oc.n >= p.total_sessions
      THEN 'used'::purchase_status
    ELSE p.status
  END,
  updated_at = NOW()
FROM open_counts oc
WHERE p.id = oc.purchase_id;

-- ==================== The punch moves to check-in ====================

DROP TRIGGER IF EXISTS update_purchase_sessions ON public.sessions;

CREATE OR REPLACE FUNCTION consume_session_on_checkin()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.purchases
  SET
    used_sessions = used_sessions + 1,
    status = CASE
      WHEN status = 'active' AND used_sessions + 1 >= total_sessions
        THEN 'used'::purchase_status
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = NEW.purchase_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS consume_session_on_checkin ON public.sessions;
CREATE TRIGGER consume_session_on_checkin
  AFTER INSERT ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION consume_session_on_checkin();

-- ==================== Voiding a check-in gives the punch back ====================
-- There was no undo before: check-out was the only way to end a session, and
-- check-out was what spent the punch. With three punches going at once a
-- mis-tap costs three times as much.

CREATE OR REPLACE FUNCTION restore_session_on_void()
RETURNS TRIGGER AS $$
DECLARE
  remaining_used INTEGER;
BEGIN
  UPDATE public.purchases
  SET
    used_sessions = GREATEST(used_sessions - 1, 0),
    status = CASE
      WHEN status = 'used' THEN 'active'::purchase_status
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = OLD.purchase_id
  RETURNING used_sessions INTO remaining_used;

  -- A card voided back to nothing should not keep the clock its first use
  -- started, or a mis-tap would quietly burn 90 days of a brand new card.
  IF remaining_used = 0 THEN
    UPDATE public.purchases
    SET first_use_date = NULL, actual_expiry_date = NULL, updated_at = NOW()
    WHERE id = OLD.purchase_id;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS restore_session_on_void ON public.sessions;
CREATE TRIGGER restore_session_on_void
  AFTER DELETE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION restore_session_on_void();

-- ==================== Active sessions name the right child ====================
-- get_active_sessions joined children through the purchase. With several
-- children on one card that returns the wrong name, so it reads the session.

CREATE OR REPLACE FUNCTION get_active_sessions(customer_uuid UUID)
RETURNS TABLE (
  session_id UUID,
  purchase_id UUID,
  child_name TEXT,
  start_time TIMESTAMP WITH TIME ZONE,
  auto_checkout_time TIMESTAMP WITH TIME ZONE,
  pass_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.purchase_id,
    c.name,
    s.start_time,
    s.auto_checkout_time,
    p.name
  FROM public.sessions s
  JOIN public.purchases p ON s.purchase_id = p.id
  LEFT JOIN public.children c ON s.child_id = c.id
  WHERE s.customer_id = customer_uuid
    AND s.end_time IS NULL
  ORDER BY s.start_time DESC;
END;
$$ LANGUAGE plpgsql;

COMMIT;
```

- [ ] **Step 2: Check the current `get_active_sessions` signature before applying**

The `CREATE OR REPLACE FUNCTION` above must match the existing return columns exactly or Postgres refuses it. Read the original:

```bash
sed -n '119,146p' supabase/migrations/003_create_functions.sql
```

If the column list differs from what is written above, correct the migration to match the original signature and change only the two join lines. If the return type genuinely needs to change, `DROP FUNCTION get_active_sessions(UUID);` immediately before the `CREATE`.

- [ ] **Step 3: Apply it on a Supabase branch first**

Migrations here are applied by hand and the CLI does not work, so do not paste this straight into production. Create a branch, apply there, and check the counts:

```sql
-- On the branch, before applying:
SELECT COUNT(*) AS open_sessions FROM public.sessions WHERE end_time IS NULL;
SELECT id, used_sessions, total_sessions, status
FROM public.purchases
WHERE id IN (SELECT purchase_id FROM public.sessions WHERE end_time IS NULL);
```

Apply the migration, then confirm each of those purchases has `used_sessions` up by exactly the number of its open sessions, and that nothing went above `total_sessions` without landing on `status = 'used'`.

- [ ] **Step 4: Verify the triggers behave**

On the branch:

```sql
-- Check-in spends a punch immediately.
INSERT INTO public.sessions (customer_id, purchase_id, child_id, auto_checkout_time)
VALUES ('<customer>', '<punch card purchase>', '<child>', NOW() + INTERVAL '6 hours')
RETURNING id;
SELECT used_sessions, status FROM public.purchases WHERE id = '<punch card purchase>';
-- used_sessions must be up by 1.

-- Check-out does not spend a second one.
UPDATE public.sessions SET end_time = NOW() WHERE id = '<session id>';
SELECT used_sessions FROM public.purchases WHERE id = '<punch card purchase>';
-- unchanged.

-- Voiding gives it back.
DELETE FROM public.sessions WHERE id = '<session id>';
SELECT used_sessions, first_use_date, actual_expiry_date
FROM public.purchases WHERE id = '<punch card purchase>';
-- used_sessions back down; on a card returned to 0 both dates are NULL.
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/052_punch_cards_account_scope.sql
git commit -m "✨ Punch cards carry account scope and sessions carry a child"
```

---

### Task 5: Regenerate database types

**Files:**
- Modify: `src/lib/supabase/database.types.ts`

**Interfaces:**
- Consumes: migration 052, applied.
- Produces: `pass_scope: string` on the `purchases` Row/Insert/Update types, `child_id: string | null` on `sessions`. Every later task depends on these compiling.

- [ ] **Step 1: Regenerate**

Use the Supabase MCP tool `generate_typescript_types` against the project, and write the result over `src/lib/supabase/database.types.ts`.

- [ ] **Step 2: Confirm the new fields landed**

```bash
grep -n "pass_scope" src/lib/supabase/database.types.ts
grep -n -A16 "sessions: {" src/lib/supabase/database.types.ts | grep -n "child_id"
```

Expected: `pass_scope` appears three times (Row, Insert, Update); `child_id` appears under `sessions`.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: the only remaining errors are the `CheckIn.tsx` ones from Task 2 Step 5.

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase/database.types.ts
git commit -m "♻️ Regenerate database types for pass scope and session child"
```

---

### Task 6: Session endpoints — batch check-in and void

Three separate session POSTs could half-succeed and leave punches spent with children not checked in. A single array insert is one Postgres statement, so it is atomic without any explicit transaction.

**Files:**
- Modify: `src/lib/services/sessions.ts`
- Create: `src/app/api/sessions/batch/route.ts`
- Modify: `src/app/api/sessions/[id]/route.ts`

**Interfaces:**
- Consumes: `sessions.child_id` from Task 4.
- Produces:
  - `createSessions(entries: SessionInsert[]): Promise<Session[]>` in the service layer.
  - `POST /api/sessions/batch` taking `{ customer_id: string, entries: { purchase_id: string, child_id: string }[], auto_checkout_time: string }`, returning `{ sessions }` with 201.
  - `DELETE /api/sessions/[id]` returning `{ voided: true }`, 400 if the session has already ended.
  - `voidSession(id: string): Promise<void>` in the service layer.

- [ ] **Step 1: Add the service functions**

In `src/lib/services/sessions.ts`, after `getAllActiveSessions`:

```ts
/**
 * Open several sessions at once.
 *
 * One array insert is a single statement, so a family checking in on one punch
 * card either all get in or none do. Separate inserts could half-succeed and
 * leave punches spent with children still outside.
 */
export async function createSessions(entries: SessionInsert[]): Promise<Session[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.from('sessions').insert(entries).select();

  if (error) {
    console.error('Error creating sessions:', error);
    throw error;
  }

  return data;
}

/**
 * Undo a check-in that has not ended yet. The AFTER DELETE trigger gives the
 * punch back and, on a card returned to zero, clears the expiry clock its first
 * use started.
 */
export async function voidSession(id: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: session, error: readError } = await supabase
    .from('sessions')
    .select('id, end_time')
    .eq('id', id)
    .single();

  if (readError) {
    console.error('Error reading session to void:', readError);
    throw readError;
  }
  if (session.end_time !== null) {
    throw new Error('SESSION_ALREADY_ENDED');
  }

  const { error } = await supabase.from('sessions').delete().eq('id', id);

  if (error) {
    console.error('Error voiding session:', error);
    throw error;
  }
}
```

- [ ] **Step 2: Create the batch route**

Create `src/app/api/sessions/batch/route.ts`:

```ts
/**
 * API Route: Batch check-in
 * POST - Open one session per child against the passes that cover them.
 *
 * A family on one punch card checks in as a unit: either every child gets in
 * or none does, so a partial failure never spends punches for children left
 * outside.
 *
 * Note: POS staff access is controlled via PIN at the application level.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSessions } from '@/lib/services/sessions';
import { getPurchase, updatePurchase } from '@/lib/services/purchases';

const batchSchema = z.object({
  customer_id: z.uuid(),
  auto_checkout_time: z.iso.datetime(),
  start_time: z.iso.datetime().optional(),
  entries: z
    .array(z.object({ purchase_id: z.uuid(), child_id: z.uuid() }))
    .min(1)
    .max(12),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = batchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid check-in request', details: parsed.error.issues },
        { status: 400 }
      );
    }
    const { customer_id, auto_checkout_time, start_time, entries } = parsed.data;

    // Every pass is checked before anything is inserted, so an expired card
    // cannot let part of a family through.
    const purchaseIds = [...new Set(entries.map((e) => e.purchase_id))];
    for (const purchaseId of purchaseIds) {
      const purchase = await getPurchase(purchaseId);
      if (!purchase) {
        return NextResponse.json({ error: 'Pass not found' }, { status: 404 });
      }
      const expired =
        purchase.status === 'expired' ||
        (purchase.actual_expiry_date && new Date(purchase.actual_expiry_date) < new Date());
      if (expired) {
        if (purchase.status === 'active') {
          await updatePurchase(purchase.id, { status: 'expired' });
        }
        return NextResponse.json(
          { error: 'This pass has expired. Please purchase a new pass.' },
          { status: 400 }
        );
      }
    }

    const sessions = await createSessions(
      entries.map((entry) => ({
        customer_id,
        purchase_id: entry.purchase_id,
        child_id: entry.child_id,
        start_time: start_time ?? new Date().toISOString(),
        auto_checkout_time,
      }))
    );

    return NextResponse.json({ sessions }, { status: 201 });
  } catch (error) {
    console.error('Error creating sessions:', error);
    return NextResponse.json(
      {
        error: 'Failed to check in',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Add DELETE to the session route**

In `src/app/api/sessions/[id]/route.ts`, change the import line to:

```ts
import { endSession, voidSession } from '@/lib/services/sessions';
```

and append:

```ts
/**
 * DELETE - Undo a check-in.
 *
 * Distinct from check-out: this gives the punch back. Only a session that has
 * not ended can be voided, so it cannot be used to reverse a completed visit.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await voidSession(id);

    return NextResponse.json({ voided: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'SESSION_ALREADY_ENDED') {
      return NextResponse.json(
        { error: 'This visit has already ended and cannot be undone.' },
        { status: 400 }
      );
    }
    console.error('Error voiding session:', error);
    return NextResponse.json(
      {
        error: 'Failed to undo check-in',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Confirm the Zod idiom matches the project**

This repo is on Zod 4, where `z.uuid()` and `z.iso.datetime()` are top-level. Check one existing schema and match whatever it does:

```bash
grep -rn "z.uuid()\|z.string().uuid()\|z.iso.datetime()\|z.string().datetime()" src/lib/validations src/app/api | head -5
```

If the codebase uses `z.string().uuid()`, use that form instead.

- [ ] **Step 5: Typecheck and lint**

```bash
npx tsc --noEmit
pnpm lint
```

Expected: no new errors from these three files.

- [ ] **Step 6: Commit**

```bash
git add src/lib/services/sessions.ts src/app/api/sessions/batch/route.ts "src/app/api/sessions/[id]/route.ts"
git commit -m "✨ Check a family in as one unit and undo a mis-tapped check-in"
```

---

### Task 7: Buying a punch card is card-first

**Files:**
- Modify: `src/app/api/purchases/pos/route.ts:63-66` (destructure), `:475` (insert)
- Modify: `src/components/pos/CheckIn.tsx` — `handleBuyPasses` (around `:884-950`) and the pass-kind UI

**Interfaces:**
- Consumes: `punchCardOptions` and `PerChildPassKind` from Task 2; `pass_scope` from Task 5.
- Produces: `/api/purchases/pos` accepts an optional `pass_scope: 'child' | 'account'`, defaulting to `'child'`. A punch card purchase is one row with `pass_scope: 'account'` and `child_id: null`.

- [ ] **Step 1: Accept `pass_scope` server-side**

In `src/app/api/purchases/pos/route.ts`, add `pass_scope,` to the destructured body alongside `child_id` and `children_ids` (around line 63). Then immediately after the destructuring block add:

```ts
    // Punch cards are bought for the account from 1 October 2026. Anything that
    // does not say so is a pass for one named child, which is what every row
    // sold before then is.
    const passScope: 'child' | 'account' = pass_scope === 'account' ? 'account' : 'child';
```

In the main purchase insert (around line 475, the object containing `child_id: child_id || null`), add:

```ts
          pass_scope: passScope,
```

Leave the combo insert (around line 440) and the split-per-child inserts alone — those are always per-child and take the column default.

- [ ] **Step 2: Make the punch branch card-first in the POS**

In `src/components/pos/CheckIn.tsx`, `handleBuyPasses` currently maps `passQuote.lines` for punch and monthly, selling one card per child. Add an early branch at the top of the `try` block, before `const groups = ...`:

```ts
            // A punch card belongs to the account, so there is no child to pick
            // and no quote to build — one card, one row.
            if (passKind === 'punch') {
                if (!selectedPunchCard) {
                    setPassError('Choose a punch card.');
                    return;
                }
                const response = await fetch('/api/purchases/pos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        customer_id: customer.id,
                        product_id: selectedPunchCard.id,
                        product_name: selectedPunchCard.name,
                        product_price: selectedPunchCard.price,
                        product_description: '',
                        purchase_type: 'weekly_pass',
                        child_id: null,
                        pass_scope: 'account',
                        quantity: 1,
                        metadata: {},
                    }),
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Purchase failed');
                }
                setSuccessDetails({
                    title: 'Punch Card Purchased ✅',
                    message: `${selectedPunchCard.name} — any child on the account can use it.`,
                    details: `💰 ${formatCurrency(selectedPunchCard.price)}`,
                });
                return;
            }
```

Add the state it reads, beside the other pass state (near `passChildIds` around line 869):

```ts
    const [selectedPunchCard, setSelectedPunchCard] = useState<SelectablePass | null>(null);
```

- [ ] **Step 3: Show cards instead of children when Punch Card is chosen**

Where the pass-buying UI renders the child checkboxes (the block driven by `togglePassChild` and `passQuote`), wrap it so that `passKind === 'punch'` renders the card list instead:

```tsx
{passKind === 'punch' ? (
    <div className="space-y-3">
        <p className="text-lg text-gray-600">
            👨‍👩‍👧‍👦 Any child on the account can use these punches.
        </p>
        {punchCardOptions(passes).map((card) => (
            <button
                key={card.id}
                type="button"
                onClick={() => setSelectedPunchCard(card)}
                className={`w-full p-4 rounded-xl border-4 text-left transition-colors ${
                    selectedPunchCard?.id === card.id
                        ? 'border-yellow-400 bg-yellow-50'
                        : 'border-gray-200 hover:bg-gray-50'
                }`}
            >
                <span className="text-xl font-bold">{card.name}</span>
                <span className="ml-3 text-xl">{formatCurrency(card.price)}</span>
            </button>
        ))}
    </div>
) : (
    /* existing child-selection block, unchanged */
)}
```

Import `punchCardOptions` and `SelectablePass` from `@/lib/pos/passSelection` alongside the existing imports.

- [ ] **Step 4: Fix the Task 2 type errors**

`passQuote` is computed by calling `quotePasses(..., passKind, ...)`, which no longer accepts `'punch'`. Guard it so the quote is only built for the per-child kinds:

```ts
    const passQuote = useMemo(
        () =>
            passKind === 'punch'
                ? { lines: [], unresolved: [], total: 0, savings: 0, productCount: 0 }
                : quotePasses(selectedPassChildren, passKind, passes, siblingRules, qualifiesForMemberPricing),
        [passKind, selectedPassChildren, passes, siblingRules, qualifiesForMemberPricing]
    );
```

Match the existing `useMemo` dependencies rather than copying these verbatim — read the current definition first.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean. The `CheckIn.tsx` errors from Task 2 Step 5 are now resolved.

- [ ] **Step 6: Verify a purchase end to end**

```bash
pnpm dev
```

At the POS, look up a test customer, choose Punch Card, pick the 10-pack, buy it. Then confirm the row:

```sql
SELECT id, name, child_id, pass_scope, total_sessions, used_sessions, status
FROM public.purchases
ORDER BY created_at DESC
LIMIT 1;
```

Expected: `child_id` NULL, `pass_scope` `'account'`, `total_sessions` 10, `used_sessions` 0.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/purchases/pos/route.ts src/components/pos/CheckIn.tsx
git commit -m "✨ Buy a punch card for the account rather than one child"
```

---

### Task 8: The "who is playing" picker

**Files:**
- Create: `src/components/pos/PunchCardCheckIn.tsx`
- Modify: `src/components/pos/CheckIn.tsx:3395-3490` (available passes filter and grouping)

**Interfaces:**
- Consumes: `allocatePunches`, `AllocationCandidate`, `PunchAllocation` from Task 3; `POST /api/sessions/batch` from Task 6.
- Produces: `<PunchCardCheckIn />` with props

```ts
interface PunchCardCheckInProps {
  purchase: { id: string; name: string; totalSessions: number; usedSessions: number };
  children: ChildLike[];
  childrenInsideIds: readonly string[];
  passes: readonly SelectablePass[];
  siblingRules: readonly SiblingRule[];
  qualifiesForMemberPricing: boolean;
  onConfirm: (allocation: PunchAllocation) => Promise<void>;
  onCancel: () => void;
}
```

`CheckIn.tsx` keeps ownership of the network calls; the component is presentational plus allocation.

- [ ] **Step 1: Change how available passes are filtered**

In `CheckIn.tsx` around line 3395, the `availablePasses` filter currently excludes any purchase with an open session:

```ts
                                            !(
                                                displayCustomer.activeSessions || []
                                            ).some(
                                                (session) => session.purchaseId === p.id
                                            )
```

That exists to stop a double check-in, but it would hide an account punch card the moment the first child goes in. Replace it with a per-purchase check that leaves account-scoped cards visible:

```ts
                                            // A pass for one child is hidden while that child is
                                            // inside. An account punch card stays available — the
                                            // second and third child still have to get in — and
                                            // double check-ins are stopped per child in the picker.
                                            (p.passScope === 'account' ||
                                                !(displayCustomer.activeSessions || []).some(
                                                    (session) => session.purchaseId === p.id
                                                ))
```

Add `passScope` to the purchase interface at `CheckIn.tsx:81` and to the row mapping at `:140`:

```ts
    passScope?: 'child' | 'account';
```
```ts
        passScope: row.pass_scope,
```

- [ ] **Step 2: Render an account card as one tile**

In the `groupedPasses` reducer (around line 3438), add a branch before the family-pass branch:

```ts
                                    if (purchase.passScope === 'account') {
                                        // One tile for the card, not one per child — who is playing
                                        // is asked after it is tapped.
                                        const key = `${normalizedType}-account-${purchase.id}`;
                                        acc[key] = {
                                            type: normalizedType,
                                            typeName: getPassTypeName(normalizedType, purchase.name),
                                            childId: null,
                                            childName: null,
                                            totalVisits:
                                                (purchase.totalSessions || 0) - (purchase.usedSessions || 0),
                                            isUnlimited: purchase.totalSessions === 999,
                                            purchases: [purchase],
                                            firstPurchase: purchase,
                                        };
                                        return acc;
                                    }
```

Where the tile renders `group.childName`, show the account line when there is none:

```tsx
{group.childName ? (
    <p className="text-green-600 font-medium text-lg mb-3">👶 {group.childName}</p>
) : group.firstPurchase.passScope === 'account' ? (
    <p className="text-green-600 font-medium text-lg mb-3">
        👨‍👩‍👧‍👦 Any child on the account
    </p>
) : null}
```

- [ ] **Step 3: Build the picker**

Create `src/components/pos/PunchCardCheckIn.tsx`:

```tsx
'use client';

/**
 * Who is playing on this punch card.
 *
 * A punch card belongs to the account, so tapping it asks which children are
 * here rather than assuming one. Two things on this screen carry money and are
 * shown rather than hidden: an under-1 takes the cheaper under-1 day rate
 * instead of a punch unless staff say otherwise, and when the card runs short
 * the remaining children roll into day passes at the price they are quoted.
 */

import { useMemo, useState } from 'react';
import {
  allocatePunches,
  type AllocationCandidate,
  type PunchAllocation,
} from '@/lib/pos/punchAllocation';
import type { ChildLike, SelectablePass, SiblingRule } from '@/lib/pos/passSelection';
import { getAgeGroupFromBirthdate } from '@/lib/utils/ageUtils';

interface PunchCardCheckInProps {
  purchase: { id: string; name: string; totalSessions: number; usedSessions: number };
  children: ChildLike[];
  childrenInsideIds: readonly string[];
  passes: readonly SelectablePass[];
  siblingRules: readonly SiblingRule[];
  qualifiesForMemberPricing: boolean;
  onConfirm: (allocation: PunchAllocation) => Promise<void>;
  onCancel: () => void;
}

const formatCurrency = (value: number): string => `$${value.toFixed(2)}`;

export function PunchCardCheckIn({
  purchase,
  children,
  childrenInsideIds,
  passes,
  siblingRules,
  qualifiesForMemberPricing,
  onConfirm,
  onCancel,
}: PunchCardCheckInProps) {
  const inside = new Set(childrenInsideIds);

  // A child already inside cannot be checked in again, and one without a signed
  // waiver cannot play at all — the same rule the purchase flow enforces.
  const eligible = children.filter((c) => !inside.has(c.id) && c.waiverSigned !== false);

  const [selectedIds, setSelectedIds] = useState<string[]>(() => eligible.map((c) => c.id));
  const [preferPunchIds, setPreferPunchIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const remaining = Math.max(0, purchase.totalSessions - purchase.usedSessions);

  const allocation = useMemo(() => {
    const candidates: AllocationCandidate[] = eligible
      .filter((c) => selectedIds.includes(c.id))
      .map((child) => ({ child, preferPunch: preferPunchIds.includes(child.id) }));
    return allocatePunches(candidates, remaining, passes, siblingRules, qualifiesForMemberPricing);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, preferPunchIds, remaining, passes, siblingRules, qualifiesForMemberPricing]);

  const toggleChild = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const togglePreferPunch = (id: string) =>
    setPreferPunchIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm(allocation);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <h3 className="text-2xl font-bold">Who&apos;s playing?</h3>
      <p className="text-lg text-gray-600">
        {purchase.name} · {remaining} {remaining === 1 ? 'punch' : 'punches'} left
      </p>

      {eligible.length === 0 && (
        <p className="text-lg text-gray-600">
          Everyone on this account is already checked in.
        </p>
      )}

      <div className="space-y-3">
        {eligible.map((child) => {
          const line = allocation.lines.find((l) => l.child.id === child.id);
          const isBaby = getAgeGroupFromBirthdate(child.birthdate) === 'infant';
          return (
            <div key={child.id} className="rounded-xl border-2 border-gray-200 p-4">
              <label className="flex items-center gap-3 text-xl font-medium">
                <input
                  type="checkbox"
                  className="h-6 w-6"
                  checked={selectedIds.includes(child.id)}
                  onChange={() => toggleChild(child.id)}
                />
                {child.name}
                {line && (
                  <span className="ml-auto text-lg text-gray-600">
                    {line.method === 'punch' ? '1 punch' : formatCurrency(line.price)}
                  </span>
                )}
              </label>
              {isBaby && selectedIds.includes(child.id) && (
                <label className="mt-2 flex items-center gap-2 text-base text-gray-600">
                  <input
                    type="checkbox"
                    checked={preferPunchIds.includes(child.id)}
                    onChange={() => togglePreferPunch(child.id)}
                  />
                  Use a punch instead — the under-1 day rate is cheaper
                </label>
              )}
            </div>
          );
        })}
      </div>

      {allocation.unresolved.length > 0 && (
        <p className="text-lg text-red-600">
          No day pass is set up for {allocation.unresolved.map((c) => c.name).join(', ')}.
        </p>
      )}

      <div className="rounded-xl bg-gray-50 p-4 text-lg">
        <p>
          {allocation.punchesSpent} {allocation.punchesSpent === 1 ? 'punch' : 'punches'} ·{' '}
          {remaining} left, {allocation.punchesRemainingAfter} after
        </p>
        {allocation.total > 0 && (
          <p className="font-bold">Day passes {formatCurrency(allocation.total)}</p>
        )}
      </div>

      <div className="flex gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border-2 border-gray-300 p-4 text-xl"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={
            submitting || allocation.lines.length === 0 || allocation.unresolved.length > 0
          }
          className="flex-1 rounded-xl bg-yellow-400 p-4 text-xl font-bold disabled:opacity-50"
        >
          {submitting ? 'Checking in…' : 'Confirm Check-In'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire it up in `CheckIn.tsx`**

Tapping an account card opens the picker instead of calling `handleCheckIn`. Add these imports alongside the existing ones:

```ts
import { PunchCardCheckIn } from '@/components/pos/PunchCardCheckIn';
import type { PunchAllocation } from '@/lib/pos/punchAllocation';
```

Add state and a handler beside `handleCheckIn` (around line 1189):

```ts
    const [punchCardCheckIn, setPunchCardCheckIn] = useState<string | null>(null);

    /**
     * Confirm a punch card check-in.
     *
     * Day passes are bought first: a declined card must never leave children
     * checked in. Then every child goes in on one batch insert, so a family
     * either all gets in or none does.
     */
    const handlePunchCardConfirm = async (
        customer: Customer,
        purchaseId: string,
        allocation: PunchAllocation
    ) => {
        const autoCheckoutTime = getNextClosingTime(
            autoCheckoutSettings.timezone,
            autoCheckoutSettings.closingTime
        );
        const dayPassLines = allocation.lines.filter((l) => l.method === 'day_pass');
        const entries: { purchase_id: string; child_id: string }[] = allocation.lines
            .filter((l) => l.method === 'punch')
            .map((l) => ({ purchase_id: purchaseId, child_id: l.child.id }));

        try {
            if (dayPassLines.length > 0) {
                const pass = dayPassLines[0].pass;
                if (!pass) throw new Error('No day pass resolved for the shortfall');
                const response = await fetch('/api/purchases/pos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        customer_id: customer.id,
                        product_id: pass.id,
                        product_name: pass.name,
                        product_price: allocation.total,
                        product_description: '',
                        purchase_type: 'day_pass',
                        child_id: dayPassLines[0].child.id,
                        children_ids: dayPassLines.map((l) => l.child.id),
                        split_per_child: true,
                        child_prices: dayPassLines.map((l) => l.price),
                        quantity: 1,
                        metadata: {},
                    }),
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Purchase failed');
                }
                const { purchases: created } = await response.json();
                for (const line of dayPassLines) {
                    const match = (created as { id: string; child_id: string }[]).find(
                        (p) => p.child_id === line.child.id
                    );
                    if (!match) throw new Error(`No purchase returned for ${line.child.name}`);
                    entries.push({ purchase_id: match.id, child_id: line.child.id });
                }
            }

            const response = await fetch('/api/sessions/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customer_id: customer.id,
                    auto_checkout_time: autoCheckoutTime,
                    entries,
                }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Check-in failed');
            }

            setPunchCardCheckIn(null);
            await refreshCustomer(customer.id);
        } catch (error) {
            console.error('Punch card check-in failed:', error);
            alert(error instanceof Error ? error.message : 'Check-in failed');
        }
    };
```

The response shape of `/api/purchases/pos` is assumed above to be
`{ purchases: [{ id, child_id }] }`. Confirm it and adjust if not:

```bash
grep -n "NextResponse.json" src/app/api/purchases/pos/route.ts
grep -n "refreshCustomer\|onUpdateCustomer\|reloadCustomer" src/components/pos/CheckIn.tsx | head
```

The second command finds how this component already reloads a customer after a
purchase — use that in place of `refreshCustomer`, which is a stand-in name.

Then render the picker when `punchCardCheckIn` is set, and make an account card's Check In button call `setPunchCardCheckIn(purchase.id)` rather than `handleCheckInClick(purchase.id)`.

- [ ] **Step 5: Typecheck and lint**

```bash
npx tsc --noEmit
pnpm lint
```

- [ ] **Step 6: Verify at the POS**

```bash
pnpm dev
```

With a test account holding three children and a fresh 10-punch card:

1. Tap the card. All three are pre-ticked; the under-1 shows the day rate, not a punch.
2. Confirm. The card reads 8 left (two punches, baby on a day pass) and all three appear as active sessions with their own names.
3. Check one child out. The count does not move — the punch was spent at check-in.
4. Undo another child's check-in. The count goes back up by one.
5. Take the card down to 2 punches, then tick three children: two take punches, the third is quoted a day pass, and the total matches what the picker showed.

- [ ] **Step 7: Commit**

```bash
git add src/components/pos/PunchCardCheckIn.tsx src/components/pos/CheckIn.tsx
git commit -m "✨ Check any child on the account in against one punch card"
```

---

### Task 9: The surfaces that read a card's child

**Files:**
- Modify: `src/lib/services/sessions.ts` (`getAllActiveSessions`)
- Modify: `src/app/api/admin/punch-cards/route.ts`
- Modify: `src/components/pos/CustomerDashboard.tsx`
- Modify: `src/components/customer/WebMyAccount.tsx`

**Interfaces:**
- Consumes: `sessions.child_id`, `purchases.pass_scope`.
- Produces: no new exports. An account card shows "Any child on the account" instead of a child's name, and the floor list names the child from the session.

- [ ] **Step 1: Name the child from the session in the floor list**

In `getAllActiveSessions`, the select joins `customer` and `purchase`. Add the child:

```ts
      .select(`
        *,
        customer:users!sessions_customer_id_fkey (id, name, phone),
        purchase:purchases (id, name, type),
        child:children (id, name)
      `)
```

Then find every consumer that derived a child name through the purchase and switch it to `session.child`:

```bash
grep -rn "getAllActiveSessions" src/ | grep -v node_modules
```

- [ ] **Step 2: Show account cards correctly in the admin list**

In `src/app/api/admin/punch-cards/route.ts:19`, add `pass_scope` to the select:

```ts
      .select('id, customer_id, child_id, pass_scope, name, price, purchase_date, expiry_date, first_use_date, actual_expiry_date, status, used_sessions, total_sessions')
```

Where the response builds a child name (around line 82), an account card has no child. Return the scope so the UI can say so:

```ts
        passScope: p.pass_scope,
        childName: p.pass_scope === 'account' ? null : childName,
```

Read the surrounding code and match the existing field names — do not rename anything already in the payload.

- [ ] **Step 3: Stop listing an account card under one child**

In `CustomerDashboard.tsx:908` and `WebMyAccount.tsx:173`, add `passScope: p.pass_scope` to the purchase mapping. Then find the render sites:

```bash
grep -n "usedSessions\|childId\|getChildName" src/components/pos/CustomerDashboard.tsx src/components/customer/WebMyAccount.tsx
```

At each site where a pass shows the child it belongs to, an account card has no
child to show. Replace the child name with the account line:

```tsx
{purchase.passScope === 'account' ? (
    <span className="text-gray-600">👨‍👩‍👧‍👦 Any child on the account</span>
) : purchase.childId ? (
    <span className="text-gray-600">👶 {getChildName(purchase.childId)}</span>
) : null}
```

Match the surrounding class names and the component's own way of resolving a
child's name — the point is the branch, not this markup. If either component
groups passes by child before rendering, an account card must sit outside those
groups rather than being repeated inside each one.

- [ ] **Step 4: Confirm the reports need nothing**

`used_sessions` keeps its meaning, so these should be unaffected. Verify rather than assume:

```bash
sed -n '30,120p' src/app/api/admin/reports/passes/route.ts
grep -n "punch\|child_id" src/app/api/admin/top-customers/route.ts
```

If either groups punch cards by child, note it and fix it the same way as Step 2. If not, change nothing.

- [ ] **Step 5: Typecheck, lint, test**

```bash
npx tsc --noEmit
pnpm lint
pnpm test
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/services/sessions.ts src/app/api/admin/punch-cards/route.ts src/components/pos/CustomerDashboard.tsx src/components/customer/WebMyAccount.tsx
git commit -m "🐛 Account punch cards stop showing under one child's name"
```

---

### Task 10: Full verification before launch night

**Files:** none — this task changes nothing.

- [ ] **Step 1: The whole suite**

```bash
pnpm test
npx tsc --noEmit
pnpm lint
npx tsx scripts/verify-pricing.ts
pnpm build
```

Expected: all clean. `verify-pricing.ts` exits non-zero if any surface disagrees with the `passes` table.

- [ ] **Step 2: Confirm nothing sold before launch converted**

On the branch database, after the migration:

```sql
SELECT pass_scope, COUNT(*) FROM public.purchases GROUP BY pass_scope;
```

Expected: every pre-existing row is `'child'`. Any `'account'` row that is not a punch card bought through the new flow is a bug.

```sql
SELECT id, name, child_id, pass_scope
FROM public.purchases
WHERE name ILIKE '%punch%' AND pass_scope = 'account' AND child_id IS NOT NULL;
```

Expected: no rows. An account card must not also name a child.

- [ ] **Step 3: Check the punch accounting balances**

```sql
SELECT p.id, p.name, p.total_sessions, p.used_sessions,
       (SELECT COUNT(*) FROM public.sessions s WHERE s.purchase_id = p.id) AS session_rows
FROM public.purchases p
WHERE p.name ILIKE '%punch%'
ORDER BY p.created_at DESC
LIMIT 20;
```

Expected: `used_sessions` equals `session_rows` for every card touched after the migration. A mismatch means either the backfill double-counted or a trigger is firing twice.

- [ ] **Step 4: Update the launch-night runbook**

Add to the pricing runbook that step 1 (database) now also includes applying `052_punch_cards_account_scope.sql`, and that it must be applied **before** the step 3 deploy — the code writes `pass_scope` and the column has to exist.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "✍️ Note the punch card migration in the launch-night runbook"
```

---

## Notes for the executor

- **Do not deploy this before the night of 1 October 2026.** The moment the Task 7 code is live, punch cards start being sold account-wide. If it ships early, cards are sold at the tiered infant rate ($5 a visit) but spendable by a four-year-old.
- **Order on the night:** apply migration 052 first, then the pricing rows, then deploy. The column must exist before code writes to it.
- **The riskiest change is the trigger swap**, because it affects day passes and memberships too, not just punch cards. A day pass now flips to `'used'` at check-in rather than check-out, which is what makes it disappear from the available list while the child is inside. Watch for anything that assumed a day pass stays `'active'` during a visit.
