# Account-Wide Punch Cards

**Date:** 3 September 2026
**Status:** Design approved, not yet implemented
**Ships with:** the 1 October 2026 pricing launch (step 3 of the runbook)

## Problem

A punch card is bought for one named child. A parent with three children who
buys a 10-punch card can only spend those punches on the one child recorded on
the purchase; the other two children need their own cards. That is not how
families read the product, and it is not how it is sold at the desk.

A punch card should belong to the **account**. Any child on the account may
spend a punch, and children added later are covered without anything being
re-issued.

## What exists today

- A punch card is one `purchases` row: `child_id` set to a single child,
  `total_sessions = 10`, `type = 'weekly_pass'`.
- `sessions` has no `child_id`. Which child played is inferred entirely from
  `purchases.child_id`.
- A punch is deducted by the `update_purchase_session_count()` trigger when a
  session **ends** (AFTER UPDATE on `sessions`).
- The check-in screen hides any purchase that already has an open session, so
  only one child can be checked in against a card at a time.
- Punch cards are age-tiered: Infant $50/10 ($5 a visit), Toddler $150/10
  ($15 a visit).
- `purchase_children` already exists as a junction table, used by the family
  pass.

## Decisions

### Ships with the 1 October flattening

On 1 October punch cards become a single flat card — **10 for $170, 5 for $90**,
no age tiers, no sibling discount. Shipping account-wide cards on that night
means there is no age arbitrage to guard against: today an account-wide infant
card would let a four-year-old play at $5 a visit instead of $15.

After 1 October the rule is simply **a punch is a punch**.

### Cards sold before 1 October stay locked to their child

Punch cards run 90 days, so tiered cards sold in September still have punches
into late December. Those keep working exactly as they do now — one named
child. Only cards sold from 1 October onward are account-wide. No conversions,
no refunds, and the old cards age out on their own.

### Check-in is card-first

Staff tap the punch card, then tick which children are playing, and confirm
once. One punch per child.

### A short card sells a day pass for the remainder

If two punches are left and three children are playing, the last two punches are
spent and the third child rolls into a normal day pass inside the same flow,
priced before confirming. Nobody is turned away and staff do no arithmetic.

### Under-1s default to the $10 rate

A punch is worth $17 under the new rates; a baby under 1 pays $10 on a day pass.
Spending a punch on a baby costs the family $7. The baby's row therefore
defaults to the $10 day rate with a note, and staff can override to spend a
punch if the parent asks.

### The punch is spent at check-in, not check-out

With three children inside on one card, deducting on check-out would leave the
card reading "7 left" while three punches are already committed, and every
surface that reports remaining punches would have to subtract open sessions.
Deducting at check-in keeps `total_sessions - used_sessions` correct everywhere
with no change to any reporting surface.

## Architecture

### Scope lives in an explicit column

`purchases.pass_scope`: `TEXT NOT NULL DEFAULT 'child'`,
`CHECK (pass_scope IN ('child','account'))`.

Two alternatives were rejected:

- **`child_id IS NULL` means account-wide.** `purchases.child_id` is
  `ON DELETE SET NULL`, so deleting a child would silently convert all of their
  old locked cards to account-wide and hand the family free punches. NULL also
  cannot be told apart from "no child was ever recorded", which is what party
  packages and gift cards look like.
- **Enrol every child via `purchase_children`.** It snapshots the children who
  existed at purchase time, so a baby born in November would not be covered by
  an October card — the opposite of the intent.

### Sessions record the child

`sessions.child_id`: `UUID REFERENCES children(id) ON DELETE SET NULL`,
backfilled from `purchases.child_id`, indexed.

Without it, three concurrent sessions on one purchase are indistinguishable and
"who is in the building?" becomes unanswerable.

### The switch flips on deploy, with no date-gating

Because `pass_scope` defaults to `'child'`, cards behave exactly as they do now
until the code that writes `'account'` is live. This ships in the same deploy as
`PACKAGE_PRICING` and `TODDLER_AGE_THRESHOLD` on launch night. Nothing sold
before that deploy converts, and no date-gating is added anywhere — consistent
with how the rest of the pricing change is handled.

## Migration

`supabase/migrations/052_punch_cards_account_scope.sql`, run by hand through the
Dashboard SQL Editor.

1. Add `purchases.pass_scope` with its default and check constraint. Existing
   rows take `'child'`.
2. Add `sessions.child_id`, backfill from `purchases.child_id`, add an index.
3. **Count every currently-open session once.** Open sessions have not yet been
   counted, because today they count on check-out. Swapping the triggers without
   this backfill would leave them uncounted forever. Increment `used_sessions`
   for each open session, and set `status = 'used'` where the increment reaches
   `total_sessions`.
4. Drop the `update_purchase_sessions` AFTER UPDATE trigger.
5. Add an AFTER INSERT trigger on `sessions` that increments `used_sessions` and
   moves `status` to `'used'` when the card runs out. It sits alongside the
   existing `set_first_use_date` insert trigger.
6. Add an AFTER DELETE trigger for the void path: decrement `used_sessions`,
   revert `status` from `'used'` to `'active'`, and when `used_sessions` returns
   to 0 clear `first_use_date` and `actual_expiry_date`.

Steps 3 to 6 must run in a single transaction. Between dropping the old trigger
and adding the new ones there is a window in which a check-in or check-out would
go uncounted.

## Buying

The punch branch of the child-first POS flow becomes card-first. Choosing
"Punch Card" skips child selection and offers the two cards (10 for $170, 5 for
$90). The purchase is a single row with `pass_scope: 'account'` and
`child_id: null`.

In `src/lib/pos/passSelection.ts`:

- `quotePasses` stops fanning punch cards out per child. Today it emits one line
  per selected child at full price, so a family of three is sold three cards.
- `resolvePassOptions` stops age-band filtering punch products. After 1 October
  there is one card, so the band match is dead weight that would misfire if a
  tiered card were ever re-added.
- `SIBLING_PRICED_KINDS` already excludes punch. No discount logic changes.

`/api/purchases/pos` accepts and validates `pass_scope`, defaulting to `'child'`.

## Checking in

An account card renders as one tile — "7x Punch Card · Any child on the
account" — instead of one per child. Tapping it opens the child picker.

**Picker rules**

- Children with an open session are excluded. This replaces the current "hide
  any pass with an open session" filter, which exists to stop double check-ins
  but would now block the second and third child on the same card. With
  `sessions.child_id` the check becomes per child, which is what it always meant.
- Children without a signed waiver cannot be ticked, matching the rule
  `handleBuyPasses` already enforces at purchase.
- Every eligible child is pre-ticked; the usual case is the whole family. The
  guard against an over-punch is the confirm line — "3 punches · 7 left, 4
  after" — together with the void path.
- Under-1s default to the under-1 day pass with a toggle to spend a punch
  instead. The price is resolved with `resolvePassForChild(child, 'day', passes)`
  like any other day pass, never hardcoded — $10 is what that resolves to after
  1 October, and the picker must keep agreeing with the catalogue if it moves.
- On a shortfall, punches go to the full-rate children in display order and the
  remainder become day passes. The split is itemised before confirming.

**Pricing the shortfall**

Shortfall day passes are priced by `quotePasses` unchanged, so check-in never
grows a second opinion about day pass pricing — whatever the sibling ladder does
on 1 October, it does here identically.

Children paying with a punch **do** occupy sibling positions in that quote, as
position-holders that raise no charge. One family on one visit is one sibling
ladder. The alternative — pricing the day-pass children among themselves —
charges a family more precisely because they part-paid with a punch they had
already bought, which is hard to defend at the desk.

This is a pricing decision, not a technical one, and it is worth confirming
before implementation.

**Confirm order**

1. Buy any day passes, via the existing `/api/purchases/pos` with
   `split_per_child` and `child_prices`.
2. Open the sessions.

Buying first means a declined card never leaves children checked in.

**New endpoint**

`POST /api/sessions/batch` taking
`{customer_id, entries: [{purchase_id, child_id}], auto_checkout_time}`,
inserting in a single transaction. Three separate POSTs could half-succeed and
leave punches spent with children not checked in.

**New code placement**

Allocation lives in a new `src/lib/pos/punchAllocation.ts` as a pure function,
and the picker is its own component. `CheckIn.tsx` is already 6,202 lines; this
work does not add to it. No wider refactor of that file is proposed here.

## Voiding a check-in

There is no undo today: `PUT /api/sessions/[id]` only checks out, and check-out
is what spends the punch. With three punches going at once, a mis-tap costs
three times as much.

`DELETE /api/sessions/[id]`, open sessions only, removes the session and lets
the AFTER DELETE trigger reverse the punch. Surfaced as "Undo check-in" on the
active-session row at the POS.

## Surfaces that follow

Reading the child from `sessions` rather than `purchases` means:

- `get_active_sessions()` (migration 003) `LEFT JOIN`s children on
  `p.child_id`; switch to the session's child.
- `getAllActiveSessions()` in `src/lib/services/sessions.ts` — add the children
  join so the floor list names the right child.
- `/api/admin/punch-cards` — shows a child name per card; account cards show the
  account holder and the child count.
- `CustomerDashboard.tsx` and `WebMyAccount.tsx` — a punch card stops being
  listed under one child.
- `/api/admin/reports/passes` and `/api/admin/top-customers` — `used_sessions`
  keeps its meaning, so no change is expected. Verify rather than assume.

## Testing

Test-first, with the logic in pure functions so it is testable without the POS.

**`punchAllocation`**

- three children against seven punches
- three children against two punches, third becomes a day pass
- a baby under 1 defaults to the $10 rate
- a baby overridden to spend a punch
- a card at zero punches
- a child already checked in is excluded

**`passSelection`**

- a punch quote returns one card line regardless of how many children are
  selected (today it returns three)
- punch products are no longer age-band filtered

**Migration**

- the open-session backfill counts each open session exactly once
- no double counting after the trigger swap
- run against a Supabase branch first, since migrations are applied by hand

**Regression**

- `npx tsx scripts/verify-pricing.ts` exits clean

## Out of scope

- Monthly passes keep their current scope. The family pass already covers
  multiple children through `purchase_children`.
- Converting or refunding tiered punch cards sold before 1 October.
- Any wider refactor of `CheckIn.tsx`.
