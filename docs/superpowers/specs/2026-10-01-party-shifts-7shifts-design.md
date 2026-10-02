# Party shifts in 7shifts — design

**Date:** 1 October 2026
**Status:** Approved in conversation; awaiting review of this document
**Owner:** Tim

## Problem

Every time a birthday party is booked, someone creates the staffing shift in
7shifts by hand and then assigns it. It is repetitive, easy to forget, and the
team only finds out a party needs covering when a manager gets round to it.

## Goal

When a party is booked, two open shifts appear in 7shifts for that party's time,
up for grabs by the team. When the party moves, its shifts move; when it is
cancelled, its shifts go. Nobody has to touch 7shifts for a normal booking.

## Decisions (made with Tim, 1 Oct 2026)

| Question | Decision |
|---|---|
| Shift window | 30 minutes before the party to 30 minutes after (a 2-hour party → a 3-hour shift) |
| Shifts per party | Two, every party, whatever the package |
| Role | The general staff role, so every employee sees them |
| Party moved / cancelled | Update automatically: move the shifts / delete them. If a shift had been picked up, still move/delete it and email the manager |
| How it syncs | A sync job every 10 minutes (Option A), not inline in each booking route |
| Parties booked before go-live | Left alone — only bookings created after the sync is switched on get automatic shifts |

## Out of scope

Automatic assignment to a person; different staffing per package; texting staff
(7shifts notifies them about open shifts itself); syncing anything other than
parties (events, After Dark, groups).

## Why a sync job, not a hook in each booking route

Every route that books or changes a party ends in `party_bookings`: the website
booking wizard (`/api/party-booking/create` → `createPartyBooking`), scheduling a
package from My Account (`/api/purchases/[id]` PATCH, which syncs to
`party_bookings`), and admin bookings and edits (`/api/admin/party-bookings`).
A job that reads `party_bookings` catches all of them, including ones added
later, without each remembering to call 7shifts. A 7shifts outage can never fail
a booking; the next run catches up. The cost is up to ten minutes before shifts
appear, which does not matter for staff picking them up.

## Architecture

### 1. Sync job — `GET /api/cron/sync-party-shifts`

Protected by `CRON_SECRET` exactly like the existing jobs in `src/app/api/cron/`.
Each run:

1. Reads `party_bookings` where `party_date >= today (Eastern)` and
   `created_at >= SEVENSHIFTS_SYNC_START`, plus their `party_shifts` rows.
   Cancelled bookings are included so their shifts can be removed.
2. For each booking, works out the plan with the pure function `planPartyShifts`
   (below).
3. Carries out the plan against 7shifts, recording each step in `party_shifts`.
4. Returns a summary (`created`, `moved`, `deleted`, `unchanged`, `errors`), and
   in dry-run mode performs no writes to 7shifts or `party_shifts`, only logs
   the plan.

**Who calls it every 10 minutes.** All eight existing Vercel crons are daily,
which suggests the Hobby plan, where Vercel only runs daily jobs. So:

- If the Vercel plan allows it: add `{"path": "/api/cron/sync-party-shifts",
  "schedule": "*/10 * * * *"}` to `vercel.json`.
- Otherwise: Supabase `pg_cron` + `pg_net` call the same URL every 10 minutes
  with the `CRON_SECRET` bearer header. (To be confirmed when Vercel access is
  back.)

### 2. Decision logic — `src/lib/party-shifts/plan.ts` (pure, unit tested)

`planPartyShifts(booking, recordedShifts, nowEastern) → Action[]`, where an
action is `create`, `move`, `delete` or nothing:

| Booking | Recorded shifts | Plan |
|---|---|---|
| `confirmed`, future | none | create 2 |
| `confirmed`, future | 1 (a previous run was interrupted) | create 1 |
| `confirmed`, times changed | 2 | move both to the new window |
| `confirmed`, unchanged | 2 | nothing |
| `cancelled` | any | delete each |
| `pending` | none | nothing (no shifts until payment confirms) |
| `pending` | some (was confirmed, then reopened) | delete each |
| `done`, or party already started | any | nothing (history is left alone) |

`shiftWindow(party_date, start_time, end_time) → { startUtc, endUtc }`:
start − 30 min to end + 30 min, converted from America/New_York to UTC ISO
strings, correct across the daylight-saving changes (tests cover the November
fall-back weekend and the March spring-forward weekend).

### 3. 7shifts client — `src/lib/party-shifts/sevenShifts.ts`

Thin wrapper over the 7shifts REST API, authenticated with a company access
token (`Authorization: Bearer <token>`; created in 7shifts under Company
Settings → Developer Tools → Create Access Token; available to any customer
without partner approval).

| Use | Call |
|---|---|
| Create an open shift | `POST /v2/company/{company_id}/shifts` with `location_id`, `role_id`, `department_id` (if used), `start`, `end` (UTC ISO8601), `open: true`, `open_offer_type: 1` (everyone may request), `draft: false` (published, so staff see it), `notes` |
| Who holds a shift | `GET /v2/company/{company_id}/shifts/{shift_id}` → `user_id` (null while open) — *path to confirm against the live API in step 1 of the plan* |
| Move a shift | `PUT /v2/company/{company_id}/shifts/{shift_id}` with new `start`, `end`, `notes` |
| Delete a shift | `DELETE /v2/company/{company_id}/shifts/{shift_id}` — *path to confirm against the live API* |

There is no 7shifts webhook for a shift being picked up, so "who holds it" is
read on demand, only when a shift is about to be moved or deleted.

**Shift note** shown to staff: `🎉 Birthday party: Worker Bee+, 15 kids, 1:00–3:00 PM [bb:<booking id>]`.
No customer phone, email or address goes to 7shifts. The `[bb:<id>]` tag lets
the job recognise its own shifts (see Failure handling).

### 4. Storage — new table `party_shifts` (migration 054)

| Column | Purpose |
|---|---|
| `id` uuid PK | |
| `party_booking_id` uuid → `party_bookings(id)` | which party |
| `slot` smallint (1 or 2) | which of the two shifts; unique with the booking |
| `seven_shifts_shift_id` bigint, nullable | null while a create is in flight |
| `starts_at`, `ends_at` timestamptz | the window last sent to 7shifts |
| `status` text: `pending`, `active`, `deleted` | |
| `last_error` text, nullable | last failure, for the admin to see |
| `created_at`, `updated_at` | |

Unique `(party_booking_id, slot)`. Service-role access only (RLS on, no
policies), like other back-office tables. Applied by hand in the Supabase SQL
Editor, as migrations are here.

### 5. Settings (environment variables, never in code)

`SEVENSHIFTS_ACCESS_TOKEN`, `SEVENSHIFTS_COMPANY_ID`, `SEVENSHIFTS_LOCATION_ID`,
`SEVENSHIFTS_ROLE_ID`, `SEVENSHIFTS_DEPARTMENT_ID` (optional),
`PARTY_SHIFTS_ALERT_EMAIL` (manager alerts), `SEVENSHIFTS_SYNC_START`
(ISO timestamp; only bookings created at or after it are synced),
`SEVENSHIFTS_SYNC_MODE` = `off` | `dry-run` | `live` (defaults to `off`).

The company, location and role IDs are looked up once through the API after the
token exists, and confirmed with Tim before being set.

## Picked-up shifts and alerts

Before moving or deleting a shift, the job reads its `user_id`. If it is null
the change is silent. If someone holds it, the change still happens and an email
goes to `PARTY_SHIFTS_ALERT_EMAIL` through the existing Resend sender, e.g.:

> Ava's party on Sat 18 Oct moved to 3:00–5:00 PM. Jamie had picked up the
> 12:30–3:30 shift; it is now 2:30–5:30.

> Ava's party on Sat 18 Oct was cancelled. Jamie had picked up the 12:30–3:30
> shift; it has been removed from 7shifts.

The employee's name comes from the 7shifts user record (`GET /v2/company/{id}/users/{user_id}`).

## Failure handling

- **7shifts error or outage:** logged with the booking id, `last_error` set on
  the row, reported to Sentry; the next run retries. A booking is never affected.
- **No duplicates:** before creating a shift the job inserts the
  `party_shifts` row as `pending`; after 7shifts answers it stores the shift id
  and marks it `active`. If a run dies between the two, the next run finds a
  `pending` row with no id, looks for a 7shifts shift on that date whose note
  carries `[bb:<booking id>]` and slot, and adopts it instead of creating a
  second one.
- **Shift deleted by hand in 7shifts:** a move/delete that gets 404 marks the row
  `deleted` and, for a still-confirmed party, the next run recreates it (and
  alerts, since someone removed it on purpose or by mistake).
- **Overlapping runs:** the job takes a Postgres advisory lock at the start and
  exits if another run holds it.
- **Bad settings:** with any required setting missing the job does nothing and
  returns an error, rather than guessing.

## Rollout

1. Tim creates the access token and adds it (Vercel or `.env.local`); mode stays `off`.
2. Read-only check: list locations, roles and departments; confirm which IDs to use.
3. Apply migration 054 in the SQL Editor.
4. Set `SEVENSHIFTS_SYNC_START` to the go-live moment and mode to `dry-run`;
   compare the logged plan against the party calendar.
5. One supervised live test: create one test shift, confirm it shows as open in
   7shifts, move it, delete it.
6. Mode to `live`. Watch the first few real bookings.

## Testing

- Unit tests (Vitest) for `planPartyShifts` across every row of the table above,
  and `shiftWindow` including both daylight-saving weekends.
- Unit test for the shift note format (no customer contact details).
- The 7shifts client is exercised in the read-only check, the dry run and the
  one supervised live test — not mocked into false confidence.

## Open items

- Confirm the Vercel plan, to choose between a Vercel cron and Supabase `pg_cron`.
- Confirm the retrieve and delete shift paths against the live API (step 2).
- Manager alert address (`PARTY_SHIFTS_ALERT_EMAIL`).
