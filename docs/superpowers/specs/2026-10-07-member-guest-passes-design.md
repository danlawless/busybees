# Member Guest Passes — Design

**Date:** 7 October 2026
**Status:** Draft for review
**Deadline:** live by 1 November 2026 — the 18 September newsletter promised
members "from November, two guest passes every month".

## Purpose

Monthly members can bring a friend's child in free. The perk exists to bring
**new families** through the door, so it only works for people who have never
bought anything from Busy Bees.

## Rules

1. **Two guest passes per membership period.** The allowance belongs to the
   member's current active monthly membership purchase. Renewal (auto or manual)
   inserts a new purchase row, so the allowance returns to 2 by itself. No
   active membership, no guest passes.
2. **Unused passes do not carry over.** Auto-renew runs 7 days before expiry
   and retires the old row then, so an unused pass from the old period ends at
   renewal, not at expiry.
3. **One pass = one child, any age** (infants included).
4. **The member's family visits too.** The guest comes with the member.
   Enforced by staff at the counter, not by code.
5. **Guests must be net-new.** A friend is eligible when either
   - no account matches them, or
   - a matching account exists but has **no purchases at all** (any type, any
     status — refunded and $0 rows count).

   A match is any one of: phone number, email address, or a child with the same
   name and date of birth. Once a guest pass is used, the guest pass itself
   becomes a purchase on the friend's account, so **a family can only be a guest
   once, ever**.
6. **Starts 1 November 2026** (Eastern) for every membership active on that
   date, wherever it sits in its period.

## Counter flow (POS)

The front desk looks up the member by phone, which signs the POS in **as the
member**.

1. The member's screen shows **"Bring a friend — N left this membership"**. The
   button is hidden when the member has no active membership, or before
   1 November.
2. Staff enter the friend's phone number. The server checks eligibility:
   - **Has purchases** → "Already a Busy Bees customer — not eligible."
   - **Account with no purchases** → shows that account's children to pick
     from, or add a child.
   - **No account** → short form: parent name, phone, email, child name and
     date of birth. Email is required, same as POS signup today.
3. Staff confirm. The server, in one request:
   - creates the friend's account and child if needed,
   - inserts a **$0 "Guest Pass"** purchase on the **friend's** account, linked
     to the member's membership purchase,
   - checks the friend's child in.
4. The member's screen shows the new count. The POS stays signed in as the member.

## Data

Migration (applied by hand in the Supabase SQL Editor, as usual):

- `purchases.guest_of_purchase_id UUID NULL REFERENCES purchases(id)` — the
  membership purchase that sponsored this guest pass. Indexed. Null on every
  other purchase.
- A `passes` row **"Guest Pass"**, price $0, type `day_pass`, inactive for sale
  (never shown in shops or price lists). `verify-pricing.ts` and the /info FAQ
  must ignore it.

"Passes used" = count of purchases where `guest_of_purchase_id` = the member's
current membership purchase. Undoing a guest check-in (only while the visit is
still open) deletes the $0 purchase and its session, which returns the pass and
leaves the friend with no purchases, still eligible.

## Server

One new route, `POST /api/guest-passes`, plus `GET /api/guest-passes?customer_id=`
for the remaining count and an eligibility check by phone.

The member and the friend are different accounts, and the POS is signed in as
the member. Existing routes (`requireAccountAccess`) correctly refuse to
write to another account, so the guest route does its own authorization and
writes with the admin client:

- Caller must be staff, **or** the signed-in member on the store's approved POS
  device (the `bb_pos_device` cookie set when the POS PIN is entered). A member
  on their phone at home cannot issue guest passes.
- The sponsoring membership is looked up on the server from the caller's
  account. The request never names it, never names a price, and never names an
  existing friend account id — only phone/email/child details, matched on the
  server.
- Eligibility and the remaining count are rechecked inside the request, and the
  insert is guarded against two simultaneous requests spending the third pass
  (a transaction / Postgres function that counts and inserts together).
- Rate-limited, since it reveals whether a phone number belongs to a customer.

Account creation reuses the POS signup logic (Supabase auth user + `users` row
+ welcome email), pulled out of `/api/auth/pos-signup` into a shared function
so the two cannot drift.

## Other surfaces

- **My Account:** "You have N guest passes left this membership — bring a friend
  who's new to Busy Bees."
- **Admin report:** guest passes used per month, and how many guest families
  later bought something (the measure of whether the perk is worth keeping).
- **Admin customer page:** a guest-pass purchase shows who sponsored it.

## Out of scope

- Weekend or capacity limits on guest passes.
- Members issuing passes online / sending a voucher to a friend ahead of time.
- Guest passes for punch-card holders.

## Testing

Pure functions (eligibility, remaining count, start-date gate) unit tested.
The route tested against a restored copy of the database before production,
including: third pass refused; two concurrent requests for the last pass; friend
with a refunded purchase refused; friend matched only by child name + DOB
refused; renewal resets to 2; lapsed membership shows nothing.
