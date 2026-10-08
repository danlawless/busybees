# Guest Passes Runbook

## Pre-Deployment Testing

**CRITICAL:** Apply migration 057 to a restored copy of the production database first, then to production, **before** deploying the branch. The code calls functions that do not exist until the migration is applied.

### Legacy in-place subscriptions

Count the memberships that renew in place (the Stripe webhook moves `purchase_date` forward on the same row instead of inserting a new one):

```sql
SELECT count(*) FROM purchases WHERE type='monthly_pass' AND status='active' AND stripe_subscription_id IS NOT NULL;
```

Any number is fine: guest passes count only guest rows dated on or after the membership row's `purchase_date` (in both `issue_guest_pass` and the status endpoint), so these members' allowance resets on renewal too. T12 checks it.

## Behaviour test script (run this)

`docs/GUEST_PASSES_BEHAVIOUR_TESTS.sql` runs T1–T9 and T12 (plus T5b, T13, T14)
in one go. Paste the whole file into the Supabase SQL Editor and run it.

It is **safe on production**: it creates its own throwaway families (phones
starting `000`, `@example.invalid` emails) inside one `DO` block that ends by
raising an error on purpose, which rolls back everything it did. The error
message is the report and should read `GUEST PASS TESTS: 13/13 passed.` Any
other error also means nothing was saved. Best run after closing: the tests
briefly lock the rows they create.

Results: **7 Oct 2026, production, 13/13 passed.**

Not covered by the script: T10 (needs two simultaneous sessions) and T11 (the
child match through an empty account lives in the API, so test it at the POS;
guest passes cannot be issued before 1 Nov).

## Rollback

057 only adds things. Before any guest pass has been issued, this removes it
completely (revert the code first if it is deployed):

```sql
BEGIN;
DROP FUNCTION IF EXISTS public.issue_guest_pass(UUID, UUID, UUID, TIMESTAMPTZ, INT);
DROP FUNCTION IF EXISTS public.void_guest_pass(UUID);
DELETE FROM public.passes WHERE name = 'Guest Pass' AND price = 0 AND is_active = false;
DROP INDEX IF EXISTS public.idx_purchases_guest_of;
ALTER TABLE public.purchases DROP COLUMN IF EXISTS guest_of_purchase_id;
COMMIT;
```

Do not restore a backup to undo 057: a restore also loses every purchase and
check-in made since the backup.

## Manual SQL Tests

Reference for the script above, and for running a test by hand. Run each test inside `BEGIN; … ROLLBACK;` against the restored copy. Substitute real IDs for M (member), G (guest), and C (child).

| # | Setup | Call | Expect |
|---|---|---|---|
| T1 | Member M with active monthly row; new user G (role customer, no purchases) with child C | `issue_guest_pass(M, G, C, now()+'4h', 2)` | `ok:true, remaining:1`; G has one purchase `price 0, status 'used', guest_of_purchase_id = M's membership`; one open session |
| T2 | T1 twice more with two more fresh guests | Third call | `reason:'none_left'` |
| T3 | M's membership `status='expired'` | issue | `reason:'no_membership'` |
| T4 | G has one `refunded` purchase | issue | `reason:'not_new'` |
| T5 | `p_guest_customer_id = M` | issue | `reason:'same_account'` |
| T6 | After T1, set the session's `end_time = now()` | `void_guest_pass(purchase)` | `reason:'visit_ended'`, purchase still there |
| T7 | After T1, session open | `void_guest_pass(purchase)` | `ok:true`; purchase and session gone; M's count back to 0 |
| T8 | Renewal: insert a newer active monthly row for M | issue | Counts against the new row: `remaining:1` |
| T9 | As `anon` role: `SET ROLE anon; SELECT issue_guest_pass(...)` | — | Permission denied |
| T10 | Member M with one pass left (one guest row this period); two fresh guests G1/C1 and G2/C2. Two psql sessions A and B, `BEGIN;` in both | A: `issue_guest_pass(M, G1, C1, …)`; then B: `issue_guest_pass(M, G2, C2, …)` | B blocks on the membership row lock. `COMMIT;` in A → B returns `reason:'none_left'`. `ROLLBACK;` both |
| T11 | Walk-through (API, not SQL): paying account P has child "Mia 2022-03-04"; friend's empty account E (own phone, no purchases) also has Mia | At the POS, look up E's phone, then pick Mia and issue | `/check` answers "Already a Busy Bees customer — not eligible."; a direct `POST /api/guest-passes` with E's phone and Mia's `child_id` returns 409 with the same message; no purchase written |
| T12 | After T1 (M has used 1). In-place renewal: `UPDATE purchases SET purchase_date = clock_timestamp() WHERE id = <M's membership>` (not `now()`: inside one transaction `now()` is the same instant T1's guest row was stamped with, so it would still count) | issue for a fresh guest; and `GET /api/guest-passes?customer_id=M` | `remaining:1` (count reset to 2 before this issue); status shows `used:0` before the issue |

## Deployment Checklist

- [x] Run the legacy in-place subscription count (above) and note it — 0 (7 Oct 2026)
- [x] Apply migration 057 to production database (7 Oct 2026, verified)
- [x] Run `GUEST_PASSES_BEHAVIOUR_TESTS.sql` — 13/13 passed on production (7 Oct 2026)
- [ ] Deploy the branch with API routes calling `issue_guest_pass` and `void_guest_pass`
- [ ] Monitor Sentry for function not found errors during rollout
- [ ] 1 Nov, before opening: try T11 at the POS with a test family (expect "not eligible")
