# Launch-night runbook — 1 October 2026 pricing restructure

BusyBees is restructuring pricing live the night of 1 October 2026. Nothing in
this change is date-gated in code (unlike Summer Hours in `businessHours.ts`,
which flips itself) — every step below is a manual action taken on the night,
in order.

Account-wide punch cards (`docs/superpowers/plans/2026-09-03-account-wide-punch-cards.md`,
`docs/superpowers/specs/2026-09-03-account-wide-punch-cards-design.md`) ride
along on this same deploy and add a migration in front of the existing
three-step sequence.

---

## ⚠️ ORDER OF OPERATIONS — THIS IS A PAYMENT-SAFETY GATE, NOT A FEATURE GATE

> **Apply `supabase/migrations/052_punch_cards_account_scope.sql` BEFORE
> deploying the application code. No exceptions, no reordering "just this
> once."**

This used to be a feature-correctness concern (ship the code early and
account-wide punch cards go on sale before the flat-rate pricing lands, so a
four-year-old could spend an infant-tier $5 punch). **It no longer is only
that.** The application code on this branch writes `pass_scope` from two
payment-handling routes, not just the POS:

- `POST /api/stripe/direct-payment`
- `POST /api/stripe/webhook`

If the code is deployed while the `pass_scope` column does not yet exist:

- **PostgREST rejects the insert.**
- In `direct-payment`, that lands on the `throw dbError` branch, whose own log
  line reads **`"CRITICAL: Stripe charged but DB insert failed"`** — the
  customer's card is charged and no purchase row is ever written. There is no
  record to refund against without going to the Stripe dashboard directly.
- In the webhook handler, the same failure becomes a thrown exception. Stripe
  retries the webhook delivery — repeatedly — against a database that will
  keep rejecting the same insert every time.

**Deploying the code first does not degrade gracefully. It takes money without
recording it.** The correct order has no such failure mode: sessions written
by the old (pre-deploy) app simply carry a `NULL child_id` until the code
lands, which is cosmetic — `get_active_sessions` shows a null child name for
that window and nothing else.

**The order, restated as a checklist:**

1. Apply `052_punch_cards_account_scope.sql` (see verification below — this
   has never been run anywhere).
2. Apply the rest of the database changes (Step 1 below).
3. Deploy the application code (Step 2 below).
4. Run `npx tsx scripts/verify-pricing.ts` and confirm it exits 0.

---

## What has NOT been verified anywhere (read this before trusting anything above)

State this plainly to whoever runs the night, because every other section of
this runbook rests on it:

- **No part of the account-wide-punch-cards branch has ever been run against
  a database.** Not once, at any point in its development.
- **No part of it has been exercised through the UI** — the POS check-in flow,
  the card-first / multi-child confirm, the short-card-sells-a-day-pass path,
  none of it has been clicked through.
- **Migration `052_punch_cards_account_scope.sql` has never been executed**,
  against any database, ever. Two reviewers read it carefully and found seven
  real defects, all of which were fixed — but reading is not running, and
  nobody has watched this migration touch real rows.
- Everything else in this document rests on code review and on unit tests over
  pure functions (allocation math, pass-scope classification). It does not
  rest on integration or database tests, because none exist yet.

This is why the section below exists: to make the first real execution of
migration 052 happen deliberately, against a disposable snapshot, before it
happens for real against production.

---

## Step 0 (new): Migration 052 — verify against a restored snapshot first

Do this **before** touching production. Restore a database snapshot to a
scratch/branch environment, apply the migration there, and run all four tests
below. If any of them fail, **stop — do not apply 052 to production** and go
fix the migration first.

### Pre-flight, before applying anything

```sql
-- If non-zero, the COALESCE guards baked into 052 are load-bearing, not defensive.
SELECT count(*) FROM public.purchases WHERE used_sessions IS NULL;
```

### a. Re-paste test — the only real proof the idempotency guard works

Restore a snapshot that has several open sessions.

```sql
SELECT purchase_id, count(*) FROM public.sessions WHERE end_time IS NULL GROUP BY purchase_id;
SELECT id, used_sessions, total_sessions, status FROM public.purchases
WHERE id IN (SELECT purchase_id FROM public.sessions WHERE end_time IS NULL);
```

Run the migration. Record the same query again. **Then run the whole
migration file a second time.** Assert `used_sessions` is identical after the
second run. A difference means the guard against re-running the file is not
doing its job.

### b. Cascade test — the one thing verified by reasoning, not observation

Deleting a purchase cascades to its sessions and fires
`restore_session_on_void` against the row being deleted. The migration is
written to make this safe, but the underlying Postgres snapshot behaviour has
never actually been observed.

```sql
-- pick a card with one open session and one closed session
DELETE FROM public.purchases WHERE id = '<that purchase>';
```

Assert it completes without error. If it instead raises `tuple to be updated
was already modified by an operation triggered by the current command`,
**every purchase deletion in production would start failing the moment 052
lands** — stop and fix before going any further.

### c. Overshoot void

Build an 11-of-10 `'used'` card, delete its open session. Assert `status` is
still `'used'` and `used_sessions` is `10` — it must not reactivate.

### d. Ended-session delete

Delete a session that has already ended. Assert `used_sessions`, `status`,
`first_use_date` and `actual_expiry_date` are all unchanged.

### After COMMIT, confirm it actually took

```sql
SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.sessions'::regclass;
-- expect: consume_session_on_checkin, restore_session_on_void, set_purchase_first_use
-- must NOT be present: update_purchase_sessions
```

Expect a benign `WARNING: there is already a transaction in progress` from the
explicit `BEGIN` in the Supabase SQL editor — that is not a failure.

### Confirm nothing pre-existing silently converted

```sql
SELECT pass_scope, COUNT(*) FROM public.purchases GROUP BY pass_scope;
-- every pre-existing row must be 'child'
```

```sql
SELECT id, name, child_id, pass_scope
FROM public.purchases
WHERE name ILIKE '%punch%' AND pass_scope = 'account' AND child_id IS NOT NULL;
-- expect zero rows: an account-wide card must not also name a child
```

### Riskiest part of the migration, for the night's on-call

The trigger swap affects **day passes and memberships too, not just punch
cards** — a day pass now flips to `'used'` at check-in rather than check-out,
which is what makes it disappear from the available list while the child is
inside. Watch for anything downstream that assumed a day pass stays `'active'`
for the duration of a visit.

### After 052 lands on production: regenerate the types

`src/lib/supabase/database.types.ts` was **hand-edited** during development
(migration 052 could not be applied to a live database beforehand, so the
`pass_scope` and `sessions.child_id` columns were typed by hand). Once 052 is
live, regenerate this file from the real schema and replace those hand edits.

### Naming constraint on the new flat punch products

Pass scope is derived from the product name and category via `getPassKind`,
which checks **monthly before punch**. When the new flat punch cards
(10-for-$170, 5-for-$90) are created in the `passes` table / Stripe:

- the name **must** contain "punch"
- the name must **not** contain "monthly" or "membership"

Getting this wrong silently classifies the product as `'child'`-scoped and the
whole account-wide feature quietly stops working for any card sold after the
mis-named product goes live. The failure direction is safe — a card that
should be account-wide is merely child-locked, no money moves to the wrong
place — but it is invisible unless someone is looking for it.

---

## Step 1: Database (existing pricing changes, unchanged by this branch)

1. `passes` table rows (+ Stripe product sync):
   - Day pass **$20** per child, **$10** each additional sibling, **$10** for
     babies under 1
   - Punch cards: **10 for $170**, **5 for $90** — one card, no age tiers, no
     sibling discount (see naming constraint above)
   - Monthly: **$65** one child / **$105** two / **$135** family
2. `sibling_discounts` — currently 10/20/30/40%, members-only. Must become
   **50% for everyone** (`applies_to_monthly_only = false`).
3. **`party_packages` table** — separate from the `PACKAGE_PRICING` code
   constant, read by My Account. Easy to miss; skipping it means My Account
   shows old prices while checkout charges new ones.
   - Basic Bee **$500** (10 kids) / Worker Bee+ **$550** (15) / Queen Bee+
     **$600** (20) — even $50 steps.
   - Additional party child **stays $15** (not $20 — this was deliberately
     reverted).
   - Group rate flat **$15** per child, all ages.
   - Semi-private parties retire entirely.
   - Party packages no longer include food, cake, soda or balloons; cleanup
     stays included in all three tiers.

## Step 2: Deploy

Carries `PACKAGE_PRICING` in `src/lib/validations/party-booking.ts`,
`TODDLER_AGE_THRESHOLD` in `src/lib/utils/ageUtils.ts` (**2 → 1**), and — new
on this branch — the account-wide punch card code that writes `pass_scope`
from the POS route, `/api/stripe/direct-payment`, and `/api/stripe/webhook`.

Order matters slightly within this step too: between changing pass prices and
deploying, day passes would price at $20 while a one-year-old still counts as
an infant under the old threshold. Deploy the code and land the price change
together, or deploy first.

## Step 3: Verify

```bash
npx tsx scripts/verify-pricing.ts
```

Prints every price store and what each customer-facing surface renders,
checks the party ladder still holds, compares `party_packages` against
`PACKAGE_PRICING`, and exits non-zero on any disagreement. All customer-facing
surfaces read from one source (`src/lib/pricing/catalog.ts`), so no marketing
copy needs touching separately — but this script is still the only thing that
proves it.

---

## Reference

- Plan: `docs/superpowers/plans/2026-09-03-account-wide-punch-cards.md`
- Design spec: `docs/superpowers/specs/2026-09-03-account-wide-punch-cards-design.md`
- Migration: `supabase/migrations/052_punch_cards_account_scope.sql`
