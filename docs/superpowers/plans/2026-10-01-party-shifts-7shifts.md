# Party Shifts in 7shifts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every confirmed birthday party booked after go-live gets two open shifts in 7shifts, which move with the party, disappear when it is cancelled, and email the manager when a picked-up shift changes.

**Architecture:** A ten-minute sync job (`/api/cron/sync-party-shifts`) reads `party_bookings` and a new `party_shifts` table, asks a pure planner what each party needs (create / adopt / move / delete), and carries it out through a thin 7shifts REST client. Pure logic (time windows, notes, planning) is unit tested; the executor is tested with in-memory fakes; the real API is exercised by a supervised smoke test.

**Tech Stack:** Next.js 15 App Router route handler, Supabase (service-role client), 7shifts REST API v2 (access token), Resend (`sendEmail`), Vitest, `Intl` for time zones (no new dependencies).

**Spec:** `docs/superpowers/specs/2026-10-01-party-shifts-7shifts-design.md`

## Global Constraints

- Shift window: party start − 30 min to party end + 30 min.
- Two open shifts per party (`SHIFTS_PER_PARTY = 2`), every package except `group_rate` (groups are out of scope).
- Role **Employee** `2664998`, department **Operations** `779751`, location `490587`, company `404191` (confirmed by the read-only check on 1 Oct 2026).
- Shifts are created `open: true`, `open_offer_type: 1`, `draft: false` (published).
- Only bookings with `created_at >= SEVENSHIFTS_SYNC_START` are touched; parties already on the books are never touched.
- Only `confirmed` bookings get shifts; `pending` gets none; `cancelled` loses them; anything whose shift window has started is left alone.
- No customer phone, email or address is ever sent to 7shifts. The child's name may appear in the manager's alert email only.
- Party times in `party_bookings` are America/New_York wall-clock (`party_date` `YYYY-MM-DD`, `start_time`/`end_time` `HH:MM` or `HH:MM:SS`); 7shifts takes UTC ISO 8601.
- Mode switch `SEVENSHIFTS_SYNC_MODE` = `off` | `dry-run` | `live`, default `off`.
- Secrets live only in environment variables (`.env.local` locally, Vercel in production). Never print the token.
- Migrations are applied by hand in the Supabase SQL Editor; the file in `supabase/migrations/` is the record.
- Commit format: `emoji type: description`, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never `--no-verify`.
- Package manager: `npx -y pnpm@10` (pnpm is not on PATH here). Tests: `npx vitest run <path>`.

## File Structure

| File | Responsibility |
|---|---|
| `supabase/migrations/054_party_shifts.sql` | `party_shifts` table, `sync_leases` table, lease functions |
| `src/lib/supabase/database.types.ts` (modify) | hand-written types for the new table and functions |
| `src/lib/party-shifts/window.ts` | Eastern → UTC conversion and the shift window |
| `src/lib/party-shifts/note.ts` | the shift note staff see, and the `[bb:<id>:<slot>]` tag |
| `src/lib/party-shifts/plan.ts` | pure planner: booking + recorded shifts → actions |
| `src/lib/party-shifts/config.ts` | reads and validates settings from the environment |
| `src/lib/party-shifts/sevenShifts.ts` | 7shifts REST client (injectable `fetch`) |
| `src/lib/party-shifts/alerts.ts` | manager alert email text |
| `src/lib/party-shifts/store.ts` | Supabase implementation of the shift store |
| `src/lib/party-shifts/sync.ts` | executor: runs the plan against client + store |
| `src/app/api/cron/sync-party-shifts/route.ts` | cron endpoint: auth, lease, run, report |
| `scripts/party-shifts-smoke.ts` | supervised live test against 7shifts |
| `src/lib/party-shifts/__tests__/*.test.ts` | unit tests |

---

### Task 1: Migration 054 and database types

**Files:**
- Create: `supabase/migrations/054_party_shifts.sql`
- Modify: `src/lib/supabase/database.types.ts` (Tables section and `Functions`)

**Interfaces:**
- Produces: table `public.party_shifts`; table `public.sync_leases`; functions `public.try_acquire_sync_lease(p_name text, p_seconds int) returns boolean`, `public.release_sync_lease(p_name text) returns void`.

- [ ] **Step 1: Write the migration**

```sql
-- Migration 054: party shifts in 7shifts
--
-- One row per open shift created in 7shifts for a party (two per party).
-- The sync job (/api/cron/sync-party-shifts) is the only writer.
-- See docs/superpowers/specs/2026-10-01-party-shifts-7shifts-design.md.

BEGIN;

CREATE TABLE IF NOT EXISTS public.party_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_booking_id UUID NOT NULL REFERENCES public.party_bookings(id) ON DELETE CASCADE,
  slot SMALLINT NOT NULL CHECK (slot IN (1, 2)),
  -- Null while a create is in flight; the next run adopts the shift by its note tag.
  seven_shifts_shift_id BIGINT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'deleted')),
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (party_booking_id, slot)
);

CREATE INDEX IF NOT EXISTS idx_party_shifts_booking ON public.party_shifts(party_booking_id);

ALTER TABLE public.party_shifts ENABLE ROW LEVEL SECURITY;
-- No policies: service role only.

-- A lease rather than an advisory lock: advisory locks do not survive
-- PostgREST's connection pooling, so two overlapping runs could both "hold" one.
CREATE TABLE IF NOT EXISTS public.sync_leases (
  name TEXT PRIMARY KEY,
  held_until TIMESTAMPTZ NOT NULL DEFAULT 'epoch'
);
ALTER TABLE public.sync_leases ENABLE ROW LEVEL SECURITY;

INSERT INTO public.sync_leases (name) VALUES ('party_shifts') ON CONFLICT (name) DO NOTHING;

CREATE OR REPLACE FUNCTION public.try_acquire_sync_lease(p_name TEXT, p_seconds INT)
RETURNS BOOLEAN
LANGUAGE sql
AS $$
  WITH taken AS (
    UPDATE public.sync_leases
    SET held_until = NOW() + make_interval(secs => p_seconds)
    WHERE name = p_name AND held_until < NOW()
    RETURNING 1
  )
  SELECT EXISTS (SELECT 1 FROM taken);
$$;

CREATE OR REPLACE FUNCTION public.release_sync_lease(p_name TEXT)
RETURNS VOID
LANGUAGE sql
AS $$
  UPDATE public.sync_leases SET held_until = 'epoch' WHERE name = p_name;
$$;

REVOKE EXECUTE ON FUNCTION public.try_acquire_sync_lease(TEXT, INT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_sync_lease(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.try_acquire_sync_lease(TEXT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_sync_lease(TEXT) TO service_role;

COMMIT;
```

- [ ] **Step 2: Add the types**

In `src/lib/supabase/database.types.ts`, inside `Tables: {` (next to `party_bookings`), add:

```ts
      party_shifts: {
        Row: {
          id: string;
          party_booking_id: string;
          slot: number;
          seven_shifts_shift_id: number | null;
          starts_at: string;
          ends_at: string;
          status: 'pending' | 'active' | 'deleted';
          last_error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          party_booking_id: string;
          slot: number;
          seven_shifts_shift_id?: number | null;
          starts_at: string;
          ends_at: string;
          status?: 'pending' | 'active' | 'deleted';
          last_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          party_booking_id?: string;
          slot?: number;
          seven_shifts_shift_id?: number | null;
          starts_at?: string;
          ends_at?: string;
          status?: 'pending' | 'active' | 'deleted';
          last_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
```

Replace `Functions: { [_ in never]: never; };` with:

```ts
    Functions: {
      try_acquire_sync_lease: {
        Args: { p_name: string; p_seconds: number };
        Returns: boolean;
      };
      release_sync_lease: {
        Args: { p_name: string };
        Returns: undefined;
      };
    };
```

- [ ] **Step 3: Type check the touched file**

Run: `npx tsc -p /tmp/claude-501/tsconfig.check.json 2>&1 | grep -c 'error TS'`
Expected: total no higher than before the change (baseline 318 on main; adding `Functions` entries may turn some existing untyped `rpc(...)` calls into reported errors — if the total rises, list them and confirm each was already untyped on main, then note it in the commit).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/054_party_shifts.sql src/lib/supabase/database.types.ts
git commit -m "🗃️ party_shifts table and a sync lease for the 7shifts job

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(The migration is applied by hand in the Supabase SQL Editor during Task 9, not now.)

---

### Task 2: Shift window (Eastern → UTC)

**Files:**
- Create: `src/lib/party-shifts/window.ts`
- Test: `src/lib/party-shifts/__tests__/window.test.ts`

**Interfaces:**
- Produces: `easternToUtc(date: string, time: string): Date`; `shiftWindow(partyDate: string, startTime: string, endTime: string): { startsAt: string; endsAt: string }` (UTC ISO strings, e.g. `2026-10-18T16:30:00.000Z`); `easternDayBounds(date: string): { fromIso: string; toIso: string }`; `sameWindow(a: {startsAt: string; endsAt: string}, b: {startsAt: string; endsAt: string}): boolean`; constants `SHIFT_LEAD_MINUTES = 30`, `SHIFT_TAIL_MINUTES = 30`.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { easternDayBounds, easternToUtc, sameWindow, shiftWindow } from '@/lib/party-shifts/window';

describe('easternToUtc', () => {
  it('converts summer (EDT, UTC-4) wall-clock time', () => {
    expect(easternToUtc('2026-10-18', '13:00').toISOString()).toBe('2026-10-18T17:00:00.000Z');
  });

  it('converts winter (EST, UTC-5) wall-clock time', () => {
    expect(easternToUtc('2026-12-12', '13:00').toISOString()).toBe('2026-12-12T18:00:00.000Z');
  });

  it('handles the fall-back day (1 Nov 2026)', () => {
    expect(easternToUtc('2026-11-01', '13:00').toISOString()).toBe('2026-11-01T18:00:00.000Z');
  });

  it('handles the spring-forward day (14 Mar 2027)', () => {
    expect(easternToUtc('2027-03-14', '13:00').toISOString()).toBe('2027-03-14T17:00:00.000Z');
  });

  it('accepts HH:MM:SS as stored by Postgres', () => {
    expect(easternToUtc('2026-10-18', '13:00:00').toISOString()).toBe('2026-10-18T17:00:00.000Z');
  });
});

describe('shiftWindow', () => {
  it('runs from 30 minutes before to 30 minutes after the party', () => {
    expect(shiftWindow('2026-10-18', '13:00', '15:00')).toEqual({
      startsAt: '2026-10-18T16:30:00.000Z',
      endsAt: '2026-10-18T19:30:00.000Z',
    });
  });
});

describe('easternDayBounds', () => {
  it('covers the Eastern calendar day in UTC', () => {
    expect(easternDayBounds('2026-10-18')).toEqual({
      fromIso: '2026-10-18T04:00:00.000Z',
      toIso: '2026-10-19T04:00:00.000Z',
    });
  });
});

describe('sameWindow', () => {
  it('compares instants, not string formatting', () => {
    expect(
      sameWindow(
        { startsAt: '2026-10-18T16:30:00Z', endsAt: '2026-10-18T19:30:00Z' },
        { startsAt: '2026-10-18T16:30:00.000Z', endsAt: '2026-10-18T19:30:00.000Z' }
      )
    ).toBe(true);
    expect(
      sameWindow(
        { startsAt: '2026-10-18T16:30:00Z', endsAt: '2026-10-18T19:30:00Z' },
        { startsAt: '2026-10-18T17:30:00Z', endsAt: '2026-10-18T20:30:00Z' }
      )
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/party-shifts/__tests__/window.test.ts`
Expected: FAIL — cannot find module `@/lib/party-shifts/window`.

- [ ] **Step 3: Implement**

```ts
/**
 * Party times are Eastern wall-clock; 7shifts wants UTC. Converted with Intl,
 * which knows the daylight-saving rules, so no time zone library is needed.
 */

const ZONE = 'America/New_York';
export const SHIFT_LEAD_MINUTES = 30;
export const SHIFT_TAIL_MINUTES = 30;

/** Minutes the Eastern clock is ahead of UTC at this instant (−240 or −300). */
function easternOffsetMinutes(instant: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  const wallAsUtc = Date.UTC(
    part('year'),
    part('month') - 1,
    part('day'),
    part('hour'),
    part('minute'),
    part('second')
  );
  return Math.round((wallAsUtc - instant.getTime()) / 60000);
}

/** The UTC instant at which the Eastern clock reads `date` `time`. */
export function easternToUtc(date: string, time: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const wall = Date.UTC(y, m - 1, d, hh, mm);
  // Guess with the offset at the wall time, then correct with the offset at
  // the guess — the second pass settles the hours around a DST change.
  const first = wall - easternOffsetMinutes(new Date(wall)) * 60000;
  return new Date(wall - easternOffsetMinutes(new Date(first)) * 60000);
}

export function shiftWindow(
  partyDate: string,
  startTime: string,
  endTime: string
): { startsAt: string; endsAt: string } {
  const start = easternToUtc(partyDate, startTime).getTime() - SHIFT_LEAD_MINUTES * 60000;
  const end = easternToUtc(partyDate, endTime).getTime() + SHIFT_TAIL_MINUTES * 60000;
  return { startsAt: new Date(start).toISOString(), endsAt: new Date(end).toISOString() };
}

/** Midnight to midnight Eastern, as UTC ISO strings. */
export function easternDayBounds(date: string): { fromIso: string; toIso: string } {
  const [y, m, d] = date.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  const nextDate = next.toISOString().slice(0, 10);
  return {
    fromIso: easternToUtc(date, '00:00').toISOString(),
    toIso: easternToUtc(nextDate, '00:00').toISOString(),
  };
}

export function sameWindow(
  a: { startsAt: string; endsAt: string },
  b: { startsAt: string; endsAt: string }
): boolean {
  return (
    new Date(a.startsAt).getTime() === new Date(b.startsAt).getTime() &&
    new Date(a.endsAt).getTime() === new Date(b.endsAt).getTime()
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/party-shifts/__tests__/window.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/party-shifts/window.ts src/lib/party-shifts/__tests__/window.test.ts
git commit -m "✨ Party shift windows in UTC, half an hour either side

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Shift note and tag

**Files:**
- Create: `src/lib/party-shifts/note.ts`
- Test: `src/lib/party-shifts/__tests__/note.test.ts`

**Interfaces:**
- Consumes: `PACKAGE_PRICING` from `@/lib/validations/party-booking` (`.queen_bee.name` = `'Queen Bee+'`, `.worker_bee.name` = `'Worker Bee+'`, `.basic_bee.name` = `'Basic Bee'`).
- Produces: `shiftNote(booking: NoteBooking, slot: 1 | 2): string`; `parseShiftTag(note: string | null | undefined): { bookingId: string; slot: 1 | 2 } | null`; `formatEasternClock(time: string): string` (`'13:00'` → `'1:00 PM'`); type `NoteBooking = { id: string; package_name: string; guest_count: number; start_time: string; end_time: string }`.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { formatEasternClock, parseShiftTag, shiftNote } from '@/lib/party-shifts/note';

const booking = {
  id: '6f1c2a5e-9d3b-4c1a-8e7f-0a1b2c3d4e5f',
  package_name: 'worker_bee',
  guest_count: 15,
  start_time: '13:00:00',
  end_time: '15:00:00',
};

describe('shiftNote', () => {
  it('names the package, head count and party time, and carries the tag', () => {
    expect(shiftNote(booking, 1)).toBe(
      '🎉 Birthday party: Worker Bee+, 15 kids, 1:00 PM–3:00 PM [bb:6f1c2a5e-9d3b-4c1a-8e7f-0a1b2c3d4e5f:1]'
    );
  });

  it('never includes customer contact details', () => {
    const note = shiftNote({ ...booking, customer_email: 'a@b.com', customer_phone: '555' } as never, 2);
    expect(note).not.toMatch(/@|555/);
  });
});

describe('parseShiftTag', () => {
  it('reads back the booking and slot', () => {
    expect(parseShiftTag(shiftNote(booking, 2))).toEqual({ bookingId: booking.id, slot: 2 });
  });

  it('ignores notes without a tag', () => {
    expect(parseShiftTag('Regular shift')).toBeNull();
    expect(parseShiftTag(null)).toBeNull();
  });
});

describe('formatEasternClock', () => {
  it('formats 24-hour times for people', () => {
    expect(formatEasternClock('09:30')).toBe('9:30 AM');
    expect(formatEasternClock('12:00:00')).toBe('12:00 PM');
    expect(formatEasternClock('00:15')).toBe('12:15 AM');
    expect(formatEasternClock('17:45')).toBe('5:45 PM');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/party-shifts/__tests__/note.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement**

```ts
/**
 * The note staff see on a party shift in 7shifts, and the tag that lets the
 * sync job recognise its own shifts. Customer contact details never go here.
 */

import { PACKAGE_PRICING } from '@/lib/validations/party-booking';

export type NoteBooking = {
  id: string;
  package_name: string;
  guest_count: number;
  start_time: string;
  end_time: string;
};

const PACKAGE_LABEL: Record<string, string> = {
  queen_bee: PACKAGE_PRICING.queen_bee.name,
  worker_bee: PACKAGE_PRICING.worker_bee.name,
  basic_bee: PACKAGE_PRICING.basic_bee.name,
};

export function formatEasternClock(time: string): string {
  const [hh, mm] = time.split(':').map(Number);
  const suffix = hh < 12 ? 'AM' : 'PM';
  const hour = hh % 12 === 0 ? 12 : hh % 12;
  return `${hour}:${String(mm).padStart(2, '0')} ${suffix}`;
}

export function shiftNote(booking: NoteBooking, slot: 1 | 2): string {
  const label = PACKAGE_LABEL[booking.package_name] ?? 'Party';
  const time = `${formatEasternClock(booking.start_time)}–${formatEasternClock(booking.end_time)}`;
  return `🎉 Birthday party: ${label}, ${booking.guest_count} kids, ${time} [bb:${booking.id}:${slot}]`;
}

const TAG = /\[bb:([0-9a-f-]{36}):([12])\]/i;

export function parseShiftTag(
  note: string | null | undefined
): { bookingId: string; slot: 1 | 2 } | null {
  const match = note?.match(TAG);
  if (!match) return null;
  return { bookingId: match[1].toLowerCase(), slot: Number(match[2]) as 1 | 2 };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/party-shifts/__tests__/note.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/party-shifts/note.ts src/lib/party-shifts/__tests__/note.test.ts
git commit -m "✨ The note staff see on a party shift, with a tag the sync can find

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The planner

**Files:**
- Create: `src/lib/party-shifts/plan.ts`
- Test: `src/lib/party-shifts/__tests__/plan.test.ts`

**Interfaces:**
- Consumes: `shiftWindow`, `sameWindow` from `window.ts` (Task 2).
- Produces:

```ts
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'done';
export interface BookingForShifts {
  id: string;
  status: BookingStatus;
  party_date: string;
  start_time: string;
  end_time: string;
  package_name: string;
  guest_count: number;
  child_name: string;
}
export interface RecordedShift {
  id: string;                       // party_shifts.id
  slot: 1 | 2;
  sevenShiftsShiftId: number | null;
  startsAt: string;
  endsAt: string;
  status: 'pending' | 'active' | 'deleted';
}
export type ShiftAction =
  | { kind: 'create'; slot: 1 | 2; startsAt: string; endsAt: string }
  | { kind: 'adopt'; shift: RecordedShift; startsAt: string; endsAt: string }
  | { kind: 'move'; shift: RecordedShift; startsAt: string; endsAt: string }
  | { kind: 'delete'; shift: RecordedShift };
export const SHIFTS_PER_PARTY = 2;
export function planPartyShifts(booking: BookingForShifts, shifts: RecordedShift[], now: Date): ShiftAction[];
export function describeAction(action: ShiftAction): string; // e.g. "create slot 1 16:30Z–19:30Z"
```

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { planPartyShifts, type BookingForShifts, type RecordedShift } from '@/lib/party-shifts/plan';

const NOW = new Date('2026-10-02T15:00:00Z');

const booking = (over: Partial<BookingForShifts> = {}): BookingForShifts => ({
  id: '6f1c2a5e-9d3b-4c1a-8e7f-0a1b2c3d4e5f',
  status: 'confirmed',
  party_date: '2026-10-18',
  start_time: '13:00:00',
  end_time: '15:00:00',
  package_name: 'worker_bee',
  guest_count: 15,
  child_name: 'Ava',
  ...over,
});

const WIN = { startsAt: '2026-10-18T16:30:00.000Z', endsAt: '2026-10-18T19:30:00.000Z' };

const shift = (slot: 1 | 2, over: Partial<RecordedShift> = {}): RecordedShift => ({
  id: `row-${slot}`,
  slot,
  sevenShiftsShiftId: 1000 + slot,
  ...WIN,
  status: 'active',
  ...over,
});

describe('planPartyShifts', () => {
  it('creates two shifts for a new confirmed party', () => {
    expect(planPartyShifts(booking(), [], NOW)).toEqual([
      { kind: 'create', slot: 1, ...WIN },
      { kind: 'create', slot: 2, ...WIN },
    ]);
  });

  it('creates only the missing shift when one exists', () => {
    expect(planPartyShifts(booking(), [shift(1)], NOW)).toEqual([{ kind: 'create', slot: 2, ...WIN }]);
  });

  it('recreates a shift that was deleted by hand', () => {
    expect(planPartyShifts(booking(), [shift(1), shift(2, { status: 'deleted' })], NOW)).toEqual([
      { kind: 'create', slot: 2, ...WIN },
    ]);
  });

  it('adopts a create that was interrupted', () => {
    const pending = shift(1, { status: 'pending', sevenShiftsShiftId: null });
    expect(planPartyShifts(booking(), [pending, shift(2)], NOW)).toEqual([
      { kind: 'adopt', shift: pending, ...WIN },
    ]);
  });

  it('does nothing when both shifts match', () => {
    expect(planPartyShifts(booking(), [shift(1), shift(2)], NOW)).toEqual([]);
  });

  it('moves both shifts when the party moves', () => {
    const moved = booking({ start_time: '15:00:00', end_time: '17:00:00' });
    const win = { startsAt: '2026-10-18T18:30:00.000Z', endsAt: '2026-10-18T21:30:00.000Z' };
    expect(planPartyShifts(moved, [shift(1), shift(2)], NOW)).toEqual([
      { kind: 'move', shift: shift(1), ...win },
      { kind: 'move', shift: shift(2), ...win },
    ]);
  });

  it('deletes live shifts when the party is cancelled', () => {
    const pending = shift(2, { status: 'pending', sevenShiftsShiftId: null });
    expect(planPartyShifts(booking({ status: 'cancelled' }), [shift(1), pending], NOW)).toEqual([
      { kind: 'delete', shift: shift(1) },
      { kind: 'delete', shift: pending },
    ]);
  });

  it('gives a pending booking no shifts, and removes any it had', () => {
    expect(planPartyShifts(booking({ status: 'pending' }), [], NOW)).toEqual([]);
    expect(planPartyShifts(booking({ status: 'pending' }), [shift(1)], NOW)).toEqual([
      { kind: 'delete', shift: shift(1) },
    ]);
  });

  it('leaves done parties alone', () => {
    expect(planPartyShifts(booking({ status: 'done' }), [shift(1)], NOW)).toEqual([]);
  });

  it('leaves a party alone once its shift window has started', () => {
    const during = new Date('2026-10-18T17:00:00Z');
    expect(planPartyShifts(booking({ status: 'cancelled' }), [shift(1)], during)).toEqual([]);
    expect(planPartyShifts(booking(), [], during)).toEqual([]);
  });

  it('never creates shifts for group visits', () => {
    expect(planPartyShifts(booking({ package_name: 'group_rate' }), [], NOW)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/party-shifts/__tests__/plan.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement**

```ts
/**
 * What a party needs in 7shifts, decided from the booking and the shifts
 * already recorded for it. Pure — no I/O — so every case is unit tested.
 */

import { sameWindow, shiftWindow } from '@/lib/party-shifts/window';

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'done';

export interface BookingForShifts {
  id: string;
  status: BookingStatus;
  party_date: string;
  start_time: string;
  end_time: string;
  package_name: string;
  guest_count: number;
  child_name: string;
}

export interface RecordedShift {
  id: string;
  slot: 1 | 2;
  sevenShiftsShiftId: number | null;
  startsAt: string;
  endsAt: string;
  status: 'pending' | 'active' | 'deleted';
}

export type ShiftAction =
  | { kind: 'create'; slot: 1 | 2; startsAt: string; endsAt: string }
  | { kind: 'adopt'; shift: RecordedShift; startsAt: string; endsAt: string }
  | { kind: 'move'; shift: RecordedShift; startsAt: string; endsAt: string }
  | { kind: 'delete'; shift: RecordedShift };

export const SHIFTS_PER_PARTY = 2;
const SLOTS: readonly (1 | 2)[] = [1, 2];

export function planPartyShifts(
  booking: BookingForShifts,
  shifts: RecordedShift[],
  now: Date
): ShiftAction[] {
  // Groups are billed and staffed differently; out of scope.
  if (booking.package_name === 'group_rate') return [];

  const window = shiftWindow(booking.party_date, booking.start_time, booking.end_time);
  // Once the shift has started the schedule is history: never rewrite it.
  if (new Date(window.startsAt).getTime() <= now.getTime()) return [];

  const live = shifts.filter((s) => s.status !== 'deleted');

  if (booking.status === 'done') return [];

  if (booking.status === 'cancelled' || booking.status === 'pending') {
    return live.map((shift) => ({ kind: 'delete', shift }));
  }

  const actions: ShiftAction[] = [];
  for (const slot of SLOTS) {
    const shift = live.find((s) => s.slot === slot);
    if (!shift) {
      actions.push({ kind: 'create', slot, ...window });
    } else if (shift.status === 'pending' || shift.sevenShiftsShiftId === null) {
      actions.push({ kind: 'adopt', shift, ...window });
    } else if (!sameWindow(shift, window)) {
      actions.push({ kind: 'move', shift, ...window });
    }
  }
  return actions;
}

export function describeAction(action: ShiftAction): string {
  const span = (a: { startsAt: string; endsAt: string }) =>
    `${a.startsAt.slice(11, 16)}Z–${a.endsAt.slice(11, 16)}Z`;
  switch (action.kind) {
    case 'create':
      return `create slot ${action.slot} ${span(action)}`;
    case 'adopt':
      return `adopt slot ${action.shift.slot} ${span(action)}`;
    case 'move':
      return `move slot ${action.shift.slot} (#${action.shift.sevenShiftsShiftId}) to ${span(action)}`;
    case 'delete':
      return `delete slot ${action.shift.slot} (#${action.shift.sevenShiftsShiftId ?? 'untracked'})`;
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/party-shifts/__tests__/plan.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/party-shifts/plan.ts src/lib/party-shifts/__tests__/plan.test.ts
git commit -m "✨ Decide what each party needs in 7shifts: create, adopt, move or delete

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Settings and the 7shifts client

**Files:**
- Create: `src/lib/party-shifts/config.ts`, `src/lib/party-shifts/sevenShifts.ts`
- Test: `src/lib/party-shifts/__tests__/config.test.ts`, `src/lib/party-shifts/__tests__/sevenShifts.test.ts`

**Interfaces:**
- Produces:

```ts
// config.ts
export type SyncMode = 'off' | 'dry-run' | 'live';
export interface PartyShiftsConfig {
  mode: SyncMode;
  token: string;
  companyId: number;
  locationId: number;
  roleId: number;
  departmentId: number | null;
  alertEmail: string | null;
  syncStart: string; // ISO timestamp
}
export function loadPartyShiftsConfig(
  env: Record<string, string | undefined>
): { ok: true; config: PartyShiftsConfig } | { ok: false; mode: SyncMode; missing: string[] };

// sevenShifts.ts
export interface SevenShiftsShift { id: number; start: string; end: string; user_id: number | null; notes: string | null; }
export class SevenShiftsError extends Error { status: number }
export interface SevenShiftsClient {
  createOpenShift(input: { startsAt: string; endsAt: string; notes: string }): Promise<SevenShiftsShift>;
  getShift(id: number): Promise<SevenShiftsShift | null>;          // null on 404 or deleted
  moveShift(id: number, input: { startsAt: string; endsAt: string; notes: string }): Promise<SevenShiftsShift>;
  deleteShift(id: number): Promise<void>;                           // 404 treated as already gone
  findShiftsBetween(fromIso: string, toIso: string): Promise<SevenShiftsShift[]>;
  getUserName(userId: number): Promise<string>;
}
export function createSevenShiftsClient(
  config: Pick<PartyShiftsConfig, 'token' | 'companyId' | 'locationId' | 'roleId' | 'departmentId'>,
  fetchImpl?: typeof fetch
): SevenShiftsClient;
export function isHeld(shift: SevenShiftsShift): boolean; // user_id set and non-zero
```

- [ ] **Step 1: Write the failing config tests**

```ts
import { describe, expect, it } from 'vitest';
import { loadPartyShiftsConfig } from '@/lib/party-shifts/config';

const FULL = {
  SEVENSHIFTS_SYNC_MODE: 'dry-run',
  SEVENSHIFTS_ACCESS_TOKEN: 'tok',
  SEVENSHIFTS_COMPANY_ID: '404191',
  SEVENSHIFTS_LOCATION_ID: '490587',
  SEVENSHIFTS_ROLE_ID: '2664998',
  SEVENSHIFTS_DEPARTMENT_ID: '779751',
  PARTY_SHIFTS_ALERT_EMAIL: 'tim@busybeesipc.com',
  SEVENSHIFTS_SYNC_START: '2026-10-02T00:00:00Z',
};

describe('loadPartyShiftsConfig', () => {
  it('reads a complete configuration', () => {
    expect(loadPartyShiftsConfig(FULL)).toEqual({
      ok: true,
      config: {
        mode: 'dry-run',
        token: 'tok',
        companyId: 404191,
        locationId: 490587,
        roleId: 2664998,
        departmentId: 779751,
        alertEmail: 'tim@busybeesipc.com',
        syncStart: '2026-10-02T00:00:00.000Z',
      },
    });
  });

  it('defaults to off and needs nothing when off', () => {
    expect(loadPartyShiftsConfig({})).toEqual({ ok: false, mode: 'off', missing: [] });
  });

  it('lists what is missing when switched on', () => {
    const result = loadPartyShiftsConfig({ SEVENSHIFTS_SYNC_MODE: 'live' });
    expect(result).toEqual({
      ok: false,
      mode: 'live',
      missing: [
        'SEVENSHIFTS_ACCESS_TOKEN',
        'SEVENSHIFTS_COMPANY_ID',
        'SEVENSHIFTS_LOCATION_ID',
        'SEVENSHIFTS_ROLE_ID',
        'SEVENSHIFTS_SYNC_START',
      ],
    });
  });

  it('rejects an unknown mode as off', () => {
    expect(loadPartyShiftsConfig({ ...FULL, SEVENSHIFTS_SYNC_MODE: 'yes' })).toEqual({ ok: false, mode: 'off', missing: [] });
  });

  it('treats an unparseable start time as missing', () => {
    const result = loadPartyShiftsConfig({ ...FULL, SEVENSHIFTS_SYNC_START: 'soon' });
    expect(result).toMatchObject({ ok: false, missing: ['SEVENSHIFTS_SYNC_START'] });
  });

  it('allows no department and no alert email', () => {
    const { SEVENSHIFTS_DEPARTMENT_ID: _d, PARTY_SHIFTS_ALERT_EMAIL: _a, ...rest } = FULL;
    const result = loadPartyShiftsConfig(rest);
    expect(result).toMatchObject({ ok: true, config: { departmentId: null, alertEmail: null } });
  });
});
```

- [ ] **Step 2: Write the failing client tests**

```ts
import { describe, expect, it, vi } from 'vitest';
import { createSevenShiftsClient, isHeld, SevenShiftsError } from '@/lib/party-shifts/sevenShifts';

const CFG = { token: 'tok', companyId: 404191, locationId: 490587, roleId: 2664998, departmentId: 779751 };

function fakeFetch(status: number, body: unknown) {
  return vi.fn(async () =>
    new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
  );
}

describe('createSevenShiftsClient', () => {
  it('creates a published open shift for everyone to request', async () => {
    const f = fakeFetch(201, { data: { id: 77, start: 's', end: 'e', user_id: null, notes: 'n' } });
    const client = createSevenShiftsClient(CFG, f as unknown as typeof fetch);
    const shift = await client.createOpenShift({ startsAt: 's', endsAt: 'e', notes: 'n' });

    expect(shift.id).toBe(77);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.7shifts.com/v2/company/404191/shifts');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    expect(JSON.parse(init.body as string)).toEqual({
      location_id: 490587,
      department_id: 779751,
      role_id: 2664998,
      start: 's',
      end: 'e',
      open: true,
      open_offer_type: 1,
      draft: false,
      notes: 'n',
    });
  });

  it('returns null for a shift that is gone', async () => {
    const client = createSevenShiftsClient(CFG, fakeFetch(404, { message: 'nope' }) as unknown as typeof fetch);
    expect(await client.getShift(5)).toBeNull();
  });

  it('returns null for a soft-deleted shift', async () => {
    const f = fakeFetch(200, { data: { id: 5, start: 's', end: 'e', user_id: null, notes: null, deleted: true } });
    const client = createSevenShiftsClient(CFG, f as unknown as typeof fetch);
    expect(await client.getShift(5)).toBeNull();
  });

  it('treats deleting a missing shift as done', async () => {
    const client = createSevenShiftsClient(CFG, fakeFetch(404, {}) as unknown as typeof fetch);
    await expect(client.deleteShift(5)).resolves.toBeUndefined();
  });

  it('throws SevenShiftsError with the status on other failures', async () => {
    const client = createSevenShiftsClient(CFG, fakeFetch(500, { message: 'boom' }) as unknown as typeof fetch);
    await expect(client.createOpenShift({ startsAt: 's', endsAt: 'e', notes: 'n' })).rejects.toMatchObject({
      name: 'SevenShiftsError',
      status: 500,
    });
    expect(new SevenShiftsError(429, 'x').status).toBe(429);
  });

  it('lists shifts in a time range for the location', async () => {
    const f = fakeFetch(200, { data: [{ id: 1, start: 's', end: 'e', user_id: 0, notes: null }] });
    const client = createSevenShiftsClient(CFG, f as unknown as typeof fetch);
    const shifts = await client.findShiftsBetween('2026-10-18T04:00:00.000Z', '2026-10-19T04:00:00.000Z');
    expect(shifts).toHaveLength(1);
    const url = new URL((f.mock.calls[0] as unknown as [string])[0]);
    expect(url.pathname).toBe('/v2/company/404191/shifts');
    expect(url.searchParams.get('location_id')).toBe('490587');
    expect(url.searchParams.get('start[gte]')).toBe('2026-10-18T04:00:00.000Z');
    expect(url.searchParams.get('start[lte]')).toBe('2026-10-19T04:00:00.000Z');
  });

  it('formats a user name from 7shifts', async () => {
    const f = fakeFetch(200, { data: { preferred_first_name: 'JAMIE', last_name: 'SMITH' } });
    const client = createSevenShiftsClient(CFG, f as unknown as typeof fetch);
    expect(await client.getUserName(9)).toBe('Jamie S.');
  });
});

describe('isHeld', () => {
  it('is true only when a user holds the shift', () => {
    expect(isHeld({ id: 1, start: '', end: '', user_id: 42, notes: null })).toBe(true);
    expect(isHeld({ id: 1, start: '', end: '', user_id: 0, notes: null })).toBe(false);
    expect(isHeld({ id: 1, start: '', end: '', user_id: null, notes: null })).toBe(false);
  });
});
```

- [ ] **Step 3: Run to verify both fail**

Run: `npx vitest run src/lib/party-shifts/__tests__/config.test.ts src/lib/party-shifts/__tests__/sevenShifts.test.ts`
Expected: FAIL — cannot find modules.

- [ ] **Step 4: Implement config.ts**

```ts
/**
 * Settings for the party shifts sync, from the environment. Off unless
 * SEVENSHIFTS_SYNC_MODE says otherwise; switched on, every required value
 * must be present or the job does nothing.
 */

export type SyncMode = 'off' | 'dry-run' | 'live';

export interface PartyShiftsConfig {
  mode: SyncMode;
  token: string;
  companyId: number;
  locationId: number;
  roleId: number;
  departmentId: number | null;
  alertEmail: string | null;
  syncStart: string;
}

const REQUIRED = [
  'SEVENSHIFTS_ACCESS_TOKEN',
  'SEVENSHIFTS_COMPANY_ID',
  'SEVENSHIFTS_LOCATION_ID',
  'SEVENSHIFTS_ROLE_ID',
  'SEVENSHIFTS_SYNC_START',
] as const;

export function loadPartyShiftsConfig(
  env: Record<string, string | undefined>
): { ok: true; config: PartyShiftsConfig } | { ok: false; mode: SyncMode; missing: string[] } {
  const rawMode = env.SEVENSHIFTS_SYNC_MODE?.trim();
  const mode: SyncMode = rawMode === 'dry-run' || rawMode === 'live' ? rawMode : 'off';
  if (mode === 'off') return { ok: false, mode, missing: [] };

  const value = (key: string) => env[key]?.trim() || '';
  const missing: string[] = REQUIRED.filter((key) => !value(key));

  const syncStartMs = Date.parse(value('SEVENSHIFTS_SYNC_START'));
  if (value('SEVENSHIFTS_SYNC_START') && Number.isNaN(syncStartMs)) missing.push('SEVENSHIFTS_SYNC_START');

  for (const key of ['SEVENSHIFTS_COMPANY_ID', 'SEVENSHIFTS_LOCATION_ID', 'SEVENSHIFTS_ROLE_ID']) {
    if (value(key) && !/^\d+$/.test(value(key))) missing.push(key);
  }

  if (missing.length > 0) return { ok: false, mode, missing };

  const department = value('SEVENSHIFTS_DEPARTMENT_ID');
  return {
    ok: true,
    config: {
      mode,
      token: value('SEVENSHIFTS_ACCESS_TOKEN'),
      companyId: Number(value('SEVENSHIFTS_COMPANY_ID')),
      locationId: Number(value('SEVENSHIFTS_LOCATION_ID')),
      roleId: Number(value('SEVENSHIFTS_ROLE_ID')),
      departmentId: /^\d+$/.test(department) ? Number(department) : null,
      alertEmail: value('PARTY_SHIFTS_ALERT_EMAIL') || null,
      syncStart: new Date(syncStartMs).toISOString(),
    },
  };
}
```

- [ ] **Step 5: Implement sevenShifts.ts**

```ts
/**
 * Thin client for the 7shifts REST API v2, authenticated with a company
 * access token. Only what the party shifts sync needs.
 *
 * Endpoints confirmed against Busy Bees' account on 1 Oct 2026 (read-only):
 * GET /whoami, /company/{id}/locations, /departments, /roles, /shifts (with
 * start[gte]), /shifts/{id}. POST/PUT/DELETE are confirmed by the supervised
 * smoke test (scripts/party-shifts-smoke.ts).
 */

import type { PartyShiftsConfig } from '@/lib/party-shifts/config';

const API = 'https://api.7shifts.com/v2';

export interface SevenShiftsShift {
  id: number;
  start: string;
  end: string;
  user_id: number | null;
  notes: string | null;
  deleted?: boolean;
}

export class SevenShiftsError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'SevenShiftsError';
    this.status = status;
  }
}

export interface SevenShiftsClient {
  createOpenShift(input: { startsAt: string; endsAt: string; notes: string }): Promise<SevenShiftsShift>;
  getShift(id: number): Promise<SevenShiftsShift | null>;
  moveShift(id: number, input: { startsAt: string; endsAt: string; notes: string }): Promise<SevenShiftsShift>;
  deleteShift(id: number): Promise<void>;
  findShiftsBetween(fromIso: string, toIso: string): Promise<SevenShiftsShift[]>;
  getUserName(userId: number): Promise<string>;
}

export function isHeld(shift: SevenShiftsShift): boolean {
  return typeof shift.user_id === 'number' && shift.user_id > 0;
}

function titleCase(name: string): string {
  return name.toLowerCase().replace(/(^|[\s'-])\p{L}/gu, (m) => m.toUpperCase());
}

export function createSevenShiftsClient(
  config: Pick<PartyShiftsConfig, 'token' | 'companyId' | 'locationId' | 'roleId' | 'departmentId'>,
  fetchImpl: typeof fetch = fetch
): SevenShiftsClient {
  const company = `${API}/company/${config.companyId}`;

  async function call<T>(method: string, url: string, body?: unknown): Promise<T> {
    const response = await fetchImpl(url, {
      method,
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (response.status === 204) return undefined as T;
    const text = await response.text();
    if (!response.ok) {
      throw new SevenShiftsError(response.status, `7shifts ${method} ${new URL(url).pathname} → ${response.status}: ${text.slice(0, 200)}`);
    }
    const json = text ? JSON.parse(text) : {};
    return (json.data ?? json) as T;
  }

  const shiftBody = (input: { startsAt: string; endsAt: string; notes: string }) => ({
    location_id: config.locationId,
    ...(config.departmentId ? { department_id: config.departmentId } : {}),
    role_id: config.roleId,
    start: input.startsAt,
    end: input.endsAt,
    open: true,
    open_offer_type: 1,
    draft: false,
    notes: input.notes,
  });

  return {
    createOpenShift: (input) => call<SevenShiftsShift>('POST', `${company}/shifts`, shiftBody(input)),

    async getShift(id) {
      try {
        const shift = await call<SevenShiftsShift>('GET', `${company}/shifts/${id}`);
        return shift.deleted ? null : shift;
      } catch (error) {
        if (error instanceof SevenShiftsError && error.status === 404) return null;
        throw error;
      }
    },

    moveShift: (id, input) =>
      call<SevenShiftsShift>('PUT', `${company}/shifts/${id}`, {
        start: input.startsAt,
        end: input.endsAt,
        notes: input.notes,
      }),

    async deleteShift(id) {
      try {
        await call<void>('DELETE', `${company}/shifts/${id}`);
      } catch (error) {
        if (error instanceof SevenShiftsError && error.status === 404) return;
        throw error;
      }
    },

    async findShiftsBetween(fromIso, toIso) {
      const params = new URLSearchParams({
        location_id: String(config.locationId),
        'start[gte]': fromIso,
        'start[lte]': toIso,
        limit: '200',
      });
      const shifts = await call<SevenShiftsShift[]>('GET', `${company}/shifts?${params}`);
      return (shifts ?? []).filter((s) => !s.deleted);
    },

    async getUserName(userId) {
      const user = await call<{ preferred_first_name?: string; first_name?: string; last_name?: string }>(
        'GET',
        `${company}/users/${userId}`
      );
      const first = titleCase(user.preferred_first_name || user.first_name || 'Someone');
      const last = user.last_name ? ` ${user.last_name.charAt(0).toUpperCase()}.` : '';
      return `${first}${last}`;
    },
  };
}
```

- [ ] **Step 6: Run to verify both pass**

Run: `npx vitest run src/lib/party-shifts/__tests__/config.test.ts src/lib/party-shifts/__tests__/sevenShifts.test.ts`
Expected: PASS (6 + 8 tests).

- [ ] **Step 7: Commit**

```bash
git add src/lib/party-shifts/config.ts src/lib/party-shifts/sevenShifts.ts src/lib/party-shifts/__tests__/config.test.ts src/lib/party-shifts/__tests__/sevenShifts.test.ts
git commit -m "✨ Settings and a 7shifts client for party shifts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Manager alerts

**Files:**
- Create: `src/lib/party-shifts/alerts.ts`
- Test: `src/lib/party-shifts/__tests__/alerts.test.ts`

**Interfaces:**
- Consumes: `BookingForShifts` (Task 4), `formatEasternClock` (Task 3).
- Produces: `type ShiftAlert = { subject: string; text: string }`; `movedAlert(booking, holder: string, from: {startsAt; endsAt}, to: {startsAt; endsAt}): ShiftAlert`; `cancelledAlert(booking, holder: string, window: {startsAt; endsAt}): ShiftAlert`; `removedByHandAlert(booking, slot: 1 | 2): ShiftAlert`; `formatEasternRange(w: {startsAt; endsAt}): string` (`'12:30–3:30 PM'`).

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { cancelledAlert, formatEasternRange, movedAlert, removedByHandAlert } from '@/lib/party-shifts/alerts';
import type { BookingForShifts } from '@/lib/party-shifts/plan';

const booking: BookingForShifts = {
  id: 'b1',
  status: 'confirmed',
  party_date: '2026-10-18',
  start_time: '15:00:00',
  end_time: '17:00:00',
  package_name: 'worker_bee',
  guest_count: 15,
  child_name: 'Ava',
};
const OLD = { startsAt: '2026-10-18T16:30:00.000Z', endsAt: '2026-10-18T19:30:00.000Z' };
const NEW = { startsAt: '2026-10-18T18:30:00.000Z', endsAt: '2026-10-18T21:30:00.000Z' };

describe('alerts', () => {
  it('formats an Eastern time range', () => {
    expect(formatEasternRange(OLD)).toBe('12:30 PM–3:30 PM');
  });

  it('tells the manager a picked-up shift moved', () => {
    const alert = movedAlert(booking, 'Jamie S.', OLD, NEW);
    expect(alert.subject).toBe("Party shift moved: Ava's party, Sun Oct 18");
    expect(alert.text).toContain("Ava's party on Sun Oct 18 moved to 3:00 PM–5:00 PM.");
    expect(alert.text).toContain('Jamie S. had picked up the 12:30 PM–3:30 PM shift; it is now 2:30 PM–5:30 PM.');
  });

  it('tells the manager a picked-up shift was removed with the party', () => {
    const alert = cancelledAlert(booking, 'Jamie S.', OLD);
    expect(alert.subject).toBe("Party cancelled: Ava's party, Sun Oct 18");
    expect(alert.text).toContain('Jamie S. had picked up the 12:30 PM–3:30 PM shift; it has been removed from 7shifts.');
  });

  it('flags a shift someone deleted by hand', () => {
    const alert = removedByHandAlert(booking, 2);
    expect(alert.subject).toBe("Party shift recreated: Ava's party, Sun Oct 18");
    expect(alert.text).toContain('was deleted in 7shifts');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/party-shifts/__tests__/alerts.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement**

```ts
/**
 * Emails to the manager when the sync changes a shift someone had picked up,
 * or finds a party shift deleted by hand. Plain text; sent via sendEmail.
 */

import { formatEasternClock } from '@/lib/party-shifts/note';
import type { BookingForShifts } from '@/lib/party-shifts/plan';

export type ShiftAlert = { subject: string; text: string };
type Window = { startsAt: string; endsAt: string };

const clock = (iso: string) =>
  new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' })
    .format(new Date(iso))
    .replace(' ', ' ');

export function formatEasternRange(w: Window): string {
  return `${clock(w.startsAt)}–${clock(w.endsAt)}`;
}

function partyDay(booking: BookingForShifts): string {
  // Noon UTC on the party date is the same calendar day in Eastern time.
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
    .format(new Date(`${booking.party_date}T12:00:00Z`))
    .replace(',', '');
}

const partyName = (b: BookingForShifts) => `${b.child_name}'s party`;
const partyTime = (b: BookingForShifts) =>
  `${formatEasternClock(b.start_time)}–${formatEasternClock(b.end_time)}`;

export function movedAlert(booking: BookingForShifts, holder: string, from: Window, to: Window): ShiftAlert {
  return {
    subject: `Party shift moved: ${partyName(booking)}, ${partyDay(booking)}`,
    text:
      `${partyName(booking)} on ${partyDay(booking)} moved to ${partyTime(booking)}.\n\n` +
      `${holder} had picked up the ${formatEasternRange(from)} shift; it is now ${formatEasternRange(to)}.\n\n` +
      `Let ${holder} know about the new time.`,
  };
}

export function cancelledAlert(booking: BookingForShifts, holder: string, window: Window): ShiftAlert {
  return {
    subject: `Party cancelled: ${partyName(booking)}, ${partyDay(booking)}`,
    text:
      `${partyName(booking)} on ${partyDay(booking)} was cancelled.\n\n` +
      `${holder} had picked up the ${formatEasternRange(window)} shift; it has been removed from 7shifts.\n\n` +
      `Let ${holder} know they are no longer needed.`,
  };
}

export function removedByHandAlert(booking: BookingForShifts, slot: 1 | 2): ShiftAlert {
  return {
    subject: `Party shift recreated: ${partyName(booking)}, ${partyDay(booking)}`,
    text:
      `Party shift ${slot} of 2 for ${partyName(booking)} on ${partyDay(booking)} (${partyTime(booking)}) ` +
      `was deleted in 7shifts, but the party is still booked, so a new open shift has been posted.\n\n` +
      `If the party should not be staffed, cancel the booking rather than deleting its shifts.`,
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/party-shifts/__tests__/alerts.test.ts`
Expected: PASS (4 tests). If the `Intl` output on this machine uses a narrow no-break space other than ` `, adjust the `.replace` to normalise all `\s` to a plain space and re-run.

- [ ] **Step 5: Commit**

```bash
git add src/lib/party-shifts/alerts.ts src/lib/party-shifts/__tests__/alerts.test.ts
git commit -m "✨ Manager emails when a picked-up party shift changes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: The executor (with an in-memory store)

**Files:**
- Create: `src/lib/party-shifts/sync.ts`
- Test: `src/lib/party-shifts/__tests__/sync.test.ts`

**Interfaces:**
- Consumes: `planPartyShifts`, `describeAction`, `BookingForShifts`, `RecordedShift`, `ShiftAction` (Task 4); `shiftNote`, `parseShiftTag` (Task 3); `easternDayBounds`, `sameWindow` (Task 2); `SevenShiftsClient`, `isHeld` (Task 5); `movedAlert`, `cancelledAlert`, `removedByHandAlert`, `ShiftAlert` (Task 6).
- Produces:

```ts
export interface ShiftStore {
  loadBookings(syncStartIso: string, todayEastern: string): Promise<BookingForShifts[]>;
  loadShifts(bookingIds: string[]): Promise<Map<string, RecordedShift[]>>;
  upsertPending(bookingId: string, slot: 1 | 2, window: { startsAt: string; endsAt: string }): Promise<RecordedShift>;
  markActive(id: string, sevenShiftsShiftId: number, window: { startsAt: string; endsAt: string }): Promise<void>;
  markDeleted(id: string): Promise<void>;
  setError(id: string, message: string): Promise<void>;
}
export interface SyncDeps {
  store: ShiftStore;
  client: SevenShiftsClient;
  sendAlert(alert: ShiftAlert): Promise<void>;
  mode: 'dry-run' | 'live';
  now: Date;
  todayEastern: string; // YYYY-MM-DD
  syncStart: string;
}
export interface SyncSummary {
  mode: 'dry-run' | 'live';
  bookings: number;
  created: number; adopted: number; moved: number; deleted: number; unchanged: number;
  alerts: number;
  errors: { bookingId: string; action: string; message: string }[];
  planned: { bookingId: string; actions: string[] }[];
}
export function runPartyShiftSync(deps: SyncDeps): Promise<SyncSummary>;
```

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { runPartyShiftSync, type ShiftStore, type SyncDeps } from '@/lib/party-shifts/sync';
import type { BookingForShifts, RecordedShift } from '@/lib/party-shifts/plan';
import type { SevenShiftsClient, SevenShiftsShift } from '@/lib/party-shifts/sevenShifts';
import { shiftNote } from '@/lib/party-shifts/note';

const B = '6f1c2a5e-9d3b-4c1a-8e7f-0a1b2c3d4e5f';
const booking = (over: Partial<BookingForShifts> = {}): BookingForShifts => ({
  id: B, status: 'confirmed', party_date: '2026-10-18', start_time: '13:00:00', end_time: '15:00:00',
  package_name: 'worker_bee', guest_count: 15, child_name: 'Ava', ...over,
});

function memoryStore(bookings: BookingForShifts[], rows: RecordedShift[] = []) {
  const shifts = new Map<string, RecordedShift>(rows.map((r) => [r.id, { ...r }]));
  let n = 0;
  const store: ShiftStore = {
    loadBookings: async () => bookings,
    loadShifts: async () => {
      const map = new Map<string, RecordedShift[]>();
      for (const s of shifts.values()) map.set(B, [...(map.get(B) ?? []), { ...s }]);
      return map;
    },
    upsertPending: async (_b, slot, w) => {
      const existing = [...shifts.values()].find((s) => s.slot === slot);
      const row: RecordedShift = { id: existing?.id ?? `row-${++n}`, slot, sevenShiftsShiftId: null, ...w, status: 'pending' };
      shifts.set(row.id, row);
      return { ...row };
    },
    markActive: async (id, sid, w) => { shifts.set(id, { ...shifts.get(id)!, sevenShiftsShiftId: sid, ...w, status: 'active' }); },
    markDeleted: async (id) => { shifts.set(id, { ...shifts.get(id)!, status: 'deleted' }); },
    setError: async () => {},
  };
  return { store, shifts };
}

function fakeClient(existing: SevenShiftsShift[] = []) {
  const remote = new Map<number, SevenShiftsShift>(existing.map((s) => [s.id, { ...s }]));
  let nextId = 500;
  const calls: string[] = [];
  const client: SevenShiftsClient = {
    createOpenShift: async (i) => { calls.push('create'); const s = { id: ++nextId, start: i.startsAt, end: i.endsAt, user_id: null, notes: i.notes }; remote.set(s.id, s); return s; },
    getShift: async (id) => remote.get(id) ?? null,
    moveShift: async (id, i) => { calls.push(`move ${id}`); const s = { ...remote.get(id)!, start: i.startsAt, end: i.endsAt }; remote.set(id, s); return s; },
    deleteShift: async (id) => { calls.push(`delete ${id}`); remote.delete(id); },
    findShiftsBetween: async () => [...remote.values()],
    getUserName: async () => 'Jamie S.',
  };
  return { client, remote, calls };
}

const base = (store: ShiftStore, client: SevenShiftsClient, alerts: unknown[], mode: 'live' | 'dry-run' = 'live'): SyncDeps => ({
  store, client, mode, now: new Date('2026-10-02T15:00:00Z'), todayEastern: '2026-10-02',
  syncStart: '2026-10-02T00:00:00.000Z', sendAlert: async (a) => { alerts.push(a); },
});

describe('runPartyShiftSync', () => {
  it('creates two open shifts and records them active', async () => {
    const { store, shifts } = memoryStore([booking()]);
    const { client, calls } = fakeClient();
    const summary = await runPartyShiftSync(base(store, client, []));
    expect(summary.created).toBe(2);
    expect(calls).toEqual(['create', 'create']);
    expect([...shifts.values()].map((s) => s.status)).toEqual(['active', 'active']);
  });

  it('changes nothing in dry-run mode', async () => {
    const { store, shifts } = memoryStore([booking()]);
    const { client, calls } = fakeClient();
    const summary = await runPartyShiftSync(base(store, client, [], 'dry-run'));
    expect(calls).toEqual([]);
    expect(shifts.size).toBe(0);
    expect(summary.planned[0].actions).toHaveLength(2);
  });

  it('adopts an interrupted create instead of duplicating it', async () => {
    const pending: RecordedShift = { id: 'row-1', slot: 1, sevenShiftsShiftId: null, startsAt: '2026-10-18T16:30:00.000Z', endsAt: '2026-10-18T19:30:00.000Z', status: 'pending' };
    const active: RecordedShift = { ...pending, id: 'row-2', slot: 2, sevenShiftsShiftId: 402, status: 'active' };
    const orphan = { id: 401, start: pending.startsAt, end: pending.endsAt, user_id: null, notes: shiftNote(booking(), 1) };
    const { store, shifts } = memoryStore([booking()], [pending, active]);
    const { client, calls } = fakeClient([orphan, { ...orphan, id: 402, notes: shiftNote(booking(), 2) }]);
    const summary = await runPartyShiftSync(base(store, client, []));
    expect(calls).toEqual([]);
    expect(summary.adopted).toBe(1);
    expect(shifts.get('row-1')).toMatchObject({ status: 'active', sevenShiftsShiftId: 401 });
  });

  it('moves shifts silently when nobody holds them', async () => {
    const rows: RecordedShift[] = [1, 2].map((slot) => ({ id: `row-${slot}`, slot: slot as 1 | 2, sevenShiftsShiftId: 400 + slot, startsAt: '2026-10-18T16:30:00.000Z', endsAt: '2026-10-18T19:30:00.000Z', status: 'active' }));
    const { store } = memoryStore([booking({ start_time: '15:00:00', end_time: '17:00:00' })], rows);
    const { client, calls } = fakeClient(rows.map((r) => ({ id: r.sevenShiftsShiftId!, start: r.startsAt, end: r.endsAt, user_id: null, notes: '' })));
    const alerts: unknown[] = [];
    const summary = await runPartyShiftSync(base(store, client, alerts));
    expect(summary.moved).toBe(2);
    expect(calls).toEqual(['move 401', 'move 402']);
    expect(alerts).toHaveLength(0);
  });

  it('emails the manager when a held shift is cancelled', async () => {
    const row: RecordedShift = { id: 'row-1', slot: 1, sevenShiftsShiftId: 401, startsAt: '2026-10-18T16:30:00.000Z', endsAt: '2026-10-18T19:30:00.000Z', status: 'active' };
    const { store, shifts } = memoryStore([booking({ status: 'cancelled' })], [row]);
    const { client, calls } = fakeClient([{ id: 401, start: row.startsAt, end: row.endsAt, user_id: 42, notes: '' }]);
    const alerts: { subject: string }[] = [];
    const summary = await runPartyShiftSync(base(store, client, alerts));
    expect(calls).toEqual(['delete 401']);
    expect(summary.deleted).toBe(1);
    expect(alerts[0].subject).toMatch(/^Party cancelled/);
    expect(shifts.get('row-1')!.status).toBe('deleted');
  });

  it('marks a shift deleted by hand so the next run recreates it, and alerts', async () => {
    const rows: RecordedShift[] = [1, 2].map((slot) => ({ id: `row-${slot}`, slot: slot as 1 | 2, sevenShiftsShiftId: 400 + slot, startsAt: '2026-10-18T16:30:00.000Z', endsAt: '2026-10-18T19:30:00.000Z', status: 'active' }));
    const { store, shifts } = memoryStore([booking({ start_time: '15:00:00', end_time: '17:00:00' })], rows);
    const { client } = fakeClient([{ id: 402, start: rows[1].startsAt, end: rows[1].endsAt, user_id: null, notes: '' }]);
    const alerts: { subject: string }[] = [];
    await runPartyShiftSync(base(store, client, alerts));
    expect(shifts.get('row-1')!.status).toBe('deleted');
    expect(alerts[0].subject).toMatch(/^Party shift recreated/);
  });

  it('records an error and carries on when 7shifts fails', async () => {
    const { store } = memoryStore([booking()]);
    const { client } = fakeClient();
    client.createOpenShift = async () => { throw new Error('7shifts down'); };
    const summary = await runPartyShiftSync(base(store, client, []));
    expect(summary.errors).toHaveLength(2);
    expect(summary.errors[0].message).toBe('7shifts down');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/party-shifts/__tests__/sync.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement**

```ts
/**
 * Carries out the plan for every party: talks to 7shifts through the client,
 * records each step in the store, and emails the manager when a held shift
 * changes. In dry-run mode it only reports what it would do.
 */

import { cancelledAlert, movedAlert, removedByHandAlert, type ShiftAlert } from '@/lib/party-shifts/alerts';
import { parseShiftTag, shiftNote } from '@/lib/party-shifts/note';
import {
  describeAction,
  planPartyShifts,
  type BookingForShifts,
  type RecordedShift,
  type ShiftAction,
} from '@/lib/party-shifts/plan';
import { isHeld, type SevenShiftsClient, type SevenShiftsShift } from '@/lib/party-shifts/sevenShifts';
import { easternDayBounds, sameWindow } from '@/lib/party-shifts/window';

type Window = { startsAt: string; endsAt: string };

export interface ShiftStore {
  loadBookings(syncStartIso: string, todayEastern: string): Promise<BookingForShifts[]>;
  loadShifts(bookingIds: string[]): Promise<Map<string, RecordedShift[]>>;
  upsertPending(bookingId: string, slot: 1 | 2, window: Window): Promise<RecordedShift>;
  markActive(id: string, sevenShiftsShiftId: number, window: Window): Promise<void>;
  markDeleted(id: string): Promise<void>;
  setError(id: string, message: string): Promise<void>;
}

export interface SyncDeps {
  store: ShiftStore;
  client: SevenShiftsClient;
  sendAlert(alert: ShiftAlert): Promise<void>;
  mode: 'dry-run' | 'live';
  now: Date;
  todayEastern: string;
  syncStart: string;
}

export interface SyncSummary {
  mode: 'dry-run' | 'live';
  bookings: number;
  created: number;
  adopted: number;
  moved: number;
  deleted: number;
  unchanged: number;
  alerts: number;
  errors: { bookingId: string; action: string; message: string }[];
  planned: { bookingId: string; actions: string[] }[];
}

export async function runPartyShiftSync(deps: SyncDeps): Promise<SyncSummary> {
  const { store, client } = deps;
  const summary: SyncSummary = {
    mode: deps.mode, bookings: 0, created: 0, adopted: 0, moved: 0, deleted: 0, unchanged: 0,
    alerts: 0, errors: [], planned: [],
  };

  const bookings = await store.loadBookings(deps.syncStart, deps.todayEastern);
  summary.bookings = bookings.length;
  const recorded = await store.loadShifts(bookings.map((b) => b.id));

  const alert = async (a: ShiftAlert) => {
    await deps.sendAlert(a);
    summary.alerts += 1;
  };

  /** Our shift for this booking and slot, found in 7shifts by its note tag. */
  const findTagged = async (booking: BookingForShifts, slot: 1 | 2): Promise<SevenShiftsShift | null> => {
    const { fromIso, toIso } = easternDayBounds(booking.party_date);
    const shifts = await client.findShiftsBetween(fromIso, toIso);
    return (
      shifts.find((s) => {
        const tag = parseShiftTag(s.notes);
        return tag?.bookingId === booking.id.toLowerCase() && tag.slot === slot;
      }) ?? null
    );
  };

  const createShift = async (booking: BookingForShifts, slot: 1 | 2, window: Window) => {
    const row = await store.upsertPending(booking.id, slot, window);
    const shift = await client.createOpenShift({ ...window, notes: shiftNote(booking, slot) });
    await store.markActive(row.id, shift.id, window);
  };

  const moveShift = async (booking: BookingForShifts, row: RecordedShift, id: number, window: Window) => {
    const current = await client.getShift(id);
    if (!current) {
      // Deleted by hand in 7shifts: forget it; the next run recreates it.
      await store.markDeleted(row.id);
      await alert(removedByHandAlert(booking, row.slot));
      return 'gone' as const;
    }
    await client.moveShift(id, { ...window, notes: shiftNote(booking, row.slot) });
    await store.markActive(row.id, id, window);
    if (isHeld(current)) {
      const holder = await client.getUserName(current.user_id as number);
      await alert(movedAlert(booking, holder, { startsAt: current.start, endsAt: current.end }, window));
    }
    return 'moved' as const;
  };

  const apply = async (booking: BookingForShifts, action: ShiftAction) => {
    switch (action.kind) {
      case 'create':
        await createShift(booking, action.slot, action);
        summary.created += 1;
        return;

      case 'adopt': {
        const found = await findTagged(booking, action.shift.slot);
        if (!found) {
          await createShift(booking, action.shift.slot, action);
          summary.created += 1;
          return;
        }
        await store.markActive(action.shift.id, found.id, { startsAt: found.start, endsAt: found.end });
        summary.adopted += 1;
        if (!sameWindow({ startsAt: found.start, endsAt: found.end }, action)) {
          if ((await moveShift(booking, action.shift, found.id, action)) === 'moved') summary.moved += 1;
        }
        return;
      }

      case 'move': {
        const id = action.shift.sevenShiftsShiftId as number;
        if ((await moveShift(booking, action.shift, id, action)) === 'moved') summary.moved += 1;
        return;
      }

      case 'delete': {
        const id = action.shift.sevenShiftsShiftId ?? (await findTagged(booking, action.shift.slot))?.id ?? null;
        if (id !== null) {
          const current = await client.getShift(id);
          if (current) {
            await client.deleteShift(id);
            if (isHeld(current)) {
              const holder = await client.getUserName(current.user_id as number);
              await alert(cancelledAlert(booking, holder, { startsAt: current.start, endsAt: current.end }));
            }
          }
        }
        await store.markDeleted(action.shift.id);
        summary.deleted += 1;
        return;
      }
    }
  };

  for (const booking of bookings) {
    const actions = planPartyShifts(booking, recorded.get(booking.id) ?? [], deps.now);
    if (actions.length === 0) {
      summary.unchanged += 1;
      continue;
    }
    summary.planned.push({ bookingId: booking.id, actions: actions.map(describeAction) });
    if (deps.mode === 'dry-run') continue;

    for (const action of actions) {
      try {
        await apply(booking, action);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        summary.errors.push({ bookingId: booking.id, action: describeAction(action), message });
        if (action.kind !== 'create') await store.setError(action.shift.id, message).catch(() => {});
      }
    }
  }

  return summary;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/party-shifts/__tests__/sync.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/party-shifts/sync.ts src/lib/party-shifts/__tests__/sync.test.ts
git commit -m "✨ Carry out the party shift plan against 7shifts, with alerts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Supabase store and the cron endpoint

**Files:**
- Create: `src/lib/party-shifts/store.ts`, `src/app/api/cron/sync-party-shifts/route.ts`

**Interfaces:**
- Consumes: `ShiftStore`, `runPartyShiftSync` (Task 7); `loadPartyShiftsConfig` (Task 5); `createSevenShiftsClient` (Task 5); `createAdminClient` from `@/lib/supabase/server`; `sendEmail` from `@/lib/email/resend` (`sendEmail({ to, subject, text })`); `easternToday` from `@/lib/events/schedule` (returns `{ date: 'YYYY-MM-DD', minutes }`); `logger` from `@/lib/logger`; `* as Sentry` from `@sentry/nextjs`.
- Produces: `createSupabaseShiftStore(supabase): ShiftStore`; `GET /api/cron/sync-party-shifts`.

- [ ] **Step 1: Implement the store**

```ts
/**
 * Supabase implementation of the party shift store. Service-role client only:
 * party_shifts has RLS on and no policies.
 */

import type { createAdminClient } from '@/lib/supabase/server';
import type { BookingForShifts, RecordedShift } from '@/lib/party-shifts/plan';
import type { ShiftStore } from '@/lib/party-shifts/sync';

type Admin = ReturnType<typeof createAdminClient>;

type ShiftRow = {
  id: string;
  party_booking_id: string;
  slot: number;
  seven_shifts_shift_id: number | null;
  starts_at: string;
  ends_at: string;
  status: 'pending' | 'active' | 'deleted';
};

const toRecorded = (r: ShiftRow): RecordedShift => ({
  id: r.id,
  slot: r.slot as 1 | 2,
  sevenShiftsShiftId: r.seven_shifts_shift_id === null ? null : Number(r.seven_shifts_shift_id),
  startsAt: r.starts_at,
  endsAt: r.ends_at,
  status: r.status,
});

export function createSupabaseShiftStore(supabase: Admin): ShiftStore {
  const fail = (what: string, error: { message: string } | null) => {
    if (error) throw new Error(`${what}: ${error.message}`);
  };

  return {
    async loadBookings(syncStartIso, todayEastern) {
      const { data, error } = await supabase
        .from('party_bookings')
        .select('id, status, party_date, start_time, end_time, package_name, guest_count, child_name')
        .gte('created_at', syncStartIso)
        .gte('party_date', todayEastern);
      fail('load party_bookings', error);
      return (data ?? []) as BookingForShifts[];
    },

    async loadShifts(bookingIds) {
      const map = new Map<string, RecordedShift[]>();
      if (bookingIds.length === 0) return map;
      const { data, error } = await supabase
        .from('party_shifts')
        .select('id, party_booking_id, slot, seven_shifts_shift_id, starts_at, ends_at, status')
        .in('party_booking_id', bookingIds);
      fail('load party_shifts', error);
      for (const row of (data ?? []) as ShiftRow[]) {
        map.set(row.party_booking_id, [...(map.get(row.party_booking_id) ?? []), toRecorded(row)]);
      }
      return map;
    },

    async upsertPending(bookingId, slot, window) {
      const { data, error } = await supabase
        .from('party_shifts')
        .upsert(
          {
            party_booking_id: bookingId,
            slot,
            seven_shifts_shift_id: null,
            starts_at: window.startsAt,
            ends_at: window.endsAt,
            status: 'pending',
            last_error: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'party_booking_id,slot' }
        )
        .select('id, party_booking_id, slot, seven_shifts_shift_id, starts_at, ends_at, status')
        .single();
      fail('record pending shift', error);
      return toRecorded(data as ShiftRow);
    },

    async markActive(id, sevenShiftsShiftId, window) {
      const { error } = await supabase
        .from('party_shifts')
        .update({
          seven_shifts_shift_id: sevenShiftsShiftId,
          starts_at: window.startsAt,
          ends_at: window.endsAt,
          status: 'active',
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      fail('mark shift active', error);
    },

    async markDeleted(id) {
      const { error } = await supabase
        .from('party_shifts')
        .update({ status: 'deleted', updated_at: new Date().toISOString() })
        .eq('id', id);
      fail('mark shift deleted', error);
    },

    async setError(id, message) {
      const { error } = await supabase
        .from('party_shifts')
        .update({ last_error: message.slice(0, 500), updated_at: new Date().toISOString() })
        .eq('id', id);
      fail('record shift error', error);
    },
  };
}
```

- [ ] **Step 2: Implement the route**

```ts
/**
 * Cron: keep 7shifts in step with party bookings.
 * Every 10 minutes. Protected by CRON_SECRET, like the other cron routes.
 * Off unless SEVENSHIFTS_SYNC_MODE is dry-run or live.
 * See docs/superpowers/specs/2026-10-01-party-shifts-7shifts-design.md.
 */

import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createAdminClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/resend';
import { logger } from '@/lib/logger';
import { easternToday } from '@/lib/events/schedule';
import { loadPartyShiftsConfig } from '@/lib/party-shifts/config';
import { createSevenShiftsClient } from '@/lib/party-shifts/sevenShifts';
import { createSupabaseShiftStore } from '@/lib/party-shifts/store';
import { runPartyShiftSync } from '@/lib/party-shifts/sync';

const LEASE = 'party_shifts';
const LEASE_SECONDS = 300;

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (process.env.NODE_ENV === 'production' && cronSecret) {
    if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const loaded = loadPartyShiftsConfig(process.env);
  if (!loaded.ok) {
    if (loaded.mode === 'off') return NextResponse.json({ skipped: 'SEVENSHIFTS_SYNC_MODE is off' });
    logger.error({ missing: loaded.missing }, 'Party shifts sync: settings missing');
    return NextResponse.json({ error: 'Party shifts sync is misconfigured', missing: loaded.missing }, { status: 500 });
  }
  const { config } = loaded;
  const mode = config.mode === 'live' ? 'live' : 'dry-run';

  const supabase = createAdminClient();
  const { data: acquired, error: leaseError } = await supabase.rpc('try_acquire_sync_lease', {
    p_name: LEASE,
    p_seconds: LEASE_SECONDS,
  });
  if (leaseError) {
    logger.error({ error: leaseError }, 'Party shifts sync: could not take lease');
    return NextResponse.json({ error: 'Lease unavailable' }, { status: 500 });
  }
  if (acquired !== true) return NextResponse.json({ skipped: 'another run is in progress' });

  try {
    const summary = await runPartyShiftSync({
      store: createSupabaseShiftStore(supabase),
      client: createSevenShiftsClient(config),
      mode,
      now: new Date(),
      todayEastern: easternToday().date,
      syncStart: config.syncStart,
      sendAlert: async (alert) => {
        if (!config.alertEmail) {
          logger.warn({ subject: alert.subject }, 'Party shifts sync: no PARTY_SHIFTS_ALERT_EMAIL, alert not sent');
          return;
        }
        await sendEmail({ to: config.alertEmail, subject: alert.subject, text: alert.text });
      },
    });

    if (summary.errors.length > 0) {
      logger.error({ errors: summary.errors }, 'Party shifts sync: some actions failed');
      Sentry.captureMessage(`Party shifts sync: ${summary.errors.length} action(s) failed`, {
        level: 'error',
        extra: { errors: summary.errors },
      });
    }
    logger.info({ ...summary, planned: summary.planned.length }, 'Party shifts sync finished');
    return NextResponse.json(summary);
  } catch (error) {
    logger.error({ error }, 'Party shifts sync crashed');
    Sentry.captureException(error, { tags: { component: 'party-shifts-sync' } });
    return NextResponse.json({ error: 'Party shifts sync failed' }, { status: 500 });
  } finally {
    await supabase.rpc('release_sync_lease', { p_name: LEASE });
  }
}
```

- [ ] **Step 3: Run all tests and the build**

Run: `npx vitest run && npx -y pnpm@10 run build`
Expected: all tests pass; build exits 0. Then `git checkout -- public/sw.js` (the build stamps it).

- [ ] **Step 4: Type check the new files**

Run: `npx tsc -p /tmp/claude-501/tsconfig.check.json 2>&1 | grep -E "party-shifts|sync-party-shifts"`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add src/lib/party-shifts/store.ts src/app/api/cron/sync-party-shifts/route.ts
git commit -m "✨ Ten-minute cron keeps 7shifts in step with party bookings

Off unless SEVENSHIFTS_SYNC_MODE is dry-run or live; takes a lease so two
runs never overlap; alerts and errors are logged and reported.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Smoke test, migration, schedule and go-live (supervised)

Every step here touches production or 7shifts and needs Tim's explicit OK at the time.

**Files:**
- Create: `scripts/party-shifts-smoke.ts`
- Modify: `vercel.json` (only if the Vercel plan allows sub-daily crons)
- Modify: `docs/superpowers/specs/2026-10-01-party-shifts-7shifts-design.md` (lease instead of advisory lock; confirmed IDs)

- [ ] **Step 1: Write the smoke test script**

```ts
/**
 * Supervised live test of the 7shifts client: creates one clearly-labelled
 * test shift far in the future, reads it, moves it, deletes it.
 * Run only with Tim's OK:  npx tsx scripts/party-shifts-smoke.ts
 */

import { readFileSync } from 'node:fs';
import { createSevenShiftsClient } from '../src/lib/party-shifts/sevenShifts';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => [m[1], m[2].trim().replace(/^["']|["']$/g, '')])
);

const client = createSevenShiftsClient({
  token: env.SEVENSHIFTS_ACCESS_TOKEN,
  companyId: 404191,
  locationId: 490587,
  roleId: 2664998,
  departmentId: 779751,
});

const notes = 'TEST — automated party shift check, will be deleted';
const created = await client.createOpenShift({
  startsAt: '2027-01-10T14:00:00.000Z',
  endsAt: '2027-01-10T15:00:00.000Z',
  notes,
});
console.log('created', created.id, created.start, created.end);

const read = await client.getShift(created.id);
console.log('read back', read?.id, 'open:', read && !read.user_id);

const moved = await client.moveShift(created.id, {
  startsAt: '2027-01-10T15:00:00.000Z',
  endsAt: '2027-01-10T16:00:00.000Z',
  notes,
});
console.log('moved to', moved.start, moved.end);

await client.deleteShift(created.id);
console.log('deleted; read now returns', await client.getShift(created.id));
```

- [ ] **Step 2: Run it with Tim watching 7shifts**

Ask Tim first. Run: `npx -y tsx scripts/party-shifts-smoke.ts`
Expected: `created <id>`, `read back <id> open: true`, `moved to 2027-01-10T15:00…`, `deleted; read now returns null`. Tim confirms in 7shifts that the test shift appeared as open on 10 Jan 2027 and is gone afterwards. If any path or field is rejected, fix `sevenShifts.ts` and its test before going on.

- [ ] **Step 3: Apply migration 054**

Ask Tim to paste `supabase/migrations/054_party_shifts.sql` into the Supabase SQL Editor for **Busy Bees IPC** and run it. Expected: "Success. No rows returned." Verify:

```sql
SELECT to_regclass('public.party_shifts') AS shifts_table, to_regclass('public.sync_leases') AS leases_table,
       (SELECT public.try_acquire_sync_lease('party_shifts', 1)) AS lease_works;
SELECT public.release_sync_lease('party_shifts');
```

Expected: both tables named, `lease_works = true`.

- [ ] **Step 4: Settings (Tim sets them in Vercel; mirror in `.env.local` for local runs)**

```
SEVENSHIFTS_ACCESS_TOKEN=<token>
SEVENSHIFTS_COMPANY_ID=404191
SEVENSHIFTS_LOCATION_ID=490587
SEVENSHIFTS_ROLE_ID=2664998
SEVENSHIFTS_DEPARTMENT_ID=779751
PARTY_SHIFTS_ALERT_EMAIL=<Tim's choice>
SEVENSHIFTS_SYNC_START=<go-live moment, ISO, e.g. 2026-10-03T00:00:00-04:00>
SEVENSHIFTS_SYNC_MODE=dry-run
```

- [ ] **Step 5: Schedule every 10 minutes**

If Tim's Vercel plan allows sub-daily crons, add to `vercel.json` `crons`:

```json
{ "path": "/api/cron/sync-party-shifts", "schedule": "*/10 * * * *" }
```

Otherwise, in the Supabase SQL Editor (Tim stores the secret in Vault first: Settings → Vault → new secret `cron_secret` = the `CRON_SECRET` value):

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'sync-party-shifts',
  '*/10 * * * *',
  $$
  SELECT net.http_get(
    url := 'https://www.busybeesipc.com/api/cron/sync-party-shifts',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    )
  );
  $$
);
```

- [ ] **Step 6: Dry run, then live**

After deploy with mode `dry-run`, call the endpoint once (Tim or a curl with the secret) and read `planned` in the JSON: every listed booking should be a party booked after `SEVENSHIFTS_SYNC_START`, with `create slot 1`/`create slot 2` at the right UTC times. With Tim's OK, set `SEVENSHIFTS_SYNC_MODE=live` and redeploy. Watch the next real booking appear as two open shifts in 7shifts within ten minutes.

- [ ] **Step 7: Update the spec and memory, commit**

In the spec, replace the advisory-lock sentence with the lease (`sync_leases`, `try_acquire_sync_lease`), and add the confirmed IDs (company 404191, location 490587, department 779751, role Employee 2664998). Update `project_weather_triggered_member_afternoons` memory pointer if useful, and the October pricing memory "still open" list.

```bash
git add scripts/party-shifts-smoke.ts docs/superpowers/specs/2026-10-01-party-shifts-7shifts-design.md vercel.json
git commit -m "🔧 Party shifts smoke test, schedule and go-live notes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
